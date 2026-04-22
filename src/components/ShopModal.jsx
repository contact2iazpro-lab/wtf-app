import { useState } from 'react'
import CoinsIcon from './CoinsIcon'
import EnergyIcon from '../components/icons/EnergyIcon'
import { usePlayerProfile } from '../hooks/usePlayerProfile'
import { getQuickieEnergy, addQuickieEnergy } from '../services/energyService'
import { QUICKIE_ENERGY } from '../constants/gameConfig'
import { audio } from '../utils/audio'

const HINT_PACKS = [
  { quantity: 1, price: 50, label: '1 indice', discount: null },
  { quantity: 3, price: 140, label: '3 indices', discount: '-7%' },
  { quantity: 5, price: 220, label: '5 indices', discount: '-12%' },
]

const ENERGY_PACKS = [
  { quantity: 1, price: 75, label: '1 énergie', discount: null },
  { quantity: 3, price: 200, label: '3 énergies', discount: '-11%' },
  { quantity: 5, price: 320, label: '5 énergies', discount: '-15%' },
]

const S = (px) => `calc(${px}px * var(--scale))`

export default function ShopModal({ onClose, initialTab = 'hints' }) {
  const { coins, hints, applyCurrencyDelta } = usePlayerProfile()
  const [tab, setTab] = useState(initialTab)
  const [toast, setToast] = useState(null)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 1800)
  }

  const buyPack = (type, quantity, price) => {
    if (coins < price) {
      audio.play?.('buzzer')
      audio.vibrate?.([30, 20, 30])
      showToast(`Il te manque ${price - coins} coins`)
      return
    }
    const delta = { coins: -price }
    if (type === 'hint') delta.hints = quantity
    if (type === 'energy') delta.energy = quantity
    applyCurrencyDelta?.(delta, `shop_quick_${type}`)?.catch?.(e =>
      console.warn('[ShopModal] buyPack failed:', e?.message || e)
    )
    if (type === 'energy') addQuickieEnergy(quantity)
    audio.play?.('correct')
    const unit = type === 'hint' ? 'indice' : 'énergie'
    showToast(`+${quantity} ${unit}${quantity > 1 ? 's' : ''} !`)
  }

  const packs = tab === 'hints' ? HINT_PACKS : ENERGY_PACKS
  const packType = tab === 'hints' ? 'hint' : 'energy'
  const energyInfo = getQuickieEnergy()

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        fontFamily: 'Nunito, sans-serif',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 400,
          background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1e 100%)',
          borderRadius: `${S(20)} ${S(20)} 0 0`,
          padding: `${S(16)} ${S(16)} ${S(24)}`,
          animation: 'shopSlideUp 0.25s ease-out',
        }}
      >
        <style>{`
          @keyframes shopSlideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'absolute', top: S(12), left: '50%', transform: 'translateX(-50%)',
            background: toast.startsWith('Il') ? '#EF4444' : '#22C55E',
            color: 'white', borderRadius: S(10), padding: `${S(6)} ${S(14)}`,
            fontWeight: 800, fontSize: S(11), zIndex: 10, whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}>{toast}</div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: S(12) }}>
          <span style={{ fontSize: S(15), fontWeight: 900, color: '#ffffff' }}>Boutique rapide</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: S(6) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: S(3), background: 'rgba(255,107,26,0.15)', borderRadius: S(10), padding: `${S(3)} ${S(8)}` }}>
              <CoinsIcon size={14} />
              <span style={{ fontWeight: 900, fontSize: S(11), color: '#FF6B1A' }}>{coins}</span>
            </div>
            <button
              onClick={onClose}
              style={{
                width: S(28), height: S(28), borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)', border: 'none',
                color: 'white', fontSize: S(14), fontWeight: 900,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: S(6), marginBottom: S(12) }}>
          {[
            { id: 'hints', label: 'Indices', icon: <img src="/assets/ui/icon-hint.png?v=2" alt="" style={{ width: S(14), height: S(14) }} />, stock: hints },
            { id: 'energy', label: 'Énergie', icon: <EnergyIcon size={14} />, stock: `${energyInfo.remaining}/${QUICKIE_ENERGY.FREE_SESSIONS_PER_DAY}` },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => { audio.play('click'); setTab(t.id) }}
              style={{
                flex: 1, padding: `${S(8)} ${S(6)}`, borderRadius: S(10),
                background: tab === t.id ? 'rgba(255,107,26,0.2)' : 'rgba(255,255,255,0.06)',
                border: tab === t.id ? '1.5px solid #FF6B1A' : '1.5px solid rgba(255,255,255,0.1)',
                color: tab === t.id ? '#FF6B1A' : 'rgba(255,255,255,0.6)',
                fontWeight: 900, fontSize: S(11), cursor: 'pointer',
                fontFamily: 'Nunito, sans-serif',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(4),
              }}
            >
              {t.icon}
              <span>{t.label}</span>
              <span style={{
                background: tab === t.id ? 'rgba(255,107,26,0.2)' : 'rgba(255,255,255,0.08)',
                borderRadius: S(6), padding: `${S(1)} ${S(5)}`,
                fontSize: S(9), fontWeight: 800,
              }}>{t.stock}</span>
            </button>
          ))}
        </div>

        {/* Packs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: S(6) }}>
          {packs.map(pack => {
            const canBuy = coins >= pack.price
            return (
              <button
                key={pack.quantity}
                onClick={() => buyPack(packType, pack.quantity, pack.price)}
                style={{
                  display: 'flex', alignItems: 'center', gap: S(10),
                  padding: `${S(10)} ${S(12)}`, borderRadius: S(12),
                  background: canBuy ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                  border: canBuy ? '1px solid rgba(255,255,255,0.15)' : '1px dashed rgba(255,255,255,0.08)',
                  cursor: canBuy ? 'pointer' : 'default',
                  opacity: canBuy ? 1 : 0.5,
                  fontFamily: 'Nunito, sans-serif',
                  WebkitTapHighlightColor: 'transparent',
                  width: '100%',
                }}
              >
                <span style={{ fontSize: S(18), flexShrink: 0 }}>
                  {tab === 'hints'
                    ? <img src="/assets/ui/icon-hint.png?v=2" alt="" style={{ width: S(18), height: S(18) }} />
                    : <EnergyIcon size={18} />
                  }
                </span>
                <span style={{ flex: 1, textAlign: 'left', fontWeight: 800, fontSize: S(12), color: '#ffffff' }}>
                  {pack.label}
                </span>
                {pack.discount && (
                  <span style={{
                    background: 'rgba(34,197,94,0.15)', color: '#16a34a',
                    borderRadius: S(6), padding: `${S(1)} ${S(5)}`,
                    fontSize: S(9), fontWeight: 900,
                  }}>{pack.discount}</span>
                )}
                <span style={{
                  display: 'flex', alignItems: 'center', gap: S(3),
                  fontWeight: 900, fontSize: S(12), color: '#FF6B1A',
                }}>
                  {pack.price} <CoinsIcon size={13} />
                </span>
              </button>
            )
          })}
        </div>

        {/* Footer hint */}
        <div style={{ marginTop: S(10), textAlign: 'center' }}>
          <span style={{ fontSize: S(9), color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
            ⏱ Le timer continue — fais vite !
          </span>
        </div>
      </div>
    </div>
  )
}
