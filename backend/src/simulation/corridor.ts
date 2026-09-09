import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Shared NH-44 corridor geometry for the backend simulation.
 *
 * Reads the same real OSM-derived file the frontend uses, so both sides agree
 * on the route without duplicating the alignment. Positions are expressed as
 * metres along the corridor and resolved to longitude/latitude here.
 */

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const corridorPath = path.join(projectRoot, 'map-data', 'roads', 'nh44-corridor.geojson.json')

export type Position = [number, number]

const EARTH_RADIUS_M = 6_371_000
const toRadians = (degrees: number): number => (degrees * Math.PI) / 180

export function metersBetween(a: Position, b: Position): number {
  const dLat = toRadians(b[1] - a[1])
  const dLon = toRadians(b[0] - a[0])
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a[1])) * Math.cos(toRadians(b[1])) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

interface CorridorFile {
  features: { geometry: { coordinates: Position[] } }[]
}

const file = JSON.parse(readFileSync(corridorPath, 'utf8')) as CorridorFile
const coordinates = file.features[0]?.geometry.coordinates ?? []

if (coordinates.length < 2) {
  throw new Error(`NH-44 corridor geometry is missing or too short: ${corridorPath}`)
}

const cumulative: number[] = [0]
for (let i = 1; i < coordinates.length; i++) {
  cumulative.push(cumulative[i - 1]! + metersBetween(coordinates[i - 1]!, coordinates[i]!))
}

export const CORRIDOR = {
  coordinates,
  cumulative,
  lengthMeters: cumulative[cumulative.length - 1]!,
}

/** Resolves metres along the corridor to a geographic position. */
export function positionAtDistance(meters: number): Position {
  const clamped = Math.max(0, Math.min(meters, CORRIDOR.lengthMeters))
  let low = 0
  let high = CORRIDOR.cumulative.length - 1
  while (high - low > 1) {
    const mid = (low + high) >> 1
    if (CORRIDOR.cumulative[mid]! <= clamped) {
      low = mid
    } else {
      high = mid
    }
  }
  const start = CORRIDOR.cumulative[low]!
  const span = CORRIDOR.cumulative[high]! - start
  const t = span === 0 ? 0 : (clamped - start) / span
  const a = CORRIDOR.coordinates[low]!
  const b = CORRIDOR.coordinates[high]!
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

/** Compass bearing in degrees at a distance along the corridor. */
export function headingAtDistance(meters: number): number {
  const a = positionAtDistance(Math.max(0, meters - 25))
  const b = positionAtDistance(Math.min(CORRIDOR.lengthMeters, meters + 25))
  const dLon = (b[0] - a[0]) * Math.cos(toRadians((a[1] + b[1]) / 2))
  const dLat = b[1] - a[1]
  return (450 - (Math.atan2(dLat, dLon) * 180) / Math.PI) % 360
}

/**
 * Operational bounding box around the Krishnagiri-Hosur corridor.
 *
 * SOS coordinates are checked against this so an operator cannot start an
 * emergency on the other side of the world. Generous enough that a person can
 * be a few kilometres off the highway.
 */
export const OPERATIONAL_BOUNDS = {
  west: 77.6,
  south: 12.3,
  east: 78.45,
  north: 12.95,
} as const

export function isInsideOperationalArea(position: Position): boolean {
  const [lon, lat] = position
  return (
    lon >= OPERATIONAL_BOUNDS.west &&
    lon <= OPERATIONAL_BOUNDS.east &&
    lat >= OPERATIONAL_BOUNDS.south &&
    lat <= OPERATIONAL_BOUNDS.north
  )
}

/** The five operational corridor nodes, ordered Krishnagiri to Hosur. */
export const CORRIDOR_NODES = [
  { name: 'Krishnagiri', coordinates: [78.22065, 12.51888] as Position },
  { name: 'Kurubarapalli', coordinates: [78.13306, 12.60074] as Position },
  { name: 'Shoolagiri', coordinates: [78.01063, 12.66476] as Position },
  { name: 'Perandapalli', coordinates: [77.88938, 12.71237] as Position },
  { name: 'Hosur', coordinates: [77.83095, 12.73288] as Position },
] as const

/** Number of patrol zones the corridor is divided into. */
export const ZONE_COUNT = 10
/** Number of charging stations; each serves two adjacent zones. */
export const STATION_COUNT = 5

export const ZONE_LENGTH_M = CORRIDOR.lengthMeters / ZONE_COUNT

/** Distance along the corridor, in metres, of the route point nearest a place. */
export function distanceAtPosition(target: Position): number {
  let best = 0
  let bestGap = Infinity
  for (let i = 0; i < CORRIDOR.coordinates.length; i++) {
    const gap = metersBetween(CORRIDOR.coordinates[i]!, target)
    if (gap < bestGap) {
      bestGap = gap
      best = cumulative[i]!
    }
  }
  return best
}

/** Nearest corridor node name to a distance along the route, for labelling. */
export function nearestNodeName(meters: number): string {
  const point = positionAtDistance(meters)
  let best: string = CORRIDOR_NODES[0]!.name
  let bestDistance = Infinity
  for (const node of CORRIDOR_NODES) {
    const d = metersBetween(point, node.coordinates)
    if (d < bestDistance) {
      bestDistance = d
      best = node.name
    }
  }
  return best
}
