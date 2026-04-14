-- Migration : aligner handle_new_user sur les valeurs F2P officielles CLAUDE.md
-- Décision C10 (2026-04-14) : 50 coins / 1 ticket / 3 indices / 5 énergies au démarrage.
-- L'ancien trigger n'insérait que coins=50 et laissait tickets/hints/energy aux defaults
-- de colonne, ce qui pouvait diverger.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, coins, tickets, hints, energy)
  VALUES (
    NEW.id,
    split_part(NEW.email, '@', 1),
    50, 1, 3, 5
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
