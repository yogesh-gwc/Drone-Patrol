-- 015 | cross-table foreign keys
-- These three relationships are circular, so they are added once every table
-- involved exists rather than at CREATE TABLE time.

ALTER TABLE drone_routes
  ADD CONSTRAINT fk_drone_routes_zone
  FOREIGN KEY (zone_id) REFERENCES drone_zones (id) ON DELETE SET NULL;

ALTER TABLE drone_zones
  ADD CONSTRAINT fk_drone_zones_drone
  FOREIGN KEY (assigned_drone_id) REFERENCES drones (id) ON DELETE SET NULL;

ALTER TABLE drones
  ADD CONSTRAINT fk_drones_incident
  FOREIGN KEY (current_incident_id) REFERENCES incidents (id) ON DELETE SET NULL;
