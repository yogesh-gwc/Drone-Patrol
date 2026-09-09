-- 013 | alerts
-- Operator-facing notifications.
--
-- location is nullable because some alerts are system-level (communication
-- failure, drone offline) with no meaningful position. MySQL requires a
-- NOT NULL column for a SPATIAL INDEX, so alerts intentionally has none;
-- geographic alert queries go through the related incident instead.

CREATE TABLE alerts (
  id              BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  level           ENUM('INFO','WARNING','CRITICAL','EMERGENCY') NOT NULL DEFAULT 'INFO',
  alert_type      ENUM('LOW_BATTERY','CHARGING','AMBULANCE_DETECTED','SOS_ACTIVATED',
                       'SUSPICIOUS_VEHICLE','POLICE_DISPATCH','CHARGING_STATION_FULL',
                       'DRONE_OFFLINE','COMMUNICATION_FAILURE') NOT NULL,
  title           VARCHAR(160)      NOT NULL,
  message         VARCHAR(1000)     NOT NULL,
  drone_id        SMALLINT UNSIGNED NULL,
  vehicle_id      INT UNSIGNED      NULL,
  incident_id     BIGINT UNSIGNED   NULL,
  location        POINT SRID 4326   NULL,
  acknowledged    BOOLEAN           NOT NULL DEFAULT FALSE,
  acknowledged_at DATETIME(3)       NULL,
  created_at      DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_alerts_unacknowledged (acknowledged, created_at DESC),
  KEY ix_alerts_level (level, created_at DESC),
  KEY ix_alerts_type (alert_type),
  KEY ix_alerts_drone (drone_id),
  KEY ix_alerts_vehicle (vehicle_id),
  KEY ix_alerts_incident (incident_id),
  CONSTRAINT ck_alerts_acknowledged CHECK (acknowledged_at IS NULL OR acknowledged = TRUE),
  CONSTRAINT fk_alerts_drone
    FOREIGN KEY (drone_id) REFERENCES drones (id) ON DELETE SET NULL,
  CONSTRAINT fk_alerts_vehicle
    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE SET NULL,
  CONSTRAINT fk_alerts_incident
    FOREIGN KEY (incident_id) REFERENCES incidents (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
