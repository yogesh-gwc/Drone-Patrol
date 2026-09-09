-- 010 | emergency_events
-- Ambulance priority-corridor and other emergency events.
-- SIMULATION ONLY: no row here ever triggers a real emergency call.

CREATE TABLE emergency_events (
  id                BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  emergency_type    ENUM('AMBULANCE','OTHER_EMERGENCY') NOT NULL,
  vehicle_id        INT UNSIGNED      NULL,
  location          POINT SRID 4326   NOT NULL,
  assigned_drone_id SMALLINT UNSIGNED NULL,
  status            ENUM('ACTIVE','ASSIGNED','ESCORTING','RESOLVED','CANCELLED')
                      NOT NULL DEFAULT 'ACTIVE',
  details           JSON              NULL,
  started_at        DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  resolved_at       DATETIME(3)       NULL,
  created_at        DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  SPATIAL INDEX sx_emergency_events_location (location),
  KEY ix_emergency_events_status (status, started_at),
  KEY ix_emergency_events_drone (assigned_drone_id),
  KEY ix_emergency_events_vehicle (vehicle_id),
  CONSTRAINT ck_emergency_events_resolved CHECK (resolved_at IS NULL OR resolved_at >= started_at),
  CONSTRAINT fk_emergency_events_vehicle
    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE SET NULL,
  CONSTRAINT fk_emergency_events_drone
    FOREIGN KEY (assigned_drone_id) REFERENCES drones (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
