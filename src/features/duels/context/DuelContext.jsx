/**
 * DuelContext — Agrège les hooks Défi/Amis dans un provider unique.
 *
 * Expose friends, duels, unlocked facts et le code ami via un seul context.
 * Permet à des composants profondément imbriqués (BottomNav, modals) d'accéder
 * au state sans redéclencher les hooks.
 *
 * Également : état de navigation Défi en mémoire (remplace les clés
 * localStorage wtf_pending_action / wtf_challenge_opponent / wtf_active_challenge).
 */

import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { useFriends } from '../hooks/useFriends'
import { useDuels } from '../hooks/useDuels'
import { useUnlockedFacts } from '../hooks/useUnlockedFacts'
import { useMyFriendCode } from '../hooks/useMyFriendCode'

const DuelContext = createContext(null)

export function DuelProvider({ children }) {
  const friendsState = useFriends()
  const duelsState = useDuels()
  const unlockedState = useUnlockedFacts()
  const myCodeState = useMyFriendCode()

  // Navigation Défi en mémoire (pas localStorage → pas de race entre routes)
  // { mode: 'create' | 'accept', opponentId?, roundId?, code?, facts? }
  const [pendingDuel, setPendingDuel] = useState(null)

  const startCreateDefi = useCallback((friendId, categoryId) => {
    setPendingDuel({ mode: 'create', opponentId: friendId, categoryId })
  }, [])

  const startAcceptDefi = useCallback((round, preparedFacts) => {
    setPendingDuel({
      mode: 'accept',
      roundId: round.id,
      code: round.code,
      opponentId: round.player1_id,
      facts: preparedFacts,
      player1Time: round.player1_time,
      player1Name: round.player1_name,
    })
  }, [])

  const clearPendingDuel = useCallback(() => setPendingDuel(null), [])

  const value = useMemo(() => ({
    // Friends
    friends: friendsState.friends,
    pendingReceived: friendsState.pendingReceived,
    pendingSent: friendsState.pendingSent,
    friendsLoading: friendsState.loading,
    refreshFriends: friendsState.refresh,
    // Duels
    duels: duelsState.duels,
    byFriendId: duelsState.byFriendId,
    getDuelStateFor: duelsState.getStateFor,
    getDuelStatesFor: duelsState.getStatesFor,
    notificationCount: duelsState.notificationCount,
    duelsLoading: duelsState.loading,
    refreshDuels: duelsState.refresh,
    // Unlocked facts
    unlockedFacts: unlockedState.unlocked,
    unlockedLoading: unlockedState.loading,
    refreshUnlocked: unlockedState.refresh,
    // My code
    myCode: myCodeState.code,
    // Pending duel nav state
    pendingDuel,
    startCreateDefi,
    startAcceptDefi,
    clearPendingDuel,
  }), [
    friendsState.friends, friendsState.pendingReceived, friendsState.pendingSent,
    friendsState.loading, friendsState.refresh,
    duelsState.duels, duelsState.byFriendId, duelsState.getStateFor, duelsState.getStatesFor, duelsState.notificationCount,
    duelsState.loading, duelsState.refresh,
    unlockedState.unlocked, unlockedState.loading, unlockedState.refresh,
    myCodeState.code,
    pendingDuel, startCreateDefi, startAcceptDefi, clearPendingDuel,
  ])

  return <DuelContext.Provider value={value}>{children}</DuelContext.Provider>
}

export function useDuelContext() {
  const ctx = useContext(DuelContext)
  if (!ctx) throw new Error('useDuelContext must be used inside DuelProvider')
  return ctx
}
