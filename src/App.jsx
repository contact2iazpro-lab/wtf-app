import { useState, useCallback, useEffect, useRef } from 'react'
import { useScale } from './hooks/useScale'
import { useNavigate } from 'react-router-dom'
import {
  getFactsByCategory, getValidFacts, getParcoursFacts, getCategoryLevelFactIds,
  getDailyFact, getTitrePartiel, CATEGORIES, getPlayableCategories, getCategoryById,
  getGeneratedFacts, getGeneratedFactsByCategory, getBlitzFacts,
  getQuestFacts, getFlashFacts,
  initFacts, resetFacts,
} from './data/factsService'
import { pushToServer, syncAfterAction, pullFromServer } from './services/playerSyncService'
import { updateCoins, updateTickets, updateHints, updateMultiple, setAbsolute, getBalances } from './services/currencyService'
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
// WelcomeModal supprimé — le tuto gère l'onboarding
import SettingsModal from './components/SettingsModal'
import HowToPlayModal from './components/HowToPlayModal'
import { getTutorialState, getTutorialFactId, advanceTutorial, TUTORIAL_STATES } from './utils/tutorialManager'
import { audio } from './utils/audio'
import { checkBadges } from './utils/badgeManager'
import { useAuth } from './context/AuthContext'
import { updateCollection } from './services/collectionService'

// 10 f*cts sélectionnés par Michael — on en pioche 5 aléatoirement pour la première Flash
const ONBOARDING_FLASH_FACT_IDS = [67, 301, 92, 174, 109, 95, 177, 22, 6, 61]

// Difficulté spéciale onboarding : 2 choix QCM (50/50), timer 20s, 2 indices
const DIFFICULTY_ONBOARDING_FLASH = {
  id: 'onboarding_flash', label: 'Flash Onboarding', emoji: '🎯',
  choices: 2, duration: 20, hintsAllowed: true, freeHints: 0, paidHints: 2,
  hintCost: 0, coinsPerCorrect: 5, scoring: { correct: 5, wrong: 0 }
}

const SCREENS = {
  HOME: 'home',
  WTF_TEASER: 'wtf_teaser',
  WTF_REVEAL: 'wtf_reveal',
  DIFFICULTY: 'difficulty',
  CATEGORY: 'category',
  QUESTION: 'question',
  REVELATION: 'revelation',
  RESULTS: 'results',
  DUEL_SETUP: 'duel_setup',
  DUEL_PASS: 'duel_pass',
  DUEL_RESULTS: 'duel_results',
  MARATHON_RESULTS: 'marathon_results',
  BLITZ: 'blitz',
  BLITZ_RESULTS: 'blitz_results',
  BLITZ_LOBBY: 'blitz_lobby',
  MODE_LAUNCH: 'mode_launch',
}

