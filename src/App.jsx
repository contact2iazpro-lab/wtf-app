import { useState, useEffect } from 'react'
import { useScale } from './hooks/useScale'
import { useNavigate } from 'react-router-dom'
import { DIFFICULTY_LEVELS, SCREENS, MODE_CONFIGS } from './constants/gameConfig'
import { getDailyFact, initFacts, resetFacts } from './data/factsService'
import { loadStorage, saveStorage } from './utils/storageHelper'
import { getFlashEnergy } from './services/energyService'
import { useAuth } from './context/AuthContext'
import AppModals from './components/AppModals'
import ScreenRenderer from './components/ScreenRenderer'
import DesktopDecor from './components/DesktopDecor'
import SplashScreen from './screens/SplashScreen'
import FalkonIntroScreen from './screens/FalkonIntroScreen'
// Hooks
import { useGameHandlers } from './hooks/useGameHandlers'
import { usePlayerProfile } from './hooks/usePlayerProfile'
import { useDuelContext } from './features/duels/context/DuelContext'
import { useHandleNext } from './hooks/useHandleNext'
import { useBlitzHandlers } from './hooks/useBlitzHandlers'
import { useModeStarters } from './hooks/useModeStarters'
import { useSelectionHandlers } from './hooks/useSelectionHandlers'
import { useNavigationHandlers } from './hooks/useNavigationHandlers'
import { useAppEffects } from './hooks/useAppEffects'
import { useDevActions } from './hooks/useDevActions'




