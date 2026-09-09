import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Material,
} from 'three'

/**
 * Shared geometry and materials for every fleet object.
 *
 * Ten drones, five stations and two dozen vehicles are built from ONE set of
 * geometries and materials, cloned only as `Mesh` instances. Building them per
 * object would multiply GPU uploads for no visual gain.
 *
 * No GLB assets ship with the project (`assets/` is empty), so these are
 * procedural. Swapping in real GLTF later means replacing the `create*` factory
 * only - the controllers position a `Group` and do not care what is inside it.
 *
 * Scene axes are East-North-Up in metres, so Z is up and Three.js primitives
 * built around Y need rotating. Models are drawn larger than life: a 2 m drone
 * or 4 m car is sub-pixel at corridor zoom, so these are map symbols with
 * believable proportions rather than true scale.
 */

const geometries: BufferGeometry[] = []
const materials: Material[] = []

function geo<T extends BufferGeometry>(g: T): T {
  geometries.push(g)
  return g
}
function mat<T extends Material>(m: T): T {
  materials.push(m)
  return m
}

// --- shared materials -------------------------------------------------------

export const MATERIALS = {
  droneShell: mat(new MeshStandardMaterial({ color: 0x39424e, roughness: 0.45, metalness: 0.35 })),
  droneAccent: mat(
    new MeshStandardMaterial({
      color: 0x2563eb,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.45,
      roughness: 0.35,
    }),
  ),
  droneEscort: mat(
    new MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0xb91c1c,
      emissiveIntensity: 0.6,
      roughness: 0.35,
    }),
  ),
  droneCharging: mat(
    new MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.45,
      roughness: 0.4,
    }),
  ),
  /**
   * High-visibility drone livery.
   *
   * At corridor zoom a slate-and-blue drone disappears against a dark basemap,
   * so the whole airframe switches to amber when zoomed out. It is a
   * legibility aid, not a status colour - mode is still carried by the accent.
   */
  droneHiVis: mat(
    new MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xeab308,
      emissiveIntensity: 0.75,
      roughness: 0.4,
    }),
  ),
  /** Amber ring drawn under a stopped vehicle that has become suspicious. */
  warning: mat(
    new MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.8,
      roughness: 0.4,
      transparent: true,
      opacity: 0.9,
    }),
  ),
  /** Red ring once the incident has escalated to a simulated dispatch. */
  warningEscalated: mat(
    new MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 0.9,
      roughness: 0.4,
      transparent: true,
      opacity: 0.92,
    }),
  ),
  selection: mat(
    new MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.9,
      roughness: 0.3,
      transparent: true,
      opacity: 0.9,
    }),
  ),
  /** Yellow ring when actively escorting an ambulance. */
  escortRing: mat(
    new MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xeab308,
      emissiveIntensity: 0.9,
      roughness: 0.3,
      transparent: true,
      opacity: 0.92,
    }),
  ),
  /** Purple ring when returning to assigned patrol zone. */
  returningRing: mat(
    new MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0x9333ea,
      emissiveIntensity: 0.9,
      roughness: 0.3,
      transparent: true,
      opacity: 0.92,
    }),
  ),
  dark: mat(new MeshStandardMaterial({ color: 0x1b2027, roughness: 0.7, metalness: 0.2 })),
  car: mat(new MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4, metalness: 0.3 })),
  speedingCar: mat(
    new MeshStandardMaterial({
      color: 0xff1e00,
      emissive: 0xff2200,
      emissiveIntensity: 0.75,
      roughness: 0.2,
      metalness: 0.6,
    }),
  ),
  speedingRing: mat(
    new MeshStandardMaterial({
      color: 0xff0033,
      emissive: 0xff0022,
      emissiveIntensity: 1.0,
      roughness: 0.2,
      transparent: true,
      opacity: 0.95,
    }),
  ),
  bus: mat(new MeshStandardMaterial({ color: 0x2f7bbf, roughness: 0.5, metalness: 0.15 })),
  truck: mat(new MeshStandardMaterial({ color: 0x6b7280, roughness: 0.6, metalness: 0.2 })),
  ambulance: mat(new MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.2 })),
  ambulanceStripe: mat(
    new MeshStandardMaterial({ color: 0xdc2626, emissive: 0x991b1b, emissiveIntensity: 0.4 }),
  ),
  glass: mat(new MeshStandardMaterial({ color: 0x334155, roughness: 0.2, metalness: 0.5 })),
  pad: mat(new MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 })),
  sos: mat(
    new MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 0.7,
      roughness: 0.4,
    }),
  ),
  sosBeam: mat(
    new MeshStandardMaterial({
      color: 0xf87171,
      emissive: 0xef4444,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.45,
    }),
  ),
  padDeck: mat(new MeshStandardMaterial({ color: 0x3f4854, roughness: 0.9, metalness: 0.05 })),
  padSteel: mat(new MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.45, metalness: 0.65 })),
  padSolar: mat(
    new MeshStandardMaterial({
      color: 0x1e3a5f,
      roughness: 0.25,
      metalness: 0.55,
      emissive: 0x0b1d33,
      emissiveIntensity: 0.25,
    }),
  ),
  padMarking: mat(new MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.85 })),
  padBeacon: mat(
    new MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 0.85,
      roughness: 0.4,
    }),
  ),
  padRing: mat(
    new MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.4,
      roughness: 0.6,
    }),
  ),
  padRingFull: mat(
    new MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.4,
      roughness: 0.6,
    }),
  ),
}

