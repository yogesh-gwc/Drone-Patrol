import type { Map as MapLibreMap } from 'maplibre-gl'
import { CORRIDOR_LOCATIONS_GEOJSON } from './corridorData.js'
import { CORRIDOR_POIS_GEOJSON } from './corridorPois.js'
import { NH44_GEOJSON } from './corridorRoute.js'
import { declutterBasemap } from './mapDeclutter.js'

/**
 * AEROGUARD layers added on top of the MapTiler style.
 *
 * These read from the style's existing OpenStreetMap-derived vector source
 * (`maptiler_planet`, OpenMapTiles schema), so no separate road data is
 * downloaded or invented. Their only job is to make the corridor's highway
 * hierarchy read clearly on a dark basemap.
 *
 * Later phases add drone routes, patrol zones and station markers from the
 * Phase 2 API; those are SIMULATED data and will be styled distinctly from
 * these real-geography layers.
 */

export const LAYER_IDS = {
  corridorCasing: 'aeroguard-nh44-casing',
  corridorLine: 'aeroguard-nh44-line',
  buildings: 'aeroguard-buildings',
  poiMarkers: 'aeroguard-poi-markers',
  poiLabels: 'aeroguard-poi-labels',
  corridorLocations: 'aeroguard-corridor-locations',
  corridorLocationLabels: 'aeroguard-corridor-location-labels',
} as const

/** The OpenMapTiles vector source the MapTiler style ships with. */
const PLANET_SOURCE = 'maptiler_planet'
const CORRIDOR_SOURCE_ID = 'aeroguard-corridor-locations-source'
const POI_SOURCE_ID = 'aeroguard-poi-source'
const NH44_SOURCE_ID = 'aeroguard-nh44-source'

/**
 * Finds the first symbol layer so our line work goes underneath the basemap's
 * labels. Without this, road casings would paint over place names.
 */
function firstSymbolLayerId(map: MapLibreMap): string | undefined {
  return map.getStyle()?.layers?.find((layer) => layer.type === 'symbol')?.id
}

/**
 * Extrudes real OpenStreetMap building footprints along the corridor.
 *
 * This is genuine OSM data from the basemap's own vector tiles, not modelled
 * geometry, so the towns the corridor passes through - Krishnagiri, Shoolagiri,
 * Perandapalli, Hosur - gain real houses, hospitals and college blocks in
 * their actual positions and shapes.
 *
 * Only shown from zoom 13 up. Building footprints are not present in the tiles
 * at low zoom, and rendering thousands of them across a 50 km overview would
 * both clutter the corridor and cost frames for no benefit.
 *
 * Height uses the OSM `render_height` where tagged and falls back to a modest
 * single-storey value, so untagged rural housing does not become towers.
 */
function addBuildings(map: MapLibreMap): void {
  if (!map.getSource(PLANET_SOURCE) || map.getLayer(LAYER_IDS.buildings)) {
    return
  }

  map.addLayer({
    id: LAYER_IDS.buildings,
    type: 'fill-extrusion',
    source: PLANET_SOURCE,
    'source-layer': 'building',
    minzoom: 13,
    paint: {
      'fill-extrusion-color': [
        'interpolate',
        ['linear'],
        ['coalesce', ['get', 'render_height'], 4],
        0,
        '#3b4553',
        12,
        '#4a5666',
        30,
        '#5b697c',
      ],
      'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 6],
      'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
      // Fade in so buildings do not pop when crossing the minzoom.
      'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0, 14, 0.85],
    },
  })
}

/**
 * Real corridor facilities: hospitals, fuel, police, fire, colleges, industry.
 *
 * OpenStreetMap data within 2.5 km of NH-44, colour-coded by type so an
 * operator can read the corridor's support infrastructure at a glance. Until
 * now the map showed nothing but settlement names.
 *
 * Labels are staged by priority: emergency services from zoom 10, fuel from
 * 12, everything else from 13, so the overview stays legible.
 */
function addCorridorPois(map: MapLibreMap): void {
  if (!map.getSource(POI_SOURCE_ID)) {
    map.addSource(POI_SOURCE_ID, { type: 'geojson', data: CORRIDOR_POIS_GEOJSON })
  }

  if (!map.getLayer(LAYER_IDS.poiMarkers)) {
    map.addLayer({
      id: LAYER_IDS.poiMarkers,
      type: 'circle',
      source: POI_SOURCE_ID,
      paint: {
        'circle-color': ['get', 'colour'],
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          9,
          ['case', ['<=', ['get', 'priority'], 1], 3.5, 0],
          12,
          ['case', ['<=', ['get', 'priority'], 2], 5, 3],
          15,
          8,
        ],
        'circle-stroke-width': 1.2,
        'circle-stroke-color': '#0b1219',
        'circle-opacity': 0.95,
      },
    })
  }

  if (!map.getLayer(LAYER_IDS.poiLabels)) {
    map.addLayer({
      id: LAYER_IDS.poiLabels,
      type: 'symbol',
      source: POI_SOURCE_ID,
      minzoom: 10,
      filter: [
        'any',
        ['<=', ['get', 'priority'], 1],
        ['all', ['<=', ['get', 'priority'], 2], ['>=', ['zoom'], 12]],
        ['>=', ['zoom'], 13],
      ] as unknown as never,
      layout: {
        'text-field': ['get', 'name'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 10, 9.5, 14, 12],
        'text-offset': [0, 1.1],
        'text-anchor': 'top',
        'text-max-width': 9,
        'text-optional': true,
        'text-allow-overlap': false,
        /*
         * Collisions must be decided by importance, not by source order.
         *
         * Krishnagiri has a dozen hospitals and clinics within a few hundred
         * metres, and MapLibre drops whichever label it reaches last: the
         * Government Hospital was being hidden behind a private clinic that
         * happened to come first in the file. A lower sort key wins, and
         * `priority` is already 1 for hospitals and emergency services.
         */
        'symbol-sort-key': ['get', 'priority'],
      },
      paint: {
        'text-color': ['get', 'colour'],
        'text-halo-color': '#0b1219',
        'text-halo-width': 1.5,
      },
    })
  }
}

