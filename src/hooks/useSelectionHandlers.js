/**
 * useSelectionHandlers — Handlers pour la sélection de difficulté et catégorie.
 *
 * Extrait de App.jsx : handleSelectDifficulty, handleSelectCategory, handleSnackMode.
 */

import { useCallback } from 'react'
import { DIFFICULTY_LEVELS, SCREENS, QUESTIONS_PER_GAME } from '../constants/gameConfig'
import {
  getGeneratedFacts, getGeneratedFactsByCategory,
  getPlayableCategories,
} from '../data/factsService'
import { getAnswerOptions } from '../utils/answers'
import { shuffle } from '../utils/shuffle'
import { consumeSnackEnergy } from '../services/energyService'

export function useSelectionHandlers({
  gameMode, sessionType, selectedDifficulty, selectedCategory,
  unlockedFacts,
  initSessionState, handleBlitzStart,
  setSelectedDifficulty, setSelectedCategory, setGameMode, setSessionType,
  setIsQuickPlay, setSnackPool, setScreen,
  setGameAlert, setMiniParcours,
}) {

  const handleSelectDifficulty = useCallback((difficulty) => {
    setSelectedDifficulty(difficulty)
    const skipUnlockM = localStorage.getItem('wtf_dev_mode') === 'true' || localStorage.getItem('wtf_test_mode') === 'true'

    if (gameMode === 'snack') {
      // Snack utilise toujours sa difficulté dédiée (20s / 1 coin / 4 QCM)
      // peu importe celle passée en argument (legacy)
      const snackDiff = DIFFICULTY_LEVELS.SNACK
      setSelectedDifficulty(snackDiff)
      let pool = getGeneratedFactsByCategory(selectedCategory).filter(f => skipUnlockM || !unlockedFacts.has(f.id))
      if (pool.length < 4 && skipUnlockM) {
        pool = getGeneratedFactsByCategory(selectedCategory)
      }
      if (pool.length === 0) {
        setGameAlert({ emoji: '🎉', title: 'Bientôt !', message: 'De nouveaux f*cts arrivent bientôt dans cette catégorie !' })
        return
      }
      if (pool.length < 4) {
        const price = pool.length === 1 ? 5 : 10
        const preparedFacts = shuffle(pool)
          .map(fact => ({ ...fact, ...getAnswerOptions(fact, snackDiff) }))
        setMiniParcours({ pool: preparedFacts, price, mode: 'snack', categoryId: selectedCategory, difficulty: snackDiff })
        return
      }
      const facts = shuffle(pool).slice(0, 20)
        .map(fact => ({ ...fact, ...getAnswerOptions(fact, snackDiff) }))
      setIsQuickPlay(false)
      setSessionType('snack')
      initSessionState(facts)
      setScreen(SCREENS.QUESTION)
      return
    }

    // Ancien mode Quest (Cool/Hot) supprimé (sub-step 1a — 2026-04-15).
    // Cette fonction ne gère plus que le flow Snack.
    console.warn('[useSelectionHandlers] handleSelectDifficulty called outside explorer mode — no-op')
  }, [unlockedFacts, gameMode, selectedCategory, initSessionState, handleBlitzStart])

  const handleSelectCategory = useCallback((categoryId) => {
    if (gameMode === 'blitz') { handleBlitzStart(categoryId); return }

    if (gameMode === 'snack') {
      const difficulty = DIFFICULTY_LEVELS.SNACK
      const skipUnlockE = localStorage.getItem('wtf_dev_mode') === 'true' || localStorage.getItem('wtf_test_mode') === 'true'
      let pool = getGeneratedFactsByCategory(categoryId).filter(f => skipUnlockE || !unlockedFacts.has(f.id))
      if (pool.length < 4 && skipUnlockE) pool = getGeneratedFactsByCategory(categoryId)
      if (pool.length === 0) { setGameAlert({ emoji: '🎉', title: 'Bientôt !', message: 'De nouveaux f*cts arrivent bientôt dans cette catégorie !' }); return }
      if (pool.length < 4) {
        const price = pool.length === 1 ? 5 : 10
        const preparedFacts = shuffle(pool).map(fact => ({ ...fact, ...getAnswerOptions(fact, difficulty) }))
        setMiniParcours({ pool: preparedFacts, price, mode: 'snack', categoryId, difficulty })
        return
      }
      const shuffled = shuffle(pool)
      const sessionFacts = shuffled.slice(0, 5).map(fact => ({ ...fact, ...getAnswerOptions(fact, difficulty) }))
      const remaining = shuffled.slice(5)
      setSnackPool(remaining)
      setSelectedCategory(categoryId)
      setSelectedDifficulty(difficulty)
      setIsQuickPlay(false)
      setSessionType('snack')
      consumeSnackEnergy()
      initSessionState(sessionFacts)
      setScreen(SCREENS.QUESTION)
      return
    }

    // Snack/Jouer — uniquement les catégories débloquées
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
    if (sessionType === 'snack' || sessionType === 'snack') consumeSnackEnergy()
    initSessionState(factsWithOptions)
    setScreen(SCREENS.QUESTION)
  }, [selectedDifficulty, gameMode, sessionType, handleBlitzStart, unlockedFacts, initSessionState])

  const handleSnackMode = useCallback(() => {
    setGameMode('snack')
    setSessionType('snack')
    setScreen(SCREENS.CATEGORY)
  }, [])

  return { handleSelectDifficulty, handleSelectCategory, handleSnackMode }
}
