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

// Storage custom — même API que localStorage, SANS Web Lock.
// Le Web Lock de Supabase bloque indéfiniment sur mobile (multi-tab, PWA, service worker).
const customStorage = {
  getItem: (key) => {
    try { return globalThis.localStorage?.getItem(key) ?? null } catch { return null }
  },
  setItem: (key, value) => {
    try { globalThis.localStorage?.setItem(key, value) } catch {}
  },
  removeItem: (key) => {
    try { globalThis.localStorage?.removeItem(key) } catch {}
  },
}

// Client unique — session persistée, auto-refresh, OAuth callback, SANS Web Lock.
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : FALLBACK_URL,
  isSupabaseConfigured ? supabaseKey : FALLBACK_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'implicit',
      storage: customStorage,
      // No-op lock — désactive le Web Lock API qui bloque sur mobile
      lock: async (_name, _acquireTimeout, fn) => fn(),
    },
  }
)

// Alias pour backward compat — pointe vers le même client
// Les fichiers qui importent supabaseLight continuent de fonctionner
export const supabaseLight = supabase

// Pas besoin de initLightClientFromStorage — le client principal gère tout
export async function initLightClientFromStorage() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user ?? null
  } catch {
    return null
  }
}
