# AEROGUARD 3D

**Intelligent drone-based highway safety and emergency response system.**

> **This application is a simulation.** It does not connect to physical drones, cameras,
> speakers or emergency services. No real emergency call, police dispatch or hardware
> command is ever made. All camera feeds, telemetry and dispatch events are simulated and
> labelled as such in the interface.

---

## 1. What AEROGUARD 3D is

AEROGUARD 3D is a full-stack 3D digital-twin and emergency-response simulation platform for
the highway corridor between **Krishnagiri → Kundarapalli → Kurubarapalli → Shoolagiri →
Hosur**.

When complete, it simulates roughly 10 autonomous patrol drones, 5 charging stations, road
traffic, ambulances, SOS incidents, suspicious-vehicle monitoring, drone cameras and
speakers, alerts, and real-time telemetry — presented as a professional emergency
operations command centre rather than a gaming dashboard.

## 2. Project objective

Demonstrate to a district-level decision maker how a coordinated drone fleet could improve
highway safety and emergency response along a real geographic corridor:

- Continuous drone patrol of geographic zones along the highway
- An **ambulance priority corridor** — a drone flies ~500 m ahead of an ambulance and warns
  traffic over its speaker
- **SOS tracking** — a drone follows a person in distress to their destination
- **Suspicious vehicle monitoring** — a stationary-vehicle timer escalates to a warning and
  then to a simulated police dispatch
- A **camera wall** of all drone feeds and a live alert/incident timeline

## 3. Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4 |
| Geographic map | MapLibre GL JS (OpenStreetMap-derived data) |
| 3D objects | Three.js (GLTF/GLB assets) |
| Client state | Zustand |
| Geospatial maths | Turf.js |
| Real-time client | Socket.IO Client |
| Backend | Node.js, Express 5, TypeScript |
| Real-time server | Socket.IO |
| Database | MySQL 8 (InnoDB, spatial types, SRID 4326) |
| Testing | Playwright (added in a later phase) |

MapLibre GL JS owns the geography (roads, coordinates, camera, terrain, layers). Three.js
owns the animated objects (drones, vehicles, stations, flight paths), positioned from
geographic coordinates rather than arbitrary screen coordinates.

## 4. Project structure

```text
AEROGUARD_3D/
│
├── frontend/                   React + TypeScript + Vite client
│   └── src/
│       ├── components/         Reusable presentational components
│       ├── map/                MapLibre scene, camera, layers, terrain
│       │   └── three/          Three.js layer, scene, coordinate conversion
│       ├── drones/             Drone models and views        (Phase 5+)
│       ├── vehicles/           Vehicle models and views      (Phase 8+)
│       ├── emergency/          Ambulance / SOS / incidents   (Phase 10+)
│       ├── simulation/         Simulation controls           (Phase 9+)
│       ├── camera-wall/        Drone camera wall             (Phase 13)
│       ├── dashboard/          Command-centre panels
│       ├── services/           API + Socket.IO transport
│       ├── store/              Zustand stores
│       ├── types/              Shared TypeScript types
│       ├── utils/              Helpers and runtime config
│       ├── App.tsx
│       └── main.tsx
│
├── backend/                    Express + Socket.IO server
│   └── src/
│       ├── controllers/        HTTP request handlers
│       ├── routes/             Express routers
│       ├── services/           Business logic
│       ├── simulation/         Authoritative simulation loop (Phase 9+)
│       ├── socket/             Socket.IO server
│       ├── database/           MySQL pool, migrator, seeder
│       │   └── repositories/   One repository per entity
│       ├── middleware/         Error / 404 handling
│       ├── types/              Shared TypeScript types
│       ├── utils/              Env config and logger
│       ├── app.ts
│       └── server.ts
│
├── database/                   MySQL 8 schema and seed data
│   ├── migrations/             Ordered schema migrations (source of truth)
│   ├── seed/                   Ordered seed data
│   └── schema.sql              Generated full-schema reference
├── map-data/                   roads / routes / locations / terrain GeoJSON (Phase 3)
├── assets/                     drones / vehicles / buildings / environment GLB (Phase 5+)
├── docs/
├── .gitignore
├── README.md
└── AEROGUARD_3D_Master_Specification.md
```

