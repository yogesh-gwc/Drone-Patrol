import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CORRIDOR,
  CORRIDOR_NODES,
  distanceAtPosition,
  isInsideOperationalArea,
  metersBetween,
  nearestNodeName as nodeNameAt,
  type Position,
  ZONE_COUNT,
  ZONE_LENGTH_M,
  headingAtDistance,
  nearestNodeName,
  positionAtDistance,
} from './corridor.js'
import { hospitalAhead, nearestHospitalTo } from './pois.js'
import type {
  SosStage,
  AmbulanceEmergencyState,
  SosState,
  SuspiciousVehicleState,
  DroneState,
  SimulationSnapshot,
  StationState,
  VehicleState,
  VehicleKind,
  SpeedViolationRecord,
} from './types.js'

const VIOLATIONS_FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'data',
  'speedViolations.json',
)

/** Highway legal speed limit in km/h. Fines apply above 80 km/h. */
const SPEED_LIMIT_KMH = 80
/** Drone optical speedometer pass-by detection zone along corridor chainage in metres (triggered when passing drone). */
const PASSBY_DETECTION_RANGE_M = 20

/**
 * Authoritative AEROGUARD simulation.
 *
 * The backend owns all moving state; the frontend renders snapshots and
 * interpolates between them. Everything is expressed as a distance along the
 * NH-44 corridor, so drones, vehicles and stations share one coordinate system
 * and stay on the real OSM alignment by construction.
 *
 * Simulated only. No row here reaches physical hardware or any emergency
 * service.
 */

const TICK_HZ = 20
const TICK_SECONDS = 1 / TICK_HZ

const PATROL_ALTITUDE_M = 80
const DRONE_SPEED_MPS = 22
/**
 * Escort dash speed.
 *
 * The ambulance runs at ~27 m/s, so a drone only marginally faster can never
 * open a 500 m lead from behind. This is the transit speed used while taking
 * up station; it is a demonstration figure, not a real airframe limit.
 */
const ESCORT_SPEED_MPS = 62
/** Battery percent drained per simulated minute while flying. */
const DRAIN_PER_MINUTE = 0.55
const CHARGE_PER_MINUTE = 6
const LOW_BATTERY = 24
const RESUME_PATROL_BATTERY = 92

const STATION_CAPACITY = 2
/**
 * Metres from its destination at which a returning drone has arrived.
 *
 * Applies both to docking on a pad and to resuming a patrol position.
 */
const RETURN_ARRIVAL_M = 70

/** Metres the escort drone holds ahead of the ambulance (~100m gap). */
const ESCORT_LEAD_M = 100
/** Shortest ambulance run, so a random start still has somewhere to go. */
const MIN_AMBULANCE_RUN_M = 12000
/** Start positions are cycled through this many corridor segments. */
const AMBULANCE_START_SEGMENTS = 5
/** Metres from the person at which the drone is considered on station. */
const SOS_ARRIVAL_M = 60
/** Drone transit speed when responding to an SOS, metres per second. */
const SOS_SPEED_MPS = 45

/**
 * Metres before the hospital at which the ambulance starts braking, and the
 * speed it rolls in at. Arriving means decelerating into the forecourt, not
 * vanishing at full speed the instant the chainage matches.
 */
const AMBULANCE_BRAKE_M = 320
const AMBULANCE_ARRIVAL_KMH = 12

/** Simulated seconds the ambulance sits at the hospital handing over. */
const AMBULANCE_HANDOVER_S = 8
/** Simulated seconds the COMPLETED summary stays up before clearing. */
const AMBULANCE_SUMMARY_S = 10

/** SOS response pacing, in simulated seconds. */
const SOS_ASSESS_S = 6
const SOS_MEDICAL_DISPATCH_S = 10
const SOS_HANDOVER_S = 12
/** Observation altitude the drone descends to once over the person. */
const SOS_ONSCENE_ALTITUDE_M = 35
/** Speed of the simulated medical unit responding to an SOS, m/s. */
const SOS_RESPONDER_MPS = 21
/** Metres from the person at which the medical unit has arrived. */
const SOS_RESPONDER_ARRIVAL_M = 45
/** Simulated seconds a resolved SOS stays on screen before clearing. */
const SOS_RESOLVED_HOLD_S = 8

/**
 * Stopped-vehicle thresholds, in SIMULATED minutes.
 *
 * Measured on the simulation clock, not the wall clock, so raising the speed
 * multiplier lets an operator reach 40 and 80 minutes in seconds. Nothing
 * here is a test-only shortcut - the same code path runs at 1x.
 */
const SUSPICIOUS_THRESHOLD_MIN = 40
const ESCALATION_THRESHOLD_MIN = 80
/** Metres from the vehicle at which the drone is considered on station. */
const MONITOR_ARRIVAL_M = 90
/** Drone transit speed when responding to a stopped vehicle, m/s. */
const MONITOR_SPEED_MPS = 40

const SUSPICIOUS_SPEAKER_MESSAGE =
  'Please move your vehicle if stopped on the highway. Emergency monitoring is active.'
/**
 * Vehicles within this distance ahead of the ambulance pull aside.
 *
 * Set wider than a real advance-warning distance so the effect is visible at
 * demonstration traffic density, where same-direction vehicles are kilometres
 * apart rather than seconds apart.
 */
const YIELD_RANGE_M = 1400

/**
 * How a yielding vehicle actually makes room.
 *
 * Yielding used to only cut the vehicle's speed. Slowing down does not open a
 * gap - it lets the ambulance close on the car - so the space appeared to
 * form only once the ambulance had already drawn level. The vehicle now
 * physically slides outboard toward the shoulder, which is the part an
 * operator can see, and slides back once the ambulance has gone.
 *
 * Detection stays distance-based. Time-to-intercept sounds more principled
 * but is useless here: the ambulance closes on 92 km/h traffic at barely a
 * metre per second, so a time window collapses to a couple of car lengths.
 */
const YIELD_SHIFT_MPS = 2.4
/** Extra metres a yielding vehicle sits outboard of its lane centre. */
const YIELD_SHIFT_M = 2.6

const SPEAKER_MESSAGE =
  'Emergency ambulance approaching. Please move to the side and provide a clear passage.'

/**
 * Lane centres, in metres from the corridor centreline.
 *
 * Derived from the 3D road cross-section in `HighwayCorridor`: a 5.5 m median
 * (so each carriageway starts 2.75 m out), then a 2.5 m shoulder, then three
 * 3.65 m running lanes. Vehicles were previously placed at +/-5.5 and +/-9,
 * which put them on the median and the shoulder rather than in a lane.
 */
const LANE_CENTRES = [7.1, 10.75, 14.4]

/**
 * Where a stopped vehicle parks, in metres from the corridor centreline.
 *
 * The carriageway runs from the median edge at 2.75 m out to 18.7 m: a 2.5 m
 * median-side shoulder, three 3.65 m lanes ending at 16.2 m, then the 2.5 m
 * OUTER shoulder. India drives on the left, so a broken-down vehicle pulls
 * left - which is the outer edge - and this is the centre of that shoulder.
 *
 * This used to be `laneOffset(direction, 0) * 0.62`, which works out at 4.4 m:
 * INBOARD of lane one, on the median side. A parked car appeared to be
 * standing in the middle of the highway rather than off it.
 */
const SHOULDER_OFFSET_M = 17.45
/** Positive offsets carry traffic toward Hosur, negative toward Krishnagiri. */
function laneOffset(direction: 1 | -1, lane: number): number {
  return LANE_CENTRES[lane % LANE_CENTRES.length]! * direction
}

/** Vehicles closer than this ahead in the same lane trigger an overtake. */
const OVERTAKE_TRIGGER_M = 140
/** Minimum gap needed in the target lane before pulling out. */
const OVERTAKE_CLEARANCE_M = 190
/** Seconds a vehicle stays committed to a lane after changing. */
const LANE_CHANGE_COOLDOWN_S = 6

/** Length of the Perandapalli congestion cluster, in metres. */
const CONGESTION_SPAN_M = 2600
/** Fraction of free-flow speed held inside the congestion cluster. */
const CONGESTION_SPEED_FACTOR = 0.3

interface DroneRuntime extends DroneState {
  zoneStartMeters: number
  zoneEndMeters: number
  direction: 1 | -1
  /** Distance the drone was patrolling at before an override. */
  patrolResumeMeters: number
  /**
   * Off-corridor destination while responding to an SOS.
   *
   * SOS response is the one case that leaves the corridor, so these drones
   * carry a geographic target instead of a chainage.
   */
  sosTarget: Position | null
  /** Position of the stopped vehicle this drone is observing. */
  monitorTarget: Position | null
}

