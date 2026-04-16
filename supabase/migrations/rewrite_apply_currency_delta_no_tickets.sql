-- Migration : apply_currency_delta sans tickets + cap énergie corrigé à 5
-- CLAUDE.md 15/04/2026 :
--   - Tickets SUPPRIMÉS (coût en coins direct)
--   - Énergie cap 5 (régén +1/8h) — la version déployée plafonne à 10, bug à fix
--
-- Reconstruite à partir du dump prod de apply_currency_delta :
--   - Signature : (p_delta JSONB, p_reason TEXT, p_client_nonce TEXT, p_session_id TEXT)
--   - Anti-replay : insert dans mutation_ledger (kind='currency_delta')
--   - Guards : delta_too_large, reason_required, nonce_required
--   - Retour : jsonb_build_object des colonnes modifiées
--
-- Changements vs prod :
--   ✗ retire v_ticket_delta + UPDATE profiles.tickets
--   ✗ retire 'tickets' du RETURNING jsonb_build_object
--   ✓ remplace LEAST(..., 10) par LEAST(..., 5) pour l'énergie
--
-- ⚠️ PRÉ-REQUIS côté app :
--   - Vérifier que usePlayerProfile.js (ligne 111) clamp aussi à 5 optimistiquement
--     (actuellement : Math.min((prev.energy ?? 0) + (delta.energy ?? 0), 10))
--   - La contrainte CHECK profiles_energy_bounds doit être `energy BETWEEN 0 AND 5`
--     (si elle est actuellement 0..10, la passer à 0..5 via ALTER TABLE séparée)

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

  -- Guards anti-abus
  IF abs(v_coin_delta)   > 10000 THEN RAISE EXCEPTION 'delta_too_large: coins'; END IF;
  IF abs(v_hint_delta)   > 100   THEN RAISE EXCEPTION 'delta_too_large: hints'; END IF;
  IF abs(v_energy_delta) > 10    THEN RAISE EXCEPTION 'delta_too_large: energy'; END IF;
  IF p_reason IS NULL OR length(p_reason) = 0 THEN RAISE EXCEPTION 'reason_required'; END IF;
  IF p_client_nonce IS NULL OR length(p_client_nonce) < 8 THEN RAISE EXCEPTION 'nonce_required'; END IF;

  -- Anti-replay : nonce unique via mutation_ledger
  INSERT INTO mutation_ledger (user_id, kind, payload, reason, client_nonce, session_id)
  VALUES (v_user_id, 'currency_delta', p_delta, p_reason, p_client_nonce, p_session_id);

  UPDATE profiles
     SET coins  = GREATEST(0, coins + v_coin_delta),
         hints  = GREATEST(0, hints + v_hint_delta),
         energy = GREATEST(0, LEAST(energy + v_energy_delta, 5)),
         updated_at = NOW()
   WHERE id = v_user_id
  RETURNING jsonb_build_object(
    'coins',  coins,
    'hints',  hints,
    'energy', energy
  )
  INTO v_new_state;

  IF v_new_state IS NULL THEN RAISE EXCEPTION 'profile_not_found for user %', v_user_id; END IF;
  RETURN v_new_state;
END;
$function$;

-- ============================================================================
-- get_balances — retourne sans tickets
-- ============================================================================
-- DROP obligatoire : PostgreSQL refuse CREATE OR REPLACE si le type de retour
-- change (ici on retire la colonne tickets du TABLE return type).
-- Drop TOUS les overloads de get_balances (zéro ou n arguments)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS sig
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname = 'get_balances'
  LOOP
    EXECUTE 'DROP FUNCTION ' || r.sig || ' CASCADE';
  END LOOP;
END $$;

CREATE FUNCTION public.get_balances()
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
