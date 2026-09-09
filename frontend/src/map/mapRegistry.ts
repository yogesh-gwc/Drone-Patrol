import type { Map as MapLibreMap } from 'maplibre-gl'
import type { ThreeLayer } from './three/ThreeLayer.js'

/**
 * Holds the live MapLibre map and Three.js layer outside React.
 *
 * The map and the WebGL scene are expensive, long-lived, imperative objects.
 * Keeping them in module scope rather than React state means:
 *
 *   - no re-render can recreate them;
 *   - UI controls issue commands (`flyTo`, preset changes) without the map
 *     being a dependency of any component;
 *   - the future telemetry stream can move drones at 10 Hz without touching
 *     the React tree.
 *
 * `MapScene` is the only writer. Everything else reads.
 */

let mapInstance: MapLibreMap | null = null
let threeLayer: ThreeLayer | null = null

export function setMapInstance(map: MapLibreMap | null): void {
  mapInstance = map
}

export function getMapInstance(): MapLibreMap | null {
  return mapInstance
}

export function setThreeLayer(layer: ThreeLayer | null): void {
  threeLayer = layer
}

export function getThreeLayer(): ThreeLayer | null {
  return threeLayer
}

/**
 * Runs an action against the map if one exists.
 *
 * Lets UI handlers stay one-liners without repeating null checks, and makes
 * clicks during map load harmless no-ops.
 */
export function withMap(action: (map: MapLibreMap) => void): void {
  if (mapInstance) {
    action(mapInstance)
  }
}

/**
 * Development-only debug bridge.
 *
 * Exposes the live map and Three.js layer on `window.__aeroguard` so the
 * geographic alignment of the scene can be checked from the browser console or
 * an automated browser run. Stripped from production builds by the
 * `import.meta.env.DEV` guard, and nothing in the app reads it.
 */
let debugPick: ((lngLat: [number, number]) => unknown) | null = null

/** Registered by MapScene so an automated run can exercise selection. */
export function setDebugPick(fn: (lngLat: [number, number]) => unknown): void {
  debugPick = fn
}

if (import.meta.env.DEV) {
  ;(globalThis as Record<string, unknown>).__aeroguard = {
    getMapInstance,
    getThreeLayer,
    pickAt: (lngLat: [number, number]) => debugPick?.(lngLat),
  }
}
