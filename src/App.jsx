import { useState, useCallback, useEffect } from 'react'
import { getFactsByCategory, VALID_FACTS, CATEGORIES } from './data/facts'
import { getAnswerOptions } from './utils/answers'
import HomeScreen from './screens/HomeScreen'
import DifficultyScreen from './screens/DifficultyScreen'
import CategoryScreen from './screens/CategoryScreen'
import QuestionScreen from './screens/QuestionScreen'
import RevelationScreen from './screens/RevelationScreen'
import ResultsScreen from './screens/ResultsScreen'
import DuelSetupScreen, { PLAYER_COLORS, PLAYER_EMOJIS } from './screens/DuelSetupScreen'
import DuelPassScreen from './screens/DuelPassScreen'
import DuelResultsScreen from './screens/DuelResultsScreen'
import SettingsModal from './components/SettingsModal'
import { audio } from './utils/audio'

const SCREENS = {
  HOME: 'home',
  DIFFICULTY: 'difficulty',
  CATEGORY: 'category',
  QUESTION: 'question',
  REVELATION: 'revelation',
  RESULTS: 'results',
  DUEL_SETUP: 'duel_setup',
  DUEL_PASS: 'duel_pass',
  DUEL_RESULTS: 'duel_results',
}

const DIFFICULTY_LEVELS = {
  EXPERT: { id: 'expert', label: 'Parcours Expert', emoji: '⚡', choices: 6, duration: 10, hintsAllowed: false, scoring: { correct: 5, wrong: 0 } },
  NORMAL: { id: 'normal', label: 'Parcours Normal', emoji: '🧠', choices: 4, duration: 20, hintsAllowed: false, scoring: { correct: 3, wrong: 0 } },
  EASY:   { id: 'easy',   label: 'Parcours Facile', emoji: '💚', choices: 6, duration: 20, hintsAllowed: true,  scoring: { correct: [3, 2, 1], wrong: 0 } },
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
  const [selectedDifficulty, setSelectedDifficulty] = useState(DIFFICULTY_LEVELS.NORMAL)
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
  const [showHowToPlay, setShowHowToPlay] = useState(() => localStorage.getItem('wtf_hide_howtoplay') !== 'true')
  const [showSettings, setShowSettings] = useState(false)
  const [isQuickPlay, setIsQuickPlay] = useState(false)

  const numPlayers = duelPlayers.length || 1

  // En multi : chaque joueur a sa propre question par round
  const currentFact = gameMode === 'duel'
    ? sessionFacts[currentIndex * numPlayers + duelCurrentPlayerIndex] || null
    : sessionFacts[currentIndex] || null

  // 1 round = N questions (1 par joueur)
  const totalRounds = gameMode === 'duel'
    ? Math.floor(sessionFacts.length / numPlayers)
    : sessionFacts.length

  // Quick play — Normal mode, random valid category, no streak/score save
  const handleQuickPlay = useCallback(() => {
    const validCats = CATEGORIES.filter(cat => VALID_FACTS.some(f => f.category === cat.id))
    const randomCat = validCats[Math.floor(Math.random() * validCats.length)]
    const difficulty = DIFFICULTY_LEVELS.NORMAL
    const facts = [...VALID_FACTS.filter(f => f.category === randomCat.id)]
      .sort(() => Math.random() - 0.5)
      .slice(0, 10)
      .map(fact => ({ ...fact, ...getAnswerOptions(fact, difficulty) }))

    setIsQuickPlay(true)
    setGameMode('solo')
    setSelectedDifficulty(difficulty)
    setSelectedCategory(randomCat.id)
    setSessionFacts(facts)
    setCurrentIndex(0)
    setSessionScore(0)
    setCorrectCount(0)
    setHintsUsed(0)
    setSelectedAnswer(null)
    setIsCorrect(null)
    setScreen(SCREENS.QUESTION)
  }, [])

  // Solo flow
  const handlePlay = useCallback(() => {
    setGameMode('solo')
    setScreen(SCREENS.DIFFICULTY)
  }, [])

  const handleSelectDifficulty = useCallback((difficulty) => {
    setSelectedDifficulty(difficulty)
    setScreen(SCREENS.CATEGORY)
  }, [])

  const handleMarathonMode = useCallback(() => {
    setGameMode('marathon')
    setScreen(SCREENS.CATEGORY)
  }, [])

  const handleSelectCategory = useCallback((categoryId) => {
    let facts = []

    if (categoryId === null) {
      // "Aléatoires" : 1 question aléatoire de 10 catégories distinctes
      const validCategories = CATEGORIES.filter(cat =>
        VALID_FACTS.some(f => f.category === cat.id)
      )

      if (validCategories.length < 10) {
        // Fallback: si moins de 10 catégories valides, prendre 10 questions aléatoires
        console.warn(`[WARNING] Moins de 10 catégories valides (${validCategories.length}), fallback sur 10 questions aléatoires`)
        facts = [...VALID_FACTS].sort(() => Math.random() - 0.5).slice(0, 10)
      } else {
        // Sélectionner 10 catégories aléatoires
        const selectedCats = [...validCategories]
          .sort(() => Math.random() - 0.5)
          .slice(0, 10)

        // Pour chaque catégorie, tirer 1 question aléatoire
        facts = selectedCats.map(cat => {
          const catFacts = VALID_FACTS.filter(f => f.category === cat.id)
          return catFacts[Math.floor(Math.random() * catFacts.length)]
        })

        // Mélanger l'ordre final
        facts.sort(() => Math.random() - 0.5)
      }
    } else {
      // Catégorie spécifique : 10 questions de cette catégorie
      facts = [...getFactsByCategory(categoryId)]
        .sort(() => Math.random() - 0.5)
        .slice(0, 10)
    }

    // Apply difficulty configuration to facts (generate options + shuffle)
    const factsWithOptions = facts.map(fact => ({
      ...fact,
      ...getAnswerOptions(fact, selectedDifficulty)
    }))

    setSelectedCategory(categoryId)
    setSessionFacts(factsWithOptions)
    setCurrentIndex(0)
    setSessionScore(0)
    setCorrectCount(0)
    setHintsUsed(0)
    setSelectedAnswer(null)
    setIsCorrect(null)
    setScreen(SCREENS.QUESTION)
  }, [selectedDifficulty])

  // QCM mode — points based on difficulty + hints used
  const handleSelectAnswer = useCallback((answerIndex) => {
    if (!currentFact) return
    const isAnswerCorrect = answerIndex === currentFact.correctIndex

    // Calculate points based on difficulty + correctness + hints
    let points = 0
    if (isAnswerCorrect) {
      if (!selectedDifficulty.hintsAllowed) {
        // Expert/Normal: fixed points regardless of hints
        points = selectedDifficulty.scoring.correct
      } else {
        // Easy: 3/2/1 based on hints
        const hintScoring = selectedDifficulty.scoring.correct
        points = hintScoring[hintsUsed] ?? hintScoring[2]  // 0-hints=3, 1-hint=2, 2-hints=1
      }
    } else {
      points = 0
    }

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
  }, [currentFact, gameMode, duelCurrentPlayerIndex, hintsUsed, selectedDifficulty])

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
      if (!isQuickPlay) {
        const newStreak = streak + 1
        saveStorage(totalScore + sessionScore, newStreak)
        setStorage({ totalScore: totalScore + sessionScore, streak: newStreak })
      }
      setScreen(SCREENS.RESULTS)
    } else {
      setCurrentIndex(nextIndex)
      setHintsUsed(0)
      setSelectedAnswer(null)
      setIsCorrect(null)
      setPointsEarned(0)
      setScreen(SCREENS.QUESTION)
    }
  }, [gameMode, currentIndex, sessionFacts.length, sessionScore, totalScore, streak, isQuickPlay])

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
    setGameMode('duel')
    setShowHowToPlay(localStorage.getItem('wtf_hide_howtoplay') !== 'true')
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
    setIsQuickPlay(false)
  }, [])

  const handleShare = useCallback(() => {
    if (!currentFact) return
    const text = `🤯 WTF! "${currentFact.shortAnswer}" — ${currentFact.question}\nJoue sur What The F*ct! #WTF`
    if (navigator.share) {
      navigator.share({ text }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(text).catch(() => {})
    }
  }, [currentFact])

  const handleShowRules = useCallback(() => {
    setShowHowToPlay(true)
  }, [])

  // Multiplayer context passed to screens
  const duelContext = gameMode === 'duel' ? {
    currentPlayerIndex: duelCurrentPlayerIndex,
    playerName: duelPlayers[duelCurrentPlayerIndex]?.name ?? '',
    players: duelPlayers,
    isLastPlayer: duelCurrentPlayerIndex === duelPlayers.length - 1,
  } : null

  // Push a history entry on every screen change so the browser back button
  // fires popstate instead of exiting the app immediately.
  useEffect(() => {
    window.history.pushState(null, '')
  }, [screen])

  // Handle mobile hardware back button / swipe back
  useEffect(() => {
    const handlePopState = () => {
      // Re-push immediately so the next back press also fires popstate
      window.history.pushState(null, '')

      switch (screen) {
        case SCREENS.HOME:
          break // already home, nothing to do
        case SCREENS.CATEGORY:
          setScreen(SCREENS.HOME)
          setGameMode('solo')
          break
        case SCREENS.DUEL_SETUP:
          setScreen(SCREENS.HOME)
          break
        case SCREENS.RESULTS:
        case SCREENS.DUEL_RESULTS:
          handleHome()
          break
        default:
          // Mid-game screens (QUESTION, REVELATION, DUEL_PASS)
          if (gameMode === 'marathon') {
            if (!window.confirm('Quitter la partie marathon ? Votre score ne sera pas sauvegardé.')) break
          }
          handleHome()
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [screen, gameMode, handleHome])

  return (
    <div className="w-full h-full max-w-md mx-auto relative overflow-hidden bg-wtf-bg">
      {screen === SCREENS.HOME && (
        <HomeScreen
          totalScore={totalScore}
          streak={streak}
          onPlay={handlePlay}
          onQuickPlay={handleQuickPlay}
          onDuel={handleDuelMode}
          onMarathon={handleMarathonMode}
        />
      )}
      {screen === SCREENS.DIFFICULTY && (
        <DifficultyScreen
          onSelectDifficulty={handleSelectDifficulty}
          onBack={() => setScreen(SCREENS.HOME)}
        />
      )}
      {screen === SCREENS.CATEGORY && (
        <>
          {showHowToPlay && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
              <div className="w-full rounded-3xl p-6 border" style={{ background: '#fff', borderColor: 'rgba(0,0,0,0.1)', maxWidth: '420px', maxHeight: '85vh', overflowY: 'auto' }}>
                {gameMode === 'solo' ? (
                  <>
                    <div className="text-4xl text-center mb-4">{selectedDifficulty.emoji}</div>
                    <h2 className="text-xl font-black text-center mb-3" style={{ color: '#1a1a2e' }}>{selectedDifficulty.label}</h2>
                    <div className="text-sm mb-5" style={{ color: '#333', lineHeight: '1.6' }}>
                      <p className="mb-3"><strong>🎯 Le jeu :</strong> Chaque <strong>F*ct</strong> vous pose une question sur un sujet aléatoire.</p>
                      <p className="mb-3"><strong>🎲 Choix :</strong> <strong>{selectedDifficulty.choices} réponses</strong> possibles pour chaque question.</p>
                      <p className="mb-3"><strong>⏱️ Temps :</strong> Vous avez <strong>{selectedDifficulty.duration} secondes</strong> pour répondre.</p>
                      {selectedDifficulty.hintsAllowed ? (
                        <p className="mb-3"><strong>💡 Indices :</strong> Utilisez jusqu'à <strong>2 indices</strong> pour vous aider. <strong>3 pts</strong> sans indice, <strong>2 pts</strong> avec 1 indice, <strong>1 pt</strong> avec 2 indices.</p>
                      ) : (
                        <p className="mb-3"><strong>💡 Indices :</strong> Aucun indice disponible dans ce parcours.</p>
                      )}
                      <p className="mb-3"><strong>⭐ Points :</strong> <strong>{selectedDifficulty.scoring.correct} points</strong> par réponse correcte.</p>
                      <p><strong>📊 Score :</strong> Accumulez des points et battez vos records !</p>
                    </div>
                  </>
                ) : gameMode === 'marathon' ? (
                  <>
                    <div className="text-4xl text-center mb-4">🏃</div>
                    <h2 className="text-xl font-black text-center mb-3" style={{ color: '#1a1a2e' }}>Marathon</h2>
                    <div className="text-sm mb-5" style={{ color: '#333', lineHeight: '1.6' }}>
                      <p className="mb-3"><strong>🎯 Le jeu :</strong> Testez vos limites avec une série de <strong>20 questions</strong> sur des sujets variés et aléatoires.</p>
                      <p className="mb-3"><strong>🎲 Choix :</strong> <strong>4 réponses</strong> possibles pour chaque question.</p>
                      <p className="mb-3"><strong>⏱️ Temps :</strong> Vous avez <strong>20 secondes</strong> par question pour répondre.</p>
                      <p className="mb-3"><strong>💡 Indices :</strong> Aucun indice disponible. Pas d'aide, juste vos connaissances !</p>
                      <p className="mb-3"><strong>⭐ Points :</strong> <strong>3 points</strong> par réponse correcte.</p>
                      <p><strong>🔥 Défi :</strong> Tenez 20 questions sans vous arrêter et établissez votre meilleur score !</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-4xl text-center mb-4">🎮</div>
                    <h2 className="text-xl font-black text-center mb-3" style={{ color: '#1a1a2e' }}>Multijoueur</h2>
                    <div className="text-sm mb-5" style={{ color: '#333', lineHeight: '1.6' }}>
                      <p className="mb-3"><strong>👥 Tour par tour :</strong> Chaque joueur répond à des questions à son tour. Respectez l'ordre !</p>
                      <p className="mb-3"><strong>⚡ Rapidité :</strong> Vous avez 20 secondes par question pour choisir la bonne réponse.</p>
                      <p className="mb-3"><strong>🏆 Scoring :</strong> <strong>5 pts</strong> si correct sans indice • <strong>3 pts</strong> avec 1 indice • <strong>2 pts</strong> avec 2 indices • <strong>0 pts</strong> si incorrect.</p>
                      <p className="mb-3"><strong>🎯 Gagnant :</strong> Le joueur avec le plus de points à la fin remporte la partie !</p>
                      <p><strong>📋 Règle :</strong> Chaque joueur voit ses points en temps réel. Les autres joueurs attendent leur tour.</p>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-2 mb-4 p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.03)' }}>
                  <input
                    type="checkbox"
                    id="hideHowToPlay"
                    onChange={(e) => {
                      if (e.target.checked) {
                        localStorage.setItem('wtf_hide_howtoplay', 'true')
                      }
                    }}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="hideHowToPlay" className="text-xs cursor-pointer" style={{ color: '#666' }}>
                    Ne plus afficher ce message
                  </label>
                </div>
                <button
                  onClick={() => setShowHowToPlay(false)}
                  className="w-full py-3 rounded-2xl font-black text-sm active:scale-95 transition-all"
                  style={{ background: '#FF6B1A', color: 'white' }}>
                  C'est parti ! 🚀
                </button>
              </div>
            </div>
          )}
          <CategoryScreen
            onSelectCategory={handleSelectCategory}
            onBack={() => setScreen(SCREENS.HOME)}
          />
        </>
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
          difficulty={gameMode === 'solo' ? selectedDifficulty : null}
          playerName={gameMode === 'duel' ? duelPlayers[duelCurrentPlayerIndex]?.name : null}
          playerColor={gameMode === 'duel' ? PLAYER_COLORS[duelCurrentPlayerIndex] : null}
          playerEmoji={gameMode === 'duel' ? PLAYER_EMOJIS[duelCurrentPlayerIndex] : null}
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
          onReplay={handleReplay}
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
                  <p className="mb-3"><strong>👥 Tour par tour :</strong> Chaque joueur répond à des questions à son tour. Respectez l'ordre !</p>
                  <p className="mb-3"><strong>⚡ Rapidité :</strong> Vous avez 20 secondes par question pour choisir la bonne réponse.</p>
                  <p className="mb-3"><strong>🏆 Scoring :</strong> <strong>5 pts</strong> si correct sans indice • <strong>3 pts</strong> avec 1 indice • <strong>2 pts</strong> avec 2 indices • <strong>0 pts</strong> si incorrect.</p>
                  <p className="mb-3"><strong>🎯 Gagnant :</strong> Le joueur avec le plus de points à la fin remporte la partie !</p>
                  <p><strong>📋 Règle :</strong> Chaque joueur voit ses points en temps réel. Les autres joueurs attendent leur tour.</p>
                </div>
                <div className="flex items-center gap-2 mb-4 p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.03)' }}>
                  <input
                    type="checkbox"
                    id="hideHowToPlayDuel"
                    onChange={(e) => {
                      if (e.target.checked) {
                        localStorage.setItem('wtf_hide_howtoplay', 'true')
                      }
                    }}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="hideHowToPlayDuel" className="text-xs cursor-pointer" style={{ color: '#666' }}>
                    Ne plus afficher ce message
                  </label>
                </div>
                <button
                  onClick={() => setShowHowToPlay(false)}
                  className="w-full py-3 rounded-2xl font-black text-sm active:scale-95 transition-all"
                  style={{ background: '#FF6B1A', color: 'white' }}>
                  C'est parti ! 🚀
                </button>
              </div>
            </div>
          )}
          <DuelSetupScreen
            onStart={handleDuelStart}
            onBack={handleHome}
          />
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

      {/* Settings modal — always accessible */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} onShowRules={handleShowRules} />}
    </div>
  )
}
