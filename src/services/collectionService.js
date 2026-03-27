import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { VALID_FACTS } from '../data/facts'

// Total facts per category — computed once from actual data
export const FACTS_PER_CATEGORY = (() => {
  const counts = {}
  for (const f of VALID_FACTS) counts[f.category] = (counts[f.category] || 0) + 1
  return counts
})()

/**
 * Record a correct answer in the collection.
 * Returns { alreadyCompleted, newPiece, percentage, isCompleted }
 */
export async function updateCollection(userId, category, factId) {
  if (!isSupabaseConfigured || !userId) return { skipped: true }

  try {
    // Fetch existing collection row
    const { data: existing } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', userId)
      .eq('category', category)
      .maybeSingle()

    const factsCompleted = existing?.facts_completed || []

    if (factsCompleted.includes(factId)) return { alreadyCompleted: true }

    const newFactsCompleted = [...factsCompleted, factId]
    const total = FACTS_PER_CATEGORY[category] || 1
    const percentage = Math.round((newFactsCompleted.length / total) * 100)
    const isCompleted = percentage === 100

    await supabase.from('collections').upsert({
      user_id: userId,
      category,
      facts_completed: newFactsCompleted,
      completion_percentage: percentage,
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : existing?.completed_at || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,category' })

    return { newPiece: true, percentage, isCompleted, count: newFactsCompleted.length, total }
  } catch (err) {
    console.error('[Collection] updateCollection error:', err)
    return { error: err.message }
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
  for (const f of VALID_FACTS) {
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
