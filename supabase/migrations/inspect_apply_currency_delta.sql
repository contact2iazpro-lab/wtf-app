-- Inspection — apply_currency_delta version déployée
--
-- Pourquoi : le fichier repo add_currency_delta_rpc.sql montre une signature
-- à 3 paramètres (p_coins_delta, p_tickets_delta, p_hints_delta) mais le client
-- (src/hooks/usePlayerProfile.js) appelle la RPC avec :
--     p_delta (JSONB), p_reason, p_client_nonce, p_session_id
-- Donc une version plus récente a été déployée hors migration versionnée.
-- Avant de réécrire pour retirer les tickets, il faut dumper le def actuel.
--
-- Exécuter ceci dans le SQL editor Supabase et coller le résultat à Claude :

SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('apply_currency_delta', 'get_balances')
ORDER BY p.proname;
