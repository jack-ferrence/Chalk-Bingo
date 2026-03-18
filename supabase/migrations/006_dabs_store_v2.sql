-- =============================================================================
-- 006: Dabs Store v2 — user_inventory, equipped_badge, board_skin, new RPCs
-- =============================================================================

-- ── A. Expand store_items with new schema columns ────────────────────────────
ALTER TABLE public.store_items
  ADD COLUMN IF NOT EXISTS name        text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS price       int,
  ADD COLUMN IF NOT EXISTS metadata    jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_active   boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at  timestamptz DEFAULT now();

-- Migrate existing rows: copy label→name, cost→price, value→metadata
UPDATE public.store_items SET
  name        = label,
  price       = cost,
  is_active   = true,
  metadata    = CASE category
    WHEN 'name_color' THEN jsonb_build_object('hex',   value)
    WHEN 'name_font'  THEN jsonb_build_object('font',  value)
    WHEN 'badge'      THEN jsonb_build_object('emoji', value, 'label', upper(label))
    WHEN 'board_skin' THEN jsonb_build_object('class', value)
    ELSE '{}'::jsonb
  END
WHERE name IS NULL;

-- ── B. Upsert new catalog (replaces overlapping IDs with v2 data) ─────────────
INSERT INTO public.store_items (id, category, name, description, price, metadata, sort_order, is_active) VALUES
  -- Name Colors
  ('color_orange',   'name_color', 'Blaze Orange',   'The Dabber signature',       50,  '{"hex":"#ff6b35"}', 1,  true),
  ('color_gold',     'name_color', 'Gold Rush',      'Winner winner',              50,  '{"hex":"#f59e0b"}', 2,  true),
  ('color_emerald',  'name_color', 'Emerald',        'Cool and collected',         50,  '{"hex":"#22c55e"}', 3,  true),
  ('color_ice_blue', 'name_color', 'Ice Blue',       'Frost bite',                 50,  '{"hex":"#3b82f6"}', 4,  true),
  ('color_purple',   'name_color', 'Royal Purple',   'Crown energy',               50,  '{"hex":"#8b5cf6"}', 5,  true),
  ('color_hot_pink', 'name_color', 'Hot Pink',       'Stand out from the crowd',   50,  '{"hex":"#ec4899"}', 6,  true),
  ('color_crimson',  'name_color', 'Crimson',        'Blood red intensity',        50,  '{"hex":"#dc2626"}', 7,  true),
  ('color_white',    'name_color', 'Clean White',    'Back to basics',             25,  '{"hex":"#f0f0ff"}', 8,  true),
  -- Name Fonts
  ('font_mono',      'name_font',  'Monospace',  'The default arcade look',        25,  '{"font":"mono"}',    1,  true),
  ('font_display',   'name_font',  'Display',    'Bold and blocky headlines',      75,  '{"font":"display"}', 2,  true),
  ('font_serif',     'name_font',  'Serif',      'Old-school newspaper type',      75,  '{"font":"serif"}',   3,  true),
  ('font_rounded',   'name_font',  'Rounded',    'Smooth and friendly',            75,  '{"font":"rounded"}', 4,  true),
  -- Badges
  ('badge_flame',    'badge',      'On Fire',        'For hot streaks',            100, '{"emoji":"🔥","label":"ON FIRE"}',  1, true),
  ('badge_crown',    'badge',      'Champion',       'First place finisher',       150, '{"emoji":"👑","label":"CHAMP"}',    2, true),
  ('badge_lightning','badge',      'Lightning',      'Speed demon',                100, '{"emoji":"⚡","label":"FAST"}',     3, true),
  ('badge_diamond',  'badge',      'Diamond Hands',  'Never gives up',             200, '{"emoji":"💎","label":"DIAMOND"}',  4, true),
  ('badge_ghost',    'badge',      'Ghost',          'Silent but deadly',          100, '{"emoji":"👻","label":"GHOST"}',    5, true),
  ('badge_rocket',   'badge',      'Rocket',         'To the moon',                100, '{"emoji":"🚀","label":"LAUNCH"}',   6, true),
  ('badge_skull',    'badge',      'Skull',          'Fear the reaper',            150, '{"emoji":"💀","label":"SKULL"}',    7, true),
  ('badge_star',     'badge',      'All-Star',       'MVP vibes',                  200, '{"emoji":"⭐","label":"ALL-STAR"}', 8, true),
  -- Board Skins
  ('skin_default',   'board_skin', 'Default',      'Standard arcade grid',           0,  '{"class":"default"}', 1, true),
  ('skin_neon',      'board_skin', 'Neon Glow',    'Electric borders that pulse',   150, '{"class":"neon"}',    2, true),
  ('skin_retro',     'board_skin', 'Retro CRT',    'Scanlines and phosphor glow',   150, '{"class":"retro"}',   3, true),
  ('skin_minimal',   'board_skin', 'Minimal',      'Thin lines, lots of space',     100, '{"class":"minimal"}', 4, true),
  ('skin_gold',      'board_skin', 'Gold Edition', 'Luxury gold borders',           200, '{"class":"gold"}',    5, true)
ON CONFLICT (id) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  price       = EXCLUDED.price,
  metadata    = EXCLUDED.metadata,
  sort_order  = EXCLUDED.sort_order,
  is_active   = EXCLUDED.is_active;

