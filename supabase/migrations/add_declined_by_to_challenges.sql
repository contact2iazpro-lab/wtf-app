-- Migration : refus de revanche persisté côté Supabase (multi-device)
-- Remplace l'ancien stockage localStorage 'wtf_declined_rematches'.
--
-- declined_by : tableau d'IDs joueurs ayant masqué ce défi de leur liste.
-- Côté client, computeAllDuelStates filtre les rounds dont meId ∈ declined_by.
ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS declined_by uuid[] NOT NULL DEFAULT '{}';

-- RPC : ajoute le user courant à declined_by (idempotent).
CREATE OR REPLACE FUNCTION decline_round(p_round_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE challenges
     SET declined_by = (
       CASE WHEN auth.uid() = ANY(declined_by)
            THEN declined_by
            ELSE array_append(declined_by, auth.uid())
       END
     )
   WHERE id = p_round_id
     AND (player1_id = auth.uid() OR player2_id = auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION decline_round(uuid) TO authenticated;
