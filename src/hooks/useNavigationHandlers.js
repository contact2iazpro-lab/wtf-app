/**
 * useNavigationHandlers — Handlers de navigation, duel, replay, share.
 *
 * Extrait de App.jsx : launchModeDestination, handleLaunchStart,
 * showOrSkipLaunch, handleHomeNavigate, handleDuel*, handleHome,
 * handleReplay, handleShare, etc.
 */

import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { DIFFICULTY_LEVELS, SCREENS } from '../constants/gameConfig'
import { getAnswerOptions } from '../utils/answers'
import { getSnackEnergy } from '../services/energyService'
import { saveStorage, loadStorage } from '../utils/storageHelper'
import { syncAfterAction } from '../services/playerSyncService'

export function useNavigationHandlers({
  // State
  launchMode, currentFact, effectiveDailyFact, sessionType, selectedCategory,
  selectedDifficulty,
  snackPool, unlockedFacts, user, sessionCorrectFacts,
  // Hooks extraits
  handleStartFlashSession, handleSnack, handleSelectDifficulty,
  handleSelectCategory, handleBlitzStart, initSessionState,
  // Setters
  setScreen, setLaunchMode, setGameMode, setSessionType, setSelectedDifficulty,
  setSelectedCategory, setSessionFacts, setCurrentIndex, setSessionScore,
  setCorrectCount, setIsQuickPlay,
  setBlitzFacts, setBlitzResults, setSnackPool,
  setHintsUsed, setSelectedAnswer, setIsCorrect, setPointsEarned,
  setShowNoEnergyModal, setNoEnergyOrigin, setShowHowToPlay, setGameAlert,
  setStorage,
  // DuelContext cleanup
  clearPendingDuel,
  // Phase A — unlock_fact RPC atomique
  unlockFact,
}) {
  const navigate = useNavigate()
  const canPlaySnackCheck = () => getSnackEnergy().remaining > 0

  // ── Launch mode ────────────────────────────────────────────────────────
  const launchModeDestination = useCallback((mode) => {
    switch (mode) {
      case 'blitz':        setScreen(SCREENS.BLITZ_LOBBY); break
      case 'snack':        setScreen(SCREENS.CATEGORY); break  // Snack = choix catégorie
      case 'flash':        handleStartFlashSession(); break
      case 'vrai_ou_fou':  setScreen(SCREENS.VRAI_OU_FOU); break
      default: break
    }
  }, [handleStartFlashSession])

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
      case 'wtfWeekly':
      case 'flash':
        setScreen(SCREENS.FLASH)
        break
      case 'categoryFlash':
      case 'snack': {
        const isDevOrTest = localStorage.getItem('wtf_dev_mode') === 'true' || localStorage.getItem('wtf_test_mode') === 'true'
        if (!isDevOrTest && !canPlaySnackCheck()) { setNoEnergyOrigin('snack'); setShowNoEnergyModal(true); break }
        setGameMode('snack'); setSessionType('snack'); setSelectedDifficulty(DIFFICULTY_LEVELS.SNACK); setSelectedCategory(null)
        showOrSkipLaunch('snack')
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
      case 'quest':
        setScreen(SCREENS.QUEST)
        break
      case 'no_limit':
        setScreen(SCREENS.NO_LIMIT)
        break
      case 'vrai_ou_fou':
        showOrSkipLaunch('vrai_ou_fou')
        break
      default: break
    }
  }, [handleSnack, handleStartFlashSession, showOrSkipLaunch, handleSelectDifficulty, navigate, launchModeDestination])

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
        for (const fact of toSync) {
          unlockFact?.(fact.id, fact.category, 'save_temp_facts').catch(e =>
            console.warn('[useNavigationHandlers] unlockFact RPC failed:', e?.message || e)
          )
        }
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
    setIsQuickPlay(false)
    setSessionType('parcours'); setBlitzFacts([]); setBlitzResults(null)
    setLaunchMode(null); setSnackPool([])
    // Cleanup pending duel si l'user abandonne le flow
    clearPendingDuel?.()
  }, [clearPendingDuel])

  const handleBlitzReplay = useCallback(() => {
    handleBlitzStart(selectedCategory)
  }, [selectedCategory, handleBlitzStart])

  const handleSnackContinue = useCallback(() => {
    const filteredPool = snackPool.filter(f => !unlockedFacts.has(f.id))
    if (filteredPool.length === 0) {
      setGameAlert({ emoji: '🎉', title: 'Catégorie terminée !', message: 'Tu as répondu à toutes les questions de cette catégorie !' })
      return
    }
    const difficulty = DIFFICULTY_LEVELS.SNACK
    const next5 = filteredPool.slice(0, 5).map(fact => ({ ...fact, ...getAnswerOptions(fact, difficulty) }))
    setSnackPool(filteredPool.slice(5))
    setSelectedDifficulty(difficulty)
    setSessionType('snack')
    initSessionState(next5)
    setScreen(SCREENS.QUESTION)
  }, [snackPool, unlockedFacts, initSessionState])

  const handleReplay = useCallback(() => {
    if (sessionType === 'snack') { setSnackPool([]); setScreen(SCREENS.CATEGORY) }
    else handleSelectCategory(selectedCategory)
  }, [sessionType, selectedCategory, handleSelectCategory])

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
    handleSaveTempFacts, completeOnboardingIfNeeded,
    handleHome, handleBlitzReplay, handleSnackContinue, handleReplay,
    handleShare, handleShareDailyFact, handleShowRules,
  }
}
