import { useState, useMemo, useEffect } from 'react'
import { useScale } from '../hooks/useScale'
import { getValidFacts, getPlayableCategories } from '../data/factsService'
import { audio } from '../utils/audio'
import { useDuelContext } from '../features/duels/context/DuelContext'
import { loadUserCollections } from '../services/collectionService'

const S = (px) => `calc(${px}px * var(--scale))`

const getCategoryIcon = (id) => `/assets/categories/${id}.png`

export default function BlitzLobbyScreen({ onSelectCategory, onBack, bestBlitzTime = null, opponentId = null }) {
  const scale = useScale()
  const isChallenge = !!opponentId
  const [selectedCatId, setSelectedCatId] = useState(isChallenge ? null : 'all')
  const [questionCount, setQuestionCount] = useState(null)

  // Source de vérité : DuelContext → lit collections Supabase direct.
  // Plus de dépendance à App.jsx state ni à localStorage.
  const { unlockedFacts: effectiveUnlocked, unlockedLoading } = useDuelContext()
  const allFacts = getValidFacts()
  const totalUnlocked = allFacts.filter(f => effectiveUnlocked.has(f.id)).length

  // En mode défi : on charge les collections de l'adversaire pour ne proposer
  // que les catégories où LES DEUX joueurs ont ≥5 facts.
  const [opponentCountsByCat, setOpponentCountsByCat] = useState(null)
  const [opponentLoading, setOpponentLoading] = useState(isChallenge)
  useEffect(() => {
    if (!isChallenge) return
    let cancelled = false
    setOpponentLoading(true)
    loadUserCollections(opponentId)
      .then(map => {
        if (cancelled) return
        const counts = {}
        for (const [cat, data] of Object.entries(map || {})) {
          counts[cat] = data.factsCompleted instanceof Set ? data.factsCompleted.size : 0
        }
        setOpponentCountsByCat(counts)
      })
      .finally(() => { if (!cancelled) setOpponentLoading(false) })
    return () => { cancelled = true }
  }, [isChallenge, opponentId])

  // Categories with >= 5 unlocked facts (seuil minimum pour Blitz).
  // En défi : exiger aussi ≥5 facts côté adversaire.
  const categories = useMemo(() => {
    const cats = getPlayableCategories()
    return cats
      .map(cat => {
        const count = allFacts.filter(f => f.category === cat.id && effectiveUnlocked.has(f.id)).length
        const opponentCount = opponentCountsByCat ? (opponentCountsByCat[cat.id] || 0) : null
        return { ...cat, count, opponentCount }
      })
      .filter(c => c.count >= 5 && (!isChallenge || (c.opponentCount ?? 0) >= 5))
      .sort((a, b) => b.count - a.count)
  }, [allFacts, effectiveUnlocked, isChallenge, opponentCountsByCat])

  // Pool size for selected category
  const poolSize = selectedCatId === 'all'
    ? totalUnlocked
    : (categories.find(c => c.id === selectedCatId)?.count || 0)

  // En défi : pool effectif = min(moi, adversaire) sur la catégorie choisie
  const opponentPool = isChallenge && selectedCatId && selectedCatId !== 'all'
    ? (opponentCountsByCat?.[selectedCatId] || 0)
    : null
  const effectivePool = isChallenge && opponentPool != null
    ? Math.min(poolSize, opponentPool)
    : poolSize

  const questionOptions = [5, 10, 20, 30, 40, 50]
  const poolForCount = effectivePool
  const effectiveCount = questionCount || (poolForCount >= 50 ? 50 : poolForCount >= 40 ? 40 : poolForCount >= 30 ? 30 : poolForCount >= 20 ? 20 : poolForCount >= 10 ? 10 : poolForCount >= 5 ? 5 : poolForCount)
  const hasSelection = selectedCatId !== null && poolForCount >= 5

  const handleGo = () => {
    if (!hasSelection) return
    audio.play('click')
    onSelectCategory(selectedCatId === 'all' ? null : selectedCatId, effectiveCount)
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

          {/* Toutes mes f*cts — masqué en mode défi (catégorie obligatoire) */}
          {!isChallenge && (
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
          )}

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

          {totalUnlocked < 5 && (
            <div style={{ textAlign: 'center', padding: `${S(20)} 0`, color: 'rgba(255,255,255,0.4)', fontSize: S(12) }}>
              Débloque au moins 5 f*cts pour jouer en Blitz ! 🔓
            </div>
          )}

          {isChallenge && opponentLoading && (
            <div style={{ textAlign: 'center', padding: `${S(20)} 0`, color: 'rgba(255,255,255,0.5)', fontSize: S(12) }}>
              ⏳ Vérification des f*cts de ton adversaire...
            </div>
          )}

          {isChallenge && !opponentLoading && categories.length === 0 && (
            <div style={{ textAlign: 'center', padding: `${S(20)} 0`, color: 'rgba(255,255,255,0.5)', fontSize: S(12), lineHeight: 1.5 }}>
              😕 Aucune catégorie commune avec ton adversaire (5 f*cts mini chacun).
              <br />Jouez tous les deux pour en débloquer !
            </div>
          )}
        </div>
      </div>

      {/* Question count selector */}
      {poolSize >= 5 && (
        <div style={{ flexShrink: 0, padding: `0 ${S(12)} ${S(8)}` }}>
          <div style={{ fontSize: S(14), fontWeight: 900, color: 'white', marginBottom: S(8), textAlign: 'center' }}>Nombre de questions</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {questionOptions.map(n => {
              const available = poolSize >= n
              const selected = effectiveCount === n
              return (
                <button
                  key={n}
                  onClick={() => available && setQuestionCount(n)}
                  disabled={!available}
                  style={{
                    borderRadius: 12, padding: `${S(10)} 0`,
                    fontSize: S(16), fontWeight: 900, cursor: available ? 'pointer' : 'default',
                    background: selected ? '#FF6B1A' : available ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                    color: available ? 'white' : 'rgba(255,255,255,0.2)',
                    border: selected ? '2px solid #FF6B1A' : available ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.08)',
                    opacity: available ? 1 : 0.35,
                    transition: 'all 0.2s ease',
                    fontFamily: 'Nunito, sans-serif',
                    position: 'relative',
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

      {/* CTA */}
      <div style={{ flexShrink: 0, padding: `${S(8)} ${S(12)} ${S(14)}` }}>
        <button
          onClick={hasSelection && totalUnlocked >= 5 ? handleGo : undefined}
          style={{
            width: '100%', padding: S(14),
            borderRadius: S(14), fontSize: S(18), fontWeight: 900,
            textTransform: 'uppercase', letterSpacing: '0.04em',
            border: 'none', fontFamily: 'Nunito, sans-serif',
            cursor: hasSelection && totalUnlocked >= 5 ? 'pointer' : 'default',
            pointerEvents: hasSelection && totalUnlocked >= 5 ? 'auto' : 'none',
            background: hasSelection && totalUnlocked >= 5 ? 'linear-gradient(135deg, #FF6B1A, #D94A10)' : 'rgba(255,255,255,0.15)',
            color: hasSelection && totalUnlocked >= 5 ? 'white' : 'rgba(255,255,255,0.4)',
            boxShadow: hasSelection && totalUnlocked >= 5 ? '0 6px 24px rgba(255,107,26,0.4)' : 'none',
          }}
        >
          GO ! ⚡
        </button>
      </div>
    </div>
  )
}
