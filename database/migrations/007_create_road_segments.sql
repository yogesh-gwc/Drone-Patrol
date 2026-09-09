-- 007 | road_segments
-- Highway geometry. Phase 2 seeds coarse corridor placeholders only; Phase 3
-- replaces them with OpenStreetMap-derived geometry (data_source = OSM_IMPORT).

CREATE TABLE road_segments (
  id              INT UNSIGNED         NOT NULL AUTO_INCREMENT,
  road_name       VARCHAR(160)         NOT NULL,
  road_type       ENUM('NATIONAL_HIGHWAY','STATE_HIGHWAY','MAJOR_ROAD',
                       'MINOR_ROAD','SERVICE_ROAD','JUNCTION_LINK') NOT NULL,
  geometry        LINESTRING SRID 4326 NOT NULL,
  start_point     POINT AS (ST_StartPoint(geometry)) VIRTUAL,
  end_point       POINT AS (ST_EndPoint(geometry))   VIRTUAL,
  distance_meters DECIMAL(10,2)        NOT NULL DEFAULT 0,
  speed_limit_kmh SMALLINT UNSIGNED    NULL,
  zone_id         SMALLINT UNSIGNED    NULL,
  status          ENUM('ACTIVE','INACTIVE','CLOSED')      NOT NULL DEFAULT 'ACTIVE',
  data_source     ENUM('SIMULATED','OSM_IMPORT','MANUAL') NOT NULL DEFAULT 'SIMULATED',
  osm_id          BIGINT UNSIGNED      NULL,
  created_at      DATETIME(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_road_segments_osm (osm_id),
  SPATIAL INDEX sx_road_segments_geometry (geometry),
  KEY ix_road_segments_zone (zone_id),
  KEY ix_road_segments_type (road_type),
  CONSTRAINT fk_road_segments_zone
    FOREIGN KEY (zone_id) REFERENCES drone_zones (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
