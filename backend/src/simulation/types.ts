import type { Position } from './corridor.js'

/** Wire format for the simulation snapshot broadcast over Socket.IO. */

export type DroneMode =
  | 'PATROLLING'
  | 'RETURNING'
  | 'CHARGING'
  | 'ESCORTING'
  | 'SOS_TRACKING'
  | 'MONITORING'
  | 'OFFLINE'

export interface DroneState {
  code: string
  name: string
  zoneCode: string
  /** Metres along the NH-44 corridor. */
  distanceAlongMeters: number
  position: Position
  altitudeMeters: number
  headingDegrees: number
  speedKmh: number
  batteryPercentage: number
  mode: DroneMode
  cameraStatus: 'LIVE' | 'UNAVAILABLE'
  speakerStatus: 'IDLE' | 'ACTIVE'
  gpsStatus: 'LOCKED' | 'WEAK' | 'LOST'
  /** Set while charging or en route to a pad. */
  stationCode: string | null
  /** Set while assigned to the ambulance corridor. */
  escortingVehicleCode: string | null
}

export interface StationState {
  code: string
  name: string
  position: Position
  distanceAlongMeters: number
  capacity: number
  occupiedSlots: number
  /** Drone codes currently on a pad. */
  dockedDroneCodes: string[]
}

export type VehicleKind = 'CAR' | 'BUS' | 'TRUCK' | 'AMBULANCE'

export interface VehicleState {
  code: string
  kind: VehicleKind
  distanceAlongMeters: number
  position: Position
  headingDegrees: number
  speedKmh: number
  /** 1 = travelling toward Hosur, -1 = toward Krishnagiri. */
  direction: 1 | -1
  /** Lane offset from the corridor centreline, in metres. */
  laneOffsetMeters: number
  /** True while yielding to an ambulance priority corridor. */
  yielding: boolean
  /** True when the operator has parked this vehicle on the hard shoulder. */
  stopped: boolean
  /** Simulated minutes the vehicle has been stationary; 0 when moving. */
  stoppedMinutes: number
  /**
   * Bumped whenever the vehicle wraps from one end of the corridor to the
   * other. The renderer eases between snapshots, so without this signal a
   * wrapping car visibly flew the length of the corridor back to Krishnagiri.
   */
  spawnSeq: number
}

/**
 * DISPATCHED - drone assigned and en route to intercept the ambulance.
 * EN_ROUTE   - drone on station leading ahead and actively escorting.
 * ARRIVED    - stopped at the hospital, handing the patient over.
 * COMPLETED  - run finished; the panel shows the outcome before clearing.
 */
export type AmbulanceStage = 'DISPATCHED' | 'EN_ROUTE' | 'ARRIVED' | 'COMPLETED'

export interface AmbulanceEmergencyState {
  active: boolean
  stage: AmbulanceStage
  vehicleCode: string | null
  assignedDroneCode: string | null
  /** Metres the drone leads the ambulance by. */
  droneLeadMeters: number
  /** Chainage along NH-44 where the run started and ends, in metres. */
  startChainageMeters: number
  destinationChainageMeters: number
  destinationName: string
  /** HOSPITAL when the run ends at a real OSM facility. */
  destinationKind: 'HOSPITAL' | 'CORRIDOR'
  destinationPosition: Position
  startName: string
  speakerMessage: string | null
  startedAtIso: string | null
  /** Metres still to run. 0 once the ambulance is at the hospital. */
  distanceRemainingMeters: number
  /** Seconds to arrival at the current speed; null once arrived. */
  etaSeconds: number | null
}

// --- dashboard ---------------------------------------------------------------

/**
 * Command dashboard state.
 *
 * SIMULATED THROUGHOUT. Every figure is either an invented opening balance
 * from `backend/data/dashboard.json` or a count of events this simulation
 * generated. None of it is real government data, real enforcement action or
 * real emergency-service activity, and nothing here reaches an external
 * system. Counters are baseline + live, so the dashboard is populated on a
 * cold start and then moves as the corridor is worked.
 */

export type ActivityKind =
  | 'AMBULANCE'
  | 'SOS'
  | 'VIOLATION'
  | 'SUSPICIOUS'
  | 'POLICE'
  | 'CHARGING'

export interface ActivityEvent {
  id: number
  /** Simulation clock time, ISO. */
  atIso: string
  kind: ActivityKind
  title: string
  detail: string
}

export interface EscortRecord {
  code: string
  route: string
  status: 'ACTIVE' | 'COMPLETED'
  responseSeconds: number
}

export interface SosRecord {
  code: string
  location: string
  status: string
}

export interface ViolationRecord {
  code: string
  speedKmh: number
  location: string
  fine: number
  /** Always true: this is a demonstration record, not an enforcement action. */
  simulated: boolean
}

export interface SuspiciousRecord {
  code: string
  stoppedMinutes: number
  location: string
  reason: string
  status: string
}

export interface ZoneCoverage {
  name: string
  droneCount: number
}

