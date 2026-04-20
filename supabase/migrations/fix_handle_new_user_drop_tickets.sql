-- Fix : handle_new_user() référençait encore la colonne tickets supprimée
-- Symptôme (20/04/2026) : toute création de user (Google OAuth + /signup anonyme) → 500
-- "column tickets of relation profiles does not exist" (SQLSTATE 42703)
-- Le front retombait en ID invité 000 000 000.
--
-- Pourquoi le sanity check de drop_tickets_column.sql n'a pas bloqué :
-- il cherchait la chaîne "profiles.tickets" (préfixée), alors que le trigger
-- utilisait "tickets" nu dans la liste de colonnes INSERT.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, coins, hints, energy)
  VALUES (
    NEW.id,
    split_part(NEW.email, '@', 1),
    500, 3, 5
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
