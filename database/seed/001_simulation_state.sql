-- Seed 001 | simulation_state
-- One row, stopped. The simulation engine is implemented from Phase 9.

INSERT INTO simulation_state (id, status, speed_multiplier, simulated_time)
VALUES (1, 'STOPPED', 1, UTC_TIMESTAMP(3));
