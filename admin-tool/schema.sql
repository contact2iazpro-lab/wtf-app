-- Run this in Supabase SQL Editor before using the admin tool

-- 1. Add vip_usage column to facts
ALTER TABLE facts ADD COLUMN IF NOT EXISTS vip_usage TEXT DEFAULT 'available';

-- 2. Create edit_history table for audit log
CREATE TABLE IF NOT EXISTS edit_history (
  id        BIGSERIAL PRIMARY KEY,
  fact_id   INTEGER NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  edited_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS edit_history_fact_id_idx  ON edit_history(fact_id);
CREATE INDEX IF NOT EXISTS edit_history_edited_at_idx ON edit_history(edited_at DESC);

-- 3. RLS: admin tool uses service_role key → bypasses RLS automatically
--    These policies allow anon read if needed (optional — remove if not wanted)
ALTER TABLE edit_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON edit_history USING (true) WITH CHECK (true);
