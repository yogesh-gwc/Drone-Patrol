import type { Map as MapLibreMap } from 'maplibre-gl'

/**
 * Reduces the MapTiler basemap to operational context.
 *
 * AEROGUARD monitors one highway corridor, not a road network, so the stock
 * street style carries far too much: every service road, every hamlet label,
 * shop and restaurant POIs, administrative boundaries. Left alone it reads as
 * a consumer navigation map and competes with the corridor for attention.
 *
 * The style's own layers are adjusted in place rather than a bespoke style
 * being authored, so the basemap stays genuinely OpenStreetMap-derived and a
 * provider style update does not have to be re-forked. Layers are matched by
 * their `source-layer` and filter class, which are stable parts of the
 * OpenMapTiles schema.
 *
 * Nothing is deleted. Context is dimmed or hidden, so the map still reads as a
 * real place - which matters for a geographic digital twin.
 */

/** Road classes that stay visible as corridor context. */
const CONTEXT_ROAD_CLASSES = new Set(['motorway', 'trunk', 'primary'])

/** Road classes reduced to a faint hint of the wider network. */
const MINOR_ROAD_CLASSES = new Set(['secondary', 'tertiary'])

/**
 * No basemap place label survives.
 *
 * AEROGUARD labels its five operational corridor nodes from its own data. Any
 * other settlement name - Bengaluru, Kolar, Rayakottai, Attibele - makes this
 * read as a regional map rather than a dedicated NH-44 monitor, so the whole
 * `place` layer group is hidden and the corridor markers stand alone.
 */
const CONTEXT_PLACE_CLASSES = new Set<string>()

export interface DeclutterResult {
  hidden: number
  dimmed: number
  kept: number
}

function safeSet(action: () => void): boolean {
  try {
    action()
    return true
  } catch {
    // A style may not carry every layer this touches; skipping is correct.
    return false
  }
}

/**
 * Reads the class values a layer filters on.
 *
 * Layer ids differ between styles, but OpenMapTiles layers filter on `class`,
 * so the filter is a more reliable signal of what a layer draws than its name.
 */
function filterClasses(filter: unknown): string[] {
  const found: string[] = []
  const walk = (node: unknown): void => {
    if (!Array.isArray(node)) {
      return
    }
    for (const entry of node) {
      if (typeof entry === 'string') {
        found.push(entry)
      } else if (Array.isArray(entry)) {
        walk(entry)
      } else if (entry && typeof entry === 'object' && 'literal' in entry) {
        walk((entry as { literal: unknown }).literal)
      }
    }
  }
  walk(filter)
  return found
}

export function declutterBasemap(map: MapLibreMap): DeclutterResult {
  const style = map.getStyle()
  const result: DeclutterResult = { hidden: 0, dimmed: 0, kept: 0 }
  if (!style?.layers) {
    return result
  }

  const hide = (id: string): void => {
    if (safeSet(() => map.setLayoutProperty(id, 'visibility', 'none'))) {
      result.hidden++
    }
  }
  const dim = (id: string, type: string, opacity: number): void => {
    const property =
      type === 'line'
        ? 'line-opacity'
        : type === 'symbol'
          ? 'text-opacity'
          : type === 'fill'
            ? 'fill-opacity'
            : type === 'fill-extrusion'
              ? 'fill-extrusion-opacity'
              : null
    if (property && safeSet(() => map.setPaintProperty(id, property, opacity))) {
      result.dimmed++
    }
  }

  for (const layer of style.layers) {
    const id = layer.id
    // Never touch AEROGUARD's own layers.
    if (id.startsWith('aeroguard-')) {
      result.kept++
      continue
    }

    const sourceLayer = 'source-layer' in layer ? layer['source-layer'] : undefined
    const classes = filterClasses('filter' in layer ? layer.filter : undefined)
    const type = layer.type

    switch (sourceLayer) {
      // --- points of interest: no operational value in this phase ----------
      case 'poi':
      case 'housenumber':
      case 'aerodrome_label':
      case 'aeroway':
        hide(id)
        continue

      // --- administrative boundaries: keep only the coarsest ---------------
      case 'boundary': {
        const admin = Number(
          filterClasses('filter' in layer ? layer.filter : undefined).find((c) => /^\d$/.test(c)),
        )
        if (Number.isFinite(admin) && admin >= 4) {
          hide(id)
        } else {
          dim(id, type, 0.18)
        }
        continue
      }

      // --- roads -----------------------------------------------------------
      case 'transportation':
      case 'transportation_name': {
        const isContext = classes.some((c) => CONTEXT_ROAD_CLASSES.has(c))
        const isMinor = classes.some((c) => MINOR_ROAD_CLASSES.has(c))
        const isRail = classes.some((c) => c === 'rail' || c === 'transit')

        if (sourceLayer === 'transportation_name') {
          // Every road name and shield goes. Other highway refs beside NH-44
          // dilute the "this monitors NH-44" reading.
          hide(id)
          continue
        }
        if (isRail) {
          dim(id, type, 0.22)
          continue
        }
        if (isContext) {
          // Trunk roads elsewhere in the region are context, not the subject.
          // They stay legible enough to show the corridor connects to a real
          // network, but well below the NH-44 corridor layers.
          dim(id, type, 0.2)
          continue
        }
        if (isMinor) {
          dim(id, type, 0.12)
          continue
        }
        // Service roads, tracks, paths, footways, minor streets.
        hide(id)
        continue
      }

      // --- settlement labels ------------------------------------------------
      case 'place': {
        const isContext = classes.some((c) => CONTEXT_PLACE_CLASSES.has(c))
        if (isContext) {
          dim(id, type, 0.75)
        } else {
          // Villages, hamlets, suburbs, neighbourhoods.
          hide(id)
        }
        continue
      }

      // --- background context: keep, but quiet -----------------------------
      case 'building':
        // The flat basemap footprints are hidden; AEROGUARD draws the same
        // OSM buildings as 3D extrusions instead (see mapLayers).
        hide(id)
        continue
      case 'landuse':
      case 'landcover':
      case 'globallandcover':
        dim(id, type, 0.35)
        continue
      case 'water':
      case 'waterway':
        dim(id, type, 0.6)
        continue
      case 'water_name':
        hide(id)
        continue

      default:
        result.kept++
    }
  }

  return result
}
