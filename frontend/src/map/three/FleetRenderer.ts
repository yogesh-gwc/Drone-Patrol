import type { Group, Mesh, Scene } from 'three'
import { MathUtils, Vector3 } from 'three'
import { NH44_CORRIDOR, positionAtDistance } from '../corridorRoute.js'
import type { SimulationSnapshot, VehicleKind } from '../../types/simulation.js'
import { geographicToScene, type SceneOrigin } from './coordinateUtils.js'
import {
  createChargingStation,
  createDrone,
  createSosTarget,
  createVehicle,
  MATERIALS,
  type DroneHandle,
  type StationHandle,
  type VehicleHandle,
} from './fleetModels.js'

/**
 * Renders the backend simulation as 3D objects on the NH-44 corridor.
 *
 * The backend is authoritative and broadcasts at 5 Hz. Rendering straight from
 * those snapshots would look like a slideshow, so each object keeps a target
 * (from the latest snapshot) and its transform eases toward it every frame.
 * The result is smooth 60 fps motion with a twentieth of the network traffic
 * of per-frame updates.
 *
 * Objects are created once per entity and thereafter only moved. Nothing is
 * rebuilt per frame, and all geometry and materials are shared (see
 * `fleetModels.ts`).
 *
 * Positions come from `distanceAlongMeters` resolved through the shared
 * corridor route, so everything sits on the real OSM alignment and no object
 * has its own coordinate system.
 */

/** Metres of lateral offset applied per unit of the backend's lane offset. */
const LANE_SCALE = 1

/**
 * Zoom-aware sizing.
 *
 * The models are authored oversized so they survive a 50 km overview, but at
 * close zoom that reads as a 26 m car sitting on a 37 m road. Instead each
 * object is scaled against the camera: near `REFERENCE_ZOOM` it renders at its
 * true-to-life size, and as the operator zooms out it grows just enough to stay
 * legible, the way a map symbol does.
 *
 * `BASE` is model-size to real-size at the reference zoom; the clamps stop
 * objects vanishing when zoomed in or swamping the corridor when zoomed out.
 */
/**
 * Drones are always drawn in high-visibility amber.
 *
 * The livery previously switched only below zoom 13, which meant the fleet was
 * hard to pick out exactly where the operator is looking for it. Amber at every
 * zoom makes "where are my drones" answerable at a glance; operational mode is
 * still carried by the accent colour and the detail panel.
 */

const REFERENCE_ZOOM = 15

/**
 * Per-type size curves.
 *
 * `base` is the scale at REFERENCE_ZOOM, chosen so the object renders close to
 * life size when the operator is down at road level. `falloff` controls how
 * fast it grows on zooming out.
 *
 * Drones use a much steeper falloff than traffic on purpose: at corridor
 * overview a life-scaled drone is well under a pixel, and the operator's first
 * question is "where is the fleet". Traffic does not need that treatment -
 * the corridor line already shows where the road is.
 */
interface ScaleRule {
  base: number
  falloff: number
  min: number
  max: number
}

const SCALE_RULES: Record<'drone' | 'vehicle' | 'station' | 'sos', ScaleRule> = {
  drone: { base: 0.45, falloff: 1.2, min: 0.45, max: 40 },
  vehicle: { base: 0.5, falloff: 0.85, min: 0.5, max: 18 },
  // Pads are static infrastructure. They were growing to 26x at overview and
  // reading as dark blobs that competed with the drones, which are the thing
  // the operator is actually looking for.
  station: { base: 0.5, falloff: 0.8, min: 0.5, max: 7 },
  sos: { base: 1, falloff: 1.1, min: 1, max: 30 },
}

function scaleForZoom(rule: ScaleRule, zoom: number): number {
  const growth = Math.pow(2, (REFERENCE_ZOOM - zoom) * rule.falloff)
  return Math.min(rule.max, Math.max(rule.min, rule.base * growth))
}
/** How quickly transforms converge on their target. Higher is snappier. */
const EASE_RATE = 6
const ROTOR_SPEED = 26

interface Tracked {
  group: Group
  targetPosition: Vector3
  targetYaw: number
  /** Terrain height under the entity, metres. */
  ground: number
  /** Geographic position, used for click hit-testing. */
  lngLat: [number, number]
}

interface TrackedDrone extends Tracked {
  handle: DroneHandle
  mode: string
}