interface VehicleRuntime extends VehicleState {
  baseSpeedKmh: number
  /** Index into LANE_CENTRES. */
  lane: number
  laneCooldown: number
  /** Simulated-clock timestamp when the operator stopped it, ms. */
  stoppedAtSimMs: number | null
  /**
   * Metres this vehicle is currently displaced outboard to clear the
   * ambulance. Eased rather than snapped so the move reads as a driver
   * pulling over.
   */
  yieldShiftMeters: number
  ticketedAtMs: number | null
  ticketedAtSimMs: number | null
  ticketedDroneCode: string | null
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function idleAmbulance(): AmbulanceEmergencyState {
  return {
    active: false,
    vehicleCode: null,
    assignedDroneCode: null,
    droneLeadMeters: ESCORT_LEAD_M,
    startChainageMeters: 0,
    destinationChainageMeters: 0,
    destinationName: 'Hosur',
    destinationKind: 'CORRIDOR',
    destinationPosition: [0, 0],
    startName: 'Krishnagiri',
    speakerMessage: null,
    startedAtIso: null,
    stage: 'DISPATCHED',
    distanceRemainingMeters: 0,
    etaSeconds: null,
  }
}

export class SimulationEngine {
  private tick = 0
  private running = false
  private trafficRunning = false
  private speedMultiplier = 1
  private simulatedTime = new Date()

  private readonly drones: DroneRuntime[] = []
  private readonly stations: StationState[] = []
  private readonly vehicles: VehicleRuntime[] = []
  private ambulance: AmbulanceEmergencyState = idleAmbulance()
  /** Simulated seconds spent in the current ambulance stage. */
  private ambulanceStageSeconds = 0
  private sos: SosState | null = null
  /** Simulated seconds spent in the current SOS stage. */
  private sosStageSeconds = 0
  /** Straight-line metres the simulated medical unit still has to cover. */
  private sosResponderMeters = 0
  private nextSosId = 1
  private suspicious: SuspiciousVehicleState | null = null
  private nextIncidentId = 1
  /** Rotates the ambulance start across the corridor between runs. */
  private nextAmbulanceSegment = Math.floor(Math.random() * AMBULANCE_START_SEGMENTS)

  private timer: NodeJS.Timeout | null = null
  private nextVehicleId = 1
  private congestionCentreMeters: number | null = null
  private latestViolation: SpeedViolationRecord | null = null
  private violationsCount = 0

  constructor() {
    this.buildStations()
    this.buildDrones()
    void this.initViolationsCount()
    // The corridor should never look dead: traffic runs from start-up rather
    // than waiting for an operator to switch it on.
    this.startTraffic()
  }

  private async initViolationsCount(): Promise<void> {
    try {
      const raw = await fs.promises.readFile(VIOLATIONS_FILE, 'utf8').catch(() => '[]')
      const list: SpeedViolationRecord[] = JSON.parse(raw || '[]')
      this.violationsCount = list.length
      if (list.length > 0) {
        this.latestViolation = list[list.length - 1] ?? null
      }
    } catch {
      this.violationsCount = 0
    }
  }

  // --- lifecycle ------------------------------------------------------------

  start(): void {
    this.running = true
    if (!this.timer) {
      this.timer = setInterval(() => this.step(), 1000 / TICK_HZ)
      this.timer.unref?.()
    }
  }

  pause(): void {
    this.running = false
  }

  reset(): void {
    this.running = false
    this.trafficRunning = false
    this.nextAmbulanceSegment = Math.floor(Math.random() * AMBULANCE_START_SEGMENTS)
    this.vehicles.length = 0
    this.nextVehicleId = 1
    this.drones.length = 0
    this.stations.length = 0
    this.ambulance = idleAmbulance()
    this.sos = null
    this.suspicious = null
    this.buildStations()
    this.buildDrones()
    this.simulatedTime = new Date()
    // Traffic is a permanent feature of the corridor, not an opt-in: a reset
    // repopulates it rather than leaving an empty highway.
    this.startTraffic()
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.running = false
  }

  setSpeed(multiplier: number): void {
    if ([1, 5, 10, 60].includes(multiplier)) {
      this.speedMultiplier = multiplier
    }
  }

  // --- construction ---------------------------------------------------------

  private buildStations(): void {
    // One station every two zones, placed on the shared boundary.
    for (let i = 0; i < 5; i++) {
      const distance = ZONE_LENGTH_M * (i * 2 + 1)
      this.stations.push({
        code: `CS-${pad(i + 1)}`,
        name: `Charging Station ${pad(i + 1)} - ${nearestNodeName(distance)} sector`,
        position: positionAtDistance(distance),
        distanceAlongMeters: distance,
        capacity: STATION_CAPACITY,
        occupiedSlots: 0,
        dockedDroneCodes: [],
      })
    }
  }

  private buildDrones(): void {
    for (let i = 0; i < ZONE_COUNT; i++) {
      const zoneStart = ZONE_LENGTH_M * i
      const zoneEnd = ZONE_LENGTH_M * (i + 1)
      // Spread the fleet across its zones so they are not in lock-step.
      const start = zoneStart + ZONE_LENGTH_M * (0.2 + 0.06 * i)
      const battery = 62 + ((i * 7) % 34)

      this.drones.push({
        code: `DR-${pad(i + 1)}`,
        name: `Drone Patrol DR-${pad(i + 1)}`,
        zoneCode: `Z-${pad(i + 1)}`,
        zoneStartMeters: zoneStart,
        zoneEndMeters: zoneEnd,
        distanceAlongMeters: start,
        patrolResumeMeters: start,
        direction: i % 2 === 0 ? 1 : -1,
        position: positionAtDistance(start),
        altitudeMeters: PATROL_ALTITUDE_M,
        headingDegrees: headingAtDistance(start),
        speedKmh: DRONE_SPEED_MPS * 3.6,
        batteryPercentage: battery,
        mode: 'PATROLLING',
        cameraStatus: 'LIVE',
        speakerStatus: 'IDLE',
        gpsStatus: 'LOCKED',
        stationCode: null,
        escortingVehicleCode: null,
        sosTarget: null,
        monitorTarget: null,
      })
    }
  }

  // --- traffic --------------------------------------------------------------

  /**
   * Populates the corridor with traffic.
   *
   * Two populations: free-flowing vehicles spread over the whole corridor, and
   * a dense congestion cluster around Perandapalli, so the demo has a visible
   * traffic hotspot rather than uniformly sparse cars.
   */
  startTraffic(freeFlowCount = 150, congestionCount = 70): void {
    if (this.vehicles.length === 0) {
      const kinds: VehicleKind[] = [
        'CAR', 'CAR', 'CAR', 'CAR', 'TRUCK', 'BUS', 'CAR', 'TRUCK', 'CAR',
      ]

      for (let i = 0; i < freeFlowCount; i++) {
        const distance = (CORRIDOR.lengthMeters * (i + 0.5)) / freeFlowCount
        this.spawnVehicle(kinds[i % kinds.length]!, distance, i % 2 === 0 ? 1 : -1, i % 3)
      }

      const node = CORRIDOR_NODES.find((n) => n.name === 'Perandapalli')
      if (node) {
        this.congestionCentreMeters = distanceAtPosition(node.coordinates)
        for (let i = 0; i < congestionCount; i++) {
          const t = i / Math.max(1, congestionCount - 1)
          const distance = this.congestionCentreMeters - CONGESTION_SPAN_M / 2 + CONGESTION_SPAN_M * t
          if (distance < 0 || distance > CORRIDOR.lengthMeters) {
            continue
          }
          this.spawnVehicle(kinds[i % kinds.length]!, distance, i % 2 === 0 ? 1 : -1, i % 3)
        }
      }
    }
    this.trafficRunning = true
    this.start()
  }

  private spawnVehicle(kind: VehicleKind, distance: number, direction: 1 | -1, lane: number): void {
    // Normal traffic speed limit is 80 km/h; regular traffic runs at legal highway speeds
    const base = kind === 'CAR' ? 73 : kind === 'BUS' ? 62 : 55
    // Spread speeds so faster vehicles catch slower ones and overtake
    const jitter = ((this.nextVehicleId * 37) % 9) - 4
    this.vehicles.push({
      code: `VH-${pad(this.nextVehicleId++)}`,
      kind,
      direction,
      lane,
      laneCooldown: 0,
      distanceAlongMeters: distance,
      position: positionAtDistance(distance),
      headingDegrees: headingAtDistance(distance),
      baseSpeedKmh: base + jitter,
      speedKmh: base + jitter,
      laneOffsetMeters: laneOffset(direction, lane),
      yielding: false,
      stopped: false,
      stoppedMinutes: 0,
      stoppedAtSimMs: null,
      yieldShiftMeters: 0,
      spawnSeq: 0,
      ticketedAtMs: null,
      ticketedAtSimMs: null,
      ticketedDroneCode: null,
    })
  }


