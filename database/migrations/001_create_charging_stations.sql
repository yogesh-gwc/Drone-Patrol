-- 001 | charging_stations
-- Drone charging stations along the patrol corridor.
-- Geographic convention: POINT SRID 4326, written with 'axis-order=long-lat'
-- (GeoJSON / OpenStreetMap order) and read back with ST_AsGeoJSON.

CREATE TABLE charging_stations (
  id              SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  station_code    VARCHAR(16)       NOT NULL,
  name            VARCHAR(120)      NOT NULL,
  location        POINT SRID 4326   NOT NULL,
  capacity        TINYINT UNSIGNED  NOT NULL DEFAULT 2,
  occupied_slots  TINYINT UNSIGNED  NOT NULL DEFAULT 0,
  -- Derived, never stored twice.
  available_slots TINYINT UNSIGNED  AS (capacity - occupied_slots) VIRTUAL,
  power_status    ENUM('ONLINE','OFFLINE','MAINTENANCE')            NOT NULL DEFAULT 'ONLINE',
  status          ENUM('AVAILABLE','FULL','OFFLINE','MAINTENANCE')  NOT NULL DEFAULT 'AVAILABLE',
  -- SIMULATED until real map data is imported in Phase 3.
  data_source     ENUM('SIMULATED','OSM_IMPORT','MANUAL')           NOT NULL DEFAULT 'SIMULATED',
  notes           VARCHAR(255)      NULL,
  created_at      DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_charging_stations_code (station_code),
  SPATIAL INDEX sx_charging_stations_location (location),
  KEY ix_charging_stations_status (status),
  CONSTRAINT ck_charging_stations_capacity  CHECK (capacity > 0),
  CONSTRAINT ck_charging_stations_occupancy CHECK (occupied_slots <= capacity)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
