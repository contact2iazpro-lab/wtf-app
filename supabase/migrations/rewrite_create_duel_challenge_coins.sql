-- Migration : Blitz Défi facturé en coins (×10) au lieu de tickets
-- CLAUDE.md 15/04/2026 : "Blitz Défi — 200 coins pour créer" (tickets SUPPRIMÉS).
-- Remplace le debit ticket -1 par un debit coins -200 avec guard >=200.
-- Le retour JSON expose désormais `coins_remaining` au lieu de `tickets_remaining`.

CREATE OR REPLACE FUNCTION create_duel_challenge(
  p_opponent_id UUID,
  p_category_id TEXT,
  p_category_label TEXT,
  p_question_count INT,
  p_player1_time DECIMAL,
  p_player1_name TEXT
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_duel_id UUID;
  v_p1 UUID;
  v_p2 UUID;
  v_code TEXT;
  v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_attempts INT := 0;
  v_challenge_id UUID;
  v_coins_after INT;
  v_cost INT := 200;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_opponent_id IS NOT NULL AND p_opponent_id = v_user_id THEN
    RAISE EXCEPTION 'Cannot challenge yourself';
  END IF;

  -- Debit 200 coins avec guard — fail si solde insuffisant
  UPDATE profiles
    SET coins = coins - v_cost,
        updated_at = NOW(),
        last_modified = EXTRACT(EPOCH FROM NOW()) * 1000
  WHERE id = v_user_id AND COALESCE(coins, 0) >= v_cost
  RETURNING coins INTO v_coins_after;

  IF v_coins_after IS NULL THEN
    RAISE EXCEPTION 'Insufficient coins';
  END IF;

  -- Upsert duel (paire normalisée player1<player2) si opponent connu
  IF p_opponent_id IS NOT NULL THEN
    IF v_user_id < p_opponent_id THEN
      v_p1 := v_user_id;
      v_p2 := p_opponent_id;
    ELSE
      v_p1 := p_opponent_id;
      v_p2 := v_user_id;
    END IF;

    SELECT id INTO v_duel_id
      FROM duels
      WHERE player1_id = v_p1 AND player2_id = v_p2
      LIMIT 1;

    IF v_duel_id IS NULL THEN
      INSERT INTO duels (player1_id, player2_id)
        VALUES (v_p1, v_p2)
        RETURNING id INTO v_duel_id;
    END IF;
  END IF;

  -- Génère un code 6 chars unique (retry 5× max)
  LOOP
    v_attempts := v_attempts + 1;
    v_code := '';
    FOR i IN 1..6 LOOP
      v_code := v_code || substr(v_chars, floor(random() * length(v_chars))::int + 1, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM challenges WHERE code = v_code);
    IF v_attempts >= 5 THEN
      RAISE EXCEPTION 'Failed to generate unique challenge code';
    END IF;
  END LOOP;

  INSERT INTO challenges (
    duel_id, code, category_id, category_label, question_count,
    player1_id, player1_name, player1_time,
    player2_id, status, expires_at
  ) VALUES (
    v_duel_id, v_code, p_category_id, p_category_label, p_question_count,
    v_user_id, p_player1_name, p_player1_time,
    p_opponent_id, 'pending', NOW() + INTERVAL '48 hours'
  )
  RETURNING id INTO v_challenge_id;

  RETURN json_build_object(
    'challenge_id', v_challenge_id,
    'code', v_code,
    'duel_id', v_duel_id,
    'coins_remaining', v_coins_after
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_duel_challenge(UUID, TEXT, TEXT, INT, DECIMAL, TEXT) TO authenticated;