Empty directories are intentional: they are the agreed home for work introduced in the
phase noted beside them. Business logic stays out of React components — the backend owns
the authoritative simulation state.

## 5. Prerequisites

| Requirement | Minimum | Verify with |
| --- | --- | --- |
| Node.js | 20 LTS (22 recommended) | `node -v` |
| npm | 10 | `npm -v` |
| Git | any recent | `git --version` |
| MySQL Server | 8.0 | `SELECT VERSION();` |
| MySQL Workbench | 8.0 | — |

## 6. How to configure MySQL

1. Make sure the MySQL 8 service is running and listening on `127.0.0.1:3306`.
2. Create the database (MySQL Workbench, or the `mysql` client):

   ```sql
   CREATE DATABASE IF NOT EXISTS aeroguard
     CHARACTER SET utf8mb4
     COLLATE utf8mb4_0900_ai_ci;
   ```

3. Confirm the server version:

   ```sql
   SELECT VERSION();
   ```

> The `mysql` command-line client ships with MySQL Server but is not always on `PATH` on
> Windows. It is typically at
> `C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe`.

4. Create the schema and load the seed data:

   ```bash
   cd backend
   npm run db:setup
   ```

`db:setup` applies the migrations in `database/migrations/` and then loads the seed data in
`database/seed/`. Applied migrations are recorded in a `schema_migrations` table, so
re-running is safe. `db:seed` is destructive for the seeded tables: it clears and reloads
them.

See [database/README.md](database/README.md) for the schema layout, the coordinate
convention, and what the seed data does and does not represent.

## 7. How to configure environment variables

Credentials are never committed. Both packages ship a `.env.example` template; copy each to
`.env` and fill in your own values.

**Backend** — `backend/.env`:

```bash
cd backend
cp .env.example .env
```

PowerShell: `Copy-Item .env.example .env`

| Variable | Purpose | Example |
| --- | --- | --- |
| `PORT` | Backend HTTP port | `4000` |
| `NODE_ENV` | Runtime environment | `development` |
| `CLIENT_URL` | Frontend origin allowed by CORS and Socket.IO | `http://localhost:5173` |
| `DATABASE_HOST` | MySQL host | `127.0.0.1` |
| `DATABASE_PORT` | MySQL port | `3306` |
| `DATABASE_USER` | MySQL user | `root` |
| `DATABASE_PASSWORD` | MySQL password — **set this locally, never commit it** | *(your password)* |
| `DATABASE_NAME` | Database name | `aeroguard` |
| `DATABASE_CONNECTION_LIMIT` | Pool size | `10` |

**Frontend** — `frontend/.env` (optional; sensible defaults are built in):

```bash
cd frontend
cp .env.example .env
```

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_API_URL` | Backend REST base URL | `http://localhost:4000` |
| `VITE_SOCKET_URL` | Socket.IO base URL | falls back to `VITE_API_URL` |
| `VITE_MAPTILER_API_KEY` | **Required.** MapTiler key for the basemap and terrain | none |
| `VITE_MAP_STYLE` | MapTiler style id | `streets-v2-dark` |

### MapTiler key

The map will not load without `VITE_MAPTILER_API_KEY`; the app shows a configuration error
panel explaining exactly that rather than a blank screen. Create a free key at
<https://cloud.maptiler.com/account/keys/> and put it in `frontend/.env`:

```bash
VITE_MAPTILER_API_KEY=your-key-here
```

The same key serves the vector basemap and the Terrain RGB elevation tiles. Vite only
exposes `VITE_*` variables, and it inlines them into the client bundle at build time, so
this key is public by nature - restrict it by URL/origin in the MapTiler dashboard rather
than treating it as a secret. Restart the dev server after changing `.env`.

Only `VITE_*` variables reach the browser. Database credentials must never be placed in the
frontend environment.

