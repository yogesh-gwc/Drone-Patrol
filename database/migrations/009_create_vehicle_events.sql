-- 009 | vehicle_events
-- Append-only vehicle history. `details` keeps the design extensible without
-- a schema change for every new event variant.

CREATE TABLE vehicle_events (
  id          BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  vehicle_id  INT UNSIGNED      NOT NULL,
  event_type  ENUM('VEHICLE_STARTED','VEHICLE_STOPPED','VEHICLE_MOVED',
                   'STATIONARY_WARNING','SUSPICIOUS_VEHICLE','POLICE_DISPATCH') NOT NULL,
  location    POINT SRID 4326   NOT NULL,
  drone_id    SMALLINT UNSIGNED NULL,
  details     JSON              NULL,
  occurred_at DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_vehicle_events_recent (vehicle_id, occurred_at DESC),
  KEY ix_vehicle_events_type (event_type, occurred_at),
  KEY ix_vehicle_events_drone (drone_id),
  CONSTRAINT fk_vehicle_events_vehicle
    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE CASCADE,
  CONSTRAINT fk_vehicle_events_drone
    FOREIGN KEY (drone_id) REFERENCES drones (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
