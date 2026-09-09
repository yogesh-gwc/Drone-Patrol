import type { FeatureCollection, Point } from 'geojson'
import rawSettlements from '@map-data/locations/corridor-settlements.json'
import type { CorridorLocation } from './types.js'

/**
 * Real-world corridor settlements.
 *
 * Loaded from `map-data/locations/corridor-settlements.json`, which is REAL
 * geographic reference data obtained from the MapTiler Geocoding API
 * (OpenStreetMap-derived). It is deliberately separate from the SIMULATED
 * drone, vehicle and incident data seeded into MySQL in Phase 2 - the seeded
 * `locations` rows carry `data_source = 'SIMULATED'` and must not be presented
 * as real facility positions.
 *
 * The GeoJSON is validated here rather than trusted, so a malformed or
 * hand-edited file fails loudly at start-up instead of silently placing
 * markers in the sea.
 */

interface RawFeature {
  id?: unknown
  properties?: Record<string, unknown>
  geometry?: { type?: unknown; coordinates?: unknown }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function parseFeature(feature: RawFeature, index: number): CorridorLocation {
  const where = `corridor-settlements.json feature ${index}`
  const properties = feature.properties ?? {}
  const coordinates = feature.geometry?.coordinates

  if (feature.geometry?.type !== 'Point') {
    throw new Error(`${where}: expected a Point geometry`)
  }
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    throw new Error(`${where}: expected [longitude, latitude]`)
  }

  const [longitude, latitude] = coordinates as unknown[]
  if (!isFiniteNumber(longitude) || !isFiniteNumber(latitude)) {
    throw new Error(`${where}: coordinates are not finite numbers`)
  }
  // Catches a latitude/longitude swap, the most likely hand-edit mistake.
  if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
    throw new Error(`${where}: coordinates out of range - are they [lat, lng] by mistake?`)
  }

  const name = properties.name
  if (typeof name !== 'string' || name.trim() === '') {
    throw new Error(`${where}: missing name`)
  }

  return {
    id: isFiniteNumber(feature.id) ? feature.id : index + 1,
    name,
    corridorOrder: isFiniteNumber(properties.corridorOrder) ? properties.corridorOrder : index + 1,
    coordinates: [longitude, latitude],
    geocoderMatchType:
      typeof properties.geocoderMatchType === 'string' ? properties.geocoderMatchType : 'unknown',
    confidence: properties.confidence === 'low' ? 'low' : 'high',
    note: typeof properties.note === 'string' ? properties.note : '',
  }
}

const collection = rawSettlements as { features?: unknown; metadata?: Record<string, unknown> }

if (!Array.isArray(collection.features) || collection.features.length === 0) {
  throw new Error('corridor-settlements.json contains no features')
}

export const CORRIDOR_LOCATIONS: readonly CorridorLocation[] = (
  collection.features as RawFeature[]
)
  .map(parseFeature)
  .sort((a, b) => a.corridorOrder - b.corridorOrder)

/** Provenance of the settlement data, surfaced in the UI legend. */
export const CORRIDOR_DATA_SOURCE = {
  source: typeof collection.metadata?.source === 'string' ? collection.metadata.source : 'unknown',
  retrieved:
    typeof collection.metadata?.retrieved === 'string' ? collection.metadata.retrieved : 'unknown',
} as const

/** The settlement GeoJSON, for use as a MapLibre source. */
export const CORRIDOR_LOCATIONS_GEOJSON: FeatureCollection<Point> = {
  type: 'FeatureCollection',
  features: CORRIDOR_LOCATIONS.map((location) => ({
    type: 'Feature',
    id: location.id,
    properties: {
      name: location.name,
      corridorOrder: location.corridorOrder,
      confidence: location.confidence,
    },
    geometry: { type: 'Point', coordinates: location.coordinates },
  })),
}
