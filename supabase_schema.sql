-- =============================================
-- WHAT THE FACT! — Supabase Schema
-- Coller ce SQL dans l'éditeur SQL de Supabase
-- =============================================

-- Table des facts
CREATE TABLE facts (
  id INTEGER PRIMARY KEY,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  hint1 TEXT,
  hint2 TEXT,
  answer TEXT NOT NULL,
  explanation TEXT,
  is_exceptional BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- Migration 1A — Enrichissement table facts
-- À exécuter dans l'éditeur SQL Supabase
-- (idempotent — IF NOT EXISTS sur chaque colonne)
-- =============================================

ALTER TABLE facts ADD COLUMN IF NOT EXISTS short_answer  TEXT;
ALTER TABLE facts ADD COLUMN IF NOT EXISTS source_url    TEXT;
ALTER TABLE facts ADD COLUMN IF NOT EXISTS options       JSONB;
ALTER TABLE facts ADD COLUMN IF NOT EXISTS correct_index INTEGER;
ALTER TABLE facts ADD COLUMN IF NOT EXISTS image_url     TEXT;
ALTER TABLE facts ADD COLUMN IF NOT EXISTS is_vip        BOOLEAN DEFAULT false;
ALTER TABLE facts ADD COLUMN IF NOT EXISTS is_published  BOOLEAN DEFAULT true;
ALTER TABLE facts ADD COLUMN IF NOT EXISTS pack_id       TEXT    DEFAULT 'free';
ALTER TABLE facts ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMP DEFAULT NOW();

-- is_exceptional reste en place comme alias legacy de is_vip
-- (pas de DROP pour éviter de casser des requêtes existantes)

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_facts_category    ON facts (category);
CREATE INDEX IF NOT EXISTS idx_facts_is_published ON facts (is_published);
CREATE INDEX IF NOT EXISTS idx_facts_is_vip      ON facts (is_vip);

-- =============================================
-- RLS — facts (lecture publique, écriture interdite côté client)
-- =============================================

ALTER TABLE facts ENABLE ROW LEVEL SECURITY;

-- Supprimer l'ancienne policy trop permissive
DROP POLICY IF EXISTS "Anyone can read facts" ON facts;

-- Lecture : n'importe qui peut lire les facts publiés (anon inclus)
CREATE POLICY "Public read published facts"
  ON facts FOR SELECT
  USING (is_published = true);

-- Pas de policy INSERT/UPDATE/DELETE : seul le service_role
-- (clé côté serveur/script) peut écrire. La service_role bypasse RLS par défaut.

-- Table des profils utilisateurs
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE,
  avatar_url TEXT,
  total_score INTEGER DEFAULT 0,
  streak_current INTEGER DEFAULT 0,
  streak_max INTEGER DEFAULT 0,
  last_played_date TEXT,
  coins INTEGER DEFAULT 50,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table des collections (progression puzzle par catégorie)
CREATE TABLE collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  facts_completed INTEGER[] DEFAULT '{}',
  completion_percentage NUMERIC DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  exceptional_fact_unlocked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, category)
);

-- Table des trophées
CREATE TABLE trophies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  obtained_at TIMESTAMP DEFAULT NOW(),
  completion_time_seconds INTEGER,
  UNIQUE(user_id, category)
);

-- Table des scores Blitz
CREATE TABLE blitz_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  score INTEGER NOT NULL,
  avg_response_time_ms INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  total_answers INTEGER NOT NULL,
  played_at TIMESTAMP DEFAULT NOW()
);

-- Table des personal best Blitz
CREATE TABLE blitz_personal_bests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  best_score INTEGER NOT NULL,
  best_avg_time_ms INTEGER NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, category)
);

-- Table des achats
CREATE TABLE purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  categories TEXT[],
  amount_eur NUMERIC,
  status TEXT DEFAULT 'completed',
  purchased_at TIMESTAMP DEFAULT NOW()
);

-- Table des sessions de jeu (analytics)
CREATE TABLE game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  mode TEXT NOT NULL,
  category TEXT,
  score INTEGER,
  facts_played INTEGER[],
  duration_seconds INTEGER,
  played_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- RLS (Row Level Security)
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE trophies ENABLE ROW LEVEL SECURITY;
ALTER TABLE blitz_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE blitz_personal_bests ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users see own collections" ON collections FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own trophies" ON trophies FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own scores" ON blitz_scores FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own PB" ON blitz_personal_bests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own purchases" ON purchases FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users log own sessions" ON game_sessions FOR ALL USING (auth.uid() = user_id);

-- Classement Blitz accessible à tous (lecture seule)
CREATE POLICY "Anyone can read blitz PB" ON blitz_personal_bests FOR SELECT USING (true);
CREATE POLICY "Anyone can read facts" ON facts FOR SELECT USING (true);

-- =============================================
-- Trigger : créer profil automatiquement
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, coins)
  VALUES (
    NEW.id,
    split_part(NEW.email, '@', 1),
    50
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
