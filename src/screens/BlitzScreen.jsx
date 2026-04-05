import { useState, useEffect, useRef, useCallback } from 'react'
import { getCategoryById } from '../data/facts'
import { useScale } from '../hooks/useScale'
import { audio } from '../utils/audio'
import renderFormattedText from '../utils/renderFormattedText'
import GameHeader from '../components/GameHeader'

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
const FLASH_DURATION = 300

export default function BlitzScreen({ facts, category, onFinish, onQuit, playerCoins, playerHints = 0, onUseHint }) {
  const scale = useScale()
  const S = (px) => `calc(${px}px * var(--scale))`
  const isDevMode = localStorage.getItem('wtf_dev_mode') === 'true'

  const cat = getCategoryById(category)
  const catTextColor = cat?.color ? (isLightColor(cat.color) ? '#1a1a1a' : '#ffffff') : '#ffffff'

  // Game state
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [totalAnswered, setTotalAnswered] = useState(0)
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

  const currentFact = facts[currentIndex % facts.length]

  // ── Global timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (gameOverRef.current) return

      timeRef.current -= 1
      const t = timeRef.current

      setTimeLeft(t)

      // Audio feedback progressif
      if (t <= 5 && t > 0) {
        audio.play('tick')
        setTimeout(() => audio.play('tick'), 500)
      } else if (t <= 10 && t > 5) {
        audio.play('tick')
      } else if (t <= 20 && t > 10) {
        audio.play('tick')
      }

      if (t <= 0) {
        gameOverRef.current = true
        clearInterval(intervalRef.current)
        audio.play('timeout')
        onFinish({
          correctCount: correctRef.current,
          totalAnswered: totalRef.current,
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
      setCorrectCount(c => c + 1)
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

  const getBlitzBackground = (score) => {
    if (score >= 30) return 'linear-gradient(160deg, #6a0a0a 0%, #8a1a1a 100%)'
    if (score >= 20) return 'linear-gradient(160deg, #4a1a0a 0%, #6a2a0a 100%)'
    if (score >= 10) return 'linear-gradient(160deg, #1a0a2e 0%, #3a0a4e 100%)'
    return 'linear-gradient(160deg, #0a0a1a 0%, #1a0a2e 100%)'
  }
  const screenBg = getBlitzBackground(correctCount)

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
      style={{ '--scale': scale, background: screenBg, fontFamily: 'Nunito, sans-serif', transition: 'background 1s ease' }}
    >
      {quitModal}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <GameHeader
        playerCoins={playerCoins}
        playerHints={playerHints}
        categoryLabel={cat?.label || 'Blitz'}
        categoryColor={cat?.color}
        categoryIcon={category ? `/assets/categories/${category}.png` : null}
        onQuit={() => setShowQuitConfirm(true)}
      />

      {/* ── Timer bar segmentée (60 segments) ──────────────────────────── */}
      <div style={{ padding: `0 ${S(12)} ${S(4)}`, flexShrink: 0 }}>
        <div className="flex items-center gap-2">
          <div style={{ flex: 1, display: 'flex', gap: 1, height: S(8) }}>
            {Array.from({ length: INITIAL_TIME }, (_, i) => {
              const active = timeLeft > i
              const segColor = timeLeft > 20 ? '#4CAF50' : timeLeft > 10 ? '#FF9800' : '#f44336'
              return (
                <div
                  key={i}
                  style={{
                    flex: 1, borderRadius: 2,
                    background: active ? segColor : 'rgba(255,255,255,0.08)',
                    opacity: active ? 1 : 0.15,
                    transition: 'opacity 0.3s, background 0.3s',
                    ...(active && timeLeft <= 5 ? { animation: 'blitzSegPulse 0.5s ease-in-out infinite' } : {}),
                  }}
                />
              )
            })}
          </div>
          <span style={{
            fontSize: S(22), fontWeight: 900,
            color: timeLeft <= 5 ? '#f44336' : timeLeft <= 10 ? '#FF9800' : '#ffffff',
            minWidth: S(32), textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {timeLeft}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span style={{ fontSize: S(10), color: 'rgba(255,255,255,0.5)' }}>
            +{CORRECT_BONUS}s ✓  −{WRONG_PENALTY}s ✗
          </span>
          <span style={{ fontSize: S(11), fontWeight: 800, color: 'rgba(255,255,255,0.7)' }}>
            {correctCount}/{totalAnswered}
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
            {renderFormattedText(currentFact?.question)}
          </p>
        </div>

        {/* ── QCM grille 2×2 ──────────────────────────────────────────── */}
        <div className="flex-1 flex items-center">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: S(8), width: '100%' }}>
            {currentFact?.options?.map((option, i) => {
              const isFlashed = flashAnswer?.index === i

              let btnBg = 'rgba(255,255,255,0.15)'
              let btnBorder = 'rgba(255,255,255,0.2)'

              if (flashAnswer) {
                if (isFlashed && flashAnswer.correct) {
                  btnBg = 'rgba(34,197,94,0.4)'
                  btnBorder = '#22C55E'
                } else if (isFlashed && !flashAnswer.correct) {
                  btnBg = 'rgba(239,68,68,0.4)'
                  btnBorder = '#EF4444'
                }
              }

              return (
                <button
                  key={`${currentIndex}-${i}`}
                  onClick={() => handleAnswer(i)}
                  disabled={flashAnswer !== null}
                  className="rounded-2xl text-center transition-all active:scale-[0.97]"
                  style={{
                    background: btnBg,
                    border: `2px solid ${btnBorder}`,
                    height: S(60), padding: S(10),
                    borderRadius: S(14),
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

      {/* ── Particules "on fire" (score >= 30) ───────────────────────── */}
      {correctCount >= 30 && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} style={{
              position: 'absolute',
              top: `${(i * 31 + 5) % 90}%`,
              left: `${(i * 43 + 11) % 95}%`,
              width: i % 2 === 0 ? 5 : 4,
              height: i % 2 === 0 ? 5 : 4,
              borderRadius: '50%',
              background: `rgba(255,${80 + (i * 20) % 100},0,${0.15 + (i % 4) * 0.08})`,
              animation: `blitzParticle ${1.5 + (i % 3) * 0.5}s ${(i * 0.3).toFixed(1)}s ease-in-out infinite`,
            }} />
          ))}
        </div>
      )}

      {/* ── Animations ──────────────────────────────────────────────────── */}
      <style>{`
        @keyframes blitzFlash {
          0% { opacity: 0; transform: scale(0.5); }
          30% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0; transform: scale(1) translateY(-20px); }
        }
        @keyframes blitzSegPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes blitzParticle {
          0%, 100% { opacity: 0.1; transform: scale(0.8); }
          50% { opacity: 0.4; transform: scale(1.3); }
        }
      `}</style>
    </div>
  )
}
