-- =============================================================================
-- WTF! — Policies RLS pour le module Social (amis + défis)
-- À exécuter dans Supabase Dashboard → SQL Editor
-- =============================================================================
-- Ce script est idempotent : il peut être exécuté plusieurs fois sans erreur.
-- Il crée les tables si elles n'existent pas, active RLS, et met les policies.
-- =============================================================================

-- =============================================================================
-- 1. friend_codes — code ami unique (format 8 caractères) par joueur
-- =============================================================================
CREATE TABLE IF NOT EXISTS friend_codes (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code         TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_friend_codes_code ON friend_codes (code);

ALTER TABLE friend_codes ENABLE ROW LEVEL SECURITY;

-- Lecture publique : tout le monde peut chercher un code ami (pour ajouter un ami)
DROP POLICY IF EXISTS "Anyone can read friend codes" ON friend_codes;
CREATE POLICY "Anyone can read friend codes"
  ON friend_codes FOR SELECT
  USING (true);

-- Insert : un user ne peut créer que SA propre entrée
DROP POLICY IF EXISTS "Users insert own friend code" ON friend_codes;
CREATE POLICY "Users insert own friend code"
  ON friend_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update : un user ne peut modifier que SA propre entrée (display_name, avatar_url)
DROP POLICY IF EXISTS "Users update own friend code" ON friend_codes;
CREATE POLICY "Users update own friend code"
  ON friend_codes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- 2. friendships — relations d'amitié (pending ou accepted)
-- =============================================================================
CREATE TABLE IF NOT EXISTS friendships (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  CHECK (user1_id <> user2_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON friendships (user1_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON friendships (user2_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships (status);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Lecture : un user voit uniquement les amitiés où il est impliqué
DROP POLICY IF EXISTS "Users read own friendships" ON friendships;
CREATE POLICY "Users read own friendships"
  ON friendships FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Insert : un user peut créer une amitié si il est user1_id (celui qui envoie la demande)
DROP POLICY IF EXISTS "Users send friend request" ON friendships;
CREATE POLICY "Users send friend request"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = user1_id);

-- Update : user2_id peut accepter (passer pending → accepted)
DROP POLICY IF EXISTS "Users accept incoming friendship" ON friendships;
CREATE POLICY "Users accept incoming friendship"
  ON friendships FOR UPDATE
  USING (auth.uid() = user2_id)
  WITH CHECK (auth.uid() = user2_id);

-- Delete : les 2 peuvent supprimer l'amitié (rejet ou unfriend)
DROP POLICY IF EXISTS "Users delete own friendships" ON friendships;
CREATE POLICY "Users delete own friendships"
  ON friendships FOR DELETE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- =============================================================================
-- 3. challenges — défis Blitz entre amis (asynchrones via code partageable)
-- =============================================================================
CREATE TABLE IF NOT EXISTS challenges (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code            TEXT UNIQUE NOT NULL,
  category_id     TEXT,
  category_label  TEXT,
  question_count  INTEGER NOT NULL DEFAULT 10,
  player1_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player1_name    TEXT,
  player1_time    NUMERIC,
  player2_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  player2_name    TEXT,
  player2_time    NUMERIC,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_challenges_code    ON challenges (code);
CREATE INDEX IF NOT EXISTS idx_challenges_player1 ON challenges (player1_id);
CREATE INDEX IF NOT EXISTS idx_challenges_player2 ON challenges (player2_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status  ON challenges (status);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Lecture publique : tout le monde peut charger un défi via son code
-- (nécessaire pour que /challenge/<CODE> marche sans être connecté au même compte)
DROP POLICY IF EXISTS "Anyone can read challenges" ON challenges;
CREATE POLICY "Anyone can read challenges"
  ON challenges FOR SELECT
  USING (true);

-- Insert : un user auth peut créer un défi s'il est player1_id
DROP POLICY IF EXISTS "Users create own challenges" ON challenges;
CREATE POLICY "Users create own challenges"
  ON challenges FOR INSERT
  WITH CHECK (auth.uid() = player1_id);

-- Update : un user auth peut compléter un défi (devenir player2_id) si le défi est pending
-- ET que player2_id est null OU égal à lui-même
DROP POLICY IF EXISTS "Users complete challenges" ON challenges;
CREATE POLICY "Users complete challenges"
  ON challenges FOR UPDATE
  USING (
    status = 'pending'
    AND (player2_id IS NULL OR player2_id = auth.uid())
    AND player1_id <> auth.uid()  -- on ne peut pas compléter son propre défi
  )
  WITH CHECK (
    auth.uid() = player2_id
  );

-- =============================================================================
-- Vérifications post-exécution
-- =============================================================================
-- Après avoir exécuté ce SQL, tu peux vérifier que tout est en place avec :
--
--   SELECT tablename, policyname, cmd FROM pg_policies
--   WHERE schemaname = 'public'
--   AND tablename IN ('friend_codes', 'friendships', 'challenges')
--   ORDER BY tablename, cmd;
--
-- Tu devrais voir 3 policies sur friend_codes, 4 sur friendships, 3 sur challenges.
