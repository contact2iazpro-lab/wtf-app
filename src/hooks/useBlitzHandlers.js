/**
 * useBlitzHandlers — Handlers du mode Blitz extraits de App.jsx.
 */

import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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
  setNewlyEarnedBadges,
  // A.9.3 — persistance flags via RPC merge_player_flags
  mergeFlags,
  // B4.2 — source de vérité unique pour devises (tickets/coins/hints)
  applyCurrencyDelta,
  // DuelContext — pendingDuel lu en mémoire React
  pendingDuel, clearPendingDuel,
  // DuelContext — résultat création async (remplace localStorage wtf_auto_challenge)
  setLastCreatedDuel, setLastCreatedDuelError,
}) {
  const navigate = useNavigate()

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

        // Timeout de sécurité : si rien n'a répondu en 15s, on sort de "Création en cours…"
        // TODO Palier 3 — retirer ce safety net quand la RPC atomique create_duel_challenge sera en place.
        let settled = false
        const safetyTimeout = setTimeout(() => {
          if (settled) return
          settled = true
          console.error('[useBlitzHandlers] create challenge timeout 15s')
          setLastCreatedDuelError?.('Création du défi trop longue — réessaie.')
        }, 15000)

        const safeResolve = (round) => {
          if (settled) return
          settled = true
          clearTimeout(safetyTimeout)
          setLastCreatedDuel?.(round)
        }
        const safeReject = (msg) => {
          if (settled) return
          settled = true
          clearTimeout(safetyTimeout)
          setLastCreatedDuelError?.(msg)
        }

        import('../data/duelService')
          .then(async ({ getOrCreateDuel, createDuelRound }) => {
            try {
              let duelId = null
              if (opponentId) {
                // Race contre un timeout 5s : si la table `duels` hang (RLS, lock),
                // on continue avec duelId=null — challenges.duel_id est nullable.
                const duelPromise = getOrCreateDuel(user.id, opponentId)
                const duelTimeout = new Promise((resolve) => setTimeout(() => resolve('__TIMEOUT__'), 5000))
                const duel = await Promise.race([duelPromise, duelTimeout])
                if (duel === '__TIMEOUT__') {
                  console.warn('[useBlitzHandlers] getOrCreateDuel timeout 5s — fallback duelId=null')
                } else {
                  duelId = duel?.id || null
                }
              }
              // Race 8s sur createDuelRound aussi — Supabase peut hang
              // (websocket wedge, token expiré). Si timeout, on throw explicite.
              const roundPromise = createDuelRound({
                duelId,
                categoryId: selectedCategory || 'all',
                categoryLabel: challengeData.categoryLabel,
                questionCount: totalAnswered,
                player1Time: finalTime,
                player1Id: user.id,
                player1Name: user.user_metadata?.name || 'Joueur WTF!',
                opponentId,
              })
              const roundTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('createDuelRound timeout 8s')), 8000))
              const round = await Promise.race([roundPromise, roundTimeout])
              // Publier IMMÉDIATEMENT le round (UX : "Défi créé !" affiché direct).
              // Le débit du ticket passe en fire-and-forget derrière — s'il fail,
              // on le log mais l'affichage du code n'est jamais bloqué.
              safeResolve(round)
              Promise.resolve(applyCurrencyDelta?.({ tickets: -1 }, 'challenge_create'))
                .catch((e) => console.warn('[useBlitzHandlers] debit ticket failed:', e?.message || e))
            } catch (e) {
              console.error('[useBlitzHandlers] create duel round failed:', e)
              safeReject(e?.message || 'Erreur inconnue')
            }
          })
          .catch((e) => {
            console.error('[useBlitzHandlers] duelService import failed:', e)
            safeReject('Impossible de charger le service défi')
          })
      }
      // isChallengeMode est dérivé de pendingDuel — on ne le touche pas ici.
      // Tant que pendingDuel reste en place, BlitzResultsScreen affiche la vue
      // "Création du défi..." / "Défi créé !". Le clear se fait à l'unmount.
      return
    }

    setBlitzResults({ finalTime, correctCount, totalAnswered, penalties, bestTime, isNewRecord })
    setScreen(SCREENS.BLITZ_RESULTS)
  }, [user, isChallengeMode, selectedCategory, pendingDuel, applyCurrencyDelta, setLastCreatedDuel, setLastCreatedDuelError, clearPendingDuel, mergeFlags])

  return { handleBlitzStart, handleBlitzFinish }
}
