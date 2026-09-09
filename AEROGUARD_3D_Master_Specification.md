# AEROGUARD 3D

## Intelligent Drone-Based Highway Safety & Emergency Response System

**Master project specification + end-to-end phased implementation plan**

------------------------------------------------------------------------

## 1. Project Overview

Build a professional full-stack 3D digital-twin and emergency-response
simulation platform representing the highway corridor between:

-   Krishnagiri
-   Kundarapalli
-   Kurubarapalli
-   Shoolagiri
-   Hosur

The system will simulate approximately 10 autonomous drones patrolling
predefined highway zones, approximately 5 charging stations, road
traffic, ambulances, SOS incidents, suspicious vehicles, important
public locations, drone cameras, drone speakers, alerts, and real-time
telemetry.

The application is initially a **simulation** because physical drones
and cameras are not available.

The target presentation audience is a **District Collector / government
decision-maker**. The application should therefore look like a
professional emergency operations and command-center platform, not a
gaming dashboard.

------------------------------------------------------------------------

# 2. Technology Stack

## Frontend

-   React
-   TypeScript
-   Vite
-   Tailwind CSS
-   MapLibre GL JS
-   Three.js
-   Zustand
-   Turf.js
-   Socket.IO Client

## Backend

-   Node.js
-   Express.js
-   TypeScript
-   Socket.IO

## Database

-   MySQL 8
-   MySQL spatial data types
-   InnoDB

## Geographic Data

-   OpenStreetMap

## 3D Assets

-   GLTF / GLB

## Testing

-   Playwright

------------------------------------------------------------------------

# 3. Important Architecture Decision

Do **not** implement the entire geographic map using raw Three.js.

Use MapLibre GL JS for:

-   geographic map
-   roads
-   geographic coordinates
-   map camera
-   zoom
-   pitch
-   bearing
-   terrain
-   geographic navigation
-   map layers

Use Three.js for:

-   drones
-   vehicles
-   ambulances
-   charging stations
-   3D buildings
-   people
-   custom 3D markers
-   animated objects
-   flight paths
-   emergency visualizations

Three.js objects must be positioned from geographic coordinates. Do not
use arbitrary screen coordinates disconnected from the real map.

------------------------------------------------------------------------

# 4. Database

Database name:

`aeroguard`

Create these tables:

-   drones
-   drone_zones
-   drone_routes
-   drone_telemetry
-   charging_stations
-   road_segments
-   locations
-   vehicles
-   vehicle_events
-   emergency_events
-   sos_events
-   alerts
-   incidents
-   simulation_state

Use MySQL spatial types:

-   POINT for drones, vehicles and point locations
-   LINESTRING for roads and routes
-   POLYGON for patrol zones

Use SRID 4326 where appropriate.

Use InnoDB and appropriate indexes/spatial indexes.

------------------------------------------------------------------------

# 5. Drone System

Create approximately 10 drones:

-   DR-01
-   DR-02
-   DR-03
-   DR-04
-   DR-05
-   DR-06
-   DR-07
-   DR-08
-   DR-09
-   DR-10

Each drone must have:

-   id
-   drone_code
-   name
-   status
-   battery_percentage
-   location
-   altitude
-   speed
-   heading
-   camera_status
-   speaker_status
-   gps_status
-   current_zone
-   current_route
-   charging_station
-   current_incident
-   last_telemetry
-   created_at
-   updated_at

Statuses:

-   PATROLLING
-   RESPONDING
-   ESCORTING
-   SOS_TRACKING
-   CHARGING
-   RETURNING
-   OFFLINE
-   EMERGENCY

------------------------------------------------------------------------

# 6. Drone Patrol Zones

Divide the Krishnagiri → Hosur corridor into geographic patrol zones.

Example initial corridor:

``` text
Krishnagiri
    ↓
Kundarapalli
    ↓
Kurubarapalli
    ↓
Shoolagiri
    ↓
Hosur
```

Do not assume these are the final operational boundaries. Prepare the
system so actual route geometry can define the final zones.

Each zone should have:

-   id
-   name
-   geometry
-   assigned drone
-   route
-   start location
-   end location
-   charging station

A drone should normally remain inside its assigned zone.

Other drones should not randomly enter another drone's zone.

Emergency response may temporarily override normal zone assignment.

