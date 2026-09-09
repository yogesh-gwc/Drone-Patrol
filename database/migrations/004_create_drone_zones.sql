-- 004 | drone_zones
-- Geographic patrol zones. One drone is normally responsible for one zone.
--
-- route_id  = the zone's currently designated patrol route (a selection).
-- drone_routes.zone_id = which zone a route belongs to (membership).
-- These are distinct facts, so neither duplicates the other.
--
-- assigned_drone_id is nullable here and its foreign key is added in
-- migration 015 (drones references drone_zones and vice versa).

CREATE TABLE drone_zones (
  id                  SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  zone_code           VARCHAR(16)       NOT NULL,
  name                VARCHAR(120)      NOT NULL,
  geometry            POLYGON SRID 4326 NOT NULL,
  assigned_drone_id   SMALLINT UNSIGNED NULL,
  route_id            SMALLINT UNSIGNED NULL,
  -- Corridor entry and exit for the zone; not derivable from the polygon.
  start_location      POINT SRID 4326   NOT NULL,
  end_location        POINT SRID 4326   NOT NULL,
  charging_station_id SMALLINT UNSIGNED NULL,
  status              ENUM('ACTIVE','INACTIVE','MAINTENANCE')  NOT NULL DEFAULT 'ACTIVE',
  data_source         ENUM('SIMULATED','OSM_IMPORT','MANUAL')  NOT NULL DEFAULT 'SIMULATED',
  created_at          DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at          DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_drone_zones_code (zone_code),
  UNIQUE KEY uq_drone_zones_drone (assigned_drone_id),
  SPATIAL INDEX sx_drone_zones_geometry (geometry),
  KEY ix_drone_zones_route (route_id),
  KEY ix_drone_zones_station (charging_station_id),
  CONSTRAINT fk_drone_zones_route
    FOREIGN KEY (route_id) REFERENCES drone_routes (id) ON DELETE SET NULL,
  CONSTRAINT fk_drone_zones_station
    FOREIGN KEY (charging_station_id) REFERENCES charging_stations (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
