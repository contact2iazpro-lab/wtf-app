import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCollection } from '../hooks/useCollection'
import { getValidFacts, getPlayableCategories } from '../data/factsService'
import LoginModal from '../components/Auth/LoginModal'
import { audio } from '../utils/audio'

// ─── Helpers ───────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

function isLightColor(hex) {
  if (!hex) return false
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 155
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

const TAB_CONFIG = {
  vip:       { label: 'WTF!',         emoji: '👑', color: '#FFD700' },
  generated: { label: 'Funny F*cts', emoji: '🤖', color: '#8B5CF6' },
}

// ─── Fact detail full-screen view ──────────────────────────────────────────

function FactDetailView({ fact, onClose }) {
  const cat = getPlayableCategories().find(c => c.id === fact.category)
  const catColor = cat?.color || '#FF6B1A'
  const catGradient = `linear-gradient(160deg, ${catColor}22 0%, ${catColor} 100%)`
  const catTextColor = isLightColor(catColor) ? '#1a1a1a' : '#ffffff'
  const S = (px) => `calc(${px}px * var(--scale))`

  const share = () => {
    const text = `🤯 Le saviez-vous ?\n\n${fact.explanation}\n\nJoue sur What The F*ct! https://wtf-app-production.up.railway.app/`
    if (navigator.share) navigator.share({ text }).catch(() => {})
    else navigator.clipboard?.writeText(text).catch(() => {})
  }

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        zIndex: 400, overflow: 'hidden',
        backgroundImage: 'url(/assets/backgrounds/question-default.webp)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        backgroundColor: catColor,
      }}
    >
      {/* Overlay catégorie */}
      <div style={{ position: 'absolute', inset: 0, background: `${catColor}cc`, zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

        {/* Header — ← | #ID centre | ⚙️ */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexShrink: 0, padding: `${S(8)} ${S(12)}` }}>
          <button
            onClick={onClose}
            style={{
              width: S(36), height: S(36), borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <span style={{ fontSize: S(16), color: 'white', fontWeight: 900, lineHeight: 1, cursor: 'pointer' }}>←</span>
          </button>
          <span style={{ fontWeight: 900, fontSize: S(13), color: catTextColor }}>
            F*ct #{fact.id}
          </span>
          <button
            onClick={() => { audio.play('click') }}
            style={{
              width: S(36), height: S(36), borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <img src="/assets/ui/icon-settings.png" style={{ width: S(20), height: S(20) }} alt="" />
          </button>
        </div>

        {/* Question en titre */}
        <div style={{ flexShrink: 0, padding: `0 ${S(16)} ${S(6)}`, textAlign: 'center' }}>
          <span style={{ fontWeight: 900, fontSize: S(14), color: catTextColor, lineHeight: 1.3, display: 'block' }}>
            {fact.question}
          </span>
        </div>

        {/* Image pleine largeur — style RevelationScreen */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, maxHeight: '30vh' }}>
          <div className="overflow-hidden relative" style={{ background: catGradient, width: '100%', height: '100%', aspectRatio: '4/3', maxHeight: '100%' }}>
            {fact.imageUrl ? (
              <img
                src={fact.imageUrl}
                alt={fact.question}
                style={{ objectFit: 'cover', width: '100%', height: '100%', position: 'absolute', inset: 0 }}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '24px',
                background: catGradient,
              }}>
                <div style={{ fontSize: '14px', fontWeight: 900, color: 'rgba(255,255,255,0.25)', letterSpacing: '4px' }}>WTF!</div>
                <div style={{ fontSize: '72px', fontWeight: 900, color: 'white', lineHeight: 1 }}>?</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Image bientôt disponible</div>
              </div>
            )}
            {/* Tampon FOU — coin bas droit */}
            <div className="absolute pointer-events-none" style={{ right: S(8), bottom: S(8), zIndex: 10 }}>
              <div style={{
                fontSize: S(18), fontWeight: 900, color: '#4CAF50',
                textShadow: '0 2px 6px rgba(76,175,80,0.5)',
                transform: 'rotate(-12deg)',
                border: '2px solid #4CAF50', borderRadius: S(4), padding: `${S(2)} ${S(8)}`,
                backgroundColor: 'rgba(76,175,80,0.15)', backdropFilter: 'blur(4px)',
              }}>
                FOU
              </div>
            </div>
          </div>
        </div>

        {/* Encadrés réponse + Le saviez-vous — style RevelationScreen */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: `${S(6)} ${S(16)} 0`, display: 'flex', flexDirection: 'column', gap: S(6) }}>
          {/* Encadré réponse */}
          <div style={{
            background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: S(16), padding: `${S(10)} ${S(12)}`,
          }}>
            <div style={{
              background: 'rgba(76,175,80,0.12)', border: '1px solid rgba(76,175,80,0.3)',
              borderRadius: S(10), padding: `${S(8)} ${S(10)}`,
            }}>
              <div style={{ fontSize: S(9), fontWeight: 900, color: '#4CAF50', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: S(2) }}>Réponse :</div>
              <div style={{ fontSize: S(13), fontWeight: 700, color: 'white' }}>{fact.shortAnswer || fact.options?.[fact.correctIndex]}</div>
            </div>
          </div>

          {/* Le saviez-vous */}
          <div style={{
            background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: S(16), padding: `${S(10)} ${S(12)}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: S(4), marginBottom: S(4) }}>
              <span style={{ fontSize: S(14) }}>🧠</span>
              <span style={{ color: 'white', fontWeight: 900, fontSize: S(10), textTransform: 'uppercase', letterSpacing: '0.05em' }}>Le saviez-vous ?</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: S(11), lineHeight: 1.4, fontWeight: 500, margin: 0 }}>
              {fact.explanation}
            </p>
            {fact.sourceUrl && (
              <a
                href={fact.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: S(10), color: 'rgba(255,255,255,0.4)', display: 'block', marginTop: S(6), textDecoration: 'underline', textAlign: 'right' }}
              >
                Source
              </a>
            )}
          </div>
        </div>

        {/* Bouton partager — fixe en bas */}
        <div style={{ flexShrink: 0, padding: `${S(6)} ${S(16)} ${S(12)}` }}>
          <button
            onClick={share}
            className="active:scale-95 transition-all"
            style={{
              width: '100%', height: S(44), borderRadius: S(14),
              fontWeight: 900, fontSize: S(13), color: 'white', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(6),
              background: `linear-gradient(135deg, ${catColor} 0%, ${catColor}cc 100%)`,
              boxShadow: `0 4px 16px ${catColor}50`,
            }}
          >
            🎩 Partager ce F*ct
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Fact list overlay for a category+difficulty ────────────────────────────

function CategoryFactsView({ cat, facts, unlockedIds, activeTab, onSelectFact, onClose }) {
  const S = (px) => `calc(${px}px * var(--scale))`
  const tab = TAB_CONFIG[activeTab]
  const unlockedFacts = facts.filter(f => unlockedIds.has(f.id))
  const lockedFacts   = facts.filter(f => !unlockedIds.has(f.id))
  const rgb = hexToRgb(cat.color)
  const textColor = isLightColor(cat.color) ? '#1a1a1a' : '#ffffff'
  const subtextColor = isLightColor(cat.color) ? 'rgba(26,26,26,0.6)' : 'rgba(255,255,255,0.6)'
  const mutedColor = isLightColor(cat.color) ? 'rgba(26,26,26,0.4)' : 'rgba(255,255,255,0.4)'

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        zIndex: 300,
        backgroundImage: 'url(/assets/backgrounds/question-default.webp)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        backgroundColor: cat.color,
      }}
    >
      {/* Overlay catégorie */}
      <div style={{ position: 'absolute', inset: 0, background: `${cat.color}cc`, zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: S(10), padding: `${S(12)} ${S(16)}`, flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{
              width: S(36), height: S(36), borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: S(16), fontWeight: 900, flexShrink: 0,
            }}
          >
            ←
          </button>
          <img
            src={`/assets/categories/${cat.id}.png`}
            alt={cat.label}
            style={{ width: S(32), height: S(32), borderRadius: S(8), objectFit: 'cover', flexShrink: 0 }}
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontWeight: 900, fontSize: S(13), color: 'white', display: 'block', lineHeight: 1.2 }}>{cat.label}</span>
            <span style={{ fontSize: S(10), fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{tab.emoji} {tab.label}</span>
          </div>
          <span style={{
            fontSize: S(11), fontWeight: 900, color: 'white',
            background: 'rgba(255,255,255,0.2)', borderRadius: S(12),
            padding: `${S(4)} ${S(10)}`,
          }}>
            {unlockedFacts.length}/{facts.length}
          </span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: `0 ${S(16)}`, paddingBottom: S(80) }}>
          {unlockedFacts.length === 0 && (
            <p style={{ textAlign: 'center', fontSize: S(13), color: 'rgba(255,255,255,0.5)', padding: `${S(32)} 0` }}>
              Aucun F*ct débloqué dans cette catégorie.<br />Lance une quête pour commencer !
            </p>
          )}

          {unlockedFacts.length > 0 && (
            <>
              <p style={{ fontSize: S(10), fontWeight: 900, color: mutedColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: S(8) }}>
                F*cts débloqués — {unlockedFacts.length}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: S(8), marginBottom: S(16) }}>
                {unlockedFacts.map(fact => (
                  <button
                    key={fact.id}
                    onClick={() => { audio.play('click'); onSelectFact(fact) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: S(10),
                      padding: S(10), borderRadius: S(14), textAlign: 'left', width: '100%', border: 'none',
                      background: `rgba(${rgb}, 0.15)`, backdropFilter: 'blur(8px)',
                      cursor: 'pointer',
                    }}
                  >
                    {fact.imageUrl ? (
                      <img src={fact.imageUrl} alt="" style={{ width: S(48), height: S(48), borderRadius: S(10), objectFit: 'contain', flexShrink: 0, background: `rgba(${rgb}, 0.2)` }} />
                    ) : (
                      <img src="/assets/facts/fallback.svg" alt="" style={{ width: S(48), height: S(48), borderRadius: S(10), objectFit: 'cover', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 900, fontSize: S(12), color: textColor, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3 }}>{fact.question}</span>
                      <span style={{ fontSize: S(10), color: subtextColor, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4, marginTop: S(2) }}>{fact.explanation}</span>
                    </div>
                    <span style={{ fontSize: S(16), color: mutedColor, flexShrink: 0 }}>›</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {lockedFacts.length > 0 && (
            <>
              <p style={{ fontSize: S(10), fontWeight: 900, color: mutedColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: S(8) }}>
                À découvrir — {lockedFacts.length}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: S(8) }}>
                {lockedFacts.map(fact => (
                  <div
                    key={fact.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: S(10),
                      padding: S(10), borderRadius: S(14),
                      background: 'rgba(0,0,0,0.2)',
                    }}
                  >
                    <div style={{ width: S(48), height: S(48), borderRadius: S(10), overflow: 'hidden', position: 'relative', flexShrink: 0, background: 'rgba(0,0,0,0.3)' }}>
                      {fact.imageUrl ? (
                        <img src={fact.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(8px) brightness(0.5)' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: S(18) }}>?</div>
                      )}
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: S(16) }}>🔒</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ height: S(10), borderRadius: S(4), background: 'rgba(255,255,255,0.1)', width: '70%', marginBottom: S(4) }} />
                      <div style={{ height: S(8), borderRadius: S(4), background: 'rgba(255,255,255,0.06)', width: '90%', marginBottom: S(3) }} />
                      <div style={{ height: S(8), borderRadius: S(4), background: 'rgba(255,255,255,0.06)', width: '55%' }} />
                    </div>
                    <span style={{ fontSize: S(10), fontWeight: 700, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>#{fact.id}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main collection page ───────────────────────────────────────────────────

export default function CollectionPage() {
  const navigate = useNavigate()
  const { isConnected } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const [activeTab, setActiveTab] = useState('vip')
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

  // Index facts by type + category
  const factsIndex = useMemo(() => {
    const idx = {}
    for (const f of getValidFacts()) {
      const type = f.type || 'vip' // facts without type default to vip
      const key = `${type}_${f.category}`
      if (!idx[key]) idx[key] = []
      idx[key].push(f)
    }
    return idx
  }, [])

  // Stats for active tab, per category — hide empty categories and "crimes"
  const tabStats = useMemo(() => {
    return getPlayableCategories()
      .filter(cat => cat.id !== 'crimes') // Masquer Crimes & Faits Divers
      .map(cat => {
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
      })
      .filter(s => s.total > 0) // Masquer les catégories vides
      .sort((a, b) => {
        if (b.percentage !== a.percentage) return b.percentage - a.percentage
        return a.cat.label.localeCompare(b.cat.label, 'fr', { sensitivity: 'base' })
      })
  }, [activeTab, allUnlockedIds, factsIndex])

  // Global progress for active tab
  const tabTotalFacts = tabStats.reduce((a, s) => a + s.total, 0)
  const tabTotalUnlocked = tabStats.reduce((a, s) => a + s.unlocked, 0)
  const tabPercentage = tabTotalFacts > 0 ? Math.round((tabTotalUnlocked / tabTotalFacts) * 100) : 0

  // Global overall progress (all facts)
  const allFacts = getValidFacts()
  const overallUnlocked = allFacts.filter(f => allUnlockedIds.has(f.id)).length
  const overallTotal = allFacts.length
  const overallPercentage = overallTotal > 0 ? Math.round((overallUnlocked / overallTotal) * 100) : 0

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
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: '#FAFAF8', paddingBottom: 72 }}>
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

        {/* VIP / Générés tabs */}
        <div className="flex gap-2 mb-2">
          {Object.entries(TAB_CONFIG).map(([key, cfg]) => {
            const isActive = activeTab === key
            return (
              <button
                key={key}
                onClick={() => { audio.play('click'); setActiveTab(key) }}
                className="flex-1 py-2 rounded-2xl font-black text-xs transition-all active:scale-95"
                style={{
                  background: isActive ? cfg.color : '#F3F4F6',
                  color: isActive ? (key === 'vip' ? '#1a1a2e' : 'white') : '#9CA3AF',
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
            {TAB_CONFIG[activeTab].emoji} {TAB_CONFIG[activeTab].label}
          </span>
          <span className="text-xs font-bold" style={{ color: TAB_CONFIG[activeTab].color }}>
            {tabTotalUnlocked} / {tabTotalFacts} — {tabPercentage}%
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
                {/* Icône catégorie */}
                <img
                  src={`/assets/categories/${cat.id}.png`}
                  alt={cat.label}
                  style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                  onError={(e) => { e.target.style.display = 'none' }}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
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