function droneAccentFor(mode: string) {
  if (mode === 'ESCORTING' || mode === 'SOS_TRACKING') {
    return MATERIALS.droneEscort
  }
  if (mode === 'CHARGING') {
    return MATERIALS.droneCharging
  }
  // Monitoring a stopped vehicle is an alert state, not an emergency.
  if (mode === 'MONITORING') {
    return MATERIALS.warning
  }
  return MATERIALS.droneAccent
}

interface TrackedStation extends Tracked {
  handle: StationHandle
  full: boolean
}

interface TrackedVehicle extends Tracked {
  kind: VehicleKind
  handle: VehicleHandle
  /** '', 'SUSPICIOUS' or 'POLICE_DISPATCH'. */
  warning: string
  /** Last seen corridor-wrap counter; a change means "place, do not ease". */
  spawnSeq: number
}

export class FleetRenderer {
  private readonly scene: Scene
  private readonly origin: SceneOrigin

  private readonly drones = new Map<string, TrackedDrone>()
  private readonly stations = new Map<string, TrackedStation>()
  private readonly vehicles = new Map<string, TrackedVehicle>()
  /** The single SOS target, when an SOS is active. */
  private sosTarget: Tracked | null = null

  private readonly scratch = new Vector3()
  /** Terrain sampler supplied by MapScene; null before terrain is ready. */
  private sampleGround: ((lngLat: [number, number]) => number | null) | null = null
  /** Current map zoom, pushed by MapScene so objects can size themselves. */
  private zoom = 11
  /** Code of the drone the operator has selected, if any. */
  private selectedDroneCode: string | null = null

  constructor(scene: Scene, origin: SceneOrigin) {
    this.scene = scene
    this.origin = origin
  }

  setGroundSampler(sampler: (lngLat: [number, number]) => number | null): void {
    this.sampleGround = sampler
  }

  /**
   * Marks one drone as selected.
   *
   * Clicking a drone flies the camera to it, and at corridor scale the symbol
   * is small enough to lose among traffic; the ring makes it obvious which
   * unit the panel is describing.
   */
  setSelectedDrone(code: string | null): void {
    if (code === this.selectedDroneCode) {
      return
    }
    this.selectedDroneCode = code
    for (const [droneCode, tracked] of this.drones) {
      tracked.handle.selectionRing.visible = droneCode === code
    }
  }

  /** Called on every camera move so object scale tracks the zoom level. */
  setZoom(zoom: number): void {
    if (Math.abs(zoom - this.zoom) < 0.01) {
      return
    }
    this.zoom = zoom
    this.applyScales()
  }

  /**
   * Switches drone livery between the detailed close-up colours and the
   * zoomed-out high-visibility amber.
   */
  private paintDrone(tracked: TrackedDrone): void {
    for (const mesh of tracked.handle.shell) {
      mesh.material = MATERIALS.droneHiVis
    }
    // Amber body, mode-coloured accent: findable and still readable.
    tracked.handle.accent.material = droneAccentFor(tracked.mode)

    // Status ring: Yellow for ESCORTING, Purple for RETURNING to patrol zone.
    if (tracked.mode === 'ESCORTING') {
      tracked.handle.statusRing.material = MATERIALS.escortRing
      tracked.handle.statusRing.visible = true
    } else if (tracked.mode === 'RETURNING') {
      tracked.handle.statusRing.material = MATERIALS.returningRing
      tracked.handle.statusRing.visible = true
    } else {
      tracked.handle.statusRing.visible = false
    }
  }

  private applyScales(): void {
    const drone = scaleForZoom(SCALE_RULES.drone, this.zoom)
    const vehicle = scaleForZoom(SCALE_RULES.vehicle, this.zoom)
    const station = scaleForZoom(SCALE_RULES.station, this.zoom)
    for (const t of this.drones.values()) {
      t.group.scale.setScalar(drone)
    }
    for (const t of this.vehicles.values()) {
      t.group.scale.setScalar(vehicle)
    }
    for (const t of this.stations.values()) {
      t.group.scale.setScalar(station)
    }
    this.sosTarget?.group.scale.setScalar(scaleForZoom(SCALE_RULES.sos, this.zoom))
  }

  get counts(): { drones: number; stations: number; vehicles: number } {
    return { drones: this.drones.size, stations: this.stations.size, vehicles: this.vehicles.size }
  }

