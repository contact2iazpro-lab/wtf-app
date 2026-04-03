// ─── Player Data Sync Service ────────────────────────────────────────────────
// Synchronise les données joueur entre localStorage et Supabase (table profiles).
// Stratégie : MAX de chaque valeur entre local et remote.
// Fire-and-forget : ne bloque jamais le gameplay.

import { supabase, isSupabaseConfigured } from '../lib/supabase'

/**
 * Sync player data between localStorage and Supabase profiles table.
 * @param {string} userId - Supabase user ID
 * @param {object} localData - Current localStorage data { wtfCoins, totalScore, streak, tickets }
 * @returns {object|null} Merged data or null if sync failed/skipped
 */
export async function syncPlayerData(userId, localData) {
  if (!isSupabaseConfigured || !userId) return null

  try {
    // Read remote profile
    const { data: remote, error } = await supabase
      .from('profiles')
      .select('coins, total_score, streak_current, streak_max, tickets, hints, last_played_date')
      .eq('id', userId)
      .single()

    if (error) {
      console.warn('[sync] Erreur lecture profil Supabase:', error.message)
      return null
    }

    // Read local hints (stored separately)
    const localHints = parseInt(localStorage.getItem('wtf_hints_available') || '0', 10)

    // Merge strategy: MAX of each value
    const merged = {
      coins: Math.max(localData.wtfCoins || 0, remote?.coins || 0),
      total_score: Math.max(localData.totalScore || 0, remote?.total_score || 0),
      streak_current: Math.max(localData.streak || 0, remote?.streak_current || 0),
      streak_max: Math.max(localData.streak || 0, remote?.streak_max || 0),
      tickets: Math.max(localData.tickets || 0, remote?.tickets || 0),
      hints: Math.max(localHints, remote?.hints || 0),
      last_played_date: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    }

    // Write to Supabase
    const { error: updateError } = await supabase
      .from('profiles')
      .update(merged)
      .eq('id', userId)

    if (updateError) {
      console.warn('[sync] Erreur écriture profil Supabase:', updateError.message)
      return null
    }

    // Write back to localStorage (update local with merged values)
    try {
      const saved = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      saved.wtfCoins = merged.coins
      saved.totalScore = merged.total_score
      saved.streak = merged.streak_current
      saved.tickets = merged.tickets
      localStorage.setItem('wtf_data', JSON.stringify(saved))
      localStorage.setItem('wtf_hints_available', String(merged.hints))
    } catch { /* localStorage write failed — continue */ }

    console.log(`[sync] Profil synchronisé — coins:${merged.coins} score:${merged.total_score} streak:${merged.streak_current} tickets:${merged.tickets} hints:${merged.hints}`)
    return merged
  } catch (err) {
    console.warn('[sync] Sync échouée:', err.message)
    return null
  }
}

/**
 * Fire-and-forget wrapper — never throws, never blocks.
 */
export function syncPlayerDataAsync(userId, localData) {
  if (!userId || !localData) return
  syncPlayerData(userId, localData).catch(() => {})
}
