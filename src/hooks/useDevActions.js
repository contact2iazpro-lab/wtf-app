/**
 * useDevActions — Actions du DevPanel extraites de App.jsx.
 */

import { useCallback } from 'react'
import { SCREENS } from '../constants/gameConfig'
import { getValidFacts } from '../data/factsService'
import { saveStorage, TODAY, updateWtfData } from '../utils/storageHelper'

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
    resetWTFWeekly: () => applyStorage({ wtfDuJourDate: null }), // clé legacy conservée pour compat
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
      updateWtfData(wd => { wd.hints = n })
    },
    cheat999: () => {
      updateWtfData(wd => {
        wd.wtfCoins = 999; wd.tickets = 999; wd.hints = 999
        wd.streak = wd.streak || 0
        wd.totalScore = wd.totalScore || 0
        wd.unlockedFacts = wd.unlockedFacts || []
      })
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
