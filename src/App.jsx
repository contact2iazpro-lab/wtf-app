import { useState, useCallback } from 'react'
import { getFactsByCategory } from './data/facts'
import HomeScreen from './screens/HomeScreen'
import CategoryScreen from './screens/CategoryScreen'
import QuestionScreen from './screens/QuestionScreen'
import RevelationScreen from './screens/RevelationScreen'
import ResultsScreen from './screens/ResultsScreen'
import DuelSetupScreen, { PLAYER_COLORS, PLAYER_EMOJIS } from './screens/DuelSetupScreen'
import DuelPassScreen from './screens/DuelPassScreen'
import DuelResultsScreen from './screens/DuelResultsScreen'

const SCREENS = {
  HOME: 'home',
  CATEGORY: 'category',
  QUESTION: 'question',
  REVELATION: 'revelation',
  RESULTS: 'results',
  DUEL_SETUP: 'duel_setup',
  DUEL_PASS: 'duel_pass',
  DUEL_RESULTS: 'duel_results',
}

function loadStorage() {
  try {
    const today = new Date().toDateString()
    const saved = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    const streak = saved.lastDay === today
      ? saved.streak
      : saved.lastDay === new Date(Date.now() - 86400000).toDateString()
        ? saved.streak || 0
        : 0
    return { totalScore: saved.totalScore || 0, streak }
  } catch {
    return { totalScore: 0, streak: 0 }
  }
}

function saveStorage(totalScore, streak) {
  try {
    localStorage.setItem('wtf_data', JSON.stringify({
      totalScore,
      streak,
      lastDay: new Date().toDateString(),
    }))
  } catch { /* ignore */ }
}

