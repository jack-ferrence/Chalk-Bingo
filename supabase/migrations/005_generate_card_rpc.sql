-- RPC: generate or return existing card for the current user in a room.
-- Uses same mock players and stat types as cardGenerator.js; builds 5x5 grid with FREE at center.

create or replace function public.generate_card_for_room(p_room_id uuid)
returns setof public.cards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_room_exists boolean;
  v_existing public.cards;
  v_players jsonb;
  v_stat_types text[] := array['points_10','points_15','three_pointer','rebound','assist','steal','block'];
  v_flat jsonb := '[]'::jsonb;
  v_sq jsonb;
  v_free jsonb;
  v_grid jsonb;
  v_row jsonb;
  i int;
  j int;
  p_idx int;
  s_idx int;
  p_id text;
  p_name text;
  st text;
  v_threshold int;
  v_display text;
  v_24 jsonb := '[]'::jsonb;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select exists(select 1 from rooms where id = p_room_id and status in ('lobby','live')) into v_room_exists;
  if not v_room_exists then
    raise exception 'Room not found or not joinable (status must be lobby or live)';
  end if;

  select c.* into v_existing from cards c where c.room_id = p_room_id and c.user_id = v_uid limit 1;
  if v_existing.id is not null then
    return next v_existing;
    return;
  end if;

  insert into room_participants (room_id, user_id)
  values (p_room_id, v_uid)
  on conflict (room_id, user_id) do nothing;

  -- Mock players (same as cardGenerator.js)
  v_players := '[
    {"id":"player_lebron","name":"LeBron James"},
    {"id":"player_curry","name":"Stephen Curry"},
    {"id":"player_giannis","name":"Giannis Antetokounmpo"},
    {"id":"player_jokic","name":"Nikola Jokić"},
    {"id":"player_durant","name":"Kevin Durant"},
    {"id":"player_tatum","name":"Jayson Tatum"},
    {"id":"player_doncic","name":"Luka Dončić"},
    {"id":"player_embiid","name":"Joel Embiid"},
    {"id":"player_booker","name":"Devin Booker"},
    {"id":"player_mitchell","name":"Donovan Mitchell"}
  ]'::jsonb;

  -- Build 24 random squares (buildDisplay logic)
  for i in 0..23 loop
    p_idx := floor(random() * 10)::int;
    s_idx := 1 + floor(random() * 7)::int;
    p_id := v_players->p_idx->>'id';
    p_name := v_players->p_idx->>'name';
    st := v_stat_types[s_idx];

    if st like 'points\_%' then
      v_threshold := coalesce((regexp_replace(st, '^points_', ''))::int, 0);
      v_display := p_name || ' ' || v_threshold || '+ PTS';
    elsif st = 'three_pointer' then
      v_threshold := 1;
      v_display := p_name || ' 1+ 3PM';
    elsif st = 'rebound' then
      v_threshold := 5;
      v_display := p_name || ' 5+ REB';
    elsif st = 'assist' then
      v_threshold := 5;
      v_display := p_name || ' 5+ AST';
    elsif st = 'steal' then
      v_threshold := 1;
      v_display := p_name || ' 1+ STL';
    elsif st = 'block' then
      v_threshold := 1;
      v_display := p_name || ' 1+ BLK';
    else
      v_threshold := 1;
      v_display := p_name || ' ' || st;
    end if;

    v_sq := jsonb_build_object(
      'id', gen_random_uuid(),
      'player_id', p_id,
      'player_name', p_name,
      'stat_type', st,
      'threshold', v_threshold,
      'display_text', v_display,
      'marked', false
    );
    v_24 := v_24 || v_sq;
  end loop;

  v_free := jsonb_build_object(
    'id', gen_random_uuid(),
    'player_id', null,
    'player_name', null,
    'stat_type', 'free',
    'threshold', 0,
    'display_text', 'FREE',
    'marked', true
  );

  -- Build flat 25: indices 0-11 from v_24[0..11], 12 = FREE, 13-24 from v_24[12..23]
  v_flat := '[]'::jsonb;
  for i in 0..11 loop
    v_flat := v_flat || (v_24->i);
  end loop;
  v_flat := v_flat || v_free;
  for i in 12..23 loop
    v_flat := v_flat || (v_24->i);
  end loop;

  -- Convert to 5x5 grid
  v_grid := '[]'::jsonb;
  for i in 0..4 loop
    v_row := '[]'::jsonb;
    for j in 0..4 loop
      v_row := v_row || (v_flat->(i*5+j));
    end loop;
    v_grid := v_grid || v_row;
  end loop;

  insert into cards (room_id, user_id, squares, lines_completed, squares_marked)
  values (p_room_id, v_uid, v_grid, 0, 1)
  returning * into v_existing;

  return next v_existing;
end;
$$;
