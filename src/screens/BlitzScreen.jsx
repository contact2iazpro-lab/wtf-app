import { useState, useEffect, useRef, useCallback } from 'react'
import { getCategoryById } from '../data/facts'
import { useScale } from '../hooks/useScale'
import { audio } from '../utils/audio'

// ── Lisibilité sur fond coloré ───────────────────────────────────────────────
function isLightColor(hex) {
  if (!hex || hex.length < 7) return false
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128
}

const INITIAL_TIME = 60
const CORRECT_BONUS = 2
const WRONG_PENALTY = 3
const FLASH_DURATION = 400

export default function BlitzScreen({ facts, category, onFinish, onQuit, playerCoins }) {
  const scale = useScale()
  const S = (px) => `calc(${px}px * var(--scale))`

  const cat = getCategoryById(category)
  const catTextColor = cat?.color ? (isLightColor(cat.color) ? '#1a1a1a' : '#ffffff') : '#ffffff'

  // Game state
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [totalAnswered, setTotalAnswered] = useState(0)
  const [coinsEarned, setCoinsEarned] = useState(0)
  const [flashAnswer, setFlashAnswer] = useState(null) // { index, correct }
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)

  // Refs for timer
  const timeRef = useRef(INITIAL_TIME)
  const intervalRef = useRef(null)
  const gameOverRef = useRef(false)
  const flashTimeoutRef = useRef(null)

  // Results refs to avoid stale closures
  const correctRef = useRef(0)
  const totalRef = useRef(0)
  const coinsRef = useRef(0)

  const currentFact = facts[currentIndex % facts.length]

  // ── Global timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (gameOverRef.current) return

      timeRef.current -= 1
      const t = timeRef.current

      setTimeLeft(t)

      // Audio feedback
      if (t === 10) {
        audio.play('tick')
        setTimeout(() => audio.play('tick'), 130)
        setTimeout(() => audio.play('tick'), 260)
      } else if (t <= 5 && t > 0) {
        audio.play('tick')
      }

      if (t <= 0) {
        gameOverRef.current = true
        clearInterval(intervalRef.current)
        audio.play('timeout')
        onFinish({
          correctCount: correctRef.current,
          totalAnswered: totalRef.current,
          coinsEarned: coinsRef.current,
        })
      }
    }, 1000)

    return () => {
      clearInterval(intervalRef.current)
      clearTimeout(flashTimeoutRef.current)
    }
  }, [onFinish])

  // ── Answer handler ────────────────────────────────────────────────────────
  const handleAnswer = useCallback((answerIndex) => {
    if (flashAnswer !== null || gameOverRef.current) return

    const isCorrect = answerIndex === currentFact.correctIndex

    // Flash feedback
    setFlashAnswer({ index: answerIndex, correct: isCorrect })

    // Update state
    if (isCorrect) {
      timeRef.current = Math.min(timeRef.current + CORRECT_BONUS, 99)
      setTimeLeft(timeRef.current)
      correctRef.current += 1
      coinsRef.current += 1
      setCorrectCount(c => c + 1)
      setCoinsEarned(c => c + 1)
      audio.play('correct')
    } else {
      timeRef.current = Math.max(timeRef.current - WRONG_PENALTY, 0)
      setTimeLeft(timeRef.current)
      audio.play('wrong')
    }

    totalRef.current += 1
    setTotalAnswered(t => t + 1)

    // Check if time ran out from penalty
    if (timeRef.current <= 0) {
      gameOverRef.current = true
      clearInterval(intervalRef.current)
      setTimeout(() => {
        audio.play('timeout')
        onFinish({
          correctCount: correctRef.current,
          totalAnswered: totalRef.current,
          coinsEarned: coinsRef.current,
        })
      }, FLASH_DURATION)
      return
    }

    // Next question after flash
    flashTimeoutRef.current = setTimeout(() => {
      setFlashAnswer(null)
      setCurrentIndex(i => i + 1)
    }, FLASH_DURATION)
  }, [currentFact, flashAnswer, onFinish])

  // ── Timer bar color ───────────────────────────────────────────────────────
  const timerPercent = Math.max(0, timeLeft / INITIAL_TIME) * 100
  const timerColor = timeLeft > 30 ? '#22C55E' : timeLeft > 10 ? '#F97316' : '#EF4444'

  const screenBg = cat
    ? `linear-gradient(160deg, ${cat.color}22 0%, ${cat.color} 100%)`
    : 'linear-gradient(160deg, #1a3a5c22 0%, #1a3a5c 100%)'

  // ── Quit modal ────────────────────────────────────────────────────────────
  const quitModal = showQuitConfirm && (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-full rounded-3xl p-6 mx-4"
        style={{ background: '#FAFAF8', border: '1px solid #E5E7EB', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}
      >
        <div className="text-2xl text-center mb-3">⚡</div>
        <h2 className="font-black text-lg text-center mb-2" style={{ color: '#1a1a2e' }}>
          Quitter le Blitz ?
        </h2>
        <p className="text-sm text-center mb-6 leading-relaxed" style={{ color: '#6B7280' }}>
          Tu as {correctCount} bonne{correctCount !== 1 ? 's' : ''} r&eacute;ponse{correctCount !== 1 ? 's' : ''}.<br />
          Si tu quittes, ton score ne sera pas sauvegard&eacute;.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setShowQuitConfirm(false)}
            className="w-full py-4 rounded-2xl font-black text-base"
            style={{ background: cat?.color || '#FF6B1A', color: 'white' }}
          >
            Continuer le Blitz
          </button>
          <button
            onClick={onQuit}
            className="w-full py-3 rounded-2xl font-bold text-sm"
            style={{ background: '#F3F4F6', color: '#6B7280' }}
          >
            Quitter
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden"
      style={{ '--scale': scale, background: screenBg, fontFamily: 'Nunito, sans-serif' }}
    >
      {quitModal}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2" style={{ paddingTop: S(12) }}>
        <button
          onClick={() => setShowQuitConfirm(true)}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.25)' }}
        >
          <span style={{ color: catTextColor, fontSize: S(18), fontWeight: 900 }}>✕</span>
        </button>

        <div className="flex items-center gap-2">
          <span style={{ fontSize: S(14), color: catTextColor, opacity: 0.8 }}>
            {cat?.emoji} {cat?.label || 'Blitz'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.25)' }}>
          <span style={{ fontSize: S(14) }}>🪙</span>
          <span style={{ fontSize: S(14), fontWeight: 800, color: catTextColor }}>{playerCoins + coinsEarned}</span>
        </div>
      </div>

      {/* ── Timer bar ───────────────────────────────────────────────────── */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.25)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${timerPercent}%`,
                background: timerColor,
                transition: 'width 0.3s ease, background 0.5s ease',
                boxShadow: `0 0 8px ${timerColor}80`,
              }}
            />
          </div>
          <span style={{
            fontSize: S(22),
            fontWeight: 900,
            color: timeLeft <= 5 ? '#EF4444' : catTextColor,
            minWidth: S(36),
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {timeLeft}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span style={{ fontSize: S(11), color: catTextColor, opacity: 0.6 }}>
            +{CORRECT_BONUS}s bonne r&eacute;ponse &middot; -{WRONG_PENALTY}s mauvaise
          </span>
          <span style={{ fontSize: S(11), color: catTextColor, opacity: 0.6 }}>
            {correctCount}/{totalAnswered} bonnes
          </span>
        </div>
      </div>

      {/* ── Question card ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col px-4 pb-4 min-h-0" style={{ gap: S(12) }}>
        <div
          className="rounded-3xl flex items-center justify-center p-5"
          style={{
            background: 'rgba(0,0,0,0.28)',
            minHeight: S(120),
            flex: '0 0 auto',
          }}
        >
          <p style={{
            color: '#ffffff',
            fontSize: S(17),
            fontWeight: 800,
            textAlign: 'center',
            lineHeight: 1.4,
          }}>
            {currentFact?.question}
          </p>
        </div>

        {/* ── QCM options ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col justify-center" style={{ gap: S(10) }}>
          {currentFact?.options?.map((option, i) => {
            const isFlashed = flashAnswer?.index === i
            const isCorrectAnswer = flashAnswer && i === currentFact.correctIndex

            let btnBg = 'rgba(255,255,255,0.15)'
            let btnBorder = 'rgba(255,255,255,0.2)'
            let btnTextColor = '#ffffff'

            if (flashAnswer) {
              if (isFlashed && flashAnswer.correct) {
                btnBg = 'rgba(34,197,94,0.4)'
                btnBorder = '#22C55E'
              } else if (isFlashed && !flashAnswer.correct) {
                btnBg = 'rgba(239,68,68,0.4)'
                btnBorder = '#EF4444'
              } else if (isCorrectAnswer) {
                btnBg = 'rgba(34,197,94,0.25)'
                btnBorder = '#22C55E'
                btnTextColor = '#22C55E'
              }
            }

            return (
              <button
                key={`${currentIndex}-${i}`}
                onClick={() => handleAnswer(i)}
                disabled={flashAnswer !== null}
                className="w-full rounded-2xl text-left transition-all active:scale-[0.97]"
                style={{
                  background: btnBg,
                  border: `2px solid ${btnBorder}`,
                  padding: `${S(14)} ${S(18)}`,
                  opacity: flashAnswer && !isFlashed && !isCorrectAnswer ? 0.5 : 1,
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{
                  fontSize: S(15),
                  fontWeight: 700,
                  color: btnTextColor,
                }}>
                  {option}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── Time bonus/penalty flash ──────────────────────────────── */}
        {flashAnswer && (
          <div className="flex justify-center" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>
            <span style={{
              fontSize: S(48),
              fontWeight: 900,
              color: flashAnswer.correct ? '#22C55E' : '#EF4444',
              textShadow: `0 0 20px ${flashAnswer.correct ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'}`,
              animation: 'blitzFlash 0.4s ease-out',
            }}>
              {flashAnswer.correct ? `+${CORRECT_BONUS}s` : `-${WRONG_PENALTY}s`}
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
