# AEROGUARD 3D — Complete Project Context & Handoff

## 1. Project

**AEROGUARD 3D** is a simulated 3D highway safety, surveillance, traffic-monitoring, and emergency-response digital twin for the **Krishnagiri → Hosur NH-44 corridor, Tamil Nadu, India**.

It is a **professional government / Collector demonstration prototype**, not a gaming or consumer navigation application.

Everything is simulated:
- drones
- vehicles
- traffic
- cameras
- ambulance
- SOS
- incidents
- speaker alerts
- police dispatch

There are no real drones, cameras, emergency calls, or police dispatch integrations.

## 2. Operational Corridor

The application focuses ONLY on:

```text
KRISHNAGIRI
    ↓
SHOOLAGIRI
    ↓
KURUBARAPALLI
    ↓
PERANDAPALLI
    ↓
HOSUR
```

Primary road: **NH-44**

### Critical correction

**Kundarapalli must NOT be used as an operational zone.**

Use **Perandapalli** instead.

Prominent operational locations:
- Krishnagiri
- Shoolagiri
- Kurubarapalli
- Perandapalli
- Hosur

Do not prominently display unrelated places such as Bengaluru, Kolar, Rayakottai, Denkanikottai, Attibele, etc.

Other roads, minor roads, unrelated labels, POIs, and administrative boundaries should be hidden or strongly suppressed.

The application must feel like a dedicated NH-44 safety system, not a general map.

## 3. Geographic Data

The NH-44 alignment is based on **real OpenStreetMap-derived geometry**, not a fabricated route.

The current corridor was extracted through Overpass using a query similar to:

```text
way["highway"~"^(motorway|trunk)$"]["ref"~"NH ?44"](12.42,77.75,12.82,78.32)
```

Current extraction:
- 43 chained OSM ways
- approximately 50.73 km
- simplified to approximately 142 points
- approximately 50.7 km corridor

Stored locally at:

```text
map-data/roads/nh44-corridor.geojson.json
```

The file records query/source/retrieval/licensing information.

Important:
- NH-44 alignment = real OSM-derived
- lane widths/cross-section = representative model
- old Phase 2 road rows were SIMULATED and should not be presented as real OSM geometry

## 4. Technology

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- MapLibre GL JS
- Three.js
- Zustand
- Turf.js where useful
- Socket.IO Client
- Playwright

### Backend
- Node.js
- Express.js
- TypeScript
- Socket.IO

## 5. Runtime Data Architecture

The prototype should **not require MySQL at runtime** because it is intended to be hosted.

Use:

```text
Frontend
   ↓
Node / Express
   ↓
Static JSON configuration
+
In-memory simulation state
   ↓
Socket.IO
   ↓
Frontend / 3D simulation
```

Suggested backend data:

```text
backend/data/
    drones.json
    droneZones.json
    droneRoutes.json
    chargingStations.json
    roadSegments.json
    locations.json
    vehicles.json
    emergencyEvents.json
    sosEvents.json
    alerts.json
    incidents.json
    simulation.json
```

JSON is configuration / initial data.

Runtime state stays in memory:
- drone position
- battery
- mission
- charging
- vehicle position
- ambulance
- SOS
- incidents
- alerts

Do not depend on writing runtime state back to JSON because many hosting platforms use ephemeral/read-only filesystems.

On restart, simulation state may reset. That is acceptable.

## 6. API Compatibility

Preserve existing API contracts where practical:

```text
GET /api/drones
GET /api/drones/:id
GET /api/zones
GET /api/routes
GET /api/charging-stations
GET /api/locations
GET /api/vehicles
```

The frontend should not need a major rewrite when switching from MySQL to JSON.

The application must start without MySQL running.

## 7. MapLibre + Three.js

MapLibre is the geographic foundation:
- map
- geographic camera
- terrain
- longitude/latitude
- zoom
- pan
- rotation
- pitch
- base map
- geographic interaction

Three.js handles:
- 3D NH-44
- drones
- vehicles
- ambulance
- charging stations
- SOS person
- future infrastructure

Three.js is integrated using MapLibre's `CustomLayerInterface` / shared WebGL context.

The Three.js projection uses MapLibre's `mainMatrix`.

Do NOT create an independent Three.js map.

All objects must stay geographically aligned.

## 8. 3D NH-44 Highway

The NH-44 corridor is a procedural Three.js 3D highway following the real OSM route.

Current concept:
- two carriageways
- 3 lanes each
- representative lane width ~3.65m
- shoulders
- median
- lane markings
- lightweight geometry

