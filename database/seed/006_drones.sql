-- Seed 006 | drones
--
-- SIMULATION / DEVELOPMENT DATA.
--
-- The ten fleet drones, DR-01 to DR-10, one per patrol zone. Each drone sits at
-- the midpoint of its zone's placeholder route. Battery levels and statuses are
-- a deliberately varied but static snapshot so the UI has every state to render
-- before the simulation engine exists (Phase 9). No telemetry has been recorded,
-- so last_telemetry_at is NULL for every drone.
--
-- DR-03 is CHARGING and DR-09 is OFFLINE, which is why charging_stations CS-02
-- shows one occupied slot in seed 002.
--
-- Per the specification, a charging drone reports its camera as OFFLINE; the
-- camera wall renders that as CAMERA UNAVAILABLE.
--
-- Geometry convention: WKT longitude-first, parsed with 'axis-order=long-lat'.

INSERT INTO drones
  (id, drone_code, name, status, battery_percentage, location, altitude_m,
   speed_kmh, heading_deg, camera_status, speaker_status, gps_status,
   current_zone_id, current_route_id, charging_station_id, last_telemetry_at)
VALUES
  (1, 'DR-01', 'Aeroguard DR-01', 'PATROLLING', 87.00,
   ST_GeomFromText('POINT(78.191 12.531)', 4326, 'axis-order=long-lat'),
   120.00, 0.00, 305.00, 'LIVE', 'IDLE', 'LOCKED', 1, 1, NULL, NULL),
  (2, 'DR-02', 'Aeroguard DR-02', 'PATROLLING', 76.50,
   ST_GeomFromText('POINT(78.153 12.553)', 4326, 'axis-order=long-lat'),
   120.00, 0.00, 305.00, 'LIVE', 'IDLE', 'LOCKED', 2, 2, NULL, NULL),
  (3, 'DR-03', 'Aeroguard DR-03', 'CHARGING', 34.00,
   ST_GeomFromText('POINT(78.100 12.586)', 4326, 'axis-order=long-lat'),
   0.00, 0.00, 0.00, 'OFFLINE', 'OFFLINE', 'LOCKED', 3, 3, 2, NULL),
  (4, 'DR-04', 'Aeroguard DR-04', 'PATROLLING', 92.00,
   ST_GeomFromText('POINT(78.077 12.597)', 4326, 'axis-order=long-lat'),
   120.00, 0.00, 305.00, 'LIVE', 'IDLE', 'LOCKED', 4, 4, NULL, NULL),
  (5, 'DR-05', 'Aeroguard DR-05', 'PATROLLING', 68.00,
   ST_GeomFromText('POINT(78.039 12.619)', 4326, 'axis-order=long-lat'),
   120.00, 0.00, 305.00, 'LIVE', 'IDLE', 'LOCKED', 5, 5, NULL, NULL),
  (6, 'DR-06', 'Aeroguard DR-06', 'RETURNING', 21.00,
   ST_GeomFromText('POINT(78.001 12.641)', 4326, 'axis-order=long-lat'),
   100.00, 0.00, 125.00, 'LIVE', 'IDLE', 'LOCKED', 6, 6, 3, NULL),
  (7, 'DR-07', 'Aeroguard DR-07', 'PATROLLING', 81.00,
   ST_GeomFromText('POINT(77.963 12.663)', 4326, 'axis-order=long-lat'),
   120.00, 0.00, 305.00, 'LIVE', 'IDLE', 'LOCKED', 7, 7, NULL, NULL),
  (8, 'DR-08', 'Aeroguard DR-08', 'PATROLLING', 55.00,
   ST_GeomFromText('POINT(77.925 12.685)', 4326, 'axis-order=long-lat'),
   120.00, 0.00, 305.00, 'LIVE', 'IDLE', 'LOCKED', 8, 8, NULL, NULL),
  (9, 'DR-09', 'Aeroguard DR-09', 'OFFLINE', 0.00,
   ST_GeomFromText('POINT(77.887 12.707)', 4326, 'axis-order=long-lat'),
   0.00, 0.00, 0.00, 'OFFLINE', 'OFFLINE', 'LOST', 9, 9, NULL, NULL),
  (10, 'DR-10', 'Aeroguard DR-10', 'PATROLLING', 73.00,
   ST_GeomFromText('POINT(77.849 12.729)', 4326, 'axis-order=long-lat'),
   120.00, 0.00, 305.00, 'LIVE', 'IDLE', 'LOCKED', 10, 10, NULL, NULL);

-- Close the zone/drone relationship now that both sides exist.
UPDATE drone_zones SET assigned_drone_id = id WHERE id BETWEEN 1 AND 10;
