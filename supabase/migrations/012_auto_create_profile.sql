-- Automatically create a profile row whenever a new auth user is created.
-- This runs on the server as SECURITY DEFINER, so it does not depend on the
-- client session being updated before the profile exists.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    NEW.id,
    coalesce(
      NEW.raw_user_meta_data->>'username',
      'Guest_' || left(NEW.id::text, 8)
    )
  )
  on conflict (id) do update
  set username = coalesce(
    excluded.username,
    profiles.username
  );

  return NEW;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