export interface DashboardState {
  /** Always true. Rendered in the UI so the figures cannot be mistaken. */
  simulated: boolean
  baselineLabel: string

  emergency: {
    ambulancesEscorted: number
    activeEscorts: number
    completedTrips: number
    averageEscortResponseSeconds: number
    sosResponses: number
    activeSos: number
    recentEscorts: EscortRecord[]
    recentSos: SosRecord[]
  }

  traffic: {
    vehiclesMonitored: number
    speedViolations: number
    simulatedFines: number
    vehiclesStopped: number
    averageSpeedKmh: number
    congestion: 'LIGHT' | 'MODERATE' | 'HEAVY'
    speedLimitKmh: number
    recentViolations: ViolationRecord[]
  }

  publicSafety: {
    sosRequests: number
    resolvedSos: number
    suspiciousVehicles: number
    activeInvestigations: number
    longStoppedVehicles: number
    policeDispatches: number
    watchlist: SuspiciousRecord[]
  }

  droneOperations: {
    total: number
    patrolling: number
    charging: number
    escorting: number
    available: number
    averageBatteryPercentage: number
    chargingStations: number
    chargingPadsOccupied: number
    chargingPadsTotal: number
    zones: ZoneCoverage[]
  }

  activity: ActivityEvent[]
}

export type SosStatus = 'ACTIVE' | 'TRACKING' | 'RESOLVED'

/**
 * What the response is actually doing.
 *
 * The drone used to fly to the coordinates and then hover indefinitely until
 * the operator pressed Stop. These stages give the response somewhere to go:
 * assess the scene, call a simulated medical unit, watch it arrive, close.
 */
export type SosStage =
  | 'DISPATCHED'
  | 'ON_SCENE'
  | 'ASSESSING'
  | 'MEDICAL_EN_ROUTE'
  | 'MEDICAL_ON_SCENE'
  | 'RESOLVED'

export interface SosState {
  id: string
  status: SosStatus
  /** Where the person is, as supplied by the operator. */
  position: Position
  personReference: string
  assignedDroneCode: string | null
  /** Metres between the assigned drone and the person. */
  droneDistanceMeters: number
  /** True once the drone is on station over the person. */
  tracking: boolean
  startedAtIso: string
  stage: SosStage
  /** Operator-facing line describing what the response is doing now. */
  narrative: string
  /** Seconds until the drone reaches the person; null once on scene. */
  droneEtaSeconds: number | null
  /** Simulated seconds the drone has been overhead. */
  onSceneSeconds: number
  /** Hovering observation altitude once on scene, in metres AGL. */
  droneAltitudeMeters: number
  /** Simulated medical unit, once dispatched. */
  responderCode: string | null
  responderName: string | null
  /** Metres between the medical unit and the person; null before dispatch. */
  responderDistanceMeters: number | null
  responderEtaSeconds: number | null
  /** Nearest real hospital to the scene, from the OSM facility set. */
  nearestHospitalName: string | null
  nearestHospitalMeters: number | null
  /** Always true: no real emergency service is contacted. */
  simulated: boolean
}

export type SuspiciousStage = 'MONITORING_PENDING' | 'SUSPICIOUS' | 'POLICE_DISPATCH'

/**
 * A stopped-vehicle incident.
 *
 * Thresholds are measured in SIMULATED minutes, so the 40 and 80 minute stages
 * can be demonstrated in seconds by raising the simulation speed.
 */
export interface SuspiciousVehicleState {
  id: string
  vehicleCode: string
  vehicleKind: VehicleKind
  stage: SuspiciousStage
  /** Simulated minutes stationary. */
  stoppedMinutes: number
  suspiciousThresholdMinutes: number
  escalationThresholdMinutes: number
  position: Position
  chainageMeters: number
  sectorName: string
  assignedDroneCode: string | null
  droneDistanceMeters: number
  /** True once the drone is on station over the vehicle. */
  droneOnStation: boolean
  speakerMessage: string | null
  policeDispatchSimulated: boolean
  startedAtIso: string
}

export interface SpeedViolationRecord {
  violationId: string
  timestamp: string
  capturedDroneId: string
  capturedDroneName: string
  vehicleCode: string
  vehicleKind: VehicleKind
  measuredSpeedKmh: number
  speedLimitKmh: number
  excessSpeedKmh: number
  fineAmount: string
  section: string
  location: {
    chainageMeters: number
    sectorName: string
    coordinates: Position
  }
}

export interface SimulationSnapshot {
  /** Monotonic tick counter; lets the client discard out-of-order frames. */
  tick: number
  running: boolean
  trafficRunning: boolean
  simulatedTimeIso: string
  speedMultiplier: number
  drones: DroneState[]
  stations: StationState[]
  vehicles: VehicleState[]
  ambulance: AmbulanceEmergencyState
  sos: SosState | null
  suspicious: SuspiciousVehicleState | null
  dashboard: DashboardState
  /** Most recent E-Challan record, for the alert popup. */
  latestViolation: SpeedViolationRecord | null
  violationsCount: number
}
