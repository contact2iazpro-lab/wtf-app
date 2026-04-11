/**
 * useQuestionFlow — Logique partagée pour le flow Question → Revelation.
 *
 * Gère : sélection de réponse, calcul des points, utilisation d'indices, timeout.
 * Utilisé par tous les modes : Quest, Play, Explorer, Hunt (pas Blitz qui a son propre flow).
 *
 * Dépend de : useGameSession() pour l'état de session.
 */

import { useCallback } from 'react'
import { updateCoins, updateHints, getBalances } from '../services/currencyService'

/**
 * @param {Object} params
 * @param {Object} params.currentFact - Le fact en cours
 * @param {Object} params.selectedDifficulty - Niveau de difficulté
 * @param {string} params.sessionType - Type de session
 * @param {string} params.selectedCategory - Catégorie sélectionnée (null = aléatoire)
 * @param {string} params.gameMode - Mode de jeu
 * @param {number} params.hintsUsed - Nombre d'indices utilisés
 * @param {Object} params.user - User Supabase (ou null)
 * @param {Function} params.onAnswered - Callback après réponse (answerIndex, isCorrect, points)
 * @param {Function} params.onTimeout - Callback après timeout
 * @param {Function} params.onHintUsed - Callback après utilisation d'indice
 * @param {Function} params.onFactUnlocked - Callback quand un fact est débloqué (factId, category)
 */
export function useQuestionFlow({
  currentFact,
  selectedDifficulty,
  sessionType,
  selectedCategory,
  gameMode,
  hintsUsed,
  user,
  onAnswered,
  onTimeout,
  onHintUsed,
  onFactUnlocked,
}) {

  // ── Calcul des points ──────────────────────────────────────────────────
  const calculatePoints = useCallback((isCorrect) => {
    if (!isCorrect) return 0
    if (selectedDifficulty?.coinsPerCorrect !== undefined) {
      let points = selectedDifficulty.coinsPerCorrect
      // Mode Jouer avec catégorie choisie → 1 coin au lieu de 2
      if (sessionType === 'flash_solo' && selectedCategory !== null) {
        points = 1
      }
      return points
    }
    // Legacy : dégradation selon les indices utilisés
    const sc = selectedDifficulty?.scoring?.correct
    return Array.isArray(sc) ? (sc[hintsUsed] ?? sc[sc.length - 1]) : (sc || 0)
  }, [selectedDifficulty, sessionType, selectedCategory, hintsUsed])

  // ── Sélection de réponse (QCM) ─────────────────────────────────────────
  const handleSelectAnswer = useCallback((answerIndex) => {
    if (!currentFact) return
    const isCorrect = answerIndex === currentFact.correctIndex
    const points = calculatePoints(isCorrect)

    // Sauvegarder les coins en temps réel
    if (points > 0 && gameMode !== 'duel') {
      updateCoins(points)
    }

    // Débloquer le fact immédiatement (Explorer/Flash)
    if (isCorrect && currentFact && (sessionType === 'marathon' || sessionType === 'flash_solo')) {
      const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      if (wd.onboardingCompleted) {
        onFactUnlocked?.(currentFact.id, currentFact.category)
      }
    }

    onAnswered?.(answerIndex, isCorrect, points)
  }, [currentFact, gameMode, sessionType, calculatePoints, onAnswered, onFactUnlocked])

  // ── Validation ouverte (non-QCM) ───────────────────────────────────────
  const handleOpenValidate = useCallback((isCorrect) => {
    const points = calculatePoints(isCorrect)

    if (points > 0 && gameMode !== 'duel') {
      updateCoins(points)
    }

    if (isCorrect && currentFact) {
      onFactUnlocked?.(currentFact.id, currentFact.category)
    }

    const answerIndex = isCorrect ? 100 : -2
    onAnswered?.(answerIndex, isCorrect, points)
  }, [currentFact, gameMode, calculatePoints, onAnswered, onFactUnlocked])

  // ── Timeout ────────────────────────────────────────────────────────────
  const handleTimeout = useCallback(() => {
    onTimeout?.()
  }, [onTimeout])

  // ── Utilisation d'indice ───────────────────────────────────────────────
  const handleUseHint = useCallback((hintNum) => {
    const freeHints = selectedDifficulty?.freeHints || 0
    const isPaidHint = hintNum > freeHints

    if (isPaidHint) {
      if (getBalances().hints < 1) return
      updateHints(-1)
    }

    onHintUsed?.(hintNum)
  }, [selectedDifficulty, onHintUsed])

  return {
    handleSelectAnswer,
    handleOpenValidate,
    handleTimeout,
    handleUseHint,
    calculatePoints,
  }
}
