import { useState, useMemo, useRef } from 'react'
import SettingsModal from '../components/SettingsModal'
import { getValidFacts, getPlayableCategories, getVipFacts, getGeneratedFacts } from '../data/factsService'
import { audio } from '../utils/audio'
import { useScale } from '../hooks/useScale'

// ── Backgrounds aléatoires ───────────────────────────────────────────────────
const BACKGROUNDS = [
  '/assets/backgrounds/home-bleu.webp',
  '/assets/backgrounds/home-orange.webp',
  '/assets/backgrounds/home-rouge.webp',
  '/assets/backgrounds/home-teal.webp',
  '/assets/backgrounds/home-violet.webp',
]

// ── Icônes catégories — convention : /assets/categories/{id}.png ─────────────
const getCategoryIcon = (id) => `/assets/categories/${id}.png`

// ── Couleur catégorie — lue dynamiquement depuis CATEGORIES (facts.js) ──────
const getCategoryColor = (cat) => cat?.color || '#6B7280'

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

// ── Pinned IDs always at the end ─────────────────────────────────────────────
const PINNED_IDS = new Set(['kids', 'random'])

export default function CategoryScreen({ onSelectCategory, onBack, selectedDifficulty, unlockedFacts = new Set(), gameMode }) {
  const [showSettings, setShowSettings] = useState(false)
  const [selectedCatId, setSelectedCatId] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const scale = useScale()
  const bgIndex = useRef(Math.floor(Math.random() * BACKGROUNDS.length))

  // ── Pool de facts selon le mode de jeu ──────────────────────────────────
  const factsPool = useMemo(() => {
    let pool
    switch (gameMode) {
      case 'marathon': pool = getGeneratedFacts(); break
      case 'blitz':    pool = getGeneratedFacts(); break
      case 'flash':    pool = getGeneratedFacts(); break
      default:         pool = getValidFacts(); break  // quête, etc. → tous les facts valides
    }
    // ── DEBUG TEMPORAIRE ──
    console.log('[DEBUG CategoryScreen] gameMode:', gameMode)
    console.log('[DEBUG CategoryScreen] factsPool:', pool.length)
    console.log('[DEBUG CategoryScreen] catégories:', [...new Set(pool.map(f => f.category))])
    // ── FIN DEBUG ──
    return pool
  }, [gameMode])

  const totalPerCategory = useMemo(() => {
    const counts = {}
    for (const f of factsPool) {
      counts[f.category] = (counts[f.category] || 0) + 1
    }
    return counts
  }, [factsPool])

  const unlockedPerCategory = useMemo(() => {
    const counts = {}
    for (const f of getValidFacts()) {
      if (unlockedFacts.has(f.id)) {
        counts[f.category] = (counts[f.category] || 0) + 1
      }
    }
    return counts
  }, [unlockedFacts])

  // Only categories with at least 1 published fact, sorted alphabetically
  // with Kids and Aléatoire pinned at end
  const visibleCategories = useMemo(() => {
    const cats = getPlayableCategories().filter(cat => (totalPerCategory[cat.id] || 0) > 0)
    const normal = cats.filter(c => !PINNED_IDS.has(c.id))
    const pinned = cats.filter(c => PINNED_IDS.has(c.id))
    normal.sort((a, b) => a.label.localeCompare(b.label, 'fr'))
    return [...normal, ...pinned]
  }, [totalPerCategory])

  const selectedCat = selectedCatId === 'random'
    ? { label: 'Aléatoire', emoji: '🎲', id: 'random' }
    : getPlayableCategories().find(c => c.id === selectedCatId)

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
      height: '100%', width: '100%',
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
                      src={getCategoryIcon(selectedCat?.id)}
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
            border: '1.5px solid rgba(255,255,255,0.4)',
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
            border: '1.5px solid rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <img src="/assets/ui/icon-settings.png" style={{ width: S(20), height: S(20) }} alt="" />
        </button>
      </div>

      {/* ── Categories list — scrollable ──────────────────────────────── */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: `0 ${S(12)} ${S(8)}`,
        WebkitOverflowScrolling: 'touch',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: S(6) }}>

          {/* Aléatoire — pinned at end but we render all in order */}
          {visibleCategories.map((cat) => {
            const isSelected = selectedCatId === cat.id
            const total = totalPerCategory[cat.id] || 0
            const unlocked = unlockedPerCategory[cat.id] || 0
            const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0
            const bgColor = getCategoryColor(cat)
            const lighterBg = isSelected
              ? bgColor
              : `${bgColor}99`

            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                style={{
                  background: lighterBg,
                  borderRadius: S(14),
                  padding: `${S(10)} ${S(12)}`,
                  width: '100%', boxSizing: 'border-box',
                  display: 'flex', alignItems: 'center', gap: S(10),
                  border: isSelected ? '2.5px solid white' : '2.5px solid transparent',
                  boxShadow: isSelected
                    ? '0 0 20px rgba(255,255,255,0.3), 0 4px 12px rgba(0,0,0,0.2), inset 0 0 12px rgba(255,255,255,0.15)'
                    : '0 2px 8px rgba(0,0,0,0.15)',
                  opacity: selectedCatId === null || isSelected ? 1 : 0.6,
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  WebkitTapHighlightColor: 'transparent',
                  fontFamily: 'Nunito, sans-serif',
                  textAlign: 'left',
                }}
              >
                {/* Category icon */}
                <img
                  src={getCategoryIcon(cat.id)}
                  alt={cat.label}
                  style={{
                    width: S(36), height: S(36),
                    objectFit: 'contain', flexShrink: 0,
                    borderRadius: S(8),
                  }}
                  onError={(e) => { e.target.style.display = 'none' }}
                />

                {/* Name + progress */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 900, fontSize: S(13), color: 'white',
                    lineHeight: 1.2, marginBottom: S(4),
                    textShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {cat.label}
                  </div>
                  {/* Progress bar */}
                  <div style={{
                    height: S(4), background: 'rgba(255,255,255,0.3)',
                    borderRadius: 2, width: '100%',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(pct, 100)}%`,
                      background: 'white',
                      borderRadius: 2,
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                  <div style={{
                    fontSize: S(10), color: 'rgba(255,255,255,0.75)',
                    fontWeight: 700, marginTop: S(2),
                  }}>
                    {unlocked}/{total} f*cts
                  </div>
                </div>

                {/* Percentage */}
                <span style={{
                  fontWeight: 900, fontSize: S(12),
                  color: 'rgba(255,255,255,0.8)', flexShrink: 0,
                }}>
                  {pct}%
                </span>
              </button>
            )
          })}

          {/* Aléatoire — always last */}
          {visibleCategories.length > 0 && (
            <button
              onClick={() => handleCategoryClick('random')}
              style={{
                background: selectedCatId === 'random'
                  ? 'linear-gradient(135deg, rgba(255,107,26,0.95) 0%, rgba(255,51,133,0.95) 30%, rgba(155,89,182,0.95) 60%, rgba(52,152,219,0.95) 80%, rgba(46,204,113,0.95) 100%)'
                  : 'linear-gradient(135deg, rgba(255,107,26,0.65) 0%, rgba(255,51,133,0.65) 30%, rgba(155,89,182,0.65) 60%, rgba(52,152,219,0.65) 80%, rgba(46,204,113,0.65) 100%)',
                borderRadius: S(14),
                padding: `${S(10)} ${S(12)}`,
                width: '100%', boxSizing: 'border-box',
                display: 'flex', alignItems: 'center', gap: S(10),
                border: selectedCatId === 'random' ? '2.5px solid white' : '2.5px solid transparent',
                boxShadow: selectedCatId === 'random'
                  ? '0 0 20px rgba(255,255,255,0.3), 0 4px 12px rgba(0,0,0,0.2), inset 0 0 12px rgba(255,255,255,0.15)'
                  : '0 2px 8px rgba(0,0,0,0.15)',
                opacity: selectedCatId === null || selectedCatId === 'random' ? 1 : 0.6,
                transform: selectedCatId === 'random' ? 'scale(1.02)' : 'scale(1)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                WebkitTapHighlightColor: 'transparent',
                fontFamily: 'Nunito, sans-serif',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: S(28), flexShrink: 0 }}>🎲</span>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: 900, fontSize: S(13), color: 'white',
                  textShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}>
                  Aléatoire
                </div>
                <div style={{ fontSize: S(10), color: 'rgba(255,255,255,0.75)', fontWeight: 700, marginTop: S(2) }}>
                  Catégorie surprise !
                </div>
              </div>
            </button>
          )}
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
              ? (getCategoryColor(selectedCat) || '#FF6B1A')
              : 'rgba(255,255,255,0.5)',
            transition: 'all 0.2s ease',
            fontFamily: 'Nunito, sans-serif',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {hasSelection ? "C'EST PARTI !" : 'Sélectionne une catégorie'}
        </button>
      </div>
    </div>
  )
}
