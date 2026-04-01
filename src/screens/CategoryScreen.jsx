import { useState, useMemo, useRef } from 'react'
import SettingsModal from '../components/SettingsModal'
import { PLAYABLE_CATEGORIES } from '../data/facts'
import { getValidFacts } from '../data/factsService'
import { audio } from '../utils/audio'
import { useScale } from '../hooks/useScale'

// ── Backgrounds aléatoires ───────────────────────────────────────────────────
const BACKGROUNDS = [
  '/assets/backgrounds/home-bleu.png',
  '/assets/backgrounds/home-orange.png',
  '/assets/backgrounds/home-rouge.png',
  '/assets/backgrounds/home-teal.png',
  '/assets/backgrounds/home-violet.png',
]

// ── Icônes catégories ────────────────────────────────────────────────────────
const CATEGORY_ICONS = {
  animaux: '/assets/categories/animaux.png',
  art: '/assets/categories/art.png',
  'corps-humain': '/assets/categories/corps-humain.png',
  definition: '/assets/categories/definition.png',
  gastronomie: '/assets/categories/gastronomie.png',
  geographie: '/assets/categories/geographie.png',
  histoire: '/assets/categories/histoire.png',
  kids: '/assets/categories/kids.png',
  lois: '/assets/categories/lois-et-regles.png',
  phobies: '/assets/categories/phobies.png',
  records: '/assets/categories/records.png',
  sante: '/assets/categories/sante.png',
  sciences: '/assets/categories/sciences.png',
  sport: '/assets/categories/sports.png',
  technologie: '/assets/categories/technologie.png',
  cinema: '/assets/categories/cinema.png',
  musique: '/assets/categories/musique.png',
  espace: '/assets/categories/espace.png',
  architecture: '/assets/categories/architecture.png',
  internet: '/assets/categories/internet.png',
  crimes: '/assets/categories/crimes.png',
  psychologie: '/assets/categories/psychologie.png',
  politique: '/assets/categories/politique.png',
}

// ── Couleurs catégories ──────────────────────────────────────────────────────
const CATEGORY_COLORS = {
  animaux: '#22C55E', art: '#A855F7', 'corps-humain': '#EF4444',
  definition: '#3B82F6', gastronomie: '#F97316', geographie: '#14B8A6',
  histoire: '#F59E0B', kids: '#EAB308', lois: '#6366F1',
  phobies: '#8B5CF6', records: '#D97706', sante: '#10B981',
  sciences: '#06B6D4', sport: '#DC2626', technologie: '#64748B',
  cinema: '#D97706', musique: '#EC4899', espace: '#2E1A47',
  architecture: '#A0826D', internet: '#5B8DBE', crimes: '#8B4789',
  psychologie: '#8E44AD', politique: '#B24B4B',
  aleatoires: '#FF6B1A',
}

// ── isLightColor ─────────────────────────────────────────────────────────────
const isLightColor = (hex) => {
  if (!hex || hex.length < 7) return false
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128
}

// ── Scaled helper ────────────────────────────────────────────────────────────
const S = (px) => `calc(${px}px * var(--scale))`

