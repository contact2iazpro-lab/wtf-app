/**
 * useSelectionHandlers — Handlers pour la sélection de difficulté et catégorie.
 *
 * Extrait de App.jsx : handleSelectDifficulty, handleSelectCategory, handleExplorerMode.
 */

import { useCallback } from 'react'
import { DIFFICULTY_LEVELS, SCREENS, QUESTIONS_PER_GAME } from '../constants/gameConfig'
import {
  getValidFacts, getParcoursFacts, getQuestFacts,
  getFactsByCategory, getGeneratedFacts, getGeneratedFactsByCategory,
  getPlayableCategories,
} from '../data/factsService'
import { getAnswerOptions } from '../utils/answers'
import { shuffle } from '../utils/shuffle'
import { loadStorage } from '../utils/storageHelper'
import { updateTickets } from '../services/currencyService'
import { consumeFlashEnergy } from '../services/energyService'

export function useSelectionHandlers({
  gameMode, sessionType, selectedDifficulty, selectedCategory,
  unlockedFacts, tickets,
  initSessionState, handleBlitzStart,
  setSelectedDifficulty, setSelectedCategory, setGameMode, setSessionType,
  setIsQuickPlay, setExplorerPool, setScreen, setStorage,
  setShowNoTicketModal, setGameAlert, setMiniParcours,
}) {

  const handleSelectDifficulty = useCallback((difficulty) => {
    setSelectedDifficulty(difficulty)
    const skipUnlockM = localStorage.getItem('wtf_dev_mode') === 'true' || localStorage.getItem('wtf_test_mode') === 'true'

    if (gameMode === 'explorer') {
      let pool
      if (selectedCategory === null) {
        pool = getGeneratedFacts().filter(f => skipUnlockM || !unlockedFacts.has(f.id))
      } else {
        pool = getGeneratedFactsByCategory(selectedCategory).filter(f => skipUnlockM || !unlockedFacts.has(f.id))
      }
      if (pool.length < 4 && skipUnlockM) {
        pool = selectedCategory === null ? getGeneratedFacts() : getGeneratedFactsByCategory(selectedCategory)
      }
      if (pool.length === 0) {
        setGameAlert({ emoji: '🎉', title: 'Bientôt !', message: 'De nouveaux f*cts arrivent bientôt dans cette catégorie !' })
        return
      }
      if (pool.length < 4) {
        const price = pool.length === 1 ? 5 : 10
        const preparedFacts = shuffle(pool)
          .map(fact => ({ ...fact, ...getAnswerOptions(fact, difficulty) }))
        setMiniParcours({ pool: preparedFacts, price, mode: 'explorer', categoryId: selectedCategory, difficulty })
        return
      }
      const facts = shuffle(pool).slice(0, 20)
        .map(fact => ({ ...fact, ...getAnswerOptions(fact, difficulty) }))
      setIsQuickPlay(false)
      setSessionType('explorer')
      initSessionState(facts)
      setScreen(SCREENS.QUESTION)
      return
    }

    // Quest
    const isDevModeQuest = localStorage.getItem('wtf_dev_mode') === 'true' || localStorage.getItem('wtf_test_mode') === 'true'
    if (!isDevModeQuest) {
      if ((tickets || 0) < 1) { setShowNoTicketModal(true); return }
      updateTickets(-1)
      setStorage(loadStorage())
    }

    const skipUnlockD = isDevModeQuest
    // Filtre anti-redite : ne jamais re-proposer un f*ct VIP déjà débloqué (T89)
    // Les fallbacks gardent TOUJOURS le filtre unlockedFacts actif
    let available = getParcoursFacts().filter(f => f.isVip && f.difficulty === difficulty.id && (skipUnlockD || !unlockedFacts.has(f.id)))
    if (available.length < QUESTIONS_PER_GAME) {
      // Fallback 1 : toutes difficultés VIP, mais toujours filtré sur unlocked
      available = getParcoursFacts().filter(f => f.isVip && (skipUnlockD || !unlockedFacts.has(f.id)))
    }
    if (available.length < QUESTIONS_PER_GAME) {
      // Fallback 2 : tous les Quest facts (VIP) encore non débloqués
      available = getQuestFacts().filter(f => skipUnlockD || !unlockedFacts.has(f.id))
    }
    if (available.length < QUESTIONS_PER_GAME) {
      // Fallback ultime : tous les facts valides non débloqués
      available = getValidFacts().filter(f => skipUnlockD || !unlockedFacts.has(f.id))
    }

    // Fisher-Yates shuffle (vrai aléatoire, pas le sort biaisé)
    const facts = shuffle(available).slice(0, QUESTIONS_PER_GAME)
      .map(fact => ({ ...fact, ...getAnswerOptions(fact, difficulty) }))
    setIsQuickPlay(false)
    setGameMode('solo')
    setSelectedCategory(null)
    setSessionType('parcours')
    initSessionState(facts)
    setScreen(SCREENS.QUESTION)
  }, [unlockedFacts, gameMode, selectedCategory, tickets, initSessionState, handleBlitzStart])

  const handleSelectCategory = useCallback((categoryId) => {
    if (gameMode === 'blitz') { handleBlitzStart(categoryId); return }

    if (gameMode === 'explorer') {
      const difficulty = DIFFICULTY_LEVELS.HOT
      const skipUnlockE = localStorage.getItem('wtf_dev_mode') === 'true' || localStorage.getItem('wtf_test_mode') === 'true'
      let pool = getGeneratedFactsByCategory(categoryId).filter(f => skipUnlockE || !unlockedFacts.has(f.id))
      if (pool.length < 4 && skipUnlockE) pool = getGeneratedFactsByCategory(categoryId)
      if (pool.length === 0) { setGameAlert({ emoji: '🎉', title: 'Bientôt !', message: 'De nouveaux f*cts arrivent bientôt dans cette catégorie !' }); return }
      if (pool.length < 4) {
        const price = pool.length === 1 ? 5 : 10
        const preparedFacts = shuffle(pool).map(fact => ({ ...fact, ...getAnswerOptions(fact, difficulty) }))
        setMiniParcours({ pool: preparedFacts, price, mode: 'explorer', categoryId, difficulty })
        return
      }
      const shuffled = shuffle(pool)
      const sessionFacts = shuffled.slice(0, 5).map(fact => ({ ...fact, ...getAnswerOptions(fact, difficulty) }))
      const remaining = shuffled.slice(5)
      setExplorerPool(remaining)
      setSelectedCategory(categoryId)
      setSelectedDifficulty(difficulty)
      setIsQuickPlay(false)
      setSessionType('explorer')
      consumeFlashEnergy()
      initSessionState(sessionFacts)
      setScreen(SCREENS.QUESTION)
      return
    }

    // Flash/Jouer — uniquement les catégories débloquées
    const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    const unlockedCats = new Set(wd.unlockedCategories || ['sport', 'records', 'animaux', 'kids', 'definition'])
    const generatedFacts = getGeneratedFacts().filter(f => unlockedCats.has(f.category))

    let facts = []
    if (categoryId === null) {
      // Aléatoire : piocher dans les catégories débloquées uniquement
      const validCategories = getPlayableCategories().filter(cat =>
        unlockedCats.has(cat.id) && generatedFacts.some(f => f.category === cat.id)
      )
      if (validCategories.length < 5) {
        facts = shuffle(generatedFacts).slice(0, QUESTIONS_PER_GAME)
      } else {
        const selectedCats = shuffle(validCategories).slice(0, QUESTIONS_PER_GAME)
        facts = selectedCats.map(cat => {
          const catFacts = generatedFacts.filter(f => f.category === cat.id)
          return catFacts[Math.floor(Math.random() * catFacts.length)]
        })
        facts = shuffle(facts)
      }
    } else {
      facts = shuffle(generatedFacts.filter(f => f.category === categoryId)).slice(0, QUESTIONS_PER_GAME)
    }

    const factsWithOptions = facts.map(fact => ({ ...fact, ...getAnswerOptions(fact, selectedDifficulty) }))
    setSelectedCategory(categoryId)
    if (sessionType === 'flash_solo' || sessionType === 'explorer') consumeFlashEnergy()
    initSessionState(factsWithOptions)
    setScreen(SCREENS.QUESTION)
  }, [selectedDifficulty, gameMode, sessionType, handleBlitzStart, unlockedFacts, initSessionState])

  const handleExplorerMode = useCallback(() => {
    setGameMode('explorer')
    setSessionType('explorer')
    setScreen(SCREENS.CATEGORY)
  }, [])

  return { handleSelectDifficulty, handleSelectCategory, handleExplorerMode }
}