Existing route helpers:

```text
positionAtDistance()
positionAtFraction()
```

These allow objects to use route chainage, e.g.:

```text
route = NH44
distanceAlong = 12400
```

## 9. Road Visual Requirement

The highway previously looked like a raised bridge/platform.

It must look like a normal highway sitting on terrain.

Desired:

```text
        terrain
     ___/────────\___
        NH-44
     ___/────────\___
```

Not:

```text
       ═════════════
       raised deck
       ═════════════
```

Fix by:
- following terrain
- removing excessive vertical lift
- using only a small z offset for z-fighting
- reducing excessive road thickness
- keeping realistic cross-section
- making median look like a median
- keeping shoulders integrated with the road
- only modeling a bridge where actual geographic data indicates one

## 10. Map Theme

**LIGHT MODE is the default.**

Both:
- Application UI = LIGHT
- MapLibre basemap = LIGHT

Dark mode can remain an optional toggle.

UI:
- white/light panels
- dark readable text
- blue/indigo accents
- subtle borders/shadows
- professional government/enterprise appearance

Avoid:
- cyberpunk
- gaming UI
- excessive neon/glow
- futuristic styling

Map should also use a suitable light MapTiler/MapLibre style while retaining terrain, NH-44, required labels, Three.js layers, and attribution.

## 11. Map Controls

Existing:
- Overview
- 3D
- Close-up
- Locate

Locate:
- Krishnagiri
- Shoolagiri
- Kurubarapalli
- Perandapalli
- Hosur

Locations should use smooth camera fly-to behavior.

Camera remains focused on the corridor.

## 12. 3D-First Requirement

This is a true 3D digital-twin prototype.

Do not rely only on flat markers.

Operational entities should be 3D:
- drones
- cars
- trucks
- buses
- ambulance
- charging stations
- SOS person
- incident objects where useful

Use GLTF/GLB where available. Otherwise use lightweight procedural Three.js models.

Reuse geometry/materials.

## 13. Drone Fleet

10 drones:

```text
DR-01 ... DR-10
```

Each:
- ID
- status
- battery
- GPS
- altitude
- heading
- patrol route
- patrol zone
- camera status
- speaker status

Drones patrol NH-44.

Zones use:
- Krishnagiri
- Shoolagiri
- Kurubarapalli
- Perandapalli
- Hosur

Kundarapalli is NOT a zone.

Drones normally stay within assigned zones.

## 14. Drone 3D Model

A lightweight procedural quadcopter was created because no suitable local GLB existed.

Contains:
- body
- four arms
- spinning rotors
- camera/gimbal pod
- landing structure

Drones may be slightly enlarged for overview visibility.

They should remain clearly recognizable.

## 15. Drone Movement

Patrol is based on NH-44 chainage.

Example:

```text
distanceAlong = 25450
```

Then:

```text
positionAtDistance(distanceAlong)
```

Movement is:
- smooth
- frame-rate independent
- geographically aligned
- altitude-aware
- route-aware

## 16. Drone Detail / Selection

Clicking a drone must open its detail/operations panel.

Show:
- ID
- status
- battery
- GPS
- altitude
- heading
- route
- zone
- camera
- speaker
- mission
- speed

Example:

```text
DR-04
STATUS: ESCORTING
BATTERY: 78%
ALTITUDE: 80m
SPEED: 18m/s
ROUTE: NH-44
CAMERA: AVAILABLE
SPEAKER: ACTIVE
```

Verify actual click selection works.

## 17. Four Drone Camera Feeds

Clicking a particular drone opens four simulated onboard feeds:

```text
┌────────────────────┬────────────────────┐
│    FRONT CAMERA    │     REAR CAMERA    │
├────────────────────┼────────────────────┤
│     LEFT CAMERA    │    RIGHT CAMERA    │
└────────────────────┴────────────────────┘
```

Local assets:

```text
frontend/public/assets/drone-cameras/
    drone-front.mp4
    drone-rear.mp4
    drone-left.mp4
    drone-right.mp4
```

Reuse the same four videos for all drones. Do NOT create 40 videos.

Feeds:
- autoplay
- loop
- muted
- playsInline
- LIVE indicator
- direction label
- optional fullscreen
- graceful fallback

Only load selected drone feeds.

The video is simulated; the 3D map/telemetry remains the source of truth.

## 18. Camera Video Generation

Generate four separate videos, approximately 6–10 seconds each:

1. Front
2. Rear
3. Left
4. Right