  /** Applies a backend snapshot as the new interpolation target. */
  applySnapshot(snapshot: SimulationSnapshot): void {
    // --- stations ---------------------------------------------------------
    for (const state of snapshot.stations) {
      let tracked = this.stations.get(state.code)
      if (!tracked) {
        const handle = createChargingStation()
        this.scene.add(handle.group)
        tracked = {
          group: handle.group,
          handle,
          targetPosition: new Vector3(),
          targetYaw: 0,
          ground: 0,
          lngLat: state.position,
          full: false,
        }
        handle.group.scale.setScalar(scaleForZoom(SCALE_RULES.station, this.zoom))
        this.stations.set(state.code, tracked)
      }
      tracked.lngLat = state.position
      this.retarget(tracked, state.position, 0, 0)
      const full = state.occupiedSlots >= state.capacity
      if (full !== tracked.full) {
        tracked.full = full
        tracked.handle.ring.material = full ? MATERIALS.padRingFull : MATERIALS.padRing
      }
      // Stations do not move; snap rather than ease.
      tracked.group.position.copy(tracked.targetPosition)
    }

    // --- drones -----------------------------------------------------------
    const seenDrones = new Set<string>()
    for (const state of snapshot.drones) {
      seenDrones.add(state.code)
      let tracked = this.drones.get(state.code)
      if (!tracked) {
        const handle = createDrone()
        this.scene.add(handle.group)
        tracked = {
          group: handle.group,
          handle,
          targetPosition: new Vector3(),
          targetYaw: 0,
          ground: 0,
          lngLat: state.position,
          mode: state.mode,
        }
        handle.group.scale.setScalar(scaleForZoom(SCALE_RULES.drone, this.zoom))
        this.drones.set(state.code, tracked)
        this.paintDrone(tracked)
        handle.selectionRing.visible = state.code === this.selectedDroneCode
        // First sighting: place immediately instead of flying in from origin.
        this.retarget(tracked, state.position, state.altitudeMeters, state.headingDegrees)
        tracked.group.position.copy(tracked.targetPosition)
        tracked.group.rotation.z = tracked.targetYaw
      }
      tracked.lngLat = state.position
      this.retarget(tracked, state.position, state.altitudeMeters, state.headingDegrees)

      if (state.mode !== tracked.mode) {
        tracked.mode = state.mode
        // Accent colour carries the operational mode at a glance.
        this.paintDrone(tracked)
      }
    }
    this.prune(this.drones, seenDrones)

    // --- vehicles ---------------------------------------------------------
    const seenVehicles = new Set<string>()
    for (const state of snapshot.vehicles) {
      seenVehicles.add(state.code)
      let tracked = this.vehicles.get(state.code)
      if (!tracked) {
        const handle = createVehicle(state.kind)
        this.scene.add(handle.group)
        tracked = {
          group: handle.group,
          handle,
          kind: state.kind,
          warning: '',
          spawnSeq: state.spawnSeq,
          targetPosition: new Vector3(),
          targetYaw: 0,
          ground: 0,
          lngLat: state.position,
        }
        handle.group.scale.setScalar(scaleForZoom(SCALE_RULES.vehicle, this.zoom))
        this.vehicles.set(state.code, tracked)
      }

      // Speeding test vehicle or speed violation (> 80 km/h) visual indicator
      const isSpeeding = state.code.startsWith('VH-SPEED-') || state.speedKmh > 80
      // Flag the vehicle the suspicious-vehicle incident is tracking.
      const suspiciousStage =
        snapshot.suspicious?.vehicleCode === state.code ? snapshot.suspicious.stage : ''
      const warning = isSpeeding ? 'SPEEDING' : suspiciousStage

      if (warning !== tracked.warning) {
        tracked.warning = warning
        tracked.handle.warningRing.visible = warning !== ''
        if (warning === 'SPEEDING') {
          tracked.handle.warningRing.material = MATERIALS.speedingRing
          tracked.handle.bodyMesh.material = MATERIALS.speedingCar
        } else if (warning === 'POLICE_DISPATCH') {
          tracked.handle.warningRing.material = MATERIALS.warningEscalated
          if (state.kind === 'CAR') tracked.handle.bodyMesh.material = MATERIALS.car
          else if (state.kind === 'BUS') tracked.handle.bodyMesh.material = MATERIALS.bus
          else if (state.kind === 'TRUCK') tracked.handle.bodyMesh.material = MATERIALS.truck
          else if (state.kind === 'AMBULANCE') tracked.handle.bodyMesh.material = MATERIALS.ambulance
        } else if (warning !== '') {
          tracked.handle.warningRing.material = MATERIALS.warning
          if (state.kind === 'CAR') tracked.handle.bodyMesh.material = MATERIALS.car
          else if (state.kind === 'BUS') tracked.handle.bodyMesh.material = MATERIALS.bus
          else if (state.kind === 'TRUCK') tracked.handle.bodyMesh.material = MATERIALS.truck
          else if (state.kind === 'AMBULANCE') tracked.handle.bodyMesh.material = MATERIALS.ambulance
        } else {
          if (state.kind === 'CAR') tracked.handle.bodyMesh.material = MATERIALS.car
          else if (state.kind === 'BUS') tracked.handle.bodyMesh.material = MATERIALS.bus
          else if (state.kind === 'TRUCK') tracked.handle.bodyMesh.material = MATERIALS.truck
          else if (state.kind === 'AMBULANCE') tracked.handle.bodyMesh.material = MATERIALS.ambulance
        }
      }

      // Offset the vehicle across the carriageway into its lane.
      const lateral = this.lateralOffset(state.distanceAlongMeters, state.laneOffsetMeters * LANE_SCALE)
      tracked.lngLat = lateral
      // Sit on the road surface, which now hugs the terrain (SURFACE_LIFT = 2.8).
      this.retarget(tracked, lateral, 2.9, state.headingDegrees)

      // A vehicle that wrapped from Hosur back to Krishnagiri must be PLACED
      // at its new position, never eased to it: easing sent the car flying
      // the length of the corridor through the air in full view.
      const wrapped = state.spawnSeq !== tracked.spawnSeq
      if (wrapped) {
        tracked.spawnSeq = state.spawnSeq
      }
      if (wrapped || this.vehicles.size <= 1 || tracked.group.position.lengthSq() === 0) {
        tracked.group.position.copy(tracked.targetPosition)
        tracked.group.rotation.z = tracked.targetYaw
      }
    }
    this.prune(this.vehicles, seenVehicles)

    // --- SOS target -------------------------------------------------------
    if (snapshot.sos) {
      if (!this.sosTarget) {
        const group = createSosTarget()
        group.scale.setScalar(scaleForZoom(SCALE_RULES.sos, this.zoom))
        this.scene.add(group)
        this.sosTarget = {
          group,
          targetPosition: new Vector3(),
          targetYaw: 0,
          ground: 0,
          lngLat: snapshot.sos.position,
        }
      }
      this.sosTarget.lngLat = snapshot.sos.position
      this.retarget(this.sosTarget, snapshot.sos.position, 0, 0)
      this.sosTarget.group.position.copy(this.sosTarget.targetPosition)
    } else if (this.sosTarget) {
      this.scene.remove(this.sosTarget.group)
      this.sosTarget = null
    }
  }