export default function CategoryScreen({ onSelectCategory, onBack, selectedDifficulty, unlockedFacts = new Set() }) {
  const [showSettings, setShowSettings] = useState(false)
  const [selectedCatId, setSelectedCatId] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const scale = useScale()
  const bgIndex = useRef(Math.floor(Math.random() * BACKGROUNDS.length))

  const categoriesWithFacts = useMemo(() => {
    const categoryIds = new Set(getValidFacts().map(f => f.category))
    return categoryIds
  }, [])

  const totalPerCategory = useMemo(() => {
    const counts = {}
    for (const f of getValidFacts()) {
      counts[f.category] = (counts[f.category] || 0) + 1
    }
    return counts
  }, [])

  const unlockedPerCategory = useMemo(() => {
    const counts = {}
    for (const f of getValidFacts()) {
      if (unlockedFacts.has(f.id)) {
        counts[f.category] = (counts[f.category] || 0) + 1
      }
    }
    return counts
  }, [unlockedFacts])

  // MOD 1 — Masquer catégories sans facts
  const visibleCategories = useMemo(() => {
    const cats = PLAYABLE_CATEGORIES.filter(cat => (totalPerCategory[cat.id] || 0) > 0)
    console.log('categories IDs:', cats.map(c => c.id))
    return cats
  }, [totalPerCategory])

  const selectedCat = selectedCatId === 'random'
    ? { label: 'Aléatoires', emoji: '🎲', id: 'random' }
    : PLAYABLE_CATEGORIES.find(c => c.id === selectedCatId)

  const hasSelection = selectedCatId !== null

  const handleCategoryClick = (catId) => {
    audio.play('click')
    setSelectedCatId(catId)
  }

  const handleValider = () => {
    audio.play('click')
    setShowConfirm(true)
  }

  const handleConfirm = () => {
    audio.play('click')
    onSelectCategory(selectedCatId === 'random' ? null : selectedCatId)
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', width: '100%',
      overflow: 'hidden', boxSizing: 'border-box',
      fontFamily: 'Nunito, sans-serif',
      '--scale': scale,
      backgroundImage: `url(${BACKGROUNDS[bgIndex.current]})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundColor: '#1a1a2e',
    }}>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* ── Confirmation modal ────────────────────────────────────────── */}
      {showConfirm && (
        <div
          style={{
            position: 'fixed', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            padding: 20, zIndex: 100,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
          }}
          onClick={() => setShowConfirm(false)}>
          <div
            style={{
              background: '#fff', borderRadius: S(20),
              padding: S(24), maxWidth: 420, width: '100%',
              border: '1px solid rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', fontSize: S(36), marginBottom: S(12) }}>🚀</div>
            <h2 style={{
              fontSize: S(18), fontWeight: 900, textAlign: 'center',
              color: '#1a1a2e', marginBottom: S(16), marginTop: 0,
            }}>Confirmer la partie ?</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: S(8), marginBottom: S(20) }}>
              {selectedDifficulty && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: S(10),
                  padding: `${S(10)} ${S(14)}`, borderRadius: S(14),
                  background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)',
                }}>
                  <span style={{ fontSize: S(24), flexShrink: 0 }}>{selectedDifficulty.emoji}</span>
                  <div>
                    <div style={{ fontSize: S(9), fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(0,0,0,0.35)', marginBottom: 2 }}>Parcours</div>
                    <div style={{ fontSize: S(13), fontWeight: 900, color: '#1a1a2e' }}>{selectedDifficulty.label}</div>
                  </div>
                </div>
              )}
              <div style={{
                display: 'flex', alignItems: 'center', gap: S(10),
                padding: `${S(10)} ${S(14)}`, borderRadius: S(14),
                background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)',
              }}>
                {selectedCatId === 'random'
                  ? <span style={{ fontSize: S(24), flexShrink: 0 }}>🎲</span>
                  : <img
                      src={CATEGORY_ICONS[selectedCat?.id] || ''}
                      alt=""
                      style={{ width: S(32), height: S(32), borderRadius: '20%', objectFit: 'cover', flexShrink: 0 }}
                    />
                }
                <div>
                  <div style={{ fontSize: S(9), fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(0,0,0,0.35)', marginBottom: 2 }}>Catégorie</div>
                  <div style={{ fontSize: S(13), fontWeight: 900, color: '#1a1a2e' }}>{selectedCat?.label}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: S(10) }}>
              <button
                onClick={() => { audio.play('click'); setShowConfirm(false) }}
                style={{
                  flex: 1, padding: S(12), borderRadius: S(14),
                  fontWeight: 900, fontSize: S(13),
                  background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.1)',
                  color: 'rgba(0,0,0,0.45)', cursor: 'pointer',
                  fontFamily: 'Nunito, sans-serif',
                  WebkitTapHighlightColor: 'transparent',
                }}>
                Annuler
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  flex: 1, padding: S(12), borderRadius: S(14),
                  fontWeight: 900, fontSize: S(13),
                  background: '#FF6B1A', color: 'white', border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'Nunito, sans-serif',
                  WebkitTapHighlightColor: 'transparent',
                }}>
                C'est parti ! 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `${S(8)} ${S(12)}`,
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            width: S(36), height: S(36), borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white', fontSize: S(16),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
            WebkitTapHighlightColor: 'transparent',
          }}
        >←</button>

        <div style={{ textAlign: 'center', flex: 1 }}>
          <h1 style={{
            fontSize: S(22), fontWeight: 900, color: 'white',
            textShadow: '0 2px 8px rgba(0,0,0,0.3)',
            margin: 0,
          }}>Choisis une catégorie</h1>
          <p style={{
            fontSize: S(10), fontWeight: 700,
            color: 'rgba(255,255,255,0.55)',
            margin: `${S(2)} 0 0`,
          }}>What The <strong>F*ct</strong> ! Vrai ou fou ?</p>
        </div>

        <button
          onClick={() => { audio.play('click'); setShowSettings(true) }}
          style={{
            width: S(36), height: S(36), borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            fontSize: S(16),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
            WebkitTapHighlightColor: 'transparent',
          }}
        >⚙️</button>
      </div>

      {/* ── Categories grid ───────────────────────────────────────────── */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: `0 ${S(10)} ${S(8)}`,
        WebkitOverflowScrolling: 'touch',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: S(10),
        }}>

          {/* Aléatoires — toujours visible si au moins 1 catégorie a des facts */}
          {visibleCategories.length > 0 && (
            <button
              onClick={() => handleCategoryClick('random')}
              style={{
                background: selectedCatId === 'random'
                  ? 'linear-gradient(135deg, rgba(255,107,26,0.9) 0%, rgba(255,51,133,0.9) 30%, rgba(155,89,182,0.9) 60%, rgba(52,152,219,0.9) 80%, rgba(46,204,113,0.9) 100%)'
                  : 'linear-gradient(135deg, rgba(255,107,26,0.65) 0%, rgba(255,51,133,0.65) 30%, rgba(155,89,182,0.65) 60%, rgba(52,152,219,0.65) 80%, rgba(46,204,113,0.65) 100%)',
                borderRadius: S(12),
                padding: S(12),
                height: S(110),
                width: '100%',
                boxSizing: 'border-box',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: S(4),
                border: 'none',
                outline: selectedCatId === 'random' ? '3px solid rgba(255,255,255,0.7)' : 'none',
                outlineOffset: '-3px',
                opacity: selectedCatId === null || selectedCatId === 'random' ? 1 : 0.5,
                cursor: 'pointer',
                transition: 'opacity 0.2s ease',
                WebkitTapHighlightColor: 'transparent',
                fontFamily: 'Nunito, sans-serif',
              }}
            >
              <span style={{ fontSize: S(32) }}>🎲</span>
              <span style={{ fontWeight: 700, fontSize: S(13), color: '#1a1a1a' }}>Aléatoires</span>
            </button>
          )}

          {/* Category cards — only those with facts */}
          {visibleCategories.map((cat) => {
            const isSelected = selectedCatId === cat.id
            const total = totalPerCategory[cat.id] || 0
            const unlocked = unlockedPerCategory[cat.id] || 0
            const pct = total > 0 ? unlocked / total : 0
            const isComplete = pct === 1
            const isAlmost = pct >= 0.8 && !isComplete
            const remaining = total - unlocked
            const bgColor = CATEGORY_COLORS[cat.id] || '#6B7280'
            const textColor = isLightColor(bgColor) ? '#1a1a1a' : '#ffffff'

            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                style={{
                  background: bgColor,
                  borderRadius: S(12),
                  padding: S(12),
                  height: S(110),
                  width: '100%',
                  boxSizing: 'border-box',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: S(4),
                  border: 'none',
                  outline: isSelected ? '3px solid rgba(255,255,255,0.7)' : 'none',
                  outlineOffset: '-3px',
                  opacity: selectedCatId === null || isSelected ? 1 : 0.5,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s ease',
                  WebkitTapHighlightColor: 'transparent',
                  fontFamily: 'Nunito, sans-serif',
                }}
              >
                <img
                  src={CATEGORY_ICONS[cat.id]}
                  alt={cat.label}
                  style={{
                    width: S(44), height: S(44),
                    objectFit: 'contain',
                    display: 'block',
                    margin: '0 auto',
                  }}
                  onError={(e) => { e.target.style.display = 'none' }}
                />
                <span style={{
                  fontWeight: 700, fontSize: S(13),
                  color: textColor,
                  lineHeight: 1.2, textAlign: 'center',
                }}>
                  {cat.label}
                </span>

                {/* Progress bar */}
                <div style={{
                  height: S(4),
                  background: 'rgba(255,255,255,0.3)',
                  borderRadius: 2,
                  marginTop: S(6),
                  width: '100%',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(pct * 100, 100)}%`,
                    background: 'white',
                    borderRadius: 2,
                  }} />
                </div>
                <div style={{
                  fontSize: S(10),
                  color: 'white',
                  opacity: 0.8,
                  textAlign: 'center',
                  marginTop: S(2),
                }}>
                  {unlocked}/{total}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── CTA button ───────────────────────────────────────────────── */}
      <div style={{ padding: `${S(8)} ${S(12)} ${S(14)}`, flexShrink: 0 }}>
        <button
          onClick={hasSelection ? handleValider : undefined}
          style={{
            width: '100%',
            padding: S(14),
            borderRadius: S(16),
            fontSize: S(18), fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            border: 'none',
            cursor: hasSelection ? 'pointer' : 'default',
            pointerEvents: hasSelection ? 'auto' : 'none',
            background: hasSelection ? 'white' : 'rgba(255,255,255,0.25)',
            color: hasSelection
              ? (CATEGORY_COLORS[selectedCatId] || '#FF6B1A')
              : 'rgba(255,255,255,0.5)',
            transition: 'all 0.2s ease',
            fontFamily: 'Nunito, sans-serif',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {hasSelection ? "C'EST PARTI ! ⚡" : 'Sélectionne une catégorie'}
        </button>
      </div>
    </div>
  )
}