Consistent environment:
- NH-44-style divided highway
- Tamil Nadu / South Indian environment
- daytime
- stable drone camera
- realistic traffic
- cars/buses/trucks
- no drone body
- no text
- no city names
- no logos
- no HUD
- no futuristic effects
- no cinematic camera shake
- seamless loop

## 19. Charging Stations

5 charging stations.

Requirements:
- 3D representation
- maximum 2 drones per station
- battery increases while charging
- occupancy visible
- charging drones leave patrol state

Example:

```text
CS-01
SLOTS: 1 / 2
DR-03 — CHARGING
DR-07 — AVAILABLE
```

Charging drone camera:

```text
CAMERA UNAVAILABLE
Drone charging
```

## 20. Traffic

Traffic exists only on NH-44.

Current target/current implementation:
- approximately 125 vehicles
- cars
- buses
- trucks
- emergency vehicles

Vehicles have:
- ID
- type
- status
- speed
- direction
- chainage

Vehicles:
- follow NH-44
- use lanes
- have different speeds
- can overtake
- can stop/start
- are clickable

Traffic should never be placed on unrelated roads.

## 21. 3D Vehicle Models

Use recognizable 3D models:
- cars: body/wheels/glazing
- buses: elongated body/glazing/wheels
- trucks: cab/trailer/wheels

Reuse models/geometry where possible.

## 22. Vehicle Controls

Demo controls:
- select vehicle
- start vehicle
- stop vehicle
- reset where useful

Stopped vehicles remain on NH-44.

## 23. Socket.IO

Realtime synchronization for:
- drone position/status/battery
- charging
- vehicle position/status
- traffic
- ambulance
- SOS
- suspicious vehicle
- alerts

Do not send 60fps network messages.

Use throttling and client-side interpolation.

## 24. Ambulance Workflow

Core scenario:

1. User starts ambulance emergency.
2. Randomly select valid starting chainage on NH-44.
3. Select destination farther along NH-44.
4. Spawn 3D ambulance.
5. Assign patrol drone.
6. Put drone approximately 500m ahead.
7. Start ambulance.
8. Drone escorts.
9. Drone speaker warns traffic.
10. Nearby vehicles respond/clear route.
11. Ambulance continues.
12. Ambulance reaches destination.
13. Emergency becomes COMPLETED.
14. Speaker stops.
15. Drone returns to patrol.

Do NOT randomly generate arbitrary latitude/longitude for ambulance start.

Use:

```text
random chainage
→ positionAtDistance()
→ valid NH-44 location
```

## 25. 500m Drone Escort

At assignment:

```text
ambulanceChainage + 500m
        ↓
drone target chainage
```

The drone should be positioned immediately about 500m ahead, not slowly approach from its previous patrol position.

Maintain approximately:

```text
480m–520m
```

during escort.

## 26. Ambulance Speaker Alert

When the selected/assigned drone is escorting the ambulance, its speaker becomes active.

Use browser:

```text
SpeechSynthesis API
```

Example:

> "Attention. Emergency vehicle approaching. Please clear the way."

Do not require external audio.

Controlled behavior:
- announcement when escort starts
- repeat only after a cooldown such as 10–15 seconds if needed
- stop after ambulance reaches destination
- stop if emergency is manually stopped

UI:

```text
SYSTEM SPEAKER ALERT

"Emergency vehicle approaching.
Please clear the way."

SPEAKER: ACTIVE
```

The alert should actually be heard through the user's device speaker.

## 27. Ambulance Traffic Response

Only nearby traffic reacts.

Vehicles may:
- slow
- adjust within lane
- create space
- allow ambulance through

Do not make all vehicles react simultaneously.

## 28. SOS Popup

Dedicated SOS button:

```text
[SOS]
```

Popup:

```text
AEROGUARD SOS

Latitude
[ 12.xxxxx ]

Longitude
[ 78.xxxxx ]

[ START SOS ]
```

User manually enters latitude and longitude.

Validate:
- required
- numeric
- valid latitude range
- valid longitude range
- within a reasonable AEROGUARD operational bounding region

Outside region:

```text
Location is outside the AEROGUARD operational area.
```

Do not start.

The SOS point can be near, but not necessarily exactly on, NH-44.

## 29. SOS Behavior

On START SOS:

1. Create simulated SOS event.
2. Place visible 3D person at supplied coordinates.
3. Select available patrol drone.
4. Drone leaves patrol.
5. Drone travels to supplied coordinates.
6. Drone reaches target.
7. Person can move along a simulated destination path.
8. Drone tracks person.
9. User can stop/resolve.
10. Drone returns to patrol.

