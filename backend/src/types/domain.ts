import type { GeoLineString, GeoPoint, GeoPolygon } from './geo.js'

export const DATA_SOURCES = ['SIMULATED', 'OSM_IMPORT', 'MANUAL'] as const
export type DataSource = (typeof DATA_SOURCES)[number]

export const DRONE_STATUSES = [
  'PATROLLING',
  'RESPONDING',
  'ESCORTING',
  'SOS_TRACKING',
  'CHARGING',
  'RETURNING',
  'OFFLINE',
  'EMERGENCY',
] as const
export type DroneStatus = (typeof DRONE_STATUSES)[number]

export const CAMERA_STATUSES = ['LIVE', 'OFFLINE', 'UNAVAILABLE'] as const
export type CameraStatus = (typeof CAMERA_STATUSES)[number]
export const SPEAKER_STATUSES = ['ACTIVE', 'IDLE', 'OFFLINE'] as const
export type SpeakerStatus = (typeof SPEAKER_STATUSES)[number]
export const GPS_STATUSES = ['LOCKED', 'WEAK', 'LOST'] as const
export type GpsStatus = (typeof GPS_STATUSES)[number]

export interface Drone {
  id: number
  droneCode: string
  name: string
  status: DroneStatus
  batteryPercentage: number
  location: GeoPoint
  altitudeMeters: number
  speedKmh: number
  headingDegrees: number
  cameraStatus: CameraStatus
  speakerStatus: SpeakerStatus
  gpsStatus: GpsStatus
  currentZoneId: number | null
  currentRouteId: number | null
  chargingStationId: number | null
  currentIncidentId: number | null
  lastTelemetryAt: string | null
  createdAt: string
  updatedAt: string
}

export const ZONE_STATUSES = ['ACTIVE', 'INACTIVE', 'MAINTENANCE'] as const
export type ZoneStatus = (typeof ZONE_STATUSES)[number]

export interface DroneZone {
  id: number
  zoneCode: string
  name: string
  geometry: GeoPolygon
  assignedDroneId: number | null
  routeId: number | null
  startLocation: GeoPoint
  endLocation: GeoPoint
  chargingStationId: number | null
  status: ZoneStatus
  dataSource: DataSource
  createdAt: string
  updatedAt: string
}

export const ROUTE_TYPES = ['PATROL', 'TRANSIT', 'EMERGENCY', 'CHARGING_APPROACH'] as const
export type RouteType = (typeof ROUTE_TYPES)[number]
export const ROUTE_STATUSES = ['ACTIVE', 'INACTIVE', 'DRAFT'] as const
export type RouteStatus = (typeof ROUTE_STATUSES)[number]

export interface DroneRoute {
  id: number
  name: string
  routeType: RouteType
  geometry: GeoLineString
  startLocation: GeoPoint
  endLocation: GeoPoint
  zoneId: number | null
  distanceMeters: number
  status: RouteStatus
  dataSource: DataSource
  createdAt: string
  updatedAt: string
}

export const POWER_STATUSES = ['ONLINE', 'OFFLINE', 'MAINTENANCE'] as const
export type PowerStatus = (typeof POWER_STATUSES)[number]
export const STATION_STATUSES = ['AVAILABLE', 'FULL', 'OFFLINE', 'MAINTENANCE'] as const
export type StationStatus = (typeof STATION_STATUSES)[number]

export interface ChargingStation {
  id: number
  stationCode: string
  name: string
  location: GeoPoint
  capacity: number
  occupiedSlots: number
  availableSlots: number
  powerStatus: PowerStatus
  status: StationStatus
  dataSource: DataSource
  notes: string | null
  createdAt: string
  updatedAt: string
}

export const ROAD_TYPES = [
  'NATIONAL_HIGHWAY',
  'STATE_HIGHWAY',
  'MAJOR_ROAD',
  'MINOR_ROAD',
  'SERVICE_ROAD',
  'JUNCTION_LINK',
] as const
export type RoadType = (typeof ROAD_TYPES)[number]

export const ROAD_STATUSES = ['ACTIVE', 'INACTIVE', 'CLOSED'] as const
export type RoadStatus = (typeof ROAD_STATUSES)[number]

export interface RoadSegment {
  id: number
  roadName: string
  roadType: RoadType
  geometry: GeoLineString
  startPoint: GeoPoint
  endPoint: GeoPoint
  distanceMeters: number
  speedLimitKmh: number | null
  zoneId: number | null
  status: RoadStatus
  dataSource: DataSource
  osmId: number | null
  createdAt: string
  updatedAt: string
}

export const LOCATION_TYPES = [
  'HOSPITAL',
  'SCHOOL',
  'COLLEGE',
  'FACTORY',
  'POLICE',
  'FIRE_STATION',
  'FUEL_STATION',
  'CITY',
  'VILLAGE',
  'CHARGING_STATION',
] as const
export type LocationType = (typeof LOCATION_TYPES)[number]

export interface MapLocation {
  id: number
  name: string
  type: LocationType
  location: GeoPoint
  description: string | null
  dataSource: DataSource
  osmId: number | null
  createdAt: string
  updatedAt: string
}

export const VEHICLE_TYPES = ['CAR', 'TRUCK', 'BIKE', 'BUS', 'AMBULANCE', 'POLICE'] as const
export type VehicleType = (typeof VEHICLE_TYPES)[number]

export const VEHICLE_STATUSES = [
  'MOVING',
  'STOPPED',
  'STATIONARY_WARNING',
  'SUSPICIOUS',
  'EMERGENCY',
  'OFFLINE',
] as const
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number]

export interface Vehicle {
  id: number
  vehicleCode: string
  type: VehicleType
  location: GeoPoint
  speedKmh: number
  headingDegrees: number
  status: VehicleStatus
  roadSegmentId: number | null
  lastMovementAt: string | null
  stationarySince: string | null
  createdAt: string
  updatedAt: string
}

export const ALERT_LEVELS = ['INFO', 'WARNING', 'CRITICAL', 'EMERGENCY'] as const
export type AlertLevel = (typeof ALERT_LEVELS)[number]

export const ALERT_TYPES = [
  'LOW_BATTERY',
  'CHARGING',
  'AMBULANCE_DETECTED',
  'SOS_ACTIVATED',
  'SUSPICIOUS_VEHICLE',
  'POLICE_DISPATCH',
  'CHARGING_STATION_FULL',
  'DRONE_OFFLINE',
  'COMMUNICATION_FAILURE',
] as const
export type AlertType = (typeof ALERT_TYPES)[number]

export interface Alert {
  id: number
  level: AlertLevel
  alertType: AlertType
  title: string
  message: string
  droneId: number | null
  vehicleId: number | null
  incidentId: number | null
  location: GeoPoint | null
  acknowledged: boolean
  acknowledgedAt: string | null
  createdAt: string
}

export const INCIDENT_TYPES = [
  'AMBULANCE',
  'SOS',
  'SUSPICIOUS_VEHICLE',
  'DRONE',
  'CHARGING',
  'COMMUNICATION',
] as const
export type IncidentType = (typeof INCIDENT_TYPES)[number]

export const INCIDENT_STATUSES = [
  'OPEN',
  'ACKNOWLEDGED',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
] as const
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number]

export interface Incident {
  id: number
  incidentType: IncidentType
  severity: AlertLevel
  title: string
  description: string | null
  status: IncidentStatus
  location: GeoPoint
  assignedDroneId: number | null
  vehicleId: number | null
  emergencyEventId: number | null
  sosEventId: number | null
  startedAt: string
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
}
