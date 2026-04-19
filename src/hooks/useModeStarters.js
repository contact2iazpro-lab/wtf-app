/**
 * useModeStarters — Session starters pour chaque mode de jeu.
 *
 * Extrait de App.jsx : handleFlashTeaser, handleStartFlashSession,
 * handleQuickie, handleQuickPlay, initSessionState.
 */

import { useCallback } from 'react'
import { DIFFICULTY_LEVELS, SCREENS, QUESTIONS_PER_GAME } from '../constants/gameConfig'
import {
  getValidFacts, getQuestFacts, getGeneratedFacts, getVipFacts,
  getPlayableCategories,
} from '../data/factsService'
import { getAnswerOptions } from '../utils/answers'
import { shuffle } from '../utils/shuffle'
import { consumeQuickieEnergy } from '../services/energyService'
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

  const handleFlashTeaser = useCallback(() => {
    audio.play('click')
    setScreen(SCREENS.WTF_TEASER)
  }, [])

  const handleStartFlashSession = useCallback(() => {
    audio.play('click')
    const flashFact = effectiveDailyFact
    if (!flashFact) {
      setGameAlert({ emoji: '⏳', title: 'Patience', message: 'Le f*ct de la semaine n\'est pas encore chargé. Réessaie dans quelques secondes !' })
      return
    }
    const category = flashFact.category
    const sameCat = getGeneratedFacts().filter(f => f.category === category && f.id !== flashFact.id)
    let pool = sameCat.filter(f => !unlockedFacts.has(f.id))
    if (pool.length < 5) {
      const already = sameCat.filter(f => !pool.some(p => p.id === f.id))
      pool = [...pool, ...already]
    }
    const facts = shuffle(pool)
      .slice(0, 5)
      .map(fact => ({ ...fact, ...getAnswerOptions(fact, DIFFICULTY_LEVELS.FLASH) }))

    setSessionType('flash')
    setGameMode('solo')
    setIsQuickPlay(false)
    setSelectedDifficulty(DIFFICULTY_LEVELS.FLASH)
    setSelectedCategory(category)
    initSessionState(facts)
    logDevEvent('session_started', { type: 'flash', category, factId: flashFact.id })
    setScreen(SCREENS.QUESTION)
  }, [effectiveDailyFact, unlockedFacts, initSessionState])

  const handleQuickie = useCallback(() => {
    audio.play('click')
    // Ne montrer que des facts des catégories débloquées
    const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    const unlockedCats = new Set(wd.unlockedCategories || ['sport', 'records', 'animaux', 'kids', 'definition'])
    const pool = getGeneratedFacts().filter(f =>
      !unlockedFacts.has(f.id) && unlockedCats.has(f.category)
    )

    if (pool.length < 5) {
      if (pool.length === 0) {
        setGameAlert({ emoji: '🎉', title: 'Bientôt !', message: 'De nouveaux f*cts arrivent bientôt. Reviens vite !' })
        return
      }
      if (pool.length < 5) {
        const price = pool.length === 1 ? 5 : 10
        const preparedFacts = shuffle(pool)
          .map(fact => ({ ...fact, ...getAnswerOptions(fact, DIFFICULTY_LEVELS.QUICKIE) }))
        setMiniParcours({ pool: preparedFacts, price, mode: 'quickie', categoryId: null, difficulty: DIFFICULTY_LEVELS.QUICKIE })
        return
      }
    }

    // Bonus surprise VIP en Quickie (19/04/2026) : chaque question remplacée
    // par un VIP non-débloqué. Flag _isVipSurprise pour UX dédiée.
    // TEMPORAIRE : rate 100% pour test grandeur nature. À repasser à 0.03 ensuite.
    const VIP_SURPRISE_RATE = 1.0
    const vipPool = getVipFacts().filter(f => !unlockedFacts.has(f.id))
    const baseFacts = shuffle(pool).slice(0, 5)
    const usedVipIds = new Set()
    const mixedFacts = baseFacts.map(fact => {
      if (vipPool.length > 0 && Math.random() < VIP_SURPRISE_RATE) {
        const candidates = vipPool.filter(v => !usedVipIds.has(v.id))
        if (candidates.length > 0) {
          const vip = candidates[Math.floor(Math.random() * candidates.length)]
          usedVipIds.add(vip.id)
          return { ...vip, _isVipSurprise: true }
        }
      }
      return fact
    })
    const facts = mixedFacts
      .map(fact => ({ ...fact, ...getAnswerOptions(fact, DIFFICULTY_LEVELS.QUICKIE) }))

    setSessionType('quickie')
    setGameMode('solo')
    setIsQuickPlay(false)
    setSelectedDifficulty(DIFFICULTY_LEVELS.QUICKIE)
    setSelectedCategory(null)
    consumeQuickieEnergy()
    initSessionState(facts)
    setScreen(SCREENS.QUESTION)
  }, [unlockedFacts, initSessionState])

  const handleQuickPlay = useCallback(() => {
    const childMode = localStorage.getItem('wtf_child_mode') !== 'false'
    const validCats = getPlayableCategories().filter(cat =>
      getValidFacts().some(f => f.category === cat.id) && (childMode || cat.id !== 'kids')
    )
    const randomCat = validCats[Math.floor(Math.random() * validCats.length)]
    const difficulty = DIFFICULTY_LEVELS.QUICKIE
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
    handleFlashTeaser,
    handleStartFlashSession,
    handleQuickie,
    handleQuickPlay,
  }
}
