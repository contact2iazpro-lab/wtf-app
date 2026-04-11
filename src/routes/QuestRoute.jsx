/**
 * QuestRoute — Flow complet du mode Quest (Quête WTF!).
 *
 * Flow : MODE_LAUNCH → DIFFICULTY → QUESTION → REVELATION → RESULTS
 * (pas de CATEGORY pour Quest — la catégorie est déterminée par la difficulté)
 *
 * Ce composant est autonome : il gère son propre screen state interne
 * et utilise les hooks partagés pour la logique de jeu.
 */

import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DIFFICULTY_LEVELS, SCREENS, MODE_CONFIGS, QUESTIONS_PER_GAME, getStreakReward } from '../constants/gameConfig'
import { getValidFacts, getParcoursFacts, getQuestFacts, getCategoryLevelFactIds } from '../data/factsService'
import { getAnswerOptions } from '../utils/answers'
import { loadStorage, saveStorage, updateTrophyData } from '../utils/storageHelper'
import { updateCoins, updateTickets, updateHints, getBalances } from '../services/currencyService'
import { useAuth } from '../context/AuthContext'
import { useSessionEnd } from '../hooks/useSessionEnd'
import { audio } from '../utils/audio'

import ModeLaunchScreen from '../screens/ModeLaunchScreen'
import DifficultyScreen from '../screens/DifficultyScreen'
import QuestionScreen from '../screens/QuestionScreen'
import RevelationScreen from '../screens/RevelationScreen'
import ResultsScreen from '../screens/ResultsScreen'
import GameModal from '../components/GameModal'

// Local screens for this route
const QUEST_SCREENS = {
  LAUNCH: 'launch',
  DIFFICULTY: 'difficulty',
  QUESTION: 'question',
  REVELATION: 'revelation',
  RESULTS: 'results',
}

