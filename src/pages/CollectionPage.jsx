import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCollection } from '../hooks/useCollection'
import { PLAYABLE_CATEGORIES } from '../data/facts'
import { getParcoursFacts } from '../data/factsService'
import LoginModal from '../components/Auth/LoginModal'
import { audio } from '../utils/audio'

// ─── Helpers ───────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

function ProgressBar({ percentage, color }) {
  const isComplete = percentage === 100
  const barColor = isComplete
    ? 'linear-gradient(90deg, #FFD700, #FFA500)'
    : percentage >= 80
      ? '#FF8C00'
      : percentage === 0
        ? 'transparent'
        : `rgba(${hexToRgb(color)}, 0.9)`
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: 'rgba(255,255,255,0.1)' }}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${percentage}%`, background: barColor }} />
    </div>
  )
}

const DIFF_CONFIG = {
  easy:   { label: 'Facile', emoji: '💚', color: '#22C55E' },
  normal: { label: 'Normal', emoji: '🧠', color: '#8B5CF6' },
  expert: { label: 'Expert', emoji: '⚡', color: '#F59E0B' },
}

// ─── Fact detail full-screen view ──────────────────────────────────────────

function FactDetailView({ fact, onClose }) {
  const share = () => {
    const text = `🤯 Le saviez-vous ?\n\n${fact.explanation}\n\nJoue sur What The F*ct! https://wtf-app-livid.vercel.app/`
    if (navigator.share) navigator.share({ text }).catch(() => {})
    else navigator.clipboard?.writeText(text).catch(() => {})
  }

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ zIndex: 400, background: '#0a0f1e' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: 16 }}
        >
          ←
        </button>
        <span className="font-black text-white text-sm flex-1 truncate">{fact.shortAnswer}</span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Image */}
        {fact.imageUrl ? (
          <img
            src={fact.imageUrl}
            alt={fact.shortAnswer}
            className="w-full object-cover"
            style={{ maxHeight: 280 }}
          />
        ) : (
          <div
            className="w-full flex items-center justify-center"
            style={{ height: 160, background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span className="text-5xl opacity-30">🖼️</span>
          </div>
        )}

        {/* Body */}
        <div className="px-5 py-6">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#FF6B1A' }}>
            Le saviez-vous ?
          </p>
          <p className="text-white text-base font-semibold" style={{ lineHeight: '1.7' }}>
            {fact.explanation}
          </p>
          {fact.sourceUrl && (
            <p className="text-xs mt-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Source : {fact.sourceUrl}
            </p>
          )}
        </div>
      </div>

      {/* Share button */}
      <div className="px-5 pb-8 pt-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          onClick={share}
          className="w-full py-3.5 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))', border: '1px solid rgba(255,255,255,0.2)' }}
        >
          <span className="text-lg">📤</span> Partager ce F*ct
        </button>
      </div>
    </div>
  )
}

// ─── Fact list overlay for a category+difficulty ────────────────────────────

