-- Seed 003 | locations
--
-- SIMULATION / DEVELOPMENT DATA.
--
-- Two different kinds of row live here, and the distinction matters:
--
--   1. The five corridor settlements named in the specification are real
--      places. Their coordinates below are approximate, rounded to about
--      1 km, and are placeholders until Phase 3 imports OpenStreetMap data.
--
--   2. Every other row is a FABRICATED development placeholder. The named
--      facilities do not exist. They are here only so the UI has markers of
--      each type to render, and they are removed or replaced in Phase 3.
--
-- Charging stations are not repeated here; charging_stations holds their
-- authoritative geometry.
--
-- Geometry convention: WKT longitude-first, parsed with 'axis-order=long-lat'.

INSERT INTO locations (id, name, type, location, description, data_source)
VALUES
  -- Real corridor settlements, approximate coordinates -----------------------
  (1, 'Krishnagiri', 'CITY',
   ST_GeomFromText('POINT(78.210 12.520)', 4326, 'axis-order=long-lat'),
   'Corridor start. Approximate coordinate (~1 km), pending OpenStreetMap import in Phase 3.',
   'SIMULATED'),
  (2, 'Kundarapalli', 'VILLAGE',
   ST_GeomFromText('POINT(78.100 12.600)', 4326, 'axis-order=long-lat'),
   'Approximate coordinate (~1 km), pending OpenStreetMap import in Phase 3.',
   'SIMULATED'),
  (3, 'Kurubarapalli', 'VILLAGE',
   ST_GeomFromText('POINT(78.020 12.650)', 4326, 'axis-order=long-lat'),
   'Approximate coordinate (~1 km), pending OpenStreetMap import in Phase 3.',
   'SIMULATED'),
  (4, 'Shoolagiri', 'CITY',
   ST_GeomFromText('POINT(77.980 12.740)', 4326, 'axis-order=long-lat'),
   'Approximate coordinate (~1 km), pending OpenStreetMap import in Phase 3.',
   'SIMULATED'),
  (5, 'Hosur', 'CITY',
   ST_GeomFromText('POINT(77.830 12.740)', 4326, 'axis-order=long-lat'),
   'Corridor end. Approximate coordinate (~1 km), pending OpenStreetMap import in Phase 3.',
   'SIMULATED'),

  -- Fabricated development placeholders --------------------------------------
  (6, 'Placeholder Hospital A (Krishnagiri sector)', 'HOSPITAL',
   ST_GeomFromText('POINT(78.191 12.531)', 4326, 'axis-order=long-lat'),
   'SIMULATED placeholder. Not a real facility. Replaced by OpenStreetMap data in Phase 3.',
   'SIMULATED'),
  (7, 'Placeholder Hospital B (Shoolagiri sector)', 'HOSPITAL',
   ST_GeomFromText('POINT(77.963 12.663)', 4326, 'axis-order=long-lat'),
   'SIMULATED placeholder. Not a real facility. Replaced by OpenStreetMap data in Phase 3.',
   'SIMULATED'),
  (8, 'Placeholder Police Station A (Kundarapalli sector)', 'POLICE',
   ST_GeomFromText('POINT(78.115 12.575)', 4326, 'axis-order=long-lat'),
   'SIMULATED placeholder. Not a real facility. Replaced by OpenStreetMap data in Phase 3.',
   'SIMULATED'),
  (9, 'Placeholder Police Station B (Hosur sector)', 'POLICE',
   ST_GeomFromText('POINT(77.849 12.729)', 4326, 'axis-order=long-lat'),
   'SIMULATED placeholder. Not a real facility. Replaced by OpenStreetMap data in Phase 3.',
   'SIMULATED'),
  (10, 'Placeholder Fire Station (Kurubarapalli sector)', 'FIRE_STATION',
   ST_GeomFromText('POINT(78.039 12.619)', 4326, 'axis-order=long-lat'),
   'SIMULATED placeholder. Not a real facility. Replaced by OpenStreetMap data in Phase 3.',
   'SIMULATED'),
  (11, 'Placeholder School A (Krishnagiri sector)', 'SCHOOL',
   ST_GeomFromText('POINT(78.153 12.553)', 4326, 'axis-order=long-lat'),
   'SIMULATED placeholder. Not a real facility. Replaced by OpenStreetMap data in Phase 3.',
   'SIMULATED'),
  (12, 'Placeholder School B (Shoolagiri sector)', 'SCHOOL',
   ST_GeomFromText('POINT(77.925 12.685)', 4326, 'axis-order=long-lat'),
   'SIMULATED placeholder. Not a real facility. Replaced by OpenStreetMap data in Phase 3.',
   'SIMULATED'),
  (13, 'Placeholder College (Kundarapalli sector)', 'COLLEGE',
   ST_GeomFromText('POINT(78.077 12.597)', 4326, 'axis-order=long-lat'),
   'SIMULATED placeholder. Not a real facility. Replaced by OpenStreetMap data in Phase 3.',
   'SIMULATED'),
  (14, 'Placeholder Industrial Unit A (Hosur sector)', 'FACTORY',
   ST_GeomFromText('POINT(77.887 12.707)', 4326, 'axis-order=long-lat'),
   'SIMULATED placeholder. Not a real facility. Replaced by OpenStreetMap data in Phase 3.',
   'SIMULATED'),
  (15, 'Placeholder Industrial Unit B (Kurubarapalli sector)', 'FACTORY',
   ST_GeomFromText('POINT(78.001 12.641)', 4326, 'axis-order=long-lat'),
   'SIMULATED placeholder. Not a real facility. Replaced by OpenStreetMap data in Phase 3.',
   'SIMULATED'),
  (16, 'Placeholder Fuel Station A (Krishnagiri sector)', 'FUEL_STATION',
   ST_GeomFromText('POINT(78.172 12.542)', 4326, 'axis-order=long-lat'),
   'SIMULATED placeholder. Not a real facility. Replaced by OpenStreetMap data in Phase 3.',
   'SIMULATED'),
  (17, 'Placeholder Fuel Station B (Shoolagiri sector)', 'FUEL_STATION',
   ST_GeomFromText('POINT(77.944 12.674)', 4326, 'axis-order=long-lat'),
   'SIMULATED placeholder. Not a real facility. Replaced by OpenStreetMap data in Phase 3.',
   'SIMULATED');
