-- ============================================================================
-- PHASE A — Architecture Data (décidée 2026-04-12)
-- Supabase = source de vérité pour toutes les entités joueur.
-- À exécuter BLOC PAR BLOC dans l'ordre. Vérifier chaque bloc avant le suivant.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- BLOC 1 — Extension de la table profiles
-- Ajoute les devises manquantes + flags JSONB pour coffres/route/stats/etc.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tickets        INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS hints          INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS energy         INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS energy_reset_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stats_by_mode  JSONB   NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS flags          JSONB   NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS seeded         BOOLEAN NOT NULL DEFAULT false;

-- Contraintes anti-triche (garde-fous côté SQL, double sécurité avec Edge Function)
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_coins_positive,
  DROP CONSTRAINT IF EXISTS profiles_tickets_positive,
  DROP CONSTRAINT IF EXISTS profiles_hints_positive,
  DROP CONSTRAINT IF EXISTS profiles_energy_bounds;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_coins_positive    CHECK (coins   >= 0),
  ADD CONSTRAINT profiles_tickets_positive  CHECK (tickets >= 0),
  ADD CONSTRAINT profiles_hints_positive    CHECK (hints   >= 0),
  ADD CONSTRAINT profiles_energy_bounds     CHECK (energy  >= 0 AND energy <= 10);

-- Commentaires pour clarté (lisibles dans Supabase Dashboard)
COMMENT ON COLUMN profiles.tickets        IS 'Tickets pour lancer une Quête WTF!';
COMMENT ON COLUMN profiles.hints          IS 'Indices disponibles (stock partagé toutes modes)';
COMMENT ON COLUMN profiles.energy         IS 'Énergie Flash/Explorer (régén +1/8h jusqu''à 3, max 10 via boutique)';
COMMENT ON COLUMN profiles.energy_reset_at IS 'Timestamp de la prochaine régén d''énergie';
COMMENT ON COLUMN profiles.stats_by_mode  IS 'JSONB { quest: {gamesPlayed, totalCorrect, ...}, blitz: {...}, ... }';
COMMENT ON COLUMN profiles.flags          IS 'JSONB flags divers (coffreClaimedDays, routeLevel, onboardingCompleted serveur, etc.)';
COMMENT ON COLUMN profiles.seeded         IS 'True une fois que seed_from_local a migré le localStorage legacy';

-- Index sur seeded pour retrouver rapidement les users qui n'ont pas encore migré
CREATE INDEX IF NOT EXISTS idx_profiles_seeded_false ON profiles (id) WHERE seeded = false;


-- ════════════════════════════════════════════════════════════════════════════
-- VÉRIFICATIONS BLOC 1 — exécute ces SELECT pour confirmer
-- ════════════════════════════════════════════════════════════════════════════

-- Doit retourner les 7 nouvelles colonnes
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('tickets','hints','energy','energy_reset_at','stats_by_mode','flags','seeded')
ORDER BY column_name;

-- Doit retourner 4 contraintes CHECK
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass
  AND conname LIKE 'profiles_%_positive' OR conname = 'profiles_energy_bounds';

-- Affiche un user existant pour voir les valeurs par défaut appliquées
SELECT id, coins, tickets, hints, energy, seeded, stats_by_mode, flags
FROM profiles
LIMIT 3;


-- ────────────────────────────────────────────────────────────────────────────
-- BLOC 2 — Table mutation_ledger
-- Audit de toutes les mutations + anti-replay via nonce client.
-- Chaque action qui touche à l'économie/unlocks insère une ligne ici.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mutation_ledger (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL,                    -- 'currency_delta' | 'unlock_fact' | 'stats_update' | 'flag_set' | 'seed'
  payload      JSONB NOT NULL,                   -- contenu de la mutation (delta, fact_id, mode, …)
  reason       TEXT,                             -- 'flash_correct' | 'quest_perfect' | 'shop_buy_tickets' | 'challenge_sent' | …
  client_nonce TEXT NOT NULL,                    -- UUID généré côté client, unique par mutation
  session_id   TEXT,                             -- optionnel : session de jeu (pour grouper)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Anti-replay : on ne peut pas rejouer la même mutation 2× (côté user)
  CONSTRAINT mutation_ledger_nonce_unique UNIQUE (user_id, client_nonce)
);

