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
import { initSyncQueue, enqueue, drain, clearQueue } from '../services/syncQueue'
import { setCurrencyContext } from '../services/currencyService'

const CurrencyContext = createContext(null)

// ── Helpers localStorage (anonyme) ──────────────────────────────────────────

function readLocalBalances() {
  try {
    const data = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    return {
      coins: data.wtfCoins || 0,
      tickets: data.tickets || 0,
      hints: parseInt(localStorage.getItem('wtf_hints_available') || '0', 10),
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
    data.lastModified = Date.now()
    localStorage.setItem('wtf_data', JSON.stringify(data))
    localStorage.setItem('wtf_hints_available', String(balances.hints))
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
        // 1. Drainer la queue pendante (si elle existe)
        const drainResult = await drain()

        // 2. Récupérer les balances serveur
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

  // ── Timer de drain périodique (30s) ────────────────────────────────────
  useEffect(() => {
    if (!isConnected) return

    drainTimerRef.current = setInterval(async () => {
      const result = await drain()
      if (result) {
        setBalances({ coins: result.coins || 0, tickets: result.tickets || 0, hints: result.hints || 0 })
        setIsServerSynced(true)
      }
    }, 30000)

    return () => clearInterval(drainTimerRef.current)
  }, [isConnected])

  // ── Drain sur visibilitychange + pagehide ──────────────────────────────
  useEffect(() => {
    if (!isConnected) return

    function handleVisibilityChange() {
      if (document.hidden) {
        drain().then(result => {
          if (result) setBalances({ coins: result.coins || 0, tickets: result.tickets || 0, hints: result.hints || 0 })
        })
      }
    }

    function handleOnline() {
      drain().then(result => {
        if (result) setBalances({ coins: result.coins || 0, tickets: result.tickets || 0, hints: result.hints || 0 })
      })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
    }
  }, [isConnected])

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

  const addCoins = useCallback((delta) => {
    if (delta === 0) return

    // Optimistic UI
    setBalances(prev => {
      const updated = { ...prev, coins: Math.max(0, prev.coins + delta) }
      writeLocalBalances(updated) // Toujours sync localStorage pour backward compat
      return updated
    })

    // Queue pour sync serveur
    if (isConnected) {
      enqueue({ coins: delta })
    }

    // Notifier les anciens listeners
    window.dispatchEvent(new Event('wtf_currency_updated'))
  }, [isConnected])

  const addTickets = useCallback((delta) => {
    if (delta === 0) return

    setBalances(prev => {
      const updated = { ...prev, tickets: Math.max(0, prev.tickets + delta) }
      writeLocalBalances(updated)
      return updated
    })

    if (isConnected) {
      enqueue({ tickets: delta })
    }

    window.dispatchEvent(new Event('wtf_currency_updated'))
  }, [isConnected])

  const addHints = useCallback((delta) => {
    if (delta === 0) return

    setBalances(prev => {
      const updated = { ...prev, hints: Math.max(0, prev.hints + delta) }
      writeLocalBalances(updated)
      return updated
    })

    if (isConnected) {
      enqueue({ hints: delta })
    }

    window.dispatchEvent(new Event('wtf_currency_updated'))
  }, [isConnected])

  const refreshFromServer = useCallback(async () => {
    if (!isConnected) return

    try {
      const drainResult = await drain()
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