  /** Eases every object toward its target. Called once per rendered frame. */
  update(deltaSeconds: number): void {
    const t = 1 - Math.exp(-EASE_RATE * Math.min(deltaSeconds, 0.25))

    for (const tracked of this.drones.values()) {
      tracked.group.position.lerp(tracked.targetPosition, t)
      tracked.group.rotation.z = this.easeAngle(tracked.group.rotation.z, tracked.targetYaw, t)
      if (tracked.mode !== 'CHARGING') {
        for (const rotor of tracked.handle.rotors) {
          rotor.rotation.z += ROTOR_SPEED * Math.min(deltaSeconds, 0.25)
        }
      }
    }

    for (const tracked of this.vehicles.values()) {
      tracked.group.position.lerp(tracked.targetPosition, t)
      tracked.group.rotation.z = this.easeAngle(tracked.group.rotation.z, tracked.targetYaw, t)
      if (tracked.warning === 'SPEEDING') {
        tracked.handle.warningRing.rotation.z += 5 * Math.min(deltaSeconds, 0.25)
      }
    }
  }

  /** Re-samples terrain under every object. Called as DEM tiles arrive. */
  refreshTerrain(): boolean {
    if (!this.sampleGround) {
      return false
    }
    let changed = false
    for (const collection of [this.drones, this.stations, this.vehicles]) {
      for (const tracked of collection.values()) {
        const elevation = this.sampleGround(tracked.lngLat)
        if (elevation === null || Math.abs(elevation - tracked.ground) < 0.5) {
          continue
        }
        tracked.ground = elevation
        changed = true
      }
    }
    return changed
  }

