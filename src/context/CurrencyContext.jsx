/**
 * CurrencyContext — Source de vérité unique pour les devises (coins, tickets, hints).
 *
 * Architecture :
 *  - Joueur CONNECTÉ : Supabase est la source de vérité.
 *    Les mutations passent par des deltas (enqueue → drain → RPC).
 *    L'UI est mise à jour optimistiquement avant confirmation serveur.
 *
 *  - Joueur ANONYME : localStorage est la source de vérité (fallback).
 *    Pas de sync serveur.
 *
 * API publique :
 *  - coins, tickets, hints (lecture)
 *  - addCoins(delta), addTickets(delta), addHints(delta) (mutation)
 *  - refreshFromServer() (force pull depuis Supabase)
 *  - isServerSynced (boolean)
 */

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { initSyncQueue, clearQueue } from '../services/syncQueue'
import { setCurrencyContext } from '../services/currencyService'

const CurrencyContext = createContext(null)

// ── Helpers localStorage (anonyme) ──────────────────────────────────────────

function readLocalBalances() {
  try {
    const data = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    return {
      coins: data.wtfCoins || 0,
      tickets: data.tickets || 0,
      hints: parseInt(data.hints || 0, 10) || 0,
    }
  } catch {
    return { coins: 0, tickets: 0, hints: 0 }
  }
}

function writeLocalBalances(balances) {
  try {
    const data = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    data.wtfCoins = balances.coins
    data.tickets = balances.tickets
    data.hints = balances.hints
    data.lastModified = Date.now()
    localStorage.setItem('wtf_data', JSON.stringify(data))
  } catch { /* ignore */ }
}

// ── Provider ────────────────────────────────────────────────────────────────

export function CurrencyProvider({ children }) {
  const { user, isConnected } = useAuth()
  const [balances, setBalances] = useState(() => readLocalBalances())
  const [isServerSynced, setIsServerSynced] = useState(false)
  const drainTimerRef = useRef(null)
  const prevUserIdRef = useRef(null)

  // Init sync queue avec le client Supabase
  useEffect(() => {
    if (isSupabaseConfigured) {
      initSyncQueue(supabase)
    }
  }, [])

  // ── Pull depuis le serveur au login ────────────────────────────────────
  useEffect(() => {
    if (!isConnected || !user?.id) {
      // Joueur anonyme : lire localStorage
      setBalances(readLocalBalances())
      setIsServerSynced(false)
      return
    }

    // Éviter le double pull si le user n'a pas changé
    if (prevUserIdRef.current === user.id) return
    prevUserIdRef.current = user.id

    async function initFromServer() {
      try {
        // Phase A : plus de drain() au mount (queue plus alimentée).
        // On purge d'éventuels résidus legacy pour éviter une future 404.
        await clearQueue().catch(() => {})

        // Récupérer les balances serveur
        const { data, error } = await supabase.rpc('get_balances')
        if (error) throw error

        const serverBalances = Array.isArray(data) ? data[0] : data
        if (serverBalances) {
          const b = {
            coins: serverBalances.coins || 0,
            tickets: serverBalances.tickets || 0,
            hints: serverBalances.hints || 0,
          }
          setBalances(b)
          writeLocalBalances(b) // Sync local pour backward compat
          setIsServerSynced(true)
        }
      } catch (err) {
        console.warn('[Currency] initFromServer failed, using local:', err.message)
        setBalances(readLocalBalances())
      }
    }

    initFromServer()
  }, [isConnected, user?.id])

  // Phase A : drain timer 30s + visibilitychange retirés.
  // La queue syncQueue n'est plus alimentée (enqueue commenté) donc il n'y a
  // plus rien à drainer. Les mutations serveur passent par applyCurrencyDelta
  // direct via usePlayerProfile.

  // ── Écouter les anciens events pour backward compat ────────────────────
  useEffect(() => {
    function handleLegacyUpdate() {
      if (!isConnected) {
        setBalances(readLocalBalances())
      }
    }
    window.addEventListener('wtf_currency_updated', handleLegacyUpdate)
    window.addEventListener('wtf_storage_sync', handleLegacyUpdate)
    return () => {
      window.removeEventListener('wtf_currency_updated', handleLegacyUpdate)
      window.removeEventListener('wtf_storage_sync', handleLegacyUpdate)
    }
  }, [isConnected])

  // ── Mutations ──────────────────────────────────────────────────────────

  // Phase A (2026-04-12) : enqueue() retiré pour éviter le double comptage.
  // Les mutations serveur passent désormais uniquement par applyCurrencyDelta
  // de usePlayerProfile (Phase A migration complète). CurrencyContext garde
  // son rôle d'affichage optimistic local (cache localStorage + React state).
  const addCoins = useCallback((delta) => {
    if (delta === 0) return
    setBalances(prev => {
      const updated = { ...prev, coins: Math.max(0, prev.coins + delta) }
      writeLocalBalances(updated)
      return updated
    })
    window.dispatchEvent(new Event('wtf_currency_updated'))
  }, [])

  const addTickets = useCallback((delta) => {
    if (delta === 0) return
    setBalances(prev => {
      const updated = { ...prev, tickets: Math.max(0, prev.tickets + delta) }
      writeLocalBalances(updated)
      return updated
    })
    window.dispatchEvent(new Event('wtf_currency_updated'))
  }, [])

  const addHints = useCallback((delta) => {
    if (delta === 0) return
    setBalances(prev => {
      const updated = { ...prev, hints: Math.max(0, prev.hints + delta) }
      writeLocalBalances(updated)
      return updated
    })
    window.dispatchEvent(new Event('wtf_currency_updated'))
  }, [])

  const refreshFromServer = useCallback(async () => {
    if (!isConnected) return

    try {
      // Phase A : plus de drain(). On lit directement l'état serveur.
      const { data, error } = await supabase.rpc('get_balances')
      if (error) throw error

      const serverBalances = Array.isArray(data) ? data[0] : data
      if (serverBalances) {
        const b = {
          coins: serverBalances.coins || 0,
          tickets: serverBalances.tickets || 0,
          hints: serverBalances.hints || 0,
        }
        setBalances(b)
        writeLocalBalances(b)
        setIsServerSynced(true)
      }
    } catch (err) {
      console.warn('[Currency] refreshFromServer failed:', err.message)
    }
  }, [isConnected])

  // ── Bridge : injecter les fonctions dans currencyService (legacy) ──────
  useEffect(() => {
    if (isConnected) {
      setCurrencyContext({ addCoins, addTickets, addHints, refreshFromServer })
    } else {
      setCurrencyContext(null)
    }
    return () => setCurrencyContext(null)
  }, [isConnected, addCoins, addTickets, addHints, refreshFromServer])

  return (
    <CurrencyContext.Provider value={{
      coins: balances.coins,
      tickets: balances.tickets,
      hints: balances.hints,
      addCoins,
      addTickets,
      addHints,
      refreshFromServer,
      isServerSynced,
    }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrency must be used inside CurrencyProvider')
  return ctx
}
