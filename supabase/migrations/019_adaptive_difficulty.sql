-- 019_adaptive_difficulty.sql
-- Adds adaptive card difficulty system to rooms:
--   difficulty_profile  — which quota/prob profile was used to build cards
--   cards_locked        — true once T-10 lock fires; stops reconciliation + new card gen
--   player_count_at_lock — participant count at lock time (determines profile)
--   locked_at           — timestamp when the lock ran

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS difficulty_profile    TEXT    NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS cards_locked          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS player_count_at_lock  INT,
  ADD COLUMN IF NOT EXISTS locked_at             TIMESTAMPTZ;

-- Allow efficient lookup of rooms that need lock processing
CREATE INDEX IF NOT EXISTS rooms_lock_check_idx
  ON rooms (status, cards_locked, starts_at)
  WHERE status = 'lobby' AND cards_locked = FALSE;
