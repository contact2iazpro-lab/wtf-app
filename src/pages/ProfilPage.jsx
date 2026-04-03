import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getValidFacts, getPlayableCategories } from '../data/factsService'

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

export default function ProfilPage() {
  const navigate = useNavigate()
  const { isConnected, user, login } = useAuth()

  const playerData = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('wtf_data') || '{}') } catch { return {} }
  }, [])

  const unlockedIds = useMemo(() => new Set(playerData.unlockedFacts || []), [playerData])
  const allFacts = getValidFacts()
  const totalUnlocked = allFacts.filter(f => unlockedIds.has(f.id)).length
  const pseudo = playerData.pseudo || user?.user_metadata?.name || 'Joueur WTF!'
  const gamesPlayed = playerData.gamesPlayed || 0
  const bestStreak = playerData.bestStreak || 0
  const totalCorrect = playerData.totalCorrect || 0
  const totalAnswered = playerData.totalAnswered || 0
  const successRate = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0

  const catStats = useMemo(() => {
    const cats = getPlayableCategories().filter(c => c.id !== 'crimes')
    return cats.map(cat => {
      const catFacts = allFacts.filter(f => f.category === cat.id)
      const unlocked = catFacts.filter(f => unlockedIds.has(f.id)).length
      const pct = catFacts.length > 0 ? Math.round((unlocked / catFacts.length) * 100) : 0
      return { cat, unlocked, total: catFacts.length, pct }
    }).filter(s => s.total > 0).sort((a, b) => b.pct - a.pct)
  }, [allFacts, unlockedIds])

  const STATS = [
    { label: 'F*cts débloqués', value: totalUnlocked, emoji: '🧠' },
    { label: 'Meilleure série', value: bestStreak, emoji: '🔥' },
    { label: 'Taux de réussite', value: `${successRate}%`, emoji: '🎯' },
    { label: 'Parties jouées', value: gamesPlayed, emoji: '🎮' },
  ]

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: '#FAFAF8', paddingBottom: 72 }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151' }}
          >←</button>
          <h1 className="flex-1 text-lg font-black" style={{ color: '#1a1a2e' }}>Mon Profil</h1>
          <button
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}
          >
            <img src="/assets/ui/icon-settings.png" style={{ width: 20, height: 20 }} alt="" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-24">
        {/* Avatar + pseudo */}
        <div className="flex flex-col items-center py-4">
          <img
            src="/assets/ui/avatar-default.png"
            alt="avatar"
            className="rounded-full mb-2"
            style={{ width: 72, height: 72, border: '3px solid #FF6B1A', objectFit: 'cover' }}
          />
          <span className="font-black text-base" style={{ color: '#1a1a2e' }}>{pseudo}</span>
          {!isConnected && (
            <button
              onClick={login}
              className="mt-3 px-5 py-2.5 rounded-2xl font-black text-sm active:scale-95 transition-all"
              style={{ background: '#FF6B1A', color: 'white', border: 'none' }}
            >
              Se connecter avec Google
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {STATS.map(s => (
            <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
              <span className="text-lg block">{s.emoji}</span>
              <span className="font-black text-base block" style={{ color: '#1a1a2e' }}>{s.value}</span>
              <span className="text-xs" style={{ color: '#9CA3AF' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Progression par catégorie */}
        <h2 className="font-black text-sm mb-2" style={{ color: '#1a1a2e' }}>Progression par catégorie</h2>
        <div className="flex flex-col gap-1.5">
          {catStats.map(({ cat, unlocked, total, pct }) => {
            const rgb = hexToRgb(cat.color)
            return (
              <div key={cat.id} className="flex items-center gap-2.5 rounded-xl p-2" style={{ background: pct > 0 ? `rgba(${rgb}, 0.06)` : '#F9FAFB' }}>
                <img src={`/assets/categories/${cat.id}.png`} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-xs truncate" style={{ color: '#1a1a2e' }}>{cat.label}</span>
                    <span className="text-xs font-bold" style={{ color: pct > 0 ? cat.color : '#D1D5DB' }}>{pct}%</span>
                  </div>
                  <div className="w-full rounded-full overflow-hidden" style={{ height: 3, background: '#E5E7EB' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct === 100 ? 'linear-gradient(90deg, #FFD700, #FFA500)' : `rgba(${rgb}, 0.9)`, transition: 'width 0.5s' }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
