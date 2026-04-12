/**
 * useUnlockedFacts — Source de vérité unique pour les f*cts débloqués.
 *
 * Lit Supabase `collections.facts_completed` directement, union avec tout
 * localStorage.wtf_data.unlockedFacts au cas où il y a des unlocks en attente
 * de sync (optimistic). Retourne un Set<factId>.
 *
 * Réagit à l'event 'wtf_unlocks_changed' pour se rafraîchir après un unlock
 * local optimistic.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'

async function fetchUnlocked(userId) {
  if (!userId) return new Set()
  const { data, error } = await supabase
    .from('collections')
    .select('facts_completed')
    .eq('user_id', userId)
  if (error) { console.warn('[useUnlockedFacts] fetch error:', error.message); return new Set() }
  const ids = new Set()
  for (const row of data || []) {
    if (Array.isArray(row.facts_completed)) {
      for (const id of row.facts_completed) ids.add(id)
    }
  }
  return ids
}

function readLocalIds() {
  try {
    const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    return Array.isArray(wd.unlockedFacts) ? wd.unlockedFacts : []
  } catch { return [] }
}

export function useUnlockedFacts() {
  const { user, hasSession } = useAuth()
  const userId = user?.id
  const [unlocked, setUnlocked] = useState(() => new Set(readLocalIds()))
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  const refresh = useCallback(async () => {
    if (!hasSession || !userId) {
      // Joueur anonyme ou sans session : juste localStorage
      setUnlocked(new Set(readLocalIds()))
      setLoading(false)
      return
    }
    try {
      const serverSet = await fetchUnlocked(userId)
      const localIds = readLocalIds()
      // Union : on ne perd jamais un unlock local en attente
      const merged = new Set([...serverSet, ...localIds])
      if (mountedRef.current) {
        setUnlocked(merged)
        setLoading(false)
        // Écrit la fusion dans localStorage pour les consumers legacy
        try {
          const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
          wd.unlockedFacts = Array.from(merged)
          wd.lastModified = Date.now()
          localStorage.setItem('wtf_data', JSON.stringify(wd))
        } catch { /* ignore */ }
      }
    } catch (e) {
      console.warn('[useUnlockedFacts] error:', e?.message || e)
      if (mountedRef.current) setLoading(false)
    }
  }, [userId, hasSession])

  useEffect(() => {
    mountedRef.current = true
    refresh()
    return () => { mountedRef.current = false }
  }, [refresh])

  // Réagir aux unlocks optimistic locaux (event custom dispatched par useGameHandlers)
  useEffect(() => {
    const handler = () => setUnlocked(new Set(readLocalIds()))
    window.addEventListener('wtf_unlocks_changed', handler)
    window.addEventListener('wtf_storage_sync', handler)
    return () => {
      window.removeEventListener('wtf_unlocks_changed', handler)
      window.removeEventListener('wtf_storage_sync', handler)
    }
  }, [])

  // Realtime : si un unlock serveur arrive (autre device), refresh
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`unlocks-${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'collections',
        filter: `user_id=eq.${userId}`,
      }, () => refresh())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, refresh])

  return { unlocked, loading, refresh }
}