const MODE_CONFIGS = {
  quest: {
    modeId: 'quest', modeName: 'Quest', subtitle: 'Débloque les f*cts les plus rares', emoji: '⭐', color: '#FF6B1A',
    rules: [
      { icon: '🎫', text: '1 ticket par session' },
      { icon: '❄️', text: 'Cool : 4 choix · 2 indices · 30s · 5 coins' },
      { icon: '🔥', text: 'Hot : 4 choix · 2 indices · 20s · 3 coins' },
      { icon: '⚡', text: 'WTF! : 6 choix · 1 indice · 20s · 2 coins' },
      { icon: '📚', text: '5 questions — les f*cts trouvés vont dans ta Collection' },
      { icon: '🏆', text: 'Score parfait = 25 coins bonus + 1 ticket !' },
    ],
  },
  blitz: {
    modeId: 'blitz', modeName: 'Blitz', subtitle: 'Bats ton record de vitesse !', emoji: '⚡', color: '#FF4444',
    rules: [
      { icon: '⏱️', text: 'Réponds le plus vite possible à tes f*cts débloqués' },
      { icon: '❌', text: 'Mauvaise réponse = +3 secondes de pénalité' },
      { icon: '🚫', text: 'Pas d\'indices — c\'est la mémoire pure' },
      { icon: '🏆', text: 'Bats ton record de vitesse' },
      { icon: '🆓', text: 'Gratuit et illimité' },
      { icon: '🎯', text: 'Choisis entre 5, 10, 20, 30, 40 ou 50 questions' },
    ],
  },
  flash: {
    modeId: 'flash', modeName: 'Jouer', subtitle: 'Partie rapide, gratuite', emoji: '🎯', color: '#FFD700',
    rules: [
      { icon: '🆓', text: 'Gratuit — joue autant que tu veux' },
      { icon: '⚡', text: '5 questions' },
      { icon: '⏱️', text: '20 secondes par question' },
      { icon: '💡', text: '2 indices disponibles' },
      { icon: '🎲', text: 'Aléatoire : 5 coins par bonne réponse' },
      { icon: '📂', text: 'Catégorie choisie : 3 coins par bonne réponse' },
    ],
  },
  hunt: {
    modeId: 'hunt', modeName: 'Hunt', subtitle: 'Le WTF! du jour !', emoji: '🔥', color: '#E91E63',
    rules: [
      { icon: '🆓', text: 'Gratuit — pas de ticket requis' },
      { icon: '🎯', text: 'Un f*ct WTF! spécial à découvrir chaque jour' },
      { icon: '⏱️', text: '20 secondes par question' },
      { icon: '📚', text: '5 questions pour le débloquer' },
      { icon: '💡', text: '2 indices disponibles par question' },
      { icon: '📅', text: 'Reviens chaque jour pour un nouveau WTF!' },
    ],
  },
}

const DIFFICULTY_LEVELS = {
  WTF:   { id: 'wtf',   label: 'Quest WTF!', emoji: '⚡', choices: 6, duration: 20, hintsAllowed: true, freeHints: 0, paidHints: 1, hintCost: 0, coinsPerCorrect: 2, scoring: { correct: 2, wrong: 0 } },
  HOT:   { id: 'hot',   label: 'Quest Hot',  emoji: '🔥', choices: 4, duration: 20, hintsAllowed: true, freeHints: 0, paidHints: 2, hintCost: 0, coinsPerCorrect: 3, scoring: { correct: 3, wrong: 0 } },
  COOL:  { id: 'cool',  label: 'Quest Cool', emoji: '❄️', choices: 4, duration: 30, hintsAllowed: true, freeHints: 0, paidHints: 2, hintCost: 0, coinsPerCorrect: 5, scoring: { correct: 5, wrong: 0 } },
  FLASH: { id: 'flash', label: 'Flash', emoji: '⚡', choices: 4, duration: 20, hintsAllowed: true, freeHints: 0, paidHints: 2, hintCost: 0, coinsPerCorrect: 5, scoring: { correct: 5, wrong: 0 } },
  HUNT:  { id: 'hunt',  label: 'Hunt',  emoji: '🔥', choices: 4, duration: 20, hintsAllowed: true, freeHints: 0, paidHints: 2, hintCost: 0, scoring: { correct: [5, 3, 2], wrong: 0 } },
  BLITZ: { id: 'blitz', label: 'Blitz', emoji: '⚡', choices: 4, duration: 60, hintsAllowed: true, freeHints: 0, paidHints: 2, hintCost: 0, coinsPerCorrect: 1, scoring: { correct: 1, wrong: 0 } },
}

const TODAY = () => new Date().toISOString().slice(0, 10) // YYYY-MM-DD
const TODAY_DATE_STR = () => new Date().toDateString()
const YESTERDAY_DATE_STR = () => new Date(Date.now() - 86400000).toDateString()

// TEMP TEST — remettre à 10 avant le lancement en production
const QUESTIONS_PER_GAME = 5

