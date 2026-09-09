-- 008 | vehicles
-- Simulated road traffic. Current state only; history lives in vehicle_events.
--
-- A vehicle's "route" is the road it travels, so it references road_segments
-- rather than drone_routes (which are flight paths).

CREATE TABLE vehicles (
  id               INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  vehicle_code     VARCHAR(16)     NOT NULL,
  type             ENUM('CAR','TRUCK','BIKE','BUS','AMBULANCE','POLICE') NOT NULL,
  location         POINT SRID 4326 NOT NULL,
  speed_kmh        DECIMAL(6,2)    NOT NULL DEFAULT 0.00,
  heading_deg      DECIMAL(5,2)    NOT NULL DEFAULT 0.00,
  status           ENUM('MOVING','STOPPED','STATIONARY_WARNING',
                        'SUSPICIOUS','EMERGENCY','OFFLINE') NOT NULL DEFAULT 'STOPPED',
  road_segment_id  INT UNSIGNED    NULL,
  last_movement_at DATETIME(3)     NULL,
  -- Set when the vehicle stops; the suspicious-vehicle timer measures from here.
  stationary_since DATETIME(3)     NULL,
  created_at       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_vehicles_code (vehicle_code),
  SPATIAL INDEX sx_vehicles_location (location),
  KEY ix_vehicles_status (status),
  KEY ix_vehicles_type (type),
  KEY ix_vehicles_stationary (stationary_since),
  KEY ix_vehicles_road_segment (road_segment_id),
  CONSTRAINT ck_vehicles_heading CHECK (heading_deg >= 0 AND heading_deg < 360),
  CONSTRAINT ck_vehicles_speed CHECK (speed_kmh >= 0),
  CONSTRAINT fk_vehicles_road_segment
    FOREIGN KEY (road_segment_id) REFERENCES road_segments (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
