-- Create trigger to calculate winner when challenge is completed
-- This runs after a challenge is updated to status='completed'
-- Calculates winner_id based on best time and updates duels rounds_count

CREATE OR REPLACE FUNCTION calculate_challenge_winner()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Calculer le gagnant: meilleur temps (le plus bas)
    IF NEW.player1_time IS NOT NULL AND NEW.player2_time IS NOT NULL THEN
      IF NEW.player1_time < NEW.player2_time THEN
        NEW.winner_id = NEW.player1_id;
      ELSIF NEW.player2_time < NEW.player1_time THEN
        NEW.winner_id = NEW.player2_id;
      ELSE
        -- Égalité: première personne
        NEW.winner_id = NEW.player1_id;
      END IF;
    END IF;

    -- Incrémenter rounds_count dans la table duels si duel_id existe
    IF NEW.duel_id IS NOT NULL THEN
      UPDATE duels
      SET rounds_count = COALESCE(rounds_count, 0) + 1,
          updated_at = NOW()
      WHERE id = NEW.duel_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger s'il n'existe pas
DROP TRIGGER IF EXISTS challenges_calculate_winner ON challenges;
CREATE TRIGGER challenges_calculate_winner
BEFORE UPDATE ON challenges
FOR EACH ROW
EXECUTE FUNCTION calculate_challenge_winner();
