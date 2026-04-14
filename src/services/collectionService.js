import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { getValidFacts } from '../data/factsService'

/**
 * Compteurs de facts débloqués par catégorie pour un AMI.
 * Passe par la RPC SECURITY DEFINER `get_friend_category_counts` qui valide
 * l'amitié côté serveur — RLS sur `collections` empêche un read direct.
 * Retour : { [category]: number }
 */
export async function loadFriendCategoryCounts(friendUserId) {
  if (!isSupabaseConfigured || !friendUserId) return {}
  try {
    const { data, error } = await supabase.rpc('get_friend_category_counts', {
      target_user_id: friendUserId,
    })
    if (error) throw error
    const counts = {}
    for (const row of data || []) counts[row.category] = row.count || 0
    return counts
  } catch (err) {
    console.warn('[Collection] loadFriendCategoryCounts failed:', err.message)
    return {}
  }
}

/**
 * Load all collections for a user.
 * Returns a map: { [category]: { facts_completed: number[], percentage: number, is_completed: boolean } }
 */
export async function loadUserCollections(userId) {
  if (!isSupabaseConfigured || !userId) return {}

  try {
    const { data, error } = await supabase
      .from('collections')
      .select('category, facts_completed, completion_percentage, is_completed')
      .eq('user_id', userId)

    if (error) throw error

    const map = {}
    for (const row of data || []) {
      map[row.category] = {
        factsCompleted: new Set(row.facts_completed || []),
        percentage: row.completion_percentage,
        isCompleted: row.is_completed,
      }
    }
    return map
  } catch (err) {
    console.error('[Collection] loadUserCollections error:', err)
    return {}
  }
}

/**
 * Merge Supabase collections with local unlockedFacts (Set of ids).
 * Supabase wins on conflicts (it has the source of truth).
 */
export function mergeCollections(supabaseCollections, localUnlockedFacts) {
  // Build a unified Set per category from both sources
  const merged = {}

  // Start from local
  for (const f of getValidFacts()) {
    if (localUnlockedFacts.has(f.id)) {
      if (!merged[f.category]) merged[f.category] = new Set()
      merged[f.category].add(f.id)
    }
  }

  // Merge Supabase (union)
  for (const [cat, data] of Object.entries(supabaseCollections)) {
    if (!merged[cat]) merged[cat] = new Set()
    for (const id of data.factsCompleted) merged[cat].add(id)
  }

  return merged // { [category]: Set<factId> }
}
