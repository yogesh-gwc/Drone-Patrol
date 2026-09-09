-- 002 | locations
-- Single extensible registry of point locations along the corridor.
-- Charging stations are deliberately NOT duplicated here: their geometry is
-- authoritative in charging_stations. The CHARGING_STATION enum value exists
-- so the UI can classify a unified marker feed without a second table.

CREATE TABLE locations (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  name        VARCHAR(160)    NOT NULL,
  type        ENUM('HOSPITAL','SCHOOL','COLLEGE','FACTORY','POLICE','FIRE_STATION',
                   'FUEL_STATION','CITY','VILLAGE','CHARGING_STATION') NOT NULL,
  location    POINT SRID 4326 NOT NULL,
  description VARCHAR(500)    NULL,
  data_source ENUM('SIMULATED','OSM_IMPORT','MANUAL') NOT NULL DEFAULT 'SIMULATED',
  -- Populated when a row originates from an OpenStreetMap import (Phase 3).
  osm_id      BIGINT UNSIGNED NULL,
  created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_locations_osm (osm_id),
  SPATIAL INDEX sx_locations_location (location),
  KEY ix_locations_type (type)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
