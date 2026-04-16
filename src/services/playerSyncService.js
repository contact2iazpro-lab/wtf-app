// ─── Player Sync Service — Simplifié & Sécurisé ─────────────────────────────
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export async function pushToServer(userId) {
  if (!isSupabaseConfigured || !userId) return null
  try {
    const saved = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    // Note: coins/hints ne sont PLUS syncés ici — ils passent par le delta RPC
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
    // Note: les DEVISES (coins/hints) sont gérées par usePlayerProfile + delta RPC.
    // pullFromServer ne synce plus que les données NON-devise (score, streak, collections).
    const { data: remote, error } = await supabase
      .from('profiles')
      .select('total_score, streak_current, streak_max, last_played_date, last_modified, flags, stats_by_mode')
      .eq('id', userId)
      .single()
    if (error) throw error
    if (!remote) return null

    const saved = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    const localTimestamp = saved.lastModified || 0
    const remoteTimestamp = remote.last_modified || 0

    // Pour les données non-devise (score/streak) : last-write-wins
    if (remoteTimestamp > localTimestamp) {
      saved.totalScore = remote.total_score || 0
      saved.streak = remote.streak_current || 0
      saved.bestStreak = Math.max(saved.bestStreak || 0, remote.streak_max || 0)
      saved.lastModified = remoteTimestamp
      // A.9 : rapatrier aussi flags (blitzRecords, quest, coffre, badges, etc.)
      // et stats_by_mode depuis Supabase
      if (remote.flags && typeof remote.flags === 'object') {
        saved.flags = { ...(saved.flags || {}), ...remote.flags }
        // Dépoter certains flags bien connus dans leur emplacement legacy
        // pour que le code existant continue à marcher sans modification
        if (remote.flags.blitzRecords) saved.blitzRecords = remote.flags.blitzRecords
        // 1d — quest progress (ex-route). Support legacy remote.flags.route
        if (remote.flags.quest) saved.quest = remote.flags.quest
        else if (remote.flags.route) saved.quest = remote.flags.route
        if (remote.flags.streakPaliersClaimed) saved.streakPaliersClaimed = remote.flags.streakPaliersClaimed
        if (remote.flags.streakFreezeCount !== undefined) saved.streakFreezeCount = remote.flags.streakFreezeCount
        if (remote.flags.bestBlitzTime) saved.bestBlitzTime = remote.flags.bestBlitzTime
        // A.9.6 — stats et totaux : MAX par champ (compteurs monotones, jamais
        // décroissants). Évite qu'un pull d'un device moins à jour n'écrase les
        // stats locales plus avancées. Fonctionne pour même-device comme cross-device.
        if (remote.flags.statsByMode && typeof remote.flags.statsByMode === 'object') {
          const localStats = saved.statsByMode || {}
          const remoteStats = remote.flags.statsByMode
          const mergedStats = { ...localStats }
          for (const modeKey of Object.keys(remoteStats)) {
            const l = localStats[modeKey] || {}
            const r = remoteStats[modeKey] || {}
            mergedStats[modeKey] = {
              gamesPlayed: Math.max(l.gamesPlayed || 0, r.gamesPlayed || 0),
              totalCorrect: Math.max(l.totalCorrect || 0, r.totalCorrect || 0),
              totalAnswered: Math.max(l.totalAnswered || 0, r.totalAnswered || 0),
              bestStreak: Math.max(l.bestStreak || 0, r.bestStreak || 0),
            }
          }
          saved.statsByMode = mergedStats
        }
        if (remote.flags.gamesPlayed !== undefined) saved.gamesPlayed = Math.max(saved.gamesPlayed || 0, remote.flags.gamesPlayed)
        if (remote.flags.questsPlayed !== undefined) saved.questsPlayed = Math.max(saved.questsPlayed || 0, remote.flags.questsPlayed)
        if (remote.flags.totalCorrect !== undefined) saved.totalCorrect = Math.max(saved.totalCorrect || 0, remote.flags.totalCorrect)
        if (remote.flags.totalAnswered !== undefined) saved.totalAnswered = Math.max(saved.totalAnswered || 0, remote.flags.totalAnswered)
        if (remote.flags.blitzPerfects !== undefined) saved.blitzPerfects = Math.max(saved.blitzPerfects || 0, remote.flags.blitzPerfects)
        // Bloc 2.8 — badges déjà notifiés (anti-replay des trophées cross-device)
        if (Array.isArray(remote.flags.badgesEarned)) {
          saved.badgesEarned = [...new Set([...(saved.badgesEarned || []), ...remote.flags.badgesEarned])]
        }
        // Bloc 3 — catégories débloquées (Quest progression + achat 100 coins)
        if (Array.isArray(remote.flags.unlockedCategories)) {
          saved.unlockedCategories = [...new Set([...(saved.unlockedCategories || []), ...remote.flags.unlockedCategories])]
        }
      }
      if (remote.stats_by_mode && typeof remote.stats_by_mode === 'object' && !saved.statsByMode) {
        // Fallback : si flags.statsByMode absent, utiliser la colonne stats_by_mode
        saved.statsByMode = remote.stats_by_mode
      }
      localStorage.setItem('wtf_data', JSON.stringify(saved))
    } else if (localTimestamp > remoteTimestamp) {
      // Local plus récent → push score/streak vers serveur (fire & forget,
      // on NE return PAS — la synchro des collections doit toujours se faire
      // car le timestamp profiles peut être désaligné avec collections).
      pushToServer(userId).catch(() => {})
    }
    try {
      const { data: collections } = await supabase
        .from('collections')
        .select('facts_completed')
        .eq('user_id', userId)
      const serverIds = []
      if (collections && collections.length > 0) {
        for (const row of collections) {
          if (Array.isArray(row.facts_completed)) serverIds.push(...row.facts_completed)
        }
      }
      const s = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      const localIds = Array.isArray(s.unlockedFacts) ? s.unlockedFacts : []
      // Union locale + serveur : on ne perd jamais de f*ct connu d'un côté.
      // Les unlocks locaux en attente seront de toute façon pushés vers
      // collections au prochain unlock (via updateCollection/unlock_fact RPC).
      const merged = [...new Set([...localIds, ...serverIds])]
      if (merged.length !== localIds.length || merged.length !== serverIds.length) {
        s.unlockedFacts = merged
        s.lastModified = Date.now()
        localStorage.setItem('wtf_data', JSON.stringify(s))
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