/**
 * useNavigationHandlers — Handlers de navigation, duel, replay, share.
 *
 * Extrait de App.jsx : launchModeDestination, handleLaunchStart,
 * showOrSkipLaunch, handleHomeNavigate, handleDuel*, handleHome,
 * handleReplay, handleShare, etc.
 */

import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { DIFFICULTY_LEVELS, SCREENS, QUESTIONS_PER_GAME } from '../constants/gameConfig'
import { getFactsByCategory } from '../data/factsService'
import { getAnswerOptions } from '../utils/answers'
import { shuffle } from '../utils/shuffle'
import { getFlashEnergy, consumeFlashEnergy } from '../services/energyService'
import { saveStorage, loadStorage } from '../utils/storageHelper'
import { updateCollection } from '../services/collectionService'
import { syncAfterAction } from '../services/playerSyncService'

export function useNavigationHandlers({
  // State
  launchMode, currentFact, effectiveDailyFact, sessionType, selectedCategory,
  selectedDifficulty,
  explorerPool, unlockedFacts, duelPlayers, user, sessionCorrectFacts,
  // Hooks extraits
  handleStartWTFSession, handleFlashSolo, handleSelectDifficulty,
  handleSelectCategory, handleBlitzStart, initSessionState,
  // Setters
  setScreen, setLaunchMode, setGameMode, setSessionType, setSelectedDifficulty,
  setSelectedCategory, setSessionFacts, setCurrentIndex, setSessionScore,
  setCorrectCount, setDuelPlayers, setDuelCurrentPlayerIndex, setIsQuickPlay,
  setBlitzFacts, setBlitzResults, setIsChallengeMode, setExplorerPool,
  setHintsUsed, setSelectedAnswer, setIsCorrect, setPointsEarned,
  setShowNoEnergyModal, setNoEnergyOrigin, setShowHowToPlay, setGameAlert,
  setStorage,
}) {
  const navigate = useNavigate()
  const canPlayFlashCheck = () => getFlashEnergy().remaining > 0

  // ── Launch mode ────────────────────────────────────────────────────────
  const launchModeDestination = useCallback((mode) => {
    switch (mode) {
      case 'quest':    setScreen(SCREENS.DIFFICULTY); break
      case 'blitz':    setScreen(SCREENS.BLITZ_LOBBY); break
      case 'explorer': setScreen(SCREENS.CATEGORY); break
      case 'flash':    handleFlashSolo(); break  // Flash = aléatoire direct, pas de CategoryScreen
      case 'hunt':     handleStartWTFSession(); break
      default: break
    }
  }, [handleStartWTFSession])

  const handleLaunchStart = useCallback(() => {
    launchModeDestination(launchMode)
  }, [launchMode, launchModeDestination])

  const showOrSkipLaunch = useCallback((mode) => {
    setLaunchMode(mode)
    const skip = localStorage.getItem(`skip_launch_${mode}`) === 'true'
    if (skip) launchModeDestination(mode)
    else setScreen(SCREENS.MODE_LAUNCH)
  }, [launchModeDestination])

  // ── Home navigate ──────────────────────────────────────────────────────
  const handleHomeNavigate = useCallback((target) => {
    switch (target) {
      case 'difficulty': {
        setGameMode('solo'); setSessionType('parcours')
        showOrSkipLaunch('quest')
        break
      }
      case 'wtfDuJour':
        showOrSkipLaunch('hunt')
        break
      case 'categoryFlash': {
        const isDevOrTest = localStorage.getItem('wtf_dev_mode') === 'true' || localStorage.getItem('wtf_test_mode') === 'true'
        if (!isDevOrTest && !canPlayFlashCheck()) { setNoEnergyOrigin('flash'); setShowNoEnergyModal(true); break }
        setGameMode('solo'); setSessionType('flash_solo'); setSelectedDifficulty(DIFFICULTY_LEVELS.FLASH); setSelectedCategory(null)
        showOrSkipLaunch('flash')
        break
      }
      case 'explorer': {
        const isDevOrTest2 = localStorage.getItem('wtf_dev_mode') === 'true' || localStorage.getItem('wtf_test_mode') === 'true'
        if (!isDevOrTest2 && !canPlayFlashCheck()) { setNoEnergyOrigin('explorer'); setShowNoEnergyModal(true); break }
        setGameMode('explorer'); setSessionType('explorer')
        const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
        const explorerPlayedInMode = wd.statsByMode?.flash_solo?.gamesPlayed || 0
        if (explorerPlayedInMode === 0) launchModeDestination('explorer')
        else showOrSkipLaunch('explorer')
        break
      }
      case 'collection':    navigate('/collection'); break
      case 'trophees':      navigate('/recompenses'); break
      case 'profil':        navigate('/profil'); break
      case 'boutique':      navigate('/boutique'); break
      case 'amis':          navigate('/social'); break
      case 'streak':        navigate('/recompenses'); break
      case 'blitz':
        setGameMode('blitz'); setSessionType('blitz'); setSelectedDifficulty(DIFFICULTY_LEVELS.BLITZ); setSelectedCategory(null)
        showOrSkipLaunch('blitz')
        break
      case 'puzzle':
        setScreen(SCREENS.PUZZLE_DU_JOUR)
        break
      case 'route':
        setScreen(SCREENS.ROUTE)
        break
      default: break
    }
  }, [handleFlashSolo, handleStartWTFSession, showOrSkipLaunch, handleSelectDifficulty, navigate, launchModeDestination])

  // ── Duel ───────────────────────────────────────────────────────────────
  const handleDuelNextPlayer = useCallback(() => {
    setDuelCurrentPlayerIndex(i => i + 1)
    setHintsUsed(0); setSelectedAnswer(null); setIsCorrect(null); setPointsEarned(0)
    setScreen(SCREENS.DUEL_PASS)
  }, [])

  const handleDuelMode = useCallback(() => {
    setGameMode('duel'); setSessionType('duel'); setScreen(SCREENS.DUEL_SETUP)
  }, [])

  const handleDuelStart = useCallback((playerNames) => {
    const n = playerNames.length
    const allFacts = getFactsByCategory(null)
    const shuffled = shuffle(allFacts).slice(0, QUESTIONS_PER_GAME * n)
    setDuelPlayers(playerNames.map(name => ({ name, score: 0 })))
    setDuelCurrentPlayerIndex(0)
    setGameMode('duel')
    initSessionState(shuffled)
    setScreen(SCREENS.DUEL_PASS)
  }, [initSessionState])

  const handleDuelPassReady = useCallback(() => setScreen(SCREENS.QUESTION), [])
  const handleDuelReplay = useCallback(() => handleDuelStart(duelPlayers.map(p => p.name)), [duelPlayers, handleDuelStart])

  // ── Home / Replay / Share ──────────────────────────────────────────────
  const handleSaveTempFacts = useCallback(() => {
    if (!user || sessionCorrectFacts.length === 0) return
    setStorage(prev => {
      const newUnlocked = new Set(prev.unlockedFacts)
      const toSync = []
      for (const fact of sessionCorrectFacts) {
        if (!newUnlocked.has(fact.id)) { newUnlocked.add(fact.id); toSync.push(fact) }
      }
      const next = { ...prev, unlockedFacts: newUnlocked }
      saveStorage(next)
      if (user) {
        for (const fact of toSync) updateCollection(user.id, fact.category, fact.id)
        syncAfterAction(user.id)
      }
      return next
    })
  }, [user, sessionCorrectFacts])

  // completeOnboardingIfNeeded supprimé — sera dans TutoTunnel
  const completeOnboardingIfNeeded = useCallback(() => {}, [])

  const handleHome = useCallback(() => {
    setScreen(SCREENS.HOME); setGameMode('solo'); setSelectedCategory(null)
    setSessionFacts([]); setCurrentIndex(0); setSessionScore(0); setCorrectCount(0)
    setDuelPlayers([]); setDuelCurrentPlayerIndex(0); setIsQuickPlay(false)
    setSessionType('parcours'); setBlitzFacts([]); setBlitzResults(null)
    setIsChallengeMode(false); setLaunchMode(null); setExplorerPool([])
  }, [])

  const handleBlitzReplay = useCallback(() => {
    handleBlitzStart(selectedCategory)
  }, [selectedCategory, handleBlitzStart])

  const handleExplorerContinue = useCallback(() => {
    const filteredPool = explorerPool.filter(f => !unlockedFacts.has(f.id))
    if (filteredPool.length === 0) {
      setGameAlert({ emoji: '🎉', title: 'Catégorie terminée !', message: 'Tu as répondu à toutes les questions de cette catégorie !' })
      return
    }
    const difficulty = DIFFICULTY_LEVELS.HOT
    const next5 = filteredPool.slice(0, 5).map(fact => ({ ...fact, ...getAnswerOptions(fact, difficulty) }))
    setExplorerPool(filteredPool.slice(5))
    setSessionType('explorer')
    initSessionState(next5)
    setScreen(SCREENS.QUESTION)
  }, [explorerPool, unlockedFacts, initSessionState])

  const handleReplay = useCallback(() => {
    if (sessionType === 'flash_solo') handleFlashSolo()
    else if (sessionType === 'explorer') { setExplorerPool([]); setScreen(SCREENS.CATEGORY) }
    else handleSelectCategory(selectedCategory)
  }, [sessionType, selectedCategory, handleFlashSolo, handleSelectCategory])

  // Rejoue Quest en montant d'un niveau (Cool → Hot uniquement).
  // WTF! retiré de Quest le 2026-04-12 — Hot est le niveau max.
  const handleReplayHarder = useCallback(() => {
    if (sessionType !== 'parcours') return
    const current = selectedDifficulty?.id
    const next = current === 'cool' ? DIFFICULTY_LEVELS.HOT : null
    if (!next) return
    handleSelectDifficulty(next)
  }, [sessionType, selectedDifficulty, handleSelectDifficulty])

  const handleShare = useCallback(() => {
    if (!currentFact) return
    const text = `🤯 WTF! "${currentFact.shortAnswer}" — ${currentFact.question}\nJoue sur What The F*ct! #WTF`
    if (navigator.share) navigator.share({ text }).catch(() => {})
    else navigator.clipboard?.writeText(text).catch(() => {})
  }, [currentFact])

  const handleShareDailyFact = useCallback(() => {
    const text = `🤯 WTF de la Semaine !\n\n"${effectiveDailyFact.shortAnswer}"\n\n${effectiveDailyFact.explanation}\n\nJoue sur What The F*ct! #WTF`
    if (navigator.share) navigator.share({ text }).catch(() => {})
    else navigator.clipboard?.writeText(text).catch(() => {})
  }, [effectiveDailyFact])

  const handleShowRules = useCallback(() => setShowHowToPlay(true), [])

  return {
    launchModeDestination, handleLaunchStart, showOrSkipLaunch,
    handleHomeNavigate,
    handleDuelNextPlayer, handleDuelMode, handleDuelStart, handleDuelPassReady, handleDuelReplay,
    handleSaveTempFacts, completeOnboardingIfNeeded,
    handleHome, handleBlitzReplay, handleExplorerContinue, handleReplay, handleReplayHarder,
    handleShare, handleShareDailyFact, handleShowRules,
  }
}
