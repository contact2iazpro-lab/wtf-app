// ─── Player Data Sync Service ────────────────────────────────────────────────
// SERVER-AUTHORITATIVE : Supabase = source de vérité.
// localStorage = cache rapide, jamais prioritaire sur le serveur.
// Fire-and-forget : ne bloque jamais le gameplay.

import { supabase, isSupabaseConfigured } from '../lib/supabase'

// ─── Throttle pour syncAfterAction ──────────────────────────────────────────
let _lastSyncTime = 0
const SYNC_THROTTLE_MS = 5000

// ─── Helpers ────────────────────────────────────────────────────────────────

function readLocal() {
  try {
    const raw = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    return {
      coins:      raw.wtfCoins    || 0,
      totalScore: raw.totalScore  || 0,
      streak:     raw.streak      || 0,
      bestStreak: raw.bestStreak  || 0,
      tickets:    raw.tickets     || 0,
      hints:      parseInt(localStorage.getItem('wtf_hints_available') || '0', 10),
    }
  } catch {
    return { coins: 0, totalScore: 0, streak: 0, bestStreak: 0, tickets: 0, hints: 0 }
  }
}

function writeLocal(data) {
  try {
    const saved = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    saved.wtfCoins   = data.coins
    saved.totalScore = data.totalScore
    saved.streak     = data.streak
    saved.bestStreak = data.bestStreak
    saved.tickets    = data.tickets
    localStorage.setItem('wtf_data', JSON.stringify(saved))
    localStorage.setItem('wtf_hints_available', String(data.hints))
    // Notify App.jsx
    window.dispatchEvent(new Event('wtf_storage_sync'))
  } catch { /* localStorage write failed — continue */ }
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── Push : local → Supabase ────────────────────────────────────────────────

export async function pushToServer(userId, localData) {
  if (!isSupabaseConfigured || !userId) return

  const data = localData || readLocal()
  const payload = {
    coins:          data.coins      ?? data.wtfCoins ?? 0,
    total_score:    data.totalScore ?? 0,
    streak_current: data.streak     ?? 0,
    streak_max:     Math.max(data.bestStreak || 0, data.streak || 0),
    tickets:        data.tickets    ?? 0,
    hints:          data.hints      ?? parseInt(localStorage.getItem('wtf_hints_available') || '0', 10),
    last_played_date: new Date().toISOString().slice(0, 10),
    last_modified:  Date.now(),
    updated_at:     new Date().toISOString(),
  }

  // Retry up to 2 times
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: userId, ...payload }, { onConflict: 'id' })

      if (error) throw error
      return // success
    } catch (err) {
      console.warn(`[sync] pushToServer attempt ${attempt + 1} failed:`, err.message)
      if (attempt < 2) await wait(1500)
    }
  }

  // All retries failed → queue for later
  try {
    localStorage.setItem('wtf_sync_queue', JSON.stringify({ userId, payload, timestamp: Date.now() }))
    console.warn('[sync] Push queued for later replay')
  } catch { /* localStorage full — drop */ }
}

// ─── Pull : Supabase → local ────────────────────────────────────────────────

export async function pullFromServer(userId) {
  if (!isSupabaseConfigured || !userId) return null

  try {
    const { data: remote, error } = await supabase
      .from('profiles')
      .select('coins, total_score, streak_current, streak_max, tickets, hints, last_played_date, last_modified')
      .eq('id', userId)
      .single()

    if (error) {
      console.warn('[sync] pullFromServer error:', error.message)
      return null
    }

    if (!remote) return null

    const merged = {
      coins:      remote.coins          || 0,
      totalScore: remote.total_score    || 0,
      streak:     remote.streak_current || 0,
      bestStreak: remote.streak_max     || 0,
      tickets:    remote.tickets        || 0,
      hints:      remote.hints          || 0,
    }

    writeLocal(merged)
    return merged
  } catch (err) {
    console.warn('[sync] pullFromServer failed:', err.message)
    return null
  }
}

// ─── Replay queued sync ─────────────────────────────────────────────────────

export async function replaySyncQueue(userId) {
  if (!isSupabaseConfigured || !userId) return

  try {
    const raw = localStorage.getItem('wtf_sync_queue')
    if (!raw) return

    const queued = JSON.parse(raw)
    if (queued.userId !== userId) {
      localStorage.removeItem('wtf_sync_queue')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, ...queued.payload }, { onConflict: 'id' })

    if (error) {
      console.warn('[sync] replaySyncQueue failed, keeping queue:', error.message)
      return
    }

    localStorage.removeItem('wtf_sync_queue')
  } catch (err) {
    console.warn('[sync] replaySyncQueue error:', err.message)
  }
}

// ─── Sync after action (throttled) ──────────────────────────────────────────

export function syncAfterAction(userId) {
  const now = Date.now()
  if (now - _lastSyncTime < SYNC_THROTTLE_MS) return
  _lastSyncTime = now
  pushToServer(userId).catch(() => {})
}

// ─── Backward-compatible exports ────────────────────────────────────────────
// App.jsx uses syncPlayerDataAsync(userId, localData)
// AuthContext.jsx uses syncPlayerData(userId, localData)

export async function syncPlayerData(userId, localData) {
  if (!userId) return null
  await pushToServer(userId, localData)
  return await pullFromServer(userId)
}

export function syncPlayerDataAsync(userId, localData) {
  if (!userId) return
  pushToServer(userId, localData).catch(() => {})
}
