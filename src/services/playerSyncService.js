// ─── Player Data Sync Service — Server-Authoritative ─────────────────────────
// Supabase = source de vérité unique.
// Le local (localStorage) est un cache rapide, pas un concurrent.
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const SYNC_QUEUE_KEY = 'wtf_sync_queue'
let _lastSyncTime = 0
const THROTTLE_MS = 5000

// ── pushToServer : local → Supabase (upsert) ────────────────────────────────
export async function pushToServer(userId) {
  if (!isSupabaseConfigured || !userId) return null
  try {
    const saved = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    const hints = parseInt(localStorage.getItem('wtf_hints_available') || '0', 10)
    const payload = {
      coins: saved.wtfCoins || 0,
      total_score: saved.totalScore || 0,
      streak_current: saved.streak || 0,
      streak_max: Math.max(saved.streak || 0, saved.bestStreak || 0),
      tickets: saved.tickets || 0,
      hints,
      last_played_date: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
      last_modified: Date.now(),
    }
    const { error } = await supabase.from('profiles').update(payload).eq('id', userId)
    if (error) throw error
    // Mettre à jour lastModified local
    saved.lastModified = payload.last_modified
    localStorage.setItem('wtf_data', JSON.stringify(saved))
    // Vider la queue si push réussi
    localStorage.removeItem(SYNC_QUEUE_KEY)
    return payload
  } catch (err) {
    console.warn('[sync] pushToServer échoué:', err.message)
    // Stocker en queue pour retry
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify({ userId, timestamp: Date.now() }))
    return null
  }
}

// ── pullFromServer : Supabase → local (sens unique, pas de merge) ────────────
export async function pullFromServer(userId) {
  if (!isSupabaseConfigured || !userId) return null
  try {
    const { data: remote, error } = await supabase
      .from('profiles')
      .select('coins, total_score, streak_current, streak_max, tickets, hints, last_played_date, last_modified')
      .eq('id', userId)
      .single()
    if (error) throw error
    if (!remote) return null
    // Écraser le local avec les valeurs Supabase
    const saved = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    saved.wtfCoins = remote.coins || 0
    saved.totalScore = remote.total_score || 0
    saved.streak = remote.streak_current || 0
    saved.bestStreak = Math.max(saved.bestStreak || 0, remote.streak_max || 0)
    saved.tickets = remote.tickets || 0
    saved.lastModified = remote.last_modified || Date.now()
    localStorage.setItem('wtf_data', JSON.stringify(saved))
    localStorage.setItem('wtf_hints_available', String(remote.hints || 0))
    // Notifier App.jsx de recharger le state
    window.dispatchEvent(new Event('wtf_storage_sync'))
    return remote
  } catch (err) {
    console.warn('[sync] pullFromServer échoué:', err.message)
    return null
  }
}

// ── replaySyncQueue : rejouer les syncs en attente au montage ─────────────────
export async function replaySyncQueue(userId) {
  if (!userId) return
  try {
    const queueJson = localStorage.getItem(SYNC_QUEUE_KEY)
    if (!queueJson) return
    const queue = JSON.parse(queueJson)
    if (queue.userId === userId) {
      await pushToServer(userId)
    }
  } catch { /* ignore */ }
}

// ── syncAfterAction : wrapper throttlé pour le gameplay ──────────────────────
export function syncAfterAction(userId) {
  if (!userId) return
  const now = Date.now()
  if (now - _lastSyncTime < THROTTLE_MS) return
  _lastSyncTime = now
  pushToServer(userId).catch(() => {})
}

// ── Rétro-compatibilité (utilisé par AuthContext et App.jsx) ─────────────────
export async function syncPlayerData(userId, localData) {
  return pullFromServer(userId)
}
export function syncPlayerDataAsync(userId, localData) {
  if (!userId) return
  pullFromServer(userId).catch(() => {})
}
