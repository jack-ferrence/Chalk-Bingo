-- Migration 010: Fix "record v_item has no field cost" error in store RPCs
-- The cost column may not exist in all environments (e.g. when migration 005
-- was not applied). Adding it ensures the COALESCE(v_item.price, v_item.cost, 0)
-- in purchase_store_item and equip_store_item resolves without a field error.
-- Functions are recreated to force PL/pgSQL to recompile against the new schema.

ALTER TABLE public.store_items ADD COLUMN IF NOT EXISTS cost int;

CREATE OR REPLACE FUNCTION public.purchase_store_item(p_item_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid           uuid;
  v_item          store_items;
  v_balance       int;
  v_already_owned boolean;
  v_price         int;
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
    'success', true, 'charged', v_price,
    'item_id', p_item_id, 'new_balance', v_balance - v_price
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.equip_store_item(p_item_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid   uuid;
  v_item  store_items;
  v_owned boolean;
  v_price int;
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
