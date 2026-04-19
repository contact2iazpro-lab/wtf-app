import { useState, useEffect, useRef, useCallback } from 'react'
import { getCategoryById } from '../data/facts'
import { useScale } from '../hooks/useScale'
import { audio } from '../utils/audio'
import renderFormattedText from '../utils/renderFormattedText'
import GameHeader from '../components/GameHeader'

const WRONG_PENALTY = 5       // secondes retirées/ajoutées sur erreur (inverse selon variant)
const FLASH_DURATION = 300
const RUSH_DURATION = 60      // Rush : chrono descendant 60s
const SOLO_TIERS = [5, 10, 20, 30, 50, 100]

export default function BlitzScreen({ facts, category, onFinish, onQuit, playerCoins, variant = 'rush' }) {
  const scale = useScale()
  const S = (px) => `calc(${px}px * var(--scale))`

  const cat = getCategoryById(category)
  const isSpeedrun = variant === 'speedrun'
  const totalQuestions = facts.length

  // Game state
  //  - Rush : timeLeft descend de 60s jusqu'à 0, erreur = -5s
  //  - Speedrun : elapsed monte depuis 0, erreur = +5s, fin à totalQuestions
  const [timeLeft, setTimeLeft] = useState(isSpeedrun ? 0 : RUSH_DURATION)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [flashAnswer, setFlashAnswer] = useState(null)
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const [answeredResults, setAnsweredResults] = useState([])

  // Refs
  const startTimeRef = useRef(null)
  const penaltiesRef = useRef(0)
  const intervalRef = useRef(null)
  const gameOverRef = useRef(false)
  const flashTimeoutRef = useRef(null)
  const correctRef = useRef(0)
  const lastCorrectTimeRef = useRef(isSpeedrun ? 0 : RUSH_DURATION)

  const currentFact = currentIndex < totalQuestions ? facts[currentIndex] : null

  // Termine la partie :
  //  Rush : finalTime = temps à la dernière bonne réponse (tie-break Défi)
  //  Speedrun : finalTime = temps total écoulé (élapsed + pénalités)
  const endGame = useCallback(() => {
    if (gameOverRef.current) return
    gameOverRef.current = true
    clearInterval(intervalRef.current)
    setTimeout(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000 + penaltiesRef.current
      onFinish({
        variant,
        correctCount: correctRef.current,
        totalAnswered: correctRef.current + answeredResults.filter(r => r === 'wrong').length,
        finalTime: isSpeedrun
          ? Math.round(elapsed * 100) / 100
          : lastCorrectTimeRef.current,
      })
    }, 200)
  }, [onFinish, variant, answeredResults, isSpeedrun])

  // ── Chrono ──────────────────────────────────────────────────────────────
  //  Rush : décompte depuis RUSH_DURATION, fin à 0s
  //  Speedrun : décompte montant depuis 0, pas de fin automatique (fin à totalQuestions)
  useEffect(() => {
    startTimeRef.current = Date.now()
    intervalRef.current = setInterval(() => {
      if (gameOverRef.current) return
      const spent = (Date.now() - startTimeRef.current) / 1000 + penaltiesRef.current
      if (isSpeedrun) {
        setTimeLeft(Math.round(spent * 100) / 100)
      } else {
        const left = Math.max(0, RUSH_DURATION - spent)
        setTimeLeft(left)
        if (left <= 0) endGame()
      }
    }, 50)

    return () => {
      clearInterval(intervalRef.current)
      clearTimeout(flashTimeoutRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Answer handler UNIFIÉ (Solo + Défi, même mécanique) ───────────────
  const handleAnswer = useCallback((answerIndex) => {
    if (flashAnswer !== null || gameOverRef.current || !currentFact) return

    const isCorrect = answerIndex === currentFact.correctIndex
    setFlashAnswer({ index: answerIndex, correct: isCorrect })

    if (isCorrect) {
      correctRef.current += 1
      setCorrectCount(c => c + 1)
      setAnsweredResults(prev => [...prev, 'correct'])
      // Tie-break Défi Rush : mémorise le temps à la dernière bonne
      const spentNow = (Date.now() - startTimeRef.current) / 1000 + penaltiesRef.current
      lastCorrectTimeRef.current = Math.min(RUSH_DURATION, Math.round(spentNow * 100) / 100)
      audio.play('correct')
    } else {
      // Rush : -5s (pénalité descendante, retire du chrono)
      // Speedrun : +5s (pénalité montante, ajoute au chrono)
      // Dans les 2 cas, accumulation dans penaltiesRef avec le même signe —
      // l'effet est inversé via le calcul (RUSH_DURATION - spent) vs spent.
      penaltiesRef.current += WRONG_PENALTY
      setAnsweredResults(prev => [...prev, 'wrong'])
      audio.play('buzzer')
    }

    const nextIndex = currentIndex + 1

    // Pool épuisé → fin (cas extrême, le lobby fournit normalement un pool large)
    if (nextIndex >= totalQuestions) {
      setTimeout(() => endGame(), FLASH_DURATION + 100)
      return
    }

    // Next question after flash
    flashTimeoutRef.current = setTimeout(() => {
      setFlashAnswer(null)
      setCurrentIndex(nextIndex)
    }, FLASH_DURATION)
  }, [currentFact, currentIndex, flashAnswer, totalQuestions, endGame])

  // ── Background by progress ──────────────────────────────────────────
  // Rush : progress = fraction du chrono écoulé
  // Speedrun : progress = fraction du nb de questions répondues
  const progress = isSpeedrun
    ? (totalQuestions > 0 ? currentIndex / totalQuestions : 0)
    : 1 - (timeLeft / RUSH_DURATION)
  const screenBg = progress >= 0.8 ? 'linear-gradient(160deg, #6a0a0a 0%, #8a1a1a 100%)'
    : progress >= 0.5 ? 'linear-gradient(160deg, #4a1a0a 0%, #6a2a0a 100%)'
    : progress >= 0.25 ? 'linear-gradient(160deg, #1a0a2e 0%, #3a0a4e 100%)'
    : 'linear-gradient(160deg, #0a0a1a 0%, #1a0a2e 100%)'

  // Palier atteint en solo (5/10/20/30/50/100 bonnes réponses)
  const soloTierReached = SOLO_TIERS.filter(t => correctCount >= t).pop() || 0

  // ── Quit modal ────────────────────────────────────────────────────────────
  const quitModal = showQuitConfirm && (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full rounded-3xl p-6 mx-4" style={{ background: '#FAFAF8', border: '1px solid #E5E7EB', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>
        <div className="text-2xl text-center mb-3">⚡</div>
        <h2 className="font-black text-lg text-center mb-2" style={{ color: '#1a1a2e' }}>Quitter le Blitz ?</h2>
        <p className="text-sm text-center mb-6 leading-relaxed" style={{ color: '#6B7280' }}>
          Ton temps ne sera pas enregistré.
        </p>
        <div className="flex flex-col gap-3">
          <button onClick={() => setShowQuitConfirm(false)} className="w-full py-4 rounded-2xl font-black text-base" style={{ background: '#FF6B1A', color: 'white' }}>
            Continuer
          </button>
          <button onClick={onQuit} className="w-full py-3 rounded-2xl font-bold text-sm" style={{ background: '#F3F4F6', color: '#6B7280' }}>
            Quitter
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden"
      style={{ '--scale': scale, background: screenBg, fontFamily: 'Nunito, sans-serif', transition: 'background 1s ease' }}
    >
      {quitModal}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <GameHeader
        playerCoins={playerCoins}
        categoryLabel={cat?.label || 'Blitz'}
        categoryColor={cat?.color}
        categoryIcon={category ? `/assets/categories/${category}.png` : null}
        onQuit={() => setShowQuitConfirm(true)}
      />

      {/* ── Barre + chrono + score ───────────────────────────────────── */}
      <div style={{ padding: `0 ${S(12)} ${S(4)}`, flexShrink: 0 }}>
        <div className="flex items-center gap-2">
          {isSpeedrun ? (
            <div style={{ flex: 1, display: 'flex', gap: 1, height: S(8) }}>
              {Array.from({ length: totalQuestions }, (_, i) => {
                const result = answeredResults[i]
                const isCurrent = i === currentIndex && !gameOverRef.current
                return (
                  <div key={i} style={{
                    flex: 1, borderRadius: 2,
                    background: result === 'correct' ? '#22C55E'
                      : result === 'wrong' ? '#EF4444'
                      : isCurrent ? 'rgba(255,255,255,0.6)'
                      : 'rgba(255,255,255,0.1)',
                    transition: 'background 0.3s',
                  }} />
                )
              })}
            </div>
          ) : (
            <div style={{ flex: 1, height: S(8), background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                width: `${(timeLeft / RUSH_DURATION) * 100}%`,
                height: '100%',
                background: timeLeft < 10 ? '#EF4444' : timeLeft < 20 ? '#F59E0B' : '#22C55E',
                transition: 'width 0.1s linear, background 0.3s',
              }} />
            </div>
          )}
          <span style={{
            fontSize: S(20), fontWeight: 900, color: '#ffffff',
            minWidth: S(64), textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {timeLeft.toFixed(isSpeedrun ? 2 : 1)}s
          </span>
        </div>
        <div className="flex items-center justify-center" style={{ marginTop: S(6), gap: S(8) }}>
          <span style={{ fontSize: S(28), fontWeight: 900, color: '#FFD700', fontVariantNumeric: 'tabular-nums', textShadow: '0 2px 10px rgba(0,0,0,0.4)' }}>
            {isSpeedrun ? `${currentIndex}/${totalQuestions}` : correctCount}
          </span>
          <span style={{ fontSize: S(11), fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: 1, textTransform: 'uppercase' }}>
            {isSpeedrun ? 'questions' : `bonne${correctCount > 1 ? 's' : ''}`}
            {!isSpeedrun && ` · palier ${soloTierReached || '—'}`}
          </span>
        </div>
        <div className="flex items-center justify-center mt-1">
          <span style={{ fontSize: S(10), color: 'rgba(255,255,255,0.45)' }}>
            ❌ erreur = {isSpeedrun ? '+' : '−'}{WRONG_PENALTY}s
          </span>
        </div>
      </div>

      {/* ── Question card ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col px-4 pb-4 min-h-0" style={{ gap: S(12) }}>
        {currentFact && (
          <div
            className="rounded-3xl flex items-center justify-center p-5"
            style={{ background: 'rgba(0,0,0,0.28)', minHeight: S(120), flex: '0 0 auto' }}
          >
            <p style={{ color: '#ffffff', fontSize: S(17), fontWeight: 800, textAlign: 'center', lineHeight: 1.4 }}>
              {renderFormattedText(currentFact.question, '#FF4444')}
            </p>
          </div>
        )}

        {/* ── QCM grille 2×2 ──────────────────────────────────────────── */}
        <div className="flex-1 flex items-center">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: S(8), width: '100%' }}>
            {currentFact?.options?.map((option, i) => {
              const isFlashed = flashAnswer?.index === i
              let btnBg = 'rgba(255,255,255,0.15)'
              let btnBorder = 'rgba(255,255,255,0.2)'

              if (flashAnswer) {
                if (isFlashed && flashAnswer.correct) {
                  btnBg = 'rgba(34,197,94,0.4)'; btnBorder = '#22C55E'
                } else if (isFlashed && !flashAnswer.correct) {
                  btnBg = 'rgba(239,68,68,0.4)'; btnBorder = '#EF4444'
                }
              }

              return (
                <button
                  key={`${currentIndex}-${i}`}
                  onClick={() => handleAnswer(i)}
                  disabled={flashAnswer !== null}
                  className="rounded-2xl text-center transition-all active:scale-[0.97]"
                  style={{
                    background: btnBg, border: `2px solid ${btnBorder}`,
                    height: S(60), padding: S(10), borderRadius: S(14),
                    opacity: flashAnswer && !isFlashed ? 0.5 : 1,
                    transition: 'all 0.15s ease',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <span style={{
                    fontSize: S(13), fontWeight: 700, color: '#ffffff',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {renderFormattedText(option)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Penalty flash (Rush : -5s / Speedrun : +5s) ─────────────────── */}
        {flashAnswer && !flashAnswer.correct && (
          <div className="flex justify-center" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>
            <span style={{
              fontSize: S(48), fontWeight: 900, color: '#EF4444',
              textShadow: '0 0 20px rgba(239,68,68,0.5)',
              animation: 'blitzFlash 0.4s ease-out',
            }}>
              {isSpeedrun ? '+' : '−'}{WRONG_PENALTY}s
            </span>
          </div>
        )}
      </div>

      {/* ── Animations ──────────────────────────────────────────────────── */}
      <style>{`
        @keyframes blitzFlash {
          0% { opacity: 0; transform: scale(0.5); }
          30% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0; transform: scale(1) translateY(-20px); }
        }
      `}</style>
    </div>
  )
}