  stopTraffic(): void {
    this.trafficRunning = false
  }

  resetTraffic(): void {
    this.vehicles.length = 0
    this.nextVehicleId = 1
    this.congestionCentreMeters = null
    this.trafficRunning = false
  }

  // --- stopped / suspicious vehicles ----------------------------------------

  /**
   * Parks a vehicle on the corridor and starts its stationary timer.
   *
   * The vehicle keeps its chainage, so it stays exactly where it was on NH-44
   * rather than being moved to an arbitrary coordinate.
   */
  stopVehicle(code: string): { ok: true } | { error: string } {
    const vehicle = this.vehicles.find((v) => v.code === code)
    if (!vehicle) {
      return { error: `Unknown vehicle ${code}` }
    }
    if (vehicle.kind === 'AMBULANCE') {
      return { error: 'The ambulance cannot be parked during a priority run' }
    }
    if (vehicle.stopped) {
      return { ok: true }
    }
    vehicle.stopped = true
    vehicle.stoppedAtSimMs = this.simulatedTime.getTime()
    vehicle.stoppedMinutes = 0
    vehicle.speedKmh = 0
    // Pull onto the outer hard shoulder rather than blocking a running lane.
    vehicle.lane = LANE_CENTRES.length - 1
    vehicle.laneOffsetMeters = SHOULDER_OFFSET_M * vehicle.direction
    this.start()
    return { ok: true }
  }

  /** Restarts a stopped vehicle and clears any incident raised against it. */
  startVehicle(code: string): { ok: true } | { error: string } {
    const vehicle = this.vehicles.find((v) => v.code === code)
    if (!vehicle) {
      return { error: `Unknown vehicle ${code}` }
    }
    vehicle.stopped = false
    vehicle.stoppedAtSimMs = null
    vehicle.stoppedMinutes = 0
    vehicle.speedKmh = vehicle.baseSpeedKmh
    vehicle.laneOffsetMeters = laneOffset(vehicle.direction, vehicle.lane)
    if (this.suspicious?.vehicleCode === code) {
      this.clearSuspicious()
    }
    return { ok: true }
  }

  /**
   * Spawns an overspeeding test vehicle (~135 km/h) placed ~160m upstream
   * heading toward DR-01 (or nearest patrolling drone) to test radar capture and JSON logging.
   */
  triggerOverspeedVehicle(): VehicleState {
    const drone = this.drones.find((d) => d.code === 'DR-01') ?? this.drones.find((d) => d.mode === 'PATROLLING') ?? this.drones[0]
    if (drone && (drone.mode === 'CHARGING' || drone.mode === 'OFFLINE')) {
      if (drone.mode === 'CHARGING') {
        this.undock(drone)
      }
      drone.mode = 'PATROLLING'
      drone.batteryPercentage = Math.max(drone.batteryPercentage, 80)
      drone.altitudeMeters = PATROL_ALTITUDE_M
      drone.stationCode = null
      drone.cameraStatus = 'LIVE'
      drone.speedKmh = DRONE_SPEED_MPS * 3.6
    }

    const direction: 1 | -1 = drone ? drone.direction : 1
    const spawnDist = drone
      ? Math.max(
          50,
          Math.min(CORRIDOR.lengthMeters - 50, drone.distanceAlongMeters - 160 * direction),
        )
      : 8000

    const randomTag = Math.floor(1000 + Math.random() * 9000)
    const speed = 155
    const vehicle: VehicleRuntime = {
      code: `VH-SPEED-${randomTag}`,
      kind: 'CAR',
      direction,
      lane: 0,
      laneCooldown: 0,
      distanceAlongMeters: spawnDist,
      position: positionAtDistance(spawnDist),
      headingDegrees: headingAtDistance(spawnDist),
      baseSpeedKmh: speed,
      speedKmh: speed,
      laneOffsetMeters: laneOffset(direction, 0),
      yielding: false,
      stopped: false,
      stoppedMinutes: 0,
      stoppedAtSimMs: null,
      yieldShiftMeters: 0,
      spawnSeq: 0,
      ticketedAtMs: null,
      ticketedAtSimMs: null,
      ticketedDroneCode: null,
    }

    this.vehicles.push(vehicle)
    this.start()
    return vehicle
  }

  /**
   * Scans moving traffic against active patrol drones.
   * If a vehicle speed exceeds SPEED_LIMIT_KMH (80 km/h) and passes within
   * drone radar range (100m), an automated E-Challan is calculated and saved.
   *
   * A 4-hour cooldown across the entire drone fleet is enforced so a vehicle
   * is not repeatedly fined by multiple drones along the corridor.
   */
  private stepSpeedEnforcement(): void {
    const nowSimMs = this.simulatedTime.getTime()
    const nowWallMs = Date.now()
    const COOLDOWN_SIM_MS = 2 * 60 * 60 * 1000 // 2 hours in simulation clock
    const COOLDOWN_WALL_MS = 2 * 60 * 60 * 1000 // 2 hours in wall clock

    for (const vehicle of this.vehicles) {
      if (vehicle.speedKmh <= SPEED_LIMIT_KMH || vehicle.stopped) {
        continue
      }
      // Check if this vehicle was already ticketed by ANY drone within the 4-hour cooldown window
      const lastSim = vehicle.ticketedAtSimMs ?? 0
      const lastWall = vehicle.ticketedAtMs ?? 0
      if (
        (lastSim > 0 && nowSimMs - lastSim < COOLDOWN_SIM_MS) ||
        (lastWall > 0 && nowWallMs - lastWall < COOLDOWN_WALL_MS)
      ) {
        continue
      }

      for (const drone of this.drones) {
        if (drone.mode === 'CHARGING' || drone.mode === 'OFFLINE') {
          continue
        }
        const gap = Math.abs(drone.distanceAlongMeters - vehicle.distanceAlongMeters)
        if (gap <= PASSBY_DETECTION_RANGE_M) {
          vehicle.ticketedAtMs = nowWallMs
          vehicle.ticketedAtSimMs = nowSimMs
          vehicle.ticketedDroneCode = drone.code
          this.recordViolation(drone, vehicle)
          break
        }
      }
    }
  }

  private recordViolation(drone: DroneRuntime, vehicle: VehicleRuntime): void {
    const speed = Math.round(vehicle.speedKmh)
    const excess = speed - SPEED_LIMIT_KMH
    let fine = '₹1,000'
    let section = 'Section 183(1) - Motor Vehicles Act (Speed Limit Exceeded: +1-20 km/h)'
    if (speed > 120) {
      fine = '₹2,000'
      section = 'Section 183(2) & 184 - Motor Vehicles Act (Dangerous Overspeeding: >40 km/h)'
    } else if (speed > 100) {
      fine = '₹1,500'
      section = 'Section 183(2) - Motor Vehicles Act (Excess Speed Violation: +21-40 km/h)'
    }

    const violation: SpeedViolationRecord = {
      violationId: `ECH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${pad(this.violationsCount + 1)}`,
      timestamp: new Date().toISOString(),
      capturedDroneId: drone.code,
      capturedDroneName: drone.name,
      vehicleCode: vehicle.code,
      vehicleKind: vehicle.kind,
      measuredSpeedKmh: speed,
      speedLimitKmh: SPEED_LIMIT_KMH,
      excessSpeedKmh: excess,
      fineAmount: fine,
      section,
      location: {
        chainageMeters: Math.round(vehicle.distanceAlongMeters),
        sectorName: nodeNameAt(vehicle.distanceAlongMeters),
        coordinates: SimulationEngine.coord(vehicle.position),
      },
    }

    this.latestViolation = violation
    this.violationsCount += 1
    void this.saveViolationToFile(violation)
  }

  private async saveViolationToFile(violation: SpeedViolationRecord): Promise<void> {
    try {
      const raw = await fs.promises.readFile(VIOLATIONS_FILE, 'utf8').catch(() => '[]')
      const list: SpeedViolationRecord[] = JSON.parse(raw || '[]')
      list.push(violation)
      await fs.promises.writeFile(VIOLATIONS_FILE, JSON.stringify(list, null, 2), 'utf8')
    } catch (err) {
      console.error('Failed to write violation to speedViolations.json:', err)
    }
  }

  async getViolations(): Promise<SpeedViolationRecord[]> {
    try {
      const raw = await fs.promises.readFile(VIOLATIONS_FILE, 'utf8').catch(() => '[]')
      return JSON.parse(raw || '[]')
    } catch {
      return []
    }
  }

  /** Resolves the active stopped-vehicle incident and releases its drone. */
  clearSuspicious(): void {
    for (const drone of this.drones) {
      if (drone.mode === 'MONITORING') {
        drone.mode = 'RETURNING'
        drone.speakerStatus = 'IDLE'
        drone.monitorTarget = null
      }
    }
    this.suspicious = null
  }

