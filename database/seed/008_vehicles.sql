-- Seed 008 | vehicles
--
-- SIMULATION / DEVELOPMENT DATA.
--
-- Thirteen sample vehicles spread across the placeholder road segments, one
-- for every vehicle type in the enum. Vehicle codes are synthetic (VH-001...); no registration
-- number, owner or other real-world identifier is stored anywhere in this
-- system.
--
-- Every vehicle starts STOPPED with speed 0, because the simulation engine
-- that moves them is implemented in Phase 8/9 and has never run. Positions are
-- fixed points on the placeholder geometry, not observed locations.
--
-- VH-011 additionally carries a stationary_since timestamp 45 simulated
-- minutes in the past. That is purely so the Phase 12 suspicious-vehicle timer
-- has a row to develop against; it is not a real observation and no warning,
-- incident or dispatch has been raised from it.
--
-- Geometry convention: WKT longitude-first, parsed with 'axis-order=long-lat'.

INSERT INTO vehicles
  (id, vehicle_code, type, location, speed_kmh, heading_deg, status,
   road_segment_id, last_movement_at, stationary_since)
VALUES
  (1, 'VH-001', 'CAR',
   ST_GeomFromText('POINT(78.200 12.526)', 4326, 'axis-order=long-lat'),
   0.00, 305.00, 'STOPPED', 1, NULL, NULL),
  (2, 'VH-002', 'TRUCK',
   ST_GeomFromText('POINT(78.180 12.537)', 4326, 'axis-order=long-lat'),
   0.00, 305.00, 'STOPPED', 1, NULL, NULL),
  (3, 'VH-003', 'BIKE',
   ST_GeomFromText('POINT(78.160 12.549)', 4326, 'axis-order=long-lat'),
   0.00, 305.00, 'STOPPED', 2, NULL, NULL),
  (4, 'VH-004', 'BUS',
   ST_GeomFromText('POINT(78.140 12.560)', 4326, 'axis-order=long-lat'),
   0.00, 305.00, 'STOPPED', 2, NULL, NULL),
  (5, 'VH-005', 'CAR',
   ST_GeomFromText('POINT(78.120 12.572)', 4326, 'axis-order=long-lat'),
   0.00, 305.00, 'STOPPED', 3, NULL, NULL),
  (6, 'VH-006', 'TRUCK',
   ST_GeomFromText('POINT(78.085 12.592)', 4326, 'axis-order=long-lat'),
   0.00, 305.00, 'STOPPED', 4, NULL, NULL),
  (7, 'VH-007', 'CAR',
   ST_GeomFromText('POINT(78.045 12.615)', 4326, 'axis-order=long-lat'),
   0.00, 305.00, 'STOPPED', 5, NULL, NULL),
  (8, 'VH-008', 'BIKE',
   ST_GeomFromText('POINT(78.010 12.636)', 4326, 'axis-order=long-lat'),
   0.00, 305.00, 'STOPPED', 6, NULL, NULL),
  (9, 'VH-009', 'BUS',
   ST_GeomFromText('POINT(77.970 12.658)', 4326, 'axis-order=long-lat'),
   0.00, 305.00, 'STOPPED', 7, NULL, NULL),
  (10, 'VH-010', 'CAR',
   ST_GeomFromText('POINT(77.935 12.680)', 4326, 'axis-order=long-lat'),
   0.00, 305.00, 'STOPPED', 8, NULL, NULL),
  (11, 'VH-011', 'TRUCK',
   ST_GeomFromText('POINT(77.895 12.702)', 4326, 'axis-order=long-lat'),
   0.00, 305.00, 'STOPPED', 9,
   DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 45 MINUTE),
   DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 45 MINUTE)),
  (12, 'VH-012', 'AMBULANCE',
   ST_GeomFromText('POINT(77.855 12.725)', 4326, 'axis-order=long-lat'),
   0.00, 305.00, 'STOPPED', 10, NULL, NULL),
  (13, 'VH-013', 'POLICE',
   ST_GeomFromText('POINT(77.840 12.734)', 4326, 'axis-order=long-lat'),
   0.00, 305.00, 'STOPPED', 10, NULL, NULL);