export default function App() {
  const [screen, setScreen] = useState(SCREENS.HOME)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [sessionFacts, setSessionFacts] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionScore, setSessionScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [isCorrect, setIsCorrect] = useState(null)
  const [pointsEarned, setPointsEarned] = useState(0)
  const [{ totalScore, streak }, setStorage] = useState(loadStorage)

  // Multiplayer state
  const [duelPlayers, setDuelPlayers] = useState([]) // [{name, score}]
  const [duelCurrentPlayerIndex, setDuelCurrentPlayerIndex] = useState(0)
  const [gameMode, setGameMode] = useState('solo') // 'solo' | 'duel' | 'marathon'

  const numPlayers = duelPlayers.length || 1

  // En multi : chaque joueur a sa propre question par round
  const currentFact = gameMode === 'duel'
    ? sessionFacts[currentIndex * numPlayers + duelCurrentPlayerIndex] || null
    : sessionFacts[currentIndex] || null

  // 1 round = N questions (1 par joueur)
  const totalRounds = gameMode === 'duel'
    ? Math.floor(sessionFacts.length / numPlayers)
    : sessionFacts.length

  // Solo flow
  const handlePlay = useCallback(() => {
    setGameMode('solo')
    setScreen(SCREENS.CATEGORY)
  }, [])

  const handleMarathonMode = useCallback(() => {
    setGameMode('marathon')
    setScreen(SCREENS.CATEGORY)
  }, [])

  const handleSelectCategory = useCallback((categoryId) => {
    let facts = getFactsByCategory(categoryId)
    if (gameMode === 'marathon') {
      facts = [...facts].sort(() => Math.random() - 0.5).slice(0, 20)
    }
    setSelectedCategory(categoryId)
    setSessionFacts(facts)
    setCurrentIndex(0)
    setSessionScore(0)
    setCorrectCount(0)
    setHintsUsed(0)
    setSelectedAnswer(null)
    setIsCorrect(null)
    setScreen(SCREENS.QUESTION)
  }, [gameMode])

  // QCM mode — 1 pt if correct
  const handleSelectAnswer = useCallback((answerIndex) => {
    if (!currentFact) return
    const isAnswerCorrect = answerIndex === currentFact.correctIndex
    const points = isAnswerCorrect ? 1 : 0

    setSelectedAnswer(answerIndex)
    setIsCorrect(isAnswerCorrect)
    setPointsEarned(points)

    if (gameMode === 'duel') {
      setDuelPlayers(ps => ps.map((p, i) => i === duelCurrentPlayerIndex ? { ...p, score: p.score + points } : p))
    } else {
      setSessionScore(s => s + points)
      if (isAnswerCorrect) setCorrectCount(c => c + 1)
    }

    setScreen(SCREENS.REVELATION)
  }, [currentFact, gameMode, duelCurrentPlayerIndex])

  // Open mode — 5/3/2 pts based on hints, validated by questioner
  const handleOpenValidate = useCallback((isCorrect) => {
    const points = isCorrect ? (hintsUsed === 0 ? 5 : hintsUsed === 1 ? 3 : 2) : 0

    setSelectedAnswer(isCorrect ? 100 : -2) // sentinels: 100=open correct, -2=open incorrect
    setIsCorrect(isCorrect)
    setPointsEarned(points)

    if (gameMode === 'duel') {
      setDuelPlayers(ps => ps.map((p, i) => i === duelCurrentPlayerIndex ? { ...p, score: p.score + points } : p))
    } else {
      setSessionScore(s => s + points)
      if (isCorrect) setCorrectCount(c => c + 1)
    }

    setScreen(SCREENS.REVELATION)
  }, [hintsUsed, gameMode, duelCurrentPlayerIndex])

  const handleTimeout = useCallback(() => {
    if (selectedAnswer !== null) return
    setSelectedAnswer(-1)
    setIsCorrect(false)
    setPointsEarned(0)
    setScreen(SCREENS.REVELATION)
  }, [selectedAnswer])

  const handleUseHint = useCallback((hintNum) => {
    setHintsUsed(hintNum)
  }, [])

  // Called from RevelationScreen "next" — mode-aware
  const handleNext = useCallback(() => {
    const nextIndex = currentIndex + 1

    if (gameMode === 'duel') {
      // Last player finished this round → next round or results
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

    // Solo mode
    if (nextIndex >= sessionFacts.length) {
      const newStreak = streak + 1
      saveStorage(totalScore + sessionScore, newStreak)
      setStorage({ totalScore: totalScore + sessionScore, streak: newStreak })
      setScreen(SCREENS.RESULTS)
    } else {
      setCurrentIndex(nextIndex)
      setHintsUsed(0)
      setSelectedAnswer(null)
      setIsCorrect(null)
      setPointsEarned(0)
      setScreen(SCREENS.QUESTION)
    }
  }, [gameMode, currentIndex, sessionFacts.length, sessionScore, totalScore, streak])

  // Multi: current player finished → pass to next player
  const handleDuelNextPlayer = useCallback(() => {
    setDuelCurrentPlayerIndex(i => i + 1)
    setHintsUsed(0)
    setSelectedAnswer(null)
    setIsCorrect(null)
    setPointsEarned(0)
    setScreen(SCREENS.DUEL_PASS)
  }, [])

  // Duel flow
  const handleDuelMode = useCallback(() => {
    setScreen(SCREENS.DUEL_SETUP)
  }, [])

  const handleDuelStart = useCallback((playerNames) => {
    const n = playerNames.length
    const allFacts = getFactsByCategory(null)
    const shuffled = [...allFacts].sort(() => Math.random() - 0.5).slice(0, 10 * n)

    setDuelPlayers(playerNames.map(name => ({ name, score: 0 })))
    setDuelCurrentPlayerIndex(0)
    setGameMode('duel')
    setSessionFacts(shuffled)
    setCurrentIndex(0)
    setHintsUsed(0)
    setSelectedAnswer(null)
    setIsCorrect(null)
    setScreen(SCREENS.DUEL_PASS)
  }, [])

  const handleDuelPassReady = useCallback(() => {
    setScreen(SCREENS.QUESTION)
  }, [])

  const handleDuelReplay = useCallback(() => {
    handleDuelStart(duelPlayers.map(p => p.name))
  }, [duelPlayers, handleDuelStart])

  const handleReplay = useCallback(() => {
    handleSelectCategory(selectedCategory)
  }, [selectedCategory, handleSelectCategory])

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
  }, [])

  const handleShare = useCallback(() => {
    if (!currentFact) return
    const text = `🤯 WTF! "${currentFact.shortAnswer}" — ${currentFact.question}\nJoue sur What The Fact! #WTF`
    if (navigator.share) {
      navigator.share({ text }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(text).catch(() => {})
    }
  }, [currentFact])

  // Multiplayer context passed to screens
  const duelContext = gameMode === 'duel' ? {
    currentPlayerIndex: duelCurrentPlayerIndex,
    playerName: duelPlayers[duelCurrentPlayerIndex]?.name ?? '',
    players: duelPlayers,
    isLastPlayer: duelCurrentPlayerIndex === duelPlayers.length - 1,
  } : null

  return (
    <div className="w-full h-full max-w-md mx-auto relative overflow-hidden bg-wtf-bg">
      {screen === SCREENS.HOME && (
        <HomeScreen
          totalScore={totalScore}
          streak={streak}
          onPlay={handlePlay}
          onDuel={handleDuelMode}
          onMarathon={handleMarathonMode}
        />
      )}
      {screen === SCREENS.CATEGORY && (
        <CategoryScreen
          onSelectCategory={handleSelectCategory}
          onBack={() => setScreen(SCREENS.HOME)}
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
          playerName={gameMode === 'duel' ? duelPlayers[duelCurrentPlayerIndex]?.name : null}
          playerColor={gameMode === 'duel' ? PLAYER_COLORS[duelCurrentPlayerIndex] : null}
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
        />
      )}
      {screen === SCREENS.RESULTS && (
        <ResultsScreen
          score={sessionScore}
          correctCount={correctCount}
          totalFacts={totalRounds}
          onReplay={handleReplay}
          onHome={handleHome}
        />
      )}
      {screen === SCREENS.DUEL_SETUP && (
        <DuelSetupScreen
          onStart={handleDuelStart}
          onBack={() => setScreen(SCREENS.HOME)}
        />
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
    </div>
  )
}