------------------------------------------------------------------------

# 7. Charging Stations

Create approximately 5 charging stations.

Each station should have:

-   id
-   name
-   location
-   capacity
-   occupied_slots
-   available_slots
-   power_status
-   status

Multiple drones can charge at the same station according to capacity.

When a drone enters CHARGING state:

-   camera status becomes OFFLINE
-   camera wall shows CAMERA UNAVAILABLE
-   battery gradually increases
-   charging station occupancy updates

A charging drone should not participate in normal emergency response
unless the simulation explicitly overrides the state.

------------------------------------------------------------------------

# 8. Geographic Map

Use OpenStreetMap-derived geographic data.

The application must represent the real geographic corridor between
Krishnagiri and Hosur.

Display:

-   highways
-   major roads
-   junctions
-   cities
-   villages
-   hospitals
-   schools
-   colleges
-   factories
-   police stations
-   fire stations
-   fuel stations
-   charging stations
-   other important public locations

Include OpenStreetMap attribution in the UI.

Do not scrape or copy Google Maps data.

The map data should be prepared so relevant road and location geometry
can be imported as GeoJSON and/or stored in MySQL spatial columns.

------------------------------------------------------------------------

# 9. 3D Terrain

Use 3D terrain/elevation where feasible.

Support:

-   zoom
-   pan
-   rotate
-   pitch
-   bearing
-   smooth camera transitions

When the user selects an important location such as Shoolagiri,
Kundarapalli or Hosur, smoothly fly the camera to that location.

------------------------------------------------------------------------

# 10. Drone Movement

Drone movement must follow actual route geometry.

Do NOT move drones with arbitrary code such as:

``` javascript
drone.x += 0.01;
```

Instead:

``` text
route geometry
→ route coordinates
→ route interpolation
→ geographic position
→ map/Three.js coordinate
→ animated drone
```

The drone should visually follow the highway route.

------------------------------------------------------------------------

# 11. Vehicles

Create simulated:

-   cars
-   trucks
-   bikes
-   buses
-   ambulances

Each vehicle should have:

-   id
-   type
-   location
-   speed
-   heading
-   status
-   route
-   last_movement_time
-   stationary_duration

Provide controls:

-   START
-   STOP
-   RESET

------------------------------------------------------------------------

# 12. Real-Time System

Use Socket.IO.

The backend must own the authoritative simulation state.

Frontend receives real-time updates.

Events:

``` text
drone:update
drone:telemetry
drone:status

vehicle:update
vehicle:stopped
vehicle:moving

ambulance:active
ambulance:resolved

sos:active
sos:update
sos:resolved

alert:created
alert:acknowledged

charging:update

police:dispatch

simulation:state
```

Do not rely on aggressive REST polling for real-time telemetry.

------------------------------------------------------------------------

# 13. Feature 1 --- Ambulance Priority Corridor

When an ambulance emergency is triggered:

1.  Create an ambulance emergency event.
2.  Determine its geographic location.
3.  Find the responsible/nearest available drone.
4.  Assign that drone.
5.  Calculate a position approximately 500 meters ahead of the ambulance
    along its route.
6.  Move the drone to that position.
7.  Change drone status to ESCORTING.
8.  Activate the drone speaker.
9.  Display the emergency route.
10. Display a real-time alert.
11. Resolve the event when the ambulance passes/completes its route.
12. Return the drone to its normal patrol route.

Visualize:

``` text
DRONE
  ↓
approximately 500m
  ↓
AMBULANCE
  ↓
TRAFFIC
```

Simulated speaker message:

> Emergency ambulance approaching. Please move to the side and provide a
> clear passage.

Do not make actual emergency calls.

------------------------------------------------------------------------

# 14. Feature 2 --- SOS Tracking

When SOS is triggered:

1.  Create a simulated person at a geographic location.
2.  Find an available/appropriate drone.
3.  Assign the drone.
4.  Change drone status to SOS_TRACKING.
5.  Make the drone follow the person.
6.  Display the person on the 3D map.
7.  Display the drone.
8.  Display a visual tracking connection.
9.  Display destination.
10. Display distance.
11. Display ETA.
12. Continue tracking until the person reaches the destination.
13. Resolve the SOS.
14. Return the drone to its patrol zone.

Display:

``` text
SOS ACTIVE

Person ID
Drone ID
Distance
ETA
Tracking status
Camera status
Speaker status
Destination
```

------------------------------------------------------------------------

# 15. Feature 3 --- Suspicious Vehicle Monitoring

When a vehicle stops:

-   start a stationary timer

After 40 simulated minutes:

-   create a warning
-   assign a responsible drone
-   move/keep the drone near the vehicle
-   activate the speaker
-   display the warning

Simulated speaker message:

> Please move your vehicle if you do not have an emergency. This area is
> under monitoring.

If the vehicle remains stationary for another 40 simulated minutes:

-   create a critical incident
-   create a simulated police dispatch
-   display dispatch status

Do NOT actually call police or any emergency number.

Display:

``` text
SIMULATED 100 DISPATCH
```

------------------------------------------------------------------------

# 16. Simulation Time

Support:

-   1x
-   5x
-   10x
-   60x

The suspicious-vehicle timer must use simulation time so the 40-minute
and 80-minute scenarios can be demonstrated quickly.

------------------------------------------------------------------------

# 17. Simulation Control Center

Provide an expandable control panel:

``` text
SIMULATION CONTROL

Start Simulation
Pause Simulation
Reset Simulation

Start Traffic

Trigger Ambulance
Trigger SOS
Create Suspicious Vehicle

Send Drone To Charging
Force Drone Emergency Response

Simulation Speed:
1x
5x
10x
60x
```

------------------------------------------------------------------------

# 18. Camera Wall

Create a Camera Wall mode.

Display all 10 drone cameras.

Each card should display:

-   drone ID
-   LIVE / UNAVAILABLE
-   battery
-   location
-   status
-   simulated camera view

Charging drones must display:

``` text
CHARGING
CAMERA UNAVAILABLE
```

Physical cameras do not exist yet.

Use simulated camera visualizations.

Clicking a camera should focus the corresponding drone on the 3D map.

------------------------------------------------------------------------

# 19. Drone Detail Panel

When the user clicks a drone, display:

-   Drone ID
-   Status
-   Battery
-   Altitude
-   Speed
-   Heading
-   Camera
-   Speaker
-   GPS
-   Current patrol zone
-   Current route
-   Next charging station
-   Distance to charging station
-   Current incident
-   Last telemetry update

------------------------------------------------------------------------

# 20. Vehicle Detail Panel

When the user clicks a vehicle, display:

-   Vehicle ID
-   Type
-   Speed
-   Location
-   Route
-   Status
-   Stationary duration
-   Responsible drone
-   Incident

------------------------------------------------------------------------

# 21. Location Detail Panel

When the user clicks a location, display:

-   name
-   type
-   coordinates
-   description
-   nearby drones
-   nearby vehicles
-   nearby incidents

Location types:

-   HOSPITAL
-   SCHOOL
-   COLLEGE
-   FACTORY
-   POLICE
-   FIRE_STATION
-   FUEL_STATION
-   CITY
-   VILLAGE
-   CHARGING_STATION

------------------------------------------------------------------------

# 22. Alert System

Alert levels:

-   INFO
-   WARNING
-   CRITICAL
-   EMERGENCY

Possible alerts:

-   low battery
-   charging
-   ambulance detected
-   SOS activated
-   suspicious vehicle
-   police dispatch
-   charging station full
-   drone offline
-   communication failure

Clicking an alert should:

1.  zoom/fly the map to the event
2.  open relevant details

------------------------------------------------------------------------

# 23. Map Interaction

Clicking a drone:

-   show drone detail

Clicking a vehicle:

-   show vehicle detail

Clicking a charging station:

-   show station detail

Clicking a hospital/school/factory:

-   show location detail

Clicking a city/village:

-   fly to the location

Clicking an emergency event:

-   zoom to event

Clicking an SOS event:

-   focus the tracked person and drone

Clicking a highway segment:

-   highlight the road
-   show road information

------------------------------------------------------------------------

# 24. Road Information

When a highway segment is selected, display:

-   road name
-   road type
-   current traffic
-   nearby vehicles
-   responsible drone
-   patrol zone
-   nearby charging station
-   nearby hospital
-   nearby police station
-   active incidents

------------------------------------------------------------------------

# 25. Professional UI Design

The target is a government/emergency operations command center.

Do NOT make it look like:

