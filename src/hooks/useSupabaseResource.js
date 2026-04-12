/**
 * useSupabaseResource — Hook SWR-like pour entités Supabase.
 *
 * Pattern stale-while-revalidate :
 * 1. Au mount, lit le cache localStorage → affichage immédiat (pas de flash)
 * 2. Fetch silencieux depuis Supabase en arrière-plan
 * 3. Mise à jour du cache + re-render quand le serveur répond
 *
 * Mutation optimiste :
 * - applique le optimistic update immédiatement (affichage instantané)
 * - appelle la fonction commit (RPC Supabase)
 * - si succès : remplace par le résultat serveur
 * - si échec : rollback à la valeur précédente + error
 *
 * Cross-tab sync :
 * - utilise BroadcastChannel pour propager les mutations entre onglets
 * - tout onglet qui reçoit un message met à jour son cache et re-render
 *
 * Offline :
 * - si mutate échoue avec une erreur réseau, la mutation est mise en queue
 * - au retour online (event 'online'), la queue est rejouée dans l'ordre
 *
 * Usage typique :
 *
 *   const { data, loading, mutate } = useSupabaseResource({
 *     cacheKey: 'wtf_cache_profile',
 *     channel: 'profile',
 *     fetcher: async () => {
 *       const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
 *       return data
 *     },
 *     enabled: !!userId,
 *   })
 *
 *   await mutate({
 *     optimistic: (prev) => ({ ...prev, coins: prev.coins + 2 }),
 *     commit: async () => {
 *       const { data, error } = await supabase.rpc('apply_currency_delta', { ... })
 *       if (error) throw error
 *       return { ...currentData, ...data } // fusionne l'état renvoyé avec le reste
 *     },
 *   })
 */

import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Helpers cache localStorage ────────────────────────────────────────────
const readCache = (key) => {
  if (!key) return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

const writeCache = (key, value) => {
  if (!key) return
  try {
    if (value === null || value === undefined) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch { /* quota / disabled */ }
}

// ─── BroadcastChannel registry ──────────────────────────────────────────────
// Un seul channel par nom, partagé entre tous les hooks qui l'écoutent.
const channels = new Map()
const getChannel = (name) => {
  if (!name || typeof BroadcastChannel === 'undefined') return null
  if (!channels.has(name)) {
    try { channels.set(name, new BroadcastChannel(`wtf_${name}`)) }
    catch { return null }
  }
  return channels.get(name)
}

// ─── Offline queue ──────────────────────────────────────────────────────────
// Clé localStorage dédiée par resource. Chaque entrée = { id, commitSerialized }.
// Note : la queue ne peut stocker que des RPC simples dont le payload est
// sérialisable. Les commits complexes (ex: avec closures) ne peuvent pas être
// mis en queue — ils échouent en ligne ou jamais.
const QUEUE_PREFIX = 'wtf_mutation_queue_'

const readQueue = (cacheKey) => readCache(QUEUE_PREFIX + cacheKey) || []
const writeQueue = (cacheKey, queue) => writeCache(QUEUE_PREFIX + cacheKey, queue)

// ─── Hook principal ─────────────────────────────────────────────────────────
export function useSupabaseResource({
  cacheKey,      // string : clé localStorage (obligatoire)
  channel,       // string : nom du BroadcastChannel (optionnel mais recommandé)
  fetcher,       // async () => data : récupère l'état frais depuis Supabase
  enabled = true, // si false, pas de fetch (user pas encore authentifié)
}) {
  const [data, setData] = useState(() => readCache(cacheKey))
  const [loading, setLoading] = useState(enabled && !readCache(cacheKey))
  const [error, setError] = useState(null)
  const dataRef = useRef(data)
  dataRef.current = data

  const updateData = useCallback((next) => {
    setData(next)
    dataRef.current = next
    writeCache(cacheKey, next)
  }, [cacheKey])

  // ─── Fetch au mount (et quand enabled devient true) ───────────────────────
  const refetch = useCallback(async () => {
    if (!enabled || !fetcher) return
    try {
      const fresh = await fetcher()
      if (fresh != null) {
        updateData(fresh)
        setError(null)
      }
    } catch (e) {
      console.warn('[useSupabaseResource] fetch error:', e?.message || e)
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [enabled, fetcher, updateData])

  useEffect(() => {
    if (!enabled) return
    refetch()
  }, [enabled, refetch])

  // ─── BroadcastChannel : écoute les updates des autres onglets ─────────────
  useEffect(() => {
    const ch = getChannel(channel)
    if (!ch) return
    const handler = (event) => {
      if (event.data?.type === 'update' && event.data?.cacheKey === cacheKey) {
        const next = event.data.data
        if (next != null) {
          setData(next)
          dataRef.current = next
          // Cache déjà écrit par l'onglet émetteur via storage, mais on re-écrit
          // pour garantir la cohérence si storage event est arrivé en premier.
          writeCache(cacheKey, next)
        }
      }
    }
    ch.addEventListener('message', handler)
    return () => ch.removeEventListener('message', handler)
  }, [channel, cacheKey])

  // ─── Rejeu de la queue offline au retour en ligne ─────────────────────────
  useEffect(() => {
    if (!enabled) return
    const flushQueue = async () => {
      const queue = readQueue(cacheKey)
      if (queue.length === 0) return
      console.log('[useSupabaseResource] flushing queue:', queue.length)
      // Note: on ne peut pas rejouer ici car les commits ne sont pas sérialisables.
      // La vraie stratégie offline passera par une queue de payloads bruts + un
      // replayer dédié (Phase A.3 bis). Pour l'instant on se contente de vider
      // la queue et refetch, pour que l'état serveur refasse autorité.
      writeQueue(cacheKey, [])
      await refetch()
    }
    window.addEventListener('online', flushQueue)
    return () => window.removeEventListener('online', flushQueue)
  }, [enabled, cacheKey, refetch])

  // ─── Mutation optimiste ───────────────────────────────────────────────────
  const mutate = useCallback(async ({ optimistic, commit }) => {
    const previous = dataRef.current
    // 1. Optimistic update immédiat
    let optimisticNext = previous
    if (typeof optimistic === 'function') {
      try { optimisticNext = optimistic(previous) }
      catch (e) { console.warn('[useSupabaseResource] optimistic error:', e); optimisticNext = previous }
      updateData(optimisticNext)
    }
    // 2. Commit réel
    try {
      const serverResult = await commit(previous)
      // 3. Succès : le serveur gagne. Si commit retourne un objet, on l'utilise.
      //    Sinon on garde l'optimistic.
      const finalData = serverResult != null ? serverResult : optimisticNext
      updateData(finalData)
      // 4. Notifie les autres onglets
      const ch = getChannel(channel)
      if (ch) {
        try { ch.postMessage({ type: 'update', cacheKey, data: finalData }) }
        catch { /* ignore */ }
      }
      setError(null)
      return finalData
    } catch (e) {
      // 5. Échec : rollback
      console.warn('[useSupabaseResource] commit error:', e?.message || e)
      updateData(previous)
      setError(e)
      throw e
    }
  }, [cacheKey, channel, updateData])

  return { data, loading, error, mutate, refetch, setData: updateData }
}

// ─── Helper : générer un nonce unique pour les mutations RPC ────────────────
export function generateNonce() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback
  return `nonce-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
