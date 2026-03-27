import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { loadUserCollections, mergeCollections, FACTS_PER_CATEGORY } from '../services/collectionService'
import { VALID_FACTS } from '../data/facts'

/**
 * Returns per-category progress computed from:
 * 1. Supabase collections (if connected)
 * 2. localStorage unlockedFacts (always)
 *
 * Returns: { unlockedByCategory: { [cat]: Set<id> }, loading }
 */
export function useCollection(localUnlockedFacts) {
  const { user } = useAuth()
  const [supabaseCollections, setSupabaseCollections] = useState({})
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (!user) { setSupabaseCollections({}); return }
    setLoading(true)
    const data = await loadUserCollections(user.id)
    setSupabaseCollections(data)
    setLoading(false)
  }, [user])

  useEffect(() => { reload() }, [reload])

  const unlockedByCategory = mergeCollections(supabaseCollections, localUnlockedFacts || new Set())

  return { unlockedByCategory, loading, reload }
}

/**
 * Compute summary stats per category.
 */
export function getCategoryStats(unlockedByCategory) {
  const stats = {}
  for (const [cat, ids] of Object.entries(unlockedByCategory)) {
    const total = FACTS_PER_CATEGORY[cat] || 0
    const unlocked = ids.size
    stats[cat] = {
      unlocked,
      total,
      percentage: total > 0 ? Math.round((unlocked / total) * 100) : 0,
      isCompleted: total > 0 && unlocked >= total,
    }
  }
  // Fill in categories with 0 progress
  for (const f of VALID_FACTS) {
    if (!stats[f.category]) {
      stats[f.category] = {
        unlocked: 0,
        total: FACTS_PER_CATEGORY[f.category] || 0,
        percentage: 0,
        isCompleted: false,
      }
    }
  }
  return stats
}
