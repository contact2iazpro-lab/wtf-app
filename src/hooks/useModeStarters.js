/**
 * useModeStarters — Session starters pour chaque mode de jeu.
 *
 * Extrait de App.jsx : handleWTFWeekly, handleStartWTFSession,
 * handleFlashSolo, handleQuickPlay, initSessionState.
 */

import { useCallback } from 'react'
import { DIFFICULTY_LEVELS, SCREENS, QUESTIONS_PER_GAME } from '../constants/gameConfig'
import {
  getValidFacts, getQuestFacts, getGeneratedFacts,
  getPlayableCategories,
} from '../data/factsService'
import { getAnswerOptions } from '../utils/answers'
import { shuffle } from '../utils/shuffle'
import { consumeFlashEnergy } from '../services/energyService'
import { logDevEvent } from '../utils/devLogger'
import { audio } from '../utils/audio'

export function useModeStarters({
  effectiveDailyFact, unlockedFacts, user,
  setSessionFacts, setCurrentIndex, setSessionScore, setCorrectCount,
  setHintsUsed, setSessionAnyHintUsed, setSelectedAnswer, setIsCorrect,
  setSessionCorrectFacts, setNewlyUnlockedCategories, setShowNewCategoriesModal,
  setCompletedLevels, setSessionIsPerfect, setPointsEarned,
  setSessionType, setGameMode, setIsQuickPlay, setSelectedDifficulty,
  setSelectedCategory, setScreen, setGameAlert, setMiniParcours,
}) {

  const initSessionState = useCallback((facts) => {
    setSessionFacts(facts)
    setCurrentIndex(0)
    setSessionScore(0)
    setCorrectCount(0)
    setHintsUsed(0)
    setSessionAnyHintUsed(false)
    setSelectedAnswer(null)
    setIsCorrect(null)
    setSessionCorrectFacts([])
    setNewlyUnlockedCategories([])
    setShowNewCategoriesModal(false)
    setCompletedLevels([])
    setSessionIsPerfect(false)
    setPointsEarned(0)
  }, [])

  const handleWTFWeekly = useCallback(() => {
    audio.play('click')
    setScreen(SCREENS.WTF_TEASER)
  }, [])

  const handleStartWTFSession = useCallback(() => {
    audio.play('click')
    let huntFact = effectiveDailyFact
    if (!huntFact) {
      const isDevOrTest = localStorage.getItem('wtf_dev_mode') === 'true' || localStorage.getItem('wtf_test_mode') === 'true'
      if (isDevOrTest) {
        const allValid = getQuestFacts()
        huntFact = allValid.length > 0 ? allValid[Math.floor(Math.random() * allValid.length)] : getValidFacts()[0]
      }
      if (!huntFact) {
        setGameAlert({ emoji: '⏳', title: 'Patience', message: 'Le f*ct de la semaine n\'est pas encore chargé. Réessaie dans quelques secondes !' })
        return
      }
    }
    const category = huntFact.category
    const skipUnlock = localStorage.getItem('wtf_dev_mode') === 'true' || localStorage.getItem('wtf_test_mode') === 'true'
    const sameCat = getGeneratedFacts().filter(f => f.category === category && f.id !== huntFact.id)
    let pool = sameCat.filter(f => skipUnlock || !unlockedFacts.has(f.id))
    if (pool.length < 5) {
      const already = sameCat.filter(f => !pool.some(p => p.id === f.id))
      pool = [...pool, ...already]
    }
    const facts = shuffle(pool)
      .slice(0, 5)
      .map(fact => ({ ...fact, ...getAnswerOptions(fact, DIFFICULTY_LEVELS.HUNT) }))

    // Marquer le coffre WTF du dimanche comme "claimé" — point de non-retour.
    // Si l'user quitte après ce point (même en abandonnant la session), il
    // ne pourra plus re-tenter le défi cette semaine.
    try {
      const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      const claimed = Array.isArray(wd.coffreClaimedDays) ? wd.coffreClaimedDays : []
      if (!claimed.includes(6)) claimed.push(6)
      wd.coffreClaimedDays = claimed
      const now = new Date()
      const monday = new Date(now)
      monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1))
      wd.coffreWeekStart = monday.toISOString().slice(0, 10)
      wd.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(wd))
      window.dispatchEvent(new Event('wtf_storage_sync'))
    } catch { /* ignore */ }

    setSessionType('wtf_du_jour')
    setGameMode('solo')
    setIsQuickPlay(false)
    setSelectedDifficulty(DIFFICULTY_LEVELS.HUNT)
    setSelectedCategory(category)
    initSessionState(facts)
    logDevEvent('session_started', { type: 'wtf_du_jour', category, factId: huntFact.id })
    setScreen(SCREENS.QUESTION)
  }, [effectiveDailyFact, unlockedFacts, initSessionState])

  const handleFlashSolo = useCallback(() => {
    audio.play('click')
    const isDevMode = localStorage.getItem('wtf_dev_mode') === 'true'
    const isTestMode = localStorage.getItem('wtf_test_mode') === 'true'
    const skipUnlock = isDevMode || isTestMode
    // Ne montrer que des facts des catégories débloquées
    const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    const unlockedCats = new Set(wd.unlockedCategories || ['sport', 'records', 'animaux', 'kids', 'definition'])
    const pool = getGeneratedFacts().filter(f =>
      (skipUnlock || !unlockedFacts.has(f.id)) && (skipUnlock || unlockedCats.has(f.category))
    )

    if (pool.length < 5) {
      if (isDevMode) pool.push(...getGeneratedFacts().filter(f => !pool.some(p => p.id === f.id)))
      if (pool.length === 0) {
        setGameAlert({ emoji: '🎉', title: 'Bientôt !', message: 'De nouveaux f*cts arrivent bientôt. Reviens vite !' })
        return
      }
      if (pool.length < 5) {
        const price = pool.length === 1 ? 5 : 10
        const preparedFacts = shuffle(pool)
          .map(fact => ({ ...fact, ...getAnswerOptions(fact, DIFFICULTY_LEVELS.FLASH) }))
        setMiniParcours({ pool: preparedFacts, price, mode: 'flash', categoryId: null, difficulty: DIFFICULTY_LEVELS.FLASH })
        return
      }
    }

    const facts = shuffle(pool)
      .slice(0, 5)
      .map(fact => ({ ...fact, ...getAnswerOptions(fact, DIFFICULTY_LEVELS.FLASH) }))

    setSessionType('flash_solo')
    setGameMode('solo')
    setIsQuickPlay(false)
    setSelectedDifficulty(DIFFICULTY_LEVELS.FLASH)
    setSelectedCategory(null)
    consumeFlashEnergy()
    initSessionState(facts)
    setScreen(SCREENS.QUESTION)
  }, [unlockedFacts, initSessionState])

  const handleQuickPlay = useCallback(() => {
    const childMode = localStorage.getItem('wtf_child_mode') !== 'false'
    const validCats = getPlayableCategories().filter(cat =>
      getValidFacts().some(f => f.category === cat.id) && (childMode || cat.id !== 'kids')
    )
    const randomCat = validCats[Math.floor(Math.random() * validCats.length)]
    const difficulty = DIFFICULTY_LEVELS.FLASH
    const facts = shuffle(getValidFacts().filter(f => f.category === randomCat.id))
      .slice(0, QUESTIONS_PER_GAME)
      .map(fact => ({ ...fact, ...getAnswerOptions(fact, difficulty) }))

    setSessionType('parcours')
    setIsQuickPlay(true)
    setGameMode('solo')
    setSelectedDifficulty(difficulty)
    setSelectedCategory(randomCat.id)
    initSessionState(facts)
    setScreen(SCREENS.QUESTION)
  }, [initSessionState])

  return {
    initSessionState,
    handleWTFWeekly,
    handleStartWTFSession,
    handleFlashSolo,
    handleQuickPlay,
  }
}
