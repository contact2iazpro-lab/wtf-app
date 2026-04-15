/**
 * useBlitzHandlers — Handlers du mode Blitz extraits de App.jsx.
 */

import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { DIFFICULTY_LEVELS, SCREENS } from '../constants/gameConfig'
import { getBlitzFacts, getCategoryById } from '../data/factsService'
import { getAnswerOptions } from '../utils/answers'
import { shuffle } from '../utils/shuffle'
import { updateTrophyData, updateWtfData, readWtfData } from '../utils/storageHelper'
import { checkBadges } from '../utils/badgeManager'
import { audio } from '../utils/audio'

const BLITZ_SOLO_MIN_UNLOCKED = 20
const BLITZ_SOLO_POOL_SIZE = 150 // marge confortable pour 60s

export function useBlitzHandlers({
  user, selectedCategory, isChallengeMode,
  setGameAlert, setSessionType, setGameMode, setSelectedCategory,
  setSelectedDifficulty, setBlitzFacts, setBlitzResults, setScreen,
  setBlitzVariant,
  setNewlyEarnedBadges,
  // A.9.3 — persistance flags via RPC merge_player_flags
  mergeFlags,
  // Débit 200 coins pour créer un défi Blitz
  applyCurrencyDelta,
  // DuelContext — pendingDuel lu en mémoire React
  pendingDuel, clearPendingDuel,
  // DuelContext — résultat création async (remplace localStorage wtf_auto_challenge)
  setLastCreatedDuel, setLastCreatedDuelError,
}) {
  const navigate = useNavigate()

  const handleBlitzStart = useCallback((categoryId, questionCount, variant = 'defi') => {
    audio.play('click')
    const isSolo = variant === 'solo'

    let pool = getBlitzFacts()
    if (isSolo) {
      // Solo : pool = tous les f*cts débloqués (Funny + VIP), min 20
      if (pool.length < BLITZ_SOLO_MIN_UNLOCKED) {
        setGameAlert({
          emoji: '🔓',
          title: 'Blitz Solo verrouillé',
          message: `Débloque au moins ${BLITZ_SOLO_MIN_UNLOCKED} f*cts (Snack, Quest, Flash) pour jouer en Blitz Solo.`,
        })
        return
      }
    } else {
      if (categoryId) pool = pool.filter(f => f.category === categoryId)
      if (pool.length < 5) {
        setGameAlert({ emoji: '🔓', title: 'Pas assez de f*cts', message: 'Joue en mode Snack ou Quest pour débloquer plus de f*cts avant de jouer en Blitz !' })
        return
      }
    }

    const count = isSolo
      ? Math.min(BLITZ_SOLO_POOL_SIZE, pool.length)
      : (questionCount || pool.length)
    const shuffled = shuffle(pool)
      .slice(0, count)
      .map(fact => ({ ...fact, ...getAnswerOptions(fact, DIFFICULTY_LEVELS.BLITZ) }))

    setSessionType('blitz')
    setGameMode('blitz')
    setSelectedCategory(isSolo ? null : categoryId)
    setSelectedDifficulty(DIFFICULTY_LEVELS.BLITZ)
    setBlitzVariant?.(variant)
    setBlitzFacts(shuffled)
    setBlitzResults(null)
    setScreen(SCREENS.BLITZ)
  }, [setBlitzVariant])

  const handleBlitzFinish = useCallback((results) => {
    const { finalTime, correctCount, totalAnswered, penalties, variant = 'defi' } = results

    // ─── Branche SOLO : record = nombre de bonnes réponses en 60s ───
    if (variant === 'solo') {
      const prevBest = readWtfData().blitzSoloBestScore || 0
      const isNewRecord = correctCount > prevBest
      if (isNewRecord) {
        updateWtfData(wd => { wd.blitzSoloBestScore = correctCount })
      }
      const bestScore = Math.max(prevBest, correctCount)
      setBlitzResults({
        variant: 'solo',
        correctCount,
        totalAnswered: correctCount,
        finalTime: finalTime || 60,
        bestScore,
        isNewRecord,
      })
      setScreen(SCREENS.BLITZ_RESULTS)
      return
    }

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

      // Trophées calculés AVANT le push pour que badgesEarned soit dans la même RPC
      updateTrophyData()
      const newBadges = checkBadges()
      if (newBadges.length > 0) setNewlyEarnedBadges(newBadges)
      const refreshed = JSON.parse(localStorage.getItem('wtf_data') || '{}')

      // A.9.3/A.9.6 — 1 seule RPC atomique : blitzRecords + stats + totaux + badges
      mergeFlags?.({
        blitzRecords: refreshed.blitzRecords,
        bestBlitzTime: refreshed.bestBlitzTime,
        statsByMode: refreshed.statsByMode,
        gamesPlayed: refreshed.gamesPlayed,
        totalCorrect: refreshed.totalCorrect,
        totalAnswered: refreshed.totalAnswered,
        blitzPerfects: refreshed.blitzPerfects,
        badgesEarned: refreshed.badgesEarned || [],
      }).catch(e => console.warn('[useBlitzHandlers] session end mergeFlags failed:', e?.message || e))
    } catch {}

    // Complete duel round si l'user vient d'accepter un défi (mode accept)
    if (pendingDuel?.mode === 'accept' && pendingDuel.roundId && user) {
      const roundId = pendingDuel.roundId
      const code = pendingDuel.code
      clearPendingDuel?.()
      import('../data/duelService').then(async ({ completeDuelRound }) => {
        try {
          await completeDuelRound({
            roundId,
            playerTime: finalTime,
            playerId: user.id,
            playerName: user.user_metadata?.name || 'Joueur WTF!',
          })
          // Redirection auto vers ChallengeScreen pour voir la comparaison
          if (code) navigate(`/challenge/${code}`)
        } catch (e) {
          console.error('Duel round complete error:', e?.message || e)
          setGameAlert({ emoji: '⚠️', title: 'Erreur', message: 'Impossible de finaliser le défi : ' + (e?.message || 'erreur serveur') })
        }
      })
      return
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
        const opponentId = pendingDuel?.mode === 'create' ? pendingDuel.opponentId : null
        // RPC atomique : 1 seul round-trip serveur, debit 200 coins + upsert
        // duel + insert challenge en 1 txn. Plus besoin de timeout/race/fire-forget.
        applyCurrencyDelta?.({ coins: -200 }, 'challenge_create')?.catch?.(e =>
          console.warn('[useBlitzHandlers] challenge cost RPC failed:', e?.message || e)
        )
        import('../data/duelService')
          .then(({ createDuelChallenge }) => createDuelChallenge({
            opponentId,
            categoryId: selectedCategory || 'all',
            categoryLabel: challengeData.categoryLabel,
            questionCount: totalAnswered,
            player1Time: finalTime,
            player1Name: user.user_metadata?.name || 'Joueur WTF!',
          }))
          .then((result) => {
            // Le RPC renvoie { challenge_id, code, duel_id, ... }.
            // On synthétise un "round" compatible avec l'ancien format pour BlitzResultsScreen.
            const round = {
              id: result.challenge_id,
              code: result.code,
              duel_id: result.duel_id,
              category_id: selectedCategory || 'all',
              category_label: challengeData.categoryLabel,
              question_count: totalAnswered,
              player1_id: user.id,
              player1_name: user.user_metadata?.name || 'Joueur WTF!',
              player1_time: finalTime,
              player2_id: opponentId || null,
              status: 'pending',
            }
            setLastCreatedDuel?.(round)
            // Notifier l'UI du débit des 200 coins
            window.dispatchEvent(new CustomEvent('wtf_currency_updated'))
          })
          .catch((e) => {
            console.error('[useBlitzHandlers] create_duel_challenge failed:', e?.message || e)
            const msg = e?.message?.includes('Insufficient')
              ? 'Pas assez de coins.'
              : e?.message || 'Erreur lors de la création du défi'
            setLastCreatedDuelError?.(msg)
          })
      }
      // isChallengeMode est dérivé de pendingDuel — on ne le touche pas ici.
      // Tant que pendingDuel reste en place, BlitzResultsScreen affiche la vue
      // "Création du défi..." / "Défi créé !". Le clear se fait à l'unmount.
      return
    }

    setBlitzResults({ finalTime, correctCount, totalAnswered, penalties, bestTime, isNewRecord })
    setScreen(SCREENS.BLITZ_RESULTS)
  }, [user, isChallengeMode, selectedCategory, pendingDuel, setLastCreatedDuel, setLastCreatedDuelError, clearPendingDuel, mergeFlags, applyCurrencyDelta])

  return { handleBlitzStart, handleBlitzFinish }
}
