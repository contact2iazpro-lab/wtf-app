// ─── Player Sync Service — Simplifié ─────────────────────────────────────────
// Rôle unique : synchroniser le profil joueur entre localStorage et Supabase.
// Les devises (coins/tickets/hints) sont gérées par currencyService.js.
//
// pushToServer(userId) — local → Supabase (après chaque action gameplay)
// pullFromServer(userId) — Supabase → local (uniquement au login)

import { supabase, isSupabaseConfigured } from '../lib/supabase'

// ── pushToServer : lit localStorage, push vers Supabase ──────────────────────
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
    return payload
  } catch (err) {
    console.warn('[sync] pushToServer échoué:', err.message)
    return null
  }
}

// ── pullFromServer : Supabase → local (UNIQUEMENT au login) ──────────────────
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

    // Détecter un profil vierge (vient d'être créé par le trigger Supabase)
    const isNewProfile = (remote.coins || 0) === 0
      && (remote.total_score || 0) === 0
      && (remote.tickets || 0) === 0
      && (remote.hints || 0) === 0
      && (remote.streak_current || 0) === 0

    if (isNewProfile) {
      // Nouveau profil → ne pas écraser le local (le joueur a peut-être déjà joué avant de se connecter)
      // Au lieu de ça, pusher le local vers Supabase pour initialiser le profil
      console.log('[sync] Nouveau profil détecté — push local vers Supabase')
      return pushToServer(userId)
    }

    // Profil existant → écraser le local avec Supabase
    const saved = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    saved.wtfCoins = remote.coins || 0
    saved.totalScore = remote.total_score || 0
    saved.streak = remote.streak_current || 0
    saved.bestStreak = Math.max(saved.bestStreak || 0, remote.streak_max || 0)
    saved.tickets = remote.tickets || 0
    saved.lastModified = remote.last_modified || Date.now()
    localStorage.setItem('wtf_data', JSON.stringify(saved))
    localStorage.setItem('wtf_hints_available', String(remote.hints || 0))

    // Synchroniser les unlockedFacts depuis la table collections
    try {
      const { data: collections } = await supabase
        .from('collections')
        .select('facts_completed')
        .eq('user_id', userId)
      if (collections && collections.length > 0) {
        const allUnlockedIds = []
        for (const row of collections) {
          if (Array.isArray(row.facts_completed)) {
            allUnlockedIds.push(...row.facts_completed)
          }
        }
        if (allUnlockedIds.length > 0) {
          const savedForFacts = JSON.parse(localStorage.getItem('wtf_data') || '{}')
          // Merger : garder les locaux + ajouter ceux de Supabase
          const existingUnlocked = new Set(savedForFacts.unlockedFacts || [])
          for (const id of allUnlockedIds) existingUnlocked.add(id)
          savedForFacts.unlockedFacts = [...existingUnlocked]
          savedForFacts.lastModified = Date.now()
          localStorage.setItem('wtf_data', JSON.stringify(savedForFacts))
        }
      }
    } catch (err) {
      console.warn('[sync] Sync unlockedFacts depuis collections échoué:', err.message)
    }

    // Notifier l'UI
    window.dispatchEvent(new Event('wtf_storage_sync'))
    return remote
  } catch (err) {
    console.warn('[sync] pullFromServer échoué:', err.message)
    return null
  }
}

// ── syncAfterAction : push throttlé pour le gameplay courant ─────────────────
let _lastSyncTime = 0
const THROTTLE_MS = 5000

export function syncAfterAction(userId) {
  if (!userId) return
  const now = Date.now()
  if (now - _lastSyncTime < THROTTLE_MS) return
  _lastSyncTime = now
  pushToServer(userId).catch(() => {})
}

// ── Stubs rétro-compat (importés par App.jsx et AuthContext) ─────────────────
export async function replaySyncQueue() {}
export async function syncPlayerData(userId) { return pullFromServer(userId) }
export function syncPlayerDataAsync(userId) { if (userId) pullFromServer(userId).catch(() => {}) }
