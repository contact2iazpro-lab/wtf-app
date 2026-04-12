/**
 * useDevActions — Actions du DevPanel extraites de App.jsx.
 */

import { useCallback } from 'react'
import { SCREENS } from '../constants/gameConfig'
import { getValidFacts } from '../data/factsService'
import { saveStorage, TODAY } from '../utils/storageHelper'

export function useDevActions({
  storage, setStorage, setDailyFactOverride,
  setSessionType, setCoinsEarnedLastSession, setSessionScore,
  setCorrectCount, setSessionFacts, setScreen,
}) {
  const applyStorage = useCallback((patch) => {
    setStorage(prev => {
      const today = TODAY()
      const merged = { ...prev, ...patch }
      const next = { ...merged, wtfDuJourFait: merged.wtfDuJourDate === today }
      saveStorage(next)
      return next
    })
  }, [])

  const devActions = {
    getStorage: () => storage,
    setStreak: (n) => applyStorage({ streak: n }),
    setCoins: (n) => applyStorage({ wtfCoins: n }),
    addCoins: (n) => applyStorage({ wtfCoins: storage.wtfCoins + n }),
    resetCollection: () => applyStorage({ unlockedFacts: new Set() }),
    resetWTFDuJour: () => applyStorage({ wtfDuJourDate: null }),
    resetSessionsToday: () => applyStorage({ sessionsToday: 0 }),
    resetScore: () => applyStorage({ totalScore: 0 }),
    simulateNewPlayer: () => applyStorage({ streak: 0, wtfCoins: 0, totalScore: 0, unlockedFacts: new Set(), wtfDuJourDate: null, sessionsToday: 0 }),
    simulateJ7: () => applyStorage({ streak: 7 }),
    simulateCollectionAnimaux: () => {
      const animauxIds = getValidFacts().filter(f => f.category === 'animaux').map(f => f.id)
      applyStorage({ unlockedFacts: new Set([...storage.unlockedFacts, ...animauxIds]) })
    },
    setTickets: (n) => applyStorage({ tickets: n }),
    setHints: (n) => {
      const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      wd.hints = n; wd.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(wd))
    },
    cheat999: () => {
      const existing = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      existing.wtfCoins = 999; existing.tickets = 999; existing.hints = 999
      existing.streak = existing.streak || 0; existing.totalScore = existing.totalScore || 0
      existing.unlockedFacts = existing.unlockedFacts || []; existing.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(existing))
      window.location.reload()
    },
    simulatePurchase: () => applyStorage({ wtfCoins: storage.wtfCoins + 100 }),
    unlockRandomFacts: (n = 10) => {
      const locked = getValidFacts().filter(f => !storage.unlockedFacts.has(f.id))
      const toUnlock = [...locked].sort(() => Math.random() - 0.5).slice(0, n).map(f => f.id)
      applyStorage({ unlockedFacts: new Set([...storage.unlockedFacts, ...toUnlock]) })
    },
    overrideDailyFact: (id) => {
      const fact = getValidFacts().find(f => f.id === Number(id))
      if (fact) setDailyFactOverride(fact)
    },
    testVIPReveal: () => {
      setSessionType('wtf_du_jour')
      setCoinsEarnedLastSession(5)
      setSessionScore(12)
      setCorrectCount(4)
      setSessionFacts(new Array(5).fill(null))
      setScreen(SCREENS.WTF_REVEAL)
    },
  }

  return { devActions }
}