-- Index pour requêtes d'audit rapides
CREATE INDEX IF NOT EXISTS idx_mutation_ledger_user_created
  ON mutation_ledger (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mutation_ledger_kind_created
  ON mutation_ledger (kind, created_at DESC);

-- RLS : un user voit uniquement ses propres mutations (lecture seule côté client)
ALTER TABLE mutation_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mutation_ledger_select_own" ON mutation_ledger;
CREATE POLICY "mutation_ledger_select_own"
  ON mutation_ledger FOR SELECT
  USING (auth.uid() = user_id);

-- Aucun INSERT/UPDATE/DELETE côté client : seule l'Edge Function (service_role)
-- pourra écrire dans cette table. Le service_role bypass RLS automatiquement,
-- donc pas besoin de policy INSERT — on veut justement bloquer le client.

COMMENT ON TABLE mutation_ledger IS
  'Audit log de toutes les mutations économie/progression. Écrit uniquement par Edge Function apply-mutation (service_role). Anti-replay via client_nonce.';


-- ════════════════════════════════════════════════════════════════════════════
-- VÉRIFICATIONS BLOC 2
-- ════════════════════════════════════════════════════════════════════════════

-- Doit retourner la structure de la table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'mutation_ledger'
ORDER BY ordinal_position;

-- Doit retourner la contrainte unique nonce + les 2 index
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'mutation_ledger';

-- Doit retourner la policy select_own
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'mutation_ledger';

-- Test d'insertion (doit FAIL avec RLS car on est en tant qu'user anon/authenticated)
-- Décommente pour tester, recommente avant de passer au bloc 3 :
-- INSERT INTO mutation_ledger (user_id, kind, payload, reason, client_nonce)
-- VALUES (auth.uid(), 'test', '{}'::jsonb, 'test', 'nonce-test-123');


