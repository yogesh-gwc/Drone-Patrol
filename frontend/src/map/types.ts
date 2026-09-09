/**
 * Map layer types.
 *
 * Coordinate convention is the same as the rest of the project: every position
 * is `[longitude, latitude]` in EPSG:4326, matching the MySQL SRID 4326
 * columns from Phase 2 and GeoJSON per RFC 7946.
 */

/** A geographic position as `[longitude, latitude]`, in that order. */
export type Position = [number, number]

/** A real-world settlement along the patrol corridor. */
export interface CorridorLocation {
  id: number
  name: string
  /** 1 = Krishnagiri ... 5 = Hosur */
  corridorOrder: number
  /** [longitude, latitude] */
  coordinates: [number, number]
  /** How the geocoder matched this name. */
  geocoderMatchType: string
  confidence: 'high' | 'low'
  note: string
}

/** Named camera arrangements offered in the UI. */
export type MapViewPreset = 'overview' | 'threeDimensional' | 'closeUp'

/** Lifecycle of the MapLibre map. */
export type MapStatus = 'idle' | 'loading' | 'ready' | 'error'

/** Lifecycle of the Three.js custom layer. */
export type ThreeStatus = 'idle' | 'ready' | 'error'

/** Lifecycle of the raster-DEM terrain source. */
export type TerrainStatus = 'disabled' | 'loading' | 'enabled' | 'error'

export interface MapFailure {
  /** Which subsystem failed, so the UI can say something specific. */
  stage: 'configuration' | 'style' | 'map' | 'terrain' | 'three'
  message: string
}
