import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  Alert,
  ChargingStation,
  Drone,
  DroneRoute,
  DroneZone,
  Incident,
  MapLocation,
  RoadSegment,
  Vehicle,
} from '../types/domain.js'
import type { GeoLineString, GeoPoint, GeoPolygon } from '../types/geo.js'

/**
 * Prototype datasets.
 *
 * Drone Patrol is deployed as a hosted demo, so runtime no longer depends on
 * MySQL. These JSON files were exported from the Phase 2 schema and keep the
 * same ids and relationships, which is why the REST responses are unchanged
 * and the frontend needed no rewrite.
 *
 * They are CONFIGURATION, read once at start-up and never written back. All
 * moving state - positions, battery, charging, ambulance and SOS - lives in
 * memory in the simulation engine, so the app runs happily on a read-only or
 * ephemeral filesystem. A restart resets the simulation from these files,
 * which is acceptable for a prototype.
 *
 * Geography here is SIMULATED placeholder data inherited from Phase 2. The
 * real OSM NH-44 alignment is separate, in `map-data/roads/`.
 */

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'data')

function load<T>(file: string, key: string): T[] {
  const raw = readFileSync(path.join(dataDir, file), 'utf8')
  const parsed = JSON.parse(raw) as Record<string, unknown>
  const rows = parsed[key]
  if (!Array.isArray(rows)) {
    throw new Error(`${file}: expected an array under "${key}"`)
  }
  return rows as T[]
}

/** Shapes as stored in the JSON files, before mapping to the API types. */
interface RawDrone {
  id: number
  code: string
  name: string
  status: Drone['status']
  batteryPercentage: number
  location: GeoPoint
  altitudeMeters: number
  speedKmh: number
  headingDegrees: number
  cameraStatus: Drone['cameraStatus']
  speakerStatus: Drone['speakerStatus']
  gpsStatus: Drone['gpsStatus']
  zoneId: number | null
  routeId: number | null
  chargingStationId: number | null
}

interface RawZone {
  id: number
  code: string
  name: string
  geometry: GeoPolygon
  assignedDroneId: number | null
  routeId: number | null
  startLocation: GeoPoint
  endLocation: GeoPoint
  chargingStationId: number | null
  status: DroneZone['status']
  dataSource: DroneZone['dataSource']
}

interface RawRoute {
  id: number
  name: string
  routeType: DroneRoute['routeType']
  geometry: GeoLineString
  zoneId: number | null
  distanceMeters: number
  status: DroneRoute['status']
  dataSource: DroneRoute['dataSource']
}

interface RawStation {
  id: number
  code: string
  name: string
  location: GeoPoint
  capacity: number
  occupiedSlots: number
  powerStatus: ChargingStation['powerStatus']
  status: ChargingStation['status']
  dataSource: ChargingStation['dataSource']
  notes: string | null
}

interface RawSegment {
  id: number
  roadName: string
  roadType: RoadSegment['roadType']
  geometry: GeoLineString
  distanceMeters: number
  speedLimitKmh: number | null
  zoneId: number | null
  status: RoadSegment['status']
  dataSource: RoadSegment['dataSource']
  osmId: number | null
}

interface RawLocation {
  id: number
  name: string
  type: MapLocation['type']
  location: GeoPoint
  description: string | null
  dataSource: MapLocation['dataSource']
  osmId: number | null
}

interface RawVehicle {
  id: number
  code: string
  type: Vehicle['type']
  location: GeoPoint
  speedKmh: number
  headingDegrees: number
  status: Vehicle['status']
  roadSegmentId: number | null
}

interface RawAlert {
  id: number
  level: Alert['level']
  alertType: Alert['alertType']
  title: string
  message: string
  droneId: number | null
  vehicleId: number | null
  incidentId: number | null
  location: GeoPoint | null
  acknowledged: boolean
}

interface RawIncident {
  id: number
  incidentType: Incident['incidentType']
  severity: Incident['severity']
  title: string
  description: string | null
  status: Incident['status']
  location: GeoPoint
  assignedDroneId: number | null
  vehicleId: number | null
}

/** Timestamps the API contract still carries; fixed for static config rows. */
const CONFIG_TIMESTAMP = new Date(0).toISOString()

function withTimestamps<T>(row: T): T & { createdAt: string; updatedAt: string } {
  return { ...row, createdAt: CONFIG_TIMESTAMP, updatedAt: CONFIG_TIMESTAMP }
}

