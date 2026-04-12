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
    // Pas de guard sur profile : le RPC serveur est la source de vérité, pas
    // besoin d'attendre que le cache local soit hydraté pour envoyer le delta.
    // L'optimistic update est null-safe (si prev null, on le laisse tel quel).
    const nonce = generateNonce()
    return mutate({
      optimistic: (prev) => prev ? {
        ...prev,
        coins:   (prev.coins   ?? 0) + (delta.coins   ?? 0),
        tickets: (prev.tickets ?? 0) + (delta.tickets ?? 0),
        hints:   (prev.hints   ?? 0) + (delta.hints   ?? 0),
        energy:  Math.min((prev.energy ?? 0) + (delta.energy ?? 0), 10),
      } : prev,
      commit: async (prev) => {
        const { data, error } = await supabase.rpc('apply_currency_delta', {
          p_delta: delta,
          p_reason: reason,
          p_client_nonce: nonce,
          p_session_id: sessionId,
        })
        if (error) throw error
        return { ...(prev || {}), ...data }
      },
    })
  }, [mutate])

  /**
   * unlockFact — marque un fact comme débloqué côté Supabase (RPC idempotente).
   * Anti-replay via nonce. Retourne { category, facts_completed, was_new }.
   * Appelée en parallèle du legacy updateCollection, coexistence Phase A.
   */
  const unlockFact = useCallback(async (factId, category, reason = 'session_correct', sessionId = null) => {
    if (!factId || !category) return null
    const nonce = generateNonce()
    const { data, error } = await supabase.rpc('unlock_fact', {
      p_fact_id: factId,
      p_category: category,
      p_reason: reason,
      p_client_nonce: nonce,
      p_session_id: sessionId,
    })
    if (error) throw error
    return data
  }, [])

  /**
   * mergeFlags — merge atomique d'un patch JSONB dans profiles.flags.
   * Utilisé pour persister blitzRecords, route progress, coffreClaimedDays,
   * streakFreezeCount, statsByMode, badges, etc.
   *
   * @param {Object} patch - Objet à merger (top-level keys écrasent)
   * @example
   *   await mergeFlags({ blitzRecords: { 'sport_10': 23.5 } })
   *   await mergeFlags({ route: { level: 12, stars: {...} } })
   */
  const mergeFlags = useCallback(async (patch) => {
    if (!patch || typeof patch !== 'object') return null
    return mutate({
      optimistic: (prev) => ({
        ...prev,
        flags: { ...(prev?.flags || {}), ...patch },
      }),
      commit: async (prev) => {
        const { data, error } = await supabase.rpc('merge_player_flags', {
          p_patch: patch,
        })
        if (error) throw error
        // data = le nouveau flags complet côté serveur
        return { ...prev, flags: data || prev?.flags || {} }
      },
    })
  }, [mutate])

  return {
    profile,
    loading,
    error,
    applyCurrencyDelta,
    unlockFact,
    mergeFlags,
    refetch,
    setData,
    // Raccourcis pratiques
    coins:   profile?.coins   ?? null,
    tickets: profile?.tickets ?? null,
    hints:   profile?.hints   ?? null,
    energy:  profile?.energy  ?? null,
    flags:   profile?.flags   ?? {},
  }
}