-   a video game
-   a cyberpunk interface
-   a generic admin dashboard

Use:

-   dark professional map
-   subtle glass panels
-   restrained borders
-   clean typography
-   clear status indicators
-   minimal animation
-   strong map hierarchy
-   high information density without clutter

The map should dominate the viewport.

Suggested structure:

``` text
┌───────────────────────────────────────────────────────────────┐
│ AEROGUARD 3D              LIVE • KRISHNAGIRI → HOSUR        │
├────────────┐                                  ┌───────────────┤
│ SYSTEM     │                                  │ ALERTS        │
│            │                                  │               │
│ 10 DRONES  │          3D HIGHWAY              │ AMBULANCE     │
│ 5 STATIONS │                                  │ SOS           │
│ VEHICLES   │                                  │ VEHICLE       │
│ INCIDENTS  │                                  │               │
├────────────┴──────────────────────────────────┴───────────────┤
│ SELECTED DRONE / VEHICLE / INCIDENT INFORMATION              │
└───────────────────────────────────────────────────────────────┘
```

------------------------------------------------------------------------

# 26. Frontend Components

Create reusable components:

``` text
MapScene
DroneModel
VehicleModel
AmbulanceModel
ChargingStationModel
LocationMarker
PatrolZoneLayer
RouteLayer
DroneDetailPanel
VehicleDetailPanel
LocationDetailPanel
AlertPanel
EmergencyPanel
CameraWall
SimulationControls
SystemStatusBar
MapControls
Legend
IncidentTimeline
```

Do not put the entire application into one React component.

------------------------------------------------------------------------

# 27. State Management

Use Zustand for:

``` text
selectedDrone
selectedVehicle
selectedLocation
activeIncident
mapMode
cameraWallOpen
simulationState
simulationSpeed
alerts
droneTelemetry
vehicleTelemetry
```

Keep authoritative simulation state on the backend.

------------------------------------------------------------------------

# 28. Backend Structure

Separate:

``` text
controllers
routes
services
database
simulation
socket
utils
types
```

Services:

``` text
droneService
vehicleService
chargingService
emergencyService
sosService
incidentService
alertService
simulationService
```

Business logic should not be placed directly inside React components.

------------------------------------------------------------------------

# 29. REST API

Implement:

``` text
GET /api/health

GET /api/drones
GET /api/drones/:id
GET /api/drones/:id/telemetry

GET /api/zones

GET /api/routes
GET /api/routes/:id

GET /api/charging-stations

GET /api/locations
GET /api/locations/:id

GET /api/vehicles
GET /api/vehicles/:id

GET /api/alerts
GET /api/incidents

POST /api/simulation/start
POST /api/simulation/pause
POST /api/simulation/reset

POST /api/emergency/ambulance
POST /api/emergency/sos

POST /api/vehicles/:id/start
POST /api/vehicles/:id/stop

POST /api/simulation/suspicious-vehicle
```

Validate request bodies and return appropriate HTTP status codes.

------------------------------------------------------------------------

# 30. Performance

The highway corridor is large.

Use:

-   object reuse
-   GLB lazy loading
-   efficient animation
-   requestAnimationFrame
-   instancing where appropriate
-   throttled telemetry
-   WebSocket updates
-   spatial filtering
-   efficient React state updates

Avoid creating unnecessary Three.js objects every frame.

Dispose of unused Three.js resources correctly.

Avoid unnecessary React re-renders caused by high-frequency telemetry.

------------------------------------------------------------------------

# 31. Security

Use environment variables.

Do not hard-code:

-   database passwords
-   API keys
-   map provider keys
-   secrets

Create:

``` text
.env.example
```

Use server-side validation for API requests.

Never expose database credentials to the frontend.

------------------------------------------------------------------------

# 32. Demo Mode

Create an automated demonstration mode.

Sequence:

1.  Show full Krishnagiri → Hosur highway.
2.  Show 10 drones patrolling.
3.  Show charging stations.
4.  Zoom to Shoolagiri.
5.  Trigger ambulance.
6.  Show drone moving approximately 500m ahead.
7.  Activate speaker.
8.  Resolve ambulance.
9.  Trigger SOS.
10. Show drone following person.
11. Resolve SOS.
12. Create suspicious vehicle.
13. Accelerate simulation.
14. Trigger 40-minute warning.
15. Accelerate another 40 minutes.
16. Trigger simulated police dispatch.
17. Return drone to patrol.
18. Return to overview.

