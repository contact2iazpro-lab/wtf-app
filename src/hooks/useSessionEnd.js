/**
 * useSessionEnd — Logique de fin de session (quand toutes les questions sont répondues).
 *
 * Responsabilités :
 * - Débloquer les facts corrects dans localStorage + Supabase
 * - Détecter les catégories nouvellement débloquées
 * - Calculer les bonus coins (perfect, streak, etc.)
 * - Mettre à jour les stats par mode
 * - Vérifier les badges/trophées
 * - Retourner les données pour l'écran de résultats
 *
 * Extrait de App.jsx handleNext (lignes 1047-1312).
 */

import { useCallback } from 'react'
import { updateCoins, updateTickets, updateHints, getBalances } from '../services/currencyService'
import { updateCollection } from '../services/collectionService'
import { syncAfterAction } from '../services/playerSyncService'
import { loadStorage, saveStorage, updateTrophyData, TODAY } from '../utils/storageHelper'
import { getCategoryLevelFactIds } from '../data/factsService'
import { checkBadges } from '../utils/badgeManager'
import { getStreakReward } from '../constants/gameConfig'

/**
 * @param {Object} params
 * @param {Object} params.user - Supabase user (ou null)
 * @param {Function} params.onTrophiesEarned - Callback quand des trophées sont débloqués
 * @param {Function} params.onCategoriesUnlocked - Callback quand des catégories sont débloquées
 * @param {Function} params.onStreakReward - Callback pour afficher la récompense streak
 * @param {Function} params.onStreakSpecial - Callback pour la modal J30
 * @returns {{ processSessionEnd: Function }}
 */
