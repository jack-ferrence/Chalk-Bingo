-- Initial schema for Cowbell

-- Ensure required extension for gen_random_uuid (usually enabled by default on Supabase)
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id),
  username text unique not null,
  is_supporter boolean default false,
  supporter_since timestamptz,
  name_color text default '#FFFFFF',
  name_font text default 'default',
  ui_theme text default 'default',
  username_changes_remaining int default 0,
  user_theme text default 'challenger',
  created_at timestamptz default now(),
  constraint profiles_name_font_check check (
    name_font in ('default','mono','display','serif','rounded')
  ),
  constraint profiles_ui_theme_check check (
    ui_theme in ('default','midnight','crimson','ocean','emerald')
  ),
  constraint profiles_name_color_check check (
    name_color ~ '^#[0-9A-Fa-f]{6}$'
  )
);

-- rooms
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  game_id text not null,
  status text default 'lobby',
  created_at timestamptz default now(),
  starts_at timestamptz,
  room_theme text default null
);

-- cards
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms (id),
  user_id uuid references public.profiles (id),
  squares jsonb not null,
  lines_completed int default 0,
  squares_marked int default 0,
  created_at timestamptz default now(),
  unique (room_id, user_id)
);

-- stat_events
create table if not exists public.stat_events (
  id uuid primary key default gen_random_uuid(),
  game_id text not null,
  player_id text not null,
  stat_type text not null,
  value numeric not null,
  period int,
  fired_at timestamptz default now(),
  unique (game_id, player_id, stat_type, value, period)
);

-- room_participants
create table if not exists public.room_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms (id),
  user_id uuid references public.profiles (id),
  joined_at timestamptz default now(),
  unique (room_id, user_id)
);

-- Enable Row Level Security on all tables
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.cards enable row level security;
alter table public.stat_events enable row level security;
alter table public.room_participants enable row level security;

-- RLS Policies

-- Users can read all rooms
create policy "rooms_select_all"
  on public.rooms
  for select
  to authenticated
  using (true);

-- Users can only read their own cards
create policy "cards_select_own"
  on public.cards
  for select
  to authenticated
  using (user_id = auth.uid());

-- Users can only insert their own cards
create policy "cards_insert_own"
  on public.cards
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Users can only update their own cards
create policy "cards_update_own"
  on public.cards
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Users can only delete their own cards
create policy "cards_delete_own"
  on public.cards
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Users can read all room_participants
create policy "room_participants_select_all"
  on public.room_participants
  for select
  to authenticated
  using (true);

-- Users can insert themselves into room_participants
create policy "room_participants_insert_self"
  on public.room_participants
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- stat_events are readable by all authenticated users
create policy "stat_events_select_all"
  on public.stat_events
  for select
  to authenticated
  using (true);

-- All authenticated users can read all profiles.
-- Usernames are not sensitive; leaderboard and chat both need to resolve
-- other players' usernames. See also 011_fix_profiles_rls.sql for the
-- migration that updates existing databases provisioned from this file.
create policy "profiles_select_all"
  on public.profiles
  for select
  to authenticated
  using (true);

create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