Allow the operator to:

-   pause
-   skip
-   reset
-   manually control the simulation

------------------------------------------------------------------------

# 33. Safety / Demonstration Rules

This is a simulation and visualization platform.

Never:

-   make actual emergency calls
-   connect to real drone hardware
-   claim simulated camera data is real
-   represent simulated police dispatch as a real dispatch

Clearly label:

``` text
SIMULATION
DEMO MODE
SIMULATED CAMERA
SIMULATED POLICE DISPATCH
```

------------------------------------------------------------------------

# 34. Recommended Project Structure

``` text
aeroguard-3d/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── map/
│   │   ├── drones/
│   │   ├── vehicles/
│   │   ├── emergency/
│   │   ├── simulation/
│   │   ├── camera-wall/
│   │   ├── dashboard/
│   │   ├── services/
│   │   └── types/
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── simulation/
│   │   ├── socket/
│   │   ├── database/
│   │   ├── types/
│   │   └── server.ts
│   └── package.json
│
├── database/
│   ├── migrations/
│   ├── seed/
│   └── schema.sql
│
├── map-data/
│   ├── roads/
│   ├── routes/
│   ├── locations/
│   └── terrain/
│
├── assets/
│   ├── drones/
│   ├── vehicles/
│   ├── buildings/
│   └── environment/
│
└── README.md
```

------------------------------------------------------------------------

# 35. Development Phases

Build the project incrementally.

Do not implement everything in one request.

## Phase 0 --- Machine Preparation

Install/verify:

-   Node.js LTS
-   npm
-   Git
-   VS Code
-   MySQL 8
-   MySQL Workbench

Verify:

``` bash
node -v
npm -v
git --version
```

Verify MySQL:

``` sql
SELECT VERSION();
```

------------------------------------------------------------------------

## Phase 1 --- Project Foundation

Create:

-   frontend
-   backend
-   database
-   map-data
-   assets

Configure:

-   React
-   TypeScript
-   Vite
-   Tailwind
-   Express
-   Socket.IO
-   MySQL connection
-   environment variables

Create:

``` text
GET /api/health
```

Create README with installation instructions.

Do not implement drone intelligence yet.

------------------------------------------------------------------------

## Phase 2 --- MySQL Database

Create:

``` text
aeroguard
```

Create all required tables.

Seed:

-   10 drones
-   5 charging stations
-   sample vehicles
-   sample locations
-   sample zones

Create repository/database service layer.

Verify database connection and API endpoints.

------------------------------------------------------------------------

## Phase 3 --- Geographic Map

Create MapLibre map centered on the Krishnagiri → Hosur corridor.

Implement:

-   zoom
-   pan
-   rotate
-   pitch
-   bearing
-   flyTo
-   map selection

Prepare import structure for OpenStreetMap-derived GeoJSON.

Add OSM attribution.

Do not implement drone intelligence.

------------------------------------------------------------------------

## Phase 4 --- 3D Terrain and Three.js

Add terrain/elevation.

Create the Three.js integration.

Create one simple test 3D object.

Ensure the object remains geographically aligned when:

-   zooming
-   rotating
-   pitching
-   moving the map camera

------------------------------------------------------------------------

## Phase 5 --- First Drone

Create DR-01.

Load a GLB/GLTF model.

If no model is available, create a temporary Three.js drone placeholder.

Place it on the actual route.

Make it follow the route.

------------------------------------------------------------------------

## Phase 6 --- 10 Drones and Zones

Create DR-01 through DR-10.

Create patrol zones.

Assign routes.

Make drones follow their own routes.

Prevent normal cross-zone movement.

Add drone selection/detail panel.

------------------------------------------------------------------------

## Phase 7 --- Charging

Create 5 charging stations.

Implement:

-   battery monitoring
-   low battery detection
-   nearest charging station
-   station capacity
-   charging
-   battery increase
-   camera OFF while charging
-   return to patrol

------------------------------------------------------------------------

## Phase 8 --- Vehicle Simulation

Create:

-   cars
-   trucks
-   bikes
-   buses
-   ambulances

Make vehicles follow highway routes.

Add:

-   start
-   stop
-   reset

