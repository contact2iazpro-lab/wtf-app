-- apply_currency_delta — Point unique de modification des devises joueur
-- Signature moderne : p_delta JSONB + reason + nonce anti-replay + session_id
-- Version ×10, sans tickets (colonne droppée 16/04/2026)
--
-- Voir rewrite_apply_currency_delta_no_tickets.sql pour la migration de référence.
-- Ce fichier est synchronisé avec la version déployée sur Supabase.

CREATE OR REPLACE FUNCTION public.apply_currency_delta(
  p_delta       JSONB,
  p_reason      TEXT,
  p_client_nonce TEXT,
  p_session_id  TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id       UUID := auth.uid();
  v_coin_delta    INT  := COALESCE((p_delta->>'coins')::INT, 0);
  v_hint_delta    INT  := COALESCE((p_delta->>'hints')::INT, 0);
  v_energy_delta  INT  := COALESCE((p_delta->>'energy')::INT, 0);
  v_new_state     JSONB;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  IF abs(v_coin_delta)   > 10000 THEN RAISE EXCEPTION 'delta_too_large: coins'; END IF;
  IF abs(v_hint_delta)   > 100   THEN RAISE EXCEPTION 'delta_too_large: hints'; END IF;
  IF abs(v_energy_delta) > 10    THEN RAISE EXCEPTION 'delta_too_large: energy'; END IF;
  IF p_reason IS NULL OR length(p_reason) = 0 THEN RAISE EXCEPTION 'reason_required'; END IF;
  IF p_client_nonce IS NULL OR length(p_client_nonce) < 8 THEN RAISE EXCEPTION 'nonce_required'; END IF;

  INSERT INTO mutation_ledger (user_id, kind, payload, reason, client_nonce, session_id)
  VALUES (v_user_id, 'currency_delta', p_delta, p_reason, p_client_nonce, p_session_id);

  UPDATE profiles
     SET coins  = GREATEST(0, coins + v_coin_delta),
         hints  = GREATEST(0, hints + v_hint_delta),
         energy = GREATEST(0, LEAST(energy + v_energy_delta, 5)),
         updated_at = NOW()
   WHERE id = v_user_id
  RETURNING jsonb_build_object('coins', coins, 'hints', hints, 'energy', energy)
  INTO v_new_state;

  IF v_new_state IS NULL THEN RAISE EXCEPTION 'profile_not_found for user %', v_user_id; END IF;
  RETURN v_new_state;
END;
$function$;

-- get_balances — lecture rapide des soldes (sans tickets)
CREATE OR REPLACE FUNCTION public.get_balances()
RETURNS TABLE(coins integer, hints integer, energy integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT profiles.coins, profiles.hints, profiles.energy
  FROM profiles
  WHERE id = auth.uid();
END;
$function$;

GRANT EXECUTE ON FUNCTION public.apply_currency_delta(JSONB, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_balances() TO authenticated;
