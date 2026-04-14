-- Garantit que les tables sociales sont diffusées via Supabase Realtime.
-- Sans ces ALTER, les `postgres_changes` events ne sont jamais émis et les UI
-- (SocialPage côté Michael et 2iaz) ne se mettent pas à jour après accept/decline.
--
-- Idempotent : on DROP puis re-ADD pour éviter "relation already in publication"
-- et capturer une éventuelle dérive si la table avait été ajoutée avec REPLICA
-- IDENTITY incorrecte.

ALTER TABLE public.friendships REPLICA IDENTITY FULL;
ALTER TABLE public.challenges  REPLICA IDENTITY FULL;
ALTER TABLE public.duels       REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges;  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.duels;       EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