export function useSessionEnd({
  user,
  onTrophiesEarned,
  onCategoriesUnlocked,
  onStreakReward,
  onStreakSpecial,
}) {

  /**
   * Traite la fin d'une session de jeu.
   * @param {Object} session - État de la session
   * @param {string} session.sessionType - Type de session
   * @param {Array} session.sessionFacts - Facts de la session
   * @param {Array} session.sessionCorrectFacts - Facts répondus correctement
   * @param {number} session.sessionScore - Score cumulé
   * @param {number} session.correctCount - Nombre de bonnes réponses
   * @param {boolean} session.isCorrect - Dernière réponse correcte ?
   * @param {boolean} session.sessionAnyHintUsed - Indice utilisé dans la session ?
   * @param {number} session.selectedAnswer - Dernière réponse sélectionnée
   * @param {Object} session.selectedDifficulty - Difficulté
   * @param {string} session.selectedCategory - Catégorie
   * @param {Object} session.effectiveDailyFact - WTF du Jour
   * @param {boolean} session.isQuickPlay - Mode rapide ?
   * @returns {{ bonusCoins, totalCoinsEarned, isPerfect, completedLevels, streakReward, firstFlashTicketGiven }}
   */
  const processSessionEnd = useCallback((session) => {
    const {
      sessionType, sessionFacts, sessionCorrectFacts, sessionScore,
      correctCount, isCorrect, sessionAnyHintUsed, selectedAnswer,
      selectedDifficulty, selectedCategory, effectiveDailyFact, isQuickPlay,
    } = session

    const storage = loadStorage()
    const { totalScore, streak, unlockedFacts, wtfDuJourDate, sessionsToday } = storage

    const isFirstSessionToday = sessionsToday === 0
    const newStreak = isFirstSessionToday ? streak + 1 : streak
    const newSessionsToday = sessionsToday + 1

    let result = {
      bonusCoins: 0,
      totalCoinsEarned: sessionScore,
      isPerfect: false,
      completedLevels: [],
      streakReward: null,
      firstFlashTicketGiven: false,
      newlyUnlockedCategories: [],
    }

    if (isQuickPlay) {
      // Quick play : pas de sauvegarde
      return result
    }

    // ── Débloquer les facts corrects ──────────────────────────────────────
    const newUnlocked = new Set(unlockedFacts)
    const toSync = []
    const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')

    for (const fact of sessionCorrectFacts) {
      if (!newUnlocked.has(fact.id)) {
        newUnlocked.add(fact.id)
        toSync.push(fact)
      }
    }

    // ── Détecter les niveaux complétés (Quest uniquement) ────────────────
    if (sessionType === 'parcours') {
      for (const fact of toSync) {
        if (!fact.difficulty) continue
        const key = `${fact.category}_${fact.difficulty}`
        const levelFacts = getCategoryLevelFactIds()[key]
        if (levelFacts && [...levelFacts].every(id => newUnlocked.has(id))) {
          if (!result.completedLevels.find(c => c.catId === fact.category && c.difficulty === fact.difficulty)) {
            result.completedLevels.push({ catId: fact.category, difficulty: fact.difficulty })
          }
        }
      }
    }

    // ── Débloquer les catégories ──────────────────────────────────────────
    if (sessionType === 'parcours' || sessionType === 'marathon' || sessionType === 'flash_solo') {
      const unlockedCategories = wd.unlockedCategories || ['sport', 'records', 'animaux', 'kids', 'definition']
      for (const fact of toSync) {
        if (fact.category && !unlockedCategories.includes(fact.category)) {
          unlockedCategories.push(fact.category)
          if (!result.newlyUnlockedCategories.includes(fact.category)) {
            result.newlyUnlockedCategories.push(fact.category)
          }
        }
      }
      if (result.newlyUnlockedCategories.length > 0) {
        wd.unlockedCategories = unlockedCategories
        wd.lastModified = Date.now()
        localStorage.setItem('wtf_data', JSON.stringify(wd))
        onCategoriesUnlocked?.(result.newlyUnlockedCategories)
      }
    }

    // ── Perfect session ──────────────────────────────────────────────────
    const totalCorrect = correctCount + (isCorrect ? 1 : 0)
    const isPerfectSession = sessionType === 'parcours' && totalCorrect === sessionFacts.length
    if (isPerfectSession) {
      const catKey = selectedCategory || 'all'
      const diffKey = selectedDifficulty?.id || 'unknown'
      localStorage.setItem(`wtf_perfect_${catKey}_${diffKey}`, 'true')
    }
    result.isPerfect = isPerfectSession

    // Ticket bonus onboarding supprimé — sera réimplémenté avec le tuto

    // ── Bonus coins ──────────────────────────────────────────────────────
    let bonusCoins = 0
    if (sessionType === 'wtf_du_jour') {
      bonusCoins = 10
    } else if (sessionType === 'flash_solo') {
      const isPerfectFlash = totalCorrect === sessionFacts.length && !sessionAnyHintUsed && (selectedAnswer !== -1)
      bonusCoins = isPerfectFlash ? 10 : 0
    } else if (sessionType === 'parcours') {
      bonusCoins = isPerfectSession ? 10 : 0
    } else if (sessionType === 'marathon') {
      bonusCoins = totalCorrect === sessionFacts.length ? 10 : 0
    }
    result.bonusCoins = bonusCoins
    result.totalCoinsEarned = sessionScore + bonusCoins

    // ── Streak rewards ───────────────────────────────────────────────────
    const streakReward = isFirstSessionToday ? getStreakReward(newStreak) : null
    result.streakReward = streakReward

    if (streakReward) {
      if (streakReward.hints > 0) updateHints(streakReward.hints)
      if (streakReward.badge) localStorage.setItem(`wtf_badge_streak_${newStreak}`, 'true')
      if (streakReward.special === 'wtf_premium') {
        onStreakSpecial?.()
      } else {
        onStreakReward?.({ days: newStreak, reward: streakReward })
      }
    }

    const streakRewardCoins = streakReward?.coins ?? 0
    const totalBonusCoins = bonusCoins + streakRewardCoins
    const totalBonusTickets = (isPerfectSession ? 1 : 0) + (streakReward?.tickets ?? 0)
    if (totalBonusCoins > 0) updateCoins(totalBonusCoins)
    if (totalBonusTickets > 0) updateTickets(totalBonusTickets)

    // ── Sauvegarder storage ──────────────────────────────────────────────
    const newWtfDuJourDate = sessionType === 'wtf_du_jour' ? TODAY() : wtfDuJourDate
    const marathonSessionsToday = sessionType === 'marathon' ? sessionsToday : newSessionsToday

    const newStorage = {
      totalScore: totalScore + sessionScore,
      streak: newStreak,
      unlockedFacts: newUnlocked,
      wtfCoins: getBalances().coins,
      wtfDuJourDate: newWtfDuJourDate,
      sessionsToday: marathonSessionsToday,
      tickets: getBalances().tickets,
      wtfDuJourFait: newWtfDuJourDate === TODAY(),
    }
    saveStorage(newStorage)

    // Sync Supabase collections
    if (user) {
      for (const fact of toSync) {
        updateCollection(user.id, fact.category, fact.id)
      }
      syncAfterAction(user.id)
    }

    // WTF du Jour : débloquer le daily fact
    if (sessionType === 'wtf_du_jour' && effectiveDailyFact && !newUnlocked.has(effectiveDailyFact.id)) {
      newUnlocked.add(effectiveDailyFact.id)
      const updatedStorage = { ...newStorage, unlockedFacts: newUnlocked }
      saveStorage(updatedStorage)
      if (user) updateCollection(user.id, effectiveDailyFact.category, effectiveDailyFact.id)
    }

    // ── Stats par mode ───────────────────────────────────────────────────
    try {
      const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      if (!wtfData.statsByMode) wtfData.statsByMode = {}
      if (!wtfData.statsByMode[sessionType]) {
        wtfData.statsByMode[sessionType] = { gamesPlayed: 0, totalCorrect: 0, totalAnswered: 0, bestStreak: 0 }
      }
      const ms = wtfData.statsByMode[sessionType]
      ms.gamesPlayed += 1
      ms.totalCorrect += totalCorrect
      ms.totalAnswered += sessionFacts.length
      const currentStreak = wtfData.streak || 0
      if (currentStreak > ms.bestStreak) ms.bestStreak = currentStreak
      wtfData.gamesPlayed = (wtfData.gamesPlayed || 0) + 1
      if (sessionType === 'parcours') {
        wtfData.questsPlayed = (wtfData.questsPlayed || 0) + 1
      }
      wtfData.totalCorrect = (wtfData.totalCorrect || 0) + totalCorrect
      wtfData.totalAnswered = (wtfData.totalAnswered || 0) + sessionFacts.length
      wtfData.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(wtfData))
      window.dispatchEvent(new Event('wtf_storage_sync'))
    } catch { /* ignore */ }

    // ── Trophées ─────────────────────────────────────────────────────────
    updateTrophyData()
    const newBadges = checkBadges()
    if (newBadges.length > 0) {
      onTrophiesEarned?.(newBadges)
    }

    return result
  }, [user, onTrophiesEarned, onCategoriesUnlocked, onStreakReward, onStreakSpecial])

  return { processSessionEnd }
}
