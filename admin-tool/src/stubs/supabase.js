/**
 * Null supabase stub for game components rendered in admin-tool preview.
 * Prevents @supabase/supabase-js from being resolved in the game's src context
 * where the package is not installed (different node_modules tree).
 */
const noop = () => Promise.resolve({ data: null, error: null })
const noopChain = new Proxy({}, {
  get: () => noopChain,
  apply: () => Promise.resolve({ data: null, error: null }),
})

export const supabase = noopChain
export default supabase
