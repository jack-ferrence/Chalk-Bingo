-- =============================================================================
-- 002: Add sport column to rooms + update unique index
-- Paste into Supabase SQL Editor and execute.
-- =============================================================================

-- Add sport column (idempotent)
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS sport text NOT NULL DEFAULT 'nba'
  CHECK (sport IN ('nba', 'ncaa'));

-- Rebuild unique index to include sport
-- (Cannot ALTER a unique index — must drop and recreate)
DROP INDEX IF EXISTS idx_rooms_one_public_per_game;

CREATE UNIQUE INDEX idx_rooms_one_public_per_game
  ON public.rooms (game_id, sport)
  WHERE room_type = 'public' AND status != 'finished';
