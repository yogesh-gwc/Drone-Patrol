# Database

MySQL 8 (InnoDB) is the only supported database for AEROGUARD 3D. PostgreSQL and PostGIS
are not used.

## Layout

| Path | Contents |
| --- | --- |
| `migrations/` | Ordered schema migrations, `001_*.sql` onward. **Source of truth.** |
| `seed/` | Ordered seed data, `001_*.sql` onward. |
| `schema.sql` | Generated concatenation of all migrations, for reading only. |

The runners live in the backend so they share its environment handling and logging:

| File | Purpose |
| --- | --- |
| `backend/src/database/connection.ts` | Lazily created `mysql2` pool |
| `backend/src/database/migrator.ts` | Applies pending migrations, records checksums |
| `backend/src/database/seeder.ts` | Clears and reloads seed data |
| `backend/src/database/query.ts` | Parameterised query helper used by repositories |
| `backend/src/database/rowMapping.ts` | Row and geometry validation |
| `backend/src/database/repositories/` | One repository per entity |

## Commands

Run from `backend/`:

```bash
npm run db:check     # verify the connection and report the server version
npm run db:migrate   # apply pending migrations
npm run db:seed      # clear and reload seed data (destructive for seeded tables)
npm run db:setup     # migrate, then seed
```

Create the database once, before the first migration:

```sql
CREATE DATABASE IF NOT EXISTS aeroguard
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
```

Credentials come from `backend/.env` and are never committed.

## Migration rules

Migrations are applied in filename order and recorded in a `schema_migrations` table with
a SHA-256 checksum of the file. Editing a migration that has already been applied is
rejected on the next run — add a new numbered migration instead.

Because `drones`, `drone_zones` and `drone_routes` reference each other, three foreign keys
are added last, in `015_add_cross_references.sql`.

The migration and seed runners are the only code that opens a `multipleStatements`
connection, and they only ever execute `.sql` files from this repository. The application
pool never enables it, so no request-driven path can submit stacked statements.

## Coordinate convention

**This project stores geographic data in SRID 4326 and exchanges it as GeoJSON. Every
position is `[longitude, latitude]`, in that order. Do not mix conventions.**

MySQL's native axis order for SRID 4326 is *latitude first*, which is the opposite of
GeoJSON. Rather than relying on that, every boundary is explicit:

| Direction | How |
| --- | --- |
| Writing | `ST_GeomFromText('POINT(<lon> <lat>)', 4326, 'axis-order=long-lat')` |
| Reading | `ST_AsGeoJSON(column)` — always emits `[longitude, latitude]` per RFC 7946 |

`ST_X` / `ST_Y` are deliberately **not** used, because their meaning depends on the SRS
axis order. Where a scalar is needed, `ST_Longitude()` and `ST_Latitude()` are unambiguous.

Distances and lengths (`ST_Distance`, `ST_Length`) return **metres** on SRID 4326.

Polygon rings are wound counter-clockwise so the interior lies to the left.

`ST_Contains` tests the polygon *interior*, so a point exactly on a zone boundary is not
contained. Seeded charging stations are therefore placed just inside a zone rather than on
a shared seam.

All timestamps are stored and returned in **UTC**. Both the application pool and the
script connection issue `SET time_zone = '+00:00'`, so `CURRENT_TIMESTAMP` column defaults
and explicit `UTC_TIMESTAMP()` values agree.

## Spatial columns

| Table | Column | Type | Spatial index |
| --- | --- | --- | --- |
| `drones` | `location` | POINT | yes |
| `drone_telemetry` | `location` | POINT | no — see below |
| `drone_zones` | `geometry` | POLYGON | yes |
| `drone_zones` | `start_location`, `end_location` | POINT | no |
| `drone_routes` | `geometry` | LINESTRING | yes |
| `drone_routes` | `start_location`, `end_location` | POINT (generated) | no |
| `charging_stations` | `location` | POINT | yes |
| `road_segments` | `geometry` | LINESTRING | yes |
| `road_segments` | `start_point`, `end_point` | POINT (generated) | no |
| `locations` | `location` | POINT | yes |
| `vehicles` | `location` | POINT | yes |
| `vehicle_events` | `location` | POINT | no |
| `emergency_events` | `location` | POINT | yes |
| `sos_events` | `start_location`, `destination`, `current_location` | POINT | on `current_location` |
| `incidents` | `location` | POINT | yes |
| `alerts` | `location` | POINT, nullable | no — see below |

Ten spatial indexes in total. Two deliberate omissions:

- **`drone_telemetry`** is queried as "the latest N rows for one drone", which the
  `(drone_id, recorded_at DESC)` index serves. A spatial index would only add cost to
  high-frequency inserts.
- **`alerts.location`** is nullable, because some alerts are system-level (communication
  failure, drone offline) with no meaningful position. MySQL requires a `NOT NULL` column
  for a spatial index, so geographic alert queries go through the related incident.

### Generated columns

Five columns are derived rather than stored twice:

| Column | Expression |
| --- | --- |
| `charging_stations.available_slots` | `capacity - occupied_slots` |
| `drone_routes.start_location` | `ST_StartPoint(geometry)` |
| `drone_routes.end_location` | `ST_EndPoint(geometry)` |
| `road_segments.start_point` | `ST_StartPoint(geometry)` |
| `road_segments.end_point` | `ST_EndPoint(geometry)` |

Route and road `distance_meters` values are computed by MySQL with `ST_Length(geometry)`
during seeding, so no distance is ever hand-entered.

## Seed data is simulated, not surveyed

Every geographic row seeded in Phase 2 carries `data_source = 'SIMULATED'`, and Phase 3
replaces it with `OSM_IMPORT` rows derived from OpenStreetMap.

What the placeholders are:

- The five corridor settlements (Krishnagiri, Kundarapalli, Kurubarapalli, Shoolagiri,
  Hosur) are real places. Their coordinates are **approximate, rounded to about 1 km**.
- Patrol zones are plain rectangles tiling the corridor by longitude. They are **not**
  operational boundaries.
- Patrol routes and road segments are **coarse three-point lines**, not road geometry. The
  ten placeholder routes total about 47.9 km.
- `road_segments.road_name` refers to NH-44, which is the real highway on this corridor,
  but the **geometry is a placeholder** and `osm_id` is NULL.
- Every other location row — hospitals, schools, police stations, factories, fuel
  stations — is a **fabricated development placeholder**. Those facilities do not exist.
  Their names begin with "Placeholder" and their descriptions say so.
- Vehicle codes (`VH-001`...) and SOS person references (`SIM-PERSON-...`) are synthetic.
  No registration number, owner or personal data is stored anywhere.

`emergency_events` and `sos_events` are seeded **empty** on purpose: those records are
created by the Phase 10 and Phase 11 workflows, and pre-filling them would imply
emergencies that never happened.

The two seeded incidents and four seeded alerts describe the static drone snapshot only
(DR-09 offline, DR-06 low battery, DR-03 charging). No police dispatch, emergency call or
hardware action has occurred or can occur from any row in this database.

## Phase 3

Phase 3 imports OpenStreetMap-derived geometry for the corridor and replaces the
placeholder rows. The `data_source` and `osm_id` columns exist so imported and placeholder
geometry can be told apart, and so the placeholders can be removed cleanly.
