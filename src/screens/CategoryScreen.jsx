import { useState, useMemo, useRef } from 'react'
import SettingsModal from '../components/SettingsModal'
import { getValidFacts, getPlayableCategories, getFunnyFacts } from '../data/factsService'
import { audio } from '../utils/audio'
import { useScale } from '../hooks/useScale'
import { useCurrency } from '../context/CurrencyContext'
import { updateCoins } from '../services/currencyService'
import { usePlayerProfile } from '../hooks/usePlayerProfile'

const UNLOCK_CATEGORY_PRICE = 100

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
  const { coins } = useCurrency()
  const { applyCurrencyDelta, unlockFact } = usePlayerProfile()

  // Pool de facts selon le mode de jeu
  // Flash et Explorer : Funny facts uniquement (pas de VIP)
  const factsPool = useMemo(() => {
    if (gameMode === 'explorer' || sessionType === 'flash_solo') return getFunnyFacts()
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

  // Bloc 3.1 — En Explorer/Flash, ne compter que les Funny débloqués
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

  // Catégories débloquées (5 de base + celles avec au moins 1 fact débloqué en Quest)
  const GUEST_CATEGORIES = ['kids', 'animaux', 'sport', 'records', 'definition']
  const unlockedCatIds = useMemo(() => {
    const cats = new Set(GUEST_CATEGORIES)
    for (const f of getValidFacts()) {
      if (unlockedFacts.has(f.id) && f.category) cats.add(f.category)
    }
    for (const id of sessionUnlockedCats) cats.add(id)
    return cats
  }, [unlockedFacts, sessionUnlockedCats])

  // En mode Explorer/Flash : seules les catégories débloquées sont jouables
  const isLockedMode = gameMode === 'explorer' || sessionType === 'flash_solo'

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

  // Bloc 3.7 — Débloquer une catégorie pour 100 coins (1 funny fact random)
  const handleConfirmUnlockCategory = () => {
    if (!unlockTarget) return
    if (coins < UNLOCK_CATEGORY_PRICE) return
    const pool = getFunnyFacts().filter(f => f.category === unlockTarget.id && !unlockedFacts.has(f.id))
    if (pool.length === 0) { setUnlockTarget(null); return }
    const pick = pool[Math.floor(Math.random() * pool.length)]

    updateCoins(-UNLOCK_CATEGORY_PRICE)
    applyCurrencyDelta?.({ coins: -UNLOCK_CATEGORY_PRICE }, 'unlock_category').catch(e =>
      console.warn('[CategoryScreen] applyCurrencyDelta failed:', e?.message || e)
    )
    unlockFact?.(pick.id, pick.category, 'unlock_category').catch(e =>
      console.warn('[CategoryScreen] unlockFact RPC failed:', e?.message || e)
    )
    try {
      const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      const list = wd.unlockedFacts || []
      if (!list.includes(pick.id)) list.push(pick.id)
      wd.unlockedFacts = list
      wd.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(wd))
      window.dispatchEvent(new Event('wtf_storage_sync'))
    } catch { /* ignore */ }

    setSessionUnlockedCats(prev => new Set(prev).add(unlockTarget.id))
    audio.play('correct')
    setSelectedCatId(unlockTarget.id)
    setUnlockTarget(null)
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
      backgroundImage: `url(${BACKGROUNDS[bgIndex.current]})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundColor: '#1a1a2e',
    }}>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Bloc 3.7 — Modal déblocage catégorie */}
      {unlockTarget && (() => {
        const canAfford = coins >= UNLOCK_CATEGORY_PRICE
        const catColor = getCategoryColor(unlockTarget)
        return (
          <div
            onClick={() => setUnlockTarget(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 500,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 24, fontFamily: 'Nunito, sans-serif',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: 340,
                background: 'linear-gradient(160deg, #1a0a2e, #0a0a3e)',
                border: `2px solid ${catColor}`,
                borderRadius: 20, padding: 24,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
                boxShadow: `0 0 40px ${catColor}66`,
              }}
            >
              <img
                src={getCategoryIcon(unlockTarget.id)}
                alt={unlockTarget.label}
                style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'contain' }}
                onError={(e) => { e.target.style.display = 'none' }}
              />
              <div style={{ fontSize: 18, fontWeight: 900, color: 'white', textAlign: 'center' }}>
                Débloquer {unlockTarget.label} ?
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 1.4 }}>
                Tu reçois 1 f*ct aléatoire de cette catégorie et tu pourras y jouer en Flash et Explorer.
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 12,
                background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)',
              }}>
                <img src="/assets/ui/coin.png" style={{ width: 20, height: 20 }} alt="" onError={(e) => { e.target.style.display = 'none' }} />
                <span style={{ fontSize: 22, fontWeight: 900, color: '#FFD700' }}>{UNLOCK_CATEGORY_PRICE}</span>
              </div>
              <div style={{ fontSize: 12, color: canAfford ? 'rgba(255,255,255,0.5)' : '#EF4444', fontWeight: 700 }}>
                Tu as {coins} coins {!canAfford && '— pas assez !'}
              </div>
              <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 4 }}>
                <button
                  onClick={() => setUnlockTarget(null)}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 12,
                    background: 'rgba(255,255,255,0.1)', color: 'white',
                    border: '1px solid rgba(255,255,255,0.2)',
                    fontWeight: 800, fontSize: 14, cursor: 'pointer',
                    fontFamily: 'Nunito, sans-serif',
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmUnlockCategory}
                  disabled={!canAfford}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 12,
                    background: canAfford ? `linear-gradient(135deg, ${catColor}, ${catColor}cc)` : 'rgba(255,255,255,0.08)',
                    color: canAfford ? 'white' : 'rgba(255,255,255,0.3)',
                    border: 'none',
                    fontWeight: 900, fontSize: 14,
                    cursor: canAfford ? 'pointer' : 'not-allowed',
                    fontFamily: 'Nunito, sans-serif',
                    boxShadow: canAfford ? `0 4px 16px ${catColor}66` : 'none',
                  }}
                >
                  Débloquer
                </button>
              </div>
            </div>
          </div>
        )
      })()}

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: S(6) }}>

          {/* Aléatoire — masqué en mode Explorer */}
          {gameMode !== 'explorer' && <button
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
              <div style={{ fontWeight: 900, fontSize: S(13), color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                Aléatoire
              </div>
              <div style={{ fontSize: S(10), color: 'rgba(255,255,255,0.75)', fontWeight: 700, marginTop: S(2) }}>
                Catégorie surprise !
              </div>
            </div>
          </button>}

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
                  borderRadius: S(14),
                  padding: `${S(10)} ${S(12)}`,
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
                    width: S(36), height: S(36),
                    objectFit: 'contain', flexShrink: 0,
                    borderRadius: S(8),
                  }}
                  onError={(e) => { e.target.style.display = 'none' }}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 900, fontSize: S(13), color: 'white',
                    lineHeight: 1.2, marginBottom: S(4),
                    textShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {cat.label}
                  </div>
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

                <span style={{
                  fontWeight: 900, fontSize: S(12),
                  color: 'rgba(255,255,255,0.8)', flexShrink: 0,
                }}>
                  {isLocked ? '🔒' : `${pct}%`}
                </span>
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
              ? `linear-gradient(135deg, ${getCategoryColor(selectedCat) || '#FF6B1A'}, ${getCategoryColor(selectedCat) || '#FF6B1A'}cc)`
              : 'rgba(255,255,255,0.25)',
            color: hasSelection ? 'white' : 'rgba(255,255,255,0.5)',
            boxShadow: hasSelection ? `0 6px 24px ${getCategoryColor(selectedCat) || '#FF6B1A'}50` : 'none',
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
