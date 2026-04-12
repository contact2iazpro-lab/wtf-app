/**
 * useAppEffects — Tous les effets secondaires de App.jsx.
 *
 * Extrait : init facts, auth sync, storage sync, currency updates,
 * dev mode, streak toast, onboarding skip, popstate, history push.
 */

import { useEffect } from 'react'
import { SCREENS } from '../constants/gameConfig'
import { initFacts, getDailyFact, getValidFacts } from '../data/factsService'
import { pushToServer, syncAfterAction } from '../services/playerSyncService'
import { loadStorage, saveStorage, updateTrophyData } from '../utils/storageHelper'
import { updateCollection } from '../services/collectionService'
import { supabase } from '../lib/supabase'

export function useAppEffects({
  user, factsReady, screen, streakRewardToast,
  setFactsReady, setFactsError, setDailyFact, setStorage,
  setStreakRewardToast, setScreen, setGameMode,
  setSocialNotifCount, setPendingChallengesCount,
  handleHome, completeOnboardingIfNeeded,
}) {

  // Load facts on mount
  useEffect(() => {
    initFacts().then((result) => {
      if (result?.success) {
        setDailyFact(getDailyFact())
        setFactsReady(true)
        setFactsError(null)
        updateTrophyData()
      } else {
        setFactsError(result?.error || 'Erreur inconnue')
      }
    })
  }, [])

  // Sync player data after facts loaded
  useEffect(() => {
    if (!factsReady || !user) return
    pushToServer(user.id)
  }, [factsReady, user])

  // Refresh storage on auth sync
  useEffect(() => {
    const handleSync = () => {
      const isDevMode = localStorage.getItem('wtf_dev_mode') === 'true'
      const isTestMode = localStorage.getItem('wtf_test_mode') === 'true'
      setStorage(loadStorage())
      if (isDevMode || isTestMode) return

      const tempFactsJson = localStorage.getItem('wtf_temp_facts')
      if (tempFactsJson) {
        try {
          const tempIds = JSON.parse(tempFactsJson)
          if (Array.isArray(tempIds) && tempIds.length > 0) {
            setStorage(prev => {
              const newUnlocked = new Set(prev.unlockedFacts)
              for (const id of tempIds) newUnlocked.add(id)
              const next = { ...prev, unlockedFacts: newUnlocked }
              saveStorage(next)
              const currentUser = JSON.parse(localStorage.getItem('sb-znoceotakhynqcqhpwgz-auth-token') || '{}')?.user
              if (currentUser?.id) {
                const allFacts = getValidFacts()
                for (const id of tempIds) {
                  const fact = allFacts.find(f => f.id === id)
                  if (fact) updateCollection(currentUser.id, fact.category, fact.id)
                }
                syncAfterAction(currentUser.id)
              }
              return next
            })
          }
        } catch {}
        localStorage.removeItem('wtf_temp_facts')
        localStorage.removeItem('wtf_temp_session')
      }
    }
    window.addEventListener('wtf_storage_sync', handleSync)
    return () => window.removeEventListener('wtf_storage_sync', handleSync)
  }, [])

  // Refresh storage on currency update
  useEffect(() => {
    const handleCurrencyUpdate = () => setStorage(loadStorage())
    window.addEventListener('wtf_currency_updated', handleCurrencyUpdate)
    return () => window.removeEventListener('wtf_currency_updated', handleCurrencyUpdate)
  }, [])

  // Dev/Test mode: unlock all facts
  useEffect(() => {
    if (!factsReady) return
    const isDev = localStorage.getItem('wtf_dev_mode') === 'true'
    const isTest = localStorage.getItem('wtf_test_mode') === 'true'
    const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')

    if (isDev || isTest) {
      if (!wtfData._savedUnlockedFacts) {
        wtfData._savedUnlockedFacts = wtfData.unlockedFacts || []
      }
      const allIds = [...new Set(getValidFacts().map(f => f.id))]
      wtfData.unlockedFacts = allIds
      wtfData.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(wtfData))
      setStorage(prev => ({ ...prev, unlockedFacts: new Set(allIds) }))
    } else {
      if (wtfData._savedUnlockedFacts) {
        wtfData.unlockedFacts = wtfData._savedUnlockedFacts
        delete wtfData._savedUnlockedFacts
        wtfData.lastModified = Date.now()
        localStorage.setItem('wtf_data', JSON.stringify(wtfData))
        setStorage(prev => ({ ...prev, unlockedFacts: new Set(wtfData.unlockedFacts) }))
      }
    }
  }, [factsReady])

  // Auto-dismiss streak reward toast
  useEffect(() => {
    if (!streakRewardToast) return
    const t = setTimeout(() => setStreakRewardToast(null), 3000)
    return () => clearTimeout(t)
  }, [streakRewardToast])

  // ── Realtime social notifications ────────────────────────────────────────
  useEffect(() => {
    if (!user || !setSocialNotifCount) return
    const channel = supabase
      .channel('notif-badge-' + user.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friendships', filter: 'user2_id=eq.' + user.id }, () => {
        setSocialNotifCount(prev => prev + 1)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'challenges', filter: 'player2_id=eq.' + user.id }, () => {
        setSocialNotifCount(prev => prev + 1)
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  // ── Pending challenges badge ───────────────────────────────────────────────
  useEffect(() => {
    if (!setPendingChallengesCount) return
    if (!user) { setPendingChallengesCount(0); return }
    const fetchPending = async () => {
      const { data } = await supabase.from('challenges').select('id').eq('status', 'pending').neq('player1_id', user.id)
      const count = (data || []).length
      setPendingChallengesCount(count)
      // Persist pour BottomNav (autonome)
      try {
        const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
        wd.pendingChallengesCount = count
        wd.lastModified = Date.now()
        localStorage.setItem('wtf_data', JSON.stringify(wd))
        window.dispatchEvent(new Event('wtf_pending_challenges_updated'))
      } catch { /* ignore */ }
    }
    fetchPending()
    const channel = supabase
      .channel('nav-challenges-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, () => fetchPending())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  // Push history entry on screen change
  useEffect(() => {
    window.history.pushState(null, '')
  }, [screen])

  // Back button handler
  useEffect(() => {
    const handlePopState = () => {
      window.history.pushState(null, '')
      switch (screen) {
        case SCREENS.HOME: break
        case SCREENS.MODE_LAUNCH:
        case SCREENS.WTF_TEASER:
          setScreen(SCREENS.HOME)
          break
        case SCREENS.CATEGORY:
        case SCREENS.BLITZ_LOBBY:
          setScreen(SCREENS.HOME)
          setGameMode('solo')
          break
        case SCREENS.DUEL_SETUP:
          setScreen(SCREENS.HOME)
          break
        case SCREENS.RESULTS:
        case SCREENS.WTF_REVEAL:
        case SCREENS.DUEL_RESULTS:
        case SCREENS.BLITZ_RESULTS:
          handleHome()
          break
        default:
          handleHome()
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [screen, handleHome, completeOnboardingIfNeeded])
}
