import { useState, useCallback, useEffect, useRef } from 'react'
import { useScale } from './hooks/useScale'
import { useNavigate } from 'react-router-dom'
import {
  getFactsByCategory, getValidFacts, getParcoursFacts, getCategoryLevelFactIds,
  getDailyFact, getTitrePartiel, CATEGORIES, PLAYABLE_CATEGORIES,
  initFacts,
} from './data/factsService'
import DevPanel from './components/DevPanel'
import { DEV_PANEL_ENABLED } from './config/devConfig'
import { logDevEvent } from './utils/devLogger'
import { getAnswerOptions } from './utils/answers'
import HomeScreen from './screens/HomeScreen'
import SplashScreen from './screens/SplashScreen'
import MarathonScreen from './screens/MarathonScreen'
import DifficultyScreen from './screens/DifficultyScreen'
import CategoryScreen from './screens/CategoryScreen'
import QuestionScreen from './screens/QuestionScreen'
import RevelationScreen from './screens/RevelationScreen'
import ResultsScreen from './screens/ResultsScreen'
import WTFDuJourTeaserScreen from './screens/WTFDuJourTeaserScreen'
import WTFDuJourRevealScreen from './screens/WTFDuJourRevealScreen'
import DuelSetupScreen, { PLAYER_COLORS, PLAYER_EMOJIS } from './screens/DuelSetupScreen'
import DuelPassScreen from './screens/DuelPassScreen'
import DuelResultsScreen from './screens/DuelResultsScreen'
import SettingsModal from './components/SettingsModal'
import HowToPlayModal from './components/HowToPlayModal'
import TutorialOverlay from './components/TutorialOverlay'
import { audio } from './utils/audio'
import { useAuth } from './context/AuthContext'
import { updateCollection } from './services/collectionService'

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
}

const DIFFICULTY_LEVELS = {
  WTF:   { id: 'wtf',   label: 'Quête WTF!', emoji: '⚡', choices: 6, duration: 30, hintsAllowed: true, freeHints: 0, paidHints: 1, hintCost: 8, coinsPerCorrect: 5, scoring: { correct: 5, wrong: 0 } },
  HOT:   { id: 'hot',   label: 'Quête Hot',  emoji: '🔥', choices: 4, duration: 30, hintsAllowed: true, freeHints: 0, paidHints: 2, hintCost: 5, coinsPerCorrect: 3, scoring: { correct: 3, wrong: 0 } },
  COOL:  { id: 'cool',  label: 'Quête Cool', emoji: '❄️', choices: 4, duration: 30, hintsAllowed: true, freeHints: 0, paidHints: 2, hintCost: 2, coinsPerCorrect: 3, scoring: { correct: 3, wrong: 0 } },
  FLASH: { id: 'flash', label: 'Session Flash', emoji: '⚡', choices: 4, duration: 60, hintsAllowed: true, freeHints: 0, paidHints: 1, hintCost: 3, scoring: { correct: [5, 3, 2], wrong: 0 } },
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

    // Streak: unchanged from existing logic
    const streak = saved.lastDay === todayDateStr
      ? saved.streak
      : saved.lastDay === YESTERDAY_DATE_STR()
        ? saved.streak || 0
        : 0

    const unlockedFacts = new Set(saved.unlockedFacts || [])

    // New daily-reset fields
    const wtfCoins = saved.wtfCoins || 0
    const wtfDuJourDate = saved.wtfDuJourDate || null
    const wtfDuJourFait = wtfDuJourDate === today
    const sessionsToday = saved.sessionsTodayDate === today ? (saved.sessionsToday || 0) : 0

    const tickets = saved.tickets || 0

    const devMode = localStorage.getItem('wtf_dev_mode') === 'true'
    if (devMode) {
      return { totalScore: saved.totalScore || 0, streak, unlockedFacts, wtfCoins: 9999, wtfDuJourDate: null, wtfDuJourFait: false, sessionsToday: 0, tickets: 99 }
    }

    return { totalScore: saved.totalScore || 0, streak, unlockedFacts, wtfCoins, wtfDuJourDate, wtfDuJourFait, sessionsToday, tickets }
  } catch {
    return { totalScore: 0, streak: 0, unlockedFacts: new Set(), wtfCoins: 0, wtfDuJourDate: null, wtfDuJourFait: false, sessionsToday: 0, tickets: 0 }
  }
}