/**
 * Adds the five real corridor settlements as selectable markers.
 *
 * This is REAL geographic data from `map-data/locations/`. Low-confidence
 * geocoder matches are drawn hollow so they are not mistaken for verified
 * positions.
 */
function addCorridorLocations(map: MapLibreMap): void {
  if (!map.getSource(CORRIDOR_SOURCE_ID)) {
    map.addSource(CORRIDOR_SOURCE_ID, {
      type: 'geojson',
      data: CORRIDOR_LOCATIONS_GEOJSON,
    })
  }

  if (!map.getLayer(LAYER_IDS.corridorLocations)) {
    map.addLayer({
      id: LAYER_IDS.corridorLocations,
      type: 'circle',
      source: CORRIDOR_SOURCE_ID,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4.5, 12, 7],
        'circle-color': [
          'case',
          ['==', ['get', 'confidence'], 'low'],
          'rgba(0,0,0,0)',
          '#cfe0ef',
        ],
        'circle-stroke-width': 1.6,
        'circle-stroke-color': '#8fb3cc',
      },
    })
  }

  if (!map.getLayer(LAYER_IDS.corridorLocationLabels)) {
    map.addLayer({
      id: LAYER_IDS.corridorLocationLabels,
      type: 'symbol',
      source: CORRIDOR_SOURCE_ID,
      layout: {
        'text-field': ['get', 'name'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 8, 11, 13, 14],
        'text-offset': [0, 1.2],
        'text-anchor': 'top',
        'text-letter-spacing': 0.08,
      },
      paint: {
        'text-color': '#e2ebf3',
        'text-halo-color': '#0b1219',
        'text-halo-width': 1.6,
      },
    })
  }
}

/**
 * Draws the operational NH-44 corridor from the real OSM-derived alignment.
 *
 * This is distinct from `addHighwayEmphasis`, which styles whatever trunk roads
 * the basemap happens to carry. This layer is the specific Krishnagiri to Hosur
 * carriageway AEROGUARD monitors, and it is what makes the corridor - rather
 * than the road network - the dominant element at low zoom.
 *
 * At high zoom the Three.js 3D corridor takes over visually, so these lines
 * fade out to avoid doubling up on it.
 */
function addCorridorHighway(map: MapLibreMap): void {
  if (!map.getSource(NH44_SOURCE_ID)) {
    map.addSource(NH44_SOURCE_ID, { type: 'geojson', data: NH44_GEOJSON, lineMetrics: true })
  }

  const before = firstSymbolLayerId(map)
  const fadeForThreeD = ['interpolate', ['linear'], ['zoom'], 12.5, 1, 14.5, 0] as unknown as never

  if (!map.getLayer(LAYER_IDS.corridorCasing)) {
    map.addLayer(
      {
        id: LAYER_IDS.corridorCasing,
        type: 'line',
        source: NH44_SOURCE_ID,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#12506f',
          'line-opacity': fadeForThreeD,
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 9, 11, 20, 14, 44],
          'line-blur': 3,
        },
      },
      before,
    )
  }

  if (!map.getLayer(LAYER_IDS.corridorLine)) {
    map.addLayer(
      {
        id: LAYER_IDS.corridorLine,
        type: 'line',
        source: NH44_SOURCE_ID,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#d6ecfa',
          'line-opacity': fadeForThreeD,
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 2.6, 11, 5.2, 14, 11],
        },
      },
      before,
    )
  }
}

/**
 * Adds every AEROGUARD layer and reduces the basemap around them.
 *
 * Order matters: the basemap is decluttered after the AEROGUARD layers exist so
 * the declutter pass can skip them by id prefix.
 */
export function addAeroguardLayers(map: MapLibreMap): void {
  addCorridorHighway(map)
  addBuildings(map)
  addCorridorPois(map)
  addCorridorLocations(map)
  declutterBasemap(map)
}

/** Layer ids that respond to clicks, for cursor and hit handling. */
export const INTERACTIVE_LAYER_IDS: string[] = [LAYER_IDS.corridorLocations]
