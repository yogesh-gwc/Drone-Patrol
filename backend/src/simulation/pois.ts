import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Position } from './corridor.js'

/**
 * Real facilities along the NH-44 corridor.
 *
 * REAL OpenStreetMap data (see the file's own metadata block), distinct from
 * the SIMULATED placeholder rows in `backend/data/locations.json`. Each entry
 * carries its chainage along NH-44, which is what lets the ambulance pick a
 * genuine hospital ahead of itself rather than an invented destination.
 */

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const poiPath = path.join(projectRoot, 'map-data', 'locations', 'corridor-pois.geojson.json')

export type PoiKind =
  | 'HOSPITAL'
  | 'CLINIC'
  | 'FUEL_STATION'
  | 'POLICE'
  | 'FIRE_STATION'
  | 'COLLEGE'
  | 'SCHOOL'
  | 'FACTORY'

export interface Poi {
  id: number
  name: string
  kind: PoiKind
  position: Position
  /** Distance along NH-44 of the nearest route vertex, metres. */
  chainageMeters: number
  /** Perpendicular distance from the road, metres. */
  offsetMeters: number
}

interface RawFeature {
  id: number
  properties: {
    name: string
    kind: PoiKind
    chainageMeters: number
    offsetMeters: number
  }
  geometry: { coordinates: Position }
}

const file = JSON.parse(readFileSync(poiPath, 'utf8')) as { features: RawFeature[] }

export const CORRIDOR_POIS: Poi[] = file.features.map((f) => ({
  id: f.id,
  name: f.properties.name,
  kind: f.properties.kind,
  position: f.geometry.coordinates,
  chainageMeters: f.properties.chainageMeters,
  offsetMeters: f.properties.offsetMeters,
}))

export const HOSPITALS: Poi[] = CORRIDOR_POIS.filter((p) => p.kind === 'HOSPITAL').sort(
  (a, b) => a.chainageMeters - b.chainageMeters,
)

/**
 * The NEAREST hospital at least `minAheadMeters` further along the corridor.
 *
 * This used to pick at random from the next four hospitals ahead, which meant
 * the ambulance routinely drove PAST two or three perfectly good hospitals on
 * its way to a more distant one - it read as the ambulance ignoring the
 * hospital it had just passed. An ambulance takes the shortest route to care,
 * so the destination is now simply the first one it will reach.
 *
 * `minAheadMeters` only keeps the run long enough to be worth watching; it is
 * relaxed rather than abandoned if nothing qualifies, so the choice is always
 * the closest hospital that is still ahead.
 */
export function hospitalAhead(fromChainage: number, minAheadMeters = 6000): Poi | null {
  const ahead = HOSPITALS.filter((h) => h.chainageMeters >= fromChainage + minAheadMeters)
  if (ahead.length > 0) {
    return ahead[0]!
  }
  // Nothing far enough ahead: take the closest one still in front.
  const anyAhead = HOSPITALS.filter((h) => h.chainageMeters > fromChainage)
  if (anyAhead.length > 0) {
    return anyAhead[0]!
  }
  return HOSPITALS[HOSPITALS.length - 1] ?? null
}

const EARTH_RADIUS_M = 6371000

/** Great-circle distance between two [lon, lat] pairs, in metres. */
export function metersBetweenPositions(a: Position, b: Position): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const x = toRad(b[0] - a[0]) * Math.cos(toRad((a[1] + b[1]) / 2))
  const y = toRad(b[1] - a[1])
  return Math.hypot(x, y) * EARTH_RADIUS_M
}

/**
 * The hospital physically closest to a point.
 *
 * Used by the SOS response, where the person may be off the highway entirely,
 * so chainage is the wrong measure - straight-line distance is what decides
 * which hospital a medical unit would come from.
 */
export function nearestHospitalTo(position: Position): { poi: Poi; meters: number } | null {
  let best: { poi: Poi; meters: number } | null = null
  for (const hospital of HOSPITALS) {
    const meters = metersBetweenPositions(position, hospital.position)
    if (!best || meters < best.meters) {
      best = { poi: hospital, meters }
    }
  }
  return best
}
