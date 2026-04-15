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
import { syncAfterAction } from '../services/playerSyncService'
import { checkBadges } from '../utils/badgeManager'

export function useHandleNext({
  // State lectures
  currentIndex, sessionFacts, sessionScore,
  isQuickPlay, sessionCorrectFacts, sessionType, effectiveDailyFact,
  correctCount, isCorrect, sessionAnyHintUsed, selectedAnswer,
  selectedDifficulty, selectedCategory, user,
  // State lecture storage
  totalScore, streak, unlockedFacts, wtfDuJourDate, sessionsToday, wtfCoins,
  // Setters
  setScreen, setCurrentIndex, setHintsUsed, setSelectedAnswer, setIsCorrect,
  setPointsEarned, setStorage, setCoinsEarnedLastSession,
  setSessionIsPerfect, setCompletedLevels, setNewlyUnlockedCategories,
  setShowNewCategoriesModal, setShowStreakSpecialModal, setStreakRewardToast,
  setTrophyQueue,
  // Phase A.6 — miroir Supabase
  applyCurrencyDelta,
  // Phase A.9 — flags persistés
  mergeFlags,
  // Phase A — unlockedFacts via RPC atomique
  unlockFact,
}) {

  const handleNext = useCallback(() => {
    try {
    const nextIndex = currentIndex + 1

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

      // Bonus coins — CLAUDE.md 15/04/2026 économie ×10
      // Snack : perfect 5/5 = +50c · Flash lun-sam = 30c fixe (dim = VIP, géré ailleurs)
      // Quest/No Limit/VraiOuFou/Blitz : pas de bonus perfect (0)
      let bonusCoins = 0
      if (sessionType === 'flash') {
        // Flash lun-sam : 30 coins fixe (sessionScore = 0 car FLASH.coinsPerCorrect = 0)
        bonusCoins = 30
      } else if (sessionType === 'snack') {
        const finalCorrect = correctCount + (isCorrect ? 1 : 0)
        const isPerfectSnack = finalCorrect === sessionFacts.length && !sessionAnyHintUsed && (selectedAnswer !== -1)
        bonusCoins = isPerfectSnack ? 50 : 0
      }
      // quest / no_limit / vrai_ou_fou / blitz : 0 bonus (gains directs via coinsPerCorrect)
      setCoinsEarnedLastSession(sessionScore + bonusCoins)

      // Streak rewards
      const streakReward = isFirstSessionToday ? getStreakReward(newStreak) : null
      if (streakReward) {
        if (streakReward.badge) localStorage.setItem(`wtf_badge_streak_${newStreak}`, 'true')
        if (streakReward.special === 'wtf_premium') {
          setShowStreakSpecialModal(true)
        } else {
          // Streak toast désactivé sur ResultsScreen — sera réintégré dans le flow global
          // setStreakRewardToast({ days: newStreak, reward: streakReward })
        }
      }

      const streakRewardCoins = streakReward?.coins ?? 0
      const newWtfDuJourDate = sessionType === 'flash' ? TODAY() : wtfDuJourDate
      const explorerSessionsToday = sessionType === 'snack' ? sessionsToday : newSessionsToday

      const totalBonusCoins = bonusCoins + streakRewardCoins
      // Phase A : 1 seule RPC atomique coins+hints via usePlayerProfile
      const sessionEndDelta = {}
      if (totalBonusCoins > 0)                sessionEndDelta.coins   = totalBonusCoins
      if ((streakReward?.hints ?? 0) > 0)     sessionEndDelta.hints   = streakReward.hints
      if (Object.keys(sessionEndDelta).length > 0) {
        applyCurrencyDelta?.(sessionEndDelta, `session_end_${sessionType}`).catch(e =>
          console.warn('[useHandleNext] session end RPC failed:', e?.message || e)
        )
      }

      // Save storage
      setStorage(prev => {
        const localWd = (() => { try { return JSON.parse(localStorage.getItem('wtf_data') || '{}') } catch { return {} } })()
        const newStorage = {
          totalScore: totalScore + sessionScore,
          streak: newStreak,
          unlockedFacts: newUnlocked,
          wtfCoins: localWd.wtfCoins || 0,
          wtfDuJourDate: newWtfDuJourDate,
          sessionsToday: explorerSessionsToday,
          wtfDuJourFait: newWtfDuJourDate === TODAY(),
        }
        saveStorage(newStorage)
        if (user) {
          for (const fact of toSync) {
            unlockFact?.(fact.id, fact.category, `${sessionType}_unlock`).catch(e =>
              console.warn('[useHandleNext] unlockFact RPC failed:', e?.message || e)
            )
          }
          syncAfterAction(user.id)
        }
        return newStorage
      })

      // WTF du Jour unlock
      if (sessionType === 'flash' && effectiveDailyFact && !newUnlocked.has(effectiveDailyFact.id)) {
        newUnlocked.add(effectiveDailyFact.id)
        setStorage(prev => {
          const updated = { ...prev, unlockedFacts: newUnlocked }
          saveStorage(updated)
          return updated
        })
        if (user) {
          unlockFact?.(effectiveDailyFact.id, effectiveDailyFact.category, 'wtf_du_jour_unlock').catch(e =>
            console.warn('[useHandleNext] unlockFact RPC failed:', e?.message || e)
          )
        }
      }
    }

    // Stats par mode + trophées + push Supabase atomique (1 seule RPC)
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

      // Trophées calculés AVANT le push pour que badgesEarned soit dans la même RPC
      updateTrophyData()
      const newBadges = checkBadges()
      if (newBadges.length > 0) setTrophyQueue(newBadges)
      const refreshed = JSON.parse(localStorage.getItem('wtf_data') || '{}')

      // A.9.6 — 1 seule RPC atomique : stats + totaux + badges
      mergeFlags?.({
        statsByMode: refreshed.statsByMode,
        gamesPlayed: refreshed.gamesPlayed,
        questsPlayed: refreshed.questsPlayed,
        totalCorrect: refreshed.totalCorrect,
        totalAnswered: refreshed.totalAnswered,
        badgesEarned: refreshed.badgesEarned || [],
        unlockedCategories: refreshed.unlockedCategories || [],
      }).catch(e => console.warn('[useHandleNext] session end mergeFlags failed:', e?.message || e))
    } catch {}

    // Route to end screen
    if (sessionType === 'flash') {
      setScreen(SCREENS.WTF_REVEAL)
    } else if (sessionType === 'snack') {
      setScreen(SCREENS.RESULTS)
    } else {
      setScreen(SCREENS.RESULTS)
    }
    } catch (err) { console.error('[handleNext] CRASH:', err); setScreen(SCREENS.RESULTS) }
  }, [currentIndex, sessionFacts.length, sessionScore, totalScore, streak, sessionsToday,
      isQuickPlay, sessionCorrectFacts, unlockedFacts, user, sessionType, wtfCoins, wtfDuJourDate,
      effectiveDailyFact, correctCount, isCorrect, sessionAnyHintUsed, selectedAnswer,
      selectedDifficulty, selectedCategory])

  return handleNext
}