// --- shared geometry --------------------------------------------------------

const DRONE = { arm: 26, rotor: 15, bodyL: 34, bodyW: 20, bodyH: 10 }

const GEO = {
  droneBody: geo(new BoxGeometry(DRONE.bodyL, DRONE.bodyW, DRONE.bodyH)),
  droneStripe: geo(new BoxGeometry(DRONE.bodyL * 0.5, 3.5, 2)),
  droneArm: geo(new BoxGeometry(DRONE.arm, 3.5, 2.5)),
  droneRing: geo(new TorusGeometry(DRONE.rotor, 1.6, 6, 18)),
  droneBlade: geo(new BoxGeometry(DRONE.rotor * 1.8, 2.2, 0.6)),
  droneGimbal: geo(new SphereGeometry(6, 10, 8)),
  droneLens: geo(new CylinderGeometry(2.6, 2.6, 4, 8)),
  droneLeg: geo(new BoxGeometry(2.2, 2.2, 12)),
  navLight: geo(new SphereGeometry(2.6, 8, 6)),

  // Vehicle proportions follow real length:width:height ratios so they still
  // read correctly once the zoom-aware scale brings them to true size.
  carBody: geo(new BoxGeometry(30, 13, 7)),
  carCabin: geo(new BoxGeometry(15, 11.4, 6)),
  carWheel: geo(new CylinderGeometry(3, 3, 2, 8)),
  busBody: geo(new BoxGeometry(62, 16, 16)),
  busWindow: geo(new BoxGeometry(52, 16.4, 5)),
  truckBody: geo(new BoxGeometry(46, 16, 15)),
  truckCab: geo(new BoxGeometry(16, 15, 15)),
  ambBody: geo(new BoxGeometry(38, 14, 14)),
  ambStripe: geo(new BoxGeometry(38, 14.4, 3)),
  ambBeacon: geo(new BoxGeometry(8, 10, 3)),

  // SOS person: a simple standing figure plus a ground halo so the target is
  // findable from altitude.
  personBody: geo(new CylinderGeometry(3.2, 4.2, 12, 8)),
  personHead: geo(new SphereGeometry(2.6, 10, 8)),
  personHalo: geo(new TorusGeometry(14, 1.6, 6, 24)),
  sosBeam: geo(new CylinderGeometry(0.9, 0.9, 70, 6)),

  selectionRing: geo(new TorusGeometry(46, 3.2, 8, 32)),
  warningRing: geo(new TorusGeometry(30, 2.6, 8, 28)),

  // Charging station. The landing deck stays at ground level because a docked
  // drone reports altitude 0 - the "tower" is the mast, canopy and equipment
  // around the deck, not the deck itself.
  padApron: geo(new CylinderGeometry(78, 82, 3, 24)),
  padDeck: geo(new CylinderGeometry(62, 66, 6, 24)),
  padRing: geo(new TorusGeometry(58, 4, 6, 26)),
  padMast: geo(new CylinderGeometry(3.4, 4.6, 120, 8)),
  padMastBrace: geo(new BoxGeometry(2.2, 2.2, 26)),
  padBeaconHousing: geo(new CylinderGeometry(6, 7, 9, 8)),
  padCanopyPost: geo(new CylinderGeometry(2.4, 2.4, 46, 6)),
  padCanopy: geo(new TorusGeometry(44, 2.6, 6, 24)),
  padSolar: geo(new BoxGeometry(54, 30, 2)),
  padCabinet: geo(new BoxGeometry(26, 18, 22)),
  padCabinetVent: geo(new BoxGeometry(20, 1.5, 12)),
  padMarking: geo(new BoxGeometry(46, 5, 0.6)),
}

