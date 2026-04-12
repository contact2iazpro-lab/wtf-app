/**
 * useBlitzHandlers — Handlers du mode Blitz extraits de App.jsx.
 */

import { useCallback } from 'react'
import { DIFFICULTY_LEVELS, SCREENS } from '../constants/gameConfig'
import { getBlitzFacts, getCategoryById } from '../data/factsService'
import { getAnswerOptions } from '../utils/answers'
import { shuffle } from '../utils/shuffle'
import { updateTrophyData } from '../utils/storageHelper'
import { checkBadges } from '../utils/badgeManager'
import { audio } from '../utils/audio'

export function useBlitzHandlers({
  user, selectedCategory, isChallengeMode,
  setGameAlert, setSessionType, setGameMode, setSelectedCategory,
  setSelectedDifficulty, setBlitzFacts, setBlitzResults, setScreen,
  setNewlyEarnedBadges, setIsChallengeMode,
}) {

  const handleBlitzStart = useCallback((categoryId, questionCount) => {
    audio.play('click')
    let pool = getBlitzFacts()
    if (categoryId) pool = pool.filter(f => f.category === categoryId)

    if (pool.length < 5) {
      setGameAlert({ emoji: '🔓', title: 'Pas assez de f*cts', message: 'Joue en mode Flash ou Quest pour débloquer plus de f*cts avant de jouer en Blitz !' })
      return
    }

    const count = questionCount || pool.length
    const shuffled = shuffle(pool)
      .slice(0, count)
      .map(fact => ({ ...fact, ...getAnswerOptions(fact, DIFFICULTY_LEVELS.BLITZ) }))

    setSessionType('blitz')
    setGameMode('blitz')
    setSelectedCategory(categoryId)
    setSelectedDifficulty(DIFFICULTY_LEVELS.BLITZ)
    setBlitzFacts(shuffled)
    setBlitzResults(null)
    setScreen(SCREENS.BLITZ)
  }, [])

  const handleBlitzFinish = useCallback((results) => {
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
    } catch {}

    updateTrophyData()
    const newBadges = checkBadges()
    if (newBadges.length > 0) setNewlyEarnedBadges(newBadges)

    // Complete challenge if active
    const challengeJson = localStorage.getItem('wtf_active_challenge')
    if (challengeJson && user) {
      try {
        const challengeInfo = JSON.parse(challengeJson)
        localStorage.removeItem('wtf_active_challenge')
        import('../data/duelService').then(({ completeDuelRound }) => {
          completeDuelRound({
            roundId: challengeInfo.challengeId,
            playerTime: finalTime,
            playerId: user.id,
            playerName: user.user_metadata?.name || 'Joueur WTF!',
          }).catch(e => console.warn('Duel round complete error:', e))
        })
      } catch {}
    }

    if (isChallengeMode) {
      const challengeData = {
        finalTime, correctCount, totalAnswered, penalties, bestTime, isNewRecord,
        categoryId: selectedCategory,
        categoryLabel: selectedCategory ? (getCategoryById(selectedCategory)?.label || selectedCategory) : 'Toutes catégories',
        questionCount: totalAnswered,
      }
      setBlitzResults(challengeData)
      setScreen(SCREENS.BLITZ_RESULTS)

      if (user) {
        const opponentId = localStorage.getItem('wtf_challenge_opponent') || null
        import('../data/duelService').then(async ({ getOrCreateDuel, createDuelRound }) => {
          try {
            let duelId = null
            if (opponentId) {
              const duel = await getOrCreateDuel(user.id, opponentId)
              duelId = duel?.id || null
            }
            const round = await createDuelRound({
              duelId,
              categoryId: selectedCategory || 'all',
              categoryLabel: challengeData.categoryLabel,
              questionCount: totalAnswered,
              player1Time: finalTime,
              player1Id: user.id,
              player1Name: user.user_metadata?.name || 'Joueur WTF!',
              opponentId,
            })
            localStorage.removeItem('wtf_challenge_opponent')
            localStorage.setItem('wtf_auto_challenge', JSON.stringify(round))
            window.dispatchEvent(new Event('wtf_challenge_created'))
          } catch (e) {
            console.error('[useBlitzHandlers] Auto duel round creation failed:', e)
            localStorage.setItem('wtf_auto_challenge_error', e?.message || 'Erreur inconnue')
            window.dispatchEvent(new Event('wtf_challenge_created'))
          }
        })
      }
      // Ne PAS reset isChallengeMode ici — on garde le flag true pour que
      // BlitzResultsScreen affiche la vue "Création du défi..." / "Défi créé!".
      // Le reset se fait quand l'user clique "Accueil" via handleHome.
      return
    }

    setBlitzResults({ finalTime, correctCount, totalAnswered, penalties, bestTime, isNewRecord })
    setScreen(SCREENS.BLITZ_RESULTS)
  }, [user, isChallengeMode, selectedCategory])

  return { handleBlitzStart, handleBlitzFinish }
}
