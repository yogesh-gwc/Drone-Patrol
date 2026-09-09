import type { Map as MapLibreMap } from 'maplibre-gl'
import { mapConfig } from './mapConfig.js'

/**
 * 3D terrain.
 *
 * MapTiler Terrain RGB v2 is a raster-DEM source. Exaggeration is kept low
 * (1.25) so relief is legible without turning gentle hills into walls or
 * pushing the highway out of shape.
 */

export function isTerrainConfigured(): boolean {
  return mapConfig.terrain.url !== null
}

/** Adds the DEM source if it is not present. Returns false when unconfigured. */
export function addTerrainSource(map: MapLibreMap): boolean {
  const { sourceId, url, tileSize, encoding } = mapConfig.terrain
  if (url === null) {
    return false
  }
  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: 'raster-dem',
      url,
      tileSize,
      encoding,
    })
  }
  return true
}

export function enableTerrain(map: MapLibreMap): boolean {
  if (!addTerrainSource(map)) {
    return false
  }
  map.setTerrain({
    source: mapConfig.terrain.sourceId,
    exaggeration: mapConfig.terrain.exaggeration,
  })
  return true
}

export function disableTerrain(map: MapLibreMap): void {
  if (map.getTerrain()) {
    map.setTerrain(null)
  }
}

export function isTerrainEnabled(map: MapLibreMap): boolean {
  return map.getTerrain() !== null
}