export interface DroneHandle {
  group: Group
  rotors: Mesh[]
  accent: Mesh
  /** Body and arm meshes, recoloured for the zoomed-out high-visibility mode. */
  shell: Mesh[]
  /** Ring shown around the drone the operator has selected (cyan). */
  selectionRing: Mesh
  /** Status ring for operational modes: ESCORTING (yellow) and RETURNING (purple). */
  statusRing: Mesh
}

export function createDrone(): DroneHandle {
  const group = new Group()

  const shell: Mesh[] = []
  const body = new Mesh(GEO.droneBody, MATERIALS.droneShell)
  group.add(body)
  shell.push(body)

  const accent = new Mesh(GEO.droneStripe, MATERIALS.droneAccent)
  accent.position.set(DRONE.bodyL * 0.18, 0, DRONE.bodyH / 2)
  group.add(accent)

  const rotors: Mesh[] = []
  for (let i = 0; i < 4; i++) {
    const angle = Math.PI / 4 + (i * Math.PI) / 2
    const x = Math.cos(angle) * DRONE.arm * 0.62
    const y = Math.sin(angle) * DRONE.arm * 0.62

    const arm = new Mesh(GEO.droneArm, MATERIALS.droneShell)
    arm.position.set(x / 2, y / 2, 0)
    arm.rotation.z = angle
    group.add(arm)
    shell.push(arm)

    const ring = new Mesh(GEO.droneRing, MATERIALS.dark)
    ring.position.set(x, y, DRONE.bodyH * 0.55)
    group.add(ring)

    const blade = new Mesh(GEO.droneBlade, MATERIALS.droneAccent)
    blade.position.set(x, y, DRONE.bodyH * 0.62)
    group.add(blade)
    rotors.push(blade)
  }

  const gimbal = new Mesh(GEO.droneGimbal, MATERIALS.dark)
  gimbal.position.set(DRONE.bodyL * 0.22, 0, -DRONE.bodyH * 0.7)
  group.add(gimbal)

  const lens = new Mesh(GEO.droneLens, MATERIALS.droneAccent)
  lens.rotation.z = Math.PI / 2
  lens.position.set(DRONE.bodyL * 0.22 + 5, 0, -DRONE.bodyH * 0.7)
  group.add(lens)

  for (const sign of [-1, 1]) {
    const leg = new Mesh(GEO.droneLeg, MATERIALS.dark)
    leg.position.set(sign * DRONE.bodyL * 0.28, 0, -DRONE.bodyH * 0.9)
    group.add(leg)
  }

  // Navigation light on the nose.
  const nav = new Mesh(GEO.navLight, MATERIALS.droneAccent)
  nav.position.set(DRONE.bodyL * 0.5, 0, 0)
  group.add(nav)

  // Status ring for mode highlights (Yellow for Escorting, Purple for Returning).
  const statusRing = new Mesh(GEO.selectionRing, MATERIALS.escortRing)
  statusRing.position.z = -DRONE.bodyH
  statusRing.visible = false
  group.add(statusRing)

  // Selection ring, hidden until the drone is picked (Cyan).
  const selectionRing = new Mesh(GEO.selectionRing, MATERIALS.selection)
  selectionRing.position.z = -DRONE.bodyH
  selectionRing.visible = false
  group.add(selectionRing)

  group.frustumCulled = false
  return { group, rotors, accent, shell, selectionRing, statusRing }
}