export const DRONES: Drone[] = load<RawDrone>('drones.json', 'drones').map((d) =>
  withTimestamps({
    id: d.id,
    droneCode: d.code,
    name: d.name,
    status: d.status,
    batteryPercentage: d.batteryPercentage,
    location: d.location,
    altitudeMeters: d.altitudeMeters,
    speedKmh: d.speedKmh,
    headingDegrees: d.headingDegrees,
    cameraStatus: d.cameraStatus,
    speakerStatus: d.speakerStatus,
    gpsStatus: d.gpsStatus,
    currentZoneId: d.zoneId,
    currentRouteId: d.routeId,
    chargingStationId: d.chargingStationId,
    currentIncidentId: null,
    lastTelemetryAt: null,
  }),
)

export const ZONES: DroneZone[] = load<RawZone>('droneZones.json', 'zones').map((z) =>
  withTimestamps({
    id: z.id,
    zoneCode: z.code,
    name: z.name,
    geometry: z.geometry,
    assignedDroneId: z.assignedDroneId,
    routeId: z.routeId,
    startLocation: z.startLocation,
    endLocation: z.endLocation,
    chargingStationId: z.chargingStationId,
    status: z.status,
    dataSource: z.dataSource,
  }),
)

export const ROUTES: DroneRoute[] = load<RawRoute>('droneRoutes.json', 'routes').map((r) =>
  withTimestamps({
    id: r.id,
    name: r.name,
    routeType: r.routeType,
    geometry: r.geometry,
    // Endpoints were generated columns in MySQL; derive them the same way.
    startLocation: { type: 'Point', coordinates: r.geometry.coordinates[0]! },
    endLocation: {
      type: 'Point',
      coordinates: r.geometry.coordinates[r.geometry.coordinates.length - 1]!,
    },
    zoneId: r.zoneId,
    distanceMeters: r.distanceMeters,
    status: r.status,
    dataSource: r.dataSource,
  }),
)

export const CHARGING_STATIONS: ChargingStation[] = load<RawStation>(
  'chargingStations.json',
  'stations',
).map((s) =>
  withTimestamps({
    id: s.id,
    stationCode: s.code,
    name: s.name,
    location: s.location,
    capacity: s.capacity,
    occupiedSlots: s.occupiedSlots,
    // Was a generated column in MySQL.
    availableSlots: s.capacity - s.occupiedSlots,
    powerStatus: s.powerStatus,
    status: s.status,
    dataSource: s.dataSource,
    notes: s.notes,
  }),
)

export const ROAD_SEGMENTS: RoadSegment[] = load<RawSegment>(
  'roadSegments.json',
  'segments',
).map((r) =>
  withTimestamps({
    id: r.id,
    roadName: r.roadName,
    roadType: r.roadType,
    geometry: r.geometry,
    startPoint: { type: 'Point', coordinates: r.geometry.coordinates[0]! },
    endPoint: {
      type: 'Point',
      coordinates: r.geometry.coordinates[r.geometry.coordinates.length - 1]!,
    },
    distanceMeters: r.distanceMeters,
    speedLimitKmh: r.speedLimitKmh,
    zoneId: r.zoneId,
    status: r.status,
    dataSource: r.dataSource,
    osmId: r.osmId,
  }),
)

export const LOCATIONS: MapLocation[] = load<RawLocation>('locations.json', 'locations').map((l) =>
  withTimestamps({
    id: l.id,
    name: l.name,
    type: l.type,
    location: l.location,
    description: l.description,
    dataSource: l.dataSource,
    osmId: l.osmId,
  }),
)

export const VEHICLES: Vehicle[] = load<RawVehicle>('vehicles.json', 'vehicles').map((v) =>
  withTimestamps({
    id: v.id,
    vehicleCode: v.code,
    type: v.type,
    location: v.location,
    speedKmh: v.speedKmh,
    headingDegrees: v.headingDegrees,
    status: v.status,
    roadSegmentId: v.roadSegmentId,
    lastMovementAt: null,
    stationarySince: null,
  }),
)

export const ALERTS: Alert[] = load<RawAlert>('alerts.json', 'alerts').map((a) => ({
  id: a.id,
  level: a.level,
  alertType: a.alertType,
  title: a.title,
  message: a.message,
  droneId: a.droneId,
  vehicleId: a.vehicleId,
  incidentId: a.incidentId,
  location: a.location,
  acknowledged: a.acknowledged,
  acknowledgedAt: null,
  createdAt: CONFIG_TIMESTAMP,
}))

export const INCIDENTS: Incident[] = load<RawIncident>('incidents.json', 'incidents').map((i) =>
  withTimestamps({
    id: i.id,
    incidentType: i.incidentType,
    severity: i.severity,
    title: i.title,
    description: i.description,
    status: i.status,
    location: i.location,
    assignedDroneId: i.assignedDroneId,
    vehicleId: i.vehicleId,
    emergencyEventId: null,
    sosEventId: null,
    startedAt: CONFIG_TIMESTAMP,
    resolvedAt: null,
  }),
)