------------------------------------------------------------------------

## Phase 9 --- Socket.IO

Implement real-time communication.

Backend owns simulation state.

Frontend receives telemetry.

Ensure smooth Three.js movement without unnecessary React re-renders.

------------------------------------------------------------------------

## Phase 10 --- Ambulance Emergency

Implement the complete 500m drone escort workflow.

Test:

-   ambulance trigger
-   drone assignment
-   500m-ahead calculation
-   speaker
-   traffic warning
-   incident resolution
-   drone return

------------------------------------------------------------------------

## Phase 11 --- SOS

Implement:

-   SOS trigger
-   drone assignment
-   person
-   destination
-   tracking
-   distance
-   ETA
-   resolution
-   drone return

------------------------------------------------------------------------

## Phase 12 --- Suspicious Vehicle

Implement:

-   stopped vehicle
-   stationary timer
-   40-minute warning
-   drone monitoring
-   speaker warning
-   another 40 minutes
-   critical incident
-   simulated police dispatch

Test with 60x simulation speed.

------------------------------------------------------------------------

## Phase 13 --- Camera Wall

Implement all 10 drone cameras.

Charging drone:

``` text
CAMERA UNAVAILABLE
```

Clicking camera focuses its drone on the map.

------------------------------------------------------------------------

## Phase 14 --- Professional Command Center UI

Refine:

-   layout
-   typography
-   colors
-   glass panels
-   map styling
-   alerts
-   system health
-   drone statistics
-   station statistics
-   vehicle statistics
-   incident timeline

Keep the map dominant.

------------------------------------------------------------------------

## Phase 15 --- Demo Mode and Final Testing

Implement complete automated demo.

Then perform technical review.

Check:

-   frontend architecture
-   backend architecture
-   MySQL schema
-   spatial queries
-   Socket.IO
-   Three.js performance
-   MapLibre integration
-   drone movement
-   vehicle simulation
-   charging
-   ambulance logic
-   SOS logic
-   suspicious vehicle logic
-   camera wall
-   simulation time
-   error handling
-   loading states
-   empty states
-   API validation
-   security
-   environment variables
-   memory leaks
-   Three.js disposal
-   WebSocket cleanup
-   React rendering performance

Create Playwright tests for:

1.  application loads
2.  map loads
3.  drone selection
4.  vehicle selection
5.  charging station
6.  ambulance scenario
7.  SOS scenario
8.  suspicious vehicle scenario
9.  camera wall
10. simulation controls

Do not rewrite working code unnecessarily.

------------------------------------------------------------------------

# 36. How to Work With Claude Code

Attach this master specification.

Do NOT ask Claude Code to build the entire system at once.

Start with:

``` text
Read the attached AEROGUARD 3D master specification completely.

We are starting Phase 1 only.

Do not implement later phases.

Implement only the project foundation described in Phase 1.

After implementation:

1. run the application
2. verify frontend
3. verify backend
4. verify /api/health
5. verify there are no TypeScript/build errors
6. explain what was created
7. explain how to run it

Do not proceed to Phase 2.
```

After Phase 1 works, provide the Phase 2 prompt.

Continue one phase at a time.

------------------------------------------------------------------------

# 37. Phase-by-Phase Claude Code Prompts

## Phase 1 Prompt

``` text
Read the attached AEROGUARD 3D master specification completely.

We are starting Phase 1 only.

Do not implement later phases.

Create the complete project foundation.

Create:

frontend
backend
database
map-data
assets

Frontend:

React
TypeScript
Vite
Tailwind CSS
MapLibre GL JS
Three.js
Zustand
Turf.js
Socket.IO client

Backend:

Node.js
Express
TypeScript
Socket.IO

Database:

MySQL 8

Configure TypeScript.

Configure environment variables.

Create .env.example.

Create basic frontend/backend health-check functionality.

Create:

GET /api/health

The frontend must be able to verify backend connectivity.

Create README.md with:

installation
environment variables
MySQL setup
frontend setup
backend setup
development commands

Do not implement drones, vehicles, emergencies, SOS, suspicious vehicle monitoring or camera wall.

Run the application and fix any Phase 1 errors.

Do not proceed to Phase 2.
```

## Phase 2 Prompt

