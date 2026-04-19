/**
 * useSelectionHandlers — Handlers pour la sélection de difficulté et catégorie.
 *
 * Extrait de App.jsx : handleSelectDifficulty, handleSelectCategory, handleQuickieMode.
 */

import { useCallback } from 'react'
import { DIFFICULTY_LEVELS, SCREENS, QUESTIONS_PER_GAME } from '../constants/gameConfig'
import {
  getGeneratedFacts, getGeneratedFactsByCategory, getVipFacts,
  getPlayableCategories,
} from '../data/factsService'
import { getAnswerOptions } from '../utils/answers'
import { shuffle } from '../utils/shuffle'
import { consumeQuickieEnergy } from '../services/energyService'

export function useSelectionHandlers({
  gameMode, sessionType, selectedDifficulty, selectedCategory,
  unlockedFacts,
  initSessionState, handleBlitzStart,
  setSelectedDifficulty, setSelectedCategory, setGameMode, setSessionType,
  setIsQuickPlay, setQuickiePool, setScreen,
  setGameAlert, setMiniParcours,
}) {

  const handleSelectDifficulty = useCallback((difficulty) => {
    setSelectedDifficulty(difficulty)

    if (gameMode === 'quickie') {
      // Quickie utilise toujours sa difficulté dédiée (20s / 1 coin / 4 QCM)
      // peu importe celle passée en argument (legacy)
      const quickieDiff = DIFFICULTY_LEVELS.QUICKIE
      setSelectedDifficulty(quickieDiff)
      const pool = getGeneratedFactsByCategory(selectedCategory).filter(f => !unlockedFacts.has(f.id))
      if (pool.length === 0) {
        setGameAlert({ emoji: '🎉', title: 'Bientôt !', message: 'De nouveaux f*cts arrivent bientôt dans cette catégorie !' })
        return
      }
      if (pool.length < 4) {
        const price = pool.length === 1 ? 5 : 10
        const preparedFacts = shuffle(pool)
          .map(fact => ({ ...fact, ...getAnswerOptions(fact, quickieDiff) }))
        setMiniParcours({ pool: preparedFacts, price, mode: 'quickie', categoryId: selectedCategory, difficulty: quickieDiff })
        return
      }
      const facts = shuffle(pool).slice(0, 20)
        .map(fact => ({ ...fact, ...getAnswerOptions(fact, quickieDiff) }))
      setIsQuickPlay(false)
      setSessionType('quickie')
      initSessionState(facts)
      setScreen(SCREENS.QUESTION)
      return
    }

    // Ancien mode Quest (Cool/Hot) supprimé (sub-step 1a — 2026-04-15).
    // Cette fonction ne gère plus que le flow Quickie.
    console.warn('[useSelectionHandlers] handleSelectDifficulty called outside explorer mode — no-op')
  }, [unlockedFacts, gameMode, selectedCategory, initSessionState, handleBlitzStart])

  const handleSelectCategory = useCallback((categoryId) => {
    if (gameMode === 'blitz') { handleBlitzStart(categoryId); return }

    if (gameMode === 'quickie') {
      const difficulty = DIFFICULTY_LEVELS.QUICKIE
      const pool = getGeneratedFactsByCategory(categoryId).filter(f => !unlockedFacts.has(f.id))
      if (pool.length === 0) { setGameAlert({ emoji: '🎉', title: 'Bientôt !', message: 'De nouveaux f*cts arrivent bientôt dans cette catégorie !' }); return }
      // Mini-parcours : catégorie presque terminée (< 5 f*cts restants)
      // Économie ×10 (décision 17/04/2026) : 50 coins par fact.
      //   1 fact  → 50 coins   (max gain 10 → expérience, perte nette)
      //   2 facts → 100 coins  (max gain 20)
      //   3 facts → 150 coins  (max gain 30)
      //   4 facts → 200 coins  (max gain 40)
      if (pool.length < 5) {
        const price = pool.length * 50
        const preparedFacts = shuffle(pool).map(fact => ({ ...fact, ...getAnswerOptions(fact, difficulty) }))
        setMiniParcours({ pool: preparedFacts, price, mode: 'quickie', categoryId, difficulty })
        return
      }
      // Bonus VIP surprise (19/04/2026) — même logique que handleQuickie
      // TEMPORAIRE rate=1.0 pour test. À repasser à 0.03 ensuite.
      const VIP_SURPRISE_RATE = 1.0
      const vipPool = getVipFacts().filter(f => !unlockedFacts.has(f.id))
      const shuffled = shuffle(pool)
      const base = shuffled.slice(0, 5)
      const usedVipIds = new Set()
      const mixed = base.map(fact => {
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
      const sessionFacts = mixed.map(fact => ({ ...fact, ...getAnswerOptions(fact, difficulty) }))
      const remaining = shuffled.slice(5)
      setQuickiePool(remaining)
      setSelectedCategory(categoryId)
      setSelectedDifficulty(difficulty)
      setIsQuickPlay(false)
      setSessionType('quickie')
      consumeQuickieEnergy()
      initSessionState(sessionFacts)
      setScreen(SCREENS.QUESTION)
      return
    }

    // Quickie/Jouer — uniquement les catégories débloquées
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
    if (sessionType === 'quickie' || sessionType === 'quickie') consumeQuickieEnergy()
    initSessionState(factsWithOptions)
    setScreen(SCREENS.QUESTION)
  }, [selectedDifficulty, gameMode, sessionType, handleBlitzStart, unlockedFacts, initSessionState])

  const handleQuickieMode = useCallback(() => {
    setGameMode('quickie')
    setSessionType('quickie')
    setScreen(SCREENS.CATEGORY)
  }, [])

  return { handleSelectDifficulty, handleSelectCategory, handleQuickieMode }
}
