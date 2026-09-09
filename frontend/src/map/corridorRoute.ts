import type { Feature, FeatureCollection, LineString } from 'geojson'
import rawCorridor from '@map-data/roads/nh44-corridor.geojson.json'
import type { Position } from './types.js'

/**
 * The NH-44 operational corridor.
 *
 * REAL OpenStreetMap-derived geometry, imported from
 * `map-data/roads/nh44-corridor.geojson.json`. The alignment is genuine OSM
 * data - one-way carriageway ways chained head-to-tail from Krishnagiri toward
 * Hosur and simplified at about 8 m - not a hand-drawn path. Provenance,
 * including the exact Overpass query and the contributing OSM way ids, lives in
 * that file's `metadata` block.
 *
 * This is deliberately separate from the SIMULATED `road_segments` rows seeded
 * into MySQL in Phase 2, which remain marked `data_source = 'SIMULATED'` and
 * are not presented as real alignment.
 *
 * Route positions are exposed as cumulative distances so later phases can
 * express a drone, vehicle or incident as a position along the corridor
 * (`distanceAlong`, or the normalised 0..1 form) and convert it back to
 * longitude/latitude without any further geometry work.
 */

export interface CorridorRoute {
  name: string
  ref: string
  /** [longitude, latitude] vertices, ordered Krishnagiri to Hosur. */
  coordinates: Position[]
  /** Cumulative distance in metres at each vertex; last entry is the length. */
  cumulativeMeters: number[]
  lengthMeters: number
  lanesPerCarriageway: number
  dualCarriageway: boolean
  dataSource: string
  attribution: string
  osmWayCount: number
  retrieved: string
}

const EARTH_RADIUS_M = 6_371_000
const toRadians = (degrees: number): number => (degrees * Math.PI) / 180

/** Great-circle distance in metres between two `[lon, lat]` positions. */
export function metersBetween(a: Position, b: Position): number {
  const dLat = toRadians(b[1] - a[1])
  const dLon = toRadians(b[0] - a[0])
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a[1])) * Math.cos(toRadians(b[1])) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

function isPosition(value: unknown): value is Position {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1]) &&
    value[0] >= -180 &&
    value[0] <= 180 &&
    value[1] >= -90 &&
    value[1] <= 90
  )
}

function parseCorridor(): CorridorRoute {
  const collection = rawCorridor as unknown as FeatureCollection<LineString> & {
    metadata?: Record<string, unknown>
  }
  const feature = collection.features?.[0] as Feature<LineString> | undefined

  if (!feature || feature.geometry?.type !== 'LineString') {
    throw new Error('nh44-corridor: expected a single LineString feature')
  }

  const coordinates = feature.geometry.coordinates.filter(isPosition) as Position[]
  if (coordinates.length !== feature.geometry.coordinates.length) {
    throw new Error('nh44-corridor: geometry contains an invalid position')
  }
  if (coordinates.length < 2) {
    throw new Error('nh44-corridor: geometry needs at least two positions')
  }

  const cumulativeMeters: number[] = [0]
  for (let i = 1; i < coordinates.length; i++) {
    cumulativeMeters.push(
      cumulativeMeters[i - 1]! + metersBetween(coordinates[i - 1]!, coordinates[i]!),
    )
  }

  const properties = feature.properties ?? {}
  const metadata = collection.metadata ?? {}
  const lanes = Number(properties.lanesPerCarriageway)

  return {
    name: typeof properties.name === 'string' ? properties.name : 'NH-44',
    ref: typeof properties.ref === 'string' ? properties.ref : 'NH44',
    coordinates,
    cumulativeMeters,
    lengthMeters: cumulativeMeters[cumulativeMeters.length - 1]!,
    lanesPerCarriageway: Number.isFinite(lanes) && lanes > 0 ? lanes : 3,
    dualCarriageway: properties.dualCarriageway !== false,
    dataSource: typeof properties.dataSource === 'string' ? properties.dataSource : 'OSM_IMPORT',
    attribution:
      typeof metadata.attribution === 'string'
        ? metadata.attribution
        : '© OpenStreetMap contributors',
    osmWayCount: Number(metadata.osmWayCount) || 0,
    retrieved: typeof metadata.retrieved === 'string' ? metadata.retrieved : 'unknown',
  }
}

export const NH44_CORRIDOR: CorridorRoute = parseCorridor()

/**
 * Resolves a distance along the corridor to a geographic position.
 *
 * This is the seam later phases use: a drone or vehicle can hold a single
 * scalar offset along NH-44 and be placed correctly without touching geometry.
 */
export function positionAtDistance(route: CorridorRoute, meters: number): Position {
  const clamped = Math.max(0, Math.min(meters, route.lengthMeters))
  const { cumulativeMeters, coordinates } = route

  // Binary search for the segment containing `clamped`.
  let low = 0
  let high = cumulativeMeters.length - 1
  while (high - low > 1) {
    const mid = (low + high) >> 1
    if (cumulativeMeters[mid]! <= clamped) {
      low = mid
    } else {
      high = mid
    }
  }

  const segmentStart = cumulativeMeters[low]!
  const segmentLength = cumulativeMeters[high]! - segmentStart
  const t = segmentLength === 0 ? 0 : (clamped - segmentStart) / segmentLength
  const a = coordinates[low]!
  const b = coordinates[high]!

  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

/** Same as {@link positionAtDistance} but with a normalised 0..1 offset. */
export function positionAtFraction(route: CorridorRoute, fraction: number): Position {
  return positionAtDistance(route, fraction * route.lengthMeters)
}

/** Bounding box of the corridor as `[west, south, east, north]`. */
export function corridorBbox(route: CorridorRoute): [number, number, number, number] {
  let west = Infinity
  let south = Infinity
  let east = -Infinity
  let north = -Infinity
  for (const [lon, lat] of route.coordinates) {
    if (lon < west) west = lon
    if (lon > east) east = lon
    if (lat < south) south = lat
    if (lat > north) north = lat
  }
  return [west, south, east, north]
}

/** The corridor as a GeoJSON source for MapLibre. */
export const NH44_GEOJSON: FeatureCollection<LineString> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'nh44-corridor',
      properties: { name: NH44_CORRIDOR.name, ref: NH44_CORRIDOR.ref },
      geometry: { type: 'LineString', coordinates: NH44_CORRIDOR.coordinates },
    },
  ],
}
