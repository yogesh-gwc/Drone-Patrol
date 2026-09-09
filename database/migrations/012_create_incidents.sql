-- 012 | incidents
-- Unified operational record across every incident source. Links back to the
-- originating emergency_events / sos_events row instead of copying its data.

CREATE TABLE incidents (
  id                 BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  incident_type      ENUM('AMBULANCE','SOS','SUSPICIOUS_VEHICLE','DRONE',
                          'CHARGING','COMMUNICATION') NOT NULL,
  severity           ENUM('INFO','WARNING','CRITICAL','EMERGENCY') NOT NULL DEFAULT 'INFO',
  title              VARCHAR(160)      NOT NULL,
  description        VARCHAR(1000)     NULL,
  status             ENUM('OPEN','ACKNOWLEDGED','IN_PROGRESS','RESOLVED','CLOSED')
                       NOT NULL DEFAULT 'OPEN',
  location           POINT SRID 4326   NOT NULL,
  assigned_drone_id  SMALLINT UNSIGNED NULL,
  vehicle_id         INT UNSIGNED      NULL,
  emergency_event_id BIGINT UNSIGNED   NULL,
  sos_event_id       BIGINT UNSIGNED   NULL,
  started_at         DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  resolved_at        DATETIME(3)       NULL,
  created_at         DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at         DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  SPATIAL INDEX sx_incidents_location (location),
  KEY ix_incidents_status (status, started_at),
  KEY ix_incidents_type_severity (incident_type, severity),
  KEY ix_incidents_drone (assigned_drone_id),
  KEY ix_incidents_vehicle (vehicle_id),
  KEY ix_incidents_emergency_event (emergency_event_id),
  KEY ix_incidents_sos_event (sos_event_id),
  CONSTRAINT ck_incidents_resolved CHECK (resolved_at IS NULL OR resolved_at >= started_at),
  CONSTRAINT fk_incidents_drone
    FOREIGN KEY (assigned_drone_id) REFERENCES drones (id) ON DELETE SET NULL,
  CONSTRAINT fk_incidents_vehicle
    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE SET NULL,
  CONSTRAINT fk_incidents_emergency_event
    FOREIGN KEY (emergency_event_id) REFERENCES emergency_events (id) ON DELETE SET NULL,
  CONSTRAINT fk_incidents_sos_event
    FOREIGN KEY (sos_event_id) REFERENCES sos_events (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
