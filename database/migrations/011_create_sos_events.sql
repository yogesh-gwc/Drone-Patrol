-- 011 | sos_events
-- SOS tracking. person_reference is a synthetic simulation identifier
-- (e.g. SIM-PERSON-001); no personal data is stored by this system.

CREATE TABLE sos_events (
  id                BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  person_reference  VARCHAR(32)       NOT NULL,
  start_location    POINT SRID 4326   NOT NULL,
  destination       POINT SRID 4326   NOT NULL,
  current_location  POINT SRID 4326   NOT NULL,
  assigned_drone_id SMALLINT UNSIGNED NULL,
  status            ENUM('ACTIVE','TRACKING','RESOLVED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  started_at        DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  resolved_at       DATETIME(3)       NULL,
  created_at        DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  SPATIAL INDEX sx_sos_events_current_location (current_location),
  KEY ix_sos_events_status (status, started_at),
  KEY ix_sos_events_person (person_reference),
  KEY ix_sos_events_drone (assigned_drone_id),
  CONSTRAINT ck_sos_events_resolved CHECK (resolved_at IS NULL OR resolved_at >= started_at),
  CONSTRAINT fk_sos_events_drone
    FOREIGN KEY (assigned_drone_id) REFERENCES drones (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
