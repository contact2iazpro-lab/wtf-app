-- Table challenges pour le mode duel asynchrone Blitz
-- À exécuter dans le SQL Editor de Supabase Dashboard

CREATE TABLE IF NOT EXISTS challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(6) UNIQUE NOT NULL,
  category_id VARCHAR(50) NOT NULL,
  category_label VARCHAR(100) NOT NULL,
  question_count INTEGER NOT NULL DEFAULT 10,
  player1_id UUID REFERENCES auth.users(id),
  player1_name VARCHAR(100),
  player1_time DECIMAL(10,2) NOT NULL,
  player2_id UUID REFERENCES auth.users(id),
  player2_name VARCHAR(100),
  player2_time DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Index pour la recherche par code
CREATE INDEX IF NOT EXISTS idx_challenges_code ON challenges(code);

-- Index pour les défis d'un joueur
CREATE INDEX IF NOT EXISTS idx_challenges_player1 ON challenges(player1_id);
CREATE INDEX IF NOT EXISTS idx_challenges_player2 ON challenges(player2_id);

-- RLS (Row Level Security)
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Politique : tout le monde peut lire les défis (pour rejoindre via code)
CREATE POLICY "Challenges are viewable by everyone" ON challenges FOR SELECT USING (true);

-- Politique : les utilisateurs connectés peuvent créer des défis
CREATE POLICY "Authenticated users can create challenges" ON challenges FOR INSERT WITH CHECK (auth.uid() = player1_id);

-- Politique : les utilisateurs connectés peuvent compléter un défi
CREATE POLICY "Authenticated users can complete challenges" ON challenges FOR UPDATE USING (auth.uid() = player2_id AND status = 'pending');