  /**
   * Advances stationary timers and drives the two escalation stages.
   *
   * Only one incident is tracked at a time: this is a demonstration of the
   * workflow, and a queue of concurrent incidents would add machinery without
   * showing anything new.
   */
  private stepSuspicious(): void {
    const nowMs = this.simulatedTime.getTime()

    for (const vehicle of this.vehicles) {
      if (!vehicle.stopped || vehicle.stoppedAtSimMs === null) {
        vehicle.stoppedMinutes = 0
        continue
      }
      vehicle.stoppedMinutes = (nowMs - vehicle.stoppedAtSimMs) / 60000
    }

    // Promote the longest-stopped vehicle once it crosses the threshold.
    if (!this.suspicious) {
      const candidate = this.vehicles
        .filter((v) => v.stopped && v.stoppedMinutes >= SUSPICIOUS_THRESHOLD_MIN)
        .sort((a, b) => b.stoppedMinutes - a.stoppedMinutes)[0]
      if (candidate) {
        this.raiseSuspicious(candidate)
      }
      return
    }

    const vehicle = this.vehicles.find((v) => v.code === this.suspicious!.vehicleCode)
    if (!vehicle || !vehicle.stopped) {
      this.clearSuspicious()
      return
    }

    const incident = this.suspicious
    incident.stoppedMinutes = Math.round(vehicle.stoppedMinutes * 10) / 10
    incident.position = vehicle.position
    incident.chainageMeters = Math.round(vehicle.distanceAlongMeters)

    const drone = this.drones.find((d) => d.code === incident.assignedDroneCode)
    if (drone) {
      incident.droneDistanceMeters = Math.round(metersBetween(drone.position, vehicle.position))
      incident.droneOnStation = incident.droneDistanceMeters <= MONITOR_ARRIVAL_M
      incident.speakerMessage = incident.droneOnStation ? SUSPICIOUS_SPEAKER_MESSAGE : null
      drone.speakerStatus = incident.droneOnStation ? 'ACTIVE' : 'IDLE'
      // Keep the drone tracking the vehicle if it is nudged along the shoulder.
      drone.monitorTarget = vehicle.position
    }

    if (
      vehicle.stoppedMinutes >= ESCALATION_THRESHOLD_MIN &&
      incident.stage !== 'POLICE_DISPATCH'
    ) {
      // SIMULATED ONLY. No call is placed and no external service is contacted.
      incident.stage = 'POLICE_DISPATCH'
      incident.policeDispatchSimulated = true
    }
  }

  private raiseSuspicious(vehicle: VehicleRuntime): void {
    const drone = this.pickMonitorDrone(vehicle)
    if (drone) {
      drone.mode = 'MONITORING'
      drone.patrolResumeMeters = drone.distanceAlongMeters
      drone.stationCode = null
      drone.monitorTarget = vehicle.position
    }

    this.suspicious = {
      id: 'INC-' + pad(this.nextIncidentId++),
      vehicleCode: vehicle.code,
      vehicleKind: vehicle.kind,
      stage: drone ? 'SUSPICIOUS' : 'MONITORING_PENDING',
      stoppedMinutes: Math.round(vehicle.stoppedMinutes * 10) / 10,
      suspiciousThresholdMinutes: SUSPICIOUS_THRESHOLD_MIN,
      escalationThresholdMinutes: ESCALATION_THRESHOLD_MIN,
      position: vehicle.position,
      chainageMeters: Math.round(vehicle.distanceAlongMeters),
      sectorName: nodeNameAt(vehicle.distanceAlongMeters),
      assignedDroneCode: drone ? drone.code : null,
      droneDistanceMeters: drone
        ? Math.round(metersBetween(drone.position, vehicle.position))
        : 0,
      droneOnStation: false,
      speakerMessage: null,
      policeDispatchSimulated: false,
      startedAtIso: new Date().toISOString(),
    }
  }

  /**
   * Nearest patrolling drone with usable battery.
   *
   * Charging drones and any unit already committed to an ambulance escort or
   * an SOS are excluded: a stopped vehicle is the lowest-priority call.
   */
  private pickMonitorDrone(vehicle: VehicleRuntime): DroneRuntime | null {
    let best: DroneRuntime | null = null
    let bestGap = Infinity
    for (const drone of this.drones) {
      if (drone.mode !== 'PATROLLING' || drone.batteryPercentage < LOW_BATTERY + 10) {
        continue
      }
      const gap = metersBetween(drone.position, vehicle.position)
      if (gap < bestGap) {
        bestGap = gap
        best = drone
      }
    }
    return best
  }

  // --- ambulance emergency --------------------------------------------------

  /**
   * Triggers the ambulance priority corridor.
   *
   * Spawns an ambulance near the Krishnagiri end, assigns the nearest available
   * patrol drone, and puts that drone ESCORTING roughly 500 m ahead.
   */
  triggerAmbulance(): AmbulanceEmergencyState {
    if (this.ambulance.active) {
      return this.ambulance
    }

    // Random but always ON the corridor: a chainage is chosen and resolved
    // through the route geometry, never by inventing a longitude/latitude.
    // Segmented so consecutive runs start in visibly different places rather
    // than clustering around the same stretch.
    const segment = this.nextAmbulanceSegment
    this.nextAmbulanceSegment = (this.nextAmbulanceSegment + 1) % AMBULANCE_START_SEGMENTS
    const segmentSpan = 0.55 / AMBULANCE_START_SEGMENTS
    const startFraction = 0.04 + segment * segmentSpan + Math.random() * segmentSpan
    const startDistance = CORRIDOR.lengthMeters * startFraction

    // Destination is a REAL hospital from the OSM facility set, not a point on
    // the road: an ambulance run has to end somewhere that treats people.
    const hospital = hospitalAhead(startDistance)
    const destinationDistance = hospital
      ? hospital.chainageMeters
      : Math.min(CORRIDOR.lengthMeters - 200, startDistance + MIN_AMBULANCE_RUN_M)

    const ambulance: VehicleRuntime = {
      code: 'AMB-' + pad(this.nextVehicleId++),
      kind: 'AMBULANCE',
      direction: 1,
      lane: 0,
      laneCooldown: 0,
      distanceAlongMeters: startDistance,
      position: positionAtDistance(startDistance),
      headingDegrees: headingAtDistance(startDistance),
      baseSpeedKmh: 96,
      speedKmh: 96,
      laneOffsetMeters: laneOffset(1, 0),
      yielding: false,
      stopped: false,
      stoppedMinutes: 0,
      stoppedAtSimMs: null,
      yieldShiftMeters: 0,
      spawnSeq: 0,
      ticketedAtMs: null,
      ticketedAtSimMs: null,
      ticketedDroneCode: null,
    }
    this.vehicles.push(ambulance)

    const drone = this.pickEscortDrone(startDistance)
    if (drone) {
      drone.mode = 'ESCORTING'
      drone.escortingVehicleCode = ambulance.code
      drone.speakerStatus = 'IDLE'
      drone.patrolResumeMeters = drone.distanceAlongMeters
      drone.stationCode = null
    }

    this.ambulance = {
      active: true,
      vehicleCode: ambulance.code,
      assignedDroneCode: drone ? drone.code : null,
      droneLeadMeters: ESCORT_LEAD_M,
      startChainageMeters: Math.round(startDistance),
      destinationChainageMeters: Math.round(destinationDistance),
      destinationName: hospital ? hospital.name : nodeNameAt(destinationDistance),
      destinationKind: hospital ? 'HOSPITAL' : 'CORRIDOR',
      destinationPosition: hospital ? hospital.position : positionAtDistance(destinationDistance),
      startName: nodeNameAt(startDistance),
      speakerMessage: null,
      startedAtIso: new Date().toISOString(),
      stage: 'DISPATCHED',
      distanceRemainingMeters: Math.round(destinationDistance - startDistance),
      etaSeconds: Math.round((destinationDistance - startDistance) / (96 / 3.6)),
    }
    this.ambulanceStageSeconds = 0

    this.start()
    return this.ambulance
  }

  // --- SOS ------------------------------------------------------------------

