-- merge_player_flags — merge atomique d'un patch JSONB dans profiles.flags
--
-- Phase A — persistance cross-device pour :
--   - badgesEarned (anti-replay trophées)
--   - seenModes (pulse NEW one-shot)
--   - statsByMode (gamesPlayed par mode)
--   - blitzRecords, route, coffreClaimedDays, streakFreezeCount, etc.
--
-- Sécurité : SECURITY DEFINER + auth.uid() pour identifier le joueur.
-- Le client ne peut merger QUE son propre profil (pas de userId en paramètre).
-- RLS garantit en complément que seul le propriétaire peut muter sa ligne.

CREATE OR REPLACE FUNCTION public.merge_player_flags(p_patch jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid;
  v_new_flags jsonb;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'merge_player_flags: not authenticated';
  END IF;

  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN
    RAISE EXCEPTION 'merge_player_flags: p_patch must be a JSON object';
  END IF;

  -- Merge top-level : les clés de p_patch écrasent celles de flags existant.
  -- Opérateur `||` fait un shallow merge (ce qu'on veut : on remplace
  -- badgesEarned par la nouvelle liste complète, statsByMode par le nouveau
  -- dict complet, etc. Le client envoie toujours l'état canonique local).
  UPDATE public.profiles
     SET flags = COALESCE(flags, '{}'::jsonb) || p_patch,
         last_modified = (EXTRACT(EPOCH FROM now()) * 1000)::bigint,
         updated_at = now()
   WHERE id = v_uid
   RETURNING flags INTO v_new_flags;

  IF v_new_flags IS NULL THEN
    RAISE EXCEPTION 'merge_player_flags: profile not found for user %', v_uid;
  END IF;

  RETURN v_new_flags;
END;
$$;

REVOKE ALL ON FUNCTION public.merge_player_flags(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merge_player_flags(jsonb) TO authenticated;

COMMENT ON FUNCTION public.merge_player_flags(jsonb) IS
  'Phase A — merge JSONB atomique dans profiles.flags pour le joueur courant (auth.uid). Shallow merge : les clés top-level du patch écrasent les existantes.';
