-- ── 007 — More store items, chat_emote category, swap pricing tiers ──

-- A. Add chat_emote to the category constraint
ALTER TABLE public.store_items DROP CONSTRAINT IF EXISTS store_items_category_check;
ALTER TABLE public.store_items ADD CONSTRAINT store_items_category_check
  CHECK (category IN ('name_color', 'name_font', 'badge', 'board_skin', 'chat_emote'));

-- B. Add swap_count to cards table
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS swap_count int NOT NULL DEFAULT 0;

-- C. New name colors
INSERT INTO public.store_items (id, category, name, description, price, metadata, is_active, sort_order)
VALUES
  ('color_cyan',    'name_color', 'Cyan',       'Digital ice',           50,  '{"hex":"#06b6d4"}'::jsonb, true, 120),
  ('color_lime',    'name_color', 'Lime',        'Electric green',        50,  '{"hex":"#84cc16"}'::jsonb, true, 121),
  ('color_rose',    'name_color', 'Rose Gold',   'Elegant flex',          75,  '{"hex":"#f43f5e"}'::jsonb, true, 122),
  ('color_amber',   'name_color', 'Amber Alert', 'Warning: dripping',     50,  '{"hex":"#f59e0b"}'::jsonb, true, 123),
  ('color_indigo',  'name_color', 'Indigo',      'Deep space',            75,  '{"hex":"#6366f1"}'::jsonb, true, 124),
  ('color_teal',    'name_color', 'Teal',        'Ocean floor',           50,  '{"hex":"#14b8a6"}'::jsonb, true, 125),
  ('color_rainbow', 'name_color', 'Rainbow',     'Shifts every game',    200,  '{"hex":"rainbow"}'::jsonb, true, 130)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description,
  price = EXCLUDED.price, metadata = EXCLUDED.metadata,
  is_active = EXCLUDED.is_active, sort_order = EXCLUDED.sort_order;

-- D. New badges
INSERT INTO public.store_items (id, category, name, description, price, metadata, is_active, sort_order)
VALUES
  ('badge_100',   'badge', '100',     'Keep it 💯',          100, '{"emoji":"💯","label":"100"}'::jsonb,    true, 220),
  ('badge_money', 'badge', 'Money',   'Cash money',           150, '{"emoji":"💰","label":"MONEY"}'::jsonb,  true, 221),
  ('badge_eyes',  'badge', 'Eyes',    'Always watching',      100, '{"emoji":"👀","label":"EYES"}'::jsonb,   true, 222),
  ('badge_goat2', 'badge', 'GOAT',    'Greatest of all time', 250, '{"emoji":"🐐","label":"GOAT"}'::jsonb,   true, 223),
  ('badge_ice',   'badge', 'Ice Cold','Clutch performer',     150, '{"emoji":"🧊","label":"ICE"}'::jsonb,    true, 224),
  ('badge_alien', 'badge', 'Alien',   'Out of this world',    100, '{"emoji":"👽","label":"ALIEN"}'::jsonb,  true, 225),
  ('badge_clown', 'badge', 'Clown',   'Class clown energy',   75,  '{"emoji":"🤡","label":"CLOWN"}'::jsonb,  true, 226)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description,
  price = EXCLUDED.price, metadata = EXCLUDED.metadata,
  is_active = EXCLUDED.is_active, sort_order = EXCLUDED.sort_order;

-- E. New board skins
INSERT INTO public.store_items (id, category, name, description, price, metadata, is_active, sort_order)
VALUES
  ('skin_matrix',    'board_skin', 'Matrix',    'Green rain code',   200, '{"class":"matrix"}'::jsonb,    true, 320),
  ('skin_blueprint', 'board_skin', 'Blueprint', 'Technical drawing', 150, '{"class":"blueprint"}'::jsonb, true, 321),
  ('skin_fire',      'board_skin', 'On Fire',   'Flames on marked',  250, '{"class":"fire"}'::jsonb,      true, 322)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description,
  price = EXCLUDED.price, metadata = EXCLUDED.metadata,
  is_active = EXCLUDED.is_active, sort_order = EXCLUDED.sort_order;

-- F. Chat emotes
INSERT INTO public.store_items (id, category, name, description, price, metadata, is_active, sort_order)
VALUES
  ('emote_dab',    'chat_emote', 'Dab',      'The signature move',  25, '{"emote":"🫳","code":":dab:"}'::jsonb,    true, 400),
  ('emote_bingo',  'chat_emote', 'Bingo!',   'Celebrate a line',    25, '{"emote":"🎯","code":":bingo:"}'::jsonb,  true, 401),
  ('emote_sweat',  'chat_emote', 'Sweating', 'Close call',          25, '{"emote":"😰","code":":sweat:"}'::jsonb,  true, 402),
  ('emote_gg',     'chat_emote', 'GG',       'Good game',           25, '{"emote":"🤝","code":":gg:"}'::jsonb,     true, 403),
  ('emote_copium', 'chat_emote', 'Copium',   'Coping hard',         50, '{"emote":"🫠","code":":cope:"}'::jsonb,   true, 404),
  ('emote_nuke',   'chat_emote', 'Nuke',     'Board is nuked',      50, '{"emote":"☢️","code":":nuke:"}'::jsonb,  true, 405)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description,
  price = EXCLUDED.price, metadata = EXCLUDED.metadata,
  is_active = EXCLUDED.is_active, sort_order = EXCLUDED.sort_order;

