-- apply_currency_delta — Point unique de modification des devises joueur
-- Le client envoie des DELTAS (pas des absolus) → anti-triche + admin-safe
--
-- Usage depuis le client :
--   const { data } = await supabase.rpc('apply_currency_delta', {
--     p_coins_delta: 2,
--     p_tickets_delta: -1,
--     p_hints_delta: 0
--   })
--   // data = [{ coins: 27, tickets: 0, hints: 3 }]

CREATE OR REPLACE FUNCTION apply_currency_delta(
  p_coins_delta INT DEFAULT 0,
  p_tickets_delta INT DEFAULT 0,
  p_hints_delta INT DEFAULT 0
) RETURNS TABLE(coins INT, tickets INT, hints INT) AS $$
BEGIN
  RETURN QUERY
  UPDATE profiles SET
    coins = GREATEST(0, COALESCE(profiles.coins, 0) + p_coins_delta),
    tickets = GREATEST(0, COALESCE(profiles.tickets, 0) + p_tickets_delta),
    hints = GREATEST(0, COALESCE(profiles.hints, 0) + p_hints_delta),
    updated_at = NOW(),
    last_modified = EXTRACT(EPOCH FROM NOW()) * 1000
  WHERE id = auth.uid()
  RETURNING profiles.coins, profiles.tickets, profiles.hints;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction read-only pour récupérer les balances actuelles
CREATE OR REPLACE FUNCTION get_balances()
RETURNS TABLE(coins INT, tickets INT, hints INT) AS $$
BEGIN
  RETURN QUERY
  SELECT profiles.coins, profiles.tickets, profiles.hints
  FROM profiles
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
