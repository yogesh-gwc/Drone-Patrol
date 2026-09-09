-- 006 | drone_telemetry
-- Append-only history of drone state. Written by the simulation engine from
-- Phase 9 onward; Phase 2 leaves it empty on purpose.
--
-- No spatial index: the access pattern is "latest N rows for one drone", which
-- the (drone_id, recorded_at DESC) index serves, and a spatial index would only
-- add cost to high-frequency inserts.

CREATE TABLE drone_telemetry (
  id                 BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  drone_id           SMALLINT UNSIGNED NOT NULL,
  location           POINT SRID 4326   NOT NULL,
  altitude_m         DECIMAL(7,2)      NOT NULL,
  speed_kmh          DECIMAL(6,2)      NOT NULL,
  heading_deg        DECIMAL(5,2)      NOT NULL,
  battery_percentage DECIMAL(5,2)      NOT NULL,
  camera_status      ENUM('LIVE','OFFLINE','UNAVAILABLE') NOT NULL,
  speaker_status     ENUM('ACTIVE','IDLE','OFFLINE')      NOT NULL,
  gps_status         ENUM('LOCKED','WEAK','LOST')         NOT NULL,
  recorded_at        DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_drone_telemetry_recent (drone_id, recorded_at DESC),
  KEY ix_drone_telemetry_recorded_at (recorded_at),
  CONSTRAINT fk_drone_telemetry_drone
    FOREIGN KEY (drone_id) REFERENCES drones (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
