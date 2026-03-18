-- =============================================================================
-- 011: Fix award_game_dabs idempotency check.
--
-- Bug: The previous check used EXISTS(SELECT 1 FROM dabs_transactions WHERE
-- room_id = p_room_id LIMIT 1), which also matched entry_fee and card_swap
-- transactions. This caused the award to be skipped for any NBA game where
-- a player paid an entry fee, meaning no one ever received end-of-game Dobs.
--
-- Fix: Restrict the idempotency check to only look for award-type transactions
-- (participation, squares_marked, lines_completed, finish_N).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.award_game_dabs(p_room_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_card          RECORD;
  v_position_bonus int;
  v_square_dabs   int;
  v_line_dabs     int;
  v_participation int := 3;
  v_total         int;
  v_awarded       int := 0;
  v_already       boolean;
BEGIN
  -- Only check for award-type transactions (not entry_fee or card_swap)
  SELECT EXISTS(
    SELECT 1 FROM dabs_transactions
    WHERE room_id = p_room_id
      AND reason NOT IN ('entry_fee', 'card_swap')
    LIMIT 1
  ) INTO v_already;
  IF v_already THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'already_awarded');
  END IF;

  FOR v_card IN
    SELECT c.user_id, c.lines_completed, c.squares_marked,
      ROW_NUMBER() OVER (
        ORDER BY c.lines_completed DESC, c.squares_marked DESC, c.created_at ASC
      ) AS rank
    FROM public.cards c WHERE c.room_id = p_room_id
  LOOP
    v_position_bonus := CASE v_card.rank
      WHEN 1 THEN 100 WHEN 2 THEN 60 WHEN 3 THEN 40
      WHEN 4 THEN 25  WHEN 5 THEN 15
      ELSE CASE WHEN v_card.rank <= 10 THEN 5 ELSE 0 END
    END;
    v_square_dabs := v_card.squares_marked * 2;
    v_line_dabs   := v_card.lines_completed * 10;
    v_total       := v_square_dabs + v_line_dabs + v_position_bonus + v_participation;

    IF v_square_dabs > 0 THEN
      INSERT INTO public.dabs_transactions (user_id, amount, reason, room_id)
      VALUES (v_card.user_id, v_square_dabs, 'squares_marked', p_room_id);
    END IF;
    IF v_line_dabs > 0 THEN
      INSERT INTO public.dabs_transactions (user_id, amount, reason, room_id)
      VALUES (v_card.user_id, v_line_dabs, 'lines_completed', p_room_id);
    END IF;
    IF v_position_bonus > 0 THEN
      INSERT INTO public.dabs_transactions (user_id, amount, reason, room_id)
      VALUES (v_card.user_id, v_position_bonus, 'finish_' || v_card.rank::text, p_room_id);
    END IF;
    INSERT INTO public.dabs_transactions (user_id, amount, reason, room_id)
    VALUES (v_card.user_id, v_participation, 'participation', p_room_id);

    UPDATE public.profiles SET dabs_balance = dabs_balance + v_total WHERE id = v_card.user_id;
    v_awarded := v_awarded + 1;
  END LOOP;

  RETURN jsonb_build_object('awarded', v_awarded, 'room_id', p_room_id);
END;
$$;
