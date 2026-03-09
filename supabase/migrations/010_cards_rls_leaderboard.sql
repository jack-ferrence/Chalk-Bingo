-- Replace the "own-card-only" SELECT policy with one that lets any room
-- participant read all cards in rooms they have joined.
-- This is required for the leaderboard query in Leaderboard.jsx, which
-- selects all cards for a room. With the old policy, RLS silently filtered
-- every other player's card and the leaderboard always showed only 1 row.

drop policy if exists "cards_select_own" on public.cards;

create policy "cards_select_same_room" on public.cards
  for select to authenticated
  using (
    room_id in (
      select rp.room_id
      from public.room_participants rp
      where rp.user_id = auth.uid()
    )
  );
