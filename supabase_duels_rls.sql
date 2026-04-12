-- =============================================================================
-- WTF! — Schéma DUEL (remplace le système challenge one-shot)
-- À exécuter dans Supabase Dashboard → SQL Editor, bloc par bloc.
-- =============================================================================
-- Ce script est idempotent : il peut être relancé sans casser l'existant.
-- Il ajoute la table `duels`, des colonnes à `challenges`, un trigger
-- auto-calcul du winner + stats, et les policies RLS adaptées.
-- =============================================================================

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ BLOC 1 — Table `duels` : une ligne par paire de joueurs                  ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
CREATE TABLE IF NOT EXISTS duels (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player1_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player2_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player1_wins  INTEGER DEFAULT 0,
  player2_wins  INTEGER DEFAULT 0,
  ties          INTEGER DEFAULT 0,
  rounds_count  INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (player1_id, player2_id),
  -- Convention : player1_id < player2_id en lexicographique (évite A,B vs B,A)
  CHECK (player1_id < player2_id)
);

CREATE INDEX IF NOT EXISTS idx_duels_player1 ON duels (player1_id);
CREATE INDEX IF NOT EXISTS idx_duels_player2 ON duels (player2_id);
CREATE INDEX IF NOT EXISTS idx_duels_updated ON duels (updated_at DESC);

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ BLOC 2 — RLS + policies `duels`                                          ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
ALTER TABLE duels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own duels" ON duels;
CREATE POLICY "Users read own duels"
  ON duels FOR SELECT
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

DROP POLICY IF EXISTS "Users create duels" ON duels;
CREATE POLICY "Users create duels"
  ON duels FOR INSERT
  WITH CHECK (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Update : les 2 peuvent incrémenter wins/ties/rounds_count via trigger
DROP POLICY IF EXISTS "Users update own duels" ON duels;
CREATE POLICY "Users update own duels"
  ON duels FOR UPDATE
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ BLOC 3 — Extension de la table `challenges` : colonnes duel            ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS duel_id    UUID REFERENCES duels(id) ON DELETE CASCADE;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS winner_id  UUID REFERENCES auth.users(id);
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS seen_by_p1 BOOLEAN DEFAULT false;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS seen_by_p2 BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_challenges_duel_created ON challenges (duel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenges_expires      ON challenges (status, expires_at) WHERE status = 'pending';

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ BLOC 4 — Trigger : auto-calcul winner + stats duel au complete         ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
CREATE OR REPLACE FUNCTION update_duel_stats_on_complete()
RETURNS TRIGGER AS $$
DECLARE
  duel_row duels%ROWTYPE;
  p1_id UUID;
  p2_id UUID;
BEGIN
  -- Ne se déclenche que quand le status passe en 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    -- Calcul du winner (plus bas temps = gagnant, égalité possible)
    IF NEW.player1_time IS NOT NULL AND NEW.player2_time IS NOT NULL THEN
      IF NEW.player1_time < NEW.player2_time THEN
        NEW.winner_id := NEW.player1_id;
      ELSIF NEW.player2_time < NEW.player1_time THEN
        NEW.winner_id := NEW.player2_id;
      ELSE
        NEW.winner_id := NULL; -- égalité
      END IF;
      NEW.completed_at := COALESCE(NEW.completed_at, NOW());
    END IF;

    -- Incrément des stats du duel parent
    IF NEW.duel_id IS NOT NULL THEN
      SELECT * INTO duel_row FROM duels WHERE id = NEW.duel_id;
      IF FOUND THEN
        UPDATE duels
        SET
          rounds_count = rounds_count + 1,
          player1_wins = player1_wins + CASE WHEN NEW.winner_id = duel_row.player1_id THEN 1 ELSE 0 END,
          player2_wins = player2_wins + CASE WHEN NEW.winner_id = duel_row.player2_id THEN 1 ELSE 0 END,
          ties = ties + CASE WHEN NEW.winner_id IS NULL THEN 1 ELSE 0 END,
          updated_at = NOW()
        WHERE id = NEW.duel_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_duel_stats ON challenges;
CREATE TRIGGER trg_update_duel_stats
  BEFORE UPDATE ON challenges
  FOR EACH ROW
  EXECUTE FUNCTION update_duel_stats_on_complete();

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ BLOC 5 — Fonction d'expiration manuelle (à appeler via RPC ou cron)    ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
-- Cette fonction marque comme 'expired' tous les challenges pending
-- dont expires_at est passé. À appeler :
--   - Soit manuellement (SQL Editor) pour nettoyer
--   - Soit via une Edge Function Supabase schedulée (cron toutes les heures)
--   - Soit via pg_cron si activé
CREATE OR REPLACE FUNCTION expire_old_challenges()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE challenges
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test : SELECT expire_old_challenges();

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ BLOC 6 — Policies supplémentaires sur challenges pour seen_by_*        ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
-- La policy existante "Users complete challenges" gère l'update complete.
-- On ajoute une policy pour que player1 et player2 puissent marquer seen_by_* eux-mêmes.
DROP POLICY IF EXISTS "Users mark own seen" ON challenges;
CREATE POLICY "Users mark own seen"
  ON challenges FOR UPDATE
  USING (auth.uid() = player1_id OR auth.uid() = player2_id)
  WITH CHECK (auth.uid() = player1_id OR auth.uid() = player2_id);

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ BLOC 7 — Archiver les anciens challenges (partir propre)               ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
-- OPTIONNEL : ce bloc archive les challenges existants (legacy sans duel_id)
-- dans une table challenges_legacy, puis les supprime de la table principale.
-- À exécuter UNIQUEMENT si tu veux démarrer propre. Sinon, skip ce bloc.

-- CREATE TABLE IF NOT EXISTS challenges_legacy AS SELECT * FROM challenges WHERE duel_id IS NULL LIMIT 0;
-- INSERT INTO challenges_legacy SELECT * FROM challenges WHERE duel_id IS NULL;
-- DELETE FROM challenges WHERE duel_id IS NULL;

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ BLOC 8 — Vérification finale                                            ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
SELECT
  (SELECT COUNT(*) FROM duels) AS nb_duels,
  (SELECT COUNT(*) FROM challenges) AS nb_challenges,
  (SELECT COUNT(*) FROM challenges WHERE duel_id IS NOT NULL) AS nb_linked,
  (SELECT COUNT(*) FROM challenges WHERE status = 'pending' AND expires_at < NOW()) AS nb_to_expire;
