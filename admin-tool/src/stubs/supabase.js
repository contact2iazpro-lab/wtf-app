/**
 * Supabase stub for game components in admin-tool preview context.
 *
 * Two interception layers are active (see vite.config.js):
 *  1. ../lib/supabase imports are redirected here (so src/lib/supabase.js never loads)
 *  2. @supabase/supabase-js imports from game files are redirected here (safety net)
 *
 * This stub must export everything that either src/lib/supabase.js or
 * @supabase/supabase-js consumers may try to import.
 */

const noop = () => Promise.resolve({ data: null, error: null })

// Recursive no-op Proxy: any method chain resolves to noop
function makeNoopClient() {
  return new Proxy({}, {
    get(_, prop) {
      if (prop === 'then') return undefined // not a Promise itself
      return () => makeNoopClient()
    },
  })
}

const noopClient = makeNoopClient()

// ── Exports consumed by @supabase/supabase-js users (e.g. src/lib/supabase.js) ──
export function createClient() { return noopClient }

// ── Exports consumed by src/lib/supabase.js users (e.g. AuthContext, factsService) ──
export const supabase = noopClient
export const isSupabaseConfigured = false

export default noopClient
