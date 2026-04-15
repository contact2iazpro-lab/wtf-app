-- ─────────────────────────────────────────────────────────────────────────────
-- Mode Vrai ou Fou — refonte : 3 affirmations par fact au lieu d'une seule
-- (CLAUDE.md 15/04/2026)
--
-- Avant : 1 colonne `statement` + 1 bool `statement_is_true` → 1 affirmation/fact
-- Après : 3 colonnes text → 3 variantes par fact, le jeu tire au hasard
--   - statement_true            : reformulation de la vraie réponse (short_answer)
--   - statement_false_funny     : reformulation d'une fausse drôle (funny_wrong_*)
--   - statement_false_plausible : reformulation d'une fausse plausible (plausible_wrong_*)
--
-- Côté admin : un bouton "Générer affirmations" remplit les 3 via Claude.
-- Côté jeu   : à chaque draw, tirage 50/50 vrai/faux, puis choix de la colonne.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Drop de l'ancien index partiel qui référence statement_is_true
DROP INDEX IF EXISTS public.facts_statement_ready_idx;

-- 2. Drop des anciennes colonnes (les données étaient des tests, pas de backup nécessaire)
ALTER TABLE public.facts
  DROP COLUMN IF EXISTS statement,
  DROP COLUMN IF EXISTS statement_is_true;

-- 3. Ajout des 3 nouvelles colonnes
ALTER TABLE public.facts
  ADD COLUMN IF NOT EXISTS statement_true            text,
  ADD COLUMN IF NOT EXISTS statement_false_funny     text,
  ADD COLUMN IF NOT EXISTS statement_false_plausible text;

-- 4. Index partiel : facts jouables en Vrai ou Fou = ceux dont les 3 variantes sont remplies
CREATE INDEX IF NOT EXISTS facts_statements_ready_idx
  ON public.facts (id)
  WHERE statement_true            IS NOT NULL
    AND statement_false_funny     IS NOT NULL
    AND statement_false_plausible IS NOT NULL;

-- 5. Commentaires de colonne (documentation inline Supabase)
COMMENT ON COLUMN public.facts.statement_true            IS 'Vrai ou Fou — affirmation vraie (reformulation de short_answer)';
COMMENT ON COLUMN public.facts.statement_false_funny     IS 'Vrai ou Fou — affirmation fausse drôle (reformulation d''un funny_wrong)';
COMMENT ON COLUMN public.facts.statement_false_plausible IS 'Vrai ou Fou — affirmation fausse plausible (reformulation d''un plausible_wrong)';
