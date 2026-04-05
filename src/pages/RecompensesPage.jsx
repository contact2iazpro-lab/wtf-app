import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllBadges, getNextBadge } from '../utils/badgeManager'

const S = (px) => `calc(${px}px * var(--scale))`

export default function RecompensesPage() {
  const navigate = useNavigate()
  const [badges, setBadges] = useState([])
  const [nextBadge, setNextBadge] = useState(null)

  useEffect(() => {
    setBadges(getAllBadges())
    setNextBadge(getNextBadge())
  }, [])

  const earnedCount = badges.filter(b => b.earned).length

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: '#FAFAF8', paddingBottom: S(80) }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151' }}
          >←</button>
          <h1 className="flex-1 text-lg font-black" style={{ color: '#1a1a2e' }}>Trophées</h1>
          <span className="px-3 py-1 rounded-xl text-xs font-black" style={{ background: 'rgba(255,215,0,0.15)', color: '#D97706' }}>
            {earnedCount}/{badges.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-4">
        {/* Prochain objectif */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' }}>
          {nextBadge ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span style={{ fontSize: 24 }}>{nextBadge.badge.emoji}</span>
                <div>
                  <span className="font-black text-xs block" style={{ color: 'rgba(26,26,46,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prochain objectif</span>
                  <span className="font-black text-sm block" style={{ color: '#1a1a2e' }}>{nextBadge.badge.label}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div style={{ flex: 1, background: 'rgba(0,0,0,0.15)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${nextBadge.progress}%`, background: '#1a1a2e', borderRadius: 4, transition: 'width 0.5s ease' }} />
                </div>
                <span className="text-xs font-black" style={{ color: '#1a1a2e' }}>{nextBadge.current}/{nextBadge.target}</span>
              </div>
            </>
          ) : (
            <div className="text-center">
              <span className="text-2xl block mb-1">🏆</span>
              <span className="font-black text-sm block" style={{ color: '#1a1a2e' }}>Tous les badges débloqués !</span>
              <span className="text-xs" style={{ color: 'rgba(26,26,46,0.6)' }}>Tu es une légende WTF!</span>
            </div>
          )}
        </div>

        {/* Grille de badges */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {badges.map(badge => (
            <div
              key={badge.id}
              className="rounded-2xl p-3 flex flex-col items-center justify-center text-center"
              style={{
                background: badge.earned
                  ? 'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,165,0,0.2) 100%)'
                  : '#F3F4F6',
                border: badge.earned ? '1.5px solid rgba(255,215,0,0.5)' : '1px solid #E5E7EB',
                minHeight: 100,
              }}
            >
              <div className="relative mb-1.5">
                <span className="text-3xl" style={{ opacity: badge.earned ? 1 : 0.3, filter: badge.earned ? 'none' : 'grayscale(100%)' }}>
                  {badge.emoji}
                </span>
                {badge.earned ? (
                  <span className="absolute -bottom-0.5 -right-1 text-sm">✅</span>
                ) : (
                  <span className="absolute -bottom-0.5 -right-1 text-sm">🔒</span>
                )}
              </div>
              <span className="font-bold text-xs" style={{ color: badge.earned ? '#1a1a2e' : '#9CA3AF', lineHeight: 1.2 }}>
                {badge.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