-- G. Update swap_card_square RPC: tiered pricing (10/50 Dabs), max 2 swaps per game
CREATE OR REPLACE FUNCTION public.swap_card_square(
  p_room_id     uuid,
  p_square_index int,
  p_roster      jsonb DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid         uuid;
  v_room        rooms;
  v_card        cards;
  v_balance     int;
  v_squares     jsonb;
  v_old_square  jsonb;
  v_new_square  jsonb;
  v_player      jsonb;
  v_stat_type   text;
  v_stat_types  text[] := ARRAY[
    'points_10','points_15','points_20','points_25',
    'three_pointer','rebound_5','rebound_10','assist_5','assist_10','steal','block'
  ];
  v_threshold   int;
  v_display     text;
  v_player_count int;
  v_attempts    int := 0;
  v_existing_key text;
  v_new_key     text;
  v_swap_count  int;
  v_swap_cost   int;
  v_player_name text;
  v_player_last text;
  i             int;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  IF p_square_index < 0 OR p_square_index > 24 OR p_square_index = 12 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_square_index');
  END IF;

  SELECT * INTO v_room FROM rooms WHERE id = p_room_id;
  IF v_room.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'room_not_found');
  END IF;
  IF v_room.status != 'lobby' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'game_already_started');
  END IF;

  SELECT * INTO v_card FROM cards WHERE room_id = p_room_id AND user_id = v_uid;
  IF v_card.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_card_found');
  END IF;

  -- Determine swap cost based on how many swaps already used
  v_swap_count := COALESCE(v_card.swap_count, 0);
  IF v_swap_count >= 2 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'max_swaps_reached', 'swap_count', v_swap_count);
  END IF;
  v_swap_cost := CASE WHEN v_swap_count = 0 THEN 10 ELSE 50 END;

  SELECT dabs_balance INTO v_balance FROM profiles WHERE id = v_uid FOR UPDATE;
  IF v_balance < v_swap_cost THEN
    RETURN jsonb_build_object('success', false, 'reason', 'insufficient_dabs', 'balance', v_balance, 'cost', v_swap_cost);
  END IF;

  v_squares    := v_card.squares;
  v_old_square := v_squares->p_square_index;
  v_existing_key := (v_old_square->>'player_id') || ':' || (v_old_square->>'stat_type');

  IF p_roster IS NULL OR jsonb_array_length(p_roster) = 0 THEN
    SELECT jsonb_agg(DISTINCT jsonb_build_object('id', sq->>'player_id', 'name', sq->>'player_name'))
      INTO p_roster
    FROM jsonb_array_elements(v_squares) sq
    WHERE (sq->>'stat_type') != 'free' AND (sq->>'player_id') IS NOT NULL;
  END IF;

  v_player_count := COALESCE(jsonb_array_length(p_roster), 0);
  IF v_player_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_roster_available');
  END IF;

  LOOP
    v_attempts  := v_attempts + 1;
    v_player    := p_roster->(floor(random() * v_player_count)::int);
    v_stat_type := v_stat_types[1 + floor(random() * array_length(v_stat_types, 1))::int];
    v_new_key   := (v_player->>'id') || ':' || v_stat_type;
    EXIT WHEN v_new_key != v_existing_key OR v_attempts >= 20;
  END LOOP;

  v_player_name := v_player->>'name';
  v_player_last := CASE WHEN v_player_name LIKE '% %'
    THEN SUBSTRING(v_player_name FROM POSITION(' ' IN v_player_name) + 1)
    ELSE v_player_name END;

  IF    v_stat_type LIKE 'points!_%'  ESCAPE '!' THEN v_threshold := SUBSTRING(v_stat_type FROM 8)::int;  v_display := v_player_last || ' ' || v_threshold || '+ PTS';
  ELSIF v_stat_type LIKE 'rebound!_%' ESCAPE '!' THEN v_threshold := SUBSTRING(v_stat_type FROM 9)::int;  v_display := v_player_last || ' ' || v_threshold || '+ REB';
  ELSIF v_stat_type LIKE 'assist!_%'  ESCAPE '!' THEN v_threshold := SUBSTRING(v_stat_type FROM 8)::int;  v_display := v_player_last || ' ' || v_threshold || '+ AST';
  ELSIF v_stat_type = 'three_pointer' THEN v_threshold := 1; v_display := v_player_last || ' 1+ 3PM';
  ELSIF v_stat_type = 'steal'         THEN v_threshold := 1; v_display := v_player_last || ' 1+ STL';
  ELSIF v_stat_type = 'block'         THEN v_threshold := 1; v_display := v_player_last || ' 1+ BLK';
  ELSE                                     v_threshold := 1; v_display := v_player_last || ' ' || v_stat_type;
  END IF;

  v_new_square := jsonb_build_object(
    'id',           v_old_square->>'id',
    'player_id',    v_player->>'id',
    'player_name',  v_player_name,
    'stat_type',    v_stat_type,
    'threshold',    v_threshold,
    'display_text', v_display,
    'marked',       false
  );

  v_squares := '[]'::jsonb;
  FOR i IN 0..24 LOOP
    IF i = p_square_index THEN v_squares := v_squares || v_new_square;
    ELSE v_squares := v_squares || (v_card.squares->i); END IF;
  END LOOP;

  UPDATE cards SET squares = v_squares, swap_count = v_swap_count + 1 WHERE id = v_card.id;
  UPDATE profiles SET dabs_balance = dabs_balance - v_swap_cost WHERE id = v_uid;
  INSERT INTO dabs_transactions (user_id, amount, reason, room_id)
    VALUES (v_uid, -v_swap_cost, 'card_swap', p_room_id);

  RETURN jsonb_build_object(
    'success',      true,
    'charged',      v_swap_cost,
    'new_balance',  v_balance - v_swap_cost,
    'swap_count',   v_swap_count + 1,
    'old_square',   v_old_square,
    'new_square',   v_new_square,
    'square_index', p_square_index
  );
END;
$$;
