-- Helper: count completed bingo lines (0-12) on a 25-square layout.
-- Accepts squares as either flat [s0..s24] or 5x5 [[row0]..[row4]]; flattens internally.
create or replace function public.check_bingo_lines(squares jsonb)
returns int
language plpgsql
immutable
as $$
declare
  flat jsonb;
  r int;
  c int;
  idx int;
  line_count int := 0;
  all_marked boolean;
begin
  if squares is null or jsonb_array_length(squares) < 5 then
    return 0;
  end if;

  -- Flatten to 25-element array: [s0..s24]
  if jsonb_typeof(squares->0) = 'array' then
    flat := '[]'::jsonb;
    for r in 0..4 loop
      for c in 0..3 loop
        flat := flat || (squares->r->c);
      end loop;
      flat := flat || (squares->r->4);
    end loop;
  else
    flat := squares;
  end if;

  -- 5 rows: [0,1,2,3,4], [5..9], [10..14], [15..19], [20..24]
  for r in 0..4 loop
    all_marked := true;
    for c in 0..4 loop
      if (flat->(r*5+c)->>'marked') is distinct from 'true' then
        all_marked := false;
        exit;
      end if;
    end loop;
    if all_marked then line_count := line_count + 1; end if;
  end loop;

  -- 5 columns
  for c in 0..4 loop
    all_marked := true;
    for r in 0..4 loop
      if (flat->(r*5+c)->>'marked') is distinct from 'true' then
        all_marked := false;
        exit;
      end if;
    end loop;
    if all_marked then line_count := line_count + 1; end if;
  end loop;

  -- Main diagonal: 0, 6, 12, 18, 24
  all_marked := true;
  for idx in 0..4 loop
    if (flat->(idx*6)->>'marked') is distinct from 'true' then
      all_marked := false;
      exit;
    end if;
  end loop;
  if all_marked then line_count := line_count + 1; end if;

  -- Anti diagonal: 4, 8, 12, 16, 20
  all_marked := true;
  for idx in 0..4 loop
    if (flat->(4 + idx*4)->>'marked') is distinct from 'true' then
      all_marked := false;
      exit;
    end if;
  end loop;
  if all_marked then line_count := line_count + 1; end if;

  return line_count;
end;
$$;

-- Mark squares matching the stat event on all cards in live rooms for the game, then recalc counts.
-- Runs as SECURITY DEFINER so it can update any card.
create or replace function public.mark_squares_for_event(p_game_id text, p_stat_event jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  flat jsonb;
  new_flat jsonb;
  sq jsonb;
  i int;
  r int;
  c int;
  event_player_id text;
  event_stat_type text;
  event_value numeric;
  marked_count int;
  lines_count int;
  cards_updated int := 0;
  is_5x5 boolean;
begin
  event_player_id := p_stat_event->>'player_id';
  event_stat_type := p_stat_event->>'stat_type';
  event_value := (p_stat_event->>'value')::numeric;

  if event_player_id is null or event_stat_type is null or event_value is null then
    return 0;
  end if;

  for rec in
    select c.id as card_id, c.squares
    from public.cards c
    join public.rooms r on r.id = c.room_id
    where r.game_id = p_game_id and r.status = 'live'
  loop
    -- Flatten squares to 25-element array
    if jsonb_typeof(rec.squares->0) = 'array' then
      is_5x5 := true;
      flat := '[]'::jsonb;
      for r in 0..4 loop
        for c in 0..4 loop
          flat := flat || (rec.squares->r->c);
        end loop;
      end loop;
    else
      is_5x5 := false;
      flat := rec.squares;
    end if;

    -- Build new_flat: mark any square that matches event (player_id, stat_type, not already marked, value >= threshold)
    new_flat := '[]'::jsonb;
    for i in 0..24 loop
      sq := flat->i;
      if sq is not null
         and (sq->>'player_id') = event_player_id
         and (sq->>'stat_type') = event_stat_type
         and (sq->>'marked') is distinct from 'true'
         and event_value >= coalesce((sq->>'threshold')::numeric, 0)
      then
        sq := jsonb_set(sq, '{marked}', 'true'::jsonb);
      end if;
      new_flat := new_flat || sq;
    end loop;

    -- Count marked squares
    select count(*)::int into marked_count
    from jsonb_array_elements(new_flat) e
    where (e->>'marked') = 'true';

    -- Count completed lines
    lines_count := public.check_bingo_lines(new_flat);

    -- Convert back to 5x5 if original was 5x5 (so app keeps same shape)
    if is_5x5 then
      flat := '[]'::jsonb;
      for r in 0..4 loop
        sq := '[]'::jsonb;
        for c in 0..4 loop
          sq := sq || (new_flat->(r*5+c));
        end loop;
        flat := flat || sq;
      end loop;
      new_flat := flat;
    end if;

    update public.cards
    set squares = new_flat,
        squares_marked = marked_count,
        lines_completed = lines_count
    where id = rec.card_id;

    cards_updated := cards_updated + 1;
  end loop;

  return cards_updated;
end;
$$;
