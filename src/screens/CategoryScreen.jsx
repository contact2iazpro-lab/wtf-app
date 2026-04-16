import { useState, useMemo, useRef } from 'react'
import SettingsModal from '../components/SettingsModal'
import { getValidFacts, getPlayableCategories, getFunnyFacts } from '../data/factsService'
import { audio } from '../utils/audio'
import { useScale } from '../hooks/useScale'
import UnlockCategoryModal from '../components/UnlockCategoryModal'

const BACKGROUNDS = [
  '/assets/backgrounds/home-bleu.webp',
  '/assets/backgrounds/home-orange.webp',
  '/assets/backgrounds/home-rouge.webp',
  '/assets/backgrounds/home-teal.webp',
  '/assets/backgrounds/home-violet.webp',
]

const getCategoryIcon = (id) => `/assets/categories/${id}.png`
const getCategoryColor = (cat) => cat?.color || '#6B7280'

const isLightColor = (hex) => {
  if (!hex || hex.length < 7) return false
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128
}

const S = (px) => `calc(${px}px * var(--scale))`

export default function CategoryScreen({ onSelectCategory, onBack, unlockedFacts = new Set(), gameMode, sessionType }) {
  const [showSettings, setShowSettings] = useState(false)
  const [selectedCatId, setSelectedCatId] = useState(null)
  const [unlockTarget, setUnlockTarget] = useState(null) // catégorie en cours d'achat
  const [sessionUnlockedCats, setSessionUnlockedCats] = useState(() => new Set())
  const scale = useScale()
  const bgIndex = useRef(Math.floor(Math.random() * BACKGROUNDS.length))

  // Pool de facts selon le mode de jeu
  // Quickie et Quickie : Funny facts uniquement (pas de VIP)
  const factsPool = useMemo(() => {
    if (gameMode === 'quickie' || sessionType === 'quickie') return getFunnyFacts()
    if (gameMode === 'blitz') return getValidFacts()
    return getValidFacts() // Quest, etc.
  }, [gameMode, sessionType])

  const totalPerCategory = useMemo(() => {
    const counts = {}
    for (const f of factsPool) {
      counts[f.category] = (counts[f.category] || 0) + 1
    }
    return counts
  }, [factsPool])

  // Bloc 3.1 — En Quickie/Quickie, ne compter que les Funny débloqués
  // (sinon le ratio peut dépasser 100% car total = Funny only)
  const unlockedPerCategory = useMemo(() => {
    const counts = {}
    for (const f of factsPool) {
      if (unlockedFacts.has(f.id)) {
        counts[f.category] = (counts[f.category] || 0) + 1
      }
    }
    return counts
  }, [unlockedFacts, factsPool])

  // Catégories débloquées : 5 de base + celles persistées (Quest progression
  // ou achat 100 coins) + celles débloquées dans la session courante.
  const GUEST_CATEGORIES = ['kids', 'animaux', 'sport', 'records', 'definition']
  const unlockedCatIds = useMemo(() => {
    const cats = new Set(GUEST_CATEGORIES)
    try {
      const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      for (const id of (wd.unlockedCategories || [])) cats.add(id)
    } catch { /* ignore */ }
    for (const id of sessionUnlockedCats) cats.add(id)
    return cats
  }, [sessionUnlockedCats])

  // En mode Quickie/Quickie : seules les catégories débloquées sont jouables
  const isLockedMode = gameMode === 'quickie' || sessionType === 'quickie'

  // Catégories avec au moins 1 fact — débloquées en haut, bloquées en bas, chaque groupe alphabétique
  const visibleCategories = useMemo(() => {
    const cats = getPlayableCategories().filter(cat => (totalPerCategory[cat.id] || 0) > 0)
    cats.sort((a, b) => {
      const aLocked = isLockedMode && !unlockedCatIds.has(a.id)
      const bLocked = isLockedMode && !unlockedCatIds.has(b.id)
      if (aLocked !== bLocked) return aLocked ? 1 : -1
      return a.label.localeCompare(b.label, 'fr')
    })
    return cats
  }, [totalPerCategory, isLockedMode, unlockedCatIds])

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
    onSelectCategory(selectedCatId === 'random' ? null : selectedCatId)
  }

  const handleCategoryUnlocked = (catId) => {
    setSessionUnlockedCats(prev => new Set(prev).add(catId))
    setSelectedCatId(catId)
  }

  // Guard: facts pas encore chargés
  if (factsPool.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', width: '100%',
        backgroundColor: '#1a1a2e', color: 'white',
        fontFamily: 'Nunito, sans-serif', fontSize: 18,
      }}>
        <p>Chargement des catégories...</p>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', width: '100%',
      overflow: 'hidden', boxSizing: 'border-box',
      fontFamily: 'Nunito, sans-serif',
      '--scale': scale,
      ...(isLockedMode
        ? { background: 'linear-gradient(160deg, #4A3FA3, #7F77DD)' }
        : {
            backgroundImage: `url(${BACKGROUNDS[bgIndex.current]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: '#1a1a2e',
          }),
    }}>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      <UnlockCategoryModal
        target={unlockTarget}
        onClose={() => setUnlockTarget(null)}
        onConfirmed={handleCategoryUnlocked}
      />

      {/* Header */}
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

      {/* Categories list */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: `0 ${S(12)} ${S(8)}`,
        WebkitOverflowScrolling: 'touch',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: S(4) }}>

          {/* Aléatoire — toujours proposé */}
          <button
            onClick={() => handleCategoryClick('random')}
            style={{
              background: selectedCatId === 'random'
                ? (isLockedMode ? 'linear-gradient(135deg, #4A3FA3, #7F77DD)' : 'linear-gradient(135deg, rgba(255,107,26,0.95) 0%, rgba(255,51,133,0.95) 30%, rgba(155,89,182,0.95) 60%, rgba(52,152,219,0.95) 80%, rgba(46,204,113,0.95) 100%)')
                : (isLockedMode ? 'linear-gradient(135deg, #4A3FA3cc, #7F77DDcc)' : 'linear-gradient(135deg, rgba(255,107,26,0.65) 0%, rgba(255,51,133,0.65) 30%, rgba(155,89,182,0.65) 60%, rgba(52,152,219,0.65) 80%, rgba(46,204,113,0.65) 100%)'),
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
              <div style={{ fontWeight: 900, fontSize: S(13), color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                Aléatoire
              </div>
              <div style={{ fontSize: S(10), color: 'rgba(255,255,255,0.75)', fontWeight: 700, marginTop: S(2) }}>
                Catégorie surprise !
              </div>
            </div>
          </button>

          {/* Catégories triées */}
          {visibleCategories.map((cat) => {
            const isSelected = selectedCatId === cat.id
            const total = totalPerCategory[cat.id] || 0
            const unlocked = unlockedPerCategory[cat.id] || 0
            const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0
            const bgColor = getCategoryColor(cat)
            const isLocked = isLockedMode && !unlockedCatIds.has(cat.id)

            return (
              <button
                key={cat.id}
                onClick={() => {
                  if (isLocked) {
                    audio.play('click')
                    setUnlockTarget(cat)
                    return
                  }
                  handleCategoryClick(cat.id)
                }}
                style={{
                  background: isLocked ? 'rgba(255,255,255,0.08)' : isSelected ? bgColor : `${bgColor}99`,
                  borderRadius: S(12),
                  padding: `${S(7)} ${S(10)}`,
                  width: '100%', boxSizing: 'border-box',
                  display: 'flex', alignItems: 'center', gap: S(10),
                  border: isSelected ? '2.5px solid white' : '2.5px solid transparent',
                  boxShadow: isSelected
                    ? '0 0 20px rgba(255,255,255,0.3), 0 4px 12px rgba(0,0,0,0.2), inset 0 0 12px rgba(255,255,255,0.15)'
                    : '0 2px 8px rgba(0,0,0,0.15)',
                  opacity: isLocked ? 0.35 : (selectedCatId === null || isSelected ? 1 : 0.6),
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                  cursor: 'pointer',
                  filter: isLocked ? 'grayscale(0.6)' : 'none',
                  transition: 'all 0.2s ease',
                  WebkitTapHighlightColor: 'transparent',
                  fontFamily: 'Nunito, sans-serif',
                  textAlign: 'left',
                }}
              >
                <img
                  src={getCategoryIcon(cat.id)}
                  alt={cat.label}
                  style={{
                    width: S(30), height: S(30),
                    objectFit: 'contain', flexShrink: 0,
                    borderRadius: S(8),
                  }}
                  onError={(e) => { e.target.style.display = 'none' }}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: S(3),
                  }}>
                    <span style={{
                      fontWeight: 900, fontSize: S(13), color: 'white',
                      lineHeight: 1.2,
                      textShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {cat.label}
                    </span>
                    <span style={{
                      fontSize: S(10), color: 'rgba(255,255,255,0.75)',
                      fontWeight: 700, flexShrink: 0, marginLeft: S(6),
                    }}>
                      {isLocked ? '🔒' : `${unlocked}/${total}`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: S(6) }}>
                    <div style={{
                      flex: 1, height: S(3), background: 'rgba(255,255,255,0.3)',
                      borderRadius: 2,
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(pct, 100)}%`,
                        background: 'white',
                        borderRadius: 2,
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                    <span style={{
                      fontSize: S(9), color: 'rgba(255,255,255,0.6)',
                      fontWeight: 700, flexShrink: 0,
                    }}>
                      {isLocked ? '' : `${pct}%`}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* CTA button */}
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
            background: hasSelection
              ? (isLockedMode ? 'linear-gradient(135deg, #7F77DD, #4A3FA3)' : `linear-gradient(135deg, ${getCategoryColor(selectedCat) || '#FF6B1A'}, ${getCategoryColor(selectedCat) || '#FF6B1A'}cc)`)
              : 'rgba(255,255,255,0.25)',
            color: hasSelection ? 'white' : 'rgba(255,255,255,0.5)',
            boxShadow: hasSelection ? (isLockedMode ? '0 6px 24px rgba(127,119,221,0.5)' : `0 6px 24px ${getCategoryColor(selectedCat) || '#FF6B1A'}50`) : 'none',
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
