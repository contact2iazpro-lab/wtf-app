import { useState, useMemo } from 'react'
import { useScale } from '../hooks/useScale'
import { getValidFacts, getPlayableCategories } from '../data/factsService'
import { audio } from '../utils/audio'
import { useDuelContext } from '../features/duels/context/DuelContext'
import { readWtfData } from '../utils/storageHelper'

const S = (px) => `calc(${px}px * var(--scale))`

const getCategoryIcon = (id) => `/assets/categories/${id}.png`

// Paliers Speedrun (nb questions à enchaîner, chrono montant)
const SPEEDRUN_PALIERS = [5, 10, 20, 30, 50, 100]

export default function BlitzLobbyScreen({ onSelectCategory, onBack, bestBlitzScore = 0 }) {
  const scale = useScale()
  const [variant, setVariant] = useState('rush') // 'rush' (60s descendant) | 'speedrun' (chrono montant, cat 100%)
  const [selectedCatId, setSelectedCatId] = useState(null)
  const [selectedPalier, setSelectedPalier] = useState(null)

  // Source de vérité : DuelContext → lit collections Supabase direct.
  const { unlockedFacts: effectiveUnlocked } = useDuelContext()
  const allFacts = getValidFacts()
  const totalUnlocked = allFacts.filter(f => effectiveUnlocked.has(f.id)).length

  // Catégories avec compteurs unlocked / total, flag "complétée à 100%" pour Speedrun
  const categories = useMemo(() => {
    const cats = getPlayableCategories()
    return cats
      .map(cat => {
        const factsInCat = allFacts.filter(f => f.category === cat.id)
        const unlocked = factsInCat.filter(f => effectiveUnlocked.has(f.id)).length
        const total = factsInCat.length
        return { ...cat, unlocked, total, isComplete: total > 0 && unlocked === total }
      })
      .sort((a, b) => (b.isComplete - a.isComplete) || b.unlocked - a.unlocked)
  }, [allFacts, effectiveUnlocked])

  const completedCats = categories.filter(c => c.isComplete)

  // Records Speedrun par (cat, palier) — stockés dans wtfData.speedrunRecords[`${catId}_${palier}`] = temps en s
  const speedrunRecords = useMemo(() => {
    const wd = readWtfData()
    return wd.speedrunRecords || {}
  }, [selectedCatId, selectedPalier, variant])

  const currentRecord = selectedCatId && selectedPalier
    ? speedrunRecords[`${selectedCatId}_${selectedPalier}`] || null
    : null

  // Le palier ne peut pas dépasser le nb de facts débloqués dans la cat
  const selectedCat = selectedCatId ? categories.find(c => c.id === selectedCatId) : null
  const maxPalier = selectedCat?.unlocked || 0

  const canGo = variant === 'rush'
    ? totalUnlocked >= 5
    : (selectedCatId && selectedPalier && selectedPalier <= maxPalier)

  const handleGo = () => {
    audio.play('click')
    if (variant === 'rush') {
      // Rush : pas de catégorie, tout le pool, 60s descendant
      onSelectCategory(null, null, 'rush')
    } else {
      // Speedrun : catégorie + palier fixés
      onSelectCategory(selectedCatId, selectedPalier, 'speedrun')
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', width: '100%',
      overflow: 'hidden', boxSizing: 'border-box',
      fontFamily: 'Nunito, sans-serif',
      '--scale': scale,
      background: 'linear-gradient(160deg, #7b6b8a 0%, #9d8bab 40%, #b5a5c2 70%, #7b6b8a 100%)',
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

      {/* Toggle Rush / Speedrun */}
      <div style={{ flexShrink: 0, padding: `0 ${S(12)} ${S(10)}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: S(8) }}>
          <button
            onClick={() => { audio.play('click'); setVariant('rush') }}
            style={{
              padding: `${S(12)} 0`, borderRadius: S(12),
              background: variant === 'rush' ? 'linear-gradient(135deg, #FF6B1A, #D94A10)' : 'rgba(255,255,255,0.08)',
              border: variant === 'rush' ? '2.5px solid white' : '2.5px solid transparent',
              color: 'white', fontWeight: 900, fontSize: S(14), cursor: 'pointer',
              fontFamily: 'Nunito, sans-serif', transition: 'all 0.2s ease',
            }}
          >
            Rush
            <div style={{ fontSize: S(9), fontWeight: 600, opacity: 0.85, marginTop: 2 }}>
              60s · bats ton record
            </div>
          </button>
          <button
            onClick={() => { audio.play('click'); setVariant('speedrun') }}
            disabled={completedCats.length === 0}
            style={{
              padding: `${S(12)} 0`, borderRadius: S(12),
              background: variant === 'speedrun'
                ? 'linear-gradient(135deg, #00E5FF, #0097A7)'
                : completedCats.length === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
              border: variant === 'speedrun' ? '2.5px solid white' : '2.5px solid transparent',
              color: completedCats.length === 0 ? 'rgba(255,255,255,0.3)' : 'white',
              fontWeight: 900, fontSize: S(14),
              cursor: completedCats.length === 0 ? 'not-allowed' : 'pointer',
              fontFamily: 'Nunito, sans-serif', transition: 'all 0.2s ease',
              position: 'relative',
            }}
          >
            Speedrun
            <div style={{ fontSize: S(9), fontWeight: 600, opacity: 0.85, marginTop: 2 }}>
              {completedCats.length === 0 ? '🔒 catégorie 100%' : 'le + rapide gagne'}
            </div>
          </button>
        </div>
      </div>

      {/* Record contextuel */}
      <div style={{ flexShrink: 0, textAlign: 'center', padding: `0 ${S(16)} ${S(8)}` }}>
        {variant === 'rush' ? (
          bestBlitzScore > 0 ? (
            <div style={{ fontSize: S(18), fontWeight: 900, color: '#FFD700' }}>
              🏆 Ton record : {bestBlitzScore} bonne{bestBlitzScore > 1 ? 's' : ''} en 60s
            </div>
          ) : (
            <div style={{ fontSize: S(14), fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>
              Pas encore de record — lance-toi !
            </div>
          )
        ) : (
          currentRecord ? (
            <div style={{ fontSize: S(18), fontWeight: 900, color: '#FFD700' }}>
              🏆 Record palier {selectedPalier} : {currentRecord.toFixed(2)}s
            </div>
          ) : selectedCatId && selectedPalier ? (
            <div style={{ fontSize: S(14), fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>
              Pas encore de record sur ce palier — go !
            </div>
          ) : (
            <div style={{ fontSize: S(14), fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>
              Choisis une catégorie 100% + un palier
            </div>
          )
        )}
      </div>

      {/* Description */}
      <div style={{ flexShrink: 0, textAlign: 'center', padding: `0 ${S(20)} ${S(12)}` }}>
        <p style={{ fontSize: S(12), fontWeight: 600, color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.4 }}>
          {variant === 'rush'
            ? 'Réponds au max de questions en 60 secondes. Erreur = −5s. Enchaîne sans filet !'
            : 'Termine N questions le plus vite possible. Chrono montant. Erreur = +5s de pénalité. Catégorie 100% requise.'}
        </p>
      </div>

      {/* Contenu principal (varie selon variant) */}
      {variant === 'rush' ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: S(24), textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: S(64), marginBottom: S(12) }}>⚡</div>
            <div style={{ fontSize: S(16), fontWeight: 900, color: 'white', marginBottom: S(6) }}>
              {totalUnlocked} f*cts débloqués
            </div>
            <div style={{ fontSize: S(12), fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
              {totalUnlocked >= 5
                ? 'Piochés dans toutes tes catégories, VIP et Funny mélangés.'
                : `Débloque encore ${5 - totalUnlocked} f*ct${5 - totalUnlocked > 1 ? 's' : ''} pour accéder au Blitz Rush.`}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Liste catégories (Speedrun) — toutes affichées, celles non-100% grisées */}
          <div style={{ flex: 1, overflowY: 'auto', padding: `0 ${S(12)} ${S(8)}`, WebkitOverflowScrolling: 'touch' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: S(6) }}>
              {completedCats.length === 0 && (
                <div style={{ textAlign: 'center', padding: `${S(20)} 0`, color: 'rgba(255,255,255,0.5)', fontSize: S(13), fontWeight: 700 }}>
                  🔒 Complète 100% d'une catégorie pour débloquer le Speedrun.
                </div>
              )}
              {categories.map(cat => {
                const isSelected = selectedCatId === cat.id
                const available = cat.isComplete
                return (
                  <button
                    key={cat.id}
                    onClick={() => { if (!available) return; audio.play('click'); setSelectedCatId(cat.id); setSelectedPalier(null) }}
                    disabled={!available}
                    style={{
                      background: isSelected ? (cat.color || '#6B7280') : available ? `${cat.color || '#6B7280'}88` : 'rgba(255,255,255,0.04)',
                      borderRadius: S(12), padding: `${S(10)} ${S(14)}`,
                      width: '100%', boxSizing: 'border-box',
                      display: 'flex', alignItems: 'center', gap: S(10),
                      border: isSelected ? '2.5px solid white' : '2.5px solid transparent',
                      boxShadow: isSelected ? '0 0 20px rgba(255,255,255,0.2)' : 'none',
                      opacity: available ? (isSelected || selectedCatId === null ? 1 : 0.7) : 0.35,
                      cursor: available ? 'pointer' : 'not-allowed',
                      fontFamily: 'Nunito, sans-serif', textAlign: 'left',
                      transition: 'all 0.2s ease',
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
                      <div style={{ fontSize: S(10), fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                        {cat.unlocked} / {cat.total} f*cts
                      </div>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: S(11), color: available ? '#FFD700' : 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                      {available ? '✓ 100%' : `${Math.round((cat.unlocked / (cat.total || 1)) * 100)}%`}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Palier selector (Speedrun uniquement, si cat sélectionnée) */}
          {selectedCatId && (
            <div style={{ flexShrink: 0, padding: `0 ${S(12)} ${S(8)}` }}>
              <div style={{ fontSize: S(14), fontWeight: 900, color: 'white', marginBottom: S(8), textAlign: 'center' }}>
                Palier (nb questions)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {SPEEDRUN_PALIERS.map(n => {
                  const available = n <= maxPalier
                  const selected = selectedPalier === n
                  return (
                    <button
                      key={n}
                      onClick={() => available && setSelectedPalier(n)}
                      disabled={!available}
                      style={{
                        borderRadius: 12, padding: `${S(10)} 0`,
                        fontSize: S(16), fontWeight: 900, cursor: available ? 'pointer' : 'default',
                        background: selected ? '#00E5FF' : available ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                        color: available ? (selected ? '#0a0a2e' : 'white') : 'rgba(255,255,255,0.2)',
                        border: selected ? '2px solid #00E5FF' : available ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.08)',
                        opacity: available ? 1 : 0.35,
                        transition: 'all 0.2s ease',
                        fontFamily: 'Nunito, sans-serif',
                      }}
                    >
                      {n}
                      {!available && <span style={{ display: 'block', fontSize: S(8), color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>🔒</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* CTA */}
      <div style={{ flexShrink: 0, padding: `${S(8)} ${S(12)} ${S(14)}` }}>
        <button
          onClick={canGo ? handleGo : undefined}
          style={{
            width: '100%', padding: S(14),
            borderRadius: S(14), fontSize: S(18), fontWeight: 900,
            textTransform: 'uppercase', letterSpacing: '0.04em',
            border: 'none', fontFamily: 'Nunito, sans-serif',
            cursor: canGo ? 'pointer' : 'default',
            pointerEvents: canGo ? 'auto' : 'none',
            background: canGo
              ? (variant === 'rush'
                  ? 'linear-gradient(135deg, #FF6B1A, #D94A10)'
                  : 'linear-gradient(135deg, #00E5FF, #0097A7)')
              : 'rgba(255,255,255,0.15)',
            color: canGo ? 'white' : 'rgba(255,255,255,0.4)',
            boxShadow: canGo ? '0 6px 24px rgba(255,107,26,0.4)' : 'none',
          }}
        >
          {variant === 'rush' ? 'GO ! ⚡' : (selectedPalier ? `GO SPEEDRUN · ${selectedPalier} QUESTIONS` : 'CHOISIS UN PALIER')}
        </button>
      </div>
    </div>
  )
}
