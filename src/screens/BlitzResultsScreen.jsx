import { useState, useEffect } from 'react'
import { useScale } from '../hooks/useScale'

export default function BlitzResultsScreen({
  finalTime = 0,
  correctCount = 0,
  totalAnswered = 0,
  penalties = 0,
  bestTime = null,
  isNewRecord = false,
  onHome,
  onReplay,
}) {
  const scale = useScale()
  const S = (px) => `calc(${px}px * var(--scale))`

  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0
  const pureTime = Math.max(0, finalTime - penalties)

  // Animated count-up for time
  const [displayTime, setDisplayTime] = useState(0)

  useEffect(() => {
    if (finalTime <= 0) return
    const duration = 1200
    const interval = 16
    const steps = duration / interval
    const increment = finalTime / steps
    let current = 0
    const timer = setInterval(() => {
      current = Math.min(current + increment, finalTime)
      setDisplayTime(current)
      if (current >= finalTime) clearInterval(timer)
    }, interval)
    return () => clearInterval(timer)
  }, [finalTime])

  const formatTime = (t) => {
    if (t < 60) return t.toFixed(2) + 's'
    const m = Math.floor(t / 60)
    const s = (t % 60).toFixed(2)
    return `${m}:${s.padStart(5, '0')}`
  }

  // Rank based on accuracy + speed
  const rank = accuracy === 100 && finalTime < 30 ? { emoji: '🏆', label: 'Légende Blitz !' }
    : accuracy === 100 ? { emoji: '⚡', label: 'Sans faute !' }
    : accuracy >= 80 ? { emoji: '🔥', label: 'Impressionnant !' }
    : accuracy >= 60 ? { emoji: '💪', label: 'Bien joué !' }
    : { emoji: '🎮', label: 'Continue comme ça !' }

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-auto"
      style={{
        '--scale': scale,
        background: 'linear-gradient(160deg, #0A0F1E 0%, #1a0a35 100%)',
        fontFamily: 'Nunito, sans-serif',
      }}
    >
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8" style={{ gap: S(16) }}>

        {/* Rank emoji */}
        <div style={{ fontSize: S(56) }}>{rank.emoji}</div>

        {/* Title */}
        <h1 style={{ fontSize: S(26), fontWeight: 900, color: 'white', textAlign: 'center' }}>
          {rank.label}
        </h1>

        {/* New record banner */}
        {isNewRecord && (
          <div
            className="rounded-2xl w-full py-3 text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(255,165,0,0.25) 100%)',
              border: '2px solid rgba(255,215,0,0.5)',
              animation: 'blitzRecordPulse 1.5s ease-in-out infinite',
            }}
          >
            <span style={{ fontSize: S(16), fontWeight: 900, color: '#FFD700' }}>
              🎉 NOUVEAU RECORD !
            </span>
          </div>
        )}

        {/* Time final */}
        <div
          className="rounded-3xl w-full p-5"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="text-center mb-3">
            <span style={{ fontSize: S(14), color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>⏱️ Temps final</span>
          </div>
          <div className="text-center mb-3">
            <span style={{ fontSize: S(48), fontWeight: 900, color: '#FF6B1A', fontVariantNumeric: 'tabular-nums' }}>
              {formatTime(displayTime)}
            </span>
          </div>
          <div className="flex justify-center gap-6">
            <div className="text-center">
              <span style={{ fontSize: S(16), fontWeight: 900, color: 'white', display: 'block' }}>{correctCount}/{totalAnswered}</span>
              <span style={{ fontSize: S(10), color: 'rgba(255,255,255,0.4)' }}>Bonnes réponses</span>
            </div>
            <div className="text-center">
              <span style={{ fontSize: S(16), fontWeight: 900, color: 'white', display: 'block' }}>{accuracy}%</span>
              <span style={{ fontSize: S(10), color: 'rgba(255,255,255,0.4)' }}>Précision</span>
            </div>
            {penalties > 0 && (
              <div className="text-center">
                <span style={{ fontSize: S(16), fontWeight: 900, color: '#EF4444', display: 'block' }}>+{penalties}s</span>
                <span style={{ fontSize: S(10), color: 'rgba(255,255,255,0.4)' }}>Pénalités</span>
              </div>
            )}
          </div>
        </div>

        {/* Record */}
        {bestTime !== null && (
          <div
            className="rounded-2xl w-full p-4 flex items-center justify-between"
            style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)' }}
          >
            <span style={{ fontSize: S(14), fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>🏆 Ton record</span>
            <span style={{ fontSize: S(20), fontWeight: 900, color: '#FFD700' }}>{formatTime(bestTime)}</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="w-full flex flex-col gap-3 mt-2">
          <button
            onClick={onReplay}
            className="w-full py-4 rounded-2xl font-black text-base active:scale-[0.97] transition-transform"
            style={{ background: 'linear-gradient(135deg, #FF6B1A, #D94A10)', color: 'white', fontSize: S(16) }}
          >
            ⚡ Rejouer en Blitz
          </button>
          <button
            onClick={onHome}
            className="w-full py-3 rounded-2xl font-bold text-sm active:scale-[0.97] transition-transform"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)', fontSize: S(14) }}
          >
            Accueil
          </button>
        </div>
      </div>

      <style>{`
        @keyframes blitzRecordPulse {
          0%, 100% { box-shadow: 0 0 10px rgba(255,215,0,0.2); }
          50% { box-shadow: 0 0 25px rgba(255,215,0,0.4), 0 0 50px rgba(255,215,0,0.15); }
        }
      `}</style>
    </div>
  )
}
