import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCollection } from '../hooks/useCollection'
import { getValidFacts, getPlayableCategories } from '../data/factsService'
import LoginModal from '../components/Auth/LoginModal'
import ConnectBanner from '../components/ConnectBanner'
import { audio } from '../utils/audio'

const GUEST_CATEGORIES = ['kids', 'animaux', 'sport', 'records', 'definition']

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
  const [showLightbox, setShowLightbox] = useState(false)
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
      className="fixed inset-0 flex justify-center"
      style={{ zIndex: 400 }}
    >
      <div style={{
        width: '100%', maxWidth: 430, height: '100%',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        backgroundImage: 'url(/assets/backgrounds/question-default.webp)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        backgroundColor: catColor, position: 'relative',
      }}>
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

        {/* Image pleine largeur — format carré, cliquable lightbox */}
        <div style={{ flexShrink: 0, padding: `0 ${S(16)}` }}>
          <div
            onClick={() => fact.imageUrl && setShowLightbox(true)}
            style={{
              width: '100%', aspectRatio: '1/1', borderRadius: S(16), overflow: 'hidden',
              border: `3px solid ${catColor}`, position: 'relative',
              background: catGradient, cursor: fact.imageUrl ? 'pointer' : 'default',
            }}
          >
            {fact.imageUrl ? (
              <img
                src={fact.imageUrl}
                alt={fact.question}
                style={{ objectFit: 'cover', width: '100%', height: '100%', display: 'block' }}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <div style={{ fontSize: 72, fontWeight: 900, color: 'white', lineHeight: 1, opacity: 0.3 }}>?</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Image bientôt disponible</div>
              </div>
            )}
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

      {/* Lightbox image */}
      </div>
      {showLightbox && fact.imageUrl && (
        <div
          onClick={() => setShowLightbox(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <button
            onClick={() => setShowLightbox(false)}
            style={{
              position: 'absolute', top: 16, right: 16, zIndex: 10,
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)', border: 'none',
              color: 'white', fontSize: 18, fontWeight: 900,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >✕</button>
          <img
            src={fact.imageUrl}
            alt={fact.question}
            onClick={e => e.stopPropagation()}
            style={{
              width: '95%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 12,
              animation: 'factLightboxZoom 0.2s ease-out',
            }}
          />
          <style>{`
            @keyframes factLightboxZoom {
              from { transform: scale(0.8); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      )}
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
      className="fixed inset-0 flex justify-center"
      style={{ zIndex: 300 }}
    >
      <div style={{
        width: '100%', maxWidth: 430, height: '100%',
        display: 'flex', flexDirection: 'column',
        backgroundImage: 'url(/assets/backgrounds/question-default.webp)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        backgroundColor: cat.color, position: 'relative',
      }}>
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
              Aucun F*ct débloqué dans cette catégorie.<br />Lance une Quest pour commencer !
            </p>
          )}

          {unlockedFacts.length > 0 && (
            <>
              <p style={{ fontSize: 16, fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: S(8), textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                F*cts débloqués — {unlockedFacts.length}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: S(8), marginBottom: S(16) }}>
                {unlockedFacts.map(fact => (
                  <button
                    key={fact.id}
                    onClick={() => { audio.play('click'); onSelectFact(fact) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: S(10),
                      padding: S(10), borderRadius: 12, textAlign: 'left', width: '100%',
                      border: `2px solid ${cat.color}`,
                      background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
                      cursor: 'pointer',
                    }}
                  >
                    {fact.imageUrl ? (
                      <img src={fact.imageUrl} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 60, height: 60, borderRadius: 8, flexShrink: 0, background: `rgba(${rgb}, 0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'rgba(255,255,255,0.3)' }}>?</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 800, fontSize: S(12), color: 'white', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3, textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>{fact.question}</span>
                    </div>
                    <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>›</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {lockedFacts.length > 0 && (
            <>
              <p style={{ fontSize: 16, fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: S(8), textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                À débloquer — {lockedFacts.length}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: S(8) }}>
                {lockedFacts.map(fact => (
                  <div
                    key={fact.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: S(10),
                      padding: S(10), borderRadius: 12,
                      background: 'rgba(0,0,0,0.2)',
                    }}
                  >
                    <div style={{ width: 60, height: 60, borderRadius: 8, overflow: 'hidden', position: 'relative', flexShrink: 0, background: 'rgba(0,0,0,0.3)' }}>
                      {fact.imageUrl ? (
                        <img src={fact.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(8px) brightness(0.5)' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 20 }}>?</div>
                      )}
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔒</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ height: 10, borderRadius: 4, background: 'rgba(255,255,255,0.1)', width: '70%', marginBottom: 4 }} />
                      <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', width: '90%', marginBottom: 3 }} />
                      <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', width: '55%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
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
  const [showConnectBanner, setShowConnectBanner] = useState(false)
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

  // Determine which categories are unlocked (base 5 + any with >= 1 fact unlocked)
  const unlockedCatIds = useMemo(() => {
    const allFacts = getValidFacts()
    const cats = new Set(GUEST_CATEGORIES)
    for (const f of allFacts) {
      if (allUnlockedIds.has(f.id) && f.category) cats.add(f.category)
    }
    return cats
  }, [allUnlockedIds])

  // Index facts by type + category
  const factsIndex = useMemo(() => {
    const idx = {}
    for (const f of getValidFacts()) {
      const type = f.isVip ? 'vip' : 'generated'
      const key = `${type}_${f.category}`
      if (!idx[key]) idx[key] = []
      idx[key].push(f)
    }
    return idx
  }, [])

  // Stats for active tab, per category
  const catStats = useMemo(() => {
    return getPlayableCategories()
      .filter(cat => cat.id !== 'crimes')
      .map(cat => {
        const facts = factsIndex[`${activeTab}_${cat.id}`] || []
        const unlockedCount = facts.filter(f => allUnlockedIds.has(f.id)).length
        const pct = facts.length > 0 ? Math.round((unlockedCount / facts.length) * 100) : 0
        const isCatUnlocked = unlockedCatIds.has(cat.id)
        return {
          cat, facts, unlocked: unlockedCount, total: facts.length,
          percentage: pct, isCompleted: facts.length > 0 && unlockedCount === facts.length,
          isLocked: !isCatUnlocked && localStorage.getItem('wtf_dev_mode') !== 'true',
        }
      })
      .filter(s => s.total > 0)
      .sort((a, b) => {
        if (a.isLocked !== b.isLocked) return a.isLocked ? 1 : -1
        if (b.percentage !== a.percentage) return b.percentage - a.percentage
        return a.cat.label.localeCompare(b.cat.label, 'fr', { sensitivity: 'base' })
      })
  }, [activeTab, allUnlockedIds, factsIndex, unlockedCatIds])

  // Global progress — only facts in UNLOCKED categories
  const allFacts = getValidFacts()
  const factsInUnlockedCats = allFacts.filter(f => unlockedCatIds.has(f.category))
  const overallUnlocked = factsInUnlockedCats.filter(f => allUnlockedIds.has(f.id)).length
  const overallTotal = factsInUnlockedCats.length
  const overallPercentage = overallTotal > 0 ? Math.round((overallUnlocked / overallTotal) * 100) : 0

  // Tab progress
  const tabTotalFacts = catStats.filter(s => !s.isLocked).reduce((a, s) => a + s.total, 0)
  const tabTotalUnlocked = catStats.filter(s => !s.isLocked).reduce((a, s) => a + s.unlocked, 0)

  // Selected category for fact list
  const selectedCatStats = selectedCatId ? catStats.find(s => s.cat.id === selectedCatId) : null

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

        {/* WTF / Funny tabs */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => { audio.play('click'); setActiveTab('vip') }}
            className="flex-1 py-2 rounded-2xl font-black text-xs transition-all active:scale-95"
            style={{
              background: activeTab === 'vip' ? '#FFD700' : '#F3F4F6',
              color: activeTab === 'vip' ? '#1a1a2e' : '#9CA3AF',
              border: activeTab === 'vip' ? 'none' : '1px solid #E5E7EB',
              boxShadow: activeTab === 'vip' ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            ⭐ WTF!
          </button>
          <button
            onClick={() => { audio.play('click'); setActiveTab('generated') }}
            className="flex-1 py-2 rounded-2xl font-black text-xs transition-all active:scale-95"
            style={{
              background: activeTab === 'generated' ? '#8B5CF6' : '#F3F4F6',
              color: activeTab === 'generated' ? 'white' : '#9CA3AF',
              border: activeTab === 'generated' ? 'none' : '1px solid #E5E7EB',
              boxShadow: activeTab === 'generated' ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            🤖 Funny F*cts
          </button>
        </div>

        {/* Tab progress */}
        <div className="flex items-center justify-between px-1 mb-1">
          <span className="text-xs" style={{ color: '#9CA3AF' }}>
            {activeTab === 'vip' ? '⭐ WTF!' : '🤖 Funny F*cts'}
          </span>
          <span className="text-xs font-bold" style={{ color: activeTab === 'vip' ? '#FFD700' : '#8B5CF6' }}>
            {tabTotalUnlocked} / {tabTotalFacts}
          </span>
        </div>
      </div>

      {/* Category list */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-24">
        <div className="flex flex-col gap-2">
          {catStats.map(({ cat, unlocked, total, percentage, isCompleted, isLocked }) => {
            const rgb = hexToRgb(cat.color)
            const remaining = total - unlocked

            return (
              <button
                key={cat.id}
                onClick={() => {
                  audio.play('click')
                  if (isLocked) { alert('Continue à jouer pour débloquer cette catégorie ! 🎮'); return }
                  setSelectedCatId(cat.id)
                }}
                className="rounded-2xl p-3 flex items-center gap-3 text-left w-full active:scale-98 transition-all"
                style={{
                  background: isLocked ? '#F3F4F6' : percentage > 0 ? `rgba(${rgb}, 0.08)` : '#F9FAFB',
                  border: isLocked
                    ? '1px solid #E5E7EB'
                    : isCompleted
                      ? '1px solid rgba(255,215,0,0.35)'
                      : percentage > 0
                        ? `1px solid rgba(${rgb}, 0.25)`
                        : '1px solid rgba(229,231,235,0.5)',
                  opacity: isLocked ? 0.5 : (isConnected ? 1 : (percentage > 0 ? 1 : 0.7)),
                }}
              >
                {/* Icône catégorie + cadenas */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img
                    src={`/assets/categories/${cat.id}.png`}
                    alt={cat.label}
                    style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', filter: isLocked ? 'grayscale(0.6)' : 'none' }}
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                  {isLocked && (
                    <div style={{
                      position: 'absolute', bottom: -2, right: -2,
                      width: 18, height: 18, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.5)', border: '1.5px solid white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9,
                    }}>🔒</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-black text-sm truncate" style={{ color: isLocked ? '#9CA3AF' : '#1a1a2e' }}>{cat.label}</span>
                    {isCompleted && !isLocked && <span className="text-sm shrink-0">🏆</span>}
                  </div>
                  {isLocked ? (
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>Débloquer cette catégorie</span>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>

                <span className="text-xl shrink-0" style={{ color: isLocked ? '#D1D5DB' : 'rgba(0,0,0,0.2)' }}>›</span>
              </button>
            )
          })}
        </div>
      </div>

      {showConnectBanner && <ConnectBanner onClose={() => setShowConnectBanner(false)} />}
    </div>
  )
}
