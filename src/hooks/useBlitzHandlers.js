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
import { saveBlitzRecord } from '../data/blitzRecordService'

const BLITZ_RUSH_MIN_UNLOCKED = 5 // minimum pour lancer Rush
const BLITZ_RUSH_POOL_SIZE = 150  // marge confortable pour 60s

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

  const handleBlitzStart = useCallback((categoryId, questionCount, variant = 'rush') => {
    audio.play('click')
    const isSpeedrun = variant === 'speedrun'

    let pool = getBlitzFacts()
    if (isSpeedrun) {
      // Speedrun : catégorie obligatoire + doit être 100% complétée côté joueur
      // (la gate est déjà vérifiée dans BlitzLobbyScreen, ici on protège juste).
      if (!categoryId) {
        setGameAlert({ emoji: '🔒', title: 'Catégorie requise', message: 'Le Speedrun se joue uniquement sur une catégorie complète.' })
        return
      }
      pool = pool.filter(f => f.category === categoryId)
      if (pool.length < questionCount) {
        setGameAlert({ emoji: '🔒', title: 'Pas assez de f*cts', message: `Il te faut ${questionCount} f*cts débloqués dans cette catégorie.` })
        return
      }
    } else {
      // Rush : pool = tous les f*cts débloqués (Funny + VIP), min RUSH_MIN
      if (pool.length < BLITZ_RUSH_MIN_UNLOCKED) {
        setGameAlert({
          emoji: '🔓',
          title: 'Blitz Rush verrouillé',
          message: `Débloque au moins ${BLITZ_RUSH_MIN_UNLOCKED} f*cts pour jouer en Blitz Rush.`,
        })
        return
      }
    }

    const count = isSpeedrun
      ? questionCount
      : Math.min(BLITZ_RUSH_POOL_SIZE, pool.length)
    const shuffled = shuffle(pool)
      .slice(0, count)
      .map(fact => ({ ...fact, ...getAnswerOptions(fact, DIFFICULTY_LEVELS.BLITZ) }))

    setSessionType('blitz')
    setGameMode('blitz')
    setSelectedCategory(isSpeedrun ? categoryId : null)
    setSelectedDifficulty(DIFFICULTY_LEVELS.BLITZ)
    setBlitzVariant?.(variant)
    setBlitzFacts(shuffled)
    setBlitzResults(null)
    setScreen(SCREENS.BLITZ)
  }, [setBlitzVariant])

  const handleBlitzFinish = useCallback((results) => {
    const { finalTime, correctCount, totalAnswered, variant = 'defi', sessionAnswers = [] } = results

    // ─── BRANCHE MULTI prioritaire (19/04/2026) ──────────────────────────────
    // Un défi Multi (mode=create ou accept) peut avoir variant='rush' ou
    // 'speedrun'. Il faut le détecter AVANT les branches solo rush/speedrun
    // pour ne pas déclencher saveBlitzRecord + return prématuré.

    // Mode ACCEPT : l'utilisateur vient de finir un défi reçu → RPC atomique
    // complete_duel_round (debit 100c accepteur + update + credit 150c ou refund)
    if (pendingDuel?.mode === 'accept' && pendingDuel.roundId && user) {
      const roundId = pendingDuel.roundId
      const code = pendingDuel.code
      clearPendingDuel?.()
      import('../data/duelService').then(async ({ completeDuelRound }) => {
        try {
          await completeDuelRound({
            roundId,
            playerTime: finalTime,
            playerCorrect: correctCount,
            playerId: user.id,
            playerName: user.user_metadata?.name || 'Joueur WTF!',
          })
          if (code) navigate(`/challenge/${code}`)
        } catch (e) {
          console.error('Duel round complete error:', e?.message || e)
          setGameAlert({ emoji: '⚠️', title: 'Erreur', message: 'Impossible de finaliser le défi : ' + (e?.message || 'erreur serveur') })
        }
      })
      return
    }

    // Mode CREATE : l'utilisateur vient de jouer son tour d'un défi qu'il
    // initie → RPC create_duel_challenge (debit 100c + insert challenge)
    if (isChallengeMode && user) {
      const challengeData = {
        finalTime, correctCount, totalAnswered,
        categoryId: selectedCategory,
        categoryLabel: selectedCategory ? (getCategoryById(selectedCategory)?.label || selectedCategory) : 'Toutes catégories',
        questionCount: totalAnswered,
      }
      setBlitzResults(challengeData)
      setScreen(SCREENS.BLITZ_RESULTS)

      const opponentId = pendingDuel?.mode === 'create' ? pendingDuel.opponentId : null
      const duelVariant = pendingDuel?.variant === 'speedrun' ? 'speedrun' : 'rush'
      // Débit 100c fait ATOMIQUEMENT côté RPC create_duel_challenge. Pas de
      // applyCurrencyDelta client en amont (sinon double-débit 200c).
      import('../data/duelService')
        .then(({ createDuelChallenge }) => createDuelChallenge({
          opponentId,
          categoryId: selectedCategory || 'all',
          categoryLabel: challengeData.categoryLabel,
          questionCount: totalAnswered,
          player1Time: finalTime,
          player1Correct: correctCount,
          player1Name: user.user_metadata?.name || 'Joueur WTF!',
          variant: duelVariant,
        }))
        .then((result) => {
          const round = {
            id: result.challenge_id,
            code: result.code,
            duel_id: result.duel_id,
            category_id: selectedCategory || 'all',
            category_label: challengeData.categoryLabel,
            question_count: totalAnswered,
            variant: duelVariant,
            player1_id: user.id,
            player1_name: user.user_metadata?.name || 'Joueur WTF!',
            player1_time: finalTime,
            player1_correct: correctCount,
            player2_id: opponentId || null,
            status: 'pending',
          }
          setLastCreatedDuel?.(round)
          // Notifier le miroir coins (RPC a débité 100c)
          window.dispatchEvent(new CustomEvent('wtf_currency_updated'))
        })
        .catch((e) => {
          console.error('[useBlitzHandlers] create_duel_challenge failed:', e?.message || e)
          const msg = e?.message?.includes('Insufficient')
            ? 'Pas assez de coins.'
            : e?.message || 'Erreur lors de la création du défi'
          setLastCreatedDuelError?.(msg)
        })
      return
    }

    // ─── Branche RUSH (ex-solo) : record = nombre de bonnes réponses en 60s ───
    if (variant === 'rush' || variant === 'solo') { // 'solo' gardé en fallback legacy
      const prevBest = readWtfData().blitzSoloBestScore || 0
      const isNewRecord = correctCount > prevBest
      if (isNewRecord) {
        updateWtfData(wd => { wd.blitzSoloBestScore = correctCount })
        // Cross-device : push dans profiles.flags
        mergeFlags?.({ blitzSoloBestScore: correctCount }).catch(e =>
          console.warn('[useBlitzHandlers] rush mergeFlags failed:', e?.message || e)
        )
      }
      // Historise la run dans blitz_records (chaque partie = 1 insert)
      if (user?.id) {
        saveBlitzRecord({
          userId: user.id, variant: 'rush',
          categoryId: null, palier: null,
          score: correctCount, timeSeconds: null,
        })
      }
      const bestScore = Math.max(prevBest, correctCount)
      setBlitzResults({
        variant: 'rush',
        correctCount,
        totalAnswered,
        finalTime: finalTime || 60,
        bestScore,
        isNewRecord,
        sessionAnswers,
      })
      setScreen(SCREENS.BLITZ_RESULTS)
      return
    }

    // ─── Branche SPEEDRUN : record = temps final par (cat, palier) ───────
    if (variant === 'speedrun') {
      const palier = totalAnswered // le palier est égal au nb questions répondues
      const catKey = selectedCategory || 'all'
      const recordKey = `${catKey}_${palier}`
      const wd = readWtfData()
      const prevRecord = wd.speedrunRecords?.[recordKey] || null
      const isNewRecord = !prevRecord || finalTime < prevRecord
      if (isNewRecord) {
        updateWtfData(w => {
          w.speedrunRecords = { ...(w.speedrunRecords || {}), [recordKey]: finalTime }
        })
      }
      // Push vers Supabase pour cross-device
      const refreshed = readWtfData()
      mergeFlags?.({ speedrunRecords: refreshed.speedrunRecords }).catch(e =>
        console.warn('[useBlitzHandlers] speedrun mergeFlags failed:', e?.message || e)
      )
      // Historise la run dans blitz_records
      if (user?.id) {
        saveBlitzRecord({
          userId: user.id, variant: 'speedrun',
          categoryId: selectedCategory, palier,
          score: correctCount, timeSeconds: finalTime,
        })
      }
      setBlitzResults({
        variant: 'speedrun',
        correctCount,
        totalAnswered,
        finalTime,
        bestTime: isNewRecord ? finalTime : prevRecord,
        isNewRecord,
        categoryId: selectedCategory,
        palier,
        sessionAnswers,
      })
      setScreen(SCREENS.BLITZ_RESULTS)
      return
    }

    // Défi : format best-score (nb bonnes). "isNewRecord" = nouveau meilleur score
    // par catégorie, remplace l'ancien record basé sur le temps final.
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
      // Record = nb max de bonnes réponses en Défi (legacy: bestBlitzTime gardé
      // pour compat, mais = nb bonnes max maintenant, pas un temps)
      if (!wtfData.bestBlitzScore || correctCount > wtfData.bestBlitzScore) {
        wtfData.bestBlitzScore = correctCount
        isNewRecord = true
      }
      bestTime = wtfData.bestBlitzScore // réutilisé pour l'UI results
      if (!wtfData.blitzRecords) wtfData.blitzRecords = {}
      const catKey = selectedCategory || 'all'
      const palierKey = `${catKey}_defi`
      const existingRecord = wtfData.blitzRecords[palierKey] || 0
      if (correctCount > existingRecord) {
        wtfData.blitzRecords[palierKey] = correctCount
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
        bestBlitzScore: refreshed.bestBlitzScore,
        statsByMode: refreshed.statsByMode,
        gamesPlayed: refreshed.gamesPlayed,
        totalCorrect: refreshed.totalCorrect,
        totalAnswered: refreshed.totalAnswered,
        blitzPerfects: refreshed.blitzPerfects,
        badgesEarned: refreshed.badgesEarned || [],
      }).catch(e => console.warn('[useBlitzHandlers] session end mergeFlags failed:', e?.message || e))
    } catch {}

    setBlitzResults({ finalTime, correctCount, totalAnswered, bestTime, isNewRecord })
    setScreen(SCREENS.BLITZ_RESULTS)
  }, [user, isChallengeMode, selectedCategory, pendingDuel, setLastCreatedDuel, setLastCreatedDuelError, clearPendingDuel, mergeFlags, applyCurrencyDelta])

  return { handleBlitzStart, handleBlitzFinish }
}
