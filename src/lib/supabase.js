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

// Mutex in-memory simple — remplace le Web Lock API bloquant.
// Le Web Lock bloque entre ONGLETS (cross-tab). Ce mutex ne protège que
// les opérations DANS le même onglet, ce qui est suffisant pour éviter
// les race conditions au démarrage (getSession + onAuthStateChange).
//
// CRITIQUE : respecte acquireTimeout. Sans ça, si un fn() précédent hang
// (deadlock re-entrant sur onAuthStateChange qui déclenche supabase.auth.*
// pendant qu'il tient déjà le lock), tous les appels suivants bloquent
// à l'infini — y compris signOut(). Le timeout force la libération.
let _lockPromise = Promise.resolve()
const inMemoryLock = async (_name, acquireTimeout, fn) => {
  const prev = _lockPromise
  let resolve
  _lockPromise = new Promise(r => { resolve = r })
  try {
    await Promise.race([
      prev,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('lock acquisition timeout')), acquireTimeout || 3000)
      ),
    ]).catch(e => {
      console.warn('[Supabase lock]', e.message, '— forcing acquisition')
    })
    return await fn()
  } finally {
    resolve()
  }
}

// Client unique — session persistée, auto-refresh, OAuth callback.
// Pas de Web Lock API (bloque sur mobile), remplacé par un mutex in-memory.
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
      lock: inMemoryLock,
    },
  }
)

// Alias backward compat
export const supabaseLight = supabase

export async function initLightClientFromStorage() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user ?? null
  } catch {
    return null
  }
}
