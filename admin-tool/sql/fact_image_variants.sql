-- ═══════════════════════════════════════════════════════════════════════════
-- fact_image_variants
-- Historique de toutes les images générées pour un fact (mode individuel).
-- Indépendant de image_pipeline (qui reste pour la génération de masse).
--
-- NOTE : pas de fonction RPC — l'activation est faite côté client
-- (3 UPDATE séquentiels depuis FactImageGenerator.jsx) pour éviter
-- les problèmes de parsing dollar-quote du SQL Editor Supabase.
-- ═══════════════════════════════════════════════════════════════════════════

-- Nettoyage d'une éventuelle ancienne fonction
DROP FUNCTION IF EXISTS activate_fact_variant(BIGINT);

-- Table
CREATE TABLE IF NOT EXISTS fact_image_variants (
  id                    BIGSERIAL PRIMARY KEY,
  fact_id               INTEGER NOT NULL REFERENCES facts(id) ON DELETE CASCADE,
  direction_title       TEXT,
  direction_description TEXT NOT NULL,
  style                 TEXT NOT NULL CHECK (style IN ('realiste', 'wtf', 'cinema')),
  model                 TEXT NOT NULL CHECK (model IN ('gpt-image-1', 'gemini-2.5-flash', 'gemini-3-pro')),
  image_url             TEXT NOT NULL,
  storage_path          TEXT NOT NULL,
  is_active             BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fact_image_variants_fact_id_idx    ON fact_image_variants(fact_id);
CREATE INDEX IF NOT EXISTS fact_image_variants_created_at_idx ON fact_image_variants(created_at DESC);

-- Un seul is_active=true par fact_id
CREATE UNIQUE INDEX IF NOT EXISTS fact_image_variants_one_active_per_fact
  ON fact_image_variants(fact_id)
  WHERE is_active = TRUE;

-- RLS : bypass via service_role
ALTER TABLE fact_image_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON fact_image_variants;
CREATE POLICY "Service role full access" ON fact_image_variants
  USING (true) WITH CHECK (true);
