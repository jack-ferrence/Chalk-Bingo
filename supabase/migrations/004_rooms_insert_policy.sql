-- Allow authenticated users to create rooms (required for "Create Room" to work)
create policy "rooms_insert_authenticated"
  on public.rooms
  for insert
  to authenticated
  with check (created_by = auth.uid());
