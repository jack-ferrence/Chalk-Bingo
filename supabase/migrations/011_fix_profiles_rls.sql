-- Fix profiles SELECT policy for databases provisioned from the individual
-- migration files (001_initial_schema.sql).
--
-- The original policy "profiles_select_own" restricted SELECT to a user's
-- own profile row. This broke leaderboard username resolution and chat,
-- which need to look up other players' usernames.
--
-- run_all_migrations.sql already has the correct "profiles_select_all"
-- policy. This migration brings existing databases in sync.
--
-- Run via:
--   psql $DATABASE_URL -f supabase/migrations/011_fix_profiles_rls.sql
-- Or paste into the Supabase SQL Editor dashboard.

drop policy if exists "profiles_select_own" on public.profiles;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'profiles'
      and policyname = 'profiles_select_all'
  ) then
    create policy "profiles_select_all"
      on public.profiles
      for select to authenticated
      using (true);
  end if;
end $$;
