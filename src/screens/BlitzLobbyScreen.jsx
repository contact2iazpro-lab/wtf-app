import { useState, useMemo } from 'react'
import { useScale } from '../hooks/useScale'
import { getValidFacts, getPlayableCategories } from '../data/factsService'
import { audio } from '../utils/audio'

const S = (px) => `calc(${px}px * var(--scale))`

const getCategoryIcon = (id) => `/assets/categories/${id}.png`

export default function BlitzLobbyScreen({ onSelectCategory, onBack, unlockedFacts = new Set(), bestBlitzTime = null }) {
  const scale = useScale()
  const [selectedCatId, setSelectedCatId] = useState('all')

  const allFacts = getValidFacts()
  const totalUnlocked = allFacts.filter(f => unlockedFacts.has(f.id)).length

  // Categories with >= 4 unlocked facts
  const categories = useMemo(() => {
    const cats = getPlayableCategories()
    return cats
      .map(cat => {
        const count = allFacts.filter(f => f.category === cat.id && unlockedFacts.has(f.id)).length
        return { ...cat, count }
      })
      .filter(c => c.count >= 4)
      .sort((a, b) => b.count - a.count)
  }, [allFacts, unlockedFacts])

  const hasSelection = selectedCatId !== null

  const handleGo = () => {
    if (!hasSelection) return
    audio.play('click')
    onSelectCategory(selectedCatId === 'all' ? null : selectedCatId)
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', width: '100%',
      overflow: 'hidden', boxSizing: 'border-box',
      fontFamily: 'Nunito, sans-serif',
      '--scale': scale,
      background: 'linear-gradient(160deg, #0a0a1a 0%, #1a0a2e 100%)',
      color: '#ffffff',
    }}>

      {/* Header */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: S(10),
        padding: `${S(12)} ${S(16)}`,
      }}>
        <button
          onClick={() => { audio.play('click'); onBack() }}
          style={{
            width: S(36), height: S(36), borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: S(18), color: '#fff',
          }}
        >←</button>
        <h1 style={{ fontSize: S(24), fontWeight: 900, margin: 0, letterSpacing: '0.02em' }}>
          ⚡ BLITZ
        </h1>
      </div>

      {/* Record */}
      <div style={{ flexShrink: 0, textAlign: 'center', padding: `0 ${S(16)} ${S(8)}` }}>
        {bestBlitzTime ? (
          <div style={{ fontSize: S(18), fontWeight: 900, color: '#FFD700' }}>
            🏆 Ton record : {bestBlitzTime < 60 ? bestBlitzTime.toFixed(2) + 's' : Math.floor(bestBlitzTime / 60) + ':' + (bestBlitzTime % 60).toFixed(2).padStart(5, '0')}
          </div>
        ) : (
          <div style={{ fontSize: S(14), fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>
            Pas encore de record — lance-toi !
          </div>
        )}
      </div>

      {/* Description */}
      <div style={{ flexShrink: 0, textAlign: 'center', padding: `0 ${S(20)} ${S(12)}` }}>
        <p style={{ fontSize: S(12), fontWeight: 600, color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.4 }}>
          Réponds le plus vite possible à tes f*cts débloqués. 60 secondes, pas d'indices !
        </p>
      </div>

      {/* Pool selection */}
      <div style={{ flex: 1, overflowY: 'auto', padding: `0 ${S(12)} ${S(8)}`, WebkitOverflowScrolling: 'touch' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: S(6) }}>

          {/* Toutes mes f*cts */}
          <button
            onClick={() => { audio.play('click'); setSelectedCatId('all') }}
            style={{
              background: selectedCatId === 'all'
                ? 'linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)'
                : 'linear-gradient(135deg, rgba(124,58,237,0.5) 0%, rgba(59,130,246,0.5) 100%)',
              borderRadius: S(12), padding: `${S(12)} ${S(14)}`,
              width: '100%', boxSizing: 'border-box',
              display: 'flex', alignItems: 'center', gap: S(10),
              border: selectedCatId === 'all' ? '2.5px solid white' : '2.5px solid transparent',
              boxShadow: selectedCatId === 'all' ? '0 0 20px rgba(255,255,255,0.2)' : 'none',
              transform: selectedCatId === 'all' ? 'scale(1.02)' : 'scale(1)',
              opacity: selectedCatId === null || selectedCatId === 'all' ? 1 : 0.6,
              cursor: 'pointer', transition: 'all 0.2s ease',
              fontFamily: 'Nunito, sans-serif', textAlign: 'left',
            }}
          >
            <span style={{ fontSize: S(24), flexShrink: 0 }}>🎲</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900, fontSize: S(14), color: 'white' }}>Toutes mes f*cts</div>
              <div style={{ fontSize: S(10), fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                {totalUnlocked} f*cts débloqués
              </div>
            </div>
          </button>

          {/* Categories */}
          {categories.map(cat => {
            const isSelected = selectedCatId === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => { audio.play('click'); setSelectedCatId(cat.id) }}
                style={{
                  background: isSelected ? (cat.color || '#6B7280') : `${cat.color || '#6B7280'}88`,
                  borderRadius: S(12), padding: `${S(10)} ${S(14)}`,
                  width: '100%', boxSizing: 'border-box',
                  display: 'flex', alignItems: 'center', gap: S(10),
                  border: isSelected ? '2.5px solid white' : '2.5px solid transparent',
                  boxShadow: isSelected ? '0 0 20px rgba(255,255,255,0.2)' : 'none',
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                  opacity: selectedCatId === null || isSelected || selectedCatId === 'all' ? (selectedCatId === 'all' && !isSelected ? 0.6 : 1) : 0.6,
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  fontFamily: 'Nunito, sans-serif', textAlign: 'left',
                }}
              >
                <img
                  src={getCategoryIcon(cat.id)}
                  alt={cat.label}
                  style={{ width: S(32), height: S(32), borderRadius: S(6), objectFit: 'cover', flexShrink: 0 }}
                  onError={e => { e.target.style.display = 'none' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: S(13), color: 'white', lineHeight: 1.2 }}>{cat.label}</div>
                </div>
                <span style={{ fontWeight: 800, fontSize: S(11), color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>
                  {cat.count} f*cts
                </span>
              </button>
            )
          })}

          {totalUnlocked < 4 && (
            <div style={{ textAlign: 'center', padding: `${S(20)} 0`, color: 'rgba(255,255,255,0.4)', fontSize: S(12) }}>
              Débloque au moins 4 f*cts pour jouer en Blitz ! 🔓
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div style={{ flexShrink: 0, padding: `${S(8)} ${S(12)} ${S(14)}` }}>
        <button
          onClick={hasSelection && totalUnlocked >= 4 ? handleGo : undefined}
          style={{
            width: '100%', padding: S(14),
            borderRadius: S(14), fontSize: S(18), fontWeight: 900,
            textTransform: 'uppercase', letterSpacing: '0.04em',
            border: 'none', fontFamily: 'Nunito, sans-serif',
            cursor: hasSelection && totalUnlocked >= 4 ? 'pointer' : 'default',
            pointerEvents: hasSelection && totalUnlocked >= 4 ? 'auto' : 'none',
            background: hasSelection && totalUnlocked >= 4 ? 'linear-gradient(135deg, #FF6B1A, #D94A10)' : 'rgba(255,255,255,0.15)',
            color: hasSelection && totalUnlocked >= 4 ? 'white' : 'rgba(255,255,255,0.4)',
            boxShadow: hasSelection && totalUnlocked >= 4 ? '0 6px 24px rgba(255,107,26,0.4)' : 'none',
          }}
        >
          GO ! ⚡
        </button>
      </div>
    </div>
  )
}
