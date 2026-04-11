import { useState, useEffect } from 'react'
import { useScale } from './hooks/useScale'
import { useNavigate } from 'react-router-dom'
import { DIFFICULTY_LEVELS, SCREENS, MODE_CONFIGS } from './constants/gameConfig'
import TutoTunnel from './components/TutoTunnel'
import { getDailyFact, getTitrePartiel, getCategoryById, initFacts, resetFacts } from './data/factsService'
import { loadStorage, saveStorage } from './utils/storageHelper'
import { updateTickets, getBalances } from './services/currencyService'
import { supabase } from './lib/supabase'
import { getFlashEnergy } from './services/energyService'
import { audio } from './utils/audio'
import { useAuth } from './context/AuthContext'
import AppModals from './components/AppModals'
// Screens
import HomeScreen from './screens/HomeScreen'
import SplashScreen from './screens/SplashScreen'
import FalkonIntroScreen from './screens/FalkonIntroScreen'
import MarathonScreen from './screens/MarathonScreen'
import DifficultyScreen from './screens/DifficultyScreen'
import CategoryScreen from './screens/CategoryScreen'
import QuestionScreen from './screens/QuestionScreen'
import RevelationScreen from './screens/RevelationScreen'
import ResultsScreen from './screens/ResultsScreen'
import BlitzScreen from './screens/BlitzScreen'
import BlitzLobbyScreen from './screens/BlitzLobbyScreen'
import BlitzResultsScreen from './screens/BlitzResultsScreen'
import WTFDuJourTeaserScreen from './screens/WTFDuJourTeaserScreen'
import WTFDuJourRevealScreen from './screens/WTFDuJourRevealScreen'
import DuelSetupScreen, { PLAYER_COLORS, PLAYER_EMOJIS } from './screens/DuelSetupScreen'
import DuelPassScreen from './screens/DuelPassScreen'
import DuelResultsScreen from './screens/DuelResultsScreen'
import ModeLaunchScreen from './screens/ModeLaunchScreen'
// Hooks
import { useGameHandlers } from './hooks/useGameHandlers'
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
    // Challenge Blitz from ChallengeScreen
    if (urlParams.get('startChallengeBlitz') === 'true') {
      window.history.replaceState({}, '', window.location.pathname)
      try {
        const facts = JSON.parse(localStorage.getItem('wtf_challenge_facts') || '[]')
        localStorage.removeItem('wtf_challenge_facts')
        if (facts.length > 0) {
          // Will be picked up by the useEffect below
          localStorage.setItem('wtf_pending_challenge_blitz', JSON.stringify(facts))
        }
      } catch { /* ignore */ }
    }
  })

  // Initialiser les indices à 0 pour les nouveaux joueurs
  if (localStorage.getItem('wtf_hints_available') === null) {
    localStorage.setItem('wtf_hints_available', '0')
  }


  // ── Challenge Blitz : démarrer un défi depuis ChallengeScreen ──
  useEffect(() => {
    const pendingJson = localStorage.getItem('wtf_pending_challenge_blitz')
    if (!pendingJson) return
    localStorage.removeItem('wtf_pending_challenge_blitz')
    try {
      const facts = JSON.parse(pendingJson)
      if (facts.length > 0) {
        setSessionType('blitz')
        setGameMode('blitz')
        setSelectedDifficulty(DIFFICULTY_LEVELS.BLITZ)
        setBlitzFacts(facts)
        setBlitzResults(null)
        setScreen(SCREENS.BLITZ)
      }
    } catch { /* ignore */ }
  }, [])

  // ── Pending action depuis SocialPage : lancer un Blitz défi ──
  useEffect(() => {
    const action = localStorage.getItem('wtf_pending_action')
    if (!action) return
    localStorage.removeItem('wtf_pending_action')
    if (action === 'challenge') {
      // Mode défi : vérifier le ticket
      const balances = getBalances()
      if (balances.tickets < 1) {
        setGameAlert({ emoji: '🎫', title: 'Pas de ticket', message: 'Tu n\'as pas de ticket pour lancer un défi !' })
        return
      }
      updateTickets(-1)
      setIsChallengeMode(true)
      setGameMode('blitz')
      setSessionType('blitz')
      setSelectedDifficulty(DIFFICULTY_LEVELS.BLITZ)
      setSelectedCategory(null)
      setScreen(SCREENS.BLITZ_LOBBY)
    } else if (action === 'blitz') {
      setGameMode('blitz')
      setSessionType('blitz')
      setSelectedDifficulty(DIFFICULTY_LEVELS.BLITZ)
      setSelectedCategory(null)
      setScreen(SCREENS.BLITZ_LOBBY)
    }
  }, [])

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

  const [showFalkon, setShowFalkon] = useState(() => !sessionStorage.getItem('wtf_splash_done'))
  const [showSplash, setShowSplash] = useState(false)
  const handleSplashComplete = async () => {
    // Initialize audio immediately after splash
    audio.play('click')

    // Start music only if onboarding is complete (existing players)
    const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    if (wd.onboardingCompleted) {
      audio.startMusic()
    }

    sessionStorage.setItem('wtf_splash_done', 'true')
    setShowSplash(false)
    setScreen(SCREENS.HOME)
    // DEPRECATED: Tutorial logic moved to TutoTunnel component
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

  const [isChallengeMode, setIsChallengeMode] = useState(false)
  const [sessionType, setSessionType] = useState('parcours') // 'wtf_du_jour' | 'flash_solo' | 'parcours' | 'marathon' | 'duel'
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
  const [gameMode, setGameMode] = useState('solo') // 'solo' | 'duel' | 'marathon'
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showNoTicketModal, setShowNoTicketModal] = useState(false)
  const [gameAlert, setGameAlert] = useState(null) // { emoji, title, message }
  const [showNoEnergyModal, setShowNoEnergyModal] = useState(false)
  const [noEnergyOrigin, setNoEnergyOrigin] = useState('flash') // 'flash' | 'marathon'
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
    if (user && showConnectBanner) {
      setShowConnectBanner(false)
    }
  }, [user, showConnectBanner])

  // ── Supabase Realtime badge notifications ────────────────────────────────────
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('notif-badge-' + user.id)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'friendships',
        filter: 'user2_id=eq.' + user.id,
      }, () => {
        setSocialNotifCount(prev => prev + 1)
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'challenges',
        filter: 'player2_id=eq.' + user.id,
      }, () => {
        setSocialNotifCount(prev => prev + 1)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  // ── Badge Défi en attente dans la navbar ─────────────────────────────────────
  useEffect(() => {
    if (!user) { setPendingChallengesCount(0); return }

    const fetchPending = async () => {
      const { data } = await supabase
        .from('challenges')
        .select('id')
        .eq('status', 'pending')
        .neq('player1_id', user.id)
      setPendingChallengesCount((data || []).length)
    }

    fetchPending()

    const channel = supabase
      .channel('nav-challenges-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, () => fetchPending())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

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
  })

  // ─── Blitz handlers → extraits dans useBlitzHandlers hook ──────────────────
  const { handleBlitzStart, handleBlitzFinish } = useBlitzHandlers({
    user, selectedCategory, isChallengeMode,
    setGameAlert, setSessionType, setGameMode, setSelectedCategory,
    setSelectedDifficulty, setBlitzFacts, setBlitzResults, setScreen,
    setNewlyEarnedBadges, setIsChallengeMode,
  })

  // ─── Mode starters → extraits dans useModeStarters hook ──────────────────
  const {
    initSessionState, handleWTFDuJour, handleStartWTFSession,
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

  // ─── Session starters ────────────────────────────────────────────────────

  const canPlayFlashCheck = () => getFlashEnergy().remaining > 0

  // ─── Mode starters + initSessionState → extraits dans useModeStarters hook ─

  // Reset complet onboarding
  const resetOnboarding = () => {
    const freshData = {
      gamesPlayed: 0, totalScore: 0, streak: 0, wtfCoins: 0, tickets: 0,
      unlockedFacts: [], sessionsToday: 0, statsByMode: {}, lastModified: Date.now(),
    }
    localStorage.setItem('wtf_data', JSON.stringify(freshData))
    localStorage.removeItem('tutorial_state')
    localStorage.setItem('wtf_hints_available', '0')
    localStorage.removeItem('skip_launch_quest')
    localStorage.removeItem('skip_launch_flash')
    localStorage.removeItem('skip_launch_blitz')
    localStorage.removeItem('skip_launch_explorer')
    localStorage.removeItem('skip_launch_hunt')
    sessionStorage.clear()
    window.location.reload()
  }

  // ─── Selection handlers (AVANT navigation car handleHomeNavigate en dépend) ──
  const { handleSelectDifficulty, handleSelectCategory, handleMarathonMode } = useSelectionHandlers({
    gameMode, sessionType, selectedDifficulty, selectedCategory,
    unlockedFacts, tickets,
    initSessionState, handleBlitzStart,
    setSelectedDifficulty, setSelectedCategory, setGameMode, setSessionType,
    setIsQuickPlay, setExplorerPool, setScreen, setStorage,
    setShowNoTicketModal, setGameAlert, setMiniParcours,
  })

  // ─── Navigation, Duel, Replay, Share ──────────────────────────────────────
  const {
    launchModeDestination, handleLaunchStart, showOrSkipLaunch,
    handleHomeNavigate,
    handleDuelNextPlayer, handleDuelMode, handleDuelStart, handleDuelPassReady, handleDuelReplay,
    handleSaveTempFacts, completeOnboardingIfNeeded,
    handleHome, handleBlitzReplay, handleExplorerContinue, handleReplay,
    handleShare, handleShareDailyFact, handleShowRules,
  } = useNavigationHandlers({
    launchMode, currentFact, effectiveDailyFact, sessionType, selectedCategory,
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
  })


  // ─── Answer handlers → extraits dans useGameHandlers hook ──────────────────

  // ─── Navigation → extrait dans useHandleNext hook ─────────────────────────
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
  })

  // ─── handleNext → extrait dans useHandleNext hook ──────────────────────────

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
    handleHome, completeOnboardingIfNeeded,
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
    <div className="w-full h-full max-w-md mx-auto relative overflow-hidden bg-wtf-bg" style={{ '--scale': scale, height: '100dvh' }}>

      )}

      {screen === SCREENS.HOME && (
        <HomeScreen
          currentStreak={streak}
          dailyQuestsRemaining={dailyQuestsRemaining}
          newlyEarnedBadges={newlyEarnedBadges}
          onBadgeSeen={() => setNewlyEarnedBadges([])}
          flashEnergyRemaining={getFlashEnergy().remaining}
          onNavigate={handleHomeNavigate}
          onOpenSettings={() => setShowSettings(true)}
          playerAvatar={user?.user_metadata?.avatar_url || localStorage.getItem('wtf_player_avatar') || null}
          gamesPlayed={storage.gamesPlayed || 0}
          unlockedFactsCount={storage.unlockedFacts instanceof Set ? storage.unlockedFacts.size : Array.isArray(storage.unlockedFacts) ? storage.unlockedFacts.length : 0}
          blitzPlayed={(() => { try { return JSON.parse(localStorage.getItem('wtf_data') || '{}').statsByMode?.blitz?.gamesPlayed || 0 } catch { return 0 } })()}
          questsPlayed={(() => { try { return JSON.parse(localStorage.getItem('wtf_data') || '{}').questsPlayed || 0 } catch { return 0 } })()}
          onModeSeen={(modeId) => {
            setStorage(prev => {
              const seenModes = [...new Set([...(prev.seenModes || []), modeId])]
              const next = { ...prev, seenModes }
              saveStorage(next)
              return next
            })
          }}
          socialNotifCount={socialNotifCount}
          onResetSocialNotif={() => setSocialNotifCount(0)}
          pendingChallengesCount={pendingChallengesCount}
        />
      )}

      {screen === SCREENS.WTF_TEASER && (
        <WTFDuJourTeaserScreen
          fact={effectiveDailyFact}
          titrePartiel={getTitrePartiel(effectiveDailyFact)}
          streak={streak}
          onStart={handleStartWTFSession}
          onBack={() => {
            completeOnboardingIfNeeded()
            setScreen(SCREENS.HOME)
          }}
        />
      )}

      {screen === SCREENS.WTF_REVEAL && (
        <WTFDuJourRevealScreen
          fact={effectiveDailyFact}
          sessionScore={sessionScore}
          correctCount={correctCount}
          totalFacts={sessionFacts.length}
          coinsEarned={coinsEarnedLastSession}
          streak={streak}
          onHome={handleHome}
          onShare={handleShareDailyFact}
        />
      )}

      {screen === SCREENS.MODE_LAUNCH && launchMode && (
        <ModeLaunchScreen
          {...MODE_CONFIGS[launchMode]}
          onStart={handleLaunchStart}
          onBack={() => {
            // ABANDON — appliquer le guard skip si onboarding pas fini ET pas en launchMode
            const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
            if (!wd.onboardingCompleted && !launchMode) {
              completeOnboardingIfNeeded()
            }
            setScreen(SCREENS.HOME)
          }}
        />
      )}

      {screen === SCREENS.DIFFICULTY && (
        <DifficultyScreen
          onSelectDifficulty={handleSelectDifficulty}
          onBack={() => {
            if (!launchMode) completeOnboardingIfNeeded()
            setScreen(launchMode ? SCREENS.MODE_LAUNCH : SCREENS.HOME)
          }}
        />
      )}

      {screen === SCREENS.CATEGORY && (
        <CategoryScreen
          onSelectCategory={handleSelectCategory}
          onBack={() => {
            if (!launchMode) completeOnboardingIfNeeded()
            setScreen(launchMode ? SCREENS.MODE_LAUNCH : SCREENS.HOME)
          }}
          selectedDifficulty={selectedDifficulty}
          unlockedFacts={unlockedFacts}
          gameMode={gameMode}
          sessionType={sessionType}
        />
      )}

      {screen === SCREENS.QUESTION && currentFact && (
        <QuestionScreen
          key={`${gameMode}-${duelCurrentPlayerIndex}-${currentFact.id}`}
          fact={currentFact}
          factIndex={currentIndex}
          totalFacts={totalRounds}
          hintsUsed={hintsUsed}
          onSelectAnswer={handleSelectAnswer}
          onOpenValidate={handleOpenValidate}
          onUseHint={handleUseHint}
          onTimeout={handleTimeout}
          onQuit={handleHome}
          category={selectedCategory}
          gameMode={gameMode}
          difficulty={(gameMode === 'solo' || gameMode === 'marathon') ? selectedDifficulty : null}
          playerName={gameMode === 'duel' ? duelPlayers[duelCurrentPlayerIndex]?.name : null}
          playerColor={gameMode === 'duel' ? PLAYER_COLORS[duelCurrentPlayerIndex] : null}
          playerEmoji={gameMode === 'duel' ? PLAYER_EMOJIS[duelCurrentPlayerIndex] : null}
          sessionType={sessionType}
        />
      )}

      {screen === SCREENS.REVELATION && currentFact && (
        <RevelationScreen
          fact={currentFact}
          isCorrect={isCorrect}
          selectedAnswer={selectedAnswer}
          pointsEarned={pointsEarned}
          hintsUsed={hintsUsed}
          onNext={gameMode === 'duel' && !duelContext?.isLastPlayer ? handleDuelNextPlayer : handleNext}
          onShare={handleShare}
          onQuit={handleHome}
          factIndex={currentIndex}
          totalFacts={totalRounds}
          duelContext={duelContext}
          gameMode={gameMode}
          sessionScore={gameMode === 'duel' ? 0 : sessionScore}
          sessionType={sessionType}
        />
      )}

      {screen === SCREENS.RESULTS && (
        <ResultsScreen
          score={sessionScore}
          correctCount={correctCount}
          totalFacts={totalRounds}
          coinsEarned={coinsEarnedLastSession}
          sessionType={sessionType}
          difficulty={selectedDifficulty}
          ticketEarned={sessionIsPerfect}
          onReplay={handleReplay}
          onHome={handleHome}
          completedCategoryLevels={completedLevels}
          categoryId={selectedCategory}
          unlockedFactsThisSession={sessionCorrectFacts}
          allSessionFacts={sessionFacts}
          sessionsToday={sessionsToday}
          onSaveTempFacts={handleSaveTempFacts}
          onCollection={() => { handleHome(); navigate('/collection') }}
          isFirstGame={(() => { try { const d = JSON.parse(localStorage.getItem('wtf_data') || '{}'); return d.firstFlashTicketGiven && (d.gamesPlayed || 0) <= 1 } catch { return false } })()}
        />
      )}

      {screen === SCREENS.MARATHON_RESULTS && (
        <MarathonScreen
          correctCount={correctCount}
          totalFacts={sessionFacts.length}
          sessionScore={sessionScore}
          coinsEarned={coinsEarnedLastSession}
          isPerfect={correctCount === sessionFacts.length}
          difficulty={selectedDifficulty}
          onReplay={handleReplay}
          onHome={handleHome}
        />
      )}

      {screen === SCREENS.BLITZ_LOBBY && (
        <BlitzLobbyScreen
          onSelectCategory={handleBlitzStart}
          onBack={handleHome}
          unlockedFacts={unlockedFacts}
          bestBlitzTime={JSON.parse(localStorage.getItem('wtf_data') || '{}').bestBlitzTime || null}
        />
      )}

      {screen === SCREENS.BLITZ && blitzFacts.length > 0 && (
        <BlitzScreen
          facts={blitzFacts}
          category={selectedCategory}
          onFinish={handleBlitzFinish}
          onQuit={handleHome}
          onUseHint={handleUseHint}
        />
      )}

      {screen === SCREENS.BLITZ_RESULTS && blitzResults && (
        <BlitzResultsScreen
          finalTime={blitzResults.finalTime}
          correctCount={blitzResults.correctCount}
          totalAnswered={blitzResults.totalAnswered}
          penalties={blitzResults.penalties}
          bestTime={blitzResults.bestTime}
          isNewRecord={blitzResults.isNewRecord}
          categoryId={selectedCategory}
          categoryLabel={getCategoryById(selectedCategory)?.label || ''}
          questionCount={blitzResults.totalAnswered}
          user={user}
          isChallengeMode={isChallengeMode}
          onHome={handleHome}
          onReplay={handleBlitzReplay}
        />
      )}

      {screen === SCREENS.DUEL_SETUP && (
        <>
          {showHowToPlay && gameMode === 'duel' && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
              <div className="w-full rounded-3xl p-6 border" style={{ background: '#fff', borderColor: 'rgba(0,0,0,0.1)', maxWidth: '420px', maxHeight: '85vh', overflowY: 'auto' }}>
                <div className="text-4xl text-center mb-4">🎮</div>
                <h2 className="text-xl font-black text-center mb-3" style={{ color: '#1a1a2e' }}>Multijoueur</h2>
                <div className="text-sm mb-5" style={{ color: '#333', lineHeight: '1.6' }}>
                  <p className="mb-3"><strong>👥 Tour par tour :</strong> Chaque joueur répond à ses questions à son tour.</p>
                  <p className="mb-3"><strong>🏆 Scoring :</strong> <strong>5 pts</strong> sans indice • <strong>3 pts</strong> avec 1 indice • <strong>2 pts</strong> avec 2 indices.</p>
                  <p><strong>🎯 Gagnant :</strong> Le joueur avec le plus de points à la fin !</p>
                </div>
                <div className="flex items-center gap-2 mb-4 p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.03)' }}>
                  <input type="checkbox" id="hideHowToPlayDuel" onChange={(e) => { if (e.target.checked) localStorage.setItem('wtf_hide_howtoplay', 'true') }} className="w-4 h-4 cursor-pointer" />
                  <label htmlFor="hideHowToPlayDuel" className="text-xs cursor-pointer" style={{ color: '#666' }}>Ne plus afficher</label>
                </div>
                <button onClick={() => setShowHowToPlay(false)} className="w-full py-3 rounded-2xl font-black text-sm active:scale-95 transition-all" style={{ background: '#FF6B1A', color: 'white' }}>
                  C'est parti ! 🚀
                </button>
              </div>
            </div>
          )}
          <DuelSetupScreen onStart={handleDuelStart} onBack={handleHome} />
        </>
      )}

      {screen === SCREENS.DUEL_PASS && (
        <DuelPassScreen
          playerName={duelPlayers[duelCurrentPlayerIndex]?.name ?? ''}
          playerColor={PLAYER_COLORS[duelCurrentPlayerIndex]}
          playerEmoji={PLAYER_EMOJIS[duelCurrentPlayerIndex]}
          questionIndex={currentIndex}
          totalQuestions={totalRounds}
          onReady={handleDuelPassReady}
        />
      )}

      {screen === SCREENS.DUEL_RESULTS && (
        <DuelResultsScreen
          players={duelPlayers}
          onReplay={handleDuelReplay}
          onHome={handleHome}
        />
      )}

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
        />
      )}
    </div>
  )
}
