-- RPC: generate or return existing card for the current user in a room.
-- Stores FLAT 25-element JSONB array. Uses ESPN player IDs when p_players provided.
-- Canonical stat types: points_10/15/20/25, rebound_5/10, assist_5/10, three_pointer, steal, block.

create or replace function public.generate_card_for_room(p_room_id uuid, p_players jsonb default null)
returns setof public.cards language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid;
  v_room_exists boolean;
  v_existing public.cards;
  v_players jsonb;
  v_player_count int;
  v_stat_types text[] := array['points_10','points_15','points_20','points_25','three_pointer','rebound_5','rebound_10','assist_5','assist_10','steal','block'];
  v_sq jsonb; v_free jsonb;
  v_flat jsonb := '[]'::jsonb;
  v_24 jsonb := '[]'::jsonb;
  i int; p_idx int; s_idx int;
  p_id text; p_name text; p_last text; st text; v_threshold int; v_display text;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select exists(select 1 from rooms where id = p_room_id and status in ('lobby','live'))
    into v_room_exists;
  if not v_room_exists then
    raise exception 'Room not found or not joinable (status must be lobby or live)';
  end if;

  select c.* into v_existing from cards c
    where c.room_id = p_room_id and c.user_id = v_uid limit 1;
  if v_existing.id is not null then
    return next v_existing; return;
  end if;

  insert into room_participants (room_id, user_id)
    values (p_room_id, v_uid)
    on conflict (room_id, user_id) do nothing;

  if p_players is not null and jsonb_array_length(p_players) > 0 then
    v_players := p_players;
  else
    v_players := '[
      {"id":"2544","name":"LeBron James","lastName":"James"},
      {"id":"3975","name":"Stephen Curry","lastName":"Curry"},
      {"id":"3032977","name":"Giannis Antetokounmpo","lastName":"Antetokounmpo"},
      {"id":"3112335","name":"Nikola Jokić","lastName":"Jokić"},
      {"id":"3202","name":"Kevin Durant","lastName":"Durant"},
      {"id":"4065648","name":"Jayson Tatum","lastName":"Tatum"},
      {"id":"3945274","name":"Luka Dončić","lastName":"Dončić"},
      {"id":"3059318","name":"Joel Embiid","lastName":"Embiid"},
      {"id":"3136193","name":"Devin Booker","lastName":"Booker"},
      {"id":"3908809","name":"Donovan Mitchell","lastName":"Mitchell"}
    ]'::jsonb;
  end if;

  v_player_count := jsonb_array_length(v_players);

  for i in 0..23 loop
    p_idx  := floor(random() * v_player_count)::int;
    s_idx  := 1 + floor(random() * 11)::int;
    p_id   := v_players->p_idx->>'id';
    p_name := v_players->p_idx->>'name';
    p_last := coalesce(v_players->p_idx->>'lastName', p_name);
    st     := v_stat_types[s_idx];

    if st like 'points\_%' then
      v_threshold := coalesce((regexp_replace(st, '^points_', ''))::int, 0);
      v_display   := p_last || ' ' || v_threshold || '+ PTS';
    elsif st like 'rebound\_%' then
      v_threshold := coalesce((regexp_replace(st, '^rebound_', ''))::int, 0);
      v_display   := p_last || ' ' || v_threshold || '+ REB';
    elsif st like 'assist\_%' then
      v_threshold := coalesce((regexp_replace(st, '^assist_', ''))::int, 0);
      v_display   := p_last || ' ' || v_threshold || '+ AST';
    elsif st = 'three_pointer' then v_threshold := 1; v_display := p_last || ' 1+ 3PM';
    elsif st = 'steal'         then v_threshold := 1; v_display := p_last || ' 1+ STL';
    elsif st = 'block'         then v_threshold := 1; v_display := p_last || ' 1+ BLK';
    else v_threshold := 1; v_display := p_last || ' ' || st;
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

  v_flat := '[]'::jsonb;
  for i in 0..11  loop v_flat := v_flat || (v_24->i); end loop;
  v_flat := v_flat || v_free;
  for i in 12..23 loop v_flat := v_flat || (v_24->i); end loop;

  insert into cards (room_id, user_id, squares, lines_completed, squares_marked)
    values (p_room_id, v_uid, v_flat, 0, 1)
    returning * into v_existing;

  return next v_existing;
end; $$;