``` text
Read the AEROGUARD 3D master specification.

Implement Phase 2 only.

Use MySQL 8.

Create database:

aeroguard

Create migrations/schema for:

drones
drone_zones
drone_routes
drone_telemetry
charging_stations
road_segments
locations
vehicles
vehicle_events
emergency_events
sos_events
alerts
incidents
simulation_state

Use POINT, LINESTRING and POLYGON where appropriate.

Use SRID 4326 where appropriate.

Use InnoDB.

Add suitable indexes/spatial indexes.

Create seed data for:

10 drones
5 charging stations
sample vehicles
sample locations
sample zones

Do not create fake random geography. Use clearly documented placeholders only where actual geographic data has not yet been imported.

Create database/repository service layer.

Create:

GET /api/drones
GET /api/charging-stations
GET /api/locations
GET /api/vehicles

Verify database connection and API responses.

Do not implement later phases.

Do not proceed to Phase 3.
```

## Phase 3 Prompt

``` text
Implement Phase 3 only.

Focus on the geographic map.

Create a MapLibre GL JS map centered on the real Krishnagiri → Hosur corridor.

Support:

zoom
pan
rotate
pitch
bearing
flyTo
location selection

Use a MapLibre-compatible map style.

Prepare map-data folders for:

roads
routes
locations
terrain

Prepare the application for OpenStreetMap-derived GeoJSON.

Add correct OpenStreetMap attribution.

Do not implement drone intelligence, emergency workflows or vehicle simulation.

Verify that the map loads correctly.
```

## Phase 4 Prompt

``` text
Implement Phase 4 only.

Add 3D terrain/elevation where supported.

Integrate Three.js with MapLibre.

Create a Three.js test object.

Position the object from geographic longitude/latitude.

Ensure the object remains aligned when:

zooming
rotating
pitching
moving the map camera.

Do not implement the complete drone system yet.

Verify MapLibre and Three.js synchronization.
```

## Phase 5 Prompt

``` text
Implement Phase 5 only.

Create the first simulated drone:

DR-01

Use Three.js.

Load a GLB/GLTF drone model.

If no model exists, create a clean temporary drone placeholder.

Place DR-01 on the actual highway route.

Make DR-01 follow route geometry.

Create:

DroneModel
DroneService
TypeScript drone interfaces/types

Drone state:

battery
altitude
speed
heading
status
camera
speaker
GPS

Do not implement ambulance, SOS or suspicious vehicle behavior yet.
```

## Phase 6 Prompt

``` text
Implement Phase 6 only.

Expand DR-01 into 10 drones:

DR-01 through DR-10.

Create geographic patrol zones.

Assign every drone to a zone and route.

Drones must follow their assigned routes.

Drones should not randomly enter other drone zones.

Display:

drone
route
zone
status

Clicking a drone opens a detail panel.

Do not implement emergency workflows yet.
```

## Phase 7 Prompt

``` text
Implement Phase 7 only.

Create approximately 5 charging stations.

Support station capacity and multiple drones charging.

Implement:

battery monitoring
low battery detection
nearest station selection
station capacity
route to station
charging
battery increase
camera OFF during charging
return to patrol

Charging stations must be visible in the 3D map.

A charging drone must not show as camera LIVE.
```

## Phase 8 Prompt

``` text
Implement Phase 8 only.

Create simulated highway traffic:

cars
trucks
bikes
buses

Vehicles must follow route geometry.

Create:

start
stop
reset

Clicking a vehicle displays:

ID
type
speed
location
route
status
stationary duration

Keep backend as the authoritative simulation source.

Do not implement emergency workflows yet.
```

## Phase 9 Prompt

``` text
Implement Phase 9 only.

Add Socket.IO real-time communication.

Backend owns authoritative simulation state.

Implement:

drone:update
drone:telemetry
drone:status
vehicle:update
charging:update
simulation:state

Do not poll aggressively for telemetry.

Optimize Three.js updates and avoid unnecessary React renders.

Verify that multiple drones and vehicles move smoothly in real time.
```

## Phase 10 Prompt

``` text
Implement Phase 10 only.

Create ambulance emergency simulation.

When triggered:

1. create ambulance event
2. determine location
3. find responsible/nearest available drone
4. calculate approximately 500m ahead along the route
5. move drone there
6. set status ESCORTING
7. activate speaker
8. display emergency route
9. display warning
10. resolve event
11. return drone to patrol

Use simulated speaker text only.

Do not make real emergency calls.
```

