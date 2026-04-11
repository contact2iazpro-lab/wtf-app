import { useState, useCallback, useEffect, useRef } from 'react'
import { useScale } from './hooks/useScale'
import { useNavigate } from 'react-router-dom'
import { DIFFICULTY_LEVELS, SCREENS, MODE_CONFIGS, QUESTIONS_PER_GAME, getStreakReward } from './constants/gameConfig'
import TutoTunnel from './components/TutoTunnel'
import {
  getFactsByCategory, getValidFacts, getParcoursFacts, getCategoryLevelFactIds,
  getDailyFact, getTitrePartiel, CATEGORIES, getPlayableCategories, getCategoryById,
  getGeneratedFacts, getGeneratedFactsByCategory, getBlitzFacts,
  getQuestFacts, getFlashFacts,
  initFacts, resetFacts,
} from './data/factsService'
import { pushToServer, syncAfterAction } from './services/playerSyncService'
import { loadStorage, saveStorage, updateTrophyData, TODAY } from './utils/storageHelper'
import { updateCoins, updateTickets, updateHints, getBalances } from './services/currencyService'
import DevPanel from './components/DevPanel'
import { DEV_PANEL_ENABLED } from './config/devConfig'
import { logDevEvent } from './utils/devLogger'
import { getAnswerOptions } from './utils/answers'
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
import SettingsModal from './components/SettingsModal'
import HowToPlayModal from './components/HowToPlayModal'
import ConnectBanner from './components/ConnectBanner'
import NewCategoriesModal from './components/NewCategoriesModal'
import { audio } from './utils/audio'
import { checkBadges } from './utils/badgeManager'
import { useAuth } from './context/AuthContext'
import { updateCollection } from './services/collectionService'
import { supabase } from './lib/supabase'
import GameModal from './components/GameModal'
import { getFlashEnergy, consumeFlashEnergy, buyExtraSession } from './services/energyService'
import { FLASH_ENERGY } from './constants/gameConfig'



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

  // ─── Session starters ────────────────────────────────────────────────────

  const canPlayFlashCheck = () => getFlashEnergy().remaining > 0

  function initSessionState(facts) {
    setSessionFacts(facts)
    setCurrentIndex(0)
    setSessionScore(0)
    setCorrectCount(0)
    setHintsUsed(0)
    setSessionAnyHintUsed(false)
    setSelectedAnswer(null)
    setIsCorrect(null)
    setSessionCorrectFacts([])
    setNewlyUnlockedCategories([])
    setShowNewCategoriesModal(false)
    setCompletedLevels([])
    setSessionIsPerfect(false)
    setPointsEarned(0)
  }

  // Reset complet onboarding
  const resetOnboarding = () => {
    const freshData = {
      gamesPlayed: 0,
      totalScore: 0,
      streak: 0,
      wtfCoins: 0,
      tickets: 0,
      unlockedFacts: [],
      sessionsToday: 0,
      statsByMode: {},
      lastModified: Date.now(),
    }
    localStorage.setItem('wtf_data', JSON.stringify(freshData))
    localStorage.removeItem('tutorial_state')
    localStorage.setItem('wtf_hints_available', '0')
    // Supprimer les skip_launch flags
    localStorage.removeItem('skip_launch_quest')
    localStorage.removeItem('skip_launch_flash')
    localStorage.removeItem('skip_launch_blitz')
    localStorage.removeItem('skip_launch_explorer')
    localStorage.removeItem('skip_launch_hunt')
    // Vider sessionStorage pour repasser par SplashScreen
    sessionStorage.clear()
    // Recharger la page pour repartir du splash
    window.location.reload()
  }

  // WTF du Jour → go to teaser screen
  const handleWTFDuJour = useCallback(() => {
    audio.play('click')
    setScreen(SCREENS.WTF_TEASER)
  }, [])

  // From teaser: start the 5-question Flash session for WTF du Jour
  const handleStartWTFSession = useCallback(() => {
    audio.play('click')
    // Fallback si dailyFact null (mode dev/test)
    let huntFact = effectiveDailyFact
    if (!huntFact) {
      const isDevOrTest = localStorage.getItem('wtf_dev_mode') === 'true' || localStorage.getItem('wtf_test_mode') === 'true'
      if (isDevOrTest) {
        const allValid = getQuestFacts()
        huntFact = allValid.length > 0 ? allValid[Math.floor(Math.random() * allValid.length)] : getValidFacts()[0]
      }
      if (!huntFact) {
        setGameAlert({ emoji: '⏳', title: 'Patience', message: 'Le f*ct du jour n\'est pas encore chargé. Réessaie dans quelques secondes !' })
        return
      }
    }
    const category = huntFact.category
    const skipUnlock = localStorage.getItem('wtf_dev_mode') === 'true' || localStorage.getItem('wtf_test_mode') === 'true'
    // Session : Funny Facts (non-VIP) uniquement, même catégorie, exclure débloqués
    let pool = getGeneratedFacts().filter(f => f.category === category && f.id !== huntFact.id && (skipUnlock || !unlockedFacts.has(f.id)))
    if (pool.length < 5) {
      pool = getGeneratedFacts().filter(f => f.id !== huntFact.id && (skipUnlock || !unlockedFacts.has(f.id)))
    }
    const facts = [...pool]
      .sort(() => Math.random() - 0.5)
      .slice(0, 5)
      .map(fact => ({ ...fact, ...getAnswerOptions(fact, DIFFICULTY_LEVELS.HUNT) }))
    setSessionType('wtf_du_jour')
    setGameMode('solo')
    setIsQuickPlay(false)
    setSelectedDifficulty(DIFFICULTY_LEVELS.HUNT)
    setSelectedCategory(category)
    initSessionState(facts)
    logDevEvent('session_started', { type: 'wtf_du_jour', category, factId: huntFact.id })
    setScreen(SCREENS.QUESTION)
  }, [effectiveDailyFact, unlockedFacts])

  // Standalone Flash Solo session — non-VIP facts only, 5 questions, gratuit
  const GUEST_CATEGORIES = ['kids', 'animaux', 'sport', 'records', 'definition']
  const handleFlashSolo = useCallback(() => {
    audio.play('click')

    // DEPRECATED: Tutorial logic moved to TutoTunnel component

    // Pool : facts non-VIP uniquement, exclure les déjà débloqués
    // Non connecté : catégories limitées
    const isDevMode = localStorage.getItem('wtf_dev_mode') === 'true'
    const isTestMode = localStorage.getItem('wtf_test_mode') === 'true'
    const skipUnlock = isDevMode || isTestMode
    const pool = getGeneratedFacts().filter(f =>
      skipUnlock || !unlockedFacts.has(f.id)
    )

    if (pool.length < 5) {
      if (isDevMode) {
        pool.push(...getGeneratedFacts().filter(f => !pool.some(p => p.id === f.id)))
      }
      if (pool.length === 0) {
        setGameAlert({ emoji: '🎉', title: 'Bientôt !', message: 'De nouveaux f*cts arrivent bientôt. Reviens vite !' })
        return
      }
      if (pool.length < 5) {
        const price = pool.length === 1 ? 5 : 10
        const preparedFacts = [...pool].sort(() => Math.random() - 0.5)
          .map(fact => ({ ...fact, ...getAnswerOptions(fact, DIFFICULTY_LEVELS.FLASH) }))
        setMiniParcours({ pool: preparedFacts, price, mode: 'flash', categoryId: null, difficulty: DIFFICULTY_LEVELS.FLASH })
        return
      }
    }

    const facts = [...pool]
      .sort(() => Math.random() - 0.5)
      .slice(0, 5)
      .map(fact => ({ ...fact, ...getAnswerOptions(fact, DIFFICULTY_LEVELS.FLASH) }))

    setSessionType('flash_solo')
    setGameMode('solo')
    setIsQuickPlay(false)
    setSelectedDifficulty(DIFFICULTY_LEVELS.FLASH)
    setSelectedCategory(null)
    consumeFlashEnergy()
    initSessionState(facts)
    setScreen(SCREENS.QUESTION)
  }, [unlockedFacts, user])

  // Quick play — no streak/score save (existing behavior kept)
  const handleQuickPlay = useCallback(() => {
    const childMode = localStorage.getItem('wtf_child_mode') !== 'false'
    const validCats = getPlayableCategories().filter(cat =>
      getValidFacts().some(f => f.category === cat.id) &&
      (childMode || cat.id !== 'kids')
    )
    const randomCat = validCats[Math.floor(Math.random() * validCats.length)]
    const difficulty = DIFFICULTY_LEVELS.HOT
    const facts = [...getValidFacts().filter(f => f.category === randomCat.id)]
      .sort(() => Math.random() - 0.5)
      .slice(0, QUESTIONS_PER_GAME)
      .map(fact => ({ ...fact, ...getAnswerOptions(fact, difficulty) }))

    setSessionType('parcours')
    setIsQuickPlay(true)
    setGameMode('solo')
    setSelectedDifficulty(difficulty)
    setSelectedCategory(randomCat.id)
    initSessionState(facts)
    setScreen(SCREENS.QUESTION)
  }, [])

  // Solo parcours flow — Quest : VIP facts only, random toutes catégories, direct
  const handlePlay = useCallback(() => {
    audio.play('click')
    const difficulty = DIFFICULTY_LEVELS.HOT
    // Pool : facts VIP uniquement (type = 'vip' ou sans type = VIP par défaut)
    let pool = getQuestFacts()
    // Exclure les facts déjà débloqués pour plus de variété
    const skipUnlockQ = localStorage.getItem('wtf_dev_mode') === 'true' || localStorage.getItem('wtf_test_mode') === 'true'
    if (!skipUnlockQ) {
      const unplayed = pool.filter(f => !unlockedFacts.has(f.id))
      if (unplayed.length >= QUESTIONS_PER_GAME) pool = unplayed
    }

    const facts = [...pool]
      .sort(() => Math.random() - 0.5)
      .slice(0, QUESTIONS_PER_GAME)
      .map(fact => ({ ...fact, ...getAnswerOptions(fact, difficulty) }))

    setSessionType('parcours')
    setGameMode('solo')
    setIsQuickPlay(false)
    setSelectedDifficulty(difficulty)
    setSelectedCategory(null)
    initSessionState(facts)
    setScreen(SCREENS.QUESTION)
  }, [unlockedFacts])

  // ─── HomeScreen navigation handler ──────────────────────────────────────────
  // ─── Launch mode start callback ─────────────────────────────────────────────
  const launchModeDestination = useCallback((mode) => {

    switch (mode) {
      case 'quest':    setScreen(SCREENS.DIFFICULTY); break
      case 'blitz':    setScreen(SCREENS.BLITZ_LOBBY); break
      case 'explorer':
      case 'marathon': setScreen(SCREENS.CATEGORY); break
      case 'flash': {
        setScreen(SCREENS.CATEGORY)
        break
      }
      case 'hunt':     handleStartWTFSession(); break
      default: break
    }
  }, [handleFlashSolo, handleStartWTFSession])

  const handleLaunchStart = useCallback(() => {
    launchModeDestination(launchMode)
  }, [launchMode, launchModeDestination])

  // Show MODE_LAUNCH or skip if user opted out
  const showOrSkipLaunch = useCallback((mode) => {
    setLaunchMode(mode)
    const skip = localStorage.getItem(`skip_launch_${mode}`) === 'true'
    if (skip) {
      launchModeDestination(mode)
    } else {
      setScreen(SCREENS.MODE_LAUNCH)
    }
  }, [launchModeDestination])

  const handleHomeNavigate = useCallback((target) => {
    switch (target) {
      case 'difficulty': {
        // Quest migré vers /quest route
        navigate('/quest')
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
      case 'marathon': {
        const isDevOrTest2 = localStorage.getItem('wtf_dev_mode') === 'true' || localStorage.getItem('wtf_test_mode') === 'true'
        if (!isDevOrTest2 && !canPlayFlashCheck()) { setNoEnergyOrigin('marathon'); setShowNoEnergyModal(true); break }
        setGameMode('marathon')
        setSessionType('marathon')
        const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
        // Si c'est la première visite à Explorer (explorerPlayedInMode === 0), lancer directement sans règles
        const explorerPlayedInMode = wd.statsByMode?.flash_solo?.gamesPlayed || 0
        if (explorerPlayedInMode === 0) {
          launchModeDestination('explorer')
        } else {
          showOrSkipLaunch('explorer')
        }
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
      default: break
    }
  }, [handlePlay, handleWTFDuJour, handleFlashSolo, handleStartWTFSession, showOrSkipLaunch, navigate])

  const handleSelectDifficulty = useCallback((difficulty) => {
    setSelectedDifficulty(difficulty)

    const skipUnlockM = localStorage.getItem('wtf_dev_mode') === 'true' || localStorage.getItem('wtf_test_mode') === 'true'

    if (gameMode === 'marathon') {
      // Marathon : 20 questions générées (non-VIP) dans la catégorie choisie
      // THÈME B Point 5: Mode Aléatoire utilise TOUS les funny facts
      let pool
      if (selectedCategory === null) {
        // Mode Aléatoire : tous les funny facts
        pool = getGeneratedFacts().filter(f => skipUnlockM || !unlockedFacts.has(f.id))
      } else {
        // Catégorie choisie
        pool = getGeneratedFactsByCategory(selectedCategory).filter(f => skipUnlockM || !unlockedFacts.has(f.id))
      }

      // Dev mode fallback : inclure les déjà débloqués
      if (pool.length < 4 && skipUnlockM) {
        if (selectedCategory === null) {
          pool = getGeneratedFacts()
        } else {
          pool = getGeneratedFactsByCategory(selectedCategory)
        }
      }

      if (pool.length === 0) {
        setGameAlert({ emoji: '🎉', title: 'Bientôt !', message: 'De nouveaux f*cts arrivent bientôt dans cette catégorie !' })
        return
      }
      if (pool.length < 4) {
        const price = pool.length === 1 ? 5 : 10
        const preparedFacts = [...pool].sort(() => Math.random() - 0.5)
          .map(fact => ({ ...fact, ...getAnswerOptions(fact, difficulty) }))
        setMiniParcours({ pool: preparedFacts, price, mode: 'explorer', categoryId: selectedCategory, difficulty })
        return
      }

      const facts = [...pool]
        .sort(() => Math.random() - 0.5)
        .slice(0, 20)
        .map(fact => ({ ...fact, ...getAnswerOptions(fact, difficulty) }))
      setIsQuickPlay(false)
      setSessionType('marathon')
      initSessionState(facts)
      setScreen(SCREENS.QUESTION)
      return
    }

    // Parcours/Quest : VIP uniquement, filtrés par difficulté — coûte 1 ticket
    const isDevModeQuest = localStorage.getItem('wtf_dev_mode') === 'true' || localStorage.getItem('wtf_test_mode') === 'true'
    const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    const isFirstQuestEver = !wd.onboardingCompleted && (wd.questsPlayed || 0) === 0
    if (!isDevModeQuest && !isFirstQuestEver) {
      if ((tickets || 0) < 1) {
        setShowNoTicketModal(true)
        return
      }
      // Décrémenter 1 ticket
      updateTickets(-1)
      setStorage(loadStorage())
    }

    const skipUnlockD = localStorage.getItem('wtf_dev_mode') === 'true' || localStorage.getItem('wtf_test_mode') === 'true'
    // Pool Quest : VIP avec difficulté, puis fallback élargi
    let available = getParcoursFacts().filter(f =>
      f.isVip && f.difficulty === difficulty.id && (skipUnlockD || !unlockedFacts.has(f.id))
    )
    // Fallback 1 : ignorer le filtre difficulty
    if (available.length < QUESTIONS_PER_GAME) {
      available = getParcoursFacts().filter(f =>
        f.isVip && (skipUnlockD || !unlockedFacts.has(f.id))
      )
    }
    // Fallback 2 : tous les VIP valides (sans filtre difficulty)
    if (available.length < QUESTIONS_PER_GAME) {
      available = getQuestFacts()
    }
    // Fallback 3 : tous les facts valides
    if (available.length < QUESTIONS_PER_GAME) {
      available = getValidFacts()
    }
    const facts = [...available]
      .sort(() => Math.random() - 0.5)
      .slice(0, QUESTIONS_PER_GAME)
      .map(fact => ({ ...fact, ...getAnswerOptions(fact, difficulty) }))
    setIsQuickPlay(false)
    setGameMode('solo')
    setSelectedCategory(null)
    setSessionType('parcours')
    initSessionState(facts)
    setScreen(SCREENS.QUESTION)
  }, [unlockedFacts, gameMode, selectedCategory])

  const handleMarathonMode = useCallback(() => {
    setGameMode('marathon')
    setSessionType('marathon')
    setScreen(SCREENS.CATEGORY)
  }, [])

  // ─── Blitz start ───────────────────────────────────────────────────────────
  const handleBlitzStart = useCallback((categoryId, questionCount) => {
    audio.play('click')
    // Blitz = facts déjà débloqués uniquement (mode rapidité)
    let pool = getBlitzFacts()
    if (categoryId) pool = pool.filter(f => f.category === categoryId)

    if (pool.length < 4) {
      setGameAlert({ emoji: '🔓', title: 'Pas assez de f*cts', message: 'Joue en mode Jouer ou Quest pour débloquer plus de f*cts avant de jouer en Blitz !' })
      return
    }

    const count = questionCount || pool.length
    const shuffled = [...pool]
      .sort(() => Math.random() - 0.5)
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

    // Track Blitz stats + bestBlitzTime
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
      // Record = meilleur temps (le plus bas)
      if (!wtfData.bestBlitzTime || finalTime < wtfData.bestBlitzTime) {
        wtfData.bestBlitzTime = finalTime
        isNewRecord = true
      }
      bestTime = wtfData.bestBlitzTime
      // Sauvegarder le record par catégorie + palier
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
      // Blitz perfect (0 erreurs)
      if (correctCount === totalAnswered && totalAnswered > 0) {
        wtfData.blitzPerfects = (wtfData.blitzPerfects || 0) + 1
      }
      wtfData.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(wtfData))
    } catch { /* ignore */ }

    updateTrophyData()

    // Check badges après Blitz
    const newBadges = checkBadges()
    if (newBadges.length > 0) setNewlyEarnedBadges(newBadges)

    // Complete challenge if active
    const challengeJson = localStorage.getItem('wtf_active_challenge')
    if (challengeJson && user) {
      try {
        const challengeInfo = JSON.parse(challengeJson)
        localStorage.removeItem('wtf_active_challenge')
        import('./data/challengeService').then(({ completeChallenge: complete }) => {
          complete({
            challengeId: challengeInfo.challengeId,
            playerTime: finalTime,
            playerId: user.id,
            playerName: user.user_metadata?.name || 'Joueur WTF!',
          }).catch(e => console.warn('Challenge complete error:', e))
        })
      } catch { /* ignore */ }
    }

    if (isChallengeMode) {
      // Mode défi : créer le défi automatiquement et afficher l'écran de partage
      const challengeData = {
        finalTime, correctCount, totalAnswered, penalties, bestTime, isNewRecord,
        categoryId: selectedCategory,
        categoryLabel: selectedCategory ? (getCategoryById(selectedCategory)?.label || selectedCategory) : 'Toutes catégories',
        questionCount: totalAnswered,
      }
      setBlitzResults(challengeData)
      setScreen(SCREENS.BLITZ_RESULTS)

      // Créer le défi dans Supabase automatiquement
      if (user) {
        import('./data/challengeService').then(({ createChallenge }) => {
          createChallenge({
            categoryId: selectedCategory || 'all',
            categoryLabel: challengeData.categoryLabel,
            questionCount: totalAnswered,
            playerTime: finalTime,
            playerId: user.id,
            playerName: user.user_metadata?.name || 'Joueur WTF!',
          }).then(challenge => {
            // Stocker le challenge créé pour que BlitzResultsScreen puisse le partager
            localStorage.setItem('wtf_auto_challenge', JSON.stringify(challenge))
            window.dispatchEvent(new Event('wtf_challenge_created'))
          }).catch(e => console.warn('Auto challenge creation failed:', e))
        })
      }
      setIsChallengeMode(false)
      return
    }

    setBlitzResults({ finalTime, correctCount, totalAnswered, penalties, bestTime, isNewRecord })
    setScreen(SCREENS.BLITZ_RESULTS)
  }, [user, navigate, isChallengeMode, selectedCategory])

  const handleSelectCategory = useCallback((categoryId) => {
    // Blitz : démarrer directement sans choisir la difficulté
    if (gameMode === 'blitz') {
      handleBlitzStart(categoryId)
      return
    }

    // Explorer : 10 questions, garder le pool restant pour continuation
    if (gameMode === 'marathon') {
      const difficulty = DIFFICULTY_LEVELS.HOT
      const skipUnlockE = localStorage.getItem('wtf_dev_mode') === 'true' || localStorage.getItem('wtf_test_mode') === 'true'
      let pool = getGeneratedFactsByCategory(categoryId).filter(f => skipUnlockE || !unlockedFacts.has(f.id))
      // Dev mode fallback : inclure les déjà débloqués
      if (pool.length < 4 && skipUnlockE) {
        pool = getGeneratedFactsByCategory(categoryId)
      }
      if (pool.length === 0) {
        setGameAlert({ emoji: '🎉', title: 'Bientôt !', message: 'De nouveaux f*cts arrivent bientôt dans cette catégorie !' })
        return
      }
      if (pool.length < 4) {
        const price = pool.length === 1 ? 5 : 10
        const preparedFacts = [...pool].sort(() => Math.random() - 0.5)
          .map(fact => ({ ...fact, ...getAnswerOptions(fact, difficulty) }))
        setMiniParcours({ pool: preparedFacts, price, mode: 'explorer', categoryId, difficulty })
        return
      }

      const shuffled = [...pool].sort(() => Math.random() - 0.5)
      const sessionFacts = shuffled.slice(0, 5).map(fact => ({ ...fact, ...getAnswerOptions(fact, difficulty) }))
      const remaining = shuffled.slice(5) // pool restant pour continuation
      setExplorerPool(remaining)
      setSelectedCategory(categoryId)
      setSelectedDifficulty(difficulty)
      setIsQuickPlay(false)
      setSessionType('marathon')
      consumeFlashEnergy()
      initSessionState(sessionFacts)
      setScreen(SCREENS.QUESTION)
      return
    }

    let facts = []

    if (categoryId === null) {
      const childMode = localStorage.getItem('wtf_child_mode') !== 'false'
      const validCategories = getPlayableCategories().filter(cat =>
        getValidFacts().some(f => f.category === cat.id) &&
        (childMode || cat.id !== 'kids')
      )

      if (validCategories.length < 10) {
        facts = [...getValidFacts()].sort(() => Math.random() - 0.5).slice(0, QUESTIONS_PER_GAME)
      } else {
        const selectedCats = [...validCategories].sort(() => Math.random() - 0.5).slice(0, QUESTIONS_PER_GAME)
        facts = selectedCats.map(cat => {
          const catFacts = getValidFacts().filter(f => f.category === cat.id)
          return catFacts[Math.floor(Math.random() * catFacts.length)]
        })
        facts.sort(() => Math.random() - 0.5)
      }
    } else {
      facts = [...getFactsByCategory(categoryId)].sort(() => Math.random() - 0.5).slice(0, QUESTIONS_PER_GAME)
    }

    const factsWithOptions = facts.map(fact => ({
      ...fact,
      ...getAnswerOptions(fact, selectedDifficulty)
    }))

    setSelectedCategory(categoryId)
    if (sessionType === 'flash_solo' || sessionType === 'marathon') consumeFlashEnergy()
    initSessionState(factsWithOptions)
    setScreen(SCREENS.QUESTION)
  }, [selectedDifficulty, gameMode, sessionType, handleBlitzStart])

  // ─── Answer handlers ─────────────────────────────────────────────────────

  const handleSelectAnswer = useCallback((answerIndex) => {
    if (!currentFact) return
    const isAnswerCorrect = answerIndex === currentFact.correctIndex

    let points = 0
    if (isAnswerCorrect) {
      if (selectedDifficulty.coinsPerCorrect !== undefined) {
        // Nouveau système : récompense fixe, pas de dégradation par indice
        points = selectedDifficulty.coinsPerCorrect
        // Mode Jouer avec catégorie choisie → 1 coin au lieu de 2
        if (sessionType === 'flash_solo' && selectedCategory !== null) {
          points = 1
        }
      } else {
        // Legacy (Flash) : dégradation selon les indices utilisés
        const sc = selectedDifficulty.scoring.correct
        points = Array.isArray(sc) ? (sc[hintsUsed] ?? sc[sc.length - 1]) : sc
      }
    }

    setSelectedAnswer(answerIndex)
    setIsCorrect(isAnswerCorrect)
    setPointsEarned(points)

    if (isAnswerCorrect && currentFact) {
      setSessionCorrectFacts(prev => [...prev, currentFact])
    }

    if (gameMode === 'duel') {
      setDuelPlayers(ps => ps.map((p, i) => i === duelCurrentPlayerIndex ? { ...p, score: p.score + points } : p))
    } else {
      setSessionScore(s => s + points)
      if (isAnswerCorrect) setCorrectCount(c => c + 1)
      // Sauvegarde coins en temps réel (listener synchronise le state automatiquement)
      if (points > 0) {
        updateCoins(points)
      }

      // Explorer/Marathon : sauvegarder le f*ct débloqué immédiatement (pas attendre la fin de session)
      if (isAnswerCorrect && currentFact && (sessionType === 'marathon' || sessionType === 'flash_solo')) {
        setStorage(prev => {
          const newUnlocked = new Set(prev.unlockedFacts)
          if (!newUnlocked.has(currentFact.id)) {
            // Pendant le tuto : ne pas ajouter ce fact à la collection
            const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
            const shouldUnlock = wd.onboardingCompleted
            if (shouldUnlock) {
              newUnlocked.add(currentFact.id)
              const next = { ...prev, unlockedFacts: newUnlocked }
              saveStorage(next)

              // THÈME B Point 1: Débloquer la catégorie si elle n'est pas déjà débloquée
              const unlockedCategories = wd.unlockedCategories || ['sport', 'records', 'animaux', 'kids', 'definition']
              if (currentFact.category && !unlockedCategories.includes(currentFact.category)) {
                unlockedCategories.push(currentFact.category)
                wd.unlockedCategories = unlockedCategories
                wd.lastModified = Date.now()
                localStorage.setItem('wtf_data', JSON.stringify(wd))
                // Enregistrer la catégorie comme nouvellement débloquée durant cette session
                setNewlyUnlockedCategories(prev => {
                  if (!prev.includes(currentFact.category)) {
                    return [...prev, currentFact.category]
                  }
                  return prev
                })
              }

              if (user) {
                import('./services/collectionService').then(({ updateCollection }) => {
                  updateCollection(user.id, currentFact.category, currentFact.id)
                })
              }
              return next
            }
          }
          return prev
        })
      }
    }

    setScreen(SCREENS.REVELATION)
  }, [currentFact, gameMode, duelCurrentPlayerIndex, hintsUsed, selectedDifficulty, sessionType, user])

  const handleOpenValidate = useCallback((isCorrect) => {
    let points = 0
    if (isCorrect) {
      if (selectedDifficulty.coinsPerCorrect !== undefined) {
        points = selectedDifficulty.coinsPerCorrect
        // Mode Jouer avec catégorie choisie → 1 coin au lieu de 2
        if (sessionType === 'flash_solo' && selectedCategory !== null) {
          points = 1
        }
      } else {
        // Legacy (Hunt) : dégradation selon les indices utilisés
        const sc = selectedDifficulty.scoring.correct
        points = Array.isArray(sc) ? (sc[hintsUsed] ?? sc[sc.length - 1]) : sc
      }
    }

    setSelectedAnswer(isCorrect ? 100 : -2)
    setIsCorrect(isCorrect)
    setPointsEarned(points)

    if (isCorrect && currentFact) {
      setSessionCorrectFacts(prev => [...prev, currentFact])
    }

    if (gameMode === 'duel') {
      setDuelPlayers(ps => ps.map((p, i) => i === duelCurrentPlayerIndex ? { ...p, score: p.score + points } : p))
    } else {
      setSessionScore(s => s + points)
      if (isCorrect) setCorrectCount(c => c + 1)
      // Sauvegarde coins en temps réel (listener synchronise le state automatiquement)
      if (points > 0) {
        updateCoins(points)
      }
    }

    setScreen(SCREENS.REVELATION)
  }, [hintsUsed, gameMode, duelCurrentPlayerIndex, currentFact, selectedDifficulty, sessionType, selectedCategory])

  const handleTimeout = useCallback(() => {
    if (selectedAnswer !== null) return
    setSelectedAnswer(-1)
    setIsCorrect(false)
    setPointsEarned(0)
    setScreen(SCREENS.REVELATION)
  }, [selectedAnswer])

  const handleUseHint = useCallback((hintNum) => {
    // Vérifier si l'indice est payant (au-delà des indices gratuits)
    const freeHints = selectedDifficulty?.freeHints || 0
    const isPaidHint = hintNum > freeHints

    // Si indice payant, consommer du stock
    if (isPaidHint) {
      if (getBalances().hints < 1) return
      updateHints(-1)
    }

    setHintsUsed(hintNum)
    setSessionAnyHintUsed(true)
  }, [selectedDifficulty])

  // ─── Navigation (next question / session end) ─────────────────────────────

  const handleNext = useCallback(() => {
    try {
    const nextIndex = currentIndex + 1

    if (gameMode === 'duel') {
      if (nextIndex >= Math.floor(sessionFacts.length / numPlayers)) {
        setScreen(SCREENS.DUEL_RESULTS)
      } else {
        setCurrentIndex(nextIndex)
        setDuelCurrentPlayerIndex(0)
        setHintsUsed(0)
        setSelectedAnswer(null)
        setIsCorrect(null)
        setPointsEarned(0)
        setScreen(SCREENS.DUEL_PASS)
      }
      return
    }

    // Solo modes
    if (nextIndex >= sessionFacts.length) {
      // Session complete
      const isFirstSessionToday = sessionsToday === 0
      const newStreak = isFirstSessionToday ? streak + 1 : streak
      const newSessionsToday = sessionsToday + 1

      if (!isQuickPlay) {
        // Unlock correctly answered facts (joueurs connectés ou mode dev)
        const newUnlocked = new Set(unlockedFacts)
        const toSync = []
        {
          // Pendant le tuto : ne pas ajouter les facts à la collection
          const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
          const isOnboarding = !wd.onboardingCompleted

          for (const fact of sessionCorrectFacts) {
            if (!newUnlocked.has(fact.id)) {
              const shouldUnlock = !isOnboarding
              if (shouldUnlock) {
                newUnlocked.add(fact.id)
                toSync.push(fact)
              }
            }
          }
        }

        // Detect newly completed category+difficulty levels (parcours only)
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

        // THÈME B Point 1: Débloquer les catégories pour la Quest aussi (parcours)
        if (sessionType === 'parcours') {
          const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
          const unlockedCategories = wd.unlockedCategories || ['sport', 'records', 'animaux', 'kids', 'definition']
          const newlyUnlockedCats = []

          for (const fact of toSync) {
            if (fact.category && !unlockedCategories.includes(fact.category)) {
              unlockedCategories.push(fact.category)
              if (!newlyUnlockedCats.includes(fact.category)) {
                newlyUnlockedCats.push(fact.category)
              }
            }
          }

          if (newlyUnlockedCats.length > 0) {
            wd.unlockedCategories = unlockedCategories
            wd.lastModified = Date.now()
            localStorage.setItem('wtf_data', JSON.stringify(wd))
            setNewlyUnlockedCategories(newlyUnlockedCats)
          }
        }

        // Badge Perfect (Quest uniquement) — indices autorisés
        const isPerfectSession = sessionType === 'parcours' && correctCount === sessionFacts.length
        if (isPerfectSession) {
          const catKey = selectedCategory || 'all'
          const diffKey = selectedDifficulty?.id || 'unknown'
          localStorage.setItem(`wtf_perfect_${catKey}_${diffKey}`, 'true')
        }
        setSessionIsPerfect(isPerfectSession)

        // Première partie "Jouer" : offrir 1 ticket pour débloquer Quest
        let firstFlashTicketGiven = false
        if (sessionType === 'flash_solo') {
          try {
            const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
            const isFirstFlash = !wd.onboardingCompleted && !wd.firstFlashTicketGiven
            if (isFirstFlash) {
              wd.firstFlashTicketGiven = true
              wd.lastModified = Date.now()
              localStorage.setItem('wtf_data', JSON.stringify(wd))
              updateTickets(1)
              firstFlashTicketGiven = true
            }
          } catch {}
        }

        // Bonus coins fin de session (les coins de base sont déjà sauvés en temps réel)
        let bonusCoins = 0
        if (sessionType === 'wtf_du_jour') {
          bonusCoins = 10 // Hunt: flat bonus
        } else if (sessionType === 'flash_solo') {
          const isPerfectFlash = correctCount + (isCorrect ? 1 : 0) === sessionFacts.length && !sessionAnyHintUsed && (selectedAnswer !== -1)
          bonusCoins = isPerfectFlash ? 10 : 0 // Flash: perfect bonus only
        } else if (sessionType === 'parcours') {
          bonusCoins = isPerfectSession ? 10 : 0 // Quest: perfect bonus (10 coins + 1 ticket)
        } else if (sessionType === 'marathon') {
          const isPerfectExplorer = correctCount + (isCorrect ? 1 : 0) === sessionFacts.length
          bonusCoins = isPerfectExplorer ? 10 : 0 // Explorer: perfect 5/5 bonus
        }
        setCoinsEarnedLastSession(sessionScore + bonusCoins)

        // Récompenses fidélité Streak (uniquement si 1re session du jour → streak incrémenté)
        const streakReward = isFirstSessionToday ? getStreakReward(newStreak) : null
        if (streakReward) {
          if (streakReward.hints > 0) {
            updateHints(streakReward.hints)
          }
          if (streakReward.badge) {
            localStorage.setItem(`wtf_badge_streak_${newStreak}`, 'true')
          }
          if (streakReward.special === 'wtf_premium') {
            setShowStreakSpecialModal(true)
          } else {
            // Ne pas afficher le toast streak pendant l'onboarding
            const wtfDataStreak = JSON.parse(localStorage.getItem('wtf_data') || '{}')
            if (wtfDataStreak.onboardingCompleted) {
              setStreakRewardToast({ days: newStreak, reward: streakReward })
            }
          }
        }

        const streakRewardCoins = streakReward?.coins ?? 0
        const newWtfDuJourDate = sessionType === 'wtf_du_jour' ? TODAY() : wtfDuJourDate
        const marathonSessionsToday = sessionType === 'marathon' ? sessionsToday : newSessionsToday

        // Créditer bonus via currencyService (push Supabase immédiat)
        const totalBonusCoins = bonusCoins + streakRewardCoins
        const totalBonusTickets = (isPerfectSession ? 1 : 0) + (streakReward?.tickets ?? 0)
        if (totalBonusCoins > 0) updateCoins(totalBonusCoins)
        if (totalBonusTickets > 0) updateTickets(totalBonusTickets)

        // Utiliser setStorage fonctionnel pour éviter la closure stale sur wtfCoins/tickets
        setStorage(prev => {
          const newStorage = {
            totalScore: totalScore + sessionScore,
            streak: newStreak,
            unlockedFacts: newUnlocked,
            wtfCoins: getBalances().coins,
            wtfDuJourDate: newWtfDuJourDate,
            sessionsToday: marathonSessionsToday,
            tickets: getBalances().tickets,
            wtfDuJourFait: newWtfDuJourDate === TODAY(),
          }
          saveStorage(newStorage)

          if (user) {
            for (const fact of toSync) {
              updateCollection(user.id, fact.category, fact.id)
            }
            syncAfterAction(user.id)
          }

          return newStorage
        })

        // WTF du Jour: unlock the daily fact too
        if (sessionType === 'wtf_du_jour' && effectiveDailyFact && !newUnlocked.has(effectiveDailyFact.id)) {
          newUnlocked.add(effectiveDailyFact.id)
          setStorage(prev => {
            const updated = { ...prev, unlockedFacts: newUnlocked }
            saveStorage(updated)
            return updated
          })
          if (user) updateCollection(user.id, effectiveDailyFact.category, effectiveDailyFact.id)
        }
      }

      // Track stats par mode
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
        // Stats globales
        wtfData.gamesPlayed = (wtfData.gamesPlayed || 0) + 1
        if (sessionType === 'parcours') {
          wtfData.questsPlayed = (wtfData.questsPlayed || 0) + 1
        }
        wtfData.totalCorrect = (wtfData.totalCorrect || 0) + correctCount + (isCorrect ? 1 : 0)
        wtfData.totalAnswered = (wtfData.totalAnswered || 0) + sessionFacts.length
        wtfData.lastModified = Date.now()
        localStorage.setItem('wtf_data', JSON.stringify(wtfData))
        // Rafraîchir le state React pour que HomeScreen lise les seuils à jour
        window.dispatchEvent(new Event('wtf_storage_sync'))
      } catch { /* ignore */ }

      // Recalculer les données trophées (facts par catégorie, VIP/Funny counts)
      updateTrophyData()

      // Check badges après mise à jour des stats → afficher les modals trophées
      const newBadges = checkBadges()
      if (newBadges.length > 0) {
        // Utiliser uniquement trophyQueue (modal overlay) — pas newlyEarnedBadges
        // pour éviter le doublon avec la modal HomeScreen
        setTrophyQueue(newBadges)
      }

      // Route to appropriate end screen
      if (sessionType === 'wtf_du_jour') {
        setScreen(SCREENS.WTF_REVEAL)
      } else if (sessionType === 'marathon') {
        setScreen(SCREENS.MARATHON_RESULTS)
      } else {
        // Première Flash ou première Quest onboarding : modale fact débloqué au lieu de ResultsScreen
        const wtfDataOnb = JSON.parse(localStorage.getItem('wtf_data') || '{}')
        const totalGames = wtfDataOnb.gamesPlayed || 0

        // Failsafe: force onboarding complete if > 3 games played
        if (totalGames > 3 && !wtfDataOnb.onboardingCompleted) {
          wtfDataOnb.onboardingCompleted = true
          wtfDataOnb.lastModified = Date.now()
          localStorage.setItem('wtf_data', JSON.stringify(wtfDataOnb))
          // Cleanup tutorial IDs
          localStorage.removeItem('wtf_tuto_used_ids')
        }

        const isOnboardingSession = !wtfDataOnb.onboardingCompleted
        const tutoPhase = wtfDataOnb.tutoPhase || 0

        if (isOnboardingSession && sessionType !== 'wtf_du_jour') {
          // TUTORIAL FLOW — 4 phases based on tutoPhase

          // PHASE 0 — First fact (1 question)
          if (tutoPhase === 0 && sessionType === 'parcours' && sessionFacts.length === 1) {
            try {
              // Optionally unlock the first fact if correct
              if (isCorrect) {
                const firstFactId = parseInt(localStorage.getItem('wtf_tuto_first_fact_id') || '0')
                if (firstFactId) {
                  const unlocked = wtfDataOnb.unlockedFacts || []
                  if (!unlocked.includes(firstFactId)) {
                    unlocked.push(firstFactId)
                    wtfDataOnb.unlockedFacts = unlocked
                  }
                }
              }
              wtfDataOnb.tutoPhase = 1
              wtfDataOnb.gamesPlayed = (wtfDataOnb.gamesPlayed || 0) + 1
              wtfDataOnb.lastModified = Date.now()
              localStorage.setItem('wtf_data', JSON.stringify(wtfDataOnb))
            } catch { /* ignore */ }
            setScreen(SCREENS.HOME)
            return
          }

          // DEPRECATED: Tutorial logic moved to TutoTunnel component
        }

        // THÈME B Point 2: Afficher la modal des catégories débloquées si nécessaire
        if (newlyUnlockedCategories.length > 0) {
          setShowNewCategoriesModal(true)
        }

        setScreen(SCREENS.RESULTS)
      }
    } else {
      setCurrentIndex(nextIndex)
      setHintsUsed(0)
      setSelectedAnswer(null)
      setIsCorrect(null)
      setPointsEarned(0)
      setScreen(SCREENS.QUESTION)
    }
    } catch (err) { console.error('[handleNext] CRASH:', err); setScreen(SCREENS.RESULTS) }
  }, [gameMode, currentIndex, sessionFacts.length, sessionScore, totalScore, streak, sessionsToday,
      isQuickPlay, sessionCorrectFacts, unlockedFacts, user, sessionType, wtfCoins, wtfDuJourDate,
      effectiveDailyFact, correctCount, isCorrect, sessionAnyHintUsed, selectedAnswer])

  // ─── Duel handlers ────────────────────────────────────────────────────────

  const handleDuelNextPlayer = useCallback(() => {
    setDuelCurrentPlayerIndex(i => i + 1)
    setHintsUsed(0)
    setSelectedAnswer(null)
    setIsCorrect(null)
    setPointsEarned(0)
    setScreen(SCREENS.DUEL_PASS)
  }, [])

  const handleDuelMode = useCallback(() => {
    setGameMode('duel')
    setSessionType('duel')
    setScreen(SCREENS.DUEL_SETUP)
  }, [])

  const handleDuelStart = useCallback((playerNames) => {
    const n = playerNames.length
    const allFacts = getFactsByCategory(null)
    const shuffled = [...allFacts].sort(() => Math.random() - 0.5).slice(0, QUESTIONS_PER_GAME * n)

    setDuelPlayers(playerNames.map(name => ({ name, score: 0 })))
    setDuelCurrentPlayerIndex(0)
    setGameMode('duel')
    initSessionState(shuffled)
    setScreen(SCREENS.DUEL_PASS)
  }, [])

  const handleDuelPassReady = useCallback(() => setScreen(SCREENS.QUESTION), [])
  const handleDuelReplay = useCallback(() => handleDuelStart(duelPlayers.map(p => p.name)), [duelPlayers, handleDuelStart])

  // ─── Home / Replay ────────────────────────────────────────────────────────

  // Persister les facts temporaires après connexion Google (depuis ResultsScreen)
  const handleSaveTempFacts = useCallback(() => {
    if (!user || sessionCorrectFacts.length === 0) return
    setStorage(prev => {
      const newUnlocked = new Set(prev.unlockedFacts)
      const toSync = []
      for (const fact of sessionCorrectFacts) {
        if (!newUnlocked.has(fact.id)) {
          newUnlocked.add(fact.id)
          toSync.push(fact)
        }
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

  // ── Helper: si joueur quitte le tuto en cours, marquer comme complété
  const completeOnboardingIfNeeded = useCallback(() => {
    const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    if (!wd.onboardingCompleted) {
      wd.onboardingCompleted = true
      wd.tutoPhase = undefined
      wd.gamesPlayed = Math.max(wd.gamesPlayed || 0, 10)
      wd.wtfCoins = Math.max(wd.wtfCoins || 0, 25)
      wd.tickets = Math.max(wd.tickets || 0, 1)
      wd.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(wd))
      localStorage.removeItem('wtf_tuto_used_ids')
      localStorage.removeItem('wtf_tuto_first_fact_id')
      window.dispatchEvent(new Event('wtf_storage_sync'))
    }
  }, [])

  const handleHome = useCallback(() => {
    setScreen(SCREENS.HOME)
    setGameMode('solo')
    setSelectedCategory(null)
    setSessionFacts([])
    setCurrentIndex(0)
    setSessionScore(0)
    setCorrectCount(0)
    setDuelPlayers([])
    setDuelCurrentPlayerIndex(0)
    setIsQuickPlay(false)
    setSessionType('parcours')
    setBlitzFacts([])
    setBlitzResults(null)
    setIsChallengeMode(false)
    setLaunchMode(null)
    setExplorerPool([])
  }, [])


  const handleBlitzReplay = useCallback(() => {
    handleBlitzStart(selectedCategory)
  }, [selectedCategory, handleBlitzStart])

  const handleExplorerContinue = useCallback(() => {
    // THÈME C Point 4: Exclure facts débloqués du tirage Explorer
    const filteredPool = explorerPool.filter(f => !unlockedFacts.has(f.id))
    if (filteredPool.length === 0) {
      setGameAlert({ emoji: '🎉', title: 'Catégorie terminée !', message: 'Tu as répondu à toutes les questions de cette catégorie !' })
      return
    }
    const difficulty = DIFFICULTY_LEVELS.HOT
    const next5 = filteredPool.slice(0, 5).map(fact => ({ ...fact, ...getAnswerOptions(fact, difficulty) }))
    setExplorerPool(filteredPool.slice(5))
    setSessionType('marathon')
    initSessionState(next5)
    setScreen(SCREENS.QUESTION)
  }, [tickets, explorerPool, unlockedFacts])

  const handleReplay = useCallback(() => {
    if (sessionType === 'flash_solo') {
      handleFlashSolo()
    } else if (sessionType === 'marathon') {
      // THÈME C Point 5: Retourner au CategoryScreen pour choisir une nouvelle catégorie
      setExplorerPool([])
      setScreen(SCREENS.CATEGORY)
    } else {
      handleSelectCategory(selectedCategory)
    }
  }, [sessionType, selectedCategory, handleFlashSolo, handleSelectCategory])

  const handleShare = useCallback(() => {
    if (!currentFact) return
    const text = `🤯 WTF! "${currentFact.shortAnswer}" — ${currentFact.question}\nJoue sur What The F*ct! #WTF`
    if (navigator.share) {
      navigator.share({ text }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(text).catch(() => {})
    }
  }, [currentFact])

  const handleShareDailyFact = useCallback(() => {
    const text = `🤯 WTF du Jour !\n\n"${effectiveDailyFact.shortAnswer}"\n\n${effectiveDailyFact.explanation}\n\nJoue sur What The F*ct! #WTF`
    if (navigator.share) {
      navigator.share({ text }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(text).catch(() => {})
    }
  }, [effectiveDailyFact])

  const handleShowRules = useCallback(() => setShowHowToPlay(true), [])


  // ─── Dev Panel helpers ────────────────────────────────────────────────────

  const applyStorage = useCallback((patch) => {
    setStorage(prev => {
      const today = TODAY()
      const merged = { ...prev, ...patch }
      const next = { ...merged, wtfDuJourFait: merged.wtfDuJourDate === today }
      saveStorage(next)
      return next
    })
  }, [])

  const devActions = {
    getStorage: () => storage,
    setStreak: (n) => applyStorage({ streak: n }),
    setCoins: (n) => applyStorage({ wtfCoins: n }),
    addCoins: (n) => applyStorage({ wtfCoins: storage.wtfCoins + n }),
    resetCollection: () => applyStorage({ unlockedFacts: new Set() }),
    resetWTFDuJour: () => applyStorage({ wtfDuJourDate: null }),
    resetSessionsToday: () => applyStorage({ sessionsToday: 0 }),
    resetScore: () => applyStorage({ totalScore: 0 }),
    simulateNewPlayer: () => applyStorage({ streak: 0, wtfCoins: 0, totalScore: 0, unlockedFacts: new Set(), wtfDuJourDate: null, sessionsToday: 0 }),
    simulateJ7: () => applyStorage({ streak: 7 }),
    simulateCollectionAnimaux: () => {
      const animauxIds = getValidFacts().filter(f => f.category === 'animaux').map(f => f.id)
      applyStorage({ unlockedFacts: new Set([...storage.unlockedFacts, ...animauxIds]) })
    },
    setTickets: (n) => applyStorage({ tickets: n }),
    setHints: (n) => localStorage.setItem('wtf_hints_available', String(n)),
    cheat999: () => {
      const existing = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      existing.wtfCoins = 999
      existing.tickets = 999
      existing.streak = existing.streak || 0
      existing.totalScore = existing.totalScore || 0
      existing.unlockedFacts = existing.unlockedFacts || []
      existing.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(existing))
      localStorage.setItem('wtf_hints_available', '999')
      window.location.reload()
    },
    simulatePurchase: () => applyStorage({ wtfCoins: storage.wtfCoins + 100 }),
    unlockRandomFacts: (n = 10) => {
      const locked = getValidFacts().filter(f => !storage.unlockedFacts.has(f.id))
      const toUnlock = [...locked].sort(() => Math.random() - 0.5).slice(0, n).map(f => f.id)
      applyStorage({ unlockedFacts: new Set([...storage.unlockedFacts, ...toUnlock]) })
    },
    overrideDailyFact: (id) => {
      const fact = getValidFacts().find(f => f.id === Number(id))
      if (fact) setDailyFactOverride(fact)
    },
    testVIPReveal: () => {
      setSessionType('wtf_du_jour')
      setCoinsEarnedLastSession(5)
      setSessionScore(12)
      setCorrectCount(4)
      setSessionFacts(new Array(5).fill(null))
      setScreen(SCREENS.WTF_REVEAL)
    },
  }

  // Multiplayer context
  const duelContext = gameMode === 'duel' ? {
    currentPlayerIndex: duelCurrentPlayerIndex,
    playerName: duelPlayers[duelCurrentPlayerIndex]?.name ?? '',
    players: duelPlayers,
    isLastPlayer: duelCurrentPlayerIndex === duelPlayers.length - 1,
  } : null

  // Load facts on mount (Supabase if configured, local fallback otherwise)
  useEffect(() => {
    initFacts().then((result) => {
      if (result?.success) {
        setDailyFact(getDailyFact())
        setFactsReady(true)
        setFactsError(null)
        // Calculer les données pour les trophées
        updateTrophyData()
      } else {
        setFactsError(result?.error || 'Erreur inconnue')
      }
    })
  }, [])

  // Sync player data with Supabase after facts loaded
  useEffect(() => {
    if (!factsReady || !user) return
    pushToServer(user.id)
  }, [factsReady, user])

  // Refresh storage state when auth sync completes (sign-in / sign-out)
  useEffect(() => {
    const handleSync = () => {
      const isDevMode = localStorage.getItem('wtf_dev_mode') === 'true'
      const isTestMode = localStorage.getItem('wtf_test_mode') === 'true'
      setStorage(loadStorage())

      // En mode dev/test, ne pas toucher aux valeurs localStorage
      if (isDevMode || isTestMode) return

      // Restaurer les facts temporaires sauvegardés avant le redirect OAuth
      const tempFactsJson = localStorage.getItem('wtf_temp_facts')
      if (tempFactsJson) {
        try {
          const tempIds = JSON.parse(tempFactsJson)
          if (Array.isArray(tempIds) && tempIds.length > 0) {
            setStorage(prev => {
              const newUnlocked = new Set(prev.unlockedFacts)
              for (const id of tempIds) newUnlocked.add(id)
              const next = { ...prev, unlockedFacts: newUnlocked }
              saveStorage(next)
              // Sync vers Supabase si connecté
              const currentUser = JSON.parse(localStorage.getItem('sb-znoceotakhynqcqhpwgz-auth-token') || '{}')?.user
              if (currentUser?.id) {
                const allFacts = getValidFacts()
                for (const id of tempIds) {
                  const fact = allFacts.find(f => f.id === id)
                  if (fact) updateCollection(currentUser.id, fact.category, fact.id)
                }
                syncAfterAction(currentUser.id)
              }
              return next
            })
          }
        } catch { /* ignore */ }
        localStorage.removeItem('wtf_temp_facts')
        localStorage.removeItem('wtf_temp_session')
      }

    }
    window.addEventListener('wtf_storage_sync', handleSync)
    return () => window.removeEventListener('wtf_storage_sync', handleSync)
  }, [])

  // Refresh storage when currencyService updates
  useEffect(() => {
    const handleCurrencyUpdate = () => setStorage(loadStorage())
    window.addEventListener('wtf_currency_updated', handleCurrencyUpdate)
    return () => window.removeEventListener('wtf_currency_updated', handleCurrencyUpdate)
  }, [])

  // Dev/Test mode: unlock all facts — restore real ones when back to player mode
  useEffect(() => {
    if (!factsReady) return
    const isDev = localStorage.getItem('wtf_dev_mode') === 'true'
    const isTest = localStorage.getItem('wtf_test_mode') === 'true'
    const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')

    if (isDev || isTest) {
      // Sauvegarder les vrais unlockedFacts du joueur (seulement si pas déjà sauvegardés)
      if (!wtfData._savedUnlockedFacts) {
        wtfData._savedUnlockedFacts = wtfData.unlockedFacts || []
      }
      // Débloquer tous les facts
      const allIds = [...new Set(getValidFacts().map(f => f.id))]
      wtfData.unlockedFacts = allIds
      wtfData.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(wtfData))
      setStorage(prev => ({ ...prev, unlockedFacts: new Set(allIds) }))
    } else {
      // Mode joueur — restaurer les vrais unlockedFacts si on revient de dev/test
      if (wtfData._savedUnlockedFacts) {
        wtfData.unlockedFacts = wtfData._savedUnlockedFacts
        delete wtfData._savedUnlockedFacts
        wtfData.lastModified = Date.now()
        localStorage.setItem('wtf_data', JSON.stringify(wtfData))
        setStorage(prev => ({ ...prev, unlockedFacts: new Set(wtfData.unlockedFacts) }))
      }
    }
  }, [factsReady])

  // Auto-dismiss streak reward toast après 3 secondes
  useEffect(() => {
    if (!streakRewardToast) return
    const t = setTimeout(() => setStreakRewardToast(null), 3000)
    return () => clearTimeout(t)
  }, [streakRewardToast])

  // Tutorial DÉSACTIVÉ — Auto-skip onboarding au login Google Auth
  useEffect(() => {
    if (user) {
      const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      if (!wd.onboardingCompleted) {
        wd.onboardingCompleted = true
        wd.gamesPlayed = Math.max(wd.gamesPlayed || 0, 1)
        wd.wtfCoins = Math.max(wd.wtfCoins || 0, 0)
        wd.tickets = Math.max(wd.tickets || 0, 0)
        localStorage.setItem('wtf_data', JSON.stringify(wd))
      }
    }
  }, [user])

  // HowToPlayModal only opens manually (via Settings), not automatically

  // Push history entry on screen change (back button support)
  useEffect(() => {
    window.history.pushState(null, '')
  }, [screen])

  useEffect(() => {
    const handlePopState = () => {
      window.history.pushState(null, '')
      switch (screen) {
        case SCREENS.HOME: break
        case SCREENS.MODE_LAUNCH:
          completeOnboardingIfNeeded()
          setScreen(SCREENS.HOME)
          break
        case SCREENS.WTF_TEASER:
          completeOnboardingIfNeeded()
          setScreen(SCREENS.HOME)
          break
        case SCREENS.CATEGORY:
        case SCREENS.BLITZ_LOBBY:
          completeOnboardingIfNeeded()
          setScreen(SCREENS.HOME)
          setGameMode('solo')
          break
        case SCREENS.DUEL_SETUP:
          completeOnboardingIfNeeded()
          setScreen(SCREENS.HOME)
          break
        case SCREENS.RESULTS:
        case SCREENS.WTF_REVEAL:
        case SCREENS.DUEL_RESULTS:
        case SCREENS.BLITZ_RESULTS:
          handleHome()
          break
        default:
          handleHome()
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [screen, gameMode, handleHome])


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

      {/* Toast récompense Streak */}
      <style>{`
        @keyframes streakToastSlide {
          from { transform: translateX(-50%) translateY(-60px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
        }
      `}</style>
      {streakRewardToast && (
        <div style={{
          position: 'fixed', top: 16, left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: '#FF6B1A', color: 'white',
          borderRadius: 12, padding: '10px 20px',
          fontWeight: 700, fontSize: 15,
          textAlign: 'center',
          boxShadow: '0 4px 24px rgba(255,107,26,0.55)',
          whiteSpace: 'nowrap',
          animation: 'streakToastSlide 0.35s ease',
          pointerEvents: 'none',
        }}>
          {`🔥 Série de ${streakRewardToast.days} jours !  `}
          {streakRewardToast.reward._label
            ? streakRewardToast.reward._label
            : <>
                {streakRewardToast.reward.coins   > 0 && `+${streakRewardToast.reward.coins} 🪙  `}
                {streakRewardToast.reward.tickets > 0 && `+${streakRewardToast.reward.tickets} 🎟️  `}
                {streakRewardToast.reward.hints   > 0 && `+${streakRewardToast.reward.hints} 💡  `}
                {streakRewardToast.reward.badge && '🏅 Badge !'}
              </>
          }
        </div>
      )}

      {/* Modal choix Jour 30 — WTF Premium ou 10 f*cts */}
      {showStreakSpecialModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1001,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{
            background: 'linear-gradient(160deg, #1a0a35, #0A0F1E)',
            border: '2px solid #FF6B1A',
            borderRadius: 24, padding: 28, width: '100%', maxWidth: 360,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🔥</div>
            <h2 style={{ color: 'white', fontSize: 22, fontWeight: 900, marginBottom: 6 }}>
              30 jours de série !
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 24 }}>
              Incroyable ! Choisis ta récompense ultime :
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={() => {
                  localStorage.setItem('wtf_badge_streak_30', 'true')
                  localStorage.setItem('wtf_premium_earned', 'true')
                  setShowStreakSpecialModal(false)
                  const wtfDataPrem = JSON.parse(localStorage.getItem('wtf_data') || '{}')
                  if ((wtfDataPrem.gamesPlayed || 0) > 2) {
                    setStreakRewardToast({ days: 30, reward: { coins: 0, tickets: 0, hints: 0, badge: false, _label: 'WTF Premium 👑' } })
                  }
                }}
                style={{
                  background: 'linear-gradient(135deg, #FF6B1A, #EA580C)',
                  color: 'white', border: 'none', borderRadius: 14,
                  padding: '14px 20px', fontWeight: 900, fontSize: 16, cursor: 'pointer',
                }}>
                👑 WTF Premium
              </button>
              <button
                onClick={() => {
                  // Débloquer 10 f*cts aléatoires non encore débloqués
                  const raw = JSON.parse(localStorage.getItem('wtf_data') || '{}')
                  const unlocked = new Set(raw.unlockedFacts || [])
                  const locked = getValidFacts().filter(f => !unlocked.has(f.id))
                  const toAdd = [...locked].sort(() => Math.random() - 0.5).slice(0, 10).map(f => f.id)
                  toAdd.forEach(id => unlocked.add(id))
                  raw.unlockedFacts = [...unlocked]
                  localStorage.setItem('wtf_data', JSON.stringify(raw))
                  localStorage.setItem('wtf_badge_streak_30', 'true')
                  setShowStreakSpecialModal(false)
                  setStreakRewardToast({ days: 30, reward: { coins: 0, tickets: 0, hints: 0, badge: false, _label: '10 f*cts débloqués 🎴' } })
                }}
                style={{
                  background: 'rgba(255,255,255,0.1)', color: 'white',
                  border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 14,
                  padding: '14px 20px', fontWeight: 800, fontSize: 16, cursor: 'pointer',
                }}>
                🎴 10 f*cts débloqués
              </button>
            </div>
          </div>
        </div>
      )}

      {showHowToPlay && screen === SCREENS.HOME && (
        <HowToPlayModal
          onClose={() => setShowHowToPlay(false)}
          onRestartTutorial={resetOnboarding}
        />
      )}

      {screen === SCREENS.HOME && (
        <HomeScreen
          playerCoins={wtfCoins}
          playerHints={parseInt(localStorage.getItem('wtf_hints_available') || '0', 10)}
          playerTickets={tickets}
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
          playerCoins={wtfCoins}
          playerHints={parseInt(localStorage.getItem('wtf_hints_available') || '0', 10)}
          playerTickets={tickets}
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
          playerCoins={wtfCoins}
          playerTickets={tickets}
          playerHints={parseInt(localStorage.getItem('wtf_hints_available') || '0', 10)}
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
          playerCoins={wtfCoins}
          playerTickets={tickets}
          playerHints={parseInt(localStorage.getItem('wtf_hints_available') || '0', 10)}
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
          playerCoins={wtfCoins}
          playerHints={parseInt(localStorage.getItem('wtf_hints_available') || '0', 10)}
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

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} onShowRules={handleShowRules} onRestartTutorial={resetOnboarding} />}

      {/* Modale mini parcours */}
      {miniParcours && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setMiniParcours(null)}
        >
          <div
            style={{ background: 'white', borderRadius: 20, padding: 24, maxWidth: 320, width: '100%', textAlign: 'center', fontFamily: 'Nunito, sans-serif' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
            <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1a1a2e', margin: '0 0 8px' }}>
              Plus que {miniParcours.pool.length} f*ct{miniParcours.pool.length > 1 ? 's' : ''} !
            </h3>
            <p style={{ fontSize: 14, color: '#555', margin: '0 0 6px' }}>
              Lance un mini parcours pour compléter cette catégorie
            </p>
            <p style={{ fontSize: 16, fontWeight: 900, color: '#FF6B1A', margin: '0 0 16px' }}>
              {miniParcours.price} 🪙
            </p>
            {wtfCoins < miniParcours.price ? (
              <p style={{ fontSize: 12, fontWeight: 700, color: '#EF4444', margin: '0 0 16px' }}>
                Pas assez de coins (tu as {wtfCoins} 🪙)
              </p>
            ) : null}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setMiniParcours(null)}
                style={{ flex: 1, padding: '12px 0', borderRadius: 12, fontWeight: 800, fontSize: 14, background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#6B7280', cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}
              >
                Plus tard
              </button>
              <button
                onClick={() => {
                  if (wtfCoins < miniParcours.price) return
                  // Déduire les coins
                  setStorage(prev => {
                    const next = { ...prev, wtfCoins: prev.wtfCoins - miniParcours.price }
                    saveStorage(next)
                    return next
                  })
                  // Lancer la session
                  const { pool, mode, categoryId, difficulty } = miniParcours
                  if (mode === 'flash') {
                    setSessionType('flash_solo'); setGameMode('solo'); setIsQuickPlay(false)
                    setSelectedDifficulty(difficulty); setSelectedCategory(null)
                  } else if (mode === 'explorer') {
                    setSessionType('marathon'); setGameMode('marathon'); setIsQuickPlay(false)
                    setSelectedDifficulty(difficulty); setSelectedCategory(categoryId)
                    setExplorerPool([])
                  } else if (mode === 'quest') {
                    setSessionType('parcours'); setGameMode('solo'); setIsQuickPlay(false)
                    setSelectedDifficulty(difficulty); setSelectedCategory(categoryId)
                  }
                  initSessionState(pool)
                  setMiniParcours(null)
                  setScreen(SCREENS.QUESTION)
                }}
                disabled={wtfCoins < miniParcours.price}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 12, fontWeight: 800, fontSize: 14,
                  background: wtfCoins >= miniParcours.price ? '#FF6B1A' : '#E5E7EB',
                  border: 'none', color: wtfCoins >= miniParcours.price ? 'white' : '#9CA3AF',
                  cursor: wtfCoins >= miniParcours.price ? 'pointer' : 'not-allowed',
                  fontFamily: 'Nunito, sans-serif',
                }}
              >
                Lancer ! 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {showNoTicketModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, fontFamily: 'Nunito, sans-serif',
        }}>
          <div style={{
            background: 'linear-gradient(160deg, #1a1a2e 0%, #2d1a0e 100%)',
            border: '2px solid #FF6B1A', borderRadius: 24,
            padding: '32px 24px', maxWidth: 320, width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎫</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#FFD700', marginBottom: 10 }}>
              Il te faut un ticket !
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 24, lineHeight: 1.5 }}>
              Gagne des coins en jouant et achete un ticket en Boutique. Ou tente ta chance au Blitz !
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => { setShowNoTicketModal(false); audio.play?.('click'); handleFlashSolo() }}
                style={{
                  width: '100%', padding: '14px 24px', borderRadius: 14,
                  background: '#FF6B1A', color: 'white', border: 'none',
                  fontWeight: 900, fontSize: 15, cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(255,107,26,0.4)',
                  transition: 'transform 0.1s',
                }}
                onTouchStart={e => e.currentTarget.style.transform = 'scale(0.95)'}
                onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                🎯 Jouer pour gagner des coins
              </button>
              <button
                onClick={() => { setShowNoTicketModal(false); audio.play?.('click'); handleHomeNavigate('blitz') }}
                style={{
                  width: '100%', padding: '14px 24px', borderRadius: 14,
                  background: 'transparent', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)',
                  fontWeight: 900, fontSize: 15, cursor: 'pointer',
                  transition: 'transform 0.1s',
                }}
                onTouchStart={e => e.currentTarget.style.transform = 'scale(0.95)'}
                onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                ⚡ Tenter le Blitz
              </button>
              <button
                onClick={() => setShowNoTicketModal(false)}
                style={{
                  background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)',
                  fontSize: 12, cursor: 'pointer', marginTop: 4, padding: 8,
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {showConnectBanner && <ConnectBanner onClose={() => setShowConnectBanner(false)} />}
      {gameAlert && <GameModal emoji={gameAlert.emoji} title={gameAlert.title} message={gameAlert.message} onConfirm={() => setGameAlert(null)} />}

      {/* Modal trophée débloqué (un par un) */}
      {trophyQueue.length > 0 && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 600,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
          onClick={() => setTrophyQueue(q => q.slice(1))}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #2d1b4e 100%)',
              borderRadius: 24, padding: '32px 24px', maxWidth: 320, width: '100%',
              textAlign: 'center', fontFamily: 'Nunito, sans-serif',
              border: '2px solid rgba(255,215,0,0.4)',
              boxShadow: '0 0 40px rgba(255,215,0,0.3), 0 20px 60px rgba(0,0,0,0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 56, marginBottom: 8 }}>{trophyQueue[0].emoji}</div>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#FFD700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
              Trophée débloqué !
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'white', marginBottom: 8 }}>
              {trophyQueue[0].label}
            </div>
            {trophyQueue[0].description && (
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 16, lineHeight: 1.4 }}>
                {trophyQueue[0].description}
              </div>
            )}
            <button
              onClick={() => setTrophyQueue(q => q.slice(1))}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
                background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                color: '#1a1a2e', fontSize: 15, fontWeight: 900,
                fontFamily: 'Nunito, sans-serif', cursor: 'pointer',
              }}
            >
              {trophyQueue.length > 1 ? `Suivant (${trophyQueue.length - 1} de plus)` : 'Continuer'}
            </button>
          </div>
        </div>
      )}
      {showNoEnergyModal && (
        <GameModal
          emoji="🔋"
          title="Plus de sessions !"
          message={`Tes ${FLASH_ENERGY.FREE_SESSIONS_PER_DAY} sessions gratuites du jour sont utilisées. Achète une session pour ${FLASH_ENERGY.EXTRA_SESSION_COST} coins ou reviens demain !`}
          confirmLabel={`Acheter (${FLASH_ENERGY.EXTRA_SESSION_COST} coins)`}
          cancelLabel="Attendre"
          onConfirm={() => {
            if (buyExtraSession()) {
              setShowNoEnergyModal(false)
              if (noEnergyOrigin === 'marathon') {
                // Relancer Explorer
                setGameMode('marathon'); setSessionType('marathon')
                showOrSkipLaunch('explorer')
              } else {
                // Relancer Flash
                setGameMode('solo'); setSessionType('flash_solo'); setSelectedDifficulty(DIFFICULTY_LEVELS.FLASH); setSelectedCategory(null)
                showOrSkipLaunch('flash')
              }
            } else {
              setShowNoEnergyModal(false)
              setGameAlert({ emoji: '🪙', title: 'Pas assez de coins', message: `Il te faut ${FLASH_ENERGY.EXTRA_SESSION_COST} coins pour acheter une session.` })
            }
          }}
          onCancel={() => setShowNoEnergyModal(false)}
        />
      )}

      {/* THÈME B Point 2: Modal des catégories débloquées */}
      {showNewCategoriesModal && newlyUnlockedCategories.length > 0 && (
        <NewCategoriesModal
          categories={newlyUnlockedCategories}
          onClose={() => setShowNewCategoriesModal(false)}
        />
      )}

      {showDevPanel && DEV_PANEL_ENABLED && (
        <DevPanel
          storage={storage}
          devActions={devActions}
          dailyFact={effectiveDailyFact}
          onClose={() => setShowDevPanel(false)}
        />
      )}
    </div>
  )
}
