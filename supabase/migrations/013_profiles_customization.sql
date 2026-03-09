-- Add supporter/customization fields to profiles and update RLS so users
-- can update only their own profile row.

alter table public.profiles
  add column if not exists is_supporter boolean default false,
  add column if not exists supporter_since timestamptz,
  add column if not exists name_color text default '#FFFFFF',
  add column if not exists name_font text default 'default',
  add column if not exists ui_theme text default 'default',
  add column if not exists username_changes_remaining int default 0;

do $$ begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_name_font_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_name_font_check check (
        name_font in ('default','mono','display','serif','rounded')
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_ui_theme_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_ui_theme_check check (
        ui_theme in ('default','midnight','crimson','ocean','emerald')
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_name_color_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_name_color_check check (
        name_color ~ '^#[0-9A-Fa-f]{6}$'
      );
  end if;
end $$;

drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