No real emergency calls.

## 30. SOS 3D Visualization

Use:
- 3D person
- 3D drone
- optional subtle tracking line

Example:

```text
       🚁
                           ● PERSON
            SOS
```

## 31. SOS Panel

Show:

```text
SOS ACTIVE

SOS ID
STATUS
LATITUDE
LONGITUDE
ASSIGNED DRONE
DRONE DISTANCE
DRONE STATUS
TRACKING STATUS
```

Controls:

```text
[ STOP SOS ]
[ RETURN DRONE ]
```

## 32. Suspicious Vehicle

Scenario:

Vehicle stops on NH-44.

After 40 simulated minutes:

```text
SUSPICIOUS VEHICLE DETECTED
```

Patrol drone investigates.

Drone speaker warning activates.

After another 40 simulated minutes:

```text
80 MINUTES TOTAL
```

Then:

```text
POLICE DISPATCH SIMULATED
```

No real police calls/API.

## 33. Suspicious Vehicle Simulation Time

Do not make the user wait 40 real minutes.

Use accelerated simulation time, e.g.:

```text
1 real second = 1 simulated minute
```

or configurable multiplier.

Show:

```text
VEHICLE STOPPED
Elapsed: 42 min
Threshold: 40 min
STATUS: SUSPICIOUS
```

Controls:
- select vehicle
- start
- stop
- accelerate simulation
- reset incident

## 34. Suspicious Vehicle Investigation

At 40 minutes:
- identify available drone
- exclude charging/unavailable drones
- exclude drones handling higher-priority emergencies
- send drone to vehicle
- investigate
- activate speaker
- show alert

At 80 minutes:
- escalate
- show simulated police dispatch

Future optional assessment can consider:
- duration
- vehicle type
- nearby traffic
- drone observations
- location
- previous incidents

## 35. AI / Agentic Features — Explicit Decision

The project explored agentic features, but the user explicitly decided:

**Do NOT add an AI Command Center or Intelligent Drone Assignment feature to the application unless explicitly requested.**

Potential future agentic concepts, if requested later:
- Traffic Intelligence Agent
- Drone Fleet Agent
- Emergency Response Agent
- Incident Investigation Agent
- Highway Safety Agent
- Resource Optimization Agent
- Command Center Agent

If later implemented, they should operate on actual simulation state and use deterministic/tool-driven actions rather than allowing an LLM to arbitrarily mutate the system.

High-impact actions should remain human-controlled.

## 36. Camera Wall Decision

The original concept included a full camera wall for all drones.

Current preferred behavior:

**Click a specific drone → show that drone's four camera feeds.**

Do not load 40 simultaneous videos.

## 37. UI

Professional government/enterprise command-center design.

Light-first:
- light panels
- dark readable text
- blue/indigo operational accents
- green status
- amber warning
- red critical alert
- subtle borders/shadows
- clean typography

Avoid:
- gaming
- cyberpunk
- excessive neon
- excessive animation

Header:

```text
AEROGUARD 3D
KRISHNAGIRI → HOSUR CORRIDOR
```

Status:
- API ONLINE
- SOCKET CONNECTED
- SIMULATION

Theme:
- LIGHT / DARK
- LIGHT is default

## 38. Data Transparency

Clearly distinguish:

### Real / externally sourced
- OSM-derived NH-44 alignment
- geographic context
- terrain where supplied by map provider

### Simulated
- drones
- drone patrol
- vehicles
- traffic
- charging stations
- ambulance
- SOS
- suspicious vehicles
- incidents
- camera feeds
- speaker messages
- police dispatch

Do not claim simulated data is real.

## 39. Hosting

The target runtime:

```text
Frontend
   ↓
Node/Express backend
   ↓
Static JSON
+
In-memory simulation
```

No MySQL required.

Possible environment variables:

```text
VITE_MAPTILER_API_KEY
BACKEND_URL
SOCKET_IO_URL
```

Never hardcode secrets.

Keep OSM attribution.

## 40. Performance

Must run smoothly on a normal desktop browser.

Avoid:
- rebuilding meshes every frame
- excessive React updates
- 60fps network messages
- separate animation loop per object
- unnecessary dependencies
- excessive polygon counts
- duplicate geometry/materials
- loading all videos on startup
- 40 simultaneous video feeds

Prefer:
- reusable models
- shared geometry/materials
- interpolation
- throttled Socket.IO
- lazy video loading
- lightweight procedural models

