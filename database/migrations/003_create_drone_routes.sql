-- 003 | drone_routes
-- Flight paths drones follow. Real highway geometry is imported in Phase 3;
-- Phase 2 seeds only coarse placeholder LINESTRINGs (data_source = SIMULATED).
--
-- zone_id is nullable here and its foreign key is added in migration 015,
-- because drone_zones and drone_routes reference each other.

CREATE TABLE drone_routes (
  id              SMALLINT UNSIGNED    NOT NULL AUTO_INCREMENT,
  name            VARCHAR(120)         NOT NULL,
  route_type      ENUM('PATROL','TRANSIT','EMERGENCY','CHARGING_APPROACH') NOT NULL DEFAULT 'PATROL',
  geometry        LINESTRING SRID 4326 NOT NULL,
  -- Derived from geometry rather than stored twice.
  start_location  POINT AS (ST_StartPoint(geometry)) VIRTUAL,
  end_location    POINT AS (ST_EndPoint(geometry))   VIRTUAL,
  zone_id         SMALLINT UNSIGNED    NULL,
  -- Metres. Computed by MySQL from the geometry, never hand-entered.
  distance_meters DECIMAL(10,2)        NOT NULL DEFAULT 0,
  status          ENUM('ACTIVE','INACTIVE','DRAFT')       NOT NULL DEFAULT 'ACTIVE',
  data_source     ENUM('SIMULATED','OSM_IMPORT','MANUAL') NOT NULL DEFAULT 'SIMULATED',
  created_at      DATETIME(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_drone_routes_name (name),
  SPATIAL INDEX sx_drone_routes_geometry (geometry),
  KEY ix_drone_routes_zone (zone_id),
  KEY ix_drone_routes_type_status (route_type, status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