-- ── C. User inventory table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_inventory (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id      text NOT NULL REFERENCES public.store_items(id),
  purchased_at timestamptz DEFAULT now(),
  UNIQUE(user_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_user_inventory_user ON public.user_inventory(user_id);

ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventory_select_own" ON public.user_inventory;
CREATE POLICY "inventory_select_own" ON public.user_inventory
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ── D. Add equipped_badge + board_skin columns to profiles ───────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS equipped_badge text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS board_skin     text    DEFAULT 'default';

-- ── E. purchase_store_item RPC ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.purchase_store_item(p_item_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid            uuid;
  v_item           store_items;
  v_balance        int;
  v_already_owned  boolean;
  v_price          int;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  SELECT * INTO v_item FROM store_items WHERE id = p_item_id AND is_active = true;
  IF v_item.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'item_not_found');
  END IF;

  v_price := COALESCE(v_item.price, v_item.cost, 0);

  IF v_price = 0 THEN
    RETURN jsonb_build_object('success', true, 'charged', 0, 'reason', 'free_item');
  END IF;

  SELECT EXISTS(SELECT 1 FROM user_inventory WHERE user_id = v_uid AND item_id = p_item_id)
    INTO v_already_owned;
  IF v_already_owned THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_owned');
  END IF;

  SELECT dabs_balance INTO v_balance FROM profiles WHERE id = v_uid FOR UPDATE;

  IF v_balance < v_price THEN
    RETURN jsonb_build_object('success', false, 'reason', 'insufficient_dabs', 'balance', v_balance, 'cost', v_price);
  END IF;

  UPDATE profiles SET dabs_balance = dabs_balance - v_price WHERE id = v_uid;
  INSERT INTO dabs_transactions (user_id, amount, reason, room_id)
    VALUES (v_uid, -v_price, 'store_purchase:' || p_item_id, NULL);
  INSERT INTO user_inventory (user_id, item_id) VALUES (v_uid, p_item_id);

  RETURN jsonb_build_object(
    'success',     true,
    'charged',     v_price,
    'item_id',     p_item_id,
    'new_balance', v_balance - v_price
  );
END;
$$;

-- ── F. equip_store_item RPC ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.equip_store_item(p_item_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid    uuid;
  v_item   store_items;
  v_owned  boolean;
  v_price  int;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  SELECT * INTO v_item FROM store_items WHERE id = p_item_id;
  IF v_item.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'item_not_found');
  END IF;

  v_price := COALESCE(v_item.price, v_item.cost, 0);
  IF v_price > 0 THEN
    SELECT EXISTS(SELECT 1 FROM user_inventory WHERE user_id = v_uid AND item_id = p_item_id)
      INTO v_owned;
    IF NOT v_owned THEN
      RETURN jsonb_build_object('success', false, 'reason', 'not_owned');
    END IF;
  END IF;

  CASE v_item.category
    WHEN 'name_color' THEN
      UPDATE profiles SET name_color = COALESCE(v_item.metadata->>'hex', v_item.value) WHERE id = v_uid;
    WHEN 'name_font' THEN
      UPDATE profiles SET name_font = COALESCE(v_item.metadata->>'font', v_item.value) WHERE id = v_uid;
    WHEN 'badge' THEN
      UPDATE profiles SET equipped_badge = p_item_id WHERE id = v_uid;
    WHEN 'board_skin' THEN
      UPDATE profiles SET board_skin = COALESCE(v_item.metadata->>'class', v_item.value) WHERE id = v_uid;
    ELSE
      RETURN jsonb_build_object('success', false, 'reason', 'not_equippable');
  END CASE;

  RETURN jsonb_build_object('success', true, 'equipped', p_item_id, 'category', v_item.category);
END;
$$;

-- ── G. unequip_badge RPC ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.unequip_badge()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE profiles SET equipped_badge = NULL WHERE id = auth.uid();
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── H. swap_card_square — updated signature (returns jsonb, accepts roster) ──
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
  v_swap_cost   int := 5;
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

  SELECT dabs_balance INTO v_balance FROM profiles WHERE id = v_uid FOR UPDATE;
  IF v_balance < v_swap_cost THEN
    RETURN jsonb_build_object('success', false, 'reason', 'insufficient_dabs', 'balance', v_balance, 'cost', v_swap_cost);
  END IF;

  v_squares    := v_card.squares;
  v_old_square := v_squares->p_square_index;
  v_existing_key := (v_old_square->>'player_id') || ':' || (v_old_square->>'stat_type');

  -- Build roster: prefer passed-in, fall back to extracting from card
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

  -- Generate replacement square
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

  -- Rebuild squares
  v_squares := '[]'::jsonb;
  FOR i IN 0..24 LOOP
    IF i = p_square_index THEN v_squares := v_squares || v_new_square;
    ELSE v_squares := v_squares || (v_card.squares->i); END IF;
  END LOOP;

  UPDATE cards SET squares = v_squares WHERE id = v_card.id;
  UPDATE profiles SET dabs_balance = dabs_balance - v_swap_cost WHERE id = v_uid;
  INSERT INTO dabs_transactions (user_id, amount, reason, room_id)
    VALUES (v_uid, -v_swap_cost, 'card_swap', p_room_id);

  RETURN jsonb_build_object(
    'success',      true,
    'charged',      v_swap_cost,
    'new_balance',  v_balance - v_swap_cost,
    'old_square',   v_old_square,
    'new_square',   v_new_square,
    'square_index', p_square_index
  );
END;
$$;

-- ── I. Realtime ───────────────────────────────────────────────────────────────
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_inventory;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
