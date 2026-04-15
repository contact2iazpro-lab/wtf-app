/**
 * usePlayerProfile — accès optimiste au profil joueur (coins, hints, energy).
 *
 * Utilise useSupabaseResource pour cache stale-while-revalidate.
 * Expose applyCurrencyDelta() qui appelle la RPC Supabase avec nonce anti-replay.
 *
 * Joueurs anonymes (pas de session Supabase) : applyCurrencyDelta écrit directement
 * dans localStorage wtf_data + dispatch `wtf_currency_updated` pour re-render.
 * Les accesseurs coins/hints fallback vers localStorage quand profile est null.
 *
 * Usage :
 *   const { profile, loading, applyCurrencyDelta } = usePlayerProfile()
 *   await applyCurrencyDelta({ coins: 30 }, 'flash_daily')
 */

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useSupabaseResource, generateNonce } from './useSupabaseResource'

function readLocalBalances() {
  try {
    const data = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    return {
      coins: data.wtfCoins || 0,
      hints: parseInt(data.hints || 0, 10) || 0,
    }
  } catch {
    return { coins: 0, hints: 0 }
  }
}

function writeLocalDelta(delta) {
  try {
    const data = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    if (delta.coins)   data.wtfCoins = Math.max(0, (data.wtfCoins || 0) + delta.coins)
    if (delta.hints)   data.hints    = Math.max(0, (parseInt(data.hints || 0, 10) || 0) + delta.hints)
    if (delta.hints)   data.hints    = Math.max(0, (parseInt(data.hints || 0, 10) || 0) + delta.hints)
    data.lastModified = Date.now()
    localStorage.setItem('wtf_data', JSON.stringify(data))
    window.dispatchEvent(new Event('wtf_currency_updated'))
    window.dispatchEvent(new Event('wtf_storage_sync'))
    return { coins: data.wtfCoins || 0, hints: parseInt(data.hints || 0, 10) || 0 }
  } catch {
    return null
  }
}

export function usePlayerProfile() {
  const { user, hasSession } = useAuth()
  const userId = user?.id

  // Fallback localStorage pour les joueurs anonymes (pas de profile Supabase).
  // Re-render sur les events de mutation locale déclenchés par applyCurrencyDelta.
  const [localBalances, setLocalBalances] = useState(() => readLocalBalances())
  useEffect(() => {
    if (hasSession) return
    const refresh = () => setLocalBalances(readLocalBalances())
    window.addEventListener('wtf_currency_updated', refresh)
    window.addEventListener('wtf_storage_sync', refresh)
    return () => {
      window.removeEventListener('wtf_currency_updated', refresh)
      window.removeEventListener('wtf_storage_sync', refresh)
    }
  }, [hasSession])

  const fetcher = useCallback(async () => {
    if (!userId) return null
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, coins, hints, energy, energy_reset_at, streak_current, streak_max, stats_by_mode, flags, seeded')
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
   * @param {Object} delta - { coins, hints, energy } (valeurs signées)
   * @param {string} reason - 'flash_daily' | 'snack_perfect' | 'shop_buy_hints' | ...
   * @param {string} [sessionId] - optionnel, groupe les mutations d'une session
   */
  const applyCurrencyDelta = useCallback(async (delta, reason, sessionId = null) => {
    // Joueurs anonymes : pas de session → écriture localStorage directe.
    if (!hasSession) {
      const result = writeLocalDelta(delta)
      if (result) setLocalBalances(result)
      return result
    }
    // Pas de guard sur profile : le RPC serveur est la source de vérité, pas
    // besoin d'attendre que le cache local soit hydraté pour envoyer le delta.
    // L'optimistic update est null-safe (si prev null, on le laisse tel quel).
    const nonce = generateNonce()
    return mutate({
      optimistic: (prev) => prev ? {
        ...prev,
        coins:   (prev.coins   ?? 0) + (delta.coins   ?? 0),
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
  }, [mutate, hasSession])

  /**
   * unlockFact — marque un fact comme débloqué côté Supabase (RPC idempotente).
   * Anti-replay via nonce. Retourne { category, facts_completed, was_new }.
   * Source de vérité unique pour unlockedFacts (Phase A 4.1).
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
   * Utilisé pour persister blitzRecords, quest progress, coffreClaimedDays,
   * streakFreezeCount, statsByMode, badges, etc.
   *
   * @param {Object} patch - Objet à merger (top-level keys écrasent)
   * @example
   *   await mergeFlags({ blitzRecords: { 'sport_10': 23.5 } })
   *   await mergeFlags({ quest: { level: 12, stars: {...} } })
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
    // Raccourcis pratiques — fallback localBalances pour joueurs anonymes
    coins:   profile?.coins   ?? localBalances.coins,
    hints:   profile?.hints   ?? localBalances.hints,
    energy:  profile?.energy  ?? null,
    flags:   profile?.flags   ?? {},
  }
}
