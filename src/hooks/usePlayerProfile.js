/**
 * usePlayerProfile — accès optimiste au profil joueur (coins, tickets, hints, energy).
 *
 * Utilise useSupabaseResource pour cache stale-while-revalidate.
 * Expose applyCurrencyDelta() qui appelle la RPC Supabase avec nonce anti-replay.
 *
 * Usage :
 *   const { profile, loading, applyCurrencyDelta } = usePlayerProfile()
 *   await applyCurrencyDelta({ coins: 2 }, 'flash_correct')
 */

import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useSupabaseResource, generateNonce } from './useSupabaseResource'

export function usePlayerProfile() {
  const { user, hasSession } = useAuth()
  const userId = user?.id

  const fetcher = useCallback(async () => {
    if (!userId) return null
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, coins, tickets, hints, energy, energy_reset_at, streak_current, streak_max, stats_by_mode, flags, seeded')
      .eq('id', userId)
      .single()
    if (error) throw error
    return data
  }, [userId])

  const {
    data: profile, loading, error,
    mutate, refetch, setData,
  } = useSupabaseResource({
    cacheKey: userId ? `wtf_profile_${userId}` : null,
    channel: 'profile',
    fetcher,
    enabled: hasSession && !!userId,
  })

  /**
   * applyCurrencyDelta — applique un delta atomique via RPC serveur.
   *
   * @param {Object} delta - { coins, tickets, hints, energy } (valeurs signées)
   * @param {string} reason - 'flash_correct' | 'quest_perfect' | 'shop_buy_tickets' | ...
   * @param {string} [sessionId] - optionnel, groupe les mutations d'une session
   */
  const applyCurrencyDelta = useCallback(async (delta, reason, sessionId = null) => {
    if (!profile) throw new Error('no_profile_loaded')
    const nonce = generateNonce()
    return mutate({
      optimistic: (prev) => ({
        ...prev,
        coins:   (prev.coins   ?? 0) + (delta.coins   ?? 0),
        tickets: (prev.tickets ?? 0) + (delta.tickets ?? 0),
        hints:   (prev.hints   ?? 0) + (delta.hints   ?? 0),
        energy:  Math.min((prev.energy ?? 0) + (delta.energy ?? 0), 10),
      }),
      commit: async (prev) => {
        const { data, error } = await supabase.rpc('apply_currency_delta', {
          p_delta: delta,
          p_reason: reason,
          p_client_nonce: nonce,
          p_session_id: sessionId,
        })
        if (error) throw error
        // data = { coins, tickets, hints, energy } — l'état canonique post-mutation
        return { ...prev, ...data }
      },
    })
  }, [profile, mutate])

  return {
    profile,
    loading,
    error,
    applyCurrencyDelta,
    refetch,
    setData,
    // Raccourcis pratiques
    coins:   profile?.coins   ?? null,
    tickets: profile?.tickets ?? null,
    hints:   profile?.hints   ?? null,
    energy:  profile?.energy  ?? null,
  }
}
