-- Create image_pipeline table for WTF! image generation pipeline
CREATE TABLE IF NOT EXISTS image_pipeline (
  id SERIAL PRIMARY KEY,
  fact_id INTEGER REFERENCES facts(id),
  fact_type TEXT DEFAULT 'funny',
  directions JSONB,
  selected_direction TEXT,
  custom_direction TEXT,
  image_url TEXT,
  final_image_url TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_image_pipeline_fact_id ON image_pipeline(fact_id);
CREATE INDEX IF NOT EXISTS idx_image_pipeline_status ON image_pipeline(status);