  /**
   * Starts a simulated SOS at an operator-supplied position.
   *
   * The person does not have to be on the highway, so the assigned drone
   * navigates straight to the coordinates rather than along the corridor.
   * Returns an error when the position falls outside the operational area.
   */
  startSos(position: Position): { sos: SosState } | { error: string } {
    if (!isInsideOperationalArea(position)) {
      return { error: 'Location is outside the Drone Patrol operational area.' }
    }
    if (this.sos) {
      return { sos: this.sos }
    }

    const drone = this.pickSosDrone(position)
    if (drone) {
      drone.mode = 'SOS_TRACKING'
      drone.patrolResumeMeters = drone.distanceAlongMeters
      drone.speakerStatus = 'ACTIVE'
      drone.stationCode = null
      drone.sosTarget = position
    }

    // Which hospital a medical unit would actually come from. Straight-line
    // distance, because the person may be well off the highway.
    const nearest = nearestHospitalTo(position)
    const gap = drone ? Math.round(metersBetween(drone.position, position)) : 0

    this.sos = {
      id: 'SOS-' + pad(this.nextSosId++),
      status: 'ACTIVE',
      position,
      personReference: 'SIM-PERSON-' + pad(this.nextSosId),
      assignedDroneCode: drone ? drone.code : null,
      droneDistanceMeters: gap,
      tracking: false,
      startedAtIso: new Date().toISOString(),
      stage: 'DISPATCHED',
      narrative: drone
        ? `${drone.code} dispatched to the reported position.`
        : 'No drone available; the request is queued.',
      droneEtaSeconds: drone ? Math.round(gap / SOS_SPEED_MPS) : null,
      onSceneSeconds: 0,
      droneAltitudeMeters: PATROL_ALTITUDE_M,
      responderCode: null,
      responderName: null,
      responderDistanceMeters: null,
      responderEtaSeconds: null,
      nearestHospitalName: nearest ? nearest.poi.name : null,
      nearestHospitalMeters: nearest ? Math.round(nearest.meters) : null,
      simulated: true,
    }
    this.sosStageSeconds = 0

    this.start()
    return { sos: this.sos }
  }

  /**
   * Advances the SOS response.
   *
   * Reaching the person is the start of the response, not the end of it. The
   * drone previously flew to the coordinates and hovered there until the
   * operator pressed Stop, so an SOS looked like it did nothing. Now the
   * response works through assessment, a simulated medical dispatch from the
   * nearest real hospital, arrival, and closure - and clears itself.
   *
   * SIMULATED THROUGHOUT: no emergency service is contacted, no call is
   * placed and no external dispatch API exists.
   */
  private stepSos(dt: number): void {
    const sos = this.sos
    if (!sos) {
      return
    }
    // Hold the resolved card briefly so the operator sees the outcome rather
    // than the panel vanishing the instant the response closes.
    if (sos.stage === 'RESOLVED') {
      this.sosStageSeconds += dt
      if (this.sosStageSeconds >= SOS_RESOLVED_HOLD_S) {
        this.sos = null
      }
      return
    }

    const drone = sos.assignedDroneCode
      ? this.drones.find((d) => d.code === sos.assignedDroneCode)
      : undefined
    const gap = drone ? metersBetween(drone.position, sos.position) : Infinity
    const onStation = drone !== undefined && gap <= SOS_ARRIVAL_M

    this.sosStageSeconds += dt
    let stage: SosStage = sos.stage
    let narrative = sos.narrative
    let responderCode = sos.responderCode
    let responderName = sos.responderName
    let responderDistance = sos.responderDistanceMeters
    let responderEta = sos.responderEtaSeconds

    switch (sos.stage) {
      case 'DISPATCHED': {
        narrative = drone
          ? `${drone.code} en route, ${Math.round(gap)} m out.`
          : 'Awaiting an available drone.'
        if (onStation) {
          stage = 'ON_SCENE'
          this.sosStageSeconds = 0
          narrative = `${drone!.code} on scene. Descending for visual assessment.`
        }
        break
      }
      case 'ON_SCENE': {
        // Drop to observation height so the camera is actually useful.
        narrative = `${drone?.code ?? 'Drone'} holding overhead. Assessing the scene.`
        if (this.sosStageSeconds >= SOS_ASSESS_S) {
          stage = 'ASSESSING'
          this.sosStageSeconds = 0
        }
        break
      }
      case 'ASSESSING': {
        narrative = 'Casualty located. Preparing simulated medical dispatch.'
        if (this.sosStageSeconds >= SOS_MEDICAL_DISPATCH_S) {
          stage = 'MEDICAL_EN_ROUTE'
          this.sosStageSeconds = 0
          responderCode = 'MED-' + pad(this.nextVehicleId++)
          responderName = sos.nearestHospitalName ?? 'Nearest hospital'
          // The unit travels from the nearest hospital to the scene.
          this.sosResponderMeters = sos.nearestHospitalMeters ?? 4000
          responderDistance = Math.round(this.sosResponderMeters)
          responderEta = Math.round(this.sosResponderMeters / SOS_RESPONDER_MPS)
          narrative = `Simulated medical unit ${responderCode} dispatched from ${responderName}.`
        }
        break
      }
      case 'MEDICAL_EN_ROUTE': {
        this.sosResponderMeters = Math.max(0, this.sosResponderMeters - SOS_RESPONDER_MPS * dt)
        responderDistance = Math.round(this.sosResponderMeters)
        responderEta = Math.round(this.sosResponderMeters / SOS_RESPONDER_MPS)
        narrative = `${responderCode} inbound, ${responderDistance} m out. Drone maintaining overwatch.`
        if (this.sosResponderMeters <= SOS_RESPONDER_ARRIVAL_M) {
          stage = 'MEDICAL_ON_SCENE'
          this.sosStageSeconds = 0
          responderDistance = 0
          responderEta = 0
          narrative = `${responderCode} on scene. Casualty being attended to.`
        }
        break
      }
      case 'MEDICAL_ON_SCENE': {
        narrative = `${responderCode} attending. Drone remains on overwatch.`
        if (this.sosStageSeconds >= SOS_HANDOVER_S) {
          stage = 'RESOLVED'
          this.sosStageSeconds = 0
          narrative = 'Casualty in medical care. Response complete.'
        }
        break
      }
      default:
        break
    }

    if (drone) {
      // Descend once on scene, climb back on the way out.
      const wanted = onStation && stage !== 'RESOLVED' ? SOS_ONSCENE_ALTITUDE_M : PATROL_ALTITUDE_M
      drone.altitudeMeters += Math.sign(wanted - drone.altitudeMeters) *
        Math.min(6 * dt, Math.abs(wanted - drone.altitudeMeters))
      // The speaker only talks once the drone is actually over the person.
      drone.speakerStatus = onStation && stage !== 'RESOLVED' ? 'ACTIVE' : 'IDLE'
    }

    this.sos = {
      ...sos,
      stage,
      narrative,
      status: stage === 'RESOLVED' ? 'RESOLVED' : onStation ? 'TRACKING' : 'ACTIVE',
      tracking: onStation,
      droneDistanceMeters: Number.isFinite(gap) ? Math.round(gap) : 0,
      droneEtaSeconds: onStation ? null : Math.round(gap / SOS_SPEED_MPS),
      onSceneSeconds: onStation ? sos.onSceneSeconds + dt : sos.onSceneSeconds,
      droneAltitudeMeters: drone ? Math.round(drone.altitudeMeters) : sos.droneAltitudeMeters,
      responderCode,
      responderName,
      responderDistanceMeters: responderDistance,
      responderEtaSeconds: responderEta,
    }

    // Closing the response releases the drone immediately; the incident card
    // lingers for SOS_RESOLVED_HOLD_S so the outcome is readable.
    if (stage === 'RESOLVED') {
      for (const d of this.drones) {
        if (d.mode === 'SOS_TRACKING') {
          d.mode = 'RETURNING'
          d.speakerStatus = 'IDLE'
          d.sosTarget = null
        }
      }
      this.sosStageSeconds = 0
    }
  }

  /** Resolves the SOS and returns the assigned drone to its patrol zone. */
  stopSos(): void {
    for (const drone of this.drones) {
      if (drone.mode === 'SOS_TRACKING') {
        drone.mode = 'RETURNING'
        drone.speakerStatus = 'IDLE'
        drone.sosTarget = null
      }
    }
    this.sos = null
  }

  /** Nearest patrolling drone to an off-corridor position. */
  private pickSosDrone(position: Position): DroneRuntime | null {
    let best: DroneRuntime | null = null
    let bestGap = Infinity
    for (const drone of this.drones) {
      if (drone.mode !== 'PATROLLING' || drone.batteryPercentage < LOW_BATTERY + 10) {
        continue
      }
      const gap = metersBetween(drone.position, position)
      if (gap < bestGap) {
        bestGap = gap
        best = drone
      }
    }
    return best
  }

  /**
   * Picks the escort drone.
   *
   * The nearest available unit, which follows from the start position varying:
   * an ambulance appearing in a different part of the corridor is met by
   * whichever drone patrols that zone.
   */
  private pickEscortDrone(distance: number): DroneRuntime | null {
    let best: DroneRuntime | null = null
    let bestGap = Infinity
    for (const drone of this.drones) {
      if (drone.mode !== 'PATROLLING' || drone.batteryPercentage < LOW_BATTERY + 10) {
        continue
      }
      const gap = Math.abs(drone.distanceAlongMeters - distance)
      if (gap < bestGap) {
        bestGap = gap
        best = drone
      }
    }
    return best
  }

