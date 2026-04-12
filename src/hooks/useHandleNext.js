/**
 * useHandleNext — Gère la navigation entre questions et la fin de session.
 *
 * Extrait de App.jsx handleNext (~300 lignes).
 * Gère : question suivante, fin de session (unlock facts, bonus, stats, trophées, routing).
 */

import { useCallback } from 'react'
import { SCREENS, getStreakReward } from '../constants/gameConfig'
import { getCategoryLevelFactIds } from '../data/factsService'
import { loadStorage, saveStorage, updateTrophyData, TODAY } from '../utils/storageHelper'
import { updateCoins, updateTickets, updateHints, getBalances } from '../services/currencyService'
import { updateCollection } from '../services/collectionService'
import { syncAfterAction } from '../services/playerSyncService'
import { checkBadges } from '../utils/badgeManager'

export function useHandleNext({
  // State lectures
  gameMode, currentIndex, sessionFacts, sessionScore, numPlayers,
  isQuickPlay, sessionCorrectFacts, sessionType, effectiveDailyFact,
  correctCount, isCorrect, sessionAnyHintUsed, selectedAnswer,
  selectedDifficulty, selectedCategory, user,
  // State lecture storage
  totalScore, streak, unlockedFacts, wtfDuJourDate, sessionsToday, wtfCoins,
  // Setters
  setScreen, setCurrentIndex, setHintsUsed, setSelectedAnswer, setIsCorrect,
  setPointsEarned, setDuelCurrentPlayerIndex, setStorage, setCoinsEarnedLastSession,
  setSessionIsPerfect, setCompletedLevels, setNewlyUnlockedCategories,
  setShowNewCategoriesModal, setShowStreakSpecialModal, setStreakRewardToast,
  setTrophyQueue,
}) {

  const handleNext = useCallback(() => {
    try {
    const nextIndex = currentIndex + 1

    // ── DUEL ──────────────────────────────────────────────────────────
    if (gameMode === 'duel') {
      if (nextIndex >= Math.floor(sessionFacts.length / numPlayers)) {
        setScreen(SCREENS.DUEL_RESULTS)
      } else {
        setCurrentIndex(nextIndex)
        setDuelCurrentPlayerIndex(0)
        setHintsUsed(0)
        setSelectedAnswer(null)
        setIsCorrect(null)
        setPointsEarned(0)
        setScreen(SCREENS.DUEL_PASS)
      }
      return
    }

    // ── SOLO — Question suivante ──────────────────────────────────────
    if (nextIndex < sessionFacts.length) {
      setCurrentIndex(nextIndex)
      setHintsUsed(0)
      setSelectedAnswer(null)
      setIsCorrect(null)
      setPointsEarned(0)
      setScreen(SCREENS.QUESTION)
      return
    }

    // ══════════════════════════════════════════════════════════════════
    // FIN DE SESSION
    // ══════════════════════════════════════════════════════════════════

    const isFirstSessionToday = sessionsToday === 0
    const newStreak = isFirstSessionToday ? streak + 1 : streak
    const newSessionsToday = sessionsToday + 1

    if (!isQuickPlay) {
      // Unlock facts
      const newUnlocked = new Set(unlockedFacts)
      const toSync = []
      const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')

      for (const fact of sessionCorrectFacts) {
        if (!newUnlocked.has(fact.id)) {
          newUnlocked.add(fact.id)
          toSync.push(fact)
        }
      }

      // Completed levels (parcours only)
      const newlyCompleted = []
      if (sessionType === 'parcours') {
        for (const fact of toSync) {
          if (!fact.difficulty) continue
          const key = `${fact.category}_${fact.difficulty}`
          const levelFacts = getCategoryLevelFactIds()[key]
          if (levelFacts && [...levelFacts].every(id => newUnlocked.has(id))) {
            if (!newlyCompleted.find(c => c.catId === fact.category && c.difficulty === fact.difficulty)) {
              newlyCompleted.push({ catId: fact.category, difficulty: fact.difficulty })
            }
          }
        }
      }
      setCompletedLevels(newlyCompleted)

      // Unlock categories
      if (sessionType === 'parcours') {
        const unlockedCategories = wd.unlockedCategories || ['sport', 'records', 'animaux', 'kids', 'definition']
        const newlyUnlockedCats = []
        for (const fact of toSync) {
          if (fact.category && !unlockedCategories.includes(fact.category)) {
            unlockedCategories.push(fact.category)
            if (!newlyUnlockedCats.includes(fact.category)) newlyUnlockedCats.push(fact.category)
          }
        }
        if (newlyUnlockedCats.length > 0) {
          wd.unlockedCategories = unlockedCategories
          wd.lastModified = Date.now()
          localStorage.setItem('wtf_data', JSON.stringify(wd))
          setNewlyUnlockedCategories(newlyUnlockedCats)
        }
      }

      // Perfect session
      const isPerfectSession = sessionType === 'parcours' && correctCount === sessionFacts.length
      if (isPerfectSession) {
        const catKey = selectedCategory || 'all'
        const diffKey = selectedDifficulty?.id || 'unknown'
        localStorage.setItem(`wtf_perfect_${catKey}_${diffKey}`, 'true')
      }
      setSessionIsPerfect(isPerfectSession)

      // Ticket bonus onboarding supprimé — sera réimplémenté avec le tuto

      // Bonus coins
      let bonusCoins = 0
      if (sessionType === 'wtf_du_jour') {
        bonusCoins = 10
      } else if (sessionType === 'flash_solo') {
        const isPerfectFlash = correctCount + (isCorrect ? 1 : 0) === sessionFacts.length && !sessionAnyHintUsed && (selectedAnswer !== -1)
        bonusCoins = isPerfectFlash ? 10 : 0
      } else if (sessionType === 'parcours') {
        bonusCoins = isPerfectSession ? 10 : 0
      } else if (sessionType === 'explorer') {
        const isPerfectExplorer = correctCount + (isCorrect ? 1 : 0) === sessionFacts.length
        bonusCoins = isPerfectExplorer ? 10 : 0
      }
      setCoinsEarnedLastSession(sessionScore + bonusCoins)

      // Streak rewards
      const streakReward = isFirstSessionToday ? getStreakReward(newStreak) : null
      if (streakReward) {
        if (streakReward.hints > 0) updateHints(streakReward.hints)
        if (streakReward.badge) localStorage.setItem(`wtf_badge_streak_${newStreak}`, 'true')
        if (streakReward.special === 'wtf_premium') {
          setShowStreakSpecialModal(true)
        } else {
          // Streak toast désactivé sur ResultsScreen — sera réintégré dans le flow global
          // setStreakRewardToast({ days: newStreak, reward: streakReward })
        }
      }

      const streakRewardCoins = streakReward?.coins ?? 0
      const newWtfDuJourDate = sessionType === 'wtf_du_jour' ? TODAY() : wtfDuJourDate
      const explorerSessionsToday = sessionType === 'explorer' ? sessionsToday : newSessionsToday

      const totalBonusCoins = bonusCoins + streakRewardCoins
      const totalBonusTickets = (isPerfectSession ? 1 : 0) + (streakReward?.tickets ?? 0)
      if (totalBonusCoins > 0) updateCoins(totalBonusCoins)
      if (totalBonusTickets > 0) updateTickets(totalBonusTickets)

      // Save storage
      setStorage(prev => {
        const newStorage = {
          totalScore: totalScore + sessionScore,
          streak: newStreak,
          unlockedFacts: newUnlocked,
          wtfCoins: getBalances().coins,
          wtfDuJourDate: newWtfDuJourDate,
          sessionsToday: explorerSessionsToday,
          tickets: getBalances().tickets,
          wtfDuJourFait: newWtfDuJourDate === TODAY(),
        }
        saveStorage(newStorage)
        if (user) {
          for (const fact of toSync) updateCollection(user.id, fact.category, fact.id)
          syncAfterAction(user.id)
        }
        return newStorage
      })

      // WTF du Jour unlock
      if (sessionType === 'wtf_du_jour' && effectiveDailyFact && !newUnlocked.has(effectiveDailyFact.id)) {
        newUnlocked.add(effectiveDailyFact.id)
        setStorage(prev => {
          const updated = { ...prev, unlockedFacts: newUnlocked }
          saveStorage(updated)
          return updated
        })
        if (user) updateCollection(user.id, effectiveDailyFact.category, effectiveDailyFact.id)
      }
    }

    // Stats par mode
    try {
      const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      if (!wtfData.statsByMode) wtfData.statsByMode = {}
      if (!wtfData.statsByMode[sessionType]) {
        wtfData.statsByMode[sessionType] = { gamesPlayed: 0, totalCorrect: 0, totalAnswered: 0, bestStreak: 0 }
      }
      const ms = wtfData.statsByMode[sessionType]
      ms.gamesPlayed += 1
      ms.totalCorrect += correctCount + (isCorrect ? 1 : 0)
      ms.totalAnswered += sessionFacts.length
      const currentStreak = wtfData.streak || 0
      if (currentStreak > ms.bestStreak) ms.bestStreak = currentStreak
      wtfData.gamesPlayed = (wtfData.gamesPlayed || 0) + 1
      if (sessionType === 'parcours') wtfData.questsPlayed = (wtfData.questsPlayed || 0) + 1
      wtfData.totalCorrect = (wtfData.totalCorrect || 0) + correctCount + (isCorrect ? 1 : 0)
      wtfData.totalAnswered = (wtfData.totalAnswered || 0) + sessionFacts.length
      wtfData.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(wtfData))
      window.dispatchEvent(new Event('wtf_storage_sync'))
    } catch {}

    updateTrophyData()
    const newBadges = checkBadges()
    if (newBadges.length > 0) setTrophyQueue(newBadges)

    // Route to end screen
    if (sessionType === 'wtf_du_jour') {
      setScreen(SCREENS.WTF_REVEAL)
    } else if (sessionType === 'explorer') {
      setScreen(SCREENS.EXPLORER_RESULTS)
    } else {
      setScreen(SCREENS.RESULTS)
    }
    } catch (err) { console.error('[handleNext] CRASH:', err); setScreen(SCREENS.RESULTS) }
  }, [gameMode, currentIndex, sessionFacts.length, sessionScore, totalScore, streak, sessionsToday,
      isQuickPlay, sessionCorrectFacts, unlockedFacts, user, sessionType, wtfCoins, wtfDuJourDate,
      effectiveDailyFact, correctCount, isCorrect, sessionAnyHintUsed, selectedAnswer,
      numPlayers, selectedDifficulty, selectedCategory])

  return handleNext
}
