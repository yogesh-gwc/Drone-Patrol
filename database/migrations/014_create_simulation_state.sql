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
