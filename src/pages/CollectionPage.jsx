import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCollection, getCategoryStats } from '../hooks/useCollection'
import { PLAYABLE_CATEGORIES } from '../data/facts'
import { FACTS_PER_CATEGORY } from '../services/collectionService'
import LoginModal from '../components/Auth/LoginModal'
import { useState } from 'react'

// Free categories (always accessible)
const FREE_CATEGORIES = ['animaux', 'histoire', 'kids']

// Hex to rgb helper
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

// Mini puzzle preview — grid of revealed/hidden pieces
function MiniPuzzle({ unlocked, total, color }) {
  const cols = Math.ceil(Math.sqrt(total))
  const rows = Math.ceil(total / cols)
  const pieces = Array.from({ length: total }, (_, i) => i < unlocked)

  return (
    <div
      className="grid gap-px rounded overflow-hidden"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, width: 48, height: 48, flexShrink: 0 }}
    >
      {pieces.map((revealed, i) => (
        <div
          key={i}
          style={{
            background: revealed ? `rgba(${hexToRgb(color)}, 0.9)` : 'rgba(255,255,255,0.08)',
            transition: 'background 0.3s ease',
          }}
        />
      ))}
    </div>
  )
}

// Progress bar with color states
function ProgressBar({ percentage, color }) {
  const isComplete = percentage === 100
  const isAlmost = percentage >= 80 && !isComplete

  const barColor = isComplete
    ? 'linear-gradient(90deg, #FFD700, #FFA500)'
    : isAlmost
      ? '#FF8C00'
      : percentage === 0
        ? 'transparent'
        : `rgba(${hexToRgb(color)}, 0.9)`

  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: 'rgba(255,255,255,0.1)' }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${percentage}%`, background: barColor }}
      />
    </div>
  )
}

export default function CollectionPage() {
  const navigate = useNavigate()
  const { user, isConnected } = useAuth()
  const [showLogin, setShowLogin] = useState(false)

  // Load local unlocked facts from storage
  const localUnlocked = useMemo(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      return new Set(saved.unlockedFacts || [])
    } catch { return new Set() }
  }, [])

  const { unlockedByCategory, loading } = useCollection(localUnlocked)
  const stats = getCategoryStats(unlockedByCategory)

  // Sort categories: in-progress → not started → completed
  const sortedCategories = useMemo(() => {
    return [...PLAYABLE_CATEGORIES].sort((a, b) => {
      const sa = stats[a.id] || { percentage: 0 }
      const sb = stats[b.id] || { percentage: 0 }
      if (sa.percentage === 100 && sb.percentage < 100) return 1
      if (sb.percentage === 100 && sa.percentage < 100) return -1
      if (sa.percentage > 0 && sb.percentage === 0) return -1
      if (sb.percentage > 0 && sa.percentage === 0) return 1
      return sb.percentage - sa.percentage
    })
  }, [stats])

  // Global stats
  const totalFacts = Object.values(FACTS_PER_CATEGORY).reduce((a, b) => a + b, 0)
  const totalUnlocked = Object.values(stats).reduce((a, s) => a + (s?.unlocked || 0), 0)
  const completedCategories = Object.values(stats).filter(s => s?.isCompleted).length

  return (
    <div
      className="flex flex-col h-full w-full overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0A1E2E 0%, #0D2540 100%)' }}
    >
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          message="Connecte-toi pour sauvegarder ta progression dans le cloud ☁️"
        />
      )}

      {/* Header */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
          >
            ←
          </button>
          <div>
            <h1 className="text-lg font-black text-white">Ma Collection</h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {totalUnlocked}/{totalFacts} facts maîtrisés
            </p>
          </div>
          {!isConnected && (
            <button
              onClick={() => setShowLogin(true)}
              className="ml-auto px-3 py-1.5 rounded-xl text-xs font-bold active:scale-95"
              style={{ background: 'rgba(255,107,26,0.2)', border: '1px solid rgba(255,107,26,0.4)', color: '#FF8C4A' }}
            >
              ☁️ Sync
            </button>
          )}
        </div>

        {/* Global progress bar */}
        <div
          className="rounded-2xl p-3 mb-1"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white">Progression globale</span>
            <span className="text-xs font-bold" style={{ color: '#FCD34D' }}>
              {completedCategories}/{PLAYABLE_CATEGORIES.length} catégories ✓
            </span>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${totalFacts > 0 ? Math.round((totalUnlocked / totalFacts) * 100) : 0}%`,
                background: 'linear-gradient(90deg, #FF6B1A, #FF3385)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Category list */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-24">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-white text-sm opacity-50">Chargement...</div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {sortedCategories.map(cat => {
            const s = stats[cat.id] || { unlocked: 0, total: FACTS_PER_CATEGORY[cat.id] || 0, percentage: 0, isCompleted: false }
            const isFree = FREE_CATEGORIES.includes(cat.id)
            const remaining = s.total - s.unlocked
            const isAlmost = s.percentage >= 80 && !s.isCompleted

            return (
              <div
                key={cat.id}
                className="rounded-2xl p-3 flex items-center gap-3"
                style={{
                  background: s.percentage > 0
                    ? `rgba(${hexToRgb(cat.color)}, 0.12)`
                    : 'rgba(255,255,255,0.03)',
                  border: s.isCompleted
                    ? '1px solid rgba(255,215,0,0.3)'
                    : s.percentage > 0
                      ? `1px solid rgba(${hexToRgb(cat.color)}, 0.25)`
                      : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {/* Mini puzzle */}
                <MiniPuzzle unlocked={s.unlocked} total={s.total} color={cat.color} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{cat.emoji}</span>
                    <span className="font-black text-sm text-white truncate">{cat.label}</span>
                    {isFree && (
                      <span className="text-xs px-1.5 py-0.5 rounded-md font-bold shrink-0"
                        style={{ background: 'rgba(107,203,119,0.2)', color: '#6BCB77' }}>
                        GRATUIT
                      </span>
                    )}
                    {s.isCompleted && <span className="text-sm shrink-0">🏆</span>}
                  </div>

                  <ProgressBar percentage={s.percentage} color={cat.color} />

                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {s.isCompleted
                        ? <span style={{ color: '#FFD700', fontWeight: 700 }}>✓ Complété !</span>
                        : isAlmost
                          ? <span style={{ color: '#FF8C00', fontWeight: 700 }}>Plus que {remaining} !</span>
                          : `${s.unlocked}/${s.total} facts`
                      }
                    </span>
                    <span className="text-xs font-bold" style={{
                      color: s.isCompleted ? '#FFD700' : s.percentage > 0 ? `rgba(${hexToRgb(cat.color)}, 1)` : 'rgba(255,255,255,0.2)'
                    }}>
                      {s.percentage}%
                    </span>
                  </div>
                </div>

                {/* Blitz button if completed */}
                {s.isCompleted && (
                  <button
                    className="shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-black active:scale-95 transition-all"
                    style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#1a1a2e' }}
                  >
                    ⚡ Blitz
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
