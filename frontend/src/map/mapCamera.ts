import type { Map as MapLibreMap } from 'maplibre-gl'
import { CORRIDOR_BOUNDS, VIEW_PRESETS } from './mapConfig.js'
import type { CorridorLocation, MapViewPreset } from './types.js'

/**
 * Camera navigation.
 *
 * Every movement goes through one of these functions, so there is no
 * per-location or per-button camera code anywhere else. Adding a location is
 * a data change in `map-data/`, not a code change.
 */

const CORRIDOR_FIT_PADDING = 72
const LOCATION_ZOOM = 13.2
const LOCATION_PITCH = 55

/** Frames the whole Krishnagiri to Hosur corridor. */
export function fitCorridor(map: MapLibreMap, animate = true): void {
  map.fitBounds(CORRIDOR_BOUNDS, {
    padding: CORRIDOR_FIT_PADDING,
    pitch: 0,
    bearing: 0,
    duration: animate ? 1200 : 0,
  })
}

/**
 * Flies to any corridor location.
 *
 * Reusable for all five settlements and for anything added later - it takes a
 * location, not a name.
 */
export function flyToLocation(
  map: MapLibreMap,
  location: CorridorLocation,
  options: { zoom?: number; pitch?: number; bearing?: number } = {},
): void {
  map.flyTo({
    center: location.coordinates,
    zoom: options.zoom ?? LOCATION_ZOOM,
    // A little pitch makes the terrain relief legible on arrival.
    pitch: options.pitch ?? LOCATION_PITCH,
    bearing: options.bearing ?? map.getBearing(),
    duration: 2200,
    essential: true,
  })
}

/** Applies a named view preset, keeping the current centre where sensible. */
export function applyViewPreset(map: MapLibreMap, preset: MapViewPreset): void {
  const definition = VIEW_PRESETS[preset]

  if (definition.fitCorridor) {
    fitCorridor(map)
    return
  }

  map.easeTo({
    center: map.getCenter(),
    zoom: definition.zoom ?? map.getZoom(),
    pitch: definition.pitch,
    bearing: definition.bearing,
    duration: 1200,
  })
}

/**
 * Drops the camera to road level on a corridor object.
 *
 * Used when a drone or station is selected: at overview zoom the operator can
 * see the fleet but not what is happening on the carriageway, so selecting an
 * object flies down to a zoom where the 3D highway, its lane markings and the
 * traffic are all legible.
 */
export function inspectAt(map: MapLibreMap, coordinates: [number, number]): void {
  map.flyTo({
    center: coordinates,
    // Tight enough that the subject dominates the view, but not so tight that
    // the corridor leaves frame: past ~15 the camera sits inside a few hundred
    // metres of townscape and NH-44 itself becomes hard to pick out. The
    // camera then locks onto the selected drone (see MapScene), which is what
    // keeps it centred as it patrols.
    zoom: 14.9,
    pitch: 45,
    bearing: map.getBearing(),
    duration: 1400,
    essential: true,
  })
}

/** Recentres on a geographic point without changing zoom, pitch or bearing. */
export function panTo(map: MapLibreMap, coordinates: [number, number]): void {
  map.panTo(coordinates, { duration: 900 })
}

/**
 * Chase camera for a moving unit.
 *
 * Following used to be a plain `panTo`, which inherited whatever pitch the
 * operator happened to be on - from the flat overview that meant a top-down
 * chase with no sense of the 3D corridor at all. A chase is a distinct camera
 * pose: low over the carriageway, looking along the direction of travel, close
 * enough that the highway, the traffic and the escorting drone are all in
 * frame.
 */
const CHASE_ZOOM = 16.2
const CHASE_PITCH = 66

/**
 * Swings into the chase pose. Call once when following is armed - the flight
 * must be allowed to finish before per-snapshot tracking starts, or each
 * snapshot interrupts it and the camera never reaches the pose.
 */
export function beginChase(
  map: MapLibreMap,
  coordinates: [number, number],
  headingDegrees: number,
): void {
  map.flyTo({
    center: coordinates,
    zoom: CHASE_ZOOM,
    pitch: CHASE_PITCH,
    // Bearing = heading puts the direction of travel up-screen, so the
    // operator sees the road ahead of the unit rather than beside it.
    bearing: headingDegrees,
    duration: 1600,
    essential: true,
  })
}

/**
 * Holds the chase once armed.
 *
 * Zoom and pitch are deliberately left alone so the operator can still lean in
 * or flatten out mid-run; only centre and bearing are driven. The duration is
 * kept under the 200 ms snapshot interval so each ease completes before the
 * next arrives - a longer ease is restarted every snapshot and visibly lags.
 */
export function chaseAt(
  map: MapLibreMap,
  coordinates: [number, number],
  bearingDegrees: number,
): void {
  map.easeTo({
    center: coordinates,
    bearing: bearingDegrees,
    duration: 160,
    essential: true,
  })
}
