-- 014_room_types
-- Adds room_type column: 'public' (system-created, one per game) or 'private' (user-created).
-- DEFAULT 'private' so existing user-created rooms and future GameBrowserPage rooms stay private.
-- sync-games.js explicitly sets room_type = 'public' when creating system rooms.

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS room_type TEXT NOT NULL DEFAULT 'private'
    CHECK (room_type IN ('public', 'private'));

-- Enforce at most one active public room per game.
-- "Active" means not finished, so a new public room can be created after a game ends.
CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_one_public_per_game
  ON public.rooms (game_id)
  WHERE room_type = 'public' AND status != 'finished';
