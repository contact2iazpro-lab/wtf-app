-- Migration : cron de nettoyage des comptes anonymes inactifs (Bloc 4 — item 8)
-- Objectif : supprimer les `auth.users` créés via `signInAnonymously()` qui n'ont
-- jamais été liés à une identité (Google/Apple) et qui sont inactifs depuis >30j.
-- Empêche la pollution de la table auth quand des utilisateurs ouvrent l'app
-- sans jamais s'engager (auth anonyme = créée au premier mount, voir Architecture Data).
--
-- ⚠️ NE PAS APPLIQUER SANS VALIDATION :
--   1. Tester d'abord avec `SELECT * FROM cleanup_anonymous_users(true)` (dry-run)
--   2. Vérifier que les comptes listés sont bien anonymes (is_anonymous = true)
--   3. Activer pg_cron côté Supabase (Database → Extensions → pg_cron)
--   4. Schedule via dashboard ou commande `cron.schedule(...)` en bas de ce fichier

-- ============================================================================
-- 1) Fonction de cleanup (avec dry-run)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_anonymous_users(dry_run boolean DEFAULT true)
RETURNS TABLE(user_id uuid, last_sign_in_at timestamptz, created_at timestamptz, action text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  cutoff timestamptz := now() - interval '30 days';
  victim record;
BEGIN
  -- Sélection : auth anonyme, inactif >30j, jamais lié à une identité
  --   - is_anonymous = true   → créé via signInAnonymously()
  --   - last_sign_in_at < cutoff (ou null + created_at < cutoff)
  --   - aucune ligne dans auth.identities (provider != 'anonymous' indique linkIdentity)
  FOR victim IN
    SELECT u.id, u.last_sign_in_at, u.created_at
    FROM auth.users u
    WHERE u.is_anonymous = true
      AND COALESCE(u.last_sign_in_at, u.created_at) < cutoff
      AND NOT EXISTS (
        SELECT 1 FROM auth.identities i
        WHERE i.user_id = u.id AND i.provider <> 'anonymous'
      )
  LOOP
    IF dry_run THEN
      user_id := victim.id;
      last_sign_in_at := victim.last_sign_in_at;
      created_at := victim.created_at;
      action := 'DRY-RUN — would delete';
      RETURN NEXT;
    ELSE
      -- Cascade : profiles, wtf_data, friendships, challenges, etc. ont
      -- ON DELETE CASCADE vers auth.users(id) — vérifier avant prod !
      DELETE FROM auth.users WHERE id = victim.id;
      user_id := victim.id;
      last_sign_in_at := victim.last_sign_in_at;
      created_at := victim.created_at;
      action := 'DELETED';
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- Restreindre l'accès : seul service_role peut l'appeler
REVOKE ALL ON FUNCTION public.cleanup_anonymous_users(boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_anonymous_users(boolean) FROM authenticated;
REVOKE ALL ON FUNCTION public.cleanup_anonymous_users(boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.cleanup_anonymous_users(boolean) TO service_role;

-- ============================================================================
-- 2) Schedule pg_cron (à exécuter SÉPARÉMENT après validation manuelle)
-- ============================================================================
-- Prérequis : extension pg_cron activée côté Supabase
--
-- Tous les jours à 03:00 UTC :
--
-- SELECT cron.schedule(
--   'cleanup-anonymous-users-daily',
--   '0 3 * * *',
--   $$ SELECT public.cleanup_anonymous_users(false); $$
-- );
--
-- Pour annuler :
-- SELECT cron.unschedule('cleanup-anonymous-users-daily');
--
-- ============================================================================
-- VALIDATION MANUELLE AVANT ACTIVATION
-- ============================================================================
-- 1) Compter les futurs supprimés :
--    SELECT count(*) FROM public.cleanup_anonymous_users(true);
--
-- 2) Lister un échantillon :
--    SELECT * FROM public.cleanup_anonymous_users(true) LIMIT 20;
--
-- 3) Vérifier les FKs CASCADE depuis auth.users :
--    SELECT conname, conrelid::regclass FROM pg_constraint
--    WHERE confrelid = 'auth.users'::regclass AND confdeltype = 'c';
--
-- 4) Si OK → schedule cron (étape 2 ci-dessus)
