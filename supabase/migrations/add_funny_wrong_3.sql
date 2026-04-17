-- Ajout d'une 3ème fausse réponse drôle pour porter le pool à 8 mauvaises réponses.
-- Avant : 2 funny + 2 close + 3 plausible = 7 wrong answers
-- Après : 3 funny + 2 close + 3 plausible = 8 wrong answers
--
-- Les facts existants auront funny_wrong_3 = NULL → à générer via l'Edge Function
-- enrich-fact (ou bulk generation dans admin-tool GenerateFactsPage).

ALTER TABLE public.facts
  ADD COLUMN IF NOT EXISTS funny_wrong_3 text;

COMMENT ON COLUMN public.facts.funny_wrong_3 IS '3ème fausse réponse drôle (ajoutée 17/04/2026 pour porter le pool à 8 fausses)';
