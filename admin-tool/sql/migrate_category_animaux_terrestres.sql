-- ═══════════════════════════════════════════════════════════════════════════
-- Migration catégorie : animaux-terrestres → animaux-sauvages
-- À exécuter dans le SQL Editor Supabase.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Check avant (affiche le nombre de facts concernés)
SELECT COUNT(*) AS facts_a_migrer
FROM facts
WHERE category = 'animaux-terrestres';

-- 2. Migration (renomme l'id de catégorie dans tous les facts)
UPDATE facts
   SET category = 'animaux-sauvages',
       updated_at = NOW()
 WHERE category = 'animaux-terrestres';

-- 3. Check après (doit retourner 0)
SELECT COUNT(*) AS restant_animaux_terrestres
FROM facts
WHERE category = 'animaux-terrestres';
