-- ===========================================================================
-- AEROGUARD 3D - full schema reference
--
-- GENERATED FILE - do not edit and do not apply directly.
--
-- This is the concatenation of database/migrations/*.sql in order, provided as
-- a single file for reading in MySQL Workbench. The migrations are the source
-- of truth; apply them with:
--
--     cd backend && npm run db:migrate
--
-- Regenerate this file after adding a migration:
--
--     cd database && cat migrations/*.sql > /tmp/s && ...  (see README)
--
-- Database: aeroguard   Engine: InnoDB   Charset: utf8mb4
-- Spatial:  SRID 4326, GeoJSON [longitude, latitude] on every boundary
-- ===========================================================================


-- ==== migrations/001_create_charging_stations.sql ====================================================

-- 001 | charging_stations
-- Drone charging stations along the patrol corridor.
-- Geographic convention: POINT SRID 4326, written with 'axis-order=long-lat'
-- (GeoJSON / OpenStreetMap order) and read back with ST_AsGeoJSON.

CREATE TABLE charging_stations (
  id              SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  station_code    VARCHAR(16)       NOT NULL,
  name            VARCHAR(120)      NOT NULL,
  location        POINT SRID 4326   NOT NULL,
  capacity        TINYINT UNSIGNED  NOT NULL DEFAULT 2,
  occupied_slots  TINYINT UNSIGNED  NOT NULL DEFAULT 0,
  -- Derived, never stored twice.
  available_slots TINYINT UNSIGNED  AS (capacity - occupied_slots) VIRTUAL,
  power_status    ENUM('ONLINE','OFFLINE','MAINTENANCE')            NOT NULL DEFAULT 'ONLINE',
  status          ENUM('AVAILABLE','FULL','OFFLINE','MAINTENANCE')  NOT NULL DEFAULT 'AVAILABLE',
  -- SIMULATED until real map data is imported in Phase 3.
  data_source     ENUM('SIMULATED','OSM_IMPORT','MANUAL')           NOT NULL DEFAULT 'SIMULATED',
  notes           VARCHAR(255)      NULL,
  created_at      DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_charging_stations_code (station_code),
  SPATIAL INDEX sx_charging_stations_location (location),
  KEY ix_charging_stations_status (status),
  CONSTRAINT ck_charging_stations_capacity  CHECK (capacity > 0),
  CONSTRAINT ck_charging_stations_occupancy CHECK (occupied_slots <= capacity)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ==== migrations/002_create_locations.sql ====================================================

-- 002 | locations
-- Single extensible registry of point locations along the corridor.
-- Charging stations are deliberately NOT duplicated here: their geometry is
-- authoritative in charging_stations. The CHARGING_STATION enum value exists
-- so the UI can classify a unified marker feed without a second table.

CREATE TABLE locations (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  name        VARCHAR(160)    NOT NULL,
  type        ENUM('HOSPITAL','SCHOOL','COLLEGE','FACTORY','POLICE','FIRE_STATION',
                   'FUEL_STATION','CITY','VILLAGE','CHARGING_STATION') NOT NULL,
  location    POINT SRID 4326 NOT NULL,
  description VARCHAR(500)    NULL,
  data_source ENUM('SIMULATED','OSM_IMPORT','MANUAL') NOT NULL DEFAULT 'SIMULATED',
  -- Populated when a row originates from an OpenStreetMap import (Phase 3).
  osm_id      BIGINT UNSIGNED NULL,
  created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_locations_osm (osm_id),
  SPATIAL INDEX sx_locations_location (location),
  KEY ix_locations_type (type)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ==== migrations/003_create_drone_routes.sql ====================================================

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

-- ==== migrations/004_create_drone_zones.sql ====================================================

-- 004 | drone_zones
-- Geographic patrol zones. One drone is normally responsible for one zone.
--
-- route_id  = the zone's currently designated patrol route (a selection).
-- drone_routes.zone_id = which zone a route belongs to (membership).
-- These are distinct facts, so neither duplicates the other.
--
-- assigned_drone_id is nullable here and its foreign key is added in
-- migration 015 (drones references drone_zones and vice versa).

CREATE TABLE drone_zones (
  id                  SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  zone_code           VARCHAR(16)       NOT NULL,
  name                VARCHAR(120)      NOT NULL,
  geometry            POLYGON SRID 4326 NOT NULL,
  assigned_drone_id   SMALLINT UNSIGNED NULL,
  route_id            SMALLINT UNSIGNED NULL,
  -- Corridor entry and exit for the zone; not derivable from the polygon.
  start_location      POINT SRID 4326   NOT NULL,
  end_location        POINT SRID 4326   NOT NULL,
  charging_station_id SMALLINT UNSIGNED NULL,
  status              ENUM('ACTIVE','INACTIVE','MAINTENANCE')  NOT NULL DEFAULT 'ACTIVE',
  data_source         ENUM('SIMULATED','OSM_IMPORT','MANUAL')  NOT NULL DEFAULT 'SIMULATED',
  created_at          DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at          DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_drone_zones_code (zone_code),
  UNIQUE KEY uq_drone_zones_drone (assigned_drone_id),
  SPATIAL INDEX sx_drone_zones_geometry (geometry),
  KEY ix_drone_zones_route (route_id),
  KEY ix_drone_zones_station (charging_station_id),
  CONSTRAINT fk_drone_zones_route
    FOREIGN KEY (route_id) REFERENCES drone_routes (id) ON DELETE SET NULL,
  CONSTRAINT fk_drone_zones_station
    FOREIGN KEY (charging_station_id) REFERENCES charging_stations (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ==== migrations/005_create_drones.sql ====================================================

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

-- ==== migrations/006_create_drone_telemetry.sql ====================================================

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

-- ==== migrations/007_create_road_segments.sql ====================================================

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

-- ==== migrations/008_create_vehicles.sql ====================================================

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

-- ==== migrations/009_create_vehicle_events.sql ====================================================

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

-- ==== migrations/010_create_emergency_events.sql ====================================================

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

-- ==== migrations/011_create_sos_events.sql ====================================================

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

-- ==== migrations/012_create_incidents.sql ====================================================

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

-- ==== migrations/013_create_alerts.sql ====================================================

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

-- ==== migrations/014_create_simulation_state.sql ====================================================

-- 014 | simulation_state
-- Single-row table holding the authoritative clock and run state of the
-- backend simulation. Behaviour is implemented from Phase 9 onward.

CREATE TABLE simulation_state (
  id               TINYINT UNSIGNED  NOT NULL DEFAULT 1,
  status           ENUM('STOPPED','RUNNING','PAUSED') NOT NULL DEFAULT 'STOPPED',
  -- Supported multipliers: 1x, 5x, 10x, 60x.
  speed_multiplier SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  -- Current in-simulation clock, UTC.
  simulated_time   DATETIME(3)       NOT NULL,
  last_updated_at  DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_at       DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  CONSTRAINT ck_simulation_state_singleton CHECK (id = 1),
  CONSTRAINT ck_simulation_state_speed     CHECK (speed_multiplier IN (1, 5, 10, 60))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ==== migrations/015_add_cross_references.sql ====================================================

-- 015 | cross-table foreign keys
-- These three relationships are circular, so they are added once every table
-- involved exists rather than at CREATE TABLE time.

ALTER TABLE drone_routes
  ADD CONSTRAINT fk_drone_routes_zone
  FOREIGN KEY (zone_id) REFERENCES drone_zones (id) ON DELETE SET NULL;

ALTER TABLE drone_zones
  ADD CONSTRAINT fk_drone_zones_drone
  FOREIGN KEY (assigned_drone_id) REFERENCES drones (id) ON DELETE SET NULL;

ALTER TABLE drones
  ADD CONSTRAINT fk_drones_incident
  FOREIGN KEY (current_incident_id) REFERENCES incidents (id) ON DELETE SET NULL;
