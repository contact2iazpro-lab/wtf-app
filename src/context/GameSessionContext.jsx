/**
 * GameSessionContext — État de session de jeu partagé entre tous les écrans.
 *
 * Centralise : gameMode, sessionType, difficulty, category, facts, score, etc.
 * Chaque route de jeu (Quest, Play, Explorer, Hunt, Blitz, Duel) utilise ce context
 * pour lire/écrire l'état de la session en cours.
 *
 * Usage : const { startSession, nextQuestion, ... } = useGameSession()
 */

import { createContext, useContext, useState, useCallback } from 'react'

const GameSessionContext = createContext(null)

export function GameSessionProvider({ children }) {
  // ── Mode & type ────────────────────────────────────────────────────────
  const [gameMode, setGameMode] = useState('solo') // 'solo' | 'duel' | 'marathon' | 'blitz'
  const [sessionType, setSessionType] = useState('parcours') // 'parcours' | 'flash_solo' | 'wtf_du_jour' | 'marathon' | 'blitz' | 'duel'
  const [selectedDifficulty, setSelectedDifficulty] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [launchMode, setLaunchMode] = useState(null)

  // ── Facts & progression ────────────────────────────────────────────────
  const [sessionFacts, setSessionFacts] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionScore, setSessionScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [sessionAnyHintUsed, setSessionAnyHintUsed] = useState(false)
  const [sessionCorrectFacts, setSessionCorrectFacts] = useState([])
  const [sessionIsPerfect, setSessionIsPerfect] = useState(false)

  // ── Current question state ─────────────────────────────────────────────
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [isCorrect, setIsCorrect] = useState(null)
  const [pointsEarned, setPointsEarned] = useState(0)

  // ── Duel-specific ──────────────────────────────────────────────────────
  const [duelPlayers, setDuelPlayers] = useState([])
  const [duelCurrentPlayerIndex, setDuelCurrentPlayerIndex] = useState(0)

  // ── Explorer-specific ──────────────────────────────────────────────────
  const [explorerPool, setExplorerPool] = useState([])

  // ── Blitz-specific ─────────────────────────────────────────────────────
  const [blitzFacts, setBlitzFacts] = useState([])
  const [blitzResults, setBlitzResults] = useState(null)
  const [isChallengeMode, setIsChallengeMode] = useState(false)

  // ── Derived values ─────────────────────────────────────────────────────
  const numPlayers = duelPlayers.length || 1
  const currentFact = gameMode === 'duel'
    ? sessionFacts[currentIndex * numPlayers + duelCurrentPlayerIndex] || null
    : sessionFacts[currentIndex] || null
  const totalRounds = gameMode === 'duel'
    ? Math.floor(sessionFacts.length / numPlayers)
    : sessionFacts.length

  // ── Actions ────────────────────────────────────────────────────────────

  const startSession = useCallback((facts, mode, type, difficulty, category) => {
    setSessionFacts(facts)
    setGameMode(mode)
    setSessionType(type)
    setSelectedDifficulty(difficulty || null)
    setSelectedCategory(category || null)
    setCurrentIndex(0)
    setSessionScore(0)
    setCorrectCount(0)
    setHintsUsed(0)
    setSessionAnyHintUsed(false)
    setSessionCorrectFacts([])
    setSessionIsPerfect(false)
    setSelectedAnswer(null)
    setIsCorrect(null)
    setPointsEarned(0)
  }, [])

  const nextQuestion = useCallback(() => {
    setCurrentIndex(prev => prev + 1)
    setSelectedAnswer(null)
    setIsCorrect(null)
    setPointsEarned(0)
    setHintsUsed(0)
  }, [])

  const recordAnswer = useCallback((answerIndex, correct, points) => {
    setSelectedAnswer(answerIndex)
    setIsCorrect(correct)
    setPointsEarned(points)
    if (correct) {
      setSessionScore(prev => prev + points)
      setCorrectCount(prev => prev + 1)
    }
  }, [])

  const recordHintUsed = useCallback(() => {
    setHintsUsed(prev => prev + 1)
    setSessionAnyHintUsed(true)
  }, [])

  const addCorrectFact = useCallback((fact) => {
    setSessionCorrectFacts(prev => [...prev, fact])
  }, [])

  const resetSession = useCallback(() => {
    setSessionFacts([])
    setCurrentIndex(0)
    setSessionScore(0)
    setCorrectCount(0)
    setHintsUsed(0)
    setSessionAnyHintUsed(false)
    setSessionCorrectFacts([])
    setSessionIsPerfect(false)
    setSelectedAnswer(null)
    setIsCorrect(null)
    setPointsEarned(0)
    setBlitzResults(null)
    setIsChallengeMode(false)
  }, [])

  return (
    <GameSessionContext.Provider value={{
      // Mode & type
      gameMode, setGameMode,
      sessionType, setSessionType,
      selectedDifficulty, setSelectedDifficulty,
      selectedCategory, setSelectedCategory,
      launchMode, setLaunchMode,

      // Facts & progression
      sessionFacts, setSessionFacts,
      currentIndex, setCurrentIndex,
      currentFact,
      totalRounds,
      sessionScore, setSessionScore,
      correctCount,
      hintsUsed,
      sessionAnyHintUsed,
      sessionCorrectFacts,
      sessionIsPerfect, setSessionIsPerfect,

      // Current question
      selectedAnswer, setSelectedAnswer,
      isCorrect, setIsCorrect,
      pointsEarned, setPointsEarned,

      // Duel
      duelPlayers, setDuelPlayers,
      duelCurrentPlayerIndex, setDuelCurrentPlayerIndex,
      numPlayers,

      // Explorer
      explorerPool, setExplorerPool,

      // Blitz
      blitzFacts, setBlitzFacts,
      blitzResults, setBlitzResults,
      isChallengeMode, setIsChallengeMode,

      // Actions
      startSession,
      nextQuestion,
      recordAnswer,
      recordHintUsed,
      addCorrectFact,
      resetSession,
    }}>
      {children}
    </GameSessionContext.Provider>
  )
}

export function useGameSession() {
  const ctx = useContext(GameSessionContext)
  if (!ctx) throw new Error('useGameSession must be used inside GameSessionProvider')
  return ctx
}