## 41. Previously Fixed Issues

### MapLibre worker
Dynamic worker URL caused Vite dev/production loading issues. Fixed by pinning the worker URL and including the worker asset.

### Map height
MapLibre CSS positioning conflicted with Tailwind and caused a collapsed map. Fixed.

### Attribution
Duplicate attribution removed.

### Terrain listener
DEM events were scoped/coalesced to reduce excessive processing.

### Vehicle lane positioning
Vehicle offsets were corrected to match the 3D road cross-section.

### Traffic
Overtaking/car-following with clearance/cooldown was added.

### Map decluttering
Large numbers of map layers were hidden/reduced.

## 42. Previous Test Status

A previous implementation reported:
- 35/37 browser checks passing
- frontend build clean
- backend build clean
- 7/7 API endpoints returning 200
- no console/page errors

Two known issues at that point:
1. drone/vehicle click selection was not reliably opening panels
2. ambulance escort initially sampled ~344m because the drone was closing toward 500m rather than being immediately positioned there

These should be considered resolved only after the latest tests explicitly verify them.

## 43. Implementation Roadmap

Original roadmap:

```text
Phase 0  Environment check
Phase 1  Project foundation
Phase 2  MySQL database + initial data
Phase 3  Geographic map
Phase 4  3D terrain + MapLibre/Three.js
Phase 5  First drone
Phase 6  10 drones + zones
Phase 7  Charging
Phase 8  Traffic
Phase 9  Socket.IO realtime
Phase 10 Ambulance
Phase 11 SOS
Phase 12 Suspicious vehicle
Phase 13 Drone camera functionality
Phase 14 Professional command center UI
Phase 15 Demo mode / final testing
```

Because runtime architecture changed to JSON/in-memory and camera features became important, phases may be consolidated as development continues.

## 44. Final Demonstration Scenarios

### Normal Monitoring

```text
10 drones
+
125 vehicles
+
NH-44
+
charging stations
```

Drones patrol their assigned zones and traffic moves along NH-44.

### Ambulance

```text
Random NH-44 start
      ↓
Destination
      ↓
Drone assigned
      ↓
Drone 500m ahead
      ↓
Speaker warning
      ↓
Traffic clears
      ↓
Ambulance reaches destination
      ↓
Drone returns to patrol
```

Clicking the escort drone shows four camera feeds.

### SOS

```text
SOS
 ↓
Enter latitude/longitude
 ↓
3D person
 ↓
Drone dispatched
 ↓
Drone reaches target
 ↓
Track person
 ↓
Resolve
 ↓
Drone returns
```

### Suspicious Vehicle

```text
Stop vehicle
 ↓
40 simulated minutes
 ↓
Suspicious
 ↓
Drone investigates
 ↓
Speaker warning
 ↓
80 simulated minutes
 ↓
Police dispatch SIMULATED
```

## 45. Desired Final Product

AEROGUARD 3D should be a professional 3D digital twin where a drone fleet continuously monitors the **Krishnagiri–Hosur NH-44 corridor** and responds to simulated:
- ambulance emergencies
- SOS incidents
- traffic conditions
- suspicious/stopped vehicles

The strongest visual elements are:
- realistic OSM-derived NH-44
- 3D terrain
- 10 drones
- 3D traffic
- charging stations
- ambulance
- SOS target
- suspicious vehicles
- four drone camera feeds
- real browser speaker alert
- realtime movement
- professional light command-center UI

## 46. Development Rules

When continuing the project:

1. Inspect existing code before changing it.
2. Preserve working functionality.
3. Avoid unnecessary rewrites.
4. Do not reintroduce MySQL runtime dependency.
5. Use static JSON + in-memory state.
6. Keep NH-44 as the geographic focus.
7. Use Perandapalli, not Kundarapalli.
8. Keep Light UI + Light Map as default.
9. Use real OSM geometry for NH-44 alignment.
10. Never fabricate geographic data and label it real.
11. Use recognizable 3D models/procedural objects.
12. Reuse four camera videos across drones.
13. Keep emergency actions simulated.
14. No AI Command Center unless explicitly requested.
15. Maintain browser performance.
16. Test builds and browser flows after significant changes.
17. Prefer reliable prototype behavior over unnecessary enterprise complexity.
18. Keep high-impact actions human-controlled if automation is later introduced.

## 47. Project Definition

**AEROGUARD 3D is a professional 3D digital-twin prototype for drone-based monitoring, traffic management, and simulated emergency response along the Krishnagiri–Hosur NH-44 corridor.**
