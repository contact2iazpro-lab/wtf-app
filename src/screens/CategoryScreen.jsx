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

  // Catégories débloquées :
  //   1. 5 de base (GUEST_CATEGORIES)
  //   2. Celles persistées (achat 200 coins ou progression Quest)
  //   3. Celles de la session courante
  //   4. Toute catégorie où le joueur a déjà ≥ 1 fact débloqué
  //      (migration douce : comptes existants qui ont des f*cts dans des catégories
  //       jamais "achetées" restent jouables — décidé 17/04/2026)
  const GUEST_CATEGORIES = ['kids', 'animaux', 'sport', 'records', 'definition']
  const unlockedCatIds = useMemo(() => {
    const cats = new Set(GUEST_CATEGORIES)
    try {
      const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      for (const id of (wd.unlockedCategories || [])) cats.add(id)
    } catch { /* ignore */ }
    for (const id of sessionUnlockedCats) cats.add(id)
    // Auto-unlock : catégorie avec au moins 1 fact débloqué
    for (const [catId, count] of Object.entries(unlockedPerCategory)) {
      if (count > 0) cats.add(catId)
    }
    return cats
  }, [sessionUnlockedCats, unlockedPerCategory])

  // En mode Quickie/Quickie : seules les catégories débloquées sont jouables
  const isLockedMode = gameMode === 'quickie' || sessionType === 'quickie'

  // Tri catégories (17/04/2026) :
  //   1. Verrouillées (Quickie) en bas
  //   2. Parmi débloquées : complètes (100%) en bas, classées alpha
  //   3. Parmi non-complètes : % complétion décroissant, puis alpha en cas d'égalité
  // Seuil de visibilité : ≥5 facts dans le pool pour être affiché
  const MIN_FACTS_VISIBLE = 5
  const visibleCategories = useMemo(() => {
    const cats = getPlayableCategories().filter(cat => (totalPerCategory[cat.id] || 0) >= MIN_FACTS_VISIBLE)
    const pctOf = (id) => {
      const total = totalPerCategory[id] || 0
      if (!total) return 0
      return (unlockedPerCategory[id] || 0) / total
    }
    cats.sort((a, b) => {
      const aLocked = isLockedMode && !unlockedCatIds.has(a.id)
      const bLocked = isLockedMode && !unlockedCatIds.has(b.id)
      if (aLocked !== bLocked) return aLocked ? 1 : -1
      const aPct = pctOf(a.id), bPct = pctOf(b.id)
      const aComplete = aPct >= 1
      const bComplete = bPct >= 1
      if (aComplete !== bComplete) return aComplete ? 1 : -1 // complètes en bas
      if (!aComplete && !bComplete && aPct !== bPct) return bPct - aPct // % desc
      return a.label.localeCompare(b.label, 'fr')
    })
    return cats
  }, [totalPerCategory, unlockedPerCategory, isLockedMode, unlockedCatIds])

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
        ? { background: 'linear-gradient(160deg, #FF7518, #FFA500)' }
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
          }}>Qu'est-ce qui t'inspire ?</h1>
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

      {/* Categories list — grille 2 colonnes, Aléatoire en pleine largeur */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: `0 ${S(12)} ${S(8)}`,
        WebkitOverflowScrolling: 'touch',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: S(6) }}>

          {/* Aléatoire — pleine largeur (span les 2 colonnes) */}
          <button
            onClick={() => handleCategoryClick('random')}
            style={{
              gridColumn: '1 / -1',
              background: selectedCatId === 'random'
                ? (isLockedMode ? 'linear-gradient(135deg, #FF7518, #FFA500)' : 'linear-gradient(135deg, rgba(255,107,26,0.95) 0%, rgba(255,51,133,0.95) 30%, rgba(155,89,182,0.95) 60%, rgba(52,152,219,0.95) 80%, rgba(46,204,113,0.95) 100%)')
                : (isLockedMode ? 'linear-gradient(135deg, #FF7518cc, #FFA500cc)' : 'linear-gradient(135deg, rgba(255,107,26,0.65) 0%, rgba(255,51,133,0.65) 30%, rgba(155,89,182,0.65) 60%, rgba(52,152,219,0.65) 80%, rgba(46,204,113,0.65) 100%)'),
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
                Surprends-moi !
              </div>
              <div style={{ fontSize: S(10), color: 'rgba(255,255,255,0.75)', fontWeight: 700, marginTop: S(2) }}>
                Découvre des f*cts de catégories pas encore débloquées !
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
            const isComplete = !isLocked && total > 0 && unlocked >= total

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
                  borderRadius: S(10),
                  padding: `${S(6)} ${S(8)}`,
                  width: '100%', boxSizing: 'border-box', minWidth: 0,
                  display: 'flex', flexDirection: 'column', gap: S(3),
                  border: isSelected ? '2.5px solid white' : '2.5px solid transparent',
                  boxShadow: isSelected
                    ? '0 0 16px rgba(255,255,255,0.3), 0 4px 10px rgba(0,0,0,0.2), inset 0 0 12px rgba(255,255,255,0.15)'
                    : '0 2px 6px rgba(0,0,0,0.15)',
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
                {/* Row 1 : icône + label + badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: S(6), minWidth: 0, width: '100%' }}>
                  <img
                    src={getCategoryIcon(cat.id)}
                    alt={cat.label}
                    style={{
                      width: S(22), height: S(22),
                      objectFit: 'contain', flexShrink: 0,
                      borderRadius: S(6),
                    }}
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                  <span style={{
                    flex: 1, minWidth: 0,
                    fontWeight: 900, fontSize: S(11), color: 'white',
                    lineHeight: 1.1,
                    textShadow: '0 1px 3px rgba(0,0,0,0.25)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {cat.label}
                  </span>
                  {isComplete ? (
                    <span style={{
                      fontSize: S(9), fontWeight: 900, color: '#FFD700',
                      flexShrink: 0,
                      textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    }}>⭐</span>
                  ) : (
                    <span style={{
                      fontSize: S(9), color: 'rgba(255,255,255,0.85)',
                      fontWeight: 800, flexShrink: 0,
                    }}>
                      {isLocked ? '🔒' : `${unlocked}/${total}`}
                    </span>
                  )}
                </div>
                {/* Row 2 : progress bar (cachée si complète) */}
                {!isComplete && (
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
                  )}
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
            border: hasSelection ? '3px solid #ffffff' : 'none',
            cursor: hasSelection ? 'pointer' : 'default',
            pointerEvents: hasSelection ? 'auto' : 'none',
            background: hasSelection
              ? (isLockedMode ? '#FF7518' : `linear-gradient(135deg, ${getCategoryColor(selectedCat) || '#FF6B1A'}, ${getCategoryColor(selectedCat) || '#FF6B1A'}cc)`)
              : 'rgba(255,255,255,0.25)',
            color: hasSelection ? 'white' : 'rgba(255,255,255,0.5)',
            boxShadow: hasSelection ? (isLockedMode ? '0 8px 30px rgba(148,0,211,0.5), 0 4px 0 rgba(0,0,0,0.15)' : `0 6px 24px ${getCategoryColor(selectedCat) || '#FF6B1A'}50`) : 'none',
            transition: 'all 0.2s ease',
            fontFamily: 'Nunito, sans-serif',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {hasSelection ? "LET'S GO !" : 'On y va ?'}
        </button>
      </div>
    </div>
  )
}