  /** Sends a specific drone to the nearest free charging pad. */
  sendDroneToCharge(code: string): { ok: true } | { error: string } {
    const drone = this.drones.find((d) => d.code === code)
    if (!drone) {
      return { error: `Unknown drone ${code}` }
    }
    if (drone.mode === 'CHARGING') {
      return { error: `${code} is already charging` }
    }
    if (drone.mode === 'ESCORTING' || drone.mode === 'SOS_TRACKING') {
      return { error: `${code} is committed to an active emergency` }
    }
    const station = this.reserveStation(drone)
    if (!station) {
      return { error: 'No charging pad is free' }
    }
    drone.stationCode = station.code
    drone.mode = 'RETURNING'
    return { ok: true }
  }

  /** Recalls a charging drone to its patrol zone. */
  recallDrone(code: string): { ok: true } | { error: string } {
    const drone = this.drones.find((d) => d.code === code)
    if (!drone) {
      return { error: `Unknown drone ${code}` }
    }
    if (drone.mode === 'CHARGING') {
      this.undock(drone)
    }
    drone.stationCode = null
    drone.sosTarget = null
    drone.escortingVehicleCode = null
    drone.speakerStatus = 'IDLE'
    drone.mode = 'RETURNING'
    return { ok: true }
  }

  /**
   * The ambulance has reached its hospital.
   *
   * It stops at the forecourt and stays visible while the handover runs -
   * previously it was deleted the instant its chainage matched, so the run
   * ended with the vehicle blinking out of existence somewhere near a
   * hospital rather than visibly arriving at one.
   */
  private arriveAmbulance(vehicle: VehicleRuntime): void {
    vehicle.distanceAlongMeters = this.ambulance.destinationChainageMeters
    vehicle.position = positionAtDistance(vehicle.distanceAlongMeters)
    vehicle.headingDegrees = headingAtDistance(vehicle.distanceAlongMeters)
    vehicle.speedKmh = 0

    this.ambulance = {
      ...this.ambulance,
      stage: 'ARRIVED',
      distanceRemainingMeters: 0,
      etaSeconds: 0,
      speakerMessage: null,
    }
    this.ambulanceStageSeconds = 0

    // The corridor is clear the moment the ambulance is off it.
    for (const other of this.vehicles) {
      other.yielding = false
    }
    // Release the escort straight away: there is nothing left to escort.
    for (const drone of this.drones) {
      if (drone.mode === 'ESCORTING') {
        drone.mode = 'RETURNING'
        drone.escortingVehicleCode = null
        drone.speakerStatus = 'IDLE'
      }
    }
  }

  /**
   * Runs the tail of an ambulance emergency: handover, then a short COMPLETED
   * summary, then back to idle.
   */
  private stepAmbulancePhase(dt: number): void {
    if (!this.ambulance.active) {
      return
    }

    if (this.ambulance.stage === 'DISPATCHED' || this.ambulance.stage === 'EN_ROUTE') {
      const vehicle = this.vehicles.find((v) => v.code === this.ambulance.vehicleCode)
      if (!vehicle) {
        return
      }
      const remaining = Math.max(
        0,
        this.ambulance.destinationChainageMeters - vehicle.distanceAlongMeters,
      )
      const mps = vehicle.speedKmh / 3.6
      this.ambulance = {
        ...this.ambulance,
        distanceRemainingMeters: Math.round(remaining),
        etaSeconds: mps > 0.5 ? Math.round(remaining / mps) : null,
      }
      return
    }

    this.ambulanceStageSeconds += dt

    if (this.ambulance.stage === 'ARRIVED' && this.ambulanceStageSeconds >= AMBULANCE_HANDOVER_S) {
      // Patient handed over: the vehicle leaves the simulation here, standing
      // still at the hospital, so nothing teleports.
      const index = this.vehicles.findIndex((v) => v.code === this.ambulance.vehicleCode)
      if (index >= 0) {
        this.vehicles.splice(index, 1)
      }
      this.ambulance = { ...this.ambulance, stage: 'COMPLETED', vehicleCode: null }
      this.ambulanceStageSeconds = 0
      return
    }

    if (
      this.ambulance.stage === 'COMPLETED' &&
      this.ambulanceStageSeconds >= AMBULANCE_SUMMARY_S
    ) {
      this.ambulance = {
        ...this.ambulance,
        active: false,
        assignedDroneCode: null,
        speakerMessage: null,
      }
      this.ambulanceStageSeconds = 0
    }
  }

  // --- tick -----------------------------------------------------------------

  private step(): void {
    if (!this.running) {
      return
    }
    const dt = TICK_SECONDS * this.speedMultiplier
    this.tick++
    this.simulatedTime = new Date(this.simulatedTime.getTime() + dt * 1000)

    this.stepVehicles(dt)
    this.stepDrones(dt)
    this.stepAmbulancePhase(dt)
    this.stepSos(dt)
    this.stepSuspicious()
    this.stepSpeedEnforcement()
  }

  private stepVehicles(dt: number): void {
    const ambulance = this.ambulance.active
      ? this.vehicles.find((v) => v.code === this.ambulance.vehicleCode)
      : undefined

    for (const vehicle of this.vehicles) {
      const isAmbulance = vehicle.kind === 'AMBULANCE'
      if (!this.trafficRunning && !isAmbulance) {
        continue
      }
      // Operator-parked vehicles hold their chainage on the shoulder.
      if (vehicle.stopped) {
        vehicle.speedKmh = 0
        continue
      }

      // Vehicles ahead of the ambulance in the same direction pull aside.
      //
      // Keyed on TIME to intercept, not raw distance: the ambulance only
      // closes at a few metres per second, so a fixed distance gave vehicles
      // wildly different amounts of warning and the nearest ones appeared to
      // move over only after being passed.
      if (ambulance && vehicle !== ambulance && vehicle.direction === ambulance.direction) {
        const gap =
          (vehicle.distanceAlongMeters - ambulance.distanceAlongMeters) * ambulance.direction
        vehicle.yielding = gap > 0 && gap < YIELD_RANGE_M
      } else if (!ambulance) {
        vehicle.yielding = false
      }

      // Slide toward the shoulder while yielding and drift back afterwards,
      // so the space opens up visibly rather than the car merely slowing.
      const shiftTarget = vehicle.yielding ? YIELD_SHIFT_M : 0
      const shiftStep = YIELD_SHIFT_MPS * dt
      vehicle.yieldShiftMeters +=
        Math.sign(shiftTarget - vehicle.yieldShiftMeters) *
        Math.min(shiftStep, Math.abs(shiftTarget - vehicle.yieldShiftMeters))

      const isOverspeed = vehicle.code.startsWith('VH-SPEED-')

      // --- car following, overtaking and congestion --------------------
      let target = vehicle.baseSpeedKmh
      if (vehicle.yielding) {
        target *= 0.4
      }
      if (isAmbulance && this.ambulance.stage === 'EN_ROUTE') {
        // Decelerate into the hospital so the arrival is a stop, not a
        // disappearance at 96 km/h.
        const remaining = this.ambulance.destinationChainageMeters - vehicle.distanceAlongMeters
        if (remaining < AMBULANCE_BRAKE_M) {
          const t = Math.max(0, remaining) / AMBULANCE_BRAKE_M
          target = AMBULANCE_ARRIVAL_KMH + (target - AMBULANCE_ARRIVAL_KMH) * t
        }
      }
      if (this.inCongestion(vehicle.distanceAlongMeters) && !isAmbulance && !isOverspeed) {
        target *= CONGESTION_SPEED_FACTOR
      }

      if (!isAmbulance) {
        vehicle.laneCooldown = Math.max(0, vehicle.laneCooldown - dt)
        const ahead = this.vehicleAhead(vehicle, vehicle.lane)

        if (ahead && ahead.gap < OVERTAKE_TRIGGER_M) {
          // Try to pull out; otherwise fall in behind at the leader's speed.
          const overtaken = this.tryOvertake(vehicle)
          if (!overtaken && !isOverspeed) {
            target = Math.min(target, ahead.vehicle.speedKmh * 0.92)
          }
        } else if (vehicle.lane > 0 && vehicle.laneCooldown === 0 && !isOverspeed) {
          // Drift back toward the inside lane once the road ahead is clear.
          const inner = this.vehicleAhead(vehicle, vehicle.lane - 1)
          if (!inner || inner.gap > OVERTAKE_CLEARANCE_M * 1.6) {
            this.changeLane(vehicle, vehicle.lane - 1)
          }
        }
      }

      // Ease toward the target speed so overtakes look like acceleration.
      vehicle.speedKmh += (target - vehicle.speedKmh) * Math.min(1, dt * 1.6)
      vehicle.distanceAlongMeters += (vehicle.speedKmh / 3.6) * dt * vehicle.direction

      if (isAmbulance && this.ambulance.stage === 'EN_ROUTE') {
        const remaining = this.ambulance.destinationChainageMeters - vehicle.distanceAlongMeters
        if (remaining <= 0) {
          this.arriveAmbulance(vehicle)
          continue
        }
      }

      // Ordinary traffic wraps around so the corridor stays populated.
      //
      // The renderer eases between snapshots, so a wrap has to be announced:
      // without `spawnSeq` the car smoothly flew the whole 50 km back to
      // Krishnagiri through the air. Bumping it tells the client to place the
      // vehicle at its new position rather than travel to it.
      if (vehicle.distanceAlongMeters > CORRIDOR.lengthMeters) {
        vehicle.distanceAlongMeters -= CORRIDOR.lengthMeters
        vehicle.spawnSeq += 1
        vehicle.yieldShiftMeters = 0
      } else if (vehicle.distanceAlongMeters < 0) {
        vehicle.distanceAlongMeters += CORRIDOR.lengthMeters
        vehicle.spawnSeq += 1
        vehicle.yieldShiftMeters = 0
      }

      vehicle.position = positionAtDistance(vehicle.distanceAlongMeters)
      const heading = headingAtDistance(vehicle.distanceAlongMeters)
      vehicle.headingDegrees = vehicle.direction === 1 ? heading : (heading + 180) % 360
      // Outboard is away from the centreline, whichever side this
      // carriageway is on.
      vehicle.laneOffsetMeters =
        laneOffset(vehicle.direction, vehicle.lane) +
        Math.sign(laneOffset(vehicle.direction, vehicle.lane) || 1) * vehicle.yieldShiftMeters
    }
  }

