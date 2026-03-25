-- 021_injury_tracking.sql
-- Track in-game injury replacements on rooms.
--
-- injury_replaced_player_ids: ESPN player IDs we've already processed,
--   so we don't re-replace the same player on the next poll cycle.
--
-- missing_player_counts: jsonb map of { player_id: consecutive_absent_cycle_count }
--   Used to confirm "player disappeared from boxscore" after 3+ cycles.

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS injury_replaced_player_ids text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS missing_player_counts      jsonb   DEFAULT '{}'::jsonb;

-- Recreate view so it continues to expose all room columns (including new ones)
DROP VIEW IF EXISTS public.rooms_with_counts;
CREATE OR REPLACE VIEW public.rooms_with_counts AS
SELECT r.*, coalesce(rp.cnt, 0) AS participant_count
FROM public.rooms r
LEFT JOIN (
  SELECT room_id, count(*)::int AS cnt
  FROM public.room_participants
  GROUP BY room_id
) rp ON rp.room_id = r.id;
