-- Seed 002 | charging_stations
--
-- SIMULATION / DEVELOPMENT DATA.
-- Coordinates are approximate corridor placeholders at roughly 1 km precision,
-- spaced evenly between Krishnagiri and Hosur. They are NOT surveyed station
-- sites. data_source = 'SIMULATED' marks every row; Phase 3 replaces these with
-- positions derived from OpenStreetMap data.
--
-- Each station is placed just INSIDE the lower-numbered zone of the pair it
-- serves, rather than exactly on the shared zone boundary. A drone parked at a
-- boundary-exact coordinate is not reported by ST_Contains, which is interior-
-- only, and that would misread as a drone outside its own patrol zone.
--
-- Geometry convention: WKT is written longitude-first and parsed with
-- 'axis-order=long-lat', matching GeoJSON / OpenStreetMap.

INSERT INTO charging_stations
  (id, station_code, name, location, capacity, occupied_slots, power_status, status, data_source, notes)
VALUES
  (1, 'CS-01', 'Charging Station 01 - Krishnagiri sector',
   ST_GeomFromText('POINT(78.176 12.542)', 4326, 'axis-order=long-lat'),
   3, 0, 'ONLINE', 'AVAILABLE', 'SIMULATED', 'Placeholder position; serves zones Z-01 and Z-02.'),
  (2, 'CS-02', 'Charging Station 02 - Kundarapalli sector',
   ST_GeomFromText('POINT(78.100 12.586)', 4326, 'axis-order=long-lat'),
   2, 1, 'ONLINE', 'AVAILABLE', 'SIMULATED', 'Placeholder position; serves zones Z-03 and Z-04.'),
  (3, 'CS-03', 'Charging Station 03 - Kurubarapalli sector',
   ST_GeomFromText('POINT(78.024 12.630)', 4326, 'axis-order=long-lat'),
   3, 0, 'ONLINE', 'AVAILABLE', 'SIMULATED', 'Placeholder position; serves zones Z-05 and Z-06.'),
  (4, 'CS-04', 'Charging Station 04 - Shoolagiri sector',
   ST_GeomFromText('POINT(77.948 12.674)', 4326, 'axis-order=long-lat'),
   2, 0, 'ONLINE', 'AVAILABLE', 'SIMULATED', 'Placeholder position; serves zones Z-07 and Z-08.'),
  (5, 'CS-05', 'Charging Station 05 - Hosur sector',
   ST_GeomFromText('POINT(77.872 12.718)', 4326, 'axis-order=long-lat'),
   3, 0, 'ONLINE', 'AVAILABLE', 'SIMULATED', 'Placeholder position; serves zones Z-09 and Z-10.');
