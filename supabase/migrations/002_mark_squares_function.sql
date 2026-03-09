-- Helper: count completed bingo lines (0-12) on a flat 25-element JSONB array.
-- Squares are always stored as flat arrays (index 0 = top-left, 12 = center FREE).
-- Line definitions (match statProcessor.js BINGO_LINES exactly):
--   Rows:    [0-4], [5-9], [10-14], [15-19], [20-24]
--   Cols:    [0,5,10,15,20] … [4,9,14,19,24]
--   Diags:   [0,6,12,18,24] (main), [4,8,12,16,20] (anti)
create or replace function public.check_bingo_lines(squares jsonb)
returns int language plpgsql immutable as $$
declare
  r int; c int; idx int;
  line_count int := 0;
  all_marked boolean;
begin
  if squares is null or jsonb_array_length(squares) < 25 then return 0; end if;

  -- rows
  for r in 0..4 loop
    all_marked := true;
    for c in 0..4 loop
      if (squares->(r*5+c)->>'marked') is distinct from 'true' then all_marked := false; exit; end if;
    end loop;
    if all_marked then line_count := line_count + 1; end if;
  end loop;

  -- columns
  for c in 0..4 loop
    all_marked := true;
    for r in 0..4 loop
      if (squares->(r*5+c)->>'marked') is distinct from 'true' then all_marked := false; exit; end if;
    end loop;
    if all_marked then line_count := line_count + 1; end if;
  end loop;

  -- main diagonal (0,6,12,18,24)
  all_marked := true;
  for idx in 0..4 loop
    if (squares->(idx*6)->>'marked') is distinct from 'true' then all_marked := false; exit; end if;
  end loop;
  if all_marked then line_count := line_count + 1; end if;

  -- anti-diagonal (4,8,12,16,20)
  all_marked := true;
  for idx in 0..4 loop
    if (squares->(4 + idx*4)->>'marked') is distinct from 'true' then all_marked := false; exit; end if;
  end loop;
  if all_marked then line_count := line_count + 1; end if;

  return line_count;
end; $$;

-- Mark squares matching the stat event on all cards in live rooms for the game.
-- Runs as SECURITY DEFINER so it can update any card.
-- Squares are always a flat 25-element JSONB array.
create or replace function public.mark_squares_for_event(p_game_id text, p_stat_event jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare
  rec record;
  new_squares jsonb; sq jsonb;
  i int;
  event_player_id text; event_stat_type text; event_value numeric;
  marked_count int; lines_count int; cards_updated int := 0;
begin
  event_player_id := p_stat_event->>'player_id';
  event_stat_type := p_stat_event->>'stat_type';
  event_value     := (p_stat_event->>'value')::numeric;

  if event_player_id is null or event_stat_type is null or event_value is null then
    return 0;
  end if;

  for rec in
    select c.id as card_id, c.squares
    from public.cards c
    join public.rooms r on r.id = c.room_id
    where r.game_id = p_game_id and r.status = 'live'
  loop
    new_squares := '[]'::jsonb;
    for i in 0..24 loop
      sq := rec.squares->i;
      if sq is not null
         and (sq->>'player_id') = event_player_id
         and (sq->>'stat_type') = event_stat_type
         and (sq->>'marked') is distinct from 'true'
         and event_value >= coalesce((sq->>'threshold')::numeric, 0)
      then
        sq := jsonb_set(sq, '{marked}', 'true'::jsonb);
      end if;
      new_squares := new_squares || sq;
    end loop;

    select count(*)::int into marked_count
    from jsonb_array_elements(new_squares) e
    where (e->>'marked') = 'true';

    lines_count := public.check_bingo_lines(new_squares);

    update public.cards
    set squares = new_squares, squares_marked = marked_count, lines_completed = lines_count
    where id = rec.card_id;

    cards_updated := cards_updated + 1;
  end loop;

  return cards_updated;
end; $$;
