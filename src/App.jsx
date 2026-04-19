import { useState, useEffect, useRef } from 'react'
import { useScale } from './hooks/useScale'
import { useNavigate } from 'react-router-dom'
import { DIFFICULTY_LEVELS, SCREENS, MODE_CONFIGS } from './constants/gameConfig'
import { getDailyFact, initFacts, resetFacts } from './data/factsService'
import { loadStorage, saveStorage } from './utils/storageHelper'
import { getQuickieEnergy } from './services/energyService'
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
  const { applyCurrencyDelta, unlockFact, mergeFlags, coins: profileCoins, hints: profileHints } = usePlayerProfile()
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
  // Nouveau joueur : 500 coins / 3 indices / 5 énergies
  if (localStorage.getItem('wtf_data')) {
    const _initData = JSON.parse(localStorage.getItem('wtf_data'))
    if (_initData.wtfCoins === undefined) {
      _initData.wtfCoins = 500; _initData.hints = 3
      _initData.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(_initData))
    }
  }

  // DEV: crédits de test — uniquement si le toggle Mode Dev est actif
  useState(() => {
    const isDevMode = localStorage.getItem('wtf_dev_mode') === 'true'
    if (isDevMode && !sessionStorage.getItem('wtf_dev_credits_done')) {
      const _d = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      _d.wtfCoins = 9999; _d.hints = 100; _d.lastModified = Date.now()
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
      // Défi Multi : créateur mise 100c (accepteur mise 100c à l'acceptation · gagnant +150c)
      if ((profileCoins ?? 0) < 100) {
        setGameAlert({ emoji: '🪙', title: 'Pas assez de coins', message: 'Il te faut 100 coins pour lancer un défi !' })
        clearPendingDuel()
        return
      }
      // Multi venant de MultiPage ou revanche : lance directement la partie.
      // pendingDuel.variant ('rush'|'speedrun') + pendingDuel.questionCount (palier
      // pour speedrun, ou null pour rush tout-pool).
      if (pendingDuel.categoryId && pendingDuel.categoryId !== 'all') {
        handleBlitzStart(pendingDuel.categoryId, pendingDuel.questionCount, pendingDuel.variant || 'rush')
        return
      }
      // Fallback legacy (pas de categoryId précisé) → ouvre le BlitzLobby
      setGameMode('blitz')
      setSessionType('blitz')
      setSelectedDifficulty(DIFFICULTY_LEVELS.BLITZ)
      setSelectedCategory(pendingDuel.categoryId || 'all')
      setScreen(SCREENS.BLITZ_LOBBY)
    } else if (pendingDuel.mode === 'accept' && pendingDuel.facts) {
      // User accepte un défi : lance directement le Blitz avec les facts préparés
      // variant (rush/speedrun) hérité du challenge row
      setSessionType('blitz')
      setGameMode('blitz')
      setSelectedDifficulty(DIFFICULTY_LEVELS.BLITZ)
      setBlitzVariant?.(pendingDuel.variant || 'rush')
      setBlitzFacts(pendingDuel.facts)
      setBlitzResults(null)
      setScreen(SCREENS.BLITZ)
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

  // Si on arrive sur App.jsx avec un pendingDuel déjà en mémoire (navigation
  // ChallengeScreen → /), on initialise directement sur BLITZ pour éviter un
  // flash HomeScreen entre le click "Relever" et le useEffect qui bascule l'écran.
  const [screen, setScreen] = useState(() => {
    if (pendingDuel?.mode === 'accept' && pendingDuel?.facts) return SCREENS.BLITZ
    if (pendingDuel?.mode === 'create') return SCREENS.BLITZ_LOBBY
    return SCREENS.HOME
  })
  const [selectedDifficulty, setSelectedDifficulty] = useState(DIFFICULTY_LEVELS.QUICKIE)
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
  const { totalScore, streak, unlockedFacts, wtfCoins, wtfDuJourDate, wtfDuJourFait, sessionsToday } = storage
  const dailyQuestsRemaining = Math.max(0, 3 - (sessionsToday || 0))

  // Fix React warning: état quickieEnergy pour éviter setState pendant le render de ScreenRenderer
  const [quickieEnergy, setQuickieEnergy] = useState(() => getQuickieEnergy())
  useEffect(() => {
    const updateQuickieEnergy = () => {
      setQuickieEnergy(getQuickieEnergy())
    }
    window.addEventListener('wtf_energy_updated', updateQuickieEnergy)
    return () => window.removeEventListener('wtf_energy_updated', updateQuickieEnergy)
  }, [])

  // isChallengeMode dérivé de pendingDuel — une seule source de vérité (Palier 2).
  const isChallengeMode = pendingDuel?.mode === 'create'
  const [sessionType, setSessionType] = useState('parcours') // 'flash' | 'quickie' | 'parcours' | 'quickie' | 'duel'
  const [coinsEarnedLastSession, setCoinsEarnedLastSession] = useState(0)
  const [dailyFact, setDailyFact] = useState(null)
  const [dailyFactOverride, setDailyFactOverride] = useState(null)
  const effectiveDailyFact = dailyFactOverride || dailyFact

  // Facts loading state
  const [factsReady, setFactsReady] = useState(false)
  const [factsError, setFactsError] = useState(null)
  // Dev panel
  const [showDevPanel, setShowDevPanel] = useState(false)

  const [gameMode, setGameMode] = useState('solo') // 'solo' | 'quickie'
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [gameAlert, setGameAlert] = useState(null) // { emoji, title, message }
  const [showNoEnergyModal, setShowNoEnergyModal] = useState(false)
  const [noEnergyOrigin, setNoEnergyOrigin] = useState('quickie') // 'quickie' | 'quickie'
  const [trophyQueue, setTrophyQueue] = useState([]) // badges à afficher un par un
  const [isQuickPlay, setIsQuickPlay] = useState(false)
  const [blitzFacts, setBlitzFacts] = useState([])
  const [blitzResults, setBlitzResults] = useState(null)
  const [blitzVariant, setBlitzVariant] = useState('rush') // 'rush' | 'speedrun'
  const [launchMode, setLaunchMode] = useState(null)
  const [quickiePool, setQuickiePool] = useState([])
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

  const numPlayers = 1

  const currentFact = sessionFacts[currentIndex] || null

  const totalRounds = sessionFacts.length

  // ─── Game handlers (extrait pour réduire App.jsx) ────────────────────────
  const {
    handleSelectAnswer,
    handleOpenValidate,
    handleTimeout,
    handleUseHint,
  } = useGameHandlers({
    currentFact, sessionType, selectedDifficulty, selectedCategory,
    hintsUsed, selectedAnswer, user, unlockedFacts,
    setSelectedAnswer, setIsCorrect, setPointsEarned, setSessionScore,
    setCorrectCount, setSessionCorrectFacts, setHintsUsed,
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
    setBlitzVariant,
    setNewlyEarnedBadges,
    mergeFlags, // A.9.3 persistance records
    applyCurrencyDelta, // 1b — débit 200 coins défi Blitz
    pendingDuel, clearPendingDuel, // Duel nav state mémoire
    setLastCreatedDuel, setLastCreatedDuelError, // Résultat création async
  })

  // ─── Mode starters → extraits dans useModeStarters hook ──────────────────
  const {
    initSessionState, handleFlashTeaser, handleStartFlashSession,
    handleQuickie, handleQuickPlay,
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
      wtfCoins: 500, hints: 3,
      unlockedFacts: [], sessionsToday: 0, statsByMode: {}, lastModified: Date.now(),
    }
    localStorage.setItem('wtf_data', JSON.stringify(freshData))
    localStorage.removeItem('tutorial_state')
    localStorage.removeItem('wtf_hints_available')
    localStorage.removeItem('skip_launch_quest')
    localStorage.removeItem('skip_launch_quickie')
    localStorage.removeItem('skip_launch_blitz')
    localStorage.removeItem('skip_launch_quickie_legacy')
    localStorage.removeItem('skip_launch_flash')
    localStorage.removeItem('skip_launch_race')
    localStorage.removeItem('skip_launch_vrai_ou_fou')
    sessionStorage.clear()
    window.location.reload()
  }

  // ─── Selection handlers (AVANT navigation car handleHomeNavigate en dépend) ──
  const { handleSelectDifficulty, handleSelectCategory, handleQuickieMode } = useSelectionHandlers({
    gameMode, sessionType, selectedDifficulty, selectedCategory,
    unlockedFacts,
    initSessionState, handleBlitzStart,
    setSelectedDifficulty, setSelectedCategory, setGameMode, setSessionType,
    setIsQuickPlay, setQuickiePool, setScreen,
    setGameAlert, setMiniParcours,
  })

  // ── Deep-link Quickie : déclenché par ChallengeScreen quand le joueur n'a
  // pas assez de f*cts pour relever le défi et veut explorer la catégorie.
  // ChallengeScreen dépose `wtf_pending_quickie_cat` puis navigate('/'). Ici
  // on consomme le flag et on route vers l'Quickie de la catégorie cible.
  //
  // Ref pattern : handleSelectCategory est re-mémoizé quand gameMode change.
  // On garde une ref toujours à jour pour éviter tout risque de closure stale
  // entre setGameMode('quickie') et l'appel effectif du handler.
  const handleSelectCategoryRef = useRef(handleSelectCategory)
  useEffect(() => { handleSelectCategoryRef.current = handleSelectCategory }, [handleSelectCategory])

  const [pendingQuickieCat, setPendingQuickieCat] = useState(null)
  useEffect(() => {
    const cat = sessionStorage.getItem('wtf_pending_quickie_cat')
    if (!cat) return
    sessionStorage.removeItem('wtf_pending_quickie_cat')
    setGameMode('quickie')
    setSessionType('quickie')
    setPendingQuickieCat(cat)
  }, [])
  useEffect(() => {
    if (!pendingQuickieCat || gameMode !== 'quickie') return
    const cat = pendingQuickieCat
    setPendingQuickieCat(null)
    // Attendre un tick que React ait propagé gameMode='quickie' dans le closure
    // de handleSelectCategory (via la ref, on prend toujours la dernière version).
    setTimeout(() => handleSelectCategoryRef.current?.(cat), 0)
  }, [pendingQuickieCat, gameMode])

  // ─── Navigation, Replay, Share ────────────────────────────────────────────
  const {
    launchModeDestination, handleLaunchStart, showOrSkipLaunch,
    handleHomeNavigate,
    handleSaveTempFacts, completeOnboardingIfNeeded,
    handleHome, handleBlitzReplay, handleQuickieContinue, handleReplay,
    handleShare, handleShareDailyFact, handleShowRules,
  } = useNavigationHandlers({
    launchMode, currentFact, effectiveDailyFact, sessionType, selectedCategory,
    selectedDifficulty,
    quickiePool, unlockedFacts, user, sessionCorrectFacts,
    handleStartFlashSession, handleQuickie, handleSelectDifficulty,
    handleSelectCategory, handleBlitzStart, initSessionState,
    setScreen, setLaunchMode, setGameMode, setSessionType, setSelectedDifficulty,
    setSelectedCategory, setSessionFacts, setCurrentIndex, setSessionScore,
    setCorrectCount, setIsQuickPlay,
    setBlitzFacts, setBlitzResults, setQuickiePool,
    setHintsUsed, setSelectedAnswer, setIsCorrect, setPointsEarned,
    setShowNoEnergyModal, setNoEnergyOrigin, setShowHowToPlay, setGameAlert,
    setStorage,
    clearPendingDuel,
    unlockFact,
  })


  const handleNext = useHandleNext({
    currentIndex, sessionFacts, sessionScore,
    isQuickPlay, sessionCorrectFacts, sessionType, effectiveDailyFact,
    correctCount, isCorrect, sessionAnyHintUsed, selectedAnswer,
    selectedDifficulty, selectedCategory, user,
    totalScore, streak, unlockedFacts, wtfDuJourDate, sessionsToday, wtfCoins,
    setScreen, setCurrentIndex, setHintsUsed, setSelectedAnswer, setIsCorrect,
    setPointsEarned, setStorage, setCoinsEarnedLastSession,
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
        launchMode={launchMode} blitzFacts={blitzFacts} blitzResults={blitzResults} blitzVariant={blitzVariant}
        isChallengeMode={isChallengeMode}
        pendingDuel={pendingDuel}
        lastCreatedDuel={lastCreatedDuel}
        lastCreatedDuelError={lastCreatedDuelError}
        clearLastCreatedDuel={clearLastCreatedDuel}
        clearPendingDuel={clearPendingDuel}
        user={user} storage={storage} streak={streak}
        newlyEarnedBadges={newlyEarnedBadges} showHowToPlay={showHowToPlay}
        quickieEnergy={quickieEnergy}
        modeConfigs={MODE_CONFIGS}
        handleHomeNavigate={handleHomeNavigate} handleHome={handleHome}
        handleSelectDifficulty={handleSelectDifficulty} handleSelectCategory={handleSelectCategory}
        handleSelectAnswer={handleSelectAnswer} handleOpenValidate={handleOpenValidate}
        handleUseHint={handleUseHint} handleTimeout={handleTimeout}
        handleNext={handleNext} handleReplay={handleReplay}
        handleBlitzReplay={handleBlitzReplay} handleBlitzStart={handleBlitzStart}
        handleBlitzFinish={handleBlitzFinish} handleStartFlashSession={handleStartFlashSession}
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
        showNoEnergyModal={showNoEnergyModal}
        noEnergyOrigin={noEnergyOrigin} gameAlert={gameAlert}
        showConnectBanner={showConnectBanner} trophyQueue={trophyQueue}
        miniParcours={miniParcours} showNewCategoriesModal={showNewCategoriesModal}
        newlyUnlockedCategories={newlyUnlockedCategories} showDevPanel={showDevPanel}
        wtfCoins={wtfCoins} storage={storage} effectiveDailyFact={effectiveDailyFact}
        gameMode={gameMode}
        setStreakRewardToast={setStreakRewardToast} setShowStreakSpecialModal={setShowStreakSpecialModal}
        setShowHowToPlay={setShowHowToPlay} setShowSettings={setShowSettings}
        setShowNoEnergyModal={setShowNoEnergyModal}
        setGameAlert={setGameAlert} setShowConnectBanner={setShowConnectBanner}
        setTrophyQueue={setTrophyQueue} setMiniParcours={setMiniParcours}
        setShowNewCategoriesModal={setShowNewCategoriesModal} setShowDevPanel={setShowDevPanel}
        setSessionType={setSessionType} setGameMode={setGameMode} setIsQuickPlay={setIsQuickPlay}
        setSelectedDifficulty={setSelectedDifficulty} setSelectedCategory={setSelectedCategory}
        setQuickiePool={setQuickiePool} setScreen={setScreen} setStorage={setStorage}
        resetOnboarding={resetOnboarding} handleShowRules={handleShowRules}
        handleQuickie={handleQuickie} handleHomeNavigate={handleHomeNavigate}
        showOrSkipLaunch={showOrSkipLaunch} initSessionState={initSessionState}
        devActions={devActions} signInWithGoogle={signInWithGoogle}
      />
    </div>
    </>
  )
}
