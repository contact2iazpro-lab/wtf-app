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
  // Tri : 100% complétées en haut > % complétion desc > alphabétique (19/04/2026)
  const categories = useMemo(() => {
    const cats = getPlayableCategories()
    return cats
      .map(cat => {
        const factsInCat = allFacts.filter(f => f.category === cat.id)
        const unlocked = factsInCat.filter(f => effectiveUnlocked.has(f.id)).length
        const total = factsInCat.length
        const ratio = total > 0 ? unlocked / total : 0
        return { ...cat, unlocked, total, ratio, isComplete: total > 0 && unlocked === total }
      })
      .sort((a, b) => {
        if (a.isComplete !== b.isComplete) return b.isComplete - a.isComplete
        if (a.ratio !== b.ratio) return b.ratio - a.ratio
        return (a.label || '').localeCompare(b.label || '', 'fr')
      })
  }, [allFacts, effectiveUnlocked])

  // Gate unifiée Rush + Speedrun : cat doit avoir ≥10 f*cts débloqués
  // (aligné Rush/Speedrun 19/04/2026 — plus besoin d'avoir 100% pour Speedrun)
  const RUSH_MIN_FACTS = 10
  const availableCats = categories.filter(c => c.unlocked >= RUSH_MIN_FACTS)
  const rushCats = availableCats
  const speedrunCats = availableCats

  // Records Speedrun par (cat, palier) — stockés dans wtfData.speedrunRecords[`${catId}_${palier}`] = temps en s
  const speedrunRecords = useMemo(() => {
    const wd = readWtfData()
    return wd.speedrunRecords || {}
  }, [selectedCatId, selectedPalier, variant])

  const currentRecord = selectedCatId && selectedPalier
    ? speedrunRecords[`${selectedCatId}_${selectedPalier}`] || null
    : null

  // Top 3 derniers records Speedrun (meilleurs temps, tous paliers confondus)
  const topRecords = useMemo(() => {
    const entries = Object.entries(speedrunRecords)
    if (entries.length === 0) return []
    return entries
      .map(([key, time]) => {
        const [catId, palierStr] = key.split('_')
        const cat = categories.find(c => c.id === catId)
        return {
          key,
          catId,
          catLabel: cat?.label || catId,
          catColor: cat?.color || '#888',
          palier: parseInt(palierStr) || 0,
          time: Number(time),
        }
      })
      .filter(r => r.time > 0)
      .sort((a, b) => a.time - b.time)
      .slice(0, 3)
  }, [speedrunRecords, categories])

  // Le palier ne peut pas dépasser le nb de facts débloqués dans la cat
  const selectedCat = selectedCatId ? categories.find(c => c.id === selectedCatId) : null
  const maxPalier = selectedCat?.unlocked || 0

  // Rush : 'all' par défaut, ou une cat spécifique avec ≥10 f*cts unlocked
  const [rushCatId, setRushCatId] = useState('all')
  const canGo = variant === 'rush'
    ? (rushCatId === 'all' ? totalUnlocked >= RUSH_MIN_FACTS
        : rushCats.some(c => c.id === rushCatId))
    : (selectedCatId && selectedPalier && selectedPalier <= maxPalier)

  const handleGo = () => {
    audio.play('click')
    if (variant === 'rush') {
      // Rush : pool global ('all') ou cat spécifique si ≥10 f*cts unlocked
      onSelectCategory(rushCatId, null, 'rush')
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
      background: 'linear-gradient(160deg, #8a1a1a 0%, #CC0000 40%, #FF4444 70%, #8a1a1a 100%)',
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
              background: variant === 'rush' ? 'linear-gradient(135deg, #FF4444, #CC0000)' : 'rgba(255,255,255,0.08)',
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
            disabled={speedrunCats.length === 0}
            style={{
              padding: `${S(12)} 0`, borderRadius: S(12),
              background: variant === 'speedrun'
                ? 'linear-gradient(135deg, #8B0000, #500000)'
                : speedrunCats.length === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
              border: variant === 'speedrun' ? '2.5px solid white' : '2.5px solid transparent',
              color: speedrunCats.length === 0 ? 'rgba(255,255,255,0.3)' : 'white',
              fontWeight: 900, fontSize: S(14),
              cursor: speedrunCats.length === 0 ? 'not-allowed' : 'pointer',
              fontFamily: 'Nunito, sans-serif', transition: 'all 0.2s ease',
              position: 'relative',
            }}
          >
            Speedrun
            <div style={{ fontSize: S(9), fontWeight: 600, opacity: 0.85, marginTop: 2 }}>
              {speedrunCats.length === 0 ? `🔒 ${RUSH_MIN_FACTS} f*cts min` : 'le + rapide gagne'}
            </div>
          </button>
        </div>
      </div>

      {/* Mes records — filtrés par variant actif (3 derniers max). Liste complète = onglet Records Blitz de la navbar Social. */}
      {((variant === 'rush' && bestBlitzScore > 0) || (variant === 'speedrun' && topRecords.length > 0)) && (
        <div style={{ flexShrink: 0, padding: `0 ${S(12)} ${S(10)}` }}>
          <div style={{
            background: 'rgba(0,0,0,0.25)', borderRadius: S(12),
            border: '1px solid rgba(255,215,0,0.25)',
            padding: `${S(8)} ${S(12)}`,
          }}>
            <div style={{ fontSize: S(10), fontWeight: 900, color: '#FFD700', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: S(6) }}>
              🏆 Mes records
            </div>
            {variant === 'rush' && bestBlitzScore > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: S(12), padding: `${S(3)} 0` }}>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>⚡ Rush · 60s</span>
                <span style={{ color: '#FFD700', fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
                  {bestBlitzScore} bonne{bestBlitzScore > 1 ? 's' : ''}
                </span>
              </div>
            )}
            {variant === 'speedrun' && topRecords.map(r => (
              <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: S(12), padding: `${S(3)} 0` }}>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: S(6), minWidth: 0 }}>
                  <span style={{ width: S(8), height: S(8), borderRadius: '50%', background: r.catColor, flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.catLabel}</span>
                  <span style={{ opacity: 0.55, fontSize: S(10), flexShrink: 0 }}>· {r.palier}q</span>
                </span>
                <span style={{ color: '#00E5FF', fontWeight: 900, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                  {r.time.toFixed(2)}s
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
          ) : null
        )}
      </div>

      {/* Contenu principal (varie selon variant) */}
      {variant === 'rush' ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: `0 ${S(12)} ${S(8)}`, WebkitOverflowScrolling: 'touch' }}>
          {totalUnlocked < RUSH_MIN_FACTS ? (
            <div style={{ textAlign: 'center', padding: `${S(20)} 0`, color: 'rgba(255,255,255,0.55)', fontSize: S(13), fontWeight: 700 }}>
              🔒 Débloque au moins {RUSH_MIN_FACTS} f*cts pour accéder au Blitz Rush.
              <div style={{ fontSize: S(11), opacity: 0.8, marginTop: S(4) }}>
                Tu en as {totalUnlocked} / {RUSH_MIN_FACTS}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: S(6) }}>
              {/* Option Aléatoire (toutes cats confondues) */}
              {(() => {
                const sel = rushCatId === 'all'
                return (
                  <button
                    key="all"
                    onClick={() => { audio.play('click'); setRushCatId('all') }}
                    style={{
                      background: sel ? 'linear-gradient(135deg, #CC0000, #8a1a1a)' : 'rgba(255,255,255,0.08)',
                      borderRadius: S(12), padding: `${S(10)} ${S(14)}`,
                      width: '100%', boxSizing: 'border-box',
                      display: 'flex', alignItems: 'center', gap: S(10),
                      border: sel ? '3px solid #ffffff' : '2px solid #ffffff',
                      cursor: 'pointer', textAlign: 'left',
                      fontFamily: 'Nunito, sans-serif',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ width: S(32), height: S(32), borderRadius: S(6), background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: S(18), flexShrink: 0 }}>🎲</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 900, fontSize: S(13), color: 'white', lineHeight: 1.2 }}>Aléatoire</div>
                      <div style={{ fontSize: S(10), fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                        {totalUnlocked} f*cts · toutes catégories
                      </div>
                    </div>
                  </button>
                )
              })()}
              {/* Cats avec ≥10 f*cts débloqués */}
              {rushCats.map(cat => {
                const sel = rushCatId === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => { audio.play('click'); setRushCatId(cat.id) }}
                    style={{
                      background: sel ? (cat.color || '#6B7280') : `${cat.color || '#6B7280'}88`,
                      borderRadius: S(12), padding: `${S(10)} ${S(14)}`,
                      width: '100%', boxSizing: 'border-box',
                      display: 'flex', alignItems: 'center', gap: S(10),
                      border: sel ? '3px solid #ffffff' : '2px solid #ffffff',
                      boxShadow: sel ? '0 0 20px rgba(255,255,255,0.25)' : 'none',
                      opacity: sel || rushCatId === 'all' ? 1 : 0.75,
                      cursor: 'pointer', textAlign: 'left',
                      fontFamily: 'Nunito, sans-serif',
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
                      <div style={{ fontSize: S(10), fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                        {cat.unlocked} / {cat.total} f*cts
                      </div>
                    </div>
                  </button>
                )
              })}
              {rushCats.length === 0 && (
                <div style={{ textAlign: 'center', padding: `${S(12)} 0`, color: 'rgba(255,255,255,0.5)', fontSize: S(11), fontWeight: 600 }}>
                  Aucune catégorie ≥ {RUSH_MIN_FACTS} f*cts débloqués. Joue en aléatoire.
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Liste catégories (Speedrun) — ≥10 f*cts débloqués (aligné Rush 19/04) */}
          <div style={{ flex: 1, overflowY: 'auto', padding: `0 ${S(12)} ${S(8)}`, WebkitOverflowScrolling: 'touch' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: S(6) }}>
              {speedrunCats.length === 0 && (
                <div style={{ textAlign: 'center', padding: `${S(20)} 0`, color: 'rgba(255,255,255,0.5)', fontSize: S(13), fontWeight: 700 }}>
                  🔒 Débloque {RUSH_MIN_FACTS} f*cts dans une catégorie pour le Speedrun.
                </div>
              )}
              {categories.map(cat => {
                const isSelected = selectedCatId === cat.id
                const available = cat.unlocked >= RUSH_MIN_FACTS
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
                      border: isSelected ? '3px solid #ffffff' : '2px solid #ffffff',
                      boxShadow: isSelected ? '0 0 20px rgba(255,255,255,0.25)' : 'none',
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
                      {cat.isComplete ? '✓ 100%' : `${Math.round((cat.unlocked / (cat.total || 1)) * 100)}%`}
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
            border: canGo ? '3px solid #ffffff' : 'none',
            fontFamily: 'Nunito, sans-serif',
            cursor: canGo ? 'pointer' : 'default',
            pointerEvents: canGo ? 'auto' : 'none',
            background: canGo
              ? (variant === 'rush'
                  ? '#CC0000'
                  : '#8B0000')
              : 'rgba(255,255,255,0.15)',
            color: canGo ? 'white' : 'rgba(255,255,255,0.4)',
            boxShadow: canGo ? '0 6px 24px rgba(204,0,0,0.5)' : 'none',
          }}
        >
          {variant === 'rush' ? 'GO ! ⚡' : (selectedPalier ? `GO SPEEDRUN · ${selectedPalier} QUESTIONS` : 'CHOISIS UN PALIER')}
        </button>
      </div>
    </div>
  )
}