## Phase 11 Prompt

``` text
Implement Phase 11 only.

Create SOS simulation.

When triggered:

1. create person
2. assign available drone
3. set SOS_TRACKING
4. follow person
5. display person
6. display drone
7. display tracking line
8. display destination
9. display distance
10. display ETA
11. resolve at destination
12. return drone to patrol

Do not break normal patrol-zone logic unnecessarily.
```

## Phase 12 Prompt

``` text
Implement Phase 12 only.

Create suspicious vehicle monitoring.

When vehicle stops:

start stationary timer.

After 40 simulated minutes:

create warning
assign drone
activate speaker
display warning

After another 40 simulated minutes:

create critical alert
create simulated police dispatch

Do not call a real police number.

Support:

1x
5x
10x
60x

The 40-minute timer must use simulation time.
```

## Phase 13 Prompt

``` text
Implement Phase 13 only.

Create Camera Wall.

Display all 10 drone cameras.

Each camera:

Drone ID
LIVE/UNAVAILABLE
Battery
Location
Status
Simulated feed

Charging drones must show:

CHARGING
CAMERA UNAVAILABLE

Clicking a camera focuses the corresponding drone on the 3D map.

Clearly label the feed as simulated.
```

## Phase 14 Prompt

``` text
Implement Phase 14 only.

Focus on professional command-center UI/UX.

The target audience is a District Collector/government decision-maker.

Do not create a gaming UI.

Create:

dark command-center map
glass/translucent panels
large 3D map
system status
drone statistics
charging status
vehicle statistics
alerts
incidents
selected-object detail

Use the map as the dominant element.

Add subtle transitions and professional information hierarchy.

Avoid excessive neon and unnecessary animations.
```

## Phase 15 Prompt

``` text
Implement Phase 15 only.

Create Demo Mode.

Automate:

1. highway overview
2. 10 drones
3. charging stations
4. Shoolagiri zoom
5. ambulance emergency
6. drone moves 500m ahead
7. speaker warning
8. ambulance resolution
9. SOS
10. drone follows person
11. SOS resolution
12. suspicious vehicle
13. accelerated time
14. 40-minute warning
15. another 40 minutes
16. simulated police dispatch
17. drone returns
18. overview

Allow:

pause
skip
reset
manual control

Clearly display:

DEMO MODE
SIMULATION

Do not make real emergency calls.
```

------------------------------------------------------------------------

# 38. Final Review Prompt

``` text
Perform a complete technical review of the AEROGUARD 3D application.

Do not unnecessarily rewrite working code.

Review and fix actual issues in:

Frontend architecture
Backend architecture
MySQL schema
Spatial queries
MapLibre
Three.js
Socket.IO
Drone movement
Drone zones
Charging
Vehicle simulation
Ambulance workflow
SOS workflow
Suspicious vehicle workflow
Camera wall
Simulation clock
Alerts
Error handling
Loading states
API validation
Security
Environment variables
Performance
Memory leaks
Three.js resource disposal
WebSocket cleanup
React rendering

Run the project.

Fix build/runtime errors.

Then create Playwright tests for:

application loading
map loading
drone selection
vehicle selection
charging station
ambulance scenario
SOS scenario
suspicious vehicle scenario
camera wall
simulation controls

Do not add unrelated features.
```

------------------------------------------------------------------------

# 39. Important Implementation Principle

The project should evolve like this:

``` text
REAL GEOGRAPHIC MAP
        ↓
3D TERRAIN
        ↓
3D DRONE
        ↓
10 DRONES
        ↓
PATROL ZONES
        ↓
CHARGING
        ↓
TRAFFIC
        ↓
REAL-TIME TELEMETRY
        ↓
AMBULANCE RESPONSE
        ↓
SOS RESPONSE
        ↓
SUSPICIOUS VEHICLE
        ↓
CAMERA WALL
        ↓
COMMAND CENTER
        ↓
DEMO MODE
        ↓
PLAYWRIGHT TESTING
```

The first impressive milestone is:

**A real Krishnagiri → Hosur 3D highway digital twin with 10 animated
drones, 5 charging stations and clickable geographic locations.**

Once that works, the emergency-response features can be layered onto the
same architecture.