-- ────────────────────────────────────────────────────────────────────────────
-- BLOC 3 — RPC apply_currency_delta
-- Cœur du système : mutation atomique des devises + audit ledger.
-- Appelable par le client (authenticated). SECURITY DEFINER pour pouvoir
-- écrire dans mutation_ledger malgré la RLS. Garde-fous anti-triche légers
-- côté SQL (les gros contrôles se feront dans l'Edge Function en Phase A.2).
-- ────────────────────────────────────────────────────────────────────────────

-- On DROP toutes les variantes existantes pour pouvoir re-exécuter ce bloc proprement
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS sig
    FROM pg_proc
    WHERE proname = 'apply_currency_delta'
      AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION ' || r.sig || ' CASCADE';
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.apply_currency_delta(
  p_delta        JSONB,              -- { coins: 2, tickets: 0, hints: 0, energy: -1 }
  p_reason       TEXT,               -- 'flash_correct' | 'shop_buy_tickets' | ...
  p_client_nonce TEXT,               -- UUID unique par mutation
  p_session_id   TEXT DEFAULT NULL   -- optionnel
)
RETURNS JSONB                         -- renvoie le nouvel état { coins, tickets, hints, energy }
LANGUAGE plpgsql
SECURITY DEFINER                      -- exécute avec les droits du propriétaire (bypass RLS)
SET search_path = public
AS $$
DECLARE
  v_user_id       UUID;
  v_coin_delta    INTEGER := COALESCE((p_delta->>'coins')::INTEGER,   0);
  v_ticket_delta  INTEGER := COALESCE((p_delta->>'tickets')::INTEGER, 0);
  v_hint_delta    INTEGER := COALESCE((p_delta->>'hints')::INTEGER,   0);
  v_energy_delta  INTEGER := COALESCE((p_delta->>'energy')::INTEGER,  0);
  v_new_state     JSONB;
BEGIN
  -- 1. Identifier l'user — auth.uid() vient du JWT Supabase
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: no auth.uid()';
  END IF;

  -- 2. Validations légères (plafonds anti-bug). Les gros contrôles métier
  --    se feront dans l'Edge Function (rate limit, reason valide, etc.)
  IF ABS(v_coin_delta)   > 500 THEN RAISE EXCEPTION 'delta_too_large: coins';   END IF;
  IF ABS(v_ticket_delta) > 50  THEN RAISE EXCEPTION 'delta_too_large: tickets'; END IF;
  IF ABS(v_hint_delta)   > 50  THEN RAISE EXCEPTION 'delta_too_large: hints';   END IF;
  IF ABS(v_energy_delta) > 10  THEN RAISE EXCEPTION 'delta_too_large: energy'; END IF;

  IF p_reason IS NULL OR length(p_reason) = 0 THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  IF p_client_nonce IS NULL OR length(p_client_nonce) < 8 THEN
    RAISE EXCEPTION 'nonce_required';
  END IF;

  -- 3. Anti-replay : insérer dans le ledger EN PREMIER. Si le nonce existe
  --    déjà pour cet user, le UNIQUE constraint lève une erreur et la txn
  --    est annulée — aucune mutation ne s'applique.
  INSERT INTO mutation_ledger (user_id, kind, payload, reason, client_nonce, session_id)
  VALUES (v_user_id, 'currency_delta', p_delta, p_reason, p_client_nonce, p_session_id);

  -- 4. Mutation atomique des devises. Les CHECK constraints de profiles
  --    empêchent de descendre sous 0 (bloc 1 : profiles_coins_positive, etc.)
  --    Si un delta négatif rendrait une valeur < 0, la txn échoue.
  UPDATE profiles
     SET coins   = coins   + v_coin_delta,
         tickets = tickets + v_ticket_delta,
         hints   = hints   + v_hint_delta,
         energy  = LEAST(energy + v_energy_delta, 10), -- plafond 10
         updated_at = NOW()
   WHERE id = v_user_id
  RETURNING jsonb_build_object(
    'coins',   coins,
    'tickets', tickets,
    'hints',   hints,
    'energy',  energy
  ) INTO v_new_state;

  IF v_new_state IS NULL THEN
    RAISE EXCEPTION 'profile_not_found for user %', v_user_id;
  END IF;

  RETURN v_new_state;
END;
$$;

-- Autoriser les users authentifiés (y compris anonymes) à appeler la fonction
REVOKE ALL ON FUNCTION public.apply_currency_delta(JSONB, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_currency_delta(JSONB, TEXT, TEXT, TEXT) TO authenticated, anon;

COMMENT ON FUNCTION public.apply_currency_delta IS
  'Mutation atomique des devises joueur avec audit ledger et anti-replay nonce. Validation légère SQL, validation complète en Edge Function apply-mutation.';


-- ════════════════════════════════════════════════════════════════════════════
-- VÉRIFICATIONS BLOC 3
-- ════════════════════════════════════════════════════════════════════════════

-- 1. La fonction doit exister
SELECT proname, pg_get_function_arguments(oid), prosecdef
FROM pg_proc
WHERE proname = 'apply_currency_delta';

-- 2. Test réel : applique +5 coins à TOI-MÊME (remplace le nonce par un vrai UUID
--    ou n'importe quelle string unique si tu relances). Doit retourner l'état mis à jour.
SELECT public.apply_currency_delta(
  '{"coins": 5}'::jsonb,
  'test_bloc3',
  'nonce-test-' || gen_random_uuid()::text
);

-- 3. Vérifie que la mutation est dans le ledger
SELECT user_id, kind, payload, reason, client_nonce, created_at
FROM mutation_ledger
WHERE reason = 'test_bloc3'
ORDER BY created_at DESC
LIMIT 5;

-- 4. Vérifie que tes coins ont bien été incrémentés
SELECT id, coins, tickets, hints, energy, updated_at
FROM profiles
WHERE id = auth.uid();

-- 5. Test anti-replay : rejoue EXACTEMENT le même nonce (copie depuis la ligne 2).
--    Doit FAIL avec "duplicate key value violates unique constraint mutation_ledger_nonce_unique"
--    → décommente et remplace le nonce par celui affiché au test 3 :
-- SELECT public.apply_currency_delta(
--   '{"coins": 5}'::jsonb,
--   'test_bloc3',
--   'nonce-test-<colle-ici-le-nonce-du-test-3>'
-- );

-- 6. Test anti-triche : delta trop gros. Doit FAIL avec "delta_too_large: coins"
-- SELECT public.apply_currency_delta(
--   '{"coins": 9999}'::jsonb,
--   'test_triche',
--   'nonce-triche-' || gen_random_uuid()::text
-- );


-- ────────────────────────────────────────────────────────────────────────────
-- BLOC 4 — RPC unlock_fact
-- Ajoute un fact_id au tableau collections.facts_completed de la catégorie
-- correspondante. Idempotent : rappeler avec le même fact_id ne double pas.
-- Anti-replay via nonce dans mutation_ledger.
-- ────────────────────────────────────────────────────────────────────────────

-- Drop toutes les variantes existantes
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS sig
    FROM pg_proc
    WHERE proname = 'unlock_fact'
      AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION ' || r.sig || ' CASCADE';
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.unlock_fact(
  p_fact_id      INTEGER,            -- ID numérique du fact (cohérent avec facts_completed INTEGER[])
  p_category     TEXT,                -- catégorie du fact
  p_reason       TEXT,                -- 'flash_correct' | 'quest_correct' | 'shop_buy_fact' | ...
  p_client_nonce TEXT,
  p_session_id   TEXT DEFAULT NULL
)
RETURNS JSONB                         -- { category, facts_completed, was_new }
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id         UUID;
  v_was_new         BOOLEAN := false;
  v_facts_completed INTEGER[];
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: no auth.uid()';
  END IF;

  IF p_fact_id IS NULL OR p_fact_id <= 0 THEN
    RAISE EXCEPTION 'invalid_fact_id';
  END IF;

  IF p_category IS NULL OR length(p_category) = 0 THEN
    RAISE EXCEPTION 'category_required';
  END IF;

  IF p_reason IS NULL OR length(p_reason) = 0 THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  IF p_client_nonce IS NULL OR length(p_client_nonce) < 8 THEN
    RAISE EXCEPTION 'nonce_required';
  END IF;

  -- Anti-replay : insérer dans le ledger en premier. Si nonce dupliqué,
  -- la txn est annulée et aucune mutation ne s'applique.
  INSERT INTO mutation_ledger (user_id, kind, payload, reason, client_nonce, session_id)
  VALUES (
    v_user_id,
    'unlock_fact',
    jsonb_build_object('fact_id', p_fact_id, 'category', p_category),
    p_reason,
    p_client_nonce,
    p_session_id
  );

  -- Upsert sur collections (user_id, category). Si la ligne n'existe pas,
  -- on la crée. Si elle existe et que le fact_id n'est pas déjà dans le
  -- tableau, on l'ajoute. Sinon no-op.
  INSERT INTO collections (user_id, category, facts_completed, updated_at)
  VALUES (v_user_id, p_category, ARRAY[p_fact_id], NOW())
  ON CONFLICT (user_id, category) DO UPDATE
    SET facts_completed = CASE
          WHEN collections.facts_completed @> ARRAY[p_fact_id]
          THEN collections.facts_completed
          ELSE collections.facts_completed || p_fact_id
        END,
        updated_at = NOW()
  RETURNING facts_completed INTO v_facts_completed;

  -- was_new = true si le fact n'était pas déjà dans la collection avant l'upsert
  -- On le détermine en recomptant le nombre d'occurrences dans le résultat final
  -- (si cardinalité a augmenté, c'était nouveau)
  v_was_new := NOT EXISTS (
    SELECT 1 FROM mutation_ledger
    WHERE user_id = v_user_id
      AND kind = 'unlock_fact'
      AND (payload->>'fact_id')::INTEGER = p_fact_id
      AND client_nonce != p_client_nonce
  );

  RETURN jsonb_build_object(
    'category', p_category,
    'facts_completed', to_jsonb(v_facts_completed),
    'was_new', v_was_new
  );
END;
$$;

-- Contrainte UNIQUE (user_id, category) nécessaire pour ON CONFLICT
-- Vérifie si elle existe, sinon la crée
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'collections'::regclass
      AND conname = 'collections_user_category_unique'
  ) THEN
    ALTER TABLE collections
      ADD CONSTRAINT collections_user_category_unique UNIQUE (user_id, category);
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.unlock_fact(INTEGER, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unlock_fact(INTEGER, TEXT, TEXT, TEXT, TEXT) TO authenticated, anon;

COMMENT ON FUNCTION public.unlock_fact IS
  'Ajoute un fact_id à collections.facts_completed de la catégorie. Idempotent, anti-replay via nonce. Appelée par Edge Function apply-mutation.';


-- ════════════════════════════════════════════════════════════════════════════
-- VÉRIFICATIONS BLOC 4
-- ════════════════════════════════════════════════════════════════════════════

-- 1. La fonction doit exister avec la bonne signature
SELECT proname, pg_get_function_arguments(oid), prosecdef
FROM pg_proc WHERE proname = 'unlock_fact';

-- 2. La contrainte unique sur collections doit exister
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'collections'::regclass
  AND conname = 'collections_user_category_unique';

-- 3. Le grant doit être en place
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'unlock_fact';


-- ────────────────────────────────────────────────────────────────────────────
-- BLOC 5 — RPC seed_from_local
-- Migration one-shot du localStorage legacy vers Supabase.
-- Appelée automatiquement au premier mount après déploiement Phase A.
-- Plafonne les valeurs (anti-triche via édition localStorage) et marque
-- seeded=true pour empêcher tout rejeu.
-- ────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS sig
    FROM pg_proc
    WHERE proname = 'seed_from_local'
      AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION ' || r.sig || ' CASCADE';
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.seed_from_local(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id       UUID;
  v_already_seeded BOOLEAN;
  v_coins         INTEGER;
  v_tickets       INTEGER;
  v_hints         INTEGER;
  v_energy        INTEGER;
  v_streak        INTEGER;
  v_streak_max    INTEGER;
  v_stats         JSONB;
  v_flags         JSONB;
  v_unlocked      JSONB;           -- { "sport": [1,2,3], "animaux": [4,5], ... }
  v_category      TEXT;
  v_fact_ids_raw  JSONB;
  v_fact_ids      INTEGER[];
  v_total_unlocked INTEGER := 0;
  v_result        JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: no auth.uid()';
  END IF;

  -- 1. Empêche le rejeu : si déjà seeded, ne fait rien
  SELECT seeded INTO v_already_seeded FROM profiles WHERE id = v_user_id;
  IF v_already_seeded IS TRUE THEN
    RAISE EXCEPTION 'already_seeded: user % was already migrated', v_user_id;
  END IF;

  -- 2. Extraction + plafonnement (anti-triche localStorage édité)
  v_coins      := LEAST(COALESCE((p_payload->>'coins')::INTEGER, 0),      500);
  v_tickets    := LEAST(COALESCE((p_payload->>'tickets')::INTEGER, 1),    50);
  v_hints      := LEAST(COALESCE((p_payload->>'hints')::INTEGER, 3),      50);
  v_energy     := LEAST(COALESCE((p_payload->>'energy')::INTEGER, 3),     10);
  v_streak     := LEAST(COALESCE((p_payload->>'streak')::INTEGER, 0),     365);
  v_streak_max := LEAST(COALESCE((p_payload->>'streak_max')::INTEGER, 0), 365);
  v_stats      := COALESCE(p_payload->'stats_by_mode', '{}'::jsonb);
  v_flags      := COALESCE(p_payload->'flags', '{}'::jsonb);
  v_unlocked   := COALESCE(p_payload->'unlocked_by_category', '{}'::jsonb);

  -- Garde-fou : max 200 f*cts débloqués total (au lieu des 50 du plan initial
  -- — beaucoup de joueurs legitimes en ont déjà plus)
  FOR v_category, v_fact_ids_raw IN SELECT * FROM jsonb_each(v_unlocked)
  LOOP
    v_total_unlocked := v_total_unlocked + jsonb_array_length(v_fact_ids_raw);
  END LOOP;

  IF v_total_unlocked > 200 THEN
    RAISE EXCEPTION 'too_many_unlocks: % (max 200)', v_total_unlocked;
  END IF;

  -- 3. Mise à jour du profile
  UPDATE profiles
     SET coins          = v_coins,
         tickets        = v_tickets,
         hints          = v_hints,
         energy         = v_energy,
         streak_current = v_streak,
         streak_max     = v_streak_max,
         stats_by_mode  = v_stats,
         flags          = v_flags,
         seeded         = true,
         updated_at     = NOW()
   WHERE id = v_user_id;

  -- 4. Insertion des unlocks par catégorie dans collections
  FOR v_category, v_fact_ids_raw IN SELECT * FROM jsonb_each(v_unlocked)
  LOOP
    -- Convertit le JSONB array en int[]
    SELECT ARRAY(
      SELECT jsonb_array_elements_text(v_fact_ids_raw)::INTEGER
    ) INTO v_fact_ids;

    IF array_length(v_fact_ids, 1) > 0 THEN
      INSERT INTO collections (user_id, category, facts_completed, updated_at)
      VALUES (v_user_id, v_category, v_fact_ids, NOW())
      ON CONFLICT (user_id, category) DO UPDATE
        SET facts_completed = (
              SELECT ARRAY(
                SELECT DISTINCT unnest(collections.facts_completed || v_fact_ids)
              )
            ),
            updated_at = NOW();
    END IF;
  END LOOP;

  -- 5. Audit dans mutation_ledger (sans nonce unique nécessaire — une seule fois)
  INSERT INTO mutation_ledger (user_id, kind, payload, reason, client_nonce)
  VALUES (
    v_user_id,
    'seed',
    jsonb_build_object(
      'coins', v_coins,
      'tickets', v_tickets,
      'hints', v_hints,
      'energy', v_energy,
      'total_unlocked', v_total_unlocked,
      'categories_count', (SELECT COUNT(*) FROM jsonb_object_keys(v_unlocked))
    ),
    'seed_from_local',
    'seed-' || v_user_id::text
  );

  v_result := jsonb_build_object(
    'success', true,
    'coins', v_coins,
    'tickets', v_tickets,
    'hints', v_hints,
    'energy', v_energy,
    'streak', v_streak,
    'total_unlocked', v_total_unlocked
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.seed_from_local(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seed_from_local(JSONB) TO authenticated, anon;

COMMENT ON FUNCTION public.seed_from_local IS
  'Migration one-shot du localStorage legacy vers Supabase. Plafonne les valeurs, marque seeded=true, irréversible. Appelée au premier mount après déploiement Phase A.';


-- ════════════════════════════════════════════════════════════════════════════
-- VÉRIFICATIONS BLOC 5
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Fonction créée
SELECT proname, pg_get_function_arguments(oid), prosecdef
FROM pg_proc WHERE proname = 'seed_from_local';

-- 2. Grants en place
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'seed_from_local';

-- 3. Récap complet de tout ce qui a été créé dans la Phase A
SELECT
  'profiles columns ajoutées' AS item,
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_name = 'profiles'
      AND column_name IN ('tickets','hints','energy','energy_reset_at','stats_by_mode','flags','seeded')) AS count
UNION ALL
SELECT 'mutation_ledger existe',
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'mutation_ledger')
UNION ALL
SELECT 'RPC apply_currency_delta',
  (SELECT COUNT(*) FROM pg_proc WHERE proname = 'apply_currency_delta')
UNION ALL
SELECT 'RPC unlock_fact',
  (SELECT COUNT(*) FROM pg_proc WHERE proname = 'unlock_fact')
UNION ALL
SELECT 'RPC seed_from_local',
  (SELECT COUNT(*) FROM pg_proc WHERE proname = 'seed_from_local')
UNION ALL
SELECT 'policies mutation_ledger',
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'mutation_ledger')
UNION ALL
SELECT 'contrainte collections unique',
  (SELECT COUNT(*) FROM pg_constraint WHERE conname = 'collections_user_category_unique');