  /** Nearest drone to a geographic point, within `toleranceMeters`. */
  pickDrone(lngLat: [number, number], toleranceMeters: number): string | null {
    let best: string | null = null
    let bestGap = toleranceMeters
    for (const [code, tracked] of this.drones) {
      const gap = approxMeters(tracked.lngLat, lngLat)
      if (gap < bestGap) {
        bestGap = gap
        best = code
      }
    }
    return best
  }

  /** Nearest vehicle to a geographic point, within `toleranceMeters`. */
  pickVehicle(lngLat: [number, number], toleranceMeters: number): string | null {
    let best: string | null = null
    let bestGap = toleranceMeters
    for (const [code, tracked] of this.vehicles) {
      const gap = approxMeters(tracked.lngLat, lngLat)
      if (gap < bestGap) {
        bestGap = gap
        best = code
      }
    }
    return best
  }

  /** Nearest charging station to a geographic point, within `toleranceMeters`. */
  pickStation(lngLat: [number, number], toleranceMeters: number): string | null {
    let best: string | null = null
    let bestGap = toleranceMeters
    for (const [code, tracked] of this.stations) {
      const gap = approxMeters(tracked.lngLat, lngLat)
      if (gap < bestGap) {
        bestGap = gap
        best = code
      }
    }
    return best
  }

  dispose(): void {
    if (this.sosTarget) {
      this.scene.remove(this.sosTarget.group)
      this.sosTarget = null
    }
    for (const collection of [this.drones, this.stations, this.vehicles]) {
      for (const tracked of collection.values()) {
        this.scene.remove(tracked.group)
      }
      collection.clear()
    }
    // Geometry and materials are shared and freed by the layer, not here.
  }

  // --- helpers --------------------------------------------------------------

  private retarget(
    tracked: Tracked,
    lngLat: [number, number],
    altitudeMeters: number,
    headingDegrees: number,
  ): void {
    if (this.sampleGround) {
      const elevation = this.sampleGround(lngLat)
      if (elevation !== null) {
        tracked.ground = elevation
      }
    }
    geographicToScene(
      this.origin,
      lngLat[0],
      lngLat[1],
      tracked.ground + altitudeMeters,
      this.scratch,
    )
    tracked.targetPosition.copy(this.scratch)
    // Compass bearing (0 = north, clockwise) to scene yaw (0 = +X/east, CCW).
    tracked.targetYaw = MathUtils.degToRad(90 - headingDegrees)
  }

  /** Shifts a corridor position sideways into a lane. */
  private lateralOffset(distanceAlong: number, offsetMeters: number): [number, number] {
    const here = positionAtDistance(NH44_CORRIDOR, distanceAlong)
    const ahead = positionAtDistance(
      NH44_CORRIDOR,
      Math.min(NH44_CORRIDOR.lengthMeters, distanceAlong + 30),
    )
    const cosLat = Math.cos((here[1] * Math.PI) / 180)
    let dx = (ahead[0] - here[0]) * cosLat
    let dy = ahead[1] - here[1]
    const len = Math.hypot(dx, dy)
    if (len < 1e-12) {
      return here
    }
    dx /= len
    dy /= len
    // Left-hand normal, converted from metres back to degrees.
    const metresPerDegree = 111_320
    const nx = -dy
    const ny = dx
    return [
      here[0] + (nx * offsetMeters) / (metresPerDegree * cosLat),
      here[1] + (ny * offsetMeters) / metresPerDegree,
    ]
  }

  private easeAngle(current: number, target: number, t: number): number {
    // Take the shortest way round so a heading crossing north does not spin.
    let delta = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI
    if (delta < -Math.PI) {
      delta += Math.PI * 2
    }
    return current + delta * t
  }

  private prune<T extends Tracked>(collection: Map<string, T>, seen: Set<string>): void {
    for (const [code, tracked] of collection) {
      if (!seen.has(code)) {
        this.scene.remove(tracked.group)
        collection.delete(code)
      }
    }
  }
}

/** Cheap planar distance in metres; adequate at corridor scale. */
function approxMeters(a: [number, number], b: [number, number]): number {
  const cosLat = Math.cos((a[1] * Math.PI) / 180)
  const dx = (a[0] - b[0]) * cosLat * 111_320
  const dy = (a[1] - b[1]) * 111_320
  return Math.hypot(dx, dy)
}

export function meshMaterialCount(mesh: Mesh): number {
  return Array.isArray(mesh.material) ? mesh.material.length : 1
}
