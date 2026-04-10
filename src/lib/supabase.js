import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured =
  !!supabaseUrl &&
  supabaseUrl !== 'your_supabase_url_here' &&
  supabaseUrl.startsWith('https://')

if (!isSupabaseConfigured) {
  console.warn('[Supabase] Not configured — auth and sync disabled')
}

const FALLBACK_URL = 'https://placeholder.supabase.co'
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'

// Client principal — avec session, lock, refresh token
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : FALLBACK_URL,
  isSupabaseConfigured ? supabaseKey : FALLBACK_KEY
)

// Client léger — pas de session/lock, pour les pages secondaires (invite, challenge)
// Pas de contention multi-onglet
export const supabaseLight = createClient(
  isSupabaseConfigured ? supabaseUrl : FALLBACK_URL,
  isSupabaseConfigured ? supabaseKey : FALLBACK_KEY,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
)

/**
 * Injecte le token d'auth existant dans le client léger.
 * Lit directement le localStorage — pas de lock, pas de contention.
 * Retourne le user si un token valide existe, null sinon.
 */
export async function initLightClientFromStorage() {
  try {
    const storageKey = `sb-${supabaseUrl?.split('//')[1]?.split('.')[0]}-auth-token`
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    const session = JSON.parse(raw)
    if (!session?.access_token) return null

    const { data, error } = await supabaseLight.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })
    if (error) return null
    return data?.user ?? null
  } catch {
    return null
  }
}
