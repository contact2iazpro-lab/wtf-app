-- Tables amis : friend_codes + friendships
-- À exécuter dans le SQL Editor de Supabase Dashboard

CREATE TABLE IF NOT EXISTS friend_codes (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  code VARCHAR(8) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL REFERENCES auth.users(id),
  user2_id UUID NOT NULL REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user1_id, user2_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON friendships(user1_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON friendships(user2_id);
CREATE INDEX IF NOT EXISTS idx_friend_codes_code ON friend_codes(code);

ALTER TABLE friend_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Friend codes viewable by everyone" ON friend_codes FOR SELECT USING (true);
CREATE POLICY "Users can create their own friend code" ON friend_codes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own friend code" ON friend_codes FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their friendships" ON friendships FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "Users can create friendship requests" ON friendships FOR INSERT WITH CHECK (auth.uid() = user1_id);
CREATE POLICY "Users can update friendships they receive" ON friendships FOR UPDATE USING (auth.uid() = user2_id);
CREATE POLICY "Users can delete their friendships" ON friendships FOR DELETE USING (auth.uid() = user1_id OR auth.uid() = user2_id);
