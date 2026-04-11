/**
 * useBlitzLogic — Logique de démarrage et fin du mode Blitz.
 *
 * Gère : préparation du pool de facts, sauvegarde des stats Blitz,
 * détection des records, gestion des défis.
 *
 * Le timer et le gameplay temps-réel restent dans BlitzScreen
 * (composant enfant). Ce hook gère le setup et le teardown.
 */

import { useCallback } from 'react'
import { getBlitzFacts, getCategoryById } from '../data/factsService'
import { getAnswerOptions } from '../utils/answers'
import { DIFFICULTY_LEVELS } from '../constants/gameConfig'
import { updateTrophyData } from '../utils/storageHelper'
import { checkBadges } from '../utils/badgeManager'
import { audio } from '../utils/audio'

/**
 * @param {Object} params
 * @param {Object} params.user - Supabase user
 * @param {string} params.selectedCategory - Catégorie sélectionnée
 * @param {boolean} params.isChallengeMode - Mode défi actif
 * @param {Function} params.onAlert - Callback pour afficher une alerte
 * @param {Function} params.onBadgesEarned - Callback quand des badges sont gagnés
 * @returns {{ prepareBlitz, processBlitzEnd }}
 */
export function useBlitzLogic({
  user,
  selectedCategory,
  isChallengeMode,
  onAlert,
  onBadgesEarned,
}) {

  /**
   * Prépare le pool de facts pour une session Blitz.
   * @param {string|null} categoryId - Catégorie (null = toutes)
   * @param {number} questionCount - Nombre de questions (0 = toutes)
   * @returns {Array|null} Facts préparés ou null si pas assez de facts
   */
  const prepareBlitz = useCallback((categoryId, questionCount) => {
    audio.play('click')
    let pool = getBlitzFacts()
    if (categoryId) pool = pool.filter(f => f.category === categoryId)

    if (pool.length < 4) {
      onAlert?.({
        emoji: '🔓',
        title: 'Pas assez de f*cts',
        message: 'Joue en mode Jouer ou Quest pour débloquer plus de f*cts avant de jouer en Blitz !',
      })
      return null
    }

    const count = questionCount || pool.length
    return [...pool]
      .sort(() => Math.random() - 0.5)
      .slice(0, count)
      .map(fact => ({ ...fact, ...getAnswerOptions(fact, DIFFICULTY_LEVELS.BLITZ) }))
  }, [onAlert])

  /**
   * Traite la fin d'une session Blitz.
   * @param {Object} results - Résultats du BlitzScreen
   * @param {number} results.finalTime
   * @param {number} results.correctCount
   * @param {number} results.totalAnswered
   * @param {number} results.penalties
   * @returns {Object} Données enrichies pour BlitzResultsScreen
   */
  const processBlitzEnd = useCallback((results) => {
    const { finalTime, correctCount, totalAnswered, penalties } = results

    let isNewRecord = false
    let bestTime = null

    try {
      const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      if (!wtfData.statsByMode) wtfData.statsByMode = {}
      if (!wtfData.statsByMode.blitz) {
        wtfData.statsByMode.blitz = { gamesPlayed: 0, totalCorrect: 0, totalAnswered: 0, bestStreak: 0 }
      }
      const ms = wtfData.statsByMode.blitz
      ms.gamesPlayed += 1
      ms.totalCorrect += correctCount
      ms.totalAnswered += totalAnswered
      if (correctCount > ms.bestStreak) ms.bestStreak = correctCount

      if (!wtfData.bestBlitzTime || finalTime < wtfData.bestBlitzTime) {
        wtfData.bestBlitzTime = finalTime
        isNewRecord = true
      }
      bestTime = wtfData.bestBlitzTime

      if (!wtfData.blitzRecords) wtfData.blitzRecords = {}
      const catKey = selectedCategory || 'all'
      const palierKey = `${catKey}_${totalAnswered}`
      const existingRecord = wtfData.blitzRecords[palierKey]
      if (!existingRecord || finalTime < existingRecord) {
        wtfData.blitzRecords[palierKey] = finalTime
      }

      wtfData.gamesPlayed = (wtfData.gamesPlayed || 0) + 1
      wtfData.totalCorrect = (wtfData.totalCorrect || 0) + correctCount
      wtfData.totalAnswered = (wtfData.totalAnswered || 0) + totalAnswered
      if (correctCount === totalAnswered && totalAnswered > 0) {
        wtfData.blitzPerfects = (wtfData.blitzPerfects || 0) + 1
      }
      wtfData.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(wtfData))
    } catch { /* ignore */ }

    updateTrophyData()
    const newBadges = checkBadges()
    if (newBadges.length > 0) onBadgesEarned?.(newBadges)

    // Complete challenge si actif
    const challengeJson = localStorage.getItem('wtf_active_challenge')
    if (challengeJson && user) {
      try {
        const challengeInfo = JSON.parse(challengeJson)
        localStorage.removeItem('wtf_active_challenge')
        import('../data/challengeService').then(({ completeChallenge: complete }) => {
          complete({
            challengeId: challengeInfo.challengeId,
            playerTime: finalTime,
            playerId: user.id,
            playerName: user.user_metadata?.name || 'Joueur WTF!',
          }).catch(e => console.warn('Challenge complete error:', e))
        })
      } catch { /* ignore */ }
    }

    const categoryLabel = selectedCategory
      ? (getCategoryById(selectedCategory)?.label || selectedCategory)
      : 'Toutes catégories'

    // Mode défi → créer le défi automatiquement
    if (isChallengeMode && user) {
      import('../data/challengeService').then(({ createChallenge }) => {
        createChallenge({
          categoryId: selectedCategory || 'all',
          categoryLabel,
          questionCount: totalAnswered,
          playerTime: finalTime,
          playerId: user.id,
          playerName: user.user_metadata?.name || 'Joueur WTF!',
        }).then(challenge => {
          localStorage.setItem('wtf_auto_challenge', JSON.stringify(challenge))
          window.dispatchEvent(new Event('wtf_challenge_created'))
        }).catch(e => console.warn('Auto challenge creation failed:', e))
      })
    }

    return {
      finalTime, correctCount, totalAnswered, penalties,
      bestTime, isNewRecord, categoryId: selectedCategory,
      categoryLabel, questionCount: totalAnswered,
    }
  }, [user, selectedCategory, isChallengeMode, onBadgesEarned])

  return { prepareBlitz, processBlitzEnd }
}