export interface VehicleHandle {
  group: Group
  /** Warning ring, hidden unless the vehicle is flagged suspicious or speeding. */
  warningRing: Mesh
  /** Body mesh for dynamic paint / speeding livery. */
  bodyMesh: Mesh
}

export function createVehicle(kind: 'CAR' | 'BUS' | 'TRUCK' | 'AMBULANCE'): VehicleHandle {
  const group = new Group()
  let bodyMesh: Mesh

  if (kind === 'CAR') {
    const body = new Mesh(GEO.carBody, MATERIALS.car)
    body.position.z = 5
    bodyMesh = body
    const cabin = new Mesh(GEO.carCabin, MATERIALS.glass)
    cabin.position.set(-2, 0, 10.5)
    group.add(body, cabin)
    for (const [x, y] of [[10, 6.5], [10, -6.5], [-10, 6.5], [-10, -6.5]] as const) {
      const wheel = new Mesh(GEO.carWheel, MATERIALS.dark)
      wheel.rotation.x = Math.PI / 2
      wheel.position.set(x, y, 2.5)
      group.add(wheel)
    }
  } else if (kind === 'BUS') {
    const body = new Mesh(GEO.busBody, MATERIALS.bus)
    body.position.z = 10
    bodyMesh = body
    const windows = new Mesh(GEO.busWindow, MATERIALS.glass)
    windows.position.set(0, 0, 14)
    group.add(body, windows)
  } else if (kind === 'TRUCK') {
    const body = new Mesh(GEO.truckBody, MATERIALS.truck)
    body.position.set(-8, 0, 10)
    bodyMesh = body
    const cab = new Mesh(GEO.truckCab, MATERIALS.bus)
    cab.position.set(22, 0, 9)
    group.add(body, cab)
  } else {
    const body = new Mesh(GEO.ambBody, MATERIALS.ambulance)
    body.position.z = 9
    bodyMesh = body
    const stripe = new Mesh(GEO.ambStripe, MATERIALS.ambulanceStripe)
    stripe.position.z = 8
    const beacon = new Mesh(GEO.ambBeacon, MATERIALS.ambulanceStripe)
    beacon.position.set(8, 0, 17.5)
    group.add(body, stripe, beacon)
  }

  const warningRing = new Mesh(GEO.warningRing, MATERIALS.warning)
  warningRing.position.z = 1
  warningRing.visible = false
  group.add(warningRing)

  group.frustumCulled = false
  return { group, warningRing, bodyMesh }
}

export interface StationHandle {
  group: Group
  ring: Mesh
}