export default function QuestRoute() {
  const navigate = useNavigate()
  const { user } = useAuth()

  // ── Local screen state ─────────────────────────────────────────────────
  const [screen, setScreen] = useState(() => {
    const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    const questsPlayed = wd.questsPlayed || 0
    // Première Quest : skip launch + difficulty → force Cool
    if (questsPlayed === 0) return QUEST_SCREENS.DIFFICULTY
    // Sinon : check skip launch
    const skip = localStorage.getItem('skip_launch_quest') === 'true'
    return skip ? QUEST_SCREENS.DIFFICULTY : QUEST_SCREENS.LAUNCH
  })

  // ── Session state ──────────────────────────────────────────────────────
  const [selectedDifficulty, setSelectedDifficulty] = useState(DIFFICULTY_LEVELS.HOT)
  const [sessionFacts, setSessionFacts] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionScore, setSessionScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [sessionAnyHintUsed, setSessionAnyHintUsed] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [isCorrect, setIsCorrect] = useState(null)
  const [pointsEarned, setPointsEarned] = useState(0)
  const [sessionCorrectFacts, setSessionCorrectFacts] = useState([])
  const [sessionIsPerfect, setSessionIsPerfect] = useState(false)
  const [completedLevels, setCompletedLevels] = useState([])
  const [coinsEarnedLastSession, setCoinsEarnedLastSession] = useState(0)
  const [newlyUnlockedCategories, setNewlyUnlockedCategories] = useState([])
  const [showNewCategoriesModal, setShowNewCategoriesModal] = useState(false)
  const [showNoTicketModal, setShowNoTicketModal] = useState(false)
  const [trophyQueue, setTrophyQueue] = useState([])
  const [streakRewardToast, setStreakRewardToast] = useState(null)
  const [showStreakSpecialModal, setShowStreakSpecialModal] = useState(false)

  // Storage
  const [storage, setStorage] = useState(loadStorage)
  const { unlockedFacts, tickets, streak, totalScore, sessionsToday, wtfCoins, wtfDuJourDate } = storage

  // Derived
  const currentFact = sessionFacts[currentIndex] || null
  const totalRounds = sessionFacts.length

  // Refresh storage on currency update
  useEffect(() => {
    const handler = () => setStorage(loadStorage())
    window.addEventListener('wtf_currency_updated', handler)
    window.addEventListener('wtf_storage_sync', handler)
    return () => {
      window.removeEventListener('wtf_currency_updated', handler)
      window.removeEventListener('wtf_storage_sync', handler)
    }
  }, [])

  // ── Session end hook ───────────────────────────────────────────────────
  const { processSessionEnd } = useSessionEnd({
    user,
    onTrophiesEarned: (badges) => setTrophyQueue(badges),
    onCategoriesUnlocked: (cats) => { setNewlyUnlockedCategories(cats); setShowNewCategoriesModal(true) },
    onStreakReward: (toast) => setStreakRewardToast(toast),
    onStreakSpecial: () => setShowStreakSpecialModal(true),
  })

  // ── Init session ───────────────────────────────────────────────────────
  function initSession(facts) {
    setSessionFacts(facts)
    setCurrentIndex(0)
    setSessionScore(0)
    setCorrectCount(0)
    setHintsUsed(0)
    setSessionAnyHintUsed(false)
    setSelectedAnswer(null)
    setIsCorrect(null)
    setSessionCorrectFacts([])
    setSessionIsPerfect(false)
    setPointsEarned(0)
    setNewlyUnlockedCategories([])
    setShowNewCategoriesModal(false)
    setCompletedLevels([])
  }

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleLaunchStart = useCallback(() => {
    const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    if ((wd.questsPlayed || 0) === 0) {
      setSelectedDifficulty(DIFFICULTY_LEVELS.COOL)
      handleSelectDifficulty(DIFFICULTY_LEVELS.COOL)
    } else {
      setScreen(QUEST_SCREENS.DIFFICULTY)
    }
  }, [])

  const handleSelectDifficulty = useCallback((difficulty) => {
    setSelectedDifficulty(difficulty)

    const isDevMode = localStorage.getItem('wtf_dev_mode') === 'true' || localStorage.getItem('wtf_test_mode') === 'true'
    const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    const isFirstQuestEver = !wd.onboardingCompleted && (wd.questsPlayed || 0) === 0

    // Check ticket
    if (!isDevMode && !isFirstQuestEver) {
      if ((tickets || 0) < 1) {
        setShowNoTicketModal(true)
        return
      }
      updateTickets(-1)
      setStorage(loadStorage())
    }

    // Build facts pool
    const skipUnlock = isDevMode
    let available = getParcoursFacts().filter(f =>
      f.isVip && f.difficulty === difficulty.id && (skipUnlock || !unlockedFacts.has(f.id))
    )
    if (available.length < QUESTIONS_PER_GAME) {
      available = getParcoursFacts().filter(f => f.isVip && (skipUnlock || !unlockedFacts.has(f.id)))
    }
    if (available.length < QUESTIONS_PER_GAME) {
      available = getQuestFacts()
    }
    if (available.length < QUESTIONS_PER_GAME) {
      available = getValidFacts()
    }

    const facts = [...available]
      .sort(() => Math.random() - 0.5)
      .slice(0, QUESTIONS_PER_GAME)
      .map(fact => ({ ...fact, ...getAnswerOptions(fact, difficulty) }))

    initSession(facts)
    setScreen(QUEST_SCREENS.QUESTION)
  }, [unlockedFacts, tickets])

  const handleSelectAnswer = useCallback((answerIndex) => {
    if (!currentFact) return
    const isAnswerCorrect = answerIndex === currentFact.correctIndex

    let points = 0
    if (isAnswerCorrect) {
      points = selectedDifficulty.coinsPerCorrect ?? 0
    }

    setSelectedAnswer(answerIndex)
    setIsCorrect(isAnswerCorrect)
    setPointsEarned(points)

    if (isAnswerCorrect) {
      setSessionCorrectFacts(prev => [...prev, currentFact])
      setSessionScore(s => s + points)
      setCorrectCount(c => c + 1)
      if (points > 0) updateCoins(points)
    }

    setScreen(QUEST_SCREENS.REVELATION)
  }, [currentFact, selectedDifficulty])

  const handleOpenValidate = useCallback((correct) => {
    const points = correct ? (selectedDifficulty.coinsPerCorrect ?? 0) : 0

    setSelectedAnswer(correct ? 100 : -2)
    setIsCorrect(correct)
    setPointsEarned(points)

    if (correct && currentFact) {
      setSessionCorrectFacts(prev => [...prev, currentFact])
      setSessionScore(s => s + points)
      setCorrectCount(c => c + 1)
      if (points > 0) updateCoins(points)
    }

    setScreen(QUEST_SCREENS.REVELATION)
  }, [currentFact, selectedDifficulty])

  const handleTimeout = useCallback(() => {
    if (selectedAnswer !== null) return
    setSelectedAnswer(-1)
    setIsCorrect(false)
    setPointsEarned(0)
    setScreen(QUEST_SCREENS.REVELATION)
  }, [selectedAnswer])

  const handleUseHint = useCallback((hintNum) => {
    const freeHints = selectedDifficulty?.freeHints || 0
    if (hintNum > freeHints) {
      if (getBalances().hints < 1) return
      updateHints(-1)
    }
    setHintsUsed(hintNum)
    setSessionAnyHintUsed(true)
  }, [selectedDifficulty])

  const handleNext = useCallback(() => {
    const nextIndex = currentIndex + 1

    if (nextIndex >= sessionFacts.length) {
      // Session terminée
      const result = processSessionEnd({
        sessionType: 'parcours',
        sessionFacts,
        sessionCorrectFacts,
        sessionScore,
        correctCount,
        isCorrect,
        sessionAnyHintUsed,
        selectedAnswer,
        selectedDifficulty,
        selectedCategory: null,
        effectiveDailyFact: null,
        isQuickPlay: false,
      })

      setCoinsEarnedLastSession(result.totalCoinsEarned)
      setSessionIsPerfect(result.isPerfect)
      setCompletedLevels(result.completedLevels)
      setScreen(QUEST_SCREENS.RESULTS)
    } else {
      setCurrentIndex(nextIndex)
      setHintsUsed(0)
      setSelectedAnswer(null)
      setIsCorrect(null)
      setPointsEarned(0)
      setScreen(QUEST_SCREENS.QUESTION)
    }
  }, [currentIndex, sessionFacts, sessionCorrectFacts, sessionScore, correctCount,
      isCorrect, sessionAnyHintUsed, selectedAnswer, selectedDifficulty, processSessionEnd])

  const handleHome = useCallback(() => {
    navigate('/')
  }, [navigate])

  const handleReplay = useCallback(() => {
    setScreen(QUEST_SCREENS.DIFFICULTY)
  }, [])

  const handleShare = useCallback(() => {
    if (!currentFact) return
    const text = `🤯 WTF! "${currentFact.shortAnswer}" — ${currentFact.question}\nJoue sur What The F*ct! #WTF`
    if (navigator.share) {
      navigator.share({ text }).catch(() => {})
    }
  }, [currentFact])

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      {screen === QUEST_SCREENS.LAUNCH && (
        <ModeLaunchScreen
          mode={MODE_CONFIGS.quest}
          onStart={handleLaunchStart}
          onBack={handleHome}
        />
      )}

      {screen === QUEST_SCREENS.DIFFICULTY && (
        <DifficultyScreen
          onSelectDifficulty={handleSelectDifficulty}
          onBack={handleHome}
        />
      )}

      {screen === QUEST_SCREENS.QUESTION && currentFact && (
        <QuestionScreen
          key={`quest-${currentFact.id}`}
          fact={currentFact}
          factIndex={currentIndex}
          totalFacts={totalRounds}
          hintsUsed={hintsUsed}
          onSelectAnswer={handleSelectAnswer}
          onOpenValidate={handleOpenValidate}
          onUseHint={handleUseHint}
          onTimeout={handleTimeout}
          onQuit={handleHome}
          category={null}
          gameMode="solo"
          difficulty={selectedDifficulty}
          playerCoins={wtfCoins}
          playerHints={parseInt(localStorage.getItem('wtf_hints_available') || '0', 10)}
          playerTickets={tickets}
          sessionType="parcours"
        />
      )}

      {screen === QUEST_SCREENS.REVELATION && currentFact && (
        <RevelationScreen
          key={`quest-rev-${currentFact.id}`}
          fact={currentFact}
          isCorrect={isCorrect}
          selectedAnswer={selectedAnswer}
          pointsEarned={pointsEarned}
          hintsUsed={hintsUsed}
          onNext={handleNext}
          onShare={handleShare}
          onQuit={handleHome}
          factIndex={currentIndex}
          totalFacts={totalRounds}
          duelContext={null}
          gameMode="solo"
          sessionScore={sessionScore}
        />
      )}

      {screen === QUEST_SCREENS.RESULTS && (
        <ResultsScreen
          sessionScore={sessionScore}
          correctCount={correctCount}
          totalFacts={sessionFacts.length}
          coinsEarned={coinsEarnedLastSession}
          onHome={handleHome}
          onReplay={handleReplay}
          sessionType="parcours"
          isPerfect={sessionIsPerfect}
          completedLevels={completedLevels}
          selectedDifficulty={selectedDifficulty}
        />
      )}

      {/* Modals */}
      {showNoTicketModal && (
        <GameModal
          emoji="🎫"
          title="Pas de ticket !"
          message="Il te faut 1 ticket pour jouer en Quest. Achète-en dans la Boutique !"
          confirmLabel="Boutique"
          cancelLabel="Retour"
          onConfirm={() => { setShowNoTicketModal(false); navigate('/boutique') }}
          onCancel={() => { setShowNoTicketModal(false); handleHome() }}
        />
      )}

      {trophyQueue.length > 0 && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 600,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
          onClick={() => setTrophyQueue(q => q.slice(1))}
        >
          <div style={{
            background: 'linear-gradient(145deg, #1a1a2e, #2d1b4e)', borderRadius: 24,
            padding: '32px 28px', maxWidth: 340, width: '100%', textAlign: 'center',
            border: '2px solid rgba(255,215,0,0.4)',
            boxShadow: '0 0 40px rgba(255,215,0,0.3), 0 20px 60px rgba(0,0,0,0.5)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>{trophyQueue[0].emoji}</div>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#FFD700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Trophée débloqué !</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'white', marginBottom: 8 }}>{trophyQueue[0].label}</div>
            {trophyQueue[0].description && (
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>{trophyQueue[0].description}</div>
            )}
            <button
              onClick={() => setTrophyQueue(q => q.slice(1))}
              style={{ width: '100%', padding: '14px 0', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#1a1a2e', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}
            >
              {trophyQueue.length > 1 ? `Suivant (${trophyQueue.length - 1} de plus)` : 'Continuer'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
