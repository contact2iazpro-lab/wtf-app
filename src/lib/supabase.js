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

// Always use valid URLs for the client to avoid parse errors
const FALLBACK_URL = 'https://placeholder.supabase.co'
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : FALLBACK_URL,
  isSupabaseConfigured ? supabaseKey : FALLBACK_KEY
)

// Client sans auth — pour les requêtes publiques (ex: lookup friend_codes)
// Pas de gestion de session/lock, donc pas de contention multi-onglet
export const supabaseAnon = createClient(
  isSupabaseConfigured ? supabaseUrl : FALLBACK_URL,
  isSupabaseConfigured ? supabaseKey : FALLBACK_KEY,
  { auth: { persistSession: false, autoRefreshToken: false, storageKey: 'sb-anon-token' } }
)
