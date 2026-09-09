import type { FeatureCollection, Point } from 'geojson'
import rawPois from '@map-data/locations/corridor-pois.geojson.json'
import type { Position } from './types.js'

/**
 * Real facilities along the NH-44 corridor.
 *
 * REAL OpenStreetMap data, imported from
 * `map-data/locations/corridor-pois.geojson.json`: hospitals, fuel stations,
 * police and fire stations, colleges, schools and named industrial sites
 * within 2.5 km of the highway. Distinct from the SIMULATED placeholder
 * locations seeded in Phase 2.
 *
 * Each carries its chainage along NH-44, which is what lets the ambulance run
 * to a genuine hospital rather than an arbitrary point.
 */

export type PoiKind =
  | 'HOSPITAL'
  | 'CLINIC'
  | 'FUEL_STATION'
  | 'POLICE'
  | 'FIRE_STATION'
  | 'COLLEGE'
  | 'SCHOOL'
  | 'FACTORY'

export interface CorridorPoi {
  id: number
  name: string
  kind: PoiKind
  coordinates: Position
  chainageMeters: number
  offsetMeters: number
}

/**
 * Presentation per facility type.
 *
 * `priority` drives which labels survive at low zoom: hospitals and emergency
 * services matter operationally, a school does not.
 */
export const POI_STYLE: Record<
  PoiKind,
  { colour: string; label: string; priority: number; height: number }
> = {
  HOSPITAL: { colour: '#ef4444', label: 'Hospital', priority: 1, height: 34 },
  FIRE_STATION: { colour: '#f97316', label: 'Fire station', priority: 1, height: 26 },
  POLICE: { colour: '#3b82f6', label: 'Police', priority: 1, height: 26 },
  FUEL_STATION: { colour: '#22c55e', label: 'Fuel', priority: 2, height: 18 },
  CLINIC: { colour: '#f472b6', label: 'Clinic', priority: 3, height: 18 },
  COLLEGE: { colour: '#a855f7', label: 'College', priority: 3, height: 26 },
  FACTORY: { colour: '#94a3b8', label: 'Industry', priority: 3, height: 30 },
  SCHOOL: { colour: '#eab308', label: 'School', priority: 4, height: 18 },
}

const collection = rawPois as unknown as FeatureCollection<Point> & {
  metadata?: Record<string, unknown>
}

function isPosition(value: unknown): value is Position {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  )
}

export const CORRIDOR_POIS: CorridorPoi[] = (collection.features ?? [])
  .filter((feature) => isPosition(feature.geometry?.coordinates))
  .map((feature) => {
    const properties = feature.properties ?? {}
    const kind = properties.kind as PoiKind
    return {
      id: Number(feature.id ?? 0),
      name: typeof properties.name === 'string' ? properties.name : 'Facility',
      kind: kind in POI_STYLE ? kind : 'FACTORY',
      coordinates: feature.geometry.coordinates as Position,
      chainageMeters: Number(properties.chainageMeters ?? 0),
      offsetMeters: Number(properties.offsetMeters ?? 0),
    }
  })

export const POI_ATTRIBUTION =
  typeof collection.metadata?.attribution === 'string'
    ? collection.metadata.attribution
    : '© OpenStreetMap contributors'

/** GeoJSON source for the MapLibre marker and label layers. */
export const CORRIDOR_POIS_GEOJSON: FeatureCollection<Point> = {
  type: 'FeatureCollection',
  features: CORRIDOR_POIS.map((poi) => ({
    type: 'Feature',
    id: poi.id,
    properties: {
      name: poi.name,
      kind: poi.kind,
      colour: POI_STYLE[poi.kind].colour,
      label: POI_STYLE[poi.kind].label,
      priority: POI_STYLE[poi.kind].priority,
    },
    geometry: { type: 'Point', coordinates: poi.coordinates },
  })),
}
