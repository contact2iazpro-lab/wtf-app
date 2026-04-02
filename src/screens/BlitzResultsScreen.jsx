import { useState, useEffect } from 'react'
import { useScale } from '../hooks/useScale'

const TIER_THRESHOLDS = [
  { min: 30, bonus: 30, label: 'Or',      emoji: '🥇', color: '#EAB308' },
  { min: 20, bonus: 15, label: 'Argent',  emoji: '🥈', color: '#94A3B8' },
  { min: 10, bonus: 5,  label: 'Bronze',  emoji: '🥉', color: '#CD7F32' },
]

function getTierBonuses(correctCount) {
  let total = 0
  const unlocked = []
  for (const tier of TIER_THRESHOLDS) {
    if (correctCount >= tier.min) {
      total += tier.bonus
      unlocked.push(tier)
    }
  }
  return { total, unlocked }
}

export default function BlitzResultsScreen({
  correctCount,
  totalAnswered,
  coinsEarned,
  bonusCoins,
  bonusTicket,
  bonusHint,
  onHome,
  onReplay,
}) {
  const scale = useScale()
  const S = (px) => `calc(${px}px * var(--scale))`

  const totalCoins = coinsEarned + bonusCoins
  const { unlocked: unlockedTiers } = getTierBonuses(correctCount)
  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0

  // Animated count-up
  const [displayCount, setDisplayCount] = useState(0)
  const [displayCoins, setDisplayCoins] = useState(0)

  useEffect(() => {
    const steps = Math.min(correctCount, 30)
    if (steps === 0) return
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayCount(Math.round((i / steps) * correctCount))
      setDisplayCoins(Math.round((i / steps) * totalCoins))
      if (i >= steps) clearInterval(interval)
    }, 50)
    return () => clearInterval(interval)
  }, [correctCount, totalCoins])

  // Rank based on score
  const rank = correctCount >= 30 ? { emoji: '🏆', label: 'L\u00e9gende Blitz !' }
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

        {/* Score */}
        <div
          className="rounded-3xl w-full p-5"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <span style={{ fontSize: S(42), fontWeight: 900, color: '#FF6B1A' }}>{displayCount}</span>
            <span style={{ fontSize: S(16), fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
              bonne{correctCount !== 1 ? 's' : ''} r&eacute;ponse{correctCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex justify-center gap-4">
            <span style={{ fontSize: S(12), color: 'rgba(255,255,255,0.4)' }}>
              {totalAnswered} question{totalAnswered !== 1 ? 's' : ''} jou&eacute;e{totalAnswered !== 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: S(12), color: 'rgba(255,255,255,0.4)' }}>
              {accuracy}% de pr&eacute;cision
            </span>
          </div>
        </div>

        {/* Coins earned */}
        <div
          className="rounded-2xl w-full p-4 flex items-center justify-between"
          style={{
            background: 'rgba(255,107,26,0.12)',
            border: '1px solid rgba(255,107,26,0.25)',
          }}
        >
          <span style={{ fontSize: S(14), fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>Coins gagn&eacute;s</span>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: S(14) }}>🪙</span>
            <span style={{ fontSize: S(20), fontWeight: 900, color: '#FF6B1A' }}>+{displayCoins}</span>
          </div>
        </div>

        {/* Tier bonuses */}
        <div className="w-full space-y-2">
          {TIER_THRESHOLDS.slice().reverse().map((tier) => {
            const reached = correctCount >= tier.min
            return (
              <div
                key={tier.min}
                className="rounded-xl px-4 py-3 flex items-center justify-between"
                style={{
                  background: reached ? `${tier.color}15` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${reached ? `${tier.color}40` : 'rgba(255,255,255,0.06)'}`,
                  opacity: reached ? 1 : 0.4,
                }}
              >
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: S(16) }}>{tier.emoji}</span>
                  <span style={{ fontSize: S(13), fontWeight: 700, color: reached ? tier.color : 'rgba(255,255,255,0.5)' }}>
                    {tier.label} ({tier.min}+ bonnes)
                  </span>
                </div>
                <span style={{ fontSize: S(13), fontWeight: 800, color: reached ? tier.color : 'rgba(255,255,255,0.3)' }}>
                  {reached ? `+${tier.bonus}` : tier.bonus} 🪙
                </span>
              </div>
            )
          })}
        </div>

        {/* Bonus rewards */}
        {(bonusTicket || bonusHint) && (
          <div
            className="rounded-2xl w-full p-4 flex items-center justify-center gap-4"
            style={{
              background: 'rgba(139,92,246,0.12)',
              border: '1px solid rgba(139,92,246,0.3)',
            }}
          >
            <span style={{ fontSize: S(14), fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Bonus chance :</span>
            {bonusTicket && (
              <span style={{ fontSize: S(14), fontWeight: 800, color: '#8B5CF6' }}>+1 🎟️</span>
            )}
            {bonusHint && (
              <span style={{ fontSize: S(14), fontWeight: 800, color: '#8B5CF6' }}>+1 💡</span>
            )}
          </div>
        )}

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
    </div>
  )
}
