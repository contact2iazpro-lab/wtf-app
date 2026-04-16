-- Migration : DROP définitif de la colonne tickets
-- CLAUDE.md 15/04/2026 : "Tickets SUPPRIMÉS (coût en coins direct)"
--
-- ⚠️ PRÉ-REQUIS OBLIGATOIRES (ne pas lancer avant d'avoir fait les 3 étapes) :
--   1. rewrite_create_duel_challenge_coins.sql APPLIQUÉE (debit 200 coins)
--   2. apply_currency_delta rewritten sans p_tickets_delta (voir inspect_apply_currency_delta.sql)
--   3. Plus aucune ligne client ne lit/écrit profiles.tickets :
--      rg -n "tickets" src/ → doit retourner 0 match côté code joueur
--      (seuls les commentaires/docs sont acceptables)
--
-- Vérification rapide avant drop :
--   SELECT COUNT(*) FROM profiles WHERE tickets IS NOT NULL AND tickets <> 0;
--   → Les valeurs non-zéro ne seront pas migrées (les tickets résiduels sont perdus).
--   → Si besoin, convertir en coins d'abord :
--       UPDATE profiles SET coins = coins + tickets * 200 WHERE tickets > 0;
--     (200c = prix d'un Défi Blitz, équivalence 1 ticket ≈ 1 défi)

BEGIN;

-- Sanity check : refuser le drop si les RPCs référencent encore la colonne
DO $$
DECLARE
  v_refs INT;
BEGIN
  SELECT COUNT(*) INTO v_refs
  FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace
    AND pg_get_functiondef(oid) ILIKE '%profiles.tickets%';

  IF v_refs > 0 THEN
    RAISE EXCEPTION 'Il reste % fonction(s) qui référencent profiles.tickets. Migrer avant de drop.', v_refs;
  END IF;
END $$;

-- (Optionnel) conversion résiduelle tickets → coins avant drop
-- UPDATE profiles SET coins = COALESCE(coins, 0) + COALESCE(tickets, 0) * 200
--   WHERE tickets > 0;

ALTER TABLE profiles DROP COLUMN IF EXISTS tickets;

COMMIT;
