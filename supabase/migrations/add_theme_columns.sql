-- Add theme columns for Cowbell multi-layer themes.
-- Tier 1: Database schema changes.

alter table public.profiles
  add column if not exists user_theme text default 'challenger';

alter table public.rooms
  add column if not exists room_theme text default null;

