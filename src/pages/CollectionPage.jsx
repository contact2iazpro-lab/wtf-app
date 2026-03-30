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
    <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: '#E5E7EB' }}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${percentage}%`, background: barColor }} />
    </div>
  )
}

const DIFF_CONFIG = {
  easy:   { label: 'Curieux',     emoji: '💚', color: '#22C55E' },
  normal: { label: 'À fond',      emoji: '🧠', color: '#8B5CF6' },
  expert: { label: 'WTF! Addict', emoji: '⚡', color: '#F59E0B' },
}

// ─── Fact detail full-screen view ──────────────────────────────────────────

function FactDetailView({ fact, onClose }) {
  const cat = PLAYABLE_CATEGORIES.find(c => c.id === fact.category)
  const catColor = cat?.color || '#FF6B1A'
  const screenBg = `linear-gradient(160deg, ${catColor}22 0%, ${catColor} 100%)`

  const share = () => {
    const text = `🤯 Le saviez-vous ?\n\n${fact.explanation}\n\nJoue sur What The F*ct! https://wtf-app-livid.vercel.app/`
    if (navigator.share) navigator.share({ text }).catch(() => {})
    else navigator.clipboard?.writeText(text).catch(() => {})
  }

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ zIndex: 400, background: screenBg, overflow: 'hidden' }}
    >
      {/* B4 — Header cohérent avec les autres écrans */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 shrink-0" style={{ borderBottom: `1px solid rgba(255,255,255,0.15)` }}>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontSize: 16 }}
        >
          ←
        </button>
        {/* Numéro + question */}
        <div className="flex-1 min-w-0">
          <span className="text-xs font-black" style={{ color: catColor }}>#{fact.id}</span>
          <p className="font-bold text-sm text-white leading-snug mt-0.5 line-clamp-2">{fact.question}</p>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Image */}
        {fact.imageUrl ? (
          <img
            src={fact.imageUrl}
            alt={fact.shortAnswer}
            className="w-full"
            style={{ height: 220, objectFit: 'cover', background: 'rgba(255,255,255,0.08)' }}
          />
        ) : (
          <div
            className="w-full flex items-center justify-center"
            style={{ height: 80, background: 'rgba(255,255,255,0.06)' }}
          >
            <span className="text-5xl opacity-30">🖼️</span>
          </div>
        )}

        {/* Réponse */}
        <div className="px-5 pt-3 pb-1">
          <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: catColor }}>Réponse</p>
          <p className="text-base font-black" style={{ color: 'white' }}>{fact.shortAnswer}</p>
        </div>

        {/* B2 — Espacement réduit entre image et corps */}
        <div className="px-5 py-3">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: catColor }}>
            Le saviez-vous ?
          </p>
          <p className="text-base font-semibold" style={{ color: 'rgba(255,255,255,0.9)', lineHeight: '1.7' }}>
            {fact.explanation}
          </p>
          {fact.sourceUrl && (
            <div className="mt-4 flex items-start gap-2">
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: '1.6' }}>🔗</span>
              <a
                href={fact.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs break-all"
                style={{ color: catColor, textDecoration: 'underline', lineHeight: '1.6' }}
              >
                {fact.sourceUrl}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Share button */}
      <div className="px-5 pb-8 pt-3 shrink-0" style={{ borderTop: 'rgba(255,255,255,0.1)' }}>
        <button
          onClick={share}
          className="w-full py-3.5 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
          style={{ background: `linear-gradient(135deg, ${catColor} 0%, ${catColor}cc 100%)`, boxShadow: `0 4px 16px ${catColor}50` }}
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
      style={{ zIndex: 300, background: `linear-gradient(160deg, ${cat.color}11 0%, ${cat.color}33 100%)` }}
    >
      {/* C4 — Header personnalisé couleur catégorie */}
      <div
        className="flex items-center gap-3 px-4 pt-4 pb-3 shrink-0"
        style={{ background: `${cat.color}22`, borderBottom: `1px solid ${cat.color}44` }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'rgba(255,255,255,0.25)', border: `1px solid rgba(255,255,255,0.3)`, color: cat.color, fontSize: 16 }}
        >
          ←
        </button>
        <span className="text-2xl">{cat.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-black text-base truncate" style={{ color: '#1a1a2e' }}>{cat.label}</p>
          <p className="text-xs font-bold" style={{ color: diff.color }}>{diff.emoji} {diff.label}</p>
        </div>
        <span
          className="text-xs font-black px-2 py-1 rounded-full"
          style={{ background: `${cat.color}22`, color: cat.color, border: `1px solid ${cat.color}44` }}
        >
          {unlockedFacts.length}/{facts.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {unlockedFacts.length === 0 && (
          <p className="text-center text-sm py-8" style={{ color: '#9CA3AF' }}>
            Aucun F*ct débloqué à ce niveau.<br />Lance une quête {diff.label} pour commencer !
          </p>
        )}

        {unlockedFacts.length > 0 && (
          <>
            <p className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: '#9CA3AF' }}>
              F*cts débloqués — {unlockedFacts.length}
            </p>
            <div className="flex flex-col gap-2 mb-5">
              {unlockedFacts.map(fact => (
                <button
                  key={fact.id}
                  onClick={() => { audio.play('click'); onSelectFact(fact) }}
                  className="flex items-center gap-3 p-3 rounded-2xl text-left active:scale-98 transition-all"
                  style={{ background: '#F3F4F6', border: `1px solid rgba(${hexToRgb(cat.color)}, 0.3)` }}
                >
                  {fact.imageUrl ? (
                    <img src={fact.imageUrl} alt="" className="w-12 h-12 rounded-xl object-contain shrink-0" style={{ background: '#E5E7EB' }} />
                  ) : (
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl" style={{ background: '#E5E7EB' }}>🌟</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm truncate" style={{ color: '#1a1a2e' }}>{fact.shortAnswer}</p>
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: '#6B7280', lineHeight: '1.4' }}>{fact.explanation}</p>
                  </div>
                  <span className="text-lg shrink-0" style={{ color: 'rgba(0,0,0,0.25)' }}>›</span>
                </button>
              ))}
            </div>
          </>
        )}

        {lockedFacts.length > 0 && (
          <>
            <p className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: '#D1D5DB' }}>
              À découvrir — {lockedFacts.length}
            </p>
            <div className="flex flex-col gap-2">
              {lockedFacts.map(fact => (
                <div
                  key={fact.id}
                  className="flex items-center gap-3 p-3 rounded-2xl overflow-hidden relative"
                  style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
                >
                  {/* Silhouette image (blurred + greyscale) */}
                  <div className="w-12 h-12 rounded-xl shrink-0 overflow-hidden relative" style={{ background: '#E5E7EB' }}>
                    {fact.imageUrl ? (
                      <img
                        src={fact.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{ filter: 'blur(8px) brightness(0.7)' }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ color: '#D1D5DB', fontSize: 20 }}>?</div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-black" style={{ color: 'rgba(0,0,0,0.25)' }}>🔒</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Masked text bars (Panini silhouette effect) */}
                    <div className="h-3 rounded-full mb-1.5" style={{ background: '#E5E7EB', width: '70%' }} />
                    <div className="h-2 rounded-full mb-1" style={{ background: '#F3F4F6', width: '90%' }} />
                    <div className="h-2 rounded-full" style={{ background: '#F3F4F6', width: '55%' }} />
                  </div>
                  <span className="text-xs font-bold shrink-0" style={{ color: '#D1D5DB' }}>#{fact.id}</span>
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
      // Most complete first (descending percentage), then alphabetical
      if (b.percentage !== a.percentage) return b.percentage - a.percentage
      return a.cat.label.localeCompare(b.cat.label, 'fr', { sensitivity: 'base' })
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
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: '#FAFAF8' }}>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} message="Connecte-toi pour sauvegarder ta progression dans le cloud ☁️" />}

      {/* Header */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151' }}
          >
            ←
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black" style={{ color: '#1a1a2e' }}>Ma Collection</h1>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              <strong style={{ color: '#1a1a2e' }}>{overallUnlocked} / {overallTotal}</strong> F*cts débloqués
            </p>
          </div>
        </div>

        {/* Global progress bar (overall) */}
        <div className="rounded-2xl p-3 mb-3" style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold" style={{ color: '#374151' }}>Progression globale</span>
            <span className="text-xs font-bold" style={{ color: '#FF6B1A' }}>{overallUnlocked} / {overallTotal} F*cts</span>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: '#E5E7EB' }}>
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
                  background: isActive ? cfg.color : '#F3F4F6',
                  color: isActive ? 'white' : '#9CA3AF',
                  border: isActive ? 'none' : '1px solid #E5E7EB',
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
          <span className="text-xs" style={{ color: '#9CA3AF' }}>
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
                  background: percentage > 0 ? `rgba(${rgb}, 0.08)` : '#F9FAFB',
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
                        background: i < unlocked ? `rgba(${rgb}, 0.9)` : '#E5E7EB',
                      }}
                    />
                  ))}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-base">{cat.emoji}</span>
                    <span className="font-black text-sm truncate" style={{ color: '#1a1a2e' }}>{cat.label}</span>
                    {isCompleted && <span className="text-sm shrink-0">🏆</span>}
                  </div>
                  <ProgressBar percentage={percentage} color={cat.color} />
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs" style={{ color: '#6B7280' }}>
                      {isCompleted
                        ? <span style={{ color: '#FFD700', fontWeight: 700 }}>✓ Complété !</span>
                        : percentage >= 80
                          ? <span style={{ color: '#FF8C00', fontWeight: 700 }}>Plus que {remaining} !</span>
                          : `${unlocked}/${total} F*cts`
                      }
                    </span>
                    <span className="text-xs font-bold" style={{
                      color: isCompleted ? '#FFD700' : percentage > 0 ? `rgba(${rgb}, 1)` : '#D1D5DB'
                    }}>
                      {percentage}%
                    </span>
                  </div>
                </div>

                <span className="text-xl shrink-0" style={{ color: 'rgba(0,0,0,0.2)' }}>›</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
