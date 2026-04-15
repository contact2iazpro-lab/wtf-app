import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────
// Client Supabase via proxy local Vite
//
// Le navigateur ne manipule JAMAIS la secret key. Toutes les requêtes
// supabase-js partent vers /supabase-proxy (le serveur Vite local), qui
// réécrit les headers côté Node avec la vraie SUPABASE_SECRET_KEY avant
// de les forwarder vers Supabase. Voir vite.config.js → server.proxy.
//
// La clé passée ici à createClient n'est qu'un placeholder — elle sera
// écrasée par le proxy. Format "publishable" factice pour éviter le
// garde-fou anti-secret-key de supabase-js côté browser.
// ─────────────────────────────────────────────────────────────────────────

const PROXY_URL =
  typeof window !== 'undefined'
    ? `${window.location.origin}/supabase-proxy`
    : 'http://localhost:5174/supabase-proxy'

const PLACEHOLDER_KEY = 'sb_publishable_proxy_placeholder_ignored_by_middleware'

export const supabase = createClient(PROXY_URL, PLACEHOLDER_KEY, {
  auth: { persistSession: false },
})
