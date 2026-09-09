import type { LngLatBoundsLike } from 'maplibre-gl'
import { corridorBbox, NH44_CORRIDOR } from './corridorRoute.js'
import type { MapViewPreset } from './types.js'

/**
 * MapTiler configuration.
 *
 * The API key is read from `VITE_MAPTILER_API_KEY` and never hard-coded.
 * Vite only exposes `VITE_*` variables to the browser, so the variable must
 * keep that prefix.
 */
const apiKey = import.meta.env.VITE_MAPTILER_API_KEY?.trim() ?? ''

/**
 * MapTiler style ids per theme.
 *
 * `dataviz` is a deliberately quiet basemap built as a backdrop for overlays:
 * light grey land, few labels, no POIs. That suits a dedicated corridor
 * monitor far better than a street style, and it means most of the clutter is
 * absent before `mapDeclutter` even runs.
 */
const LIGHT_STYLE = import.meta.env.VITE_MAP_STYLE?.trim() ?? 'streets-v2-light'
const DARK_STYLE = import.meta.env.VITE_MAP_STYLE_DARK?.trim() ?? 'streets-v2-dark'

export function styleUrlForTheme(theme: 'light' | 'dark'): string | null {
  if (apiKey === '') {
    return null
  }
  const id = theme === 'dark' ? DARK_STYLE : LIGHT_STYLE
  return `https://api.maptiler.com/maps/${id}/style.json?key=${apiKey}`
}

export const mapConfig = {
  hasApiKey: apiKey !== '',

  /** Default (light) style URL, or null when the key is missing. */
  styleUrl: styleUrlForTheme('light'),

  lightStyleId: LIGHT_STYLE,
  darkStyleId: DARK_STYLE,

  /**
   * MapTiler Terrain RGB v2, a raster-DEM source.
   *
   * Tiles are 512 x 512 (verified against the served tiles) and use the
   * Mapbox RGB elevation encoding.
   */
  terrain: {
    sourceId: 'aeroguard-terrain',
    url: apiKey === '' ? null : `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${apiKey}`,
    tileSize: 512,
    encoding: 'mapbox' as const,
    /** Slight lift so relief reads without distorting the highway. */
    exaggeration: 1.25,
  },
} as const

const [west, south, east, north] = corridorBbox(NH44_CORRIDOR)

/** Degrees of padding around the corridor for the initial fit. */
const FIT_PADDING_DEG = 0.03
/** Degrees of slack beyond the corridor the operator may navigate to. */
const ROAM_PADDING_DEG = 0.45

/**
 * Geographic extent of the operational corridor, derived from the real
 * OSM-derived NH-44 alignment rather than hand-entered.
 *
 * The initial view fits this box, so the corridor fills the viewport instead of
 * the surrounding region.
 */
export const CORRIDOR_BOUNDS: LngLatBoundsLike = [
  [west - FIT_PADDING_DEG, south - FIT_PADDING_DEG],
  [east + FIT_PADDING_DEG, north + FIT_PADDING_DEG],
]

/**
 * Hard limit on panning.
 *
 * Generous enough to look around the region and keep geographic context, tight
 * enough that the operator cannot drift to another state and lose the corridor.
 */
export const CORRIDOR_MAX_BOUNDS: LngLatBoundsLike = [
  [west - ROAM_PADDING_DEG, south - ROAM_PADDING_DEG],
  [east + ROAM_PADDING_DEG, north + ROAM_PADDING_DEG],
]

/** Centre of the corridor extent. Used by presets that do not fit bounds. */
export const CORRIDOR_CENTER: [number, number] = [(west + east) / 2, (south + north) / 2]

export interface ViewPresetDefinition {
  label: string
  description: string
  /** Fit the corridor bounds instead of using centre/zoom. */
  fitCorridor: boolean
  zoom?: number
  pitch: number
  bearing: number
}

export const VIEW_PRESETS: Record<MapViewPreset, ViewPresetDefinition> = {
  overview: {
    label: 'Overview',
    description: 'Whole Krishnagiri to Hosur corridor, flat',
    fitCorridor: true,
    pitch: 0,
    bearing: 0,
  },
  threeDimensional: {
    label: '3D',
    description: 'Corridor with terrain relief and pitch',
    fitCorridor: false,
    zoom: 10.4,
    pitch: 62,
    bearing: -28,
  },
  closeUp: {
    label: 'Close-up',
    description: 'Low-level view of the current position',
    fitCorridor: false,
    zoom: 14.2,
    pitch: 68,
    bearing: -28,
  },
}

/** Camera limits. Pitch above 85 degrees makes the horizon unusable. */
export const MAP_LIMITS = {
  // Zooming out past the corridor's own extent only adds unrelated geography,
  // so the floor sits just below the whole-corridor fit.
  minZoom: 8.4,
  maxZoom: 17,
  maxPitch: 80,
} as const
