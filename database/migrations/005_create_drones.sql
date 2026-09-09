-- 005 | drones
-- Fleet register. Holds current state only; history lives in drone_telemetry.
-- current_incident_id gets its foreign key in migration 015 (incidents is
-- created later and references drones).

CREATE TABLE drones (
  id                  SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  drone_code          VARCHAR(16)       NOT NULL,
  name                VARCHAR(120)      NOT NULL,
  status              ENUM('PATROLLING','RESPONDING','ESCORTING','SOS_TRACKING',
                           'CHARGING','RETURNING','OFFLINE','EMERGENCY') NOT NULL DEFAULT 'OFFLINE',
  battery_percentage  DECIMAL(5,2)      NOT NULL DEFAULT 100.00,
  location            POINT SRID 4326   NOT NULL,
  altitude_m          DECIMAL(7,2)      NOT NULL DEFAULT 0.00,
  speed_kmh           DECIMAL(6,2)      NOT NULL DEFAULT 0.00,
  heading_deg         DECIMAL(5,2)      NOT NULL DEFAULT 0.00,
  camera_status       ENUM('LIVE','OFFLINE','UNAVAILABLE') NOT NULL DEFAULT 'OFFLINE',
  speaker_status      ENUM('ACTIVE','IDLE','OFFLINE')      NOT NULL DEFAULT 'IDLE',
  gps_status          ENUM('LOCKED','WEAK','LOST')         NOT NULL DEFAULT 'LOCKED',
  current_zone_id     SMALLINT UNSIGNED NULL,
  current_route_id    SMALLINT UNSIGNED NULL,
  charging_station_id SMALLINT UNSIGNED NULL,
  current_incident_id BIGINT UNSIGNED   NULL,
  last_telemetry_at   DATETIME(3)       NULL,
  created_at          DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at          DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_drones_code (drone_code),
  SPATIAL INDEX sx_drones_location (location),
  KEY ix_drones_status (status),
  KEY ix_drones_zone (current_zone_id),
  KEY ix_drones_route (current_route_id),
  KEY ix_drones_station (charging_station_id),
  KEY ix_drones_incident (current_incident_id),
  CONSTRAINT ck_drones_battery CHECK (battery_percentage BETWEEN 0 AND 100),
  CONSTRAINT ck_drones_heading CHECK (heading_deg >= 0 AND heading_deg < 360),
  CONSTRAINT ck_drones_altitude CHECK (altitude_m >= 0),
  CONSTRAINT ck_drones_speed CHECK (speed_kmh >= 0),
  CONSTRAINT fk_drones_zone
    FOREIGN KEY (current_zone_id) REFERENCES drone_zones (id) ON DELETE SET NULL,
  CONSTRAINT fk_drones_route
    FOREIGN KEY (current_route_id) REFERENCES drone_routes (id) ON DELETE SET NULL,
  CONSTRAINT fk_drones_station
    FOREIGN KEY (charging_station_id) REFERENCES charging_stations (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