Verify the MySQL credentials once configured:

```bash
cd backend
npm run db:check
```

## 8. How to start the backend

```bash
cd backend
npm install
npm run dev
```

The server listens on <http://localhost:4000>.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server with reload (tsx watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server |
| `npm run typecheck` | Type-check without emitting |
| `npm run db:check` | Verify the MySQL connection |
| `npm run db:migrate` | Apply pending schema migrations |
| `npm run db:seed` | Clear and reload seed data |
| `npm run db:setup` | Migrate, then seed |

## 9. How to start the frontend

```bash
cd frontend
npm install
npm run dev
```

Vite serves the client on <http://localhost:5173>.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite development server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | Type-check without emitting |

Start the backend first so the connectivity panel reports **online**.

## 10. How to verify `/api/health`

With the backend running:

```bash
curl http://localhost:4000/api/health
```

PowerShell:

```powershell
Invoke-RestMethod http://localhost:4000/api/health | ConvertTo-Json
```

Expected response:

```json
{
  "success": true,
  "message": "AEROGUARD 3D backend is running",
  "data": {
    "service": "aeroguard-3d-backend",
    "environment": "development",
    "uptimeSeconds": 12.4,
    "timestamp": "2026-01-01T00:00:00.000Z"
  }
}
```

The frontend runs the same check on load and shows the result — along with the Socket.IO
connection state — in the **System Connectivity** panel at <http://localhost:5173>.

## 11. REST API

Every response uses the same envelope:

```json
{ "success": true, "message": "10 drones returned", "data": [] }
```

An empty collection is a success with `data: []`, not a 404. Errors return
`{ "success": false, "message": "..." }` and never expose SQL, stack traces or connection
detail.

Available now (read-only):

| Endpoint | Returns |
| --- | --- |
| `GET /api/health` | Backend runtime snapshot |
| `GET /api/drones` | All 10 drones |
| `GET /api/drones/:id` | One drone, by numeric id or code (`1` or `DR-01`) |
| `GET /api/zones` | All 10 patrol zones, with POLYGON geometry |
| `GET /api/routes` | All 10 patrol routes, with LINESTRING geometry |
| `GET /api/charging-stations` | All 5 charging stations |
| `GET /api/locations` | All point locations |
| `GET /api/vehicles` | All simulated vehicles |

| Status | When |
| --- | --- |
| `200` | Success, including an empty collection |
| `400` | Malformed route parameter |
| `404` | Route or resource not found |
| `500` | Unexpected server or database error (detail is logged, not returned) |