  private stepDrones(dt: number): void {
    const minutes = dt / 60
    const ambulance = this.ambulance.active
      ? this.vehicles.find((v) => v.code === this.ambulance.vehicleCode)
      : undefined

    for (const drone of this.drones) {
      switch (drone.mode) {
        case 'ESCORTING': {
          if (!ambulance) {
            drone.mode = 'RETURNING'
            drone.speakerStatus = 'IDLE'
            break
          }
          // Hold station ESCORT_LEAD_M (~100m) ahead of the ambulance along the corridor.
          const target = Math.min(
            CORRIDOR.lengthMeters,
            Math.max(0, ambulance.distanceAlongMeters + ESCORT_LEAD_M * ambulance.direction),
          )
          drone.distanceAlongMeters = this.approach(
            drone.distanceAlongMeters,
            target,
            ESCORT_SPEED_MPS * dt,
          )
          drone.batteryPercentage = Math.max(0, drone.batteryPercentage - DRAIN_PER_MINUTE * minutes * 1.4)
          drone.speedKmh = ESCORT_SPEED_MPS * 3.6

          const gapToTarget = Math.abs(drone.distanceAlongMeters - target)
          if (gapToTarget <= 80) {
            drone.speakerStatus = 'ACTIVE'
            if (this.ambulance.active && this.ambulance.stage === 'DISPATCHED') {
              this.ambulance.stage = 'EN_ROUTE'
              this.ambulance.speakerMessage = SPEAKER_MESSAGE
            }
          } else {
            drone.speakerStatus = 'IDLE'
            if (this.ambulance.active && this.ambulance.stage === 'DISPATCHED') {
              this.ambulance.speakerMessage = null
            }
          }
          break
        }

        case 'SOS_TRACKING': {
          // The only mode that leaves the corridor: fly straight at the
          // person's coordinates in geographic space.
          const target = drone.sosTarget
          if (!target) {
            drone.mode = 'RETURNING'
            drone.speakerStatus = 'IDLE'
            break
          }
          const gap = metersBetween(drone.position, target)
          if (gap > SOS_ARRIVAL_M) {
            const step = Math.min(gap, SOS_SPEED_MPS * dt)
            const t = step / gap
            drone.position = [
              drone.position[0] + (target[0] - drone.position[0]) * t,
              drone.position[1] + (target[1] - drone.position[1]) * t,
            ]
          } else {
            drone.position = [target[0], target[1]]
          }
          drone.altitudeMeters = PATROL_ALTITUDE_M
          drone.batteryPercentage = Math.max(
            0,
            drone.batteryPercentage - DRAIN_PER_MINUTE * minutes * 1.3,
          )
          if (this.sos) {
            const distance = metersBetween(drone.position, target)
            this.sos.droneDistanceMeters = Math.round(distance)
            this.sos.tracking = distance <= SOS_ARRIVAL_M
            this.sos.status = this.sos.tracking ? 'TRACKING' : 'ACTIVE'
          }
          // Position is set directly here, so skip the corridor resolution
          // that every other mode falls through to.
          drone.speedKmh = SOS_SPEED_MPS * 3.6
          continue
        }

        case 'MONITORING': {
          // Like an SOS response, the drone leaves the corridor frame and
          // homes on the vehicle's geographic position.
          const target = drone.monitorTarget
          if (!target) {
            drone.mode = 'RETURNING'
            drone.speakerStatus = 'IDLE'
            break
          }
          const gap = metersBetween(drone.position, target)
          if (gap > MONITOR_ARRIVAL_M) {
            const step = Math.min(gap, MONITOR_SPEED_MPS * dt)
            const t = step / gap
            drone.position = [
              drone.position[0] + (target[0] - drone.position[0]) * t,
              drone.position[1] + (target[1] - drone.position[1]) * t,
            ]
          } else {
            drone.position = [target[0], target[1]]
          }
          drone.altitudeMeters = PATROL_ALTITUDE_M
          drone.batteryPercentage = Math.max(
            0,
            drone.batteryPercentage - DRAIN_PER_MINUTE * minutes * 1.2,
          )
          drone.speedKmh = MONITOR_SPEED_MPS * 3.6
          continue
        }

        case 'RETURNING': {
          // Fly back GEOGRAPHICALLY, at patrol speed, from wherever the drone
          // actually is.
          //
          // This used to interpolate chainage only, so a drone recalled from a
          // charging pad or an off-corridor SOS had its position rewritten from
          // the corridor on the very next tick - it appeared to snap instantly
          // back to where it started. Moving the real position means the return
          // leg takes as long as the outbound one did.
          const targetChainage =
            drone.stationCode !== null
              ? (this.stations.find((s) => s.code === drone.stationCode)?.distanceAlongMeters ??
                drone.patrolResumeMeters)
              : drone.patrolResumeMeters
          const targetPosition = positionAtDistance(targetChainage)
          const gap = metersBetween(drone.position, targetPosition)

          drone.batteryPercentage = Math.max(0, drone.batteryPercentage - DRAIN_PER_MINUTE * minutes)
          drone.altitudeMeters = PATROL_ALTITUDE_M
          drone.cameraStatus = 'LIVE'

          if (gap > RETURN_ARRIVAL_M) {
            const step = Math.min(gap, DRONE_SPEED_MPS * dt)
            const t = step / gap
            const nextLon = drone.position[0] + (targetPosition[0] - drone.position[0]) * t
            const nextLat = drone.position[1] + (targetPosition[1] - drone.position[1]) * t
            // Face the direction of travel rather than the corridor bearing.
            const dLon = (nextLon - drone.position[0]) * Math.cos((nextLat * Math.PI) / 180)
            const dLat = nextLat - drone.position[1]
            if (Math.hypot(dLon, dLat) > 1e-9) {
              drone.headingDegrees = (450 - (Math.atan2(dLat, dLon) * 180) / Math.PI) % 360
            }
            drone.position = [nextLon, nextLat]
            drone.speedKmh = DRONE_SPEED_MPS * 3.6
            // Position is authoritative while flying; skip the corridor tail.
            continue
          }

          // Arrived: hand back to chainage-based behaviour.
          drone.distanceAlongMeters = targetChainage
          if (drone.stationCode !== null) {
            this.dock(drone)
          } else {
            drone.mode = 'PATROLLING'
          }
          break
        }

        case 'CHARGING': {
          drone.batteryPercentage = Math.min(100, drone.batteryPercentage + CHARGE_PER_MINUTE * minutes)
          drone.altitudeMeters = 0
          drone.speedKmh = 0
          // Spec: a charging drone reports its camera unavailable.
          drone.cameraStatus = 'UNAVAILABLE'
          if (drone.batteryPercentage >= RESUME_PATROL_BATTERY) {
            this.undock(drone)
            drone.mode = 'RETURNING'
            drone.altitudeMeters = PATROL_ALTITUDE_M
            // Clearing the pad first makes RETURNING fly to the patrol zone
            // rather than straight back onto the pad it just left.
            drone.stationCode = null
          }
          break
        }

        case 'PATROLLING':
        default: {
          drone.distanceAlongMeters += DRONE_SPEED_MPS * dt * drone.direction
          if (drone.distanceAlongMeters >= drone.zoneEndMeters) {
            drone.distanceAlongMeters = drone.zoneEndMeters
            drone.direction = -1
          } else if (drone.distanceAlongMeters <= drone.zoneStartMeters) {
            drone.distanceAlongMeters = drone.zoneStartMeters
            drone.direction = 1
          }
          drone.patrolResumeMeters = drone.distanceAlongMeters
          drone.batteryPercentage = Math.max(0, drone.batteryPercentage - DRAIN_PER_MINUTE * minutes)
          drone.altitudeMeters = PATROL_ALTITUDE_M
          drone.cameraStatus = 'LIVE'

          if (drone.batteryPercentage <= LOW_BATTERY) {
            const station = this.reserveStation(drone)
            if (station) {
              drone.stationCode = station.code
              drone.mode = 'RETURNING'
            }
          }
          break
        }
      }

      drone.position = positionAtDistance(drone.distanceAlongMeters)
      drone.headingDegrees = headingAtDistance(drone.distanceAlongMeters)
      drone.speedKmh = drone.mode === 'CHARGING' ? 0 : DRONE_SPEED_MPS * 3.6
      if (drone.batteryPercentage <= 0.5 && drone.mode !== 'CHARGING') {
        drone.mode = 'OFFLINE'
        drone.cameraStatus = 'UNAVAILABLE'
        drone.gpsStatus = 'LOST'
      }
    }
  }

