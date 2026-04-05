import { useState, useEffect } from 'react'
import { useScale } from '../hooks/useScale'

export default function BlitzResultsScreen({
  correctCount,
  totalAnswered,
  bestScore = 0,
  isNewRecord = false,
  onHome,
  onReplay,
}) {
  const scale = useScale()
  const S = (px) => `calc(${px}px * var(--scale))`

  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0

  // Animated count-up
  const [displayCount, setDisplayCount] = useState(0)

  useEffect(() => {
    const steps = Math.min(correctCount, 30)
    if (steps === 0) return
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayCount(Math.round((i / steps) * correctCount))
      if (i >= steps) clearInterval(interval)
    }, 50)
    return () => clearInterval(interval)
  }, [correctCount])

  // Rank based on score
  const rank = correctCount >= 30 ? { emoji: '🏆', label: 'Légende Blitz !' }
    : correctCount >= 20 ? { emoji: '🔥', label: 'Machine infernale !' }
    : correctCount >= 15 ? { emoji: '⚡', label: 'Foudre de guerre !' }
    : correctCount >= 10 ? { emoji: '💪', label: 'Bonne performance !' }
    : correctCount >= 5  ? { emoji: '👍', label: 'Pas mal !' }
    : { emoji: '🎮', label: 'Prochaine fois !' }

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

        {/* Score */}
        <div
          className="rounded-3xl w-full p-5"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <span style={{ fontSize: S(48), fontWeight: 900, color: '#FF6B1A' }}>{displayCount}</span>
            <span style={{ fontSize: S(16), fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
              bonne{correctCount !== 1 ? 's' : ''} réponse{correctCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex justify-center gap-4">
            <span style={{ fontSize: S(12), color: 'rgba(255,255,255,0.4)' }}>
              {correctCount}/{totalAnswered} ({accuracy}%)
            </span>
          </div>
        </div>

        {/* Record */}
        <div
          className="rounded-2xl w-full p-4 flex items-center justify-between"
          style={{
            background: 'rgba(255,215,0,0.08)',
            border: '1px solid rgba(255,215,0,0.2)',
          }}
        >
          <span style={{ fontSize: S(14), fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>🏆 Ton record</span>
          <span style={{ fontSize: S(20), fontWeight: 900, color: '#FFD700' }}>{bestScore}</span>
        </div>

        {/* Action buttons */}
        <div className="w-full flex flex-col gap-3 mt-2">
          <button
            onClick={onReplay}
            className="w-full py-4 rounded-2xl font-black text-base active:scale-[0.97] transition-transform"
            style={{
              background: 'linear-gradient(135deg, #FF6B1A, #D94A10)',
              color: 'white',
              fontSize: S(16),
            }}
          >
            ⚡ Rejouer en Blitz
          </button>
          <button
            onClick={onHome}
            className="w-full py-3 rounded-2xl font-bold text-sm active:scale-[0.97] transition-transform"
            style={{
              background: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(255,255,255,0.1)',
              fontSize: S(14),
            }}
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
