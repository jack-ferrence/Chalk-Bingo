-- Add room creator for status controls (Start Game / End Game)
alter table public.rooms
  add column if not exists created_by uuid references public.profiles (id);

-- Only the creator can update the room (e.g. status)
create policy "rooms_update_creator"
  on public.rooms
  for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());
