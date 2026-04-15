-- ─────────────────────────────────────────────────────────────────────────────
-- Mode Vrai ou Fou — ajout des champs statement / statement_is_true
-- (CLAUDE.md 15/04/2026 — mode swipe Vrai/Faux)
--
-- Chaque Funny fact peut recevoir une affirmation :
--   - statement          : texte de l'affirmation affichée au joueur
--   - statement_is_true  : boolean — true si l'affirmation est vraie, false sinon
--
-- Le mode ne pioche que les facts où les deux champs sont renseignés
-- (voir src/data/factsService.js → getFunnyFactsWithStatement).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.facts
  ADD COLUMN IF NOT EXISTS statement         text,
  ADD COLUMN IF NOT EXISTS statement_is_true boolean;

-- Index partiel sur les facts qui ont une affirmation prête à jouer.
-- Utilisé par le service côté client pour filtrer rapidement.
CREATE INDEX IF NOT EXISTS facts_statement_ready_idx
  ON public.facts (id)
  WHERE statement IS NOT NULL AND statement_is_true IS NOT NULL;

COMMENT ON COLUMN public.facts.statement         IS 'Vrai ou Fou — affirmation affichée au joueur (swipe Vrai/Faux)';
COMMENT ON COLUMN public.facts.statement_is_true IS 'Vrai ou Fou — booléen : l''affirmation est-elle vraie ?';
