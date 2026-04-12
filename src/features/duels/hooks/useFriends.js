/**
 * useFriends — Source de vérité unique pour la liste d'amis.
 *
 * Lit Supabase directement (friendships + friend_codes) avec Realtime.
 * Pas de cache localStorage. Pas de loadData manuel.
 *
 * Retourne :
 *   { friends, pendingReceived, pendingSent, loading, error, refresh }
 *
 * Chaque friend : { userId, friendshipId, displayName, avatarUrl, code, since }
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'

async function fetchFriends(userId) {
  if (!userId) return { friends: [], pendingReceived: [], pendingSent: [] }

  // 1. Friendships acceptées (bidirectionnel)
  const { data: accepted } = await supabase
    .from('friendships')
    .select('*')
    .or(`and(user1_id.eq.${userId},status.eq.accepted),and(user2_id.eq.${userId},status.eq.accepted)`)

  // 2. Demandes reçues en attente
  const { data: pending } = await supabase
    .from('friendships')
    .select('*')
    .eq('user2_id', userId)
    .eq('status', 'pending')

  // 3. Demandes envoyées en attente (pour masquer les boutons "Ajouter" si déjà invité)
  const { data: sent } = await supabase
    .from('friendships')
    .select('*')
    .eq('user1_id', userId)
    .eq('status', 'pending')

  // Collect all user ids to fetch their display info in one query
  const friendIds = (accepted || []).map(f => f.user1_id === userId ? f.user2_id : f.user1_id)
  const pendingIds = (pending || []).map(f => f.user1_id)
  const sentIds = (sent || []).map(f => f.user2_id)
  const allIds = Array.from(new Set([...friendIds, ...pendingIds, ...sentIds]))

  const { data: codes } = allIds.length > 0
    ? await supabase.from('friend_codes').select('*').in('user_id', allIds)
    : { data: [] }

  const codeByUserId = new Map((codes || []).map(c => [c.user_id, c]))
  const mapRow = (f, otherId) => {
    const info = codeByUserId.get(otherId) || {}
    return {
      friendshipId: f.id,
      userId: otherId,
      displayName: info.display_name || 'Joueur WTF!',
      avatarUrl: info.avatar_url,
      code: info.code,
      since: f.accepted_at || f.created_at,
    }
  }

  return {
    friends: (accepted || []).map(f => mapRow(f, f.user1_id === userId ? f.user2_id : f.user1_id)),
    pendingReceived: (pending || []).map(f => mapRow(f, f.user1_id)),
    pendingSent: (sent || []).map(f => mapRow(f, f.user2_id)),
  }
}

export function useFriends() {
  const { user, isConnected } = useAuth()
  const userId = user?.id
  const [state, setState] = useState({
    friends: [],
    pendingReceived: [],
    pendingSent: [],
    loading: true,
    error: null,
  })
  const mountedRef = useRef(true)

  const refresh = useCallback(async () => {
    if (!isConnected || !userId) {
      setState({ friends: [], pendingReceived: [], pendingSent: [], loading: false, error: null })
      return
    }
    try {
      const data = await fetchFriends(userId)
      if (mountedRef.current) setState({ ...data, loading: false, error: null })
    } catch (e) {
      console.warn('[useFriends] fetch error:', e?.message || e)
      if (mountedRef.current) setState(s => ({ ...s, loading: false, error: e }))
    }
  }, [userId, isConnected])

  useEffect(() => {
    mountedRef.current = true
    refresh()
    return () => { mountedRef.current = false }
  }, [refresh])

  // Realtime : notif sur friendships touchant cet user
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`friends-${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'friendships',
        filter: `user1_id=eq.${userId}`,
      }, () => refresh())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'friendships',
        filter: `user2_id=eq.${userId}`,
      }, () => refresh())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, refresh])

  return { ...state, refresh }
}
