-- ═══════════════════════════════════════════════════════════════════════════
-- Ajoute la colonne image_directions (JSONB) à la table facts.
-- Stocke les 3 propositions Opus générées lors du batch image, avec
-- un flag was_used sur celle qui a été appliquée.
-- À exécuter une seule fois dans Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE facts
  ADD COLUMN IF NOT EXISTS image_directions JSONB DEFAULT NULL;

-- Check : doit retourner 0 (colonne ajoutée vide au début)
SELECT COUNT(*) AS facts_avec_directions
FROM facts
WHERE image_directions IS NOT NULL;
