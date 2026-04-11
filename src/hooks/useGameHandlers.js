/**
 * useGameHandlers — Handlers communs à tous les modes de jeu.
 *
 * Extrait de App.jsx : handleSelectAnswer, handleOpenValidate, handleTimeout,
 * handleUseHint (la logique commune Q/R).
 *
 * Les setters d'état sont passés en paramètres car ils restent dans App.jsx.
 * Ce hook ne fait que regrouper la logique pour réduire la taille de App.jsx.
 */

import { useCallback } from 'react'
import { updateCoins, updateHints, getBalances } from '../services/currencyService'
import { saveStorage, loadStorage } from '../utils/storageHelper'
import { SCREENS } from '../constants/gameConfig'

export function useGameHandlers({
  // Lecture
  currentFact,
  gameMode,
  sessionType,
  selectedDifficulty,
  selectedCategory,
  hintsUsed,
  selectedAnswer,
  duelCurrentPlayerIndex,
  user,
  unlockedFacts,
  // Setters
  setSelectedAnswer,
  setIsCorrect,
  setPointsEarned,
  setSessionScore,
  setCorrectCount,
  setSessionCorrectFacts,
  setDuelPlayers,
  setHintsUsed,
  setSessionAnyHintUsed,
  setStorage,
  setNewlyUnlockedCategories,
  setScreen,
}) {

  // ── Calcul des points ──────────────────────────────────────────────────
  const calcPoints = useCallback((isCorrect) => {
    if (!isCorrect) return 0
    if (selectedDifficulty?.coinsPerCorrect !== undefined) {
      let pts = selectedDifficulty.coinsPerCorrect
      if (sessionType === 'flash_solo' && selectedCategory !== null) pts = 1
      return pts
    }
    const sc = selectedDifficulty?.scoring?.correct
    return Array.isArray(sc) ? (sc[hintsUsed] ?? sc[sc.length - 1]) : (sc || 0)
  }, [selectedDifficulty, sessionType, selectedCategory, hintsUsed])

  // ── handleSelectAnswer ─────────────────────────────────────────────────
  const handleSelectAnswer = useCallback((answerIndex) => {
    if (!currentFact) return
    const isAnswerCorrect = answerIndex === currentFact.correctIndex
    const points = calcPoints(isAnswerCorrect)

    setSelectedAnswer(answerIndex)
    setIsCorrect(isAnswerCorrect)
    setPointsEarned(points)

    if (isAnswerCorrect && currentFact) {
      setSessionCorrectFacts(prev => [...prev, currentFact])
    }

    if (gameMode === 'duel') {
      setDuelPlayers(ps => ps.map((p, i) => i === duelCurrentPlayerIndex ? { ...p, score: p.score + points } : p))
    } else {
      setSessionScore(s => s + points)
      if (isAnswerCorrect) setCorrectCount(c => c + 1)
      if (points > 0) updateCoins(points)

      // Explorer/Marathon : débloquer le f*ct immédiatement
      if (isAnswerCorrect && currentFact && (sessionType === 'marathon' || sessionType === 'flash_solo')) {
        setStorage(prev => {
          const newUnlocked = new Set(prev.unlockedFacts)
          if (!newUnlocked.has(currentFact.id)) {
            const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
            if (wd.onboardingCompleted) {
              newUnlocked.add(currentFact.id)
              const next = { ...prev, unlockedFacts: newUnlocked }
              saveStorage(next)

              // Débloquer la catégorie
              const unlockedCategories = wd.unlockedCategories || ['sport', 'records', 'animaux', 'kids', 'definition']
              if (currentFact.category && !unlockedCategories.includes(currentFact.category)) {
                unlockedCategories.push(currentFact.category)
                wd.unlockedCategories = unlockedCategories
                wd.lastModified = Date.now()
                localStorage.setItem('wtf_data', JSON.stringify(wd))
                setNewlyUnlockedCategories(prev => {
                  if (!prev.includes(currentFact.category)) return [...prev, currentFact.category]
                  return prev
                })
              }

              if (user) {
                import('../services/collectionService').then(({ updateCollection }) => {
                  updateCollection(user.id, currentFact.category, currentFact.id)
                })
              }
              return next
            }
          }
          return prev
        })
      }
    }

    setScreen(SCREENS.REVELATION)
  }, [currentFact, gameMode, duelCurrentPlayerIndex, calcPoints, sessionType, user, selectedCategory])

  // ── handleOpenValidate ─────────────────────────────────────────────────
  const handleOpenValidate = useCallback((isCorrect) => {
    const points = calcPoints(isCorrect)

    setSelectedAnswer(isCorrect ? 100 : -2)
    setIsCorrect(isCorrect)
    setPointsEarned(points)

    if (isCorrect && currentFact) {
      setSessionCorrectFacts(prev => [...prev, currentFact])
    }

    if (gameMode === 'duel') {
      setDuelPlayers(ps => ps.map((p, i) => i === duelCurrentPlayerIndex ? { ...p, score: p.score + points } : p))
    } else {
      setSessionScore(s => s + points)
      if (isCorrect) setCorrectCount(c => c + 1)
      if (points > 0) updateCoins(points)
    }

    setScreen(SCREENS.REVELATION)
  }, [calcPoints, gameMode, duelCurrentPlayerIndex, currentFact])

  // ── handleTimeout ──────────────────────────────────────────────────────
  const handleTimeout = useCallback(() => {
    if (selectedAnswer !== null) return
    setSelectedAnswer(-1)
    setIsCorrect(false)
    setPointsEarned(0)
    setScreen(SCREENS.REVELATION)
  }, [selectedAnswer])

  // ── handleUseHint ──────────────────────────────────────────────────────
  const handleUseHint = useCallback((hintNum) => {
    const freeHints = selectedDifficulty?.freeHints || 0
    const isPaidHint = hintNum > freeHints
    if (isPaidHint) {
      if (getBalances().hints < 1) return
      updateHints(-1)
    }
    setHintsUsed(hintNum)
    setSessionAnyHintUsed(true)
  }, [selectedDifficulty])

  return {
    handleSelectAnswer,
    handleOpenValidate,
    handleTimeout,
    handleUseHint,
  }
}
