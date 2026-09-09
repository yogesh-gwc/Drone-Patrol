-- Seed 007 | road_segments
--
-- SIMULATION / DEVELOPMENT DATA.
--
-- NH-44 is the real highway between Krishnagiri and Hosur, and the road_name
-- reflects that. The GEOMETRY below is NOT. Each row is a coarse three-point
-- placeholder line across one patrol zone, identical to the placeholder patrol
-- routes, so vehicles and road-selection code have something to reference
-- before Phase 3.
--
-- No attempt has been made to represent real carriageways, junctions, lanes or
-- alignment. data_source = 'SIMULATED' marks every row, and osm_id is NULL
-- until a genuine OpenStreetMap import populates it.
--
-- speed_limit_kmh reflects the ordinary Indian national-highway limit rather
-- than a surveyed value for this stretch.
--
-- Geometry convention: WKT longitude-first, parsed with 'axis-order=long-lat'.

INSERT INTO road_segments
  (id, road_name, road_type, geometry, speed_limit_kmh, zone_id, status, data_source)
VALUES
  (1, 'NH-44 (placeholder segment 01)', 'NATIONAL_HIGHWAY',
   ST_GeomFromText('LINESTRING(78.210 12.520, 78.191 12.531, 78.172 12.542)', 4326, 'axis-order=long-lat'),
   100, 1, 'ACTIVE', 'SIMULATED'),
  (2, 'NH-44 (placeholder segment 02)', 'NATIONAL_HIGHWAY',
   ST_GeomFromText('LINESTRING(78.172 12.542, 78.153 12.553, 78.134 12.564)', 4326, 'axis-order=long-lat'),
   100, 2, 'ACTIVE', 'SIMULATED'),
  (3, 'NH-44 (placeholder segment 03)', 'NATIONAL_HIGHWAY',
   ST_GeomFromText('LINESTRING(78.134 12.564, 78.115 12.575, 78.096 12.586)', 4326, 'axis-order=long-lat'),
   100, 3, 'ACTIVE', 'SIMULATED'),
  (4, 'NH-44 (placeholder segment 04)', 'NATIONAL_HIGHWAY',
   ST_GeomFromText('LINESTRING(78.096 12.586, 78.077 12.597, 78.058 12.608)', 4326, 'axis-order=long-lat'),
   100, 4, 'ACTIVE', 'SIMULATED'),
  (5, 'NH-44 (placeholder segment 05)', 'NATIONAL_HIGHWAY',
   ST_GeomFromText('LINESTRING(78.058 12.608, 78.039 12.619, 78.020 12.630)', 4326, 'axis-order=long-lat'),
   100, 5, 'ACTIVE', 'SIMULATED'),
  (6, 'NH-44 (placeholder segment 06)', 'NATIONAL_HIGHWAY',
   ST_GeomFromText('LINESTRING(78.020 12.630, 78.001 12.641, 77.982 12.652)', 4326, 'axis-order=long-lat'),
   100, 6, 'ACTIVE', 'SIMULATED'),
  (7, 'NH-44 (placeholder segment 07)', 'NATIONAL_HIGHWAY',
   ST_GeomFromText('LINESTRING(77.982 12.652, 77.963 12.663, 77.944 12.674)', 4326, 'axis-order=long-lat'),
   100, 7, 'ACTIVE', 'SIMULATED'),
  (8, 'NH-44 (placeholder segment 08)', 'NATIONAL_HIGHWAY',
   ST_GeomFromText('LINESTRING(77.944 12.674, 77.925 12.685, 77.906 12.696)', 4326, 'axis-order=long-lat'),
   100, 8, 'ACTIVE', 'SIMULATED'),
  (9, 'NH-44 (placeholder segment 09)', 'NATIONAL_HIGHWAY',
   ST_GeomFromText('LINESTRING(77.906 12.696, 77.887 12.707, 77.868 12.718)', 4326, 'axis-order=long-lat'),
   100, 9, 'ACTIVE', 'SIMULATED'),
  (10, 'NH-44 (placeholder segment 10)', 'NATIONAL_HIGHWAY',
   ST_GeomFromText('LINESTRING(77.868 12.718, 77.849 12.729, 77.830 12.740)', 4326, 'axis-order=long-lat'),
   100, 10, 'ACTIVE', 'SIMULATED');

-- Distance in metres, computed by MySQL on the geographic SRS.
UPDATE road_segments
SET distance_meters = ROUND(ST_Length(geometry), 2);