  /** True when a distance falls inside the Perandapalli congestion cluster. */
  private inCongestion(distance: number): boolean {
    if (this.congestionCentreMeters === null) {
      return false
    }
    return Math.abs(distance - this.congestionCentreMeters) < CONGESTION_SPAN_M / 2
  }

  /** Closest vehicle ahead of `vehicle` in a given lane, same direction. */
  private vehicleAhead(
    vehicle: VehicleRuntime,
    lane: number,
  ): { vehicle: VehicleRuntime; gap: number } | null {
    let best: VehicleRuntime | null = null
    let bestGap = Infinity
    for (const other of this.vehicles) {
      if (other === vehicle || other.direction !== vehicle.direction || other.lane !== lane) {
        continue
      }
      const gap = (other.distanceAlongMeters - vehicle.distanceAlongMeters) * vehicle.direction
      if (gap > 0 && gap < bestGap) {
        bestGap = gap
        best = other
      }
    }
    return best ? { vehicle: best, gap: bestGap } : null
  }

  /** Moves to an adjacent lane if there is room. Returns true when it happens. */
  private tryOvertake(vehicle: VehicleRuntime): boolean {
    if (vehicle.laneCooldown > 0) {
      return false
    }
    // Prefer the outside lane, then fall back to the inside one.
    for (const candidate of [vehicle.lane + 1, vehicle.lane - 1]) {
      if (candidate < 0 || candidate >= 3) {
        continue
      }
      if (!this.laneIsClear(vehicle, candidate)) {
        continue
      }
      this.changeLane(vehicle, candidate)
      return true
    }
    return false
  }

  private laneIsClear(vehicle: VehicleRuntime, lane: number): boolean {
    for (const other of this.vehicles) {
      if (other === vehicle || other.direction !== vehicle.direction || other.lane !== lane) {
        continue
      }
      const gap = Math.abs(other.distanceAlongMeters - vehicle.distanceAlongMeters)
      if (gap < OVERTAKE_CLEARANCE_M) {
        return false
      }
    }
    return true
  }

  private changeLane(vehicle: VehicleRuntime, lane: number): void {
    vehicle.lane = lane
    vehicle.laneOffsetMeters = laneOffset(vehicle.direction, lane)
    vehicle.laneCooldown = LANE_CHANGE_COOLDOWN_S
  }

  private approach(current: number, target: number, step: number): number {
    const delta = target - current
    if (Math.abs(delta) <= step) {
      return target
    }
    return current + Math.sign(delta) * step
  }

  /** Nearest station with a free pad; capacity is enforced here. */
  private reserveStation(drone: DroneRuntime): StationState | null {
    let best: StationState | null = null
    let bestGap = Infinity
    for (const station of this.stations) {
      const reserved = this.drones.filter(
        (d) => d.stationCode === station.code && d !== drone,
      ).length
      if (reserved >= station.capacity) {
        continue
      }
      const gap = Math.abs(station.distanceAlongMeters - drone.distanceAlongMeters)
      if (gap < bestGap) {
        bestGap = gap
        best = station
      }
    }
    return best
  }

  private dock(drone: DroneRuntime): void {
    const station = this.stations.find((s) => s.code === drone.stationCode)
    if (!station) {
      drone.mode = 'PATROLLING'
      return
    }
    if (station.dockedDroneCodes.length >= station.capacity) {
      // Pad taken while inbound; go back on patrol and retry later.
      drone.stationCode = null
      drone.mode = 'PATROLLING'
      return
    }
    if (!station.dockedDroneCodes.includes(drone.code)) {
      station.dockedDroneCodes.push(drone.code)
      station.occupiedSlots = station.dockedDroneCodes.length
    }
    drone.mode = 'CHARGING'
    drone.cameraStatus = 'UNAVAILABLE'
  }

  private undock(drone: DroneRuntime): void {
    const station = this.stations.find((s) => s.code === drone.stationCode)
    if (!station) {
      return
    }
    station.dockedDroneCodes = station.dockedDroneCodes.filter((code) => code !== drone.code)
    station.occupiedSlots = station.dockedDroneCodes.length
  }

  // --- snapshot -------------------------------------------------------------

  /**
   * Rounds a coordinate to ~0.1 m.
   *
   * Full float precision on 200+ vehicles at 5 Hz is a few hundred KB/s of
   * digits nobody can see, and the client falls behind decoding it - which
   * showed up as stale positions and un-clickable drones.
   */
  private static coord(position: Position): Position {
    return [Math.round(position[0] * 1e6) / 1e6, Math.round(position[1] * 1e6) / 1e6]
  }

  snapshot(): SimulationSnapshot {
    const escort = this.drones.find((d) => d.code === this.ambulance.assignedDroneCode)
    const ambulanceVehicle = this.vehicles.find((v) => v.code === this.ambulance.vehicleCode)
    const lead =
      escort && ambulanceVehicle
        ? Math.abs(escort.distanceAlongMeters - ambulanceVehicle.distanceAlongMeters)
        : ESCORT_LEAD_M

    return {
      tick: this.tick,
      running: this.running,
      trafficRunning: this.trafficRunning,
      simulatedTimeIso: this.simulatedTime.toISOString(),
      speedMultiplier: this.speedMultiplier,
      drones: this.drones.map((d) => ({
        code: d.code,
        name: d.name,
        zoneCode: d.zoneCode,
        distanceAlongMeters: Math.round(d.distanceAlongMeters * 10) / 10,
        position: SimulationEngine.coord(d.position),
        altitudeMeters: Math.round(d.altitudeMeters),
        headingDegrees: Math.round(d.headingDegrees),
        speedKmh: Math.round(d.speedKmh),
        batteryPercentage: Math.round(d.batteryPercentage * 10) / 10,
        mode: d.mode,
        cameraStatus: d.cameraStatus,
        speakerStatus: d.speakerStatus,
        gpsStatus: d.gpsStatus,
        stationCode: d.stationCode,
        escortingVehicleCode: d.escortingVehicleCode,
      })),
      stations: this.stations.map((s) => ({ ...s, dockedDroneCodes: [...s.dockedDroneCodes] })),
      vehicles: this.vehicles.map((v) => ({
        code: v.code,
        kind: v.kind,
        distanceAlongMeters: Math.round(v.distanceAlongMeters * 10) / 10,
        position: SimulationEngine.coord(v.position),
        headingDegrees: Math.round(v.headingDegrees),
        speedKmh: Math.round(v.speedKmh),
        direction: v.direction,
        laneOffsetMeters: v.laneOffsetMeters,
        spawnSeq: v.spawnSeq,
        yielding: v.yielding,
        stopped: v.stopped,
        stoppedMinutes: Math.round(v.stoppedMinutes * 10) / 10,
      })),
      ambulance: { ...this.ambulance, droneLeadMeters: Math.round(lead) },
      sos: this.sos ? { ...this.sos } : null,
      suspicious: this.suspicious ? { ...this.suspicious } : null,
      latestViolation: this.latestViolation ? { ...this.latestViolation } : null,
      violationsCount: this.violationsCount,
    }
  }
}

export const simulation = new SimulationEngine()
