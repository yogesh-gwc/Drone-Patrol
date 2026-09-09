-- Seed 009 | incidents and alerts
--
-- SIMULATION / DEVELOPMENT DATA.
--
-- A small, consistent set of operator records derived from the drone snapshot
-- in seed 006, so the alert panel and incident timeline have realistic content
-- to lay out before the simulation engine exists.
--
-- Nothing here represents a real event. No police dispatch, emergency call or
-- hardware action has occurred or will occur from these rows.
--
-- emergency_events and sos_events are intentionally left empty: those records
-- are created by the Phase 10 and Phase 11 workflows, and inventing them now
-- would imply emergencies that never happened.
--
-- Geometry convention: WKT longitude-first, parsed with 'axis-order=long-lat'.

INSERT INTO incidents
  (id, incident_type, severity, title, description, status, location,
   assigned_drone_id, vehicle_id, started_at)
VALUES
  (1, 'DRONE', 'CRITICAL',
   'DR-09 offline in Patrol Zone 09',
   'SIMULATED: DR-09 reports zero battery and GPS lock lost. Zone 09 has no active patrol cover.',
   'OPEN',
   ST_GeomFromText('POINT(77.887 12.707)', 4326, 'axis-order=long-lat'),
   9, NULL, DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 2 HOUR)),
  (2, 'CHARGING', 'WARNING',
   'DR-06 returning to CS-03 on low battery',
   'SIMULATED: DR-06 battery at 21 percent, routed to charging station CS-03.',
   'IN_PROGRESS',
   ST_GeomFromText('POINT(78.001 12.641)', 4326, 'axis-order=long-lat'),
   6, NULL, DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 25 MINUTE));

-- Link the affected drones back to their open incident.
UPDATE drones SET current_incident_id = 1 WHERE id = 9;
UPDATE drones SET current_incident_id = 2 WHERE id = 6;

INSERT INTO alerts
  (id, level, alert_type, title, message, drone_id, vehicle_id, incident_id,
   location, acknowledged, acknowledged_at, created_at)
VALUES
  (1, 'CRITICAL', 'DRONE_OFFLINE',
   'DR-09 offline',
   'SIMULATED: DR-09 has stopped reporting. Patrol Zone 09 is uncovered.',
   9, NULL, 1,
   ST_GeomFromText('POINT(77.887 12.707)', 4326, 'axis-order=long-lat'),
   FALSE, NULL, DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 2 HOUR)),
  (2, 'CRITICAL', 'COMMUNICATION_FAILURE',
   'DR-09 telemetry link lost',
   'SIMULATED: no telemetry received from DR-09. System-level alert with no fixed position.',
   9, NULL, 1,
   NULL,
   FALSE, NULL, DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 2 HOUR)),
  (3, 'WARNING', 'LOW_BATTERY',
   'DR-06 battery low',
   'SIMULATED: DR-06 battery at 21 percent. Returning to charging station CS-03.',
   6, NULL, 2,
   ST_GeomFromText('POINT(78.001 12.641)', 4326, 'axis-order=long-lat'),
   FALSE, NULL, DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 25 MINUTE)),
  (4, 'INFO', 'CHARGING',
   'DR-03 charging at CS-02',
   'SIMULATED: DR-03 is charging at CS-02. Camera reported OFFLINE while on the pad.',
   3, NULL, NULL,
   ST_GeomFromText('POINT(78.100 12.586)', 4326, 'axis-order=long-lat'),
   TRUE, DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 30 MINUTE),
   DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 40 MINUTE));
