-- create_duel_challenge — RPC atomique pour créer un défi Blitz
--
-- Remplace la cascade client (getOrCreateDuel + createDuelRound + applyCurrencyDelta)
-- par une seule transaction serveur. Garanties :
--   1. Debit ticket et création challenge sont atomiques (tout ou rien).
--   2. Upsert duel (paire normalisée player1<player2) dans la même txn.
--   3. Code 6 chars généré côté serveur, unique, avec retry si collision.
--   4. Échec rapide si tickets insuffisants (pas de création challenge orphelin).
--
-- Usage client :
--   const { data, error } = await supabase.rpc('create_duel_challenge', {
--     p_opponent_id: opponentUuid,   -- nullable (défi public)
--     p_category_id: 'sport',
--     p_category_label: 'Sport',
--     p_question_count: 10,
--     p_player1_time: 24.56,
--     p_player1_name: 'Michael'
--   })
--   // data = { challenge_id, code, duel_id, tickets_remaining }
--
-- Sécurité : SECURITY DEFINER + auth.uid() utilisé comme player1_id systématique.
-- Le client ne peut pas se faire passer pour un autre joueur.

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
  v_tickets INT;
  v_duel_id UUID;
  v_p1 UUID;
  v_p2 UUID;
  v_code TEXT;
  v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_attempts INT := 0;
  v_challenge_id UUID;
  v_tickets_after INT;
BEGIN
  -- Auth guard
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validation : opposant ne peut pas être soi-même
  IF p_opponent_id IS NOT NULL AND p_opponent_id = v_user_id THEN
    RAISE EXCEPTION 'Cannot challenge yourself';
  END IF;

  -- Debit ticket avec guard >=1 — fail si pas assez
  UPDATE profiles
    SET tickets = tickets - 1,
        updated_at = NOW(),
        last_modified = EXTRACT(EPOCH FROM NOW()) * 1000
  WHERE id = v_user_id AND COALESCE(tickets, 0) >= 1
  RETURNING tickets INTO v_tickets_after;

  IF v_tickets_after IS NULL THEN
    RAISE EXCEPTION 'Insufficient tickets';
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

  -- Insertion du challenge
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
    'tickets_remaining', v_tickets_after
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant exec au rôle authenticated (sinon RLS bloque)
GRANT EXECUTE ON FUNCTION create_duel_challenge(UUID, TEXT, TEXT, INT, DECIMAL, TEXT) TO authenticated;
