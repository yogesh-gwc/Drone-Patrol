-- Seed 005 | drone_zones
--
-- SIMULATION / DEVELOPMENT DATA.
--
-- Ten patrol zones, one per drone, tiling the corridor between the approximate
-- Krishnagiri and Hosur coordinates. Each zone is a plain rectangle covering a
-- longitude slice of the corridor with a latitude margin of 0.03 degrees.
--
-- These are NOT operational boundaries. Phase 3 replaces them with zones
-- derived from real route geometry, exactly as the specification requires.
--
-- Ring order is counter-clockwise so the polygon interior lies to the left,
-- which is what MySQL expects for a geographic SRS.
--
-- assigned_drone_id is filled in by seed 006, once the drones exist.
--
-- Geometry convention: WKT longitude-first, parsed with 'axis-order=long-lat'.

INSERT INTO drone_zones
  (id, zone_code, name, geometry, route_id, start_location, end_location,
   charging_station_id, status, data_source)
VALUES
  (1, 'Z-01', 'Patrol Zone 01 - Krishnagiri sector',
   ST_GeomFromText('POLYGON((78.172 12.490, 78.210 12.490, 78.210 12.572, 78.172 12.572, 78.172 12.490))', 4326, 'axis-order=long-lat'),
   1,
   ST_GeomFromText('POINT(78.210 12.520)', 4326, 'axis-order=long-lat'),
   ST_GeomFromText('POINT(78.172 12.542)', 4326, 'axis-order=long-lat'),
   1, 'ACTIVE', 'SIMULATED'),
  (2, 'Z-02', 'Patrol Zone 02 - Krishnagiri sector',
   ST_GeomFromText('POLYGON((78.134 12.512, 78.172 12.512, 78.172 12.594, 78.134 12.594, 78.134 12.512))', 4326, 'axis-order=long-lat'),
   2,
   ST_GeomFromText('POINT(78.172 12.542)', 4326, 'axis-order=long-lat'),
   ST_GeomFromText('POINT(78.134 12.564)', 4326, 'axis-order=long-lat'),
   1, 'ACTIVE', 'SIMULATED'),
  (3, 'Z-03', 'Patrol Zone 03 - Kundarapalli sector',
   ST_GeomFromText('POLYGON((78.096 12.534, 78.134 12.534, 78.134 12.616, 78.096 12.616, 78.096 12.534))', 4326, 'axis-order=long-lat'),
   3,
   ST_GeomFromText('POINT(78.134 12.564)', 4326, 'axis-order=long-lat'),
   ST_GeomFromText('POINT(78.096 12.586)', 4326, 'axis-order=long-lat'),
   2, 'ACTIVE', 'SIMULATED'),
  (4, 'Z-04', 'Patrol Zone 04 - Kundarapalli sector',
   ST_GeomFromText('POLYGON((78.058 12.556, 78.096 12.556, 78.096 12.638, 78.058 12.638, 78.058 12.556))', 4326, 'axis-order=long-lat'),
   4,
   ST_GeomFromText('POINT(78.096 12.586)', 4326, 'axis-order=long-lat'),
   ST_GeomFromText('POINT(78.058 12.608)', 4326, 'axis-order=long-lat'),
   2, 'ACTIVE', 'SIMULATED'),
  (5, 'Z-05', 'Patrol Zone 05 - Kurubarapalli sector',
   ST_GeomFromText('POLYGON((78.020 12.578, 78.058 12.578, 78.058 12.660, 78.020 12.660, 78.020 12.578))', 4326, 'axis-order=long-lat'),
   5,
   ST_GeomFromText('POINT(78.058 12.608)', 4326, 'axis-order=long-lat'),
   ST_GeomFromText('POINT(78.020 12.630)', 4326, 'axis-order=long-lat'),
   3, 'ACTIVE', 'SIMULATED'),
  (6, 'Z-06', 'Patrol Zone 06 - Kurubarapalli sector',
   ST_GeomFromText('POLYGON((77.982 12.600, 78.020 12.600, 78.020 12.682, 77.982 12.682, 77.982 12.600))', 4326, 'axis-order=long-lat'),
   6,
   ST_GeomFromText('POINT(78.020 12.630)', 4326, 'axis-order=long-lat'),
   ST_GeomFromText('POINT(77.982 12.652)', 4326, 'axis-order=long-lat'),
   3, 'ACTIVE', 'SIMULATED'),
  (7, 'Z-07', 'Patrol Zone 07 - Shoolagiri sector',
   ST_GeomFromText('POLYGON((77.944 12.622, 77.982 12.622, 77.982 12.704, 77.944 12.704, 77.944 12.622))', 4326, 'axis-order=long-lat'),
   7,
   ST_GeomFromText('POINT(77.982 12.652)', 4326, 'axis-order=long-lat'),
   ST_GeomFromText('POINT(77.944 12.674)', 4326, 'axis-order=long-lat'),
   4, 'ACTIVE', 'SIMULATED'),
  (8, 'Z-08', 'Patrol Zone 08 - Shoolagiri sector',
   ST_GeomFromText('POLYGON((77.906 12.644, 77.944 12.644, 77.944 12.726, 77.906 12.726, 77.906 12.644))', 4326, 'axis-order=long-lat'),
   8,
   ST_GeomFromText('POINT(77.944 12.674)', 4326, 'axis-order=long-lat'),
   ST_GeomFromText('POINT(77.906 12.696)', 4326, 'axis-order=long-lat'),
   4, 'ACTIVE', 'SIMULATED'),
  (9, 'Z-09', 'Patrol Zone 09 - Hosur sector',
   ST_GeomFromText('POLYGON((77.868 12.666, 77.906 12.666, 77.906 12.748, 77.868 12.748, 77.868 12.666))', 4326, 'axis-order=long-lat'),
   9,
   ST_GeomFromText('POINT(77.906 12.696)', 4326, 'axis-order=long-lat'),
   ST_GeomFromText('POINT(77.868 12.718)', 4326, 'axis-order=long-lat'),
   5, 'ACTIVE', 'SIMULATED'),
  (10, 'Z-10', 'Patrol Zone 10 - Hosur sector',
   ST_GeomFromText('POLYGON((77.830 12.688, 77.868 12.688, 77.868 12.770, 77.830 12.770, 77.830 12.688))', 4326, 'axis-order=long-lat'),
   10,
   ST_GeomFromText('POINT(77.868 12.718)', 4326, 'axis-order=long-lat'),
   ST_GeomFromText('POINT(77.830 12.740)', 4326, 'axis-order=long-lat'),
   5, 'ACTIVE', 'SIMULATED');

-- Close the zone/route relationship now that both sides exist.
UPDATE drone_routes SET zone_id = id WHERE id BETWEEN 1 AND 10;
