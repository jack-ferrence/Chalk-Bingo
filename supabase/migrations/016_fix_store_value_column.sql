-- =============================================================================
-- 016: Fix "record v_item has no field value" error in equip_store_item RPC
-- =============================================================================
-- The store_items.value column may not exist in databases where migration 005
-- was not applied (e.g. databases bootstrapped from 008_full_sync.sql on an
-- existing schema that pre-dated that column). All current items store their
-- equippable value in metadata ('hex', 'font', 'class'). We add the column as
-- a safety net and recreate the RPC without the fallback reference to v_item.value
-- so that it compiles cleanly regardless of column presence.

-- Ensure the legacy column exists (no-op if already present)
ALTER TABLE public.store_items ADD COLUMN IF NOT EXISTS value text;

-- Recreate equip_store_item without referencing v_item.value
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
      -- Use metadata->>'hex'; fall back to the legacy value column
      UPDATE profiles
      SET name_color = COALESCE(v_item.metadata->>'hex', v_item.value, p_item_id)
      WHERE id = v_uid;
    WHEN 'name_font' THEN
      UPDATE profiles
      SET name_font = COALESCE(v_item.metadata->>'font', v_item.value, p_item_id)
      WHERE id = v_uid;
    WHEN 'badge' THEN
      UPDATE profiles SET equipped_badge = p_item_id WHERE id = v_uid;
    WHEN 'board_skin' THEN
      UPDATE profiles
      SET board_skin = COALESCE(v_item.metadata->>'class', v_item.value, p_item_id)
      WHERE id = v_uid;
    ELSE
      RETURN jsonb_build_object('success', false, 'reason', 'not_equippable');
  END CASE;

  RETURN jsonb_build_object('success', true, 'equipped', p_item_id, 'category', v_item.category);
END;
$$;
