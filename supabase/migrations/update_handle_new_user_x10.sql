-- Migration : aligner handle_new_user sur l'économie ×10 (CLAUDE.md 15/04/2026 + session 16/04/2026)
-- Nouveau joueur = 500 coins / 0 tickets (supprimés) / 3 indices / 5 énergies.
-- Remplace update_handle_new_user_F2P.sql (50/1/3/5 → 500/0/3/5).
-- La colonne tickets est conservée à 0 par compat : son retrait schéma sera une migration dédiée.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, coins, tickets, hints, energy)
  VALUES (
    NEW.id,
    split_part(NEW.email, '@', 1),
    500, 0, 3, 5
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