Geometry is returned as GeoJSON with `[longitude, latitude]` positions. See
[database/README.md](database/README.md#coordinate-convention).

Simulation controls and emergency endpoints arrive in later phases.

## 12. Map and 3D architecture

### Division of responsibility

| MapLibre GL JS owns | Three.js owns |
| --- | --- |
| Geographic basemap, roads, labels | 3D application objects |
| The camera - zoom, pan, rotate, pitch, bearing | Their geometry, materials and lighting |
| 3D terrain and elevation | Later: drones, vehicles, stations, buildings |

Three.js never owns a camera. It renders into MapLibre's own WebGL context through a
`CustomLayerInterface`, and its camera projection matrix is rebuilt each frame from
MapLibre's world-to-clip matrix. There is no second canvas over the map, so there is
nothing to keep in sync by hand - camera changes need no handling in the 3D code at all.

### Coordinate conversion

Three spaces are involved, and `frontend/src/map/three/coordinateUtils.ts` documents them
in full:

1. **Geographic** - EPSG:4326, `[longitude, latitude]` plus altitude in metres. The
   project-wide convention, matching the MySQL SRID 4326 columns from Phase 2.
2. **Mercator** - MapLibre's world space, `[0,0]` top-left to `[1,1]` bottom-right, so y
   increases *southward*. `MercatorCoordinate.fromLngLat` projects into it.
3. **Scene** - a local Three.js frame: East-North-Up in **metres**, centred on the corridor
   (`+X` east, `+Y` north, `+Z` up).

A local metre-based frame is used because mercator units across the corridor are around
`1e-7`, which loses precision in float32 shader maths. The camera matrix carries the frame
back into mercator space:

```text
cameraProjection = mainMatrix * translate(sceneOrigin) * scale(s, -s, s)
```

where `s` is one metre in mercator units at the origin latitude, and the negative Y flips
MapLibre's southward axis so `+Y` is north.

**Positions are exact.** Each coordinate is projected with MapLibre's own `fromLngLat` and
then expressed as an offset in origin-metre units, so substituting into the matrix above
recovers the original mercator coordinate with no accumulated error. Only object *sizes*
carry a small error - one scene unit is exactly one metre at the origin latitude, and
mercator scale varies with latitude, giving about 0.05 % across this corridor.

Objects are anchored geographically, never in screen or pixel coordinates.
`ThreeObjectManager` holds each object's longitude, latitude and altitude, and altitude can
be absolute or relative to the terrain surface (resolved with `queryTerrainElevation` as DEM
tiles stream in).

### Keeping the scene off the React render path

The map and the Three.js scene are long-lived imperative objects. They are created once in
`MapScene` and held in `mapRegistry` outside React, so no re-render can rebuild them. State
flows one way: the map pushes status and camera readings into `useMapStore`, and UI controls
issue commands through `mapCamera`. Objects are created once and thereafter only
repositioned, which is what lets the Phase 5+ fleet move at telemetry rate without touching
the React tree.

### Data provenance

| Layer | Data | Source |
| --- | --- | --- |
| Basemap, roads, labels, POIs | **REAL** | MapTiler vector tiles (OpenStreetMap-derived) |
| Terrain elevation | **REAL** | MapTiler Terrain RGB v2 |
| Corridor settlements | **REAL** | MapTiler Geocoding, stored in `map-data/locations/` |
| Alignment marker | **SIMULATED** | Phase 4 test object - not a drone |
| Drones, vehicles, incidents | **SIMULATED** | MySQL, `data_source = 'SIMULATED'` |

The legend splits real geography from simulated objects for this reason. Phase 2's seeded
placeholder coordinates are not real facility positions and are not presented as such -
see [map-data/README.md](map-data/README.md).

## 13. Development phases

The project is built one phase at a time; later phases are not started early.

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Machine preparation — Node, npm, Git, MySQL 8, Workbench | Complete |
| 1 | Project foundation — frontend, backend, MySQL config, Socket.IO transport, `/api/health` | Complete |
| 2 | MySQL schema, spatial tables, seed data and read-only API | Complete |
| 3 | MapLibre geographic map of the Krishnagiri → Hosur corridor | **Complete** |
| 4 | 3D terrain and Three.js / MapLibre integration | **Complete** |
| 5 | First drone (DR-01) following real route geometry | Not started |
| 6 | 10 drones, patrol zones and routes | Not started |
| 7 | Charging stations, battery and capacity logic | Not started |
| 8 | Vehicle simulation and traffic controls | Not started |
| 9 | Socket.IO real-time telemetry | Not started |
| 10 | Ambulance priority corridor (500 m escort) | Not started |
| 11 | SOS tracking | Not started |
| 12 | Suspicious vehicle monitoring and simulated dispatch | Not started |
| 13 | Camera wall | Not started |
| 14 | Professional command-centre UI | Not started |
| 15 | Demo mode and Playwright tests | Not started |

The full specification, including per-phase detail, is in
[AEROGUARD_3D_Master_Specification.md](AEROGUARD_3D_Master_Specification.md).

## Attribution and safety

- Geographic data will be OpenStreetMap-derived; OpenStreetMap attribution is displayed in
  the map UI from Phase 3 onward. Google Maps data is not used.
- Simulated content is explicitly labelled: `SIMULATION`, `DEMO MODE`, `SIMULATED CAMERA`,
  `SIMULATED POLICE DISPATCH`.
