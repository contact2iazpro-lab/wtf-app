import { useState } from 'react'
import { audio } from '../utils/audio'
import { usePlayerProfile } from '../hooks/usePlayerProfile'
import CoinsIcon from './CoinsIcon'

const S = (px) => `calc(${px}px * var(--scale))`

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

const TAB_CONFIG = {
  vip:       { label: 'WTF!',        emoji: '👑' },
  generated: { label: 'Funny F*cts', emoji: '🤖' },
}

export default function CategoryFactsView({ cat, facts, unlockedIds, activeTab, onSelectFact, onClose }) {
  const tab = TAB_CONFIG[activeTab]
  const { coins, applyCurrencyDelta, unlockFact } = usePlayerProfile()
  const [sessionUnlocked, setSessionUnlocked] = useState(() => new Set())
  const [purchaseFact, setPurchaseFact] = useState(null)
  // Merge ids passés en prop avec les achats effectués dans cette vue
  const effectiveUnlocked = (id) => unlockedIds.has(id) || sessionUnlocked.has(id)
  const unlockedFacts = facts.filter(f => effectiveUnlocked(f.id))
  const lockedFacts = facts.filter(f => !effectiveUnlocked(f.id))
  const rgb = hexToRgb(cat.color)

  const handleBuyFact = () => {
    if (!purchaseFact) return
    const cost = purchaseFact.isVip ? 25 : 5
    if (coins < cost) return
    applyCurrencyDelta?.({ coins: -cost }, `buy_fact_${purchaseFact.isVip ? 'vip' : 'funny'}`)?.catch?.(e =>
      console.warn('[CategoryFactsView] buy fact RPC failed:', e?.message || e)
    )
    unlockFact?.(purchaseFact.id, purchaseFact.category, `buy_fact_${purchaseFact.isVip ? 'vip' : 'funny'}`).catch(e =>
      console.warn('[CategoryFactsView] unlockFact RPC failed:', e?.message || e)
    )
    try {
      const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      const list = wd.unlockedFacts || []
      if (!list.includes(purchaseFact.id)) list.push(purchaseFact.id)
      wd.unlockedFacts = list
      wd.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(wd))
      window.dispatchEvent(new Event('wtf_storage_sync'))
    } catch { /* ignore */ }
    setSessionUnlocked(prev => {
      const next = new Set(prev)
      next.add(purchaseFact.id)
      return next
    })
    audio.play('correct')
    setPurchaseFact(null)
  }

  return (
    <div className="fixed inset-0 flex justify-center" style={{ zIndex: 300, background: '#000' }}>
      <div style={{
        width: '100%', maxWidth: 430, height: '100%',
        display: 'flex', flexDirection: 'column',
        backgroundImage: 'url(/assets/backgrounds/question-default.webp)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        backgroundColor: cat.color, position: 'relative',
      }}>
        {/* Overlay */}
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
                color: 'white', fontSize: S(16), fontWeight: 900, flexShrink: 0, cursor: 'pointer',
              }}
            >←</button>
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
                  {lockedFacts.map(fact => {
                    const cost = fact.isVip ? 25 : 5
                    return (
                      <button
                        key={fact.id}
                        onClick={() => { audio.play('click'); setPurchaseFact(fact) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: S(10), padding: S(10),
                          borderRadius: 12, background: 'rgba(0,0,0,0.2)',
                          border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer',
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
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                          background: 'rgba(255,215,0,0.15)',
                          border: '1px solid rgba(255,215,0,0.35)',
                          borderRadius: 10, padding: '4px 8px',
                          color: '#FFD700', fontWeight: 900, fontSize: 11,
                        }}>
                          {cost}<CoinsIcon size={12} />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal d'achat d'un f*ct verrouillé */}
      {purchaseFact && (() => {
        const cost = purchaseFact.isVip ? 25 : 5
        const canAfford = coins >= cost
        return (
          <div
            onClick={() => setPurchaseFact(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: 'white', borderRadius: 20, padding: 24,
                maxWidth: 320, width: '100%', textAlign: 'center',
                fontFamily: 'Nunito, sans-serif',
              }}
            >
              <div style={{ fontSize: 44, marginBottom: 8 }}>{purchaseFact.isVip ? '⭐' : '🔒'}</div>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1a1a2e', margin: '0 0 8px' }}>
                {purchaseFact.isVip ? 'Débloquer ce f*ct VIP ?' : 'Débloquer ce f*ct ?'}
              </h3>
              <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 16px', lineHeight: 1.4 }}>
                {purchaseFact.isVip
                  ? 'Les f*cts VIP sont les plus rares — 25 coins pour l\'ajouter à ta collection.'
                  : 'Débloque ce f*ct directement pour 5 coins.'}
              </p>
              <div style={{
                background: '#FFF7ED', border: '1px solid #FFEDD5', borderRadius: 12,
                padding: '10px 16px', marginBottom: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#6B7280' }}>Prix</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#FF6B1A', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {cost}<CoinsIcon size={16} />
                </span>
              </div>
              <p style={{ fontSize: 11, color: canAfford ? '#9CA3AF' : '#EF4444', margin: '0 0 16px', fontWeight: canAfford ? 400 : 700 }}>
                {canAfford ? <>Solde restant : {coins - cost} <img src="/assets/ui/icon-coins.png" alt="coins" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} /></> : <>Pas assez de coins ({coins} <img src="/assets/ui/icon-coins.png" alt="coins" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} />)</>}
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { audio.play('click'); setPurchaseFact(null) }}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, fontWeight: 800, fontSize: 14, background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#6B7280', cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleBuyFact}
                  disabled={!canAfford}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 12, fontWeight: 900, fontSize: 14,
                    background: canAfford ? 'linear-gradient(135deg, #FFD700, #FFA500)' : '#E5E7EB',
                    color: canAfford ? '#1a1a2e' : '#9CA3AF',
                    border: 'none', cursor: canAfford ? 'pointer' : 'not-allowed',
                    fontFamily: 'Nunito, sans-serif',
                  }}
                >
                  Débloquer
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