export default function App() {
  const navigate = useNavigate()
  const scale = useScale()
  // Phase A — profil Supabase (source de vérité pour devises/unlocks/flags)
  const { applyCurrencyDelta, unlockFact, mergeFlags, coins: profileCoins, tickets: profileTickets, hints: profileHints } = usePlayerProfile()
  // DuelContext — pending nav state en mémoire (remplace localStorage pour Défi)
  const {
    pendingDuel, clearPendingDuel,
    setLastCreatedDuel, setLastCreatedDuelError,
    lastCreatedDuel, lastCreatedDuelError, clearLastCreatedDuel,
  } = useDuelContext()

  // Desktop ≥768px → active le décor fullscreen (dégradé animé + particules)
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768)
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Android hardware back button — navigate to previous page instead of exiting app
  useEffect(() => {
    const handleBackButton = () => {
      navigate(-1)
    }
    // Cordova/Capacitor event for hardware back button
    if (window.document.addEventListener) {
      document.addEventListener('backbutton', handleBackButton, false)
    }
    return () => {
      if (window.document.removeEventListener) {
        document.removeEventListener('backbutton', handleBackButton, false)
      }
    }
  }, [navigate])

  // Dev mode URL param: ?devmode=wtf2026 to enable, ?devmode=off to disable
  // Challenge Blitz: ?startChallengeBlitz=true to start a challenge Blitz
  useState(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const devCode = urlParams.get('devmode')
    if (devCode === 'wtf2026') {
      localStorage.setItem('wtf_dev_access', 'true')
      window.history.replaceState({}, '', window.location.pathname)
    } else if (devCode === 'off') {
      localStorage.removeItem('wtf_dev_access')
      localStorage.removeItem('wtf_dev_mode')
      localStorage.removeItem('wtf_test_mode')
      window.history.replaceState({}, '', window.location.pathname)
    }
    // Legacy ?startChallengeBlitz=true : cleanup URL mais plus d'action.
    // Le flow passe maintenant par DuelContext.pendingDuel (mémoire React).
    if (urlParams.get('startChallengeBlitz') === 'true') {
      window.history.replaceState({}, '', window.location.pathname)
    }
  })

  // Migration douce : si wtf_hints_available existe, rapatrier dans wtf_data.hints
  if (localStorage.getItem('wtf_hints_available') !== null) {
    try {
      const _migData = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      if (_migData.hints === undefined) {
        _migData.hints = parseInt(localStorage.getItem('wtf_hints_available') || '0', 10) || 0
        _migData.lastModified = Date.now()
        localStorage.setItem('wtf_data', JSON.stringify(_migData))
      }
      localStorage.removeItem('wtf_hints_available')
    } catch { /* ignore */ }
  }

  // Initialiser les devises pour les nouveaux joueurs — valeurs officielles CLAUDE.md F2P
  // Nouveau joueur : 50 coins / 1 ticket / 3 indices / 5 énergies (profil F2P équilibré)
  if (localStorage.getItem('wtf_data')) {
    const _initData = JSON.parse(localStorage.getItem('wtf_data'))
    if (_initData.tickets === undefined) {
      _initData.tickets = 1; _initData.wtfCoins = 50; _initData.hints = 3
      _initData.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(_initData))
    }
  }

  // DEV: 100/100/100 pour les tests — UNE SEULE FOIS au premier lancement
  useState(() => {
    if (import.meta.env.DEV && !sessionStorage.getItem('wtf_dev_credits_done')) {
      const _d = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      _d.tickets = 100; _d.wtfCoins = 100; _d.hints = 100; _d.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(_d))
      sessionStorage.setItem('wtf_dev_credits_done', 'true')
    }
  })


  // ── Legacy : le vieux flow wtf_pending_challenge_blitz est retiré,
  // ChallengeScreen passe maintenant par DuelContext.startAcceptDefi qui
  // est consommé dans l'useEffect sur pendingDuel ci-dessous.

  // ── Pending Duel depuis SocialPage / ChallengeScreen ──
  // Nouveau : lit depuis DuelContext (mémoire React), plus aucun localStorage.
  useEffect(() => {
    if (!pendingDuel) return

    if (pendingDuel.mode === 'create') {
      // Vérifier tickets mais on débite après createDuelRound() en handleBlitzFinish
      if ((profileTickets ?? 0) < 1) {
        setGameAlert({ emoji: '🎫', title: 'Pas de ticket', message: 'Tu n\'as pas de ticket pour lancer un défi !' })
        clearPendingDuel()
        return
      }
      setIsChallengeMode(true)
      // Revanche dans mêmes conditions → skip le BlitzLobby et lance directement.
      if (pendingDuel.questionCount && pendingDuel.categoryId && pendingDuel.categoryId !== 'all') {
        handleBlitzStart(pendingDuel.categoryId, pendingDuel.questionCount)
        // pendingDuel reste en place pour handleBlitzFinish (opponentId + categoryId)
        return
      }
      setGameMode('blitz')
      setSessionType('blitz')
      setSelectedDifficulty(DIFFICULTY_LEVELS.BLITZ)
      setSelectedCategory(pendingDuel.categoryId || 'all')
      setScreen(SCREENS.BLITZ_LOBBY)
      // NOTE: Ticket débité dans handleBlitzFinish APRÈS createDuelRound() réussit
      // On laisse pendingDuel en place pour que handleBlitzFinish puisse
      // lire opponentId + categoryId. Sera cleared par handleHome ou après création du round.
    } else if (pendingDuel.mode === 'accept' && pendingDuel.facts) {
      // User accepte un défi : lance directement le Blitz avec les facts préparés
      setSessionType('blitz')
      setGameMode('blitz')
      setSelectedDifficulty(DIFFICULTY_LEVELS.BLITZ)
      setBlitzFacts(pendingDuel.facts)
      setBlitzResults(null)
      setScreen(SCREENS.BLITZ)
      // pendingDuel.roundId sera consommé par handleBlitzFinish pour completeDuelRound
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDuel, applyCurrencyDelta, clearPendingDuel])

  // ── Cache busting : force reload si nouvelle version déployée ──
  useEffect(() => {
    const currentVersion = import.meta.env.VITE_BUILD_ID
    if (!currentVersion) return
    const storedVersion = localStorage.getItem('wtf_app_version')
    if (storedVersion && storedVersion !== currentVersion) {
      localStorage.setItem('wtf_app_version', currentVersion)
      window.location.reload(true)
      return
    }
    if (!storedVersion) {
      localStorage.setItem('wtf_app_version', currentVersion)
    }
  }, [])

  // ── Charger tous les facts depuis Supabase au démarrage ──
  useEffect(() => {
    initFacts().catch(e => console.error('[App] initFacts failed:', e))
  }, [])

  const [showFalkon, setShowFalkon] = useState(() => !sessionStorage.getItem('wtf_splash_done'))
  const [showSplash, setShowSplash] = useState(false)
  const handleSplashComplete = async () => {
    // Audio et musique OFF par défaut — le joueur les active dans les paramètres

    sessionStorage.setItem('wtf_splash_done', 'true')
    setShowSplash(false)
    setScreen(SCREENS.HOME)
  }

  const [screen, setScreen] = useState(SCREENS.HOME)
  const [selectedDifficulty, setSelectedDifficulty] = useState(DIFFICULTY_LEVELS.HOT)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [sessionFacts, setSessionFacts] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionScore, setSessionScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [sessionAnyHintUsed, setSessionAnyHintUsed] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [isCorrect, setIsCorrect] = useState(null)
  const [pointsEarned, setPointsEarned] = useState(0)
  const [storage, setStorage] = useState(loadStorage)
  const { totalScore, streak, unlockedFacts, wtfCoins, wtfDuJourDate, wtfDuJourFait, sessionsToday, tickets } = storage
  const dailyQuestsRemaining = Math.max(0, 3 - (sessionsToday || 0))

  // Fix React warning: état flashEnergy pour éviter setState pendant le render de ScreenRenderer
  const [flashEnergy, setFlashEnergy] = useState(() => getFlashEnergy())
  useEffect(() => {
    const updateFlashEnergy = () => {
      setFlashEnergy(getFlashEnergy())
    }
    window.addEventListener('wtf_energy_updated', updateFlashEnergy)
    return () => window.removeEventListener('wtf_energy_updated', updateFlashEnergy)
  }, [])

  const [isChallengeMode, setIsChallengeMode] = useState(false)
  const [sessionType, setSessionType] = useState('parcours') // 'wtf_du_jour' | 'flash_solo' | 'parcours' | 'explorer' | 'duel'
  const [coinsEarnedLastSession, setCoinsEarnedLastSession] = useState(0)
  const [dailyFact, setDailyFact] = useState(null)
  const [dailyFactOverride, setDailyFactOverride] = useState(null)
  const effectiveDailyFact = dailyFactOverride || dailyFact

  // Facts loading state
  const [factsReady, setFactsReady] = useState(false)
  const [factsError, setFactsError] = useState(null)
  // Dev panel
  const [showDevPanel, setShowDevPanel] = useState(false)

  // Multiplayer state
  const [duelPlayers, setDuelPlayers] = useState([])
  const [duelCurrentPlayerIndex, setDuelCurrentPlayerIndex] = useState(0)
  const [gameMode, setGameMode] = useState('solo') // 'solo' | 'duel' | 'explorer'
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showNoTicketModal, setShowNoTicketModal] = useState(false)
  const [gameAlert, setGameAlert] = useState(null) // { emoji, title, message }
  const [showNoEnergyModal, setShowNoEnergyModal] = useState(false)
  const [noEnergyOrigin, setNoEnergyOrigin] = useState('flash') // 'flash' | 'explorer'
  const [trophyQueue, setTrophyQueue] = useState([]) // badges à afficher un par un
  const [isQuickPlay, setIsQuickPlay] = useState(false)
  const [blitzFacts, setBlitzFacts] = useState([])
  const [blitzResults, setBlitzResults] = useState(null)
  const [launchMode, setLaunchMode] = useState(null)
  const [explorerPool, setExplorerPool] = useState([])
  const [sessionCorrectFacts, setSessionCorrectFacts] = useState([])
  const [newlyUnlockedCategories, setNewlyUnlockedCategories] = useState([])
  const [showNewCategoriesModal, setShowNewCategoriesModal] = useState(false)
  const [completedLevels, setCompletedLevels] = useState([])
  const [sessionIsPerfect, setSessionIsPerfect] = useState(false)
  const [streakRewardToast, setStreakRewardToast] = useState(null)
  const [showStreakSpecialModal, setShowStreakSpecialModal] = useState(false)
  const [newlyEarnedBadges, setNewlyEarnedBadges] = useState([])
  const [miniParcours, setMiniParcours] = useState(null)
  const [socialNotifCount, setSocialNotifCount] = useState(0)
  const [showConnectBanner, setShowConnectBanner] = useState(false)
  const [pendingChallengesCount, setPendingChallengesCount] = useState(0)

  const { user, signInWithGoogle } = useAuth()

  // Close ConnectBanner when user successfully connects
  useEffect(() => {
    if (user && showConnectBanner) setShowConnectBanner(false)
  }, [user, showConnectBanner])

  const numPlayers = duelPlayers.length || 1

  const currentFact = gameMode === 'duel'
    ? sessionFacts[currentIndex * numPlayers + duelCurrentPlayerIndex] || null
    : sessionFacts[currentIndex] || null

  const totalRounds = gameMode === 'duel'
    ? Math.floor(sessionFacts.length / numPlayers)
    : sessionFacts.length

  // ─── Game handlers (extrait pour réduire App.jsx) ────────────────────────
  const {
    handleSelectAnswer,
    handleOpenValidate,
    handleTimeout,
    handleUseHint,
  } = useGameHandlers({
    currentFact, gameMode, sessionType, selectedDifficulty, selectedCategory,
    hintsUsed, selectedAnswer, duelCurrentPlayerIndex, user, unlockedFacts,
    setSelectedAnswer, setIsCorrect, setPointsEarned, setSessionScore,
    setCorrectCount, setSessionCorrectFacts, setDuelPlayers, setHintsUsed,
    setSessionAnyHintUsed, setStorage, setNewlyUnlockedCategories, setScreen,
    applyCurrencyDelta, // Phase A : source unique RPC
    unlockFact,         // Phase A.7 : miroir unlock_fact RPC
    hints: profileHints,
  })

  // ─── Blitz handlers → extraits dans useBlitzHandlers hook ──────────────────
  const { handleBlitzStart, handleBlitzFinish } = useBlitzHandlers({
    user, selectedCategory, isChallengeMode,
    setGameAlert, setSessionType, setGameMode, setSelectedCategory,
    setSelectedDifficulty, setBlitzFacts, setBlitzResults, setScreen,
    setNewlyEarnedBadges, setIsChallengeMode,
    mergeFlags, // A.9.3 persistance records
    pendingDuel, clearPendingDuel, // Duel nav state mémoire
    setLastCreatedDuel, setLastCreatedDuelError, // Résultat création async
  })

  // ─── Mode starters → extraits dans useModeStarters hook ──────────────────
  const {
    initSessionState, handleWTFWeekly, handleStartWTFSession,
    handleFlashSolo, handleQuickPlay, handlePlay,
  } = useModeStarters({
    effectiveDailyFact, unlockedFacts, user,
    setSessionFacts, setCurrentIndex, setSessionScore, setCorrectCount,
    setHintsUsed, setSessionAnyHintUsed, setSelectedAnswer, setIsCorrect,
    setSessionCorrectFacts, setNewlyUnlockedCategories, setShowNewCategoriesModal,
    setCompletedLevels, setSessionIsPerfect, setPointsEarned,
    setSessionType, setGameMode, setIsQuickPlay, setSelectedDifficulty,
    setSelectedCategory, setScreen, setGameAlert, setMiniParcours,
  })

  // ─── Mode starters + initSessionState → extraits dans useModeStarters hook ─

  // Reset complet onboarding — valeurs F2P officielles CLAUDE.md : 50/1/3/5
  const resetOnboarding = () => {
    const freshData = {
      gamesPlayed: 0, totalScore: 0, streak: 0,
      wtfCoins: 50, tickets: 1, hints: 3,
      unlockedFacts: [], sessionsToday: 0, statsByMode: {}, lastModified: Date.now(),
    }
    localStorage.setItem('wtf_data', JSON.stringify(freshData))
    localStorage.removeItem('tutorial_state')
    localStorage.removeItem('wtf_hints_available')
    localStorage.removeItem('skip_launch_quest')
    localStorage.removeItem('skip_launch_flash')
    localStorage.removeItem('skip_launch_blitz')
    localStorage.removeItem('skip_launch_explorer')
    localStorage.removeItem('skip_launch_hunt')
    sessionStorage.clear()
    window.location.reload()
  }

  // ─── Selection handlers (AVANT navigation car handleHomeNavigate en dépend) ──
  const { handleSelectDifficulty, handleSelectCategory, handleExplorerMode } = useSelectionHandlers({
    gameMode, sessionType, selectedDifficulty, selectedCategory,
    unlockedFacts, tickets,
    initSessionState, handleBlitzStart,
    setSelectedDifficulty, setSelectedCategory, setGameMode, setSessionType,
    setIsQuickPlay, setExplorerPool, setScreen, setStorage,
    setShowNoTicketModal, setGameAlert, setMiniParcours,
    applyCurrencyDelta, // Phase A.6
  })

  // ─── Navigation, Duel, Replay, Share ──────────────────────────────────────
  const {
    launchModeDestination, handleLaunchStart, showOrSkipLaunch,
    handleHomeNavigate,
    handleDuelNextPlayer, handleDuelMode, handleDuelStart, handleDuelPassReady, handleDuelReplay,
    handleSaveTempFacts, completeOnboardingIfNeeded,
    handleHome, handleBlitzReplay, handleExplorerContinue, handleReplay, handleReplayHarder,
    handleShare, handleShareDailyFact, handleShowRules,
  } = useNavigationHandlers({
    launchMode, currentFact, effectiveDailyFact, sessionType, selectedCategory,
    selectedDifficulty,
    explorerPool, unlockedFacts, duelPlayers, user, sessionCorrectFacts,
    handleStartWTFSession, handleFlashSolo, handleSelectDifficulty,
    handleSelectCategory, handleBlitzStart, initSessionState,
    setScreen, setLaunchMode, setGameMode, setSessionType, setSelectedDifficulty,
    setSelectedCategory, setSessionFacts, setCurrentIndex, setSessionScore,
    setCorrectCount, setDuelPlayers, setDuelCurrentPlayerIndex, setIsQuickPlay,
    setBlitzFacts, setBlitzResults, setIsChallengeMode, setExplorerPool,
    setHintsUsed, setSelectedAnswer, setIsCorrect, setPointsEarned,
    setShowNoEnergyModal, setNoEnergyOrigin, setShowHowToPlay, setGameAlert,
    setStorage,
    clearPendingDuel,
    unlockFact,
  })


  const handleNext = useHandleNext({
    gameMode, currentIndex, sessionFacts, sessionScore, numPlayers,
    isQuickPlay, sessionCorrectFacts, sessionType, effectiveDailyFact,
    correctCount, isCorrect, sessionAnyHintUsed, selectedAnswer,
    selectedDifficulty, selectedCategory, user,
    totalScore, streak, unlockedFacts, wtfDuJourDate, sessionsToday, wtfCoins,
    setScreen, setCurrentIndex, setHintsUsed, setSelectedAnswer, setIsCorrect,
    setPointsEarned, setDuelCurrentPlayerIndex, setStorage, setCoinsEarnedLastSession,
    setSessionIsPerfect, setCompletedLevels, setNewlyUnlockedCategories,
    setShowNewCategoriesModal, setShowStreakSpecialModal, setStreakRewardToast,
    setTrophyQueue,
    applyCurrencyDelta, // Phase A.6 — miroir Supabase
    mergeFlags,         // Phase A.9 — stats + totaux
    unlockFact,         // Phase A — unlock_fact RPC atomique
  })

  // ─── Dev actions → extraits dans useDevActions hook ─────────────────────────
  const { devActions } = useDevActions({
    storage, setStorage, setDailyFactOverride,
    setSessionType, setCoinsEarnedLastSession, setSessionScore,
    setCorrectCount, setSessionFacts, setScreen,
  })

  // Multiplayer context
  const duelContext = gameMode === 'duel' ? {
    currentPlayerIndex: duelCurrentPlayerIndex,
    playerName: duelPlayers[duelCurrentPlayerIndex]?.name ?? '',
    players: duelPlayers,
    isLastPlayer: duelCurrentPlayerIndex === duelPlayers.length - 1,
  } : null

  // ─── App effects → extraits dans useAppEffects hook ─────────────────────────
  useAppEffects({
    user, factsReady, screen, streakRewardToast,
    setFactsReady, setFactsError, setDailyFact, setStorage,
    setStreakRewardToast, setScreen, setGameMode,
    setSocialNotifCount, setPendingChallengesCount,
    handleHome, completeOnboardingIfNeeded,
    unlockFact,
  })


  if (showFalkon) {
    return (
      <FalkonIntroScreen onComplete={() => { setShowFalkon(false); setShowSplash(true) }} />
    )
  }

  if (showSplash) {
    return (
      <SplashScreen
        onComplete={handleSplashComplete}
        isReady={factsReady}
      />
    )
  }

  if (factsError && !factsReady) {
    return (
      <div style={{
        height: '100dvh', width: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        background: '#1E3A8A', fontFamily: 'Nunito, sans-serif', padding: 24,
      }}>
        <span style={{ fontSize: 48 }}>📡</span>
        <h2 style={{ color: 'white', fontWeight: 900, fontSize: 20, textAlign: 'center', margin: 0 }}>
          Connexion impossible
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
          Impossible de charger les facts.<br />Vérifie ta connexion internet.
        </p>
        <button
          onClick={() => {
            setFactsError(null)
            resetFacts()
            initFacts().then((result) => {
              if (result?.success) {
                setDailyFact(getDailyFact())
                setFactsReady(true)
                setFactsError(null)
              } else {
                setFactsError(result?.error || 'Erreur inconnue')
              }
            })
          }}
          style={{
            background: '#FF6B1A', color: 'white', border: 'none',
            borderRadius: 14, padding: '14px 32px', fontWeight: 900, fontSize: 16,
            cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
            boxShadow: '0 4px 16px rgba(255,107,26,0.4)',
          }}
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <>
    {isDesktop && <DesktopDecor />}
    <div
      className="w-full h-full max-w-md mx-auto relative overflow-hidden bg-wtf-bg"
      style={{
        '--scale': scale,
        height: '100dvh',
        ...(isDesktop ? {
          zIndex: 1,
          boxShadow: '0 0 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)',
          borderRadius: 24,
          overflow: 'hidden',
          marginTop: 'max(0px, calc((100dvh - 760px) / 2))',
          marginBottom: 'max(0px, calc((100dvh - 760px) / 2))',
          maxHeight: 760,
        } : {}),
      }}
    >

      <ScreenRenderer
        screen={screen} gameMode={gameMode} sessionType={sessionType}
        currentFact={currentFact} currentIndex={currentIndex} totalRounds={totalRounds}
        selectedDifficulty={selectedDifficulty} selectedCategory={selectedCategory}
        sessionScore={sessionScore} correctCount={correctCount} hintsUsed={hintsUsed}
        selectedAnswer={selectedAnswer} isCorrect={isCorrect} pointsEarned={pointsEarned}
        coinsEarnedLastSession={coinsEarnedLastSession}
        sessionCorrectFacts={sessionCorrectFacts} sessionFacts={sessionFacts}
        sessionsToday={sessionsToday} sessionIsPerfect={sessionIsPerfect}
        completedLevels={completedLevels} effectiveDailyFact={effectiveDailyFact}
        launchMode={launchMode} blitzFacts={blitzFacts} blitzResults={blitzResults}
        duelPlayers={duelPlayers} duelCurrentPlayerIndex={duelCurrentPlayerIndex}
        duelContext={duelContext} isChallengeMode={isChallengeMode}
        pendingDuel={pendingDuel}
        lastCreatedDuel={lastCreatedDuel}
        lastCreatedDuelError={lastCreatedDuelError}
        clearLastCreatedDuel={clearLastCreatedDuel}
        clearPendingDuel={clearPendingDuel}
        user={user} storage={storage} streak={streak}
        newlyEarnedBadges={newlyEarnedBadges} showHowToPlay={showHowToPlay}
        flashEnergy={flashEnergy}
        modeConfigs={MODE_CONFIGS}
        handleHomeNavigate={handleHomeNavigate} handleHome={handleHome}
        handleSelectDifficulty={handleSelectDifficulty} handleSelectCategory={handleSelectCategory}
        handleSelectAnswer={handleSelectAnswer} handleOpenValidate={handleOpenValidate}
        handleUseHint={handleUseHint} handleTimeout={handleTimeout}
        handleNext={handleNext} handleDuelNextPlayer={handleDuelNextPlayer}
        handleDuelStart={handleDuelStart} handleDuelPassReady={handleDuelPassReady}
        handleDuelReplay={handleDuelReplay} handleReplay={handleReplay} handleReplayHarder={handleReplayHarder}
        handleBlitzReplay={handleBlitzReplay} handleBlitzStart={handleBlitzStart}
        handleBlitzFinish={handleBlitzFinish} handleStartWTFSession={handleStartWTFSession}
        handleShare={handleShare} handleShareDailyFact={handleShareDailyFact}
        handleSaveTempFacts={handleSaveTempFacts} handleLaunchStart={handleLaunchStart}
        setScreen={setScreen} setShowSettings={setShowSettings} setShowHowToPlay={setShowHowToPlay}
        setStorage={setStorage}
        onBadgeSeen={() => setNewlyEarnedBadges([])}
        onResetSocialNotif={() => setSocialNotifCount(0)}
        socialNotifCount={socialNotifCount}
        pendingChallengesCount={pendingChallengesCount}
        navigate={navigate}
      />

      <AppModals
        streakRewardToast={streakRewardToast} showStreakSpecialModal={showStreakSpecialModal}
        showHowToPlay={showHowToPlay} screen={screen} showSettings={showSettings}
        showNoTicketModal={showNoTicketModal} showNoEnergyModal={showNoEnergyModal}
        noEnergyOrigin={noEnergyOrigin} gameAlert={gameAlert}
        showConnectBanner={showConnectBanner} trophyQueue={trophyQueue}
        miniParcours={miniParcours} showNewCategoriesModal={showNewCategoriesModal}
        newlyUnlockedCategories={newlyUnlockedCategories} showDevPanel={showDevPanel}
        wtfCoins={wtfCoins} storage={storage} effectiveDailyFact={effectiveDailyFact}
        gameMode={gameMode}
        setStreakRewardToast={setStreakRewardToast} setShowStreakSpecialModal={setShowStreakSpecialModal}
        setShowHowToPlay={setShowHowToPlay} setShowSettings={setShowSettings}
        setShowNoTicketModal={setShowNoTicketModal} setShowNoEnergyModal={setShowNoEnergyModal}
        setGameAlert={setGameAlert} setShowConnectBanner={setShowConnectBanner}
        setTrophyQueue={setTrophyQueue} setMiniParcours={setMiniParcours}
        setShowNewCategoriesModal={setShowNewCategoriesModal} setShowDevPanel={setShowDevPanel}
        setSessionType={setSessionType} setGameMode={setGameMode} setIsQuickPlay={setIsQuickPlay}
        setSelectedDifficulty={setSelectedDifficulty} setSelectedCategory={setSelectedCategory}
        setExplorerPool={setExplorerPool} setScreen={setScreen} setStorage={setStorage}
        resetOnboarding={resetOnboarding} handleShowRules={handleShowRules}
        handleFlashSolo={handleFlashSolo} handleHomeNavigate={handleHomeNavigate}
        showOrSkipLaunch={showOrSkipLaunch} initSessionState={initSessionState}
        devActions={devActions} signInWithGoogle={signInWithGoogle}
      />
    </div>
    </>
  )
}