// Paliers de récompenses fidélité Streak
const getStreakReward = (streakDays) => {
  if (streakDays === 1)  return { coins: 5,  tickets: 0, hints: 0, badge: false }
  if (streakDays === 3)  return { coins: 0,  tickets: 0, hints: 2, badge: false }
  if (streakDays === 7)  return { coins: 25, tickets: 1, hints: 3, badge: true  }
  if (streakDays === 14) return { coins: 0,  tickets: 1, hints: 3, badge: false }
  if (streakDays === 30) return { coins: 0,  tickets: 0, hints: 0, badge: false, special: 'wtf_premium' }
  return null
}

function loadStorage() {
  try {
    const today = TODAY()
    const todayDateStr = TODAY_DATE_STR()
    const saved = JSON.parse(localStorage.getItem('wtf_data') || '{}')

    // Si on revient de dev/test en mode joueur, restaurer immédiatement les vrais unlockedFacts
    const isDev = localStorage.getItem('wtf_dev_mode') === 'true'
    const isTest = localStorage.getItem('wtf_test_mode') === 'true'
    if (!isDev && !isTest && saved._savedUnlockedFacts) {
      saved.unlockedFacts = saved._savedUnlockedFacts
      delete saved._savedUnlockedFacts
      saved.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(saved))
    }

    const streak = saved.lastDay === todayDateStr
      ? saved.streak
      : saved.lastDay === YESTERDAY_DATE_STR()
        ? saved.streak || 0
        : 0

    // Filet de sécurité : en mode joueur, détecter les unlockedFacts anormalement élevés
    if (!isDev && !isTest) {
      const unlocked = saved.unlockedFacts || []
      const gamesPlayed = saved.gamesPlayed || 0
      const maxReasonable = Math.max(50, gamesPlayed * 6)
      if (unlocked.length > maxReasonable && !saved._savedUnlockedFacts) {
        console.warn('[WTF] unlockedFacts anormalement élevé (' + unlocked.length + ') pour ' + gamesPlayed + ' parties jouées. Reset automatique.')
        saved.unlockedFacts = []
        saved.lastModified = Date.now()
        localStorage.setItem('wtf_data', JSON.stringify(saved))
      }
    }

    const unlockedFacts = new Set(saved.unlockedFacts || [])
    const wtfCoins = saved.wtfCoins || 0
    const wtfDuJourDate = saved.wtfDuJourDate || null
    const wtfDuJourFait = wtfDuJourDate === today
    const sessionsToday = saved.sessionsTodayDate === today ? (saved.sessionsToday || 0) : 0
    const tickets = saved.tickets ?? 3

    return { totalScore: saved.totalScore || 0, streak, unlockedFacts, wtfCoins, wtfDuJourDate, wtfDuJourFait, sessionsToday, tickets, gamesPlayed: saved.gamesPlayed || 0, seenModes: saved.seenModes || [] }
  } catch {
    return { totalScore: 0, streak: 0, unlockedFacts: new Set(), wtfCoins: 0, wtfDuJourDate: null, wtfDuJourFait: false, sessionsToday: 0, tickets: 0, gamesPlayed: 0, seenModes: [] }
  }
}

function saveStorage(params) {
  try {
    const existing = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    const bestStreak = Math.max(existing.bestStreak || 0, params.streak || 0)
    localStorage.setItem('wtf_data', JSON.stringify({
      ...existing,
      ...params,
      bestStreak,
      lastDay: TODAY_DATE_STR(),
      sessionsTodayDate: TODAY(),
      lastModified: Date.now(),
      // unlockedFacts doit être un array (pas un Set)
      unlockedFacts: params.unlockedFacts ? [...params.unlockedFacts] : (existing.unlockedFacts || []),
    }))
  } catch { /* ignore */ }
}