function saveStorage({ totalScore, streak, unlockedFacts, wtfCoins, wtfDuJourDate, sessionsToday, tickets = 0 }) {
  if (localStorage.getItem('wtf_dev_mode') === 'true') return
  try {
    localStorage.setItem('wtf_data', JSON.stringify({
      totalScore,
      streak,
      lastDay: TODAY_DATE_STR(),
      unlockedFacts: [...unlockedFacts],
      wtfCoins,
      wtfDuJourDate,
      sessionsToday,
      sessionsTodayDate: TODAY(),
      tickets,
    }))
  } catch { /* ignore */ }
}

export default function App() {
  const navigate = useNavigate()
  const scale = useScale()

  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('wtf_splash_shown'))
  const handleSplashComplete = () => {
    sessionStorage.setItem('wtf_splash_shown', 'true')
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
  const [sessionType, setSessionType] = useState('parcours') // 'wtf_du_jour' | 'flash_solo' | 'parcours' | 'marathon' | 'duel'
  const [coinsEarnedLastSession, setCoinsEarnedLastSession] = useState(0)
  const [dailyFact, setDailyFact] = useState(null)
  const [dailyFactOverride, setDailyFactOverride] = useState(null)
  const effectiveDailyFact = dailyFactOverride || dailyFact

  // Facts loading state
  const [factsReady, setFactsReady] = useState(false)
  // Dev panel
  const [showDevPanel, setShowDevPanel] = useState(false)

  // Multiplayer state
  const [duelPlayers, setDuelPlayers] = useState([])
  const [duelCurrentPlayerIndex, setDuelCurrentPlayerIndex] = useState(0)
  const [gameMode, setGameMode] = useState('solo') // 'solo' | 'duel' | 'marathon'
  // Tutorial (first visit — mandatory) + auto-show rules (once per session)
  const [showTutorial, setShowTutorial] = useState(() => localStorage.getItem('hideWelcomeScreen') !== 'true')
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const rulesAutoShownRef = useRef(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isQuickPlay, setIsQuickPlay] = useState(false)
  const [sessionCorrectFacts, setSessionCorrectFacts] = useState([])
  const [completedLevels, setCompletedLevels] = useState([])
  const [sessionIsPerfect, setSessionIsPerfect] = useState(false)
  const [streakRewardToast, setStreakRewardToast] = useState(null)
  const [showStreakSpecialModal, setShowStreakSpecialModal] = useState(false)

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
    const category = effectiveDailyFact.category
    const facts = [...getValidFacts().filter(f => f.category === category && f.id !== effectiveDailyFact.id)]
      .sort(() => Math.random() - 0.5)
      .slice(0, 5)
      .map(fact => ({ ...fact, ...getAnswerOptions(fact, DIFFICULTY_LEVELS.FLASH) }))

    setSessionType('wtf_du_jour')
    setGameMode('solo')
    setIsQuickPlay(false)
    setSelectedDifficulty(DIFFICULTY_LEVELS.FLASH)
    setSelectedCategory(category)
    initSessionState(facts)
    logDevEvent('session_started', { type: 'wtf_du_jour', category, factId: effectiveDailyFact.id })
    setScreen(SCREENS.QUESTION)
  }, [effectiveDailyFact])

  // Standalone Flash Solo session
  const handleFlashSolo = useCallback(() => {
    audio.play('click')
    const childMode = localStorage.getItem('wtf_child_mode') !== 'false'
    const validCats = PLAYABLE_CATEGORIES.filter(cat =>
      getValidFacts().some(f => f.category === cat.id) &&
      (childMode || cat.id !== 'kids')
    )
    const randomCat = validCats[Math.floor(Math.random() * validCats.length)]
    const facts = [...getValidFacts().filter(f => f.category === randomCat.id)]
      .sort(() => Math.random() - 0.5)
      .slice(0, 5)
      .map(fact => ({ ...fact, ...getAnswerOptions(fact, DIFFICULTY_LEVELS.FLASH) }))

    setSessionType('flash_solo')
    setGameMode('solo')
    setIsQuickPlay(false)
    setSelectedDifficulty(DIFFICULTY_LEVELS.FLASH)
    setSelectedCategory(randomCat.id)
    initSessionState(facts)
    setScreen(SCREENS.QUESTION)
  }, [])

  // Quick play — no streak/score save (existing behavior kept)
  const handleQuickPlay = useCallback(() => {
    const childMode = localStorage.getItem('wtf_child_mode') !== 'false'
    const validCats = PLAYABLE_CATEGORIES.filter(cat =>
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

  // Solo parcours flow
  const handlePlay = useCallback(() => {
    setGameMode('solo')
    setSessionType('parcours')
    setScreen(SCREENS.DIFFICULTY)
  }, [])

  // ─── HomeScreen navigation handler ──────────────────────────────────────────
  const handleHomeNavigate = useCallback((target) => {
    switch (target) {
      case 'difficulty':    handlePlay(); break
      case 'wtfDuJour':     handleWTFDuJour(); break
      case 'categoryFlash': handleFlashSolo(); break
      case 'collection':    navigate('/collection'); break
      case 'trophees':      navigate('/trophees'); break
      case 'profil':        console.log('Navigation vers Profil — à brancher'); break
      case 'streak':        console.log('Navigation vers Série — à brancher'); break
      case 'marathon':
        setGameMode('marathon')
        setSessionType('marathon')
        setSelectedCategory(null)
        setScreen(SCREENS.CATEGORY)
        break
      default: break
    }
  }, [handlePlay, handleWTFDuJour, handleFlashSolo, navigate])

  const handleSelectDifficulty = useCallback((difficulty) => {
    setSelectedDifficulty(difficulty)

    if (gameMode === 'marathon') {
      // Marathon : 20 questions dans la catégorie choisie, pas de ticket consommé
      const facts = [...getFactsByCategory(selectedCategory)]
        .sort(() => Math.random() - 0.5)
        .slice(0, 20)
        .map(fact => ({ ...fact, ...getAnswerOptions(fact, difficulty) }))
      setIsQuickPlay(false)
      setSessionType('marathon')
      initSessionState(facts)
      setScreen(SCREENS.QUESTION)
      return
    }

    // Parcours standard
    const available = getParcoursFacts().filter(f =>
      f.difficulty === difficulty.id && !unlockedFacts.has(f.id) && !f.isSuperWTF
    )
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

  const handleSelectCategory = useCallback((categoryId) => {
    // Marathon : on mémorise la catégorie puis on va choisir la difficulté
    if (gameMode === 'marathon') {
      setSelectedCategory(categoryId)
      setScreen(SCREENS.DIFFICULTY)
      return
    }

    let facts = []

    if (categoryId === null) {
      const childMode = localStorage.getItem('wtf_child_mode') !== 'false'
      const validCategories = PLAYABLE_CATEGORIES.filter(cat =>
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
  }, [selectedDifficulty, gameMode])

  // ─── Answer handlers ─────────────────────────────────────────────────────

  const handleSelectAnswer = useCallback((answerIndex) => {
    if (!currentFact) return
    const isAnswerCorrect = answerIndex === currentFact.correctIndex

    let points = 0
    if (isAnswerCorrect) {
      if (selectedDifficulty.coinsPerCorrect !== undefined) {
        // Nouveau système : récompense fixe, pas de dégradation par indice
        points = selectedDifficulty.coinsPerCorrect
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
    }

    setScreen(SCREENS.REVELATION)
  }, [currentFact, gameMode, duelCurrentPlayerIndex, hintsUsed, selectedDifficulty])

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
    const freeHints = selectedDifficulty.freeHints ?? 1
    const hintCost  = selectedDifficulty.hintCost  ?? 0
    // Déduire les coins si l'indice est payant
    if (hintNum > freeHints && hintCost > 0) {
      setStorage(prev => {
        const next = { ...prev, wtfCoins: Math.max(0, prev.wtfCoins - hintCost) }
        saveStorage(next)
        return next
      })
    }
    setHintsUsed(hintNum)
    setSessionAnyHintUsed(true)
  }, [selectedDifficulty])

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
        // Unlock correctly answered facts — sauf en mode marathon (f*cts joués mais non collectés)
        const newUnlocked = new Set(unlockedFacts)
        const toSync = []
        if (sessionType !== 'marathon') {
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

        // Badge Perfect (Quête WTF! uniquement) — indices autorisés
        const isPerfectSession = sessionType === 'parcours' && correctCount === sessionFacts.length
        if (isPerfectSession) {
          const catKey = selectedCategory || 'all'
          const diffKey = selectedDifficulty?.id || 'unknown'
          localStorage.setItem(`wtf_perfect_${catKey}_${diffKey}`, 'true')
        }
        setSessionIsPerfect(isPerfectSession)

        // WTF Coins calculation
        let coinsEarned = 0
        if (sessionType === 'wtf_du_jour') {
          coinsEarned = 5 + (newStreak * 2) // 5 base + streak bonus
        } else if (sessionType === 'flash_solo') {
          const isPerfectFlash = correctCount + (isCorrect ? 1 : 0) === sessionFacts.length && !sessionAnyHintUsed && (selectedAnswer !== -1)
          coinsEarned = isPerfectFlash ? 25 : 10
          coinsEarned += newStreak * 2 // streak bonus
        } else if (sessionType === 'parcours') {
          coinsEarned = sessionScore // coins égaux aux points marqués
        } else if (sessionType === 'marathon') {
          // 3 coins par bonne réponse + 20 coins bonus si 20/20
          coinsEarned = correctCount * 3
          if (correctCount === 20) coinsEarned += 20
        }
        setCoinsEarnedLastSession(coinsEarned)

        // Récompenses fidélité Streak (uniquement si 1re session du jour → streak incrémenté)
        const streakReward = isFirstSessionToday ? getStreakReward(newStreak) : null
        if (streakReward) {
          if (streakReward.hints > 0) {
            const currentHints = parseInt(localStorage.getItem('wtf_hints_available') || '0', 10)
            localStorage.setItem('wtf_hints_available', String(currentHints + streakReward.hints))
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

        const newTotalScore = totalScore + sessionScore
        const streakRewardCoins = streakReward?.coins ?? 0
        const newWtfCoins = wtfCoins + coinsEarned + streakRewardCoins
        const newWtfDuJourDate = sessionType === 'wtf_du_jour' ? TODAY() : wtfDuJourDate
        // Marathon ne consomme pas de ticket quête
        const marathonSessionsToday = sessionType === 'marathon' ? sessionsToday : newSessionsToday

        const newStorage = {
          totalScore: newTotalScore,
          streak: newStreak,
          unlockedFacts: newUnlocked,
          wtfCoins: newWtfCoins,
          wtfDuJourDate: newWtfDuJourDate,
          sessionsToday: marathonSessionsToday,
          tickets: (tickets || 0) + (isPerfectSession ? 1 : 0) + (streakReward?.tickets ?? 0),
        }
        saveStorage(newStorage)
        setStorage({
          ...newStorage,
          wtfDuJourFait: newWtfDuJourDate === TODAY(),
        })

        if (user) {
          for (const fact of toSync) {
            updateCollection(user.id, fact.category, fact.id)
          }
        }

        // WTF du Jour: unlock the daily fact too
        if (sessionType === 'wtf_du_jour' && !newUnlocked.has(effectiveDailyFact.id)) {
          newUnlocked.add(effectiveDailyFact.id)
          saveStorage({ ...newStorage, unlockedFacts: newUnlocked })
          setStorage(prev => ({ ...prev, unlockedFacts: newUnlocked }))
          if (user) updateCollection(user.id, effectiveDailyFact.category, effectiveDailyFact.id)
        }
      }

      // Route to appropriate end screen
      if (sessionType === 'wtf_du_jour') {
        setScreen(SCREENS.WTF_REVEAL)
      } else if (sessionType === 'marathon') {
        setScreen(SCREENS.MARATHON_RESULTS)
      } else {
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
  }, [])

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

  const handleTutorialComplete = useCallback(() => {
    setShowTutorial(false)
    // Don't auto-show rules right after tutorial (tutorial covered them)
    rulesAutoShownRef.current = true
  }, [])

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
    initFacts().then(() => {
      setDailyFact(getDailyFact())
      setFactsReady(true)
    })
  }, [])

  // Dev mode: unlock all facts in memory (no localStorage write)
  useEffect(() => {
    if (!factsReady) return
    if (localStorage.getItem('wtf_dev_mode') !== 'true') return
    const allIds = new Set(getValidFacts().map(f => f.id))
    setStorage(prev => ({ ...prev, unlockedFacts: allIds }))
  }, [factsReady])

  // Auto-dismiss streak reward toast après 3 secondes
  useEffect(() => {
    if (!streakRewardToast) return
    const t = setTimeout(() => setStreakRewardToast(null), 3000)
    return () => clearTimeout(t)
  }, [streakRewardToast])

  // HowToPlayModal only opens manually (via Settings), not automatically
  // TutorialOverlay covers onboarding — no duplicate auto-show needed

  // Push history entry on screen change (back button support)
  useEffect(() => {
    window.history.pushState(null, '')
  }, [screen])

  useEffect(() => {
    const handlePopState = () => {
      window.history.pushState(null, '')
      switch (screen) {
        case SCREENS.HOME: break
        case SCREENS.WTF_TEASER: setScreen(SCREENS.HOME); break
        case SCREENS.CATEGORY:
          setScreen(SCREENS.HOME)
          setGameMode('solo')
          break
        case SCREENS.DUEL_SETUP: setScreen(SCREENS.HOME); break
        case SCREENS.RESULTS:
        case SCREENS.WTF_REVEAL:
        case SCREENS.DUEL_RESULTS:
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


  if (!factsReady) {
    return (
      <div className="w-full h-full max-w-md mx-auto flex flex-col items-center justify-center p-6" style={{ background: 'linear-gradient(170deg, #0A0F1E 0%, #1A0A35 60%, #0E1A2E 100%)' }}>
        <style>{`
          @keyframes logoFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-12px); }
          }
        `}</style>

        <div className="mb-8" style={{ animation: 'logoFloat 3s ease-in-out infinite' }}>
          <img src="/logo-wtf.png" alt="WTF Logo" className="w-24 h-24 object-contain" />
        </div>

        <h2 className="text-white font-black text-lg text-center mb-8">Le quiz des f*cts impossibles</h2>

        <div className="text-white/40 text-xs font-bold tracking-widest uppercase">Chargement…</div>
      </div>
    )
  }

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />
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

      {/* First-visit tutorial (mandatory, no skip) */}
      {showTutorial && <TutorialOverlay onComplete={handleTutorialComplete} />}

      {/* Auto-show rules on HOME (once per session, if toggle is ON) */}
      {showHowToPlay && screen === SCREENS.HOME && !showTutorial && (
        <HowToPlayModal onClose={() => setShowHowToPlay(false)} />
      )}

      {screen === SCREENS.HOME && (
        <HomeScreen
          playerCoins={wtfCoins}
          currentStreak={streak}
          dailyQuestsRemaining={dailyQuestsRemaining}
          nextBadgeInfo={null}
          onNavigate={handleHomeNavigate}
          onOpenSettings={() => setShowSettings(true)}
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

      {screen === SCREENS.DIFFICULTY && (
        <DifficultyScreen
          onSelectDifficulty={handleSelectDifficulty}
          onBack={() => setScreen(SCREENS.HOME)}
        />
      )}

      {screen === SCREENS.CATEGORY && (
        <CategoryScreen
          onSelectCategory={handleSelectCategory}
          onBack={() => setScreen(SCREENS.HOME)}
          selectedDifficulty={selectedDifficulty}
          unlockedFacts={unlockedFacts}
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
          difficulty={gameMode === 'solo' ? selectedDifficulty : null}
          playerName={gameMode === 'duel' ? duelPlayers[duelCurrentPlayerIndex]?.name : null}
          playerColor={gameMode === 'duel' ? PLAYER_COLORS[duelCurrentPlayerIndex] : null}
          playerEmoji={gameMode === 'duel' ? PLAYER_EMOJIS[duelCurrentPlayerIndex] : null}
          playerCoins={wtfCoins}
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
          sessionsToday={sessionsToday}
        />
      )}

      {screen === SCREENS.MARATHON_RESULTS && (
        <MarathonScreen
          correctCount={correctCount}
          totalFacts={sessionFacts.length}
          sessionScore={sessionScore}
          coinsEarned={coinsEarnedLastSession}
          isPerfect={correctCount === 20}
          difficulty={selectedDifficulty}
          onReplay={() => {
            setGameMode('marathon')
            setSessionType('marathon')
            setSelectedCategory('kids')
            setScreen(SCREENS.DIFFICULTY)
          }}
          onHome={handleHome}
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

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} onShowRules={handleShowRules} />}

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
