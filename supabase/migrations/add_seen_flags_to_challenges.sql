-- Add seen_by_p1 and seen_by_p2 flags to track if each player viewed the result
ALTER TABLE challenges
ADD COLUMN seen_by_p1 BOOLEAN DEFAULT false,
ADD COLUMN seen_by_p2 BOOLEAN DEFAULT false;

-- Index pour requêtes rapides
CREATE INDEX IF NOT EXISTS idx_challenges_unseen_p1 ON challenges(player1_id) WHERE seen_by_p1 = false;
CREATE INDEX IF NOT EXISTS idx_challenges_unseen_p2 ON challenges(player2_id) WHERE seen_by_p2 = false;
