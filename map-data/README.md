# map-data

**REAL geographic reference data.** Everything in this directory describes the actual world.
It is deliberately kept apart from the SIMULATED drone, vehicle and incident data that lives
in MySQL (see [../database/README.md](../database/README.md)).

That separation is the point of this directory. Phase 2 seeded placeholder geography into
MySQL with `data_source = 'SIMULATED'` so the schema and API could be exercised; those
coordinates are **not** real facility positions and must never be presented as such. Real
geography is sourced here and from the map provider.

## Layout

| Path | Contents | Status |
| --- | --- | --- |
| `locations/` | Point features - settlements and, later, facilities | `corridor-settlements.json` present |
| `roads/` | Road geometry exports (GeoJSON / OSM extracts) | empty - see below |
| `routes/` | Derived drone patrol route geometry | empty - Phase 5+ |
| `terrain/` | Local elevation exports, if ever needed offline | empty - see below |

## corridor-settlements.json

The five settlements that name the patrol corridor, with real coordinates:

| Name | Longitude | Latitude | Confidence |
| --- | --- | --- | --- |
| Krishnagiri | 78.22065 | 12.51888 | high |
| Kundarapalli | 78.19531 | 12.70649 | **low** |
| Kurubarapalli | 78.13306 | 12.60074 | high |
| Shoolagiri | 78.01063 | 12.66476 | high |
| Hosur | 77.83095 | 12.73288 | high |

- **Source:** MapTiler Geocoding API, which is OpenStreetMap-derived.
- **Retrieved:** 2026-09-08.
- **CRS:** EPSG:4326 (WGS 84), positions as `[longitude, latitude]` per RFC 7946.
- **Attribution:** © MapTiler © OpenStreetMap contributors. OpenStreetMap data is available
  under the Open Database License (ODbL).

**Kundarapalli is low confidence and is labelled `approx` in the UI.** The geocoder had no
settlement entry for it and returned only "Kundarapalli - Veppanapalli Road" (PIN 635121,
Krishnagiri district). The stored position is that road, not a verified village centre.
Confirm it before any operational use.

Straight-line Krishnagiri to Hosur distance from these coordinates is 48.5 km.

Note that these real coordinates differ materially from the Phase 2 MySQL placeholders -
Shoolagiri is at latitude 12.665, not the placeholder's 12.74. Phase 3 onward uses this
file; the MySQL placeholder geography is replaced when the OSM import lands.

## Roads, junctions and facilities

No road geometry is stored here yet, and none is invented. The basemap already renders
real OpenStreetMap-derived roads, junctions, settlements and points of interest from the
MapTiler vector tile source, so the corridor is drawn from genuine data without a local
export. `frontend/src/map/mapLayers.ts` styles the highway classes (`motorway`, `trunk`,
`primary`) from that source rather than from a copied dataset.

A local export becomes worthwhile when the backend needs the geometry - for drone route
snapping and spatial queries against the Phase 2 `road_segments` and `locations` tables.
When that happens:

- extract from OpenStreetMap (Overpass API or a Geofabrik regional extract), never by
  scraping Google Maps or any other provider;
- keep the original OSM feature ids so rows can be traced and re-imported - the
  `locations.osm_id` and `road_segments.osm_id` columns exist for this;
- write imported rows with `data_source = 'OSM_IMPORT'` to distinguish them from the
  remaining placeholders;
- record the source, extract date, licence and bounding box alongside the file, as
  `corridor-settlements.json` does in its `metadata` block.

## Terrain

Elevation is streamed live from MapTiler Terrain RGB v2 (a raster-DEM source, 512 px tiles,
Mapbox RGB encoding, zoom 0-14), so no local DEM is stored. Sampled elevations along the
corridor run roughly 615 m at Krishnagiri to 1109 m at Hosur.

This directory would only be used if an offline or self-hosted DEM were required.

## Consuming these files

The frontend imports them through the `@map-data` Vite alias, which points at this
directory:

```ts
import rawSettlements from '@map-data/locations/corridor-settlements.json'
```

`frontend/src/map/corridorData.ts` validates the GeoJSON on load rather than trusting it,
so a malformed or hand-edited file fails at start-up instead of quietly placing markers in
the wrong place. It also rejects out-of-range coordinates, which catches an accidental
latitude/longitude swap.