function updateTrophyData() {
  try {
    const allFacts = getValidFacts()
    const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    const unlockedIds = new Set(wtfData.unlockedFacts || [])

    const unlockedFactsByCategory = {}
    const totalFactsByCategory = {}
    let vipCount = 0
    let funnyCount = 0

    for (const fact of allFacts) {
      const cat = fact.category || 'unknown'
      totalFactsByCategory[cat] = (totalFactsByCategory[cat] || 0) + 1
      if (unlockedIds.has(fact.id)) {
        unlockedFactsByCategory[cat] = (unlockedFactsByCategory[cat] || 0) + 1
        if (fact.isVip) vipCount++
        else funnyCount++
      }
    }

    wtfData.unlockedFactsByCategory = unlockedFactsByCategory
    wtfData.totalFactsByCategory = totalFactsByCategory
    wtfData.vipCount = vipCount
    wtfData.funnyCount = funnyCount
    wtfData.lastModified = Date.now()
    localStorage.setItem('wtf_data', JSON.stringify(wtfData))
  } catch { /* ignore */ }
}

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

  // Initialiser les indices à 3 pour les nouveaux joueurs
  if (localStorage.getItem('wtf_hints_available') === null) {
    localStorage.setItem('wtf_hints_available', '3')
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
        alert('Tu n\'as pas de ticket pour lancer un défi ! 🎫')
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
    sessionStorage.setItem('wtf_splash_done', 'true')

    // Vérifier l'état du tutoriel — si FIRST_FACT, envoyer directement sur QuestionScreen
    try {
      const tutorialState = await getTutorialState()
      if (tutorialState === TUTORIAL_STATES.FIRST_FACT) {
        const tutorialFactId = getTutorialFactId()
        const allFacts = getValidFacts()
        const tutorialFact = allFacts.find(f => f.id === tutorialFactId)
        if (tutorialFact) {
          const factWithOptions = { ...tutorialFact, ...getAnswerOptions(tutorialFact, DIFFICULTY_LEVELS.HOT) }
          setSessionType('parcours')
          setGameMode('solo')
          setIsQuickPlay(false)
          setIsTutorialSession(true)
          setSelectedDifficulty(DIFFICULTY_LEVELS.HOT)
          setSelectedCategory(tutorialFact.category)
          initSessionState([factWithOptions])
          setScreen(SCREENS.QUESTION)
          setShowSplash(false)
          return
        }
      }
    } catch { /* fallback to normal flow */ }

    setShowSplash(false)
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

  // Session type tracking
  const [isTutorialSession, setIsTutorialSession] = useState(false)
  const [isChallengeMode, setIsChallengeMode] = useState(false)
  const [flipInfo, setFlipInfo] = useState(null) // { wrongAnswer, correctAnswer } for tutorial flip
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
  const [isQuickPlay, setIsQuickPlay] = useState(false)
  const [blitzFacts, setBlitzFacts] = useState([])
  const [blitzResults, setBlitzResults] = useState(null)
  const [launchMode, setLaunchMode] = useState(null)
  const [explorerPool, setExplorerPool] = useState([])
  const [sessionCorrectFacts, setSessionCorrectFacts] = useState([])
  const [completedLevels, setCompletedLevels] = useState([])
  const [sessionIsPerfect, setSessionIsPerfect] = useState(false)
  const [streakRewardToast, setStreakRewardToast] = useState(null)
  const [showStreakSpecialModal, setShowStreakSpecialModal] = useState(false)
  const [newlyEarnedBadges, setNewlyEarnedBadges] = useState([])
  const [miniParcours, setMiniParcours] = useState(null)

  const { user } = useAuth()

  const numPlayers = duelPlayers.length || 1

  const currentFact = gameMode === 'duel'
    ? sessionFacts[currentIndex * numPlayers + duelCurrentPlayerIndex] || null
    : sessionFacts[currentIndex] || null

  const totalRounds = gameMode === 'duel'
    ? Math.floor(sessionFacts.length / numPlayers)
    : sessionFacts.length

  // ─── Session starters ────────────────────────────────────────────────────

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
    setCompletedLevels([])
    setSessionIsPerfect(false)
    setPointsEarned(0)
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
        alert('Le f*ct du jour n\'est pas encore chargé. Réessaie dans quelques secondes !')
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
        alert('Bientôt de nouveaux f*cts ! Reviens vite 🎉')
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
      case 'flash':    setScreen(SCREENS.CATEGORY); break
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
    if (localStorage.getItem(`skip_launch_${mode}`) === 'true') {
      launchModeDestination(mode)
    } else {
      setScreen(SCREENS.MODE_LAUNCH)
    }
  }, [launchModeDestination])

  const handleHomeNavigate = useCallback((target) => {
    switch (target) {
      case 'difficulty': {
        setGameMode('solo'); setSessionType('parcours')
        // Première Quest : skip launch + difficulty, forcer Cool 2 QCM
        const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
        if ((wd.questsPlayed || 0) === 0) {
          const firstQuestDifficulty = {
            id: 'cool', label: 'Cool', emoji: '❄️',
            choices: 2, duration: 30, hintsAllowed: true, freeHints: 0, paidHints: 2, hintCost: 0,
            coinsPerCorrect: 5, scoring: { correct: 5, wrong: 0 },
          }
          setSelectedDifficulty(firstQuestDifficulty)
          handleSelectDifficulty(firstQuestDifficulty)
          return
        }
        showOrSkipLaunch('quest')
        break
      }
      case 'wtfDuJour':
        showOrSkipLaunch('hunt')
        break
      case 'categoryFlash': {
        // Première partie Flash onboarding : 5 f*cts figés, 2 QCM (50/50), pas de CategoryScreen
        const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
        const isDevOrTest = localStorage.getItem('wtf_dev_mode') === 'true' || localStorage.getItem('wtf_test_mode') === 'true'
        if (!isDevOrTest && wd.tutorialDone && (wd.gamesPlayed || 0) === 0) {
          audio.play('click')
          const allFacts = [...getValidFacts(), ...getGeneratedFacts()]
          let onboardingPool = ONBOARDING_FLASH_FACT_IDS
            .map(id => allFacts.find(f => f.id === id))
            .filter(Boolean)

          // Piocher 5 aléatoirement parmi les 10
          let onboardingFacts = [...onboardingPool]
            .sort(() => Math.random() - 0.5)
            .slice(0, 5)

          // Fallback si pas assez de facts trouvés
          if (onboardingFacts.length < 5) {
            onboardingFacts = [...getGeneratedFacts()].sort(() => Math.random() - 0.5).slice(0, 5)
          }

          const facts = onboardingFacts.map(fact => ({
            ...fact,
            ...getAnswerOptions(fact, DIFFICULTY_ONBOARDING_FLASH)
          }))

          setSessionType('flash_solo')
          setGameMode('solo')
          setIsQuickPlay(false)
          setSelectedDifficulty(DIFFICULTY_ONBOARDING_FLASH)
          setSelectedCategory(null)
          initSessionState(facts)
          setScreen(SCREENS.QUESTION)
          break
        }
        setGameMode('solo'); setSessionType('flash_solo'); setSelectedDifficulty(DIFFICULTY_LEVELS.FLASH); setSelectedCategory(null)
        showOrSkipLaunch('flash')
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
      let pool = getGeneratedFactsByCategory(selectedCategory).filter(f => skipUnlockM || !unlockedFacts.has(f.id))
      // Dev mode fallback : inclure les déjà débloqués
      if (pool.length < 4 && skipUnlockM) {
        pool = getGeneratedFactsByCategory(selectedCategory)
      }
      if (pool.length === 0) {
        alert('Bientôt de nouveaux f*cts dans cette catégorie ! Reviens vite 🎉')
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
    const isFirstQuestEver = (JSON.parse(localStorage.getItem('wtf_data') || '{}').questsPlayed || 0) === 0
    if (!isDevModeQuest && !isFirstQuestEver) {
      if ((tickets || 0) < 1) {
        alert('Tu n\'as pas de ticket ! Gagne des tickets en faisant des scores parfaits ou en maintenant ta série. 🎫')
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
      alert('Débloque plus de f*cts pour jouer en Blitz ! 🔓')
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
        alert('Bientôt de nouveaux f*cts dans cette catégorie ! Reviens vite 🎉')
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
    initSessionState(factsWithOptions)
    setScreen(SCREENS.QUESTION)
  }, [selectedDifficulty, gameMode, handleBlitzStart])

  // ─── Answer handlers ─────────────────────────────────────────────────────

  const handleSelectAnswer = useCallback((answerIndex, tutorialFlipInfo) => {
    if (!currentFact) return
    const isAnswerCorrect = answerIndex === currentFact.correctIndex

    let points = 0
    if (isAnswerCorrect) {
      if (selectedDifficulty.coinsPerCorrect !== undefined) {
        // Nouveau système : récompense fixe, pas de dégradation par indice
        points = selectedDifficulty.coinsPerCorrect
        // Mode Jouer avec catégorie choisie → 3 coins au lieu de 5
        if (sessionType === 'flash_solo' && selectedCategory !== null) {
          points = 3
        }
      } else {
        // Legacy (Flash) : dégradation selon les indices utilisés
        const sc = selectedDifficulty.scoring.correct
        points = Array.isArray(sc) ? (sc[hintsUsed] ?? sc[sc.length - 1]) : sc
      }
    }

    // Tutorial flip info (wrongAnswer → correctAnswer)
    setFlipInfo(tutorialFlipInfo || null)

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
      // Sauvegarde coins en temps réel
      if (points > 0) {
        updateCoins(points)
        setStorage(prev => ({ ...prev, wtfCoins: (prev.wtfCoins || 0) + points }))
      }

      // Explorer/Marathon : sauvegarder le f*ct débloqué immédiatement (pas attendre la fin de session)
      if (isAnswerCorrect && currentFact && (sessionType === 'marathon' || sessionType === 'flash_solo')) {
        setStorage(prev => {
          const newUnlocked = new Set(prev.unlockedFacts)
          if (!newUnlocked.has(currentFact.id)) {
            newUnlocked.add(currentFact.id)
            const next = { ...prev, unlockedFacts: newUnlocked }
            saveStorage(next)
            if (user) {
              import('./services/collectionService').then(({ updateCollection }) => {
                updateCollection(user.id, currentFact.category, currentFact.id)
              })
            }
            return next
          }
          return prev
        })
      }
    }

    setScreen(SCREENS.REVELATION)
  }, [currentFact, gameMode, duelCurrentPlayerIndex, hintsUsed, selectedDifficulty, sessionType, user])

  const handleOpenValidate = useCallback((isCorrect) => {
    const points = isCorrect ? (hintsUsed === 0 ? 5 : hintsUsed === 1 ? 3 : 2) : 0

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
      // Sauvegarde coins en temps réel
      if (points > 0) {
        updateCoins(points)
        setStorage(prev => ({ ...prev, wtfCoins: (prev.wtfCoins || 0) + points }))
      }
    }

    setScreen(SCREENS.REVELATION)
  }, [hintsUsed, gameMode, duelCurrentPlayerIndex, currentFact])

  const handleTimeout = useCallback(() => {
    if (selectedAnswer !== null) return
    setSelectedAnswer(-1)
    setIsCorrect(false)
    setPointsEarned(0)
    setScreen(SCREENS.REVELATION)
  }, [selectedAnswer])

  const handleUseHint = useCallback((hintNum) => {
    // Indices = stock gratuit, décrémenté de 1 à chaque utilisation
    if (getBalances().hints < 1) return // stock vide, ne rien faire
    updateHints(-1)
    setHintsUsed(hintNum)
    setSessionAnyHintUsed(true)
  }, [])

  // ─── Navigation (next question / session end) ─────────────────────────────

  const handleNext = useCallback(() => {
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
          for (const fact of sessionCorrectFacts) {
            if (!newUnlocked.has(fact.id)) {
              newUnlocked.add(fact.id)
              toSync.push(fact)
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
            const isFirstFlash = (wd.gamesPlayed || 0) <= 1 && !wd.firstFlashTicketGiven
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
          bonusCoins = isPerfectSession ? 25 : 0 // Quest: perfect bonus (25 coins + 1 ticket)
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
            setStreakRewardToast({ days: newStreak, reward: streakReward })
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
        if (sessionType === 'wtf_du_jour' && !newUnlocked.has(effectiveDailyFact.id)) {
          newUnlocked.add(effectiveDailyFact.id)
          saveStorage({ ...newStorage, unlockedFacts: newUnlocked })
          setStorage(prev => ({ ...prev, unlockedFacts: newUnlocked }))
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

      // Check badges après mise à jour des stats
      const newBadges = checkBadges()
      if (newBadges.length > 0) setNewlyEarnedBadges(newBadges)

      // Route to appropriate end screen
      if (sessionType === 'wtf_du_jour') {
        setScreen(SCREENS.WTF_REVEAL)
      } else if (sessionType === 'marathon') {
        setScreen(SCREENS.MARATHON_RESULTS)
      } else {
        setScreen(SCREENS.RESULTS)
        // Ticket gratuit après première partie Flash (onboarding)
        if (sessionType === 'flash_solo') {
          const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
          if (!wd.firstFlashTicketGiven) {
            wd.firstFlashTicketGiven = true
            if ((wd.tickets || 0) === 0) {
              wd.tickets = 1
            }
            wd.lastModified = Date.now()
            localStorage.setItem('wtf_data', JSON.stringify(wd))
          }
        }
      }
    } else {
      setCurrentIndex(nextIndex)
      setHintsUsed(0)
      setSelectedAnswer(null)
      setIsCorrect(null)
      setPointsEarned(0)
      setScreen(SCREENS.QUESTION)
    }
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
    setIsTutorialSession(false)
    setFlipInfo(null)
    setSessionType('parcours')
    setBlitzFacts([])
    setBlitzResults(null)
    setIsChallengeMode(false)
    setLaunchMode(null)
    setExplorerPool([])
  }, [])

  const handleTutoComplete = useCallback(() => {
    advanceTutorial() // FIRST_FACT → HOME_DISCOVERED
    setIsTutorialSession(false)
    setSessionFacts([])
    setCurrentIndex(0)
    setScreen(SCREENS.HOME)
  }, [])

  const handleBlitzReplay = useCallback(() => {
    handleBlitzStart(selectedCategory)
  }, [selectedCategory, handleBlitzStart])

  const handleExplorerContinue = useCallback(() => {
    if (explorerPool.length === 0) {
      alert('Plus de questions dans cette catégorie ! 🎉')
      return
    }
    const difficulty = DIFFICULTY_LEVELS.HOT
    const next5 = explorerPool.slice(0, 5).map(fact => ({ ...fact, ...getAnswerOptions(fact, difficulty) }))
    setExplorerPool(explorerPool.slice(5))
    setSessionType('marathon')
    initSessionState(next5)
    setScreen(SCREENS.QUESTION)
  }, [tickets, explorerPool])

  const handleReplay = useCallback(() => {
    if (sessionType === 'flash_solo') {
      handleFlashSolo()
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
        case SCREENS.MODE_LAUNCH: setScreen(SCREENS.HOME); break
        case SCREENS.WTF_TEASER: setScreen(SCREENS.HOME); break
        case SCREENS.CATEGORY:
        case SCREENS.BLITZ_LOBBY:
          setScreen(SCREENS.HOME)
          setGameMode('solo')
          break
        case SCREENS.DUEL_SETUP: setScreen(SCREENS.HOME); break
        case SCREENS.RESULTS:
        case SCREENS.WTF_REVEAL:
        case SCREENS.DUEL_RESULTS:
        case SCREENS.BLITZ_RESULTS:
          handleHome()
          break
        default:
          if (gameMode === 'marathon') {
            if (!window.confirm(`Tu as répondu à ${currentIndex} question${currentIndex > 1 ? 's' : ''}. Si tu quittes, ton score ne sera pas sauvegardé.`)) break
          }
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
                  setStreakRewardToast({ days: 30, reward: { coins: 0, tickets: 0, hints: 0, badge: false, _label: 'WTF Premium 👑' } })
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
          onRestartTutorial={() => {
            // Reset tutorial state et relancer
            const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
            wd.tutorialDone = false
            delete wd.hasSeenFlash
            delete wd.hasSeenQuest
            wd.lastModified = Date.now()
            localStorage.setItem('wtf_data', JSON.stringify(wd))
            localStorage.removeItem('tutorial_state')
            setShowHowToPlay(false)
            const tutorialFactId = getTutorialFactId()
            const allFacts = getValidFacts()
            const tutorialFact = allFacts.find(f => f.id === tutorialFactId)
            if (tutorialFact) {
              const factWithOptions = { ...tutorialFact, ...getAnswerOptions(tutorialFact, DIFFICULTY_LEVELS.HOT) }
              setSessionType('parcours')
              setGameMode('solo')
              setIsQuickPlay(false)
              setIsTutorialSession(true)
              setSelectedDifficulty(DIFFICULTY_LEVELS.HOT)
              setSelectedCategory(tutorialFact.category)
              initSessionState([factWithOptions])
              setScreen(SCREENS.QUESTION)
            }
          }}
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
        />
      )}

      {screen === SCREENS.WTF_TEASER && (
        <WTFDuJourTeaserScreen
          fact={effectiveDailyFact}
          titrePartiel={getTitrePartiel(effectiveDailyFact)}
          streak={streak}
          onStart={handleStartWTFSession}
          onBack={() => setScreen(SCREENS.HOME)}
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
          onBack={() => setScreen(SCREENS.HOME)}
        />
      )}

      {screen === SCREENS.DIFFICULTY && (
        <DifficultyScreen
          onSelectDifficulty={handleSelectDifficulty}
          onBack={() => launchMode ? setScreen(SCREENS.MODE_LAUNCH) : setScreen(SCREENS.HOME)}
        />
      )}

      {screen === SCREENS.CATEGORY && (
        <CategoryScreen
          onSelectCategory={handleSelectCategory}
          onBack={() => launchMode ? setScreen(SCREENS.MODE_LAUNCH) : setScreen(SCREENS.HOME)}
          selectedDifficulty={selectedDifficulty}
          unlockedFacts={unlockedFacts}
          gameMode={gameMode}
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
          onQuit={gameMode === 'marathon'
            ? () => {
                if (window.confirm(`Tu as répondu à ${currentIndex} question${currentIndex > 1 ? 's' : ''}. Si tu quittes, ton score ne sera pas sauvegardé.`))
                  handleHome()
              }
            : handleHome
          }
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
          isTutorial={isTutorialSession}
          onTutoComplete={isTutorialSession ? handleTutoComplete : null}
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
          wrongAnswer={flipInfo?.wrongAnswer}
          correctAnswer={flipInfo?.correctAnswer}
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

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} onShowRules={handleShowRules} onRestartTutorial={() => {
        const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
        wd.tutorialDone = false
        delete wd.hasSeenFlash
        delete wd.hasSeenQuest
        wd.lastModified = Date.now()
        localStorage.setItem('wtf_data', JSON.stringify(wd))
        localStorage.removeItem('tutorial_state')
        setShowSettings(false)
        const tutorialFactId = getTutorialFactId()
        const allFacts = getValidFacts()
        const tutorialFact = allFacts.find(f => f.id === tutorialFactId)
        if (tutorialFact) {
          const factWithOptions = { ...tutorialFact, ...getAnswerOptions(tutorialFact, DIFFICULTY_LEVELS.HOT) }
          setSessionType('parcours')
          setGameMode('solo')
          setIsQuickPlay(false)
          setIsTutorialSession(true)
          setSelectedDifficulty(DIFFICULTY_LEVELS.HOT)
          setSelectedCategory(tutorialFact.category)
          initSessionState([factWithOptions])
          setScreen(SCREENS.QUESTION)
        }
      }} />}

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