function CategoryFactsView({ cat, facts, unlockedIds, activeTab, onSelectFact, onClose }) {
  const diff = DIFF_CONFIG[activeTab]
  const unlockedFacts = facts.filter(f => unlockedIds.has(f.id))
  const lockedFacts   = facts.filter(f => !unlockedIds.has(f.id))

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ zIndex: 300, background: '#0a0f1e' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: 16 }}
        >
          ←
        </button>
        <span className="text-xl">{cat.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-black text-white text-sm truncate">{cat.label}</p>
          <p className="text-xs font-semibold" style={{ color: diff.color }}>{diff.emoji} Niveau {diff.label}</p>
        </div>
        <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>{unlockedFacts.length}/{facts.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {unlockedFacts.length === 0 && (
          <p className="text-center text-sm py-8" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Aucun F*ct débloqué à ce niveau.<br />Lance un parcours {diff.label} pour commencer !
          </p>
        )}

        {unlockedFacts.length > 0 && (
          <>
            <p className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
              F*cts débloqués — {unlockedFacts.length}
            </p>
            <div className="flex flex-col gap-2 mb-5">
              {unlockedFacts.map(fact => (
                <button
                  key={fact.id}
                  onClick={() => { audio.play('click'); onSelectFact(fact) }}
                  className="flex items-center gap-3 p-3 rounded-2xl text-left active:scale-98 transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(${hexToRgb(cat.color)}, 0.25)` }}
                >
                  {fact.imageUrl ? (
                    <img src={fact.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>🌟</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-white text-sm truncate">{fact.shortAnswer}</p>
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'rgba(255,255,255,0.45)', lineHeight: '1.4' }}>{fact.explanation}</p>
                  </div>
                  <span className="text-white/30 text-lg shrink-0">›</span>
                </button>
              ))}
            </div>
          </>
        )}

        {lockedFacts.length > 0 && (
          <>
            <p className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.2)' }}>
              À découvrir — {lockedFacts.length}
            </p>
            <div className="flex flex-col gap-2">
              {lockedFacts.map(fact => (
                <div
                  key={fact.id}
                  className="flex items-center gap-3 p-3 rounded-2xl overflow-hidden relative"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {/* Silhouette image (blurred + greyscale) */}
                  <div className="w-12 h-12 rounded-xl shrink-0 overflow-hidden relative" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    {fact.imageUrl ? (
                      <img
                        src={fact.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{ filter: 'grayscale(1) brightness(0.35) blur(2px)', transform: 'scale(1.1)' }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ color: 'rgba(255,255,255,0.15)', fontSize: 20 }}>?</div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center text-white/30 text-sm font-black">🔒</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Masked text bars (Panini silhouette effect) */}
                    <div className="h-3 rounded-full mb-1.5" style={{ background: 'rgba(255,255,255,0.1)', width: '70%' }} />
                    <div className="h-2 rounded-full mb-1" style={{ background: 'rgba(255,255,255,0.06)', width: '90%' }} />
                    <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', width: '55%' }} />
                  </div>
                  <span className="text-white/20 text-xs font-bold shrink-0">#{fact.id}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main collection page ───────────────────────────────────────────────────

export default function CollectionPage() {
  const navigate = useNavigate()
  const { isConnected } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const [activeTab, setActiveTab] = useState('easy')
  const [selectedCatId, setSelectedCatId] = useState(null)
  const [selectedFact, setSelectedFact] = useState(null)

  // Local unlocked facts
  const localUnlocked = useMemo(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      return new Set(saved.unlockedFacts || [])
    } catch { return new Set() }
  }, [])

  const { unlockedByCategory } = useCollection(localUnlocked)

  // Build a unified Set of all unlocked fact IDs (local + supabase)
  const allUnlockedIds = useMemo(() => {
    const ids = new Set(localUnlocked)
    for (const catIds of Object.values(unlockedByCategory)) {
      for (const id of catIds) ids.add(id)
    }
    return ids
  }, [localUnlocked, unlockedByCategory])

  // getParcoursFacts() indexed by difficulty+category
  const factsIndex = useMemo(() => {
    const idx = {}
    for (const f of getParcoursFacts()) {
      const key = `${f.difficulty}_${f.category}`
      if (!idx[key]) idx[key] = []
      idx[key].push(f)
    }
    return idx
  }, [])

  // Stats for active tab, per category
  const tabStats = useMemo(() => {
    return PLAYABLE_CATEGORIES.map(cat => {
      const facts = factsIndex[`${activeTab}_${cat.id}`] || []
      const unlockedCount = facts.filter(f => allUnlockedIds.has(f.id)).length
      const pct = facts.length > 0 ? Math.round((unlockedCount / facts.length) * 100) : 0
      return {
        cat,
        facts,
        unlocked: unlockedCount,
        total: facts.length,
        percentage: pct,
        isCompleted: facts.length > 0 && unlockedCount === facts.length,
      }
    }).sort((a, b) => {
      if (a.isCompleted && !b.isCompleted) return 1
      if (!a.isCompleted && b.isCompleted) return -1
      if (a.unlocked > 0 && b.unlocked === 0) return -1
      if (a.unlocked === 0 && b.unlocked > 0) return 1
      return b.percentage - a.percentage
    })
  }, [activeTab, allUnlockedIds, factsIndex])

  // Global progress for active tab
  const tabTotalAvailable = PLAYABLE_CATEGORIES.length * 10 // always 170
  const tabTotalUnlocked = tabStats.reduce((a, s) => a + s.unlocked, 0)
  const tabPercentage = Math.round((tabTotalUnlocked / tabTotalAvailable) * 100)

  // Global overall progress (all difficulties)
  const overallUnlocked = getParcoursFacts().filter(f => allUnlockedIds.has(f.id)).length
  const overallTotal = getParcoursFacts().length // 510
  const overallPercentage = Math.round((overallUnlocked / overallTotal) * 100)

  // Selected category for fact list
  const selectedCatStats = selectedCatId ? tabStats.find(s => s.cat.id === selectedCatId) : null

  // ── Sub-views ──
  if (selectedFact) {
    return <FactDetailView fact={selectedFact} onClose={() => setSelectedFact(null)} />
  }

  if (selectedCatStats) {
    return (
      <CategoryFactsView
        cat={selectedCatStats.cat}
        facts={selectedCatStats.facts}
        unlockedIds={allUnlockedIds}
        activeTab={activeTab}
        onSelectFact={setSelectedFact}
        onClose={() => setSelectedCatId(null)}
      />
    )
  }

  // ── Main view ──
  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: 'linear-gradient(160deg, #0A1E2E 0%, #0D2540 100%)' }}>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} message="Connecte-toi pour sauvegarder ta progression dans le cloud ☁️" />}

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
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white">Ma Collection</h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <strong style={{ color: 'white' }}>{overallPercentage}%</strong> des F*cts Débloqués
            </p>
          </div>
          {!isConnected && (
            <button
              onClick={() => setShowLogin(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold active:scale-95 shrink-0"
              style={{ background: 'rgba(255,107,26,0.2)', border: '1px solid rgba(255,107,26,0.4)', color: '#FF8C4A' }}
            >
              ☁️ Sync
            </button>
          )}
        </div>

        {/* Global progress bar (overall) */}
        <div className="rounded-2xl p-3 mb-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white">Progression globale</span>
            <span className="text-xs font-bold" style={{ color: '#FCD34D' }}>{overallUnlocked} / {overallTotal} F*cts</span>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${overallPercentage}%`, background: 'linear-gradient(90deg, #FF6B1A, #FF3385)' }}
            />
          </div>
        </div>

        {/* Difficulty tabs */}
        <div className="flex gap-2 mb-2">
          {Object.entries(DIFF_CONFIG).map(([key, cfg]) => {
            const isActive = activeTab === key
            return (
              <button
                key={key}
                onClick={() => { audio.play('click'); setActiveTab(key) }}
                className="flex-1 py-2 rounded-2xl font-black text-xs transition-all active:scale-95"
                style={{
                  background: isActive ? cfg.color : 'rgba(255,255,255,0.05)',
                  color: isActive ? 'white' : 'rgba(255,255,255,0.4)',
                  border: isActive ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: isActive ? `0 4px 12px rgba(0,0,0,0.3)` : 'none',
                }}
              >
                {cfg.emoji} {cfg.label}
              </button>
            )
          })}
        </div>

        {/* Tab progress */}
        <div className="flex items-center justify-between px-1 mb-1">
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {DIFF_CONFIG[activeTab].emoji} Niveau {DIFF_CONFIG[activeTab].label}
          </span>
          <span className="text-xs font-bold" style={{ color: DIFF_CONFIG[activeTab].color }}>
            {tabPercentage}% débloqués
          </span>
        </div>
      </div>

      {/* Category list */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-24">
        <div className="flex flex-col gap-2">
          {tabStats.map(({ cat, unlocked, total, percentage, isCompleted }) => {
            const rgb = hexToRgb(cat.color)
            const remaining = total - unlocked

            return (
              <button
                key={cat.id}
                onClick={() => { audio.play('click'); setSelectedCatId(cat.id) }}
                className="rounded-2xl p-3 flex items-center gap-3 text-left w-full active:scale-98 transition-all"
                style={{
                  background: percentage > 0 ? `rgba(${rgb}, 0.12)` : 'rgba(255,255,255,0.03)',
                  border: isCompleted
                    ? '1px solid rgba(255,215,0,0.35)'
                    : percentage > 0
                      ? `1px solid rgba(${rgb}, 0.25)`
                      : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {/* Mini grid */}
                <div
                  className="grid gap-px rounded-xl overflow-hidden shrink-0"
                  style={{ gridTemplateColumns: 'repeat(5, 1fr)', width: 50, height: 20 }}
                >
                  {Array.from({ length: 10 }, (_, i) => (
                    <div
                      key={i}
                      style={{
                        background: i < unlocked ? `rgba(${rgb}, 0.9)` : 'rgba(255,255,255,0.08)',
                      }}
                    />
                  ))}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-base">{cat.emoji}</span>
                    <span className="font-black text-sm text-white truncate">{cat.label}</span>
                    {isCompleted && <span className="text-sm shrink-0">🏆</span>}
                  </div>
                  <ProgressBar percentage={percentage} color={cat.color} />
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {isCompleted
                        ? <span style={{ color: '#FFD700', fontWeight: 700 }}>✓ Complété !</span>
                        : percentage >= 80
                          ? <span style={{ color: '#FF8C00', fontWeight: 700 }}>Plus que {remaining} !</span>
                          : `${unlocked}/${total} F*cts`
                      }
                    </span>
                    <span className="text-xs font-bold" style={{
                      color: isCompleted ? '#FFD700' : percentage > 0 ? `rgba(${rgb}, 1)` : 'rgba(255,255,255,0.2)'
                    }}>
                      {percentage}%
                    </span>
                  </div>
                </div>

                <span className="text-white/30 text-xl shrink-0">›</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
