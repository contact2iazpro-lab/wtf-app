/**
 * useDuels — Source de vérité unique pour tous les duels de l'user courant.
 *
 * Lit Supabase directement (duels + derniers rounds) avec Realtime.
 * Pas de cache localStorage.
 *
 * Retourne :
 *   {
 *     byFriendId,          // Map<friendId, { duel, lastRound, allRounds }>
 *     getStateFor(friendId) → { label, action, disabled, roundId, hasResultToSee }
 *     notificationCount,   // défis à relever + résultats à voir
 *     loading, error, refresh
 *   }
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { computeDuelState } from '../../../data/duelService'

async function fetchDuels(userId) {
  if (!userId) return []
  const { data: duels, error } = await supabase
    .from('duels')
    .select('*')
    .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
    .order('updated_at', { ascending: false })
  if (error) { console.warn('[useDuels] fetch error:', error.message); return [] }
  if (!duels || duels.length === 0) return []

  const duelIds = duels.map(d => d.id)
  const { data: rounds } = await supabase
    .from('challenges')
    .select('*')
    .in('duel_id', duelIds)
    .order('created_at', { ascending: false })

  return duels.map(duel => {
    const allRounds = (rounds || []).filter(r => r.duel_id === duel.id)
    return { duel, lastRound: allRounds[0] || null, allRounds }
  })
}

export function useDuels() {
  const { user, isConnected } = useAuth()
  const userId = user?.id
  const [duels, setDuels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  const refresh = useCallback(async () => {
    if (!isConnected || !userId) {
      setDuels([]); setLoading(false); return
    }
    try {
      const data = await fetchDuels(userId)
      if (mountedRef.current) { setDuels(data); setLoading(false); setError(null) }
    } catch (e) {
      console.warn('[useDuels] error:', e?.message || e)
      if (mountedRef.current) { setError(e); setLoading(false) }
    }
  }, [userId, isConnected])

  useEffect(() => {
    mountedRef.current = true
    refresh()
    return () => { mountedRef.current = false }
  }, [refresh])

  // Realtime : changements sur duels OU challenges qui m'impliquent
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`duels-${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'duels',
        filter: `player1_id=eq.${userId}`,
      }, () => refresh())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'duels',
        filter: `player2_id=eq.${userId}`,
      }, () => refresh())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'challenges',
        filter: `player1_id=eq.${userId}`,
      }, () => refresh())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'challenges',
        filter: `player2_id=eq.${userId}`,
      }, () => refresh())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, refresh])

  // Map friendId → { duel, lastRound, allRounds }
  const byFriendId = useMemo(() => {
    const map = new Map()
    for (const entry of duels) {
      const friendId = entry.duel.player1_id === userId ? entry.duel.player2_id : entry.duel.player1_id
      map.set(friendId, entry)
    }
    return map
  }, [duels, userId])

  const getStateFor = useCallback((friendId) => {
    const entry = byFriendId.get(friendId)
    return computeDuelState(entry?.duel, entry?.lastRound, userId)
  }, [byFriendId, userId])

  // Notifications agrégées : défis à relever + résultats à voir
  const notificationCount = useMemo(() => {
    let n = 0
    for (const [, entry] of byFriendId) {
      const st = computeDuelState(entry.duel, entry.lastRound, userId)
      if (st.action === 'accept' || st.hasResultToSee) n += 1
    }
    return n
  }, [byFriendId, userId])

  return { duels, byFriendId, getStateFor, notificationCount, loading, error, refresh }
}
