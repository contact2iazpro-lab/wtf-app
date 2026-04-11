// ─── Player Sync Service — Simplifié & Sécurisé ─────────────────────────────
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export async function pushToServer(userId) {
  if (!isSupabaseConfigured || !userId) return null
  try {
    const saved = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    // Note: coins/tickets/hints ne sont PLUS syncés ici — ils passent par le delta RPC
    // via CurrencyContext → syncQueue → apply_currency_delta
    const payload = {
      total_score: saved.totalScore || 0,
      streak_current: saved.streak || 0,
      streak_max: Math.max(saved.streak || 0, saved.bestStreak || 0),
      last_played_date: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
      last_modified: Date.now(),
    }
    const { error } = await supabase.from('profiles').update(payload).eq('id', userId)
    if (error) throw error
    saved.lastModified = payload.last_modified
    localStorage.setItem('wtf_data', JSON.stringify(saved))
    return payload
  } catch (err) {
    console.warn('[sync] pushToServer failed:', err.message)
    return null
  }
}

export async function pullFromServer(userId) {
  if (!isSupabaseConfigured || !userId) return null
  try {
    // Note: les DEVISES (coins/tickets/hints) sont gérées par CurrencyContext + delta RPC.
    // pullFromServer ne synce plus que les données NON-devise (score, streak, collections).
    const { data: remote, error } = await supabase
      .from('profiles')
      .select('total_score, streak_current, streak_max, last_played_date, last_modified')
      .eq('id', userId)
      .single()
    if (error) throw error
    if (!remote) return null

    const saved = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    const localTimestamp = saved.lastModified || 0
    const remoteTimestamp = remote.last_modified || 0

    // Pour les données non-devise : si remote est plus récent, on pull
    if (remoteTimestamp > localTimestamp) {
      saved.totalScore = remote.total_score || 0
      saved.streak = remote.streak_current || 0
      saved.bestStreak = Math.max(saved.bestStreak || 0, remote.streak_max || 0)
      saved.lastModified = remoteTimestamp
      localStorage.setItem('wtf_data', JSON.stringify(saved))
    } else if (localTimestamp > remoteTimestamp) {
      // Local plus récent → push les données non-devise vers serveur
      return pushToServer(userId)
    }
    try {
      const { data: collections } = await supabase
        .from('collections')
        .select('facts_completed')
        .eq('user_id', userId)
      if (collections && collections.length > 0) {
        const allUnlockedIds = []
        for (const row of collections) {
          if (Array.isArray(row.facts_completed)) allUnlockedIds.push(...row.facts_completed)
        }
        if (allUnlockedIds.length > 0) {
          const s = JSON.parse(localStorage.getItem('wtf_data') || '{}')
          // REMPLACER les unlockedFacts (pas merger — évite la contamination entre comptes)
          s.unlockedFacts = [...new Set(allUnlockedIds)]
          s.lastModified = Date.now()
          localStorage.setItem('wtf_data', JSON.stringify(s))
        }
      }
    } catch (err) { console.warn('[sync] unlockedFacts sync failed:', err.message) }
    window.dispatchEvent(new Event('wtf_storage_sync'))
    return remote
  } catch (err) {
    console.warn('[sync] pullFromServer failed:', err.message)
    return null
  }
}

let _lastSyncTime = 0
const THROTTLE_MS = 5000 // Throttle push à 5s pour éviter surcharge après chaque action

export function syncAfterAction(userId) {
  if (!userId) return
  const now = Date.now()
  if (now - _lastSyncTime < THROTTLE_MS) return
  _lastSyncTime = now
  pushToServer(userId).catch(() => {})
}