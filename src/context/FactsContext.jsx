/**
 * FactsContext — Gestion centralisée des facts chargés et de l'état de déverrouillage.
 *
 * Responsabilités :
 * - Charger les facts depuis Supabase (ou fallback local) au mount
 * - Exposer factsReady / factsError pour que l'app attende le chargement
 * - Exposer unlockedFacts (Set d'IDs) et les fonctions pour les modifier
 * - Exposer les fonctions d'accès aux facts (getValidFacts, getQuestFacts, etc.)
 * - Gérer le dailyFact (WTF du Jour)
 *
 * Usage : const { factsReady, unlockedFacts, unlockFact, ... } = useFacts()
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import {
  initFacts, resetFacts, getValidFacts, getQuestFacts, getFlashFacts,
  getGeneratedFacts, getGeneratedFactsByCategory, getBlitzFacts,
  getFactsByCategory, getParcoursFacts, getCategoryLevelFactIds,
  getDailyFact, getTitrePartiel, CATEGORIES, getPlayableCategories, getCategoryById,
  getFunnyFacts,
} from '../data/factsService'
import { loadStorage, saveStorage, updateTrophyData } from '../utils/storageHelper'

const FactsContext = createContext(null)

export function FactsProvider({ children }) {
  const [factsReady, setFactsReady] = useState(false)
  const [factsError, setFactsError] = useState(null)
  const [dailyFact, setDailyFact] = useState(null)
  const [dailyFactOverride, setDailyFactOverride] = useState(null)

  // unlockedFacts est lu depuis localStorage (via storage)
  const [unlockedFacts, setUnlockedFacts] = useState(() => {
    try {
      const data = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      return new Set(data.unlockedFacts || [])
    } catch {
      return new Set()
    }
  })

  const effectiveDailyFact = dailyFactOverride || dailyFact

  // Charger les facts au mount
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

  // Sync unlockedFacts quand le storage change
  useEffect(() => {
    const handleSync = () => {
      try {
        const data = JSON.parse(localStorage.getItem('wtf_data') || '{}')
        setUnlockedFacts(new Set(data.unlockedFacts || []))
      } catch {}
    }
    window.addEventListener('wtf_storage_sync', handleSync)
    window.addEventListener('wtf_currency_updated', handleSync)
    return () => {
      window.removeEventListener('wtf_storage_sync', handleSync)
      window.removeEventListener('wtf_currency_updated', handleSync)
    }
  }, [])

  const unlockFact = useCallback((factId) => {
    setUnlockedFacts(prev => {
      const next = new Set(prev)
      next.add(factId)
      // Persist
      try {
        const data = JSON.parse(localStorage.getItem('wtf_data') || '{}')
        data.unlockedFacts = [...next]
        data.lastModified = Date.now()
        localStorage.setItem('wtf_data', JSON.stringify(data))
      } catch {}
      return next
    })
  }, [])

  return (
    <FactsContext.Provider value={{
      // Loading state
      factsReady,
      factsError,

      // Daily fact
      dailyFact,
      dailyFactOverride,
      effectiveDailyFact,
      setDailyFactOverride,

      // Unlocked facts
      unlockedFacts,
      unlockFact,

      // Fact access functions (pass-through from factsService)
      getValidFacts,
      getQuestFacts,
      getFlashFacts,
      getGeneratedFacts,
      getGeneratedFactsByCategory,
      getBlitzFacts,
      getFactsByCategory,
      getParcoursFacts,
      getCategoryLevelFactIds,
      getDailyFact: getDailyFact,
      getTitrePartiel,
      getFunnyFacts,
      CATEGORIES,
      getPlayableCategories,
      getCategoryById,
      initFacts,
      resetFacts,
    }}>
      {children}
    </FactsContext.Provider>
  )
}

export function useFacts() {
  const ctx = useContext(FactsContext)
  if (!ctx) throw new Error('useFacts must be used inside FactsProvider')
  return ctx
}