export function createChargingStation(): StationHandle {
  const group = new Group()

  // Ground works: a concrete apron with the raised landing deck on top. The
  // deck stays low - a docked drone sits at altitude 0, so anything taller
  // would leave the drone parked at the foot of its own station.
  const apron = new Mesh(GEO.padApron, MATERIALS.pad)
  apron.rotation.x = Math.PI / 2
  apron.position.z = 1.5
  group.add(apron)

  const deck = new Mesh(GEO.padDeck, MATERIALS.padDeck)
  deck.rotation.x = Math.PI / 2
  deck.position.z = 6
  group.add(deck)

  // Touchdown cross painted on the deck.
  for (let i = 0; i < 2; i++) {
    const marking = new Mesh(GEO.padMarking, MATERIALS.padMarking)
    marking.position.z = 9.2
    marking.rotation.z = i * (Math.PI / 2)
    group.add(marking)
  }

  // Ring colour tracks occupancy; see FleetRenderer.
  const ring = new Mesh(GEO.padRing, MATERIALS.padRing)
  ring.position.z = 10
  group.add(ring)

  // Approach canopy: four posts carrying a guide hoop the drone descends
  // through, which is what gives the station its vertical presence.
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI / 4) + i * (Math.PI / 2)
    const post = new Mesh(GEO.padCanopyPost, MATERIALS.padSteel)
    post.rotation.x = Math.PI / 2
    post.position.set(Math.cos(angle) * 44, Math.sin(angle) * 44, 29)
    group.add(post)
  }
  const canopy = new Mesh(GEO.padCanopy, MATERIALS.padSteel)
  canopy.position.z = 52
  group.add(canopy)

  // Communications and beacon mast, braced against the apron.
  const mast = new Mesh(GEO.padMast, MATERIALS.padSteel)
  mast.rotation.x = Math.PI / 2
  mast.position.set(-64, 0, 62)
  group.add(mast)

  for (let i = 0; i < 3; i++) {
    const brace = new Mesh(GEO.padMastBrace, MATERIALS.padSteel)
    brace.position.set(-64, 0, 26 + i * 34)
    brace.rotation.y = Math.PI / 2
    group.add(brace)
  }

  const housing = new Mesh(GEO.padBeaconHousing, MATERIALS.dark)
  housing.rotation.x = Math.PI / 2
  housing.position.set(-64, 0, 126)
  group.add(housing)

  // Obstruction light: red, as any structure near a flight path carries.
  const beacon = new Mesh(GEO.navLight, MATERIALS.padBeacon)
  beacon.position.set(-64, 0, 134)
  group.add(beacon)

  // Power cabinet with a solar canopy over it - this is what makes it read as
  // a charging installation rather than a helipad.
  const cabinet = new Mesh(GEO.padCabinet, MATERIALS.dark)
  cabinet.position.set(72, 0, 14)
  group.add(cabinet)

  const vent = new Mesh(GEO.padCabinetVent, MATERIALS.padSteel)
  vent.position.set(72, -9.4, 16)
  group.add(vent)

  const solar = new Mesh(GEO.padSolar, MATERIALS.padSolar)
  solar.position.set(74, 0, 30)
  solar.rotation.y = -0.34
  group.add(solar)

  group.frustumCulled = false
  return { group, ring }
}

/**
 * The SOS target: a standing figure, a ground halo and a vertical beam.
 *
 * The beam matters more than the figure - a person is a couple of metres
 * across, so from patrol altitude the marker has to be findable, not accurate.
 */
export function createSosTarget(): Group {
  const group = new Group()

  const body = new Mesh(GEO.personBody, MATERIALS.sos)
  body.rotation.x = Math.PI / 2
  body.position.z = 6
  group.add(body)

  const head = new Mesh(GEO.personHead, MATERIALS.sos)
  head.position.z = 14.5
  group.add(head)

  const halo = new Mesh(GEO.personHalo, MATERIALS.sos)
  halo.position.z = 1
  group.add(halo)

  const beam = new Mesh(GEO.sosBeam, MATERIALS.sosBeam)
  beam.rotation.x = Math.PI / 2
  beam.position.z = 35
  group.add(beam)

  group.frustumCulled = false
  return group
}

/**
 * Frees every shared resource.
 *
 * Not called during normal operation: these are module-level singletons that
 * survive style swaps (which remove and re-add the Three.js layer). Exported
 * for teardown in tests or a future full-teardown path.
 */
export function disposeFleetResources(): void {
  for (const g of geometries) {
    g.dispose()
  }
  for (const m of materials) {
    m.dispose()
  }
}
