import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CoinsIcon from '../components/CoinsIcon'
import { usePlayerProfile } from '../hooks/usePlayerProfile'
import { readWtfData } from '../utils/storageHelper'
import { getQuickieEnergy, addQuickieEnergy } from '../services/energyService'
import { QUICKIE_ENERGY } from '../constants/gameConfig'
import { useScale } from '../hooks/useScale'
import RouletteModal from '../components/RouletteModal'
import { AVATAR_FRAMES, readFrameState, addOwnedFrame } from '../data/avatarFrames'
import { audio } from '../utils/audio'

const S = (px) => `calc(${px}px * var(--scale))`

const HINT_PACKS = [
  { quantity: 1, price: 50, label: '1 indice',   discount: null },
  { quantity: 3, price: 140, label: '3 indices',   discount: '-7%' },
  { quantity: 5, price: 220, label: '5 indices',   discount: '-12%' },
]

const ENERGY_PACKS = [
  { quantity: 1, price: 75, label: '1 énergie',   discount: null },
  { quantity: 3, price: 200, label: '3 énergies',  discount: '-11%' },
  { quantity: 5, price: 320, label: '5 énergies',  discount: '-15%' },
]

function PackButton({ emoji, label, price, discount, canBuy, onClick, onCannotBuy }) {
  return (
    <button
      onClick={canBuy ? onClick : onCannotBuy}
      className="w-full flex items-center gap-3 rounded-xl active:scale-95 transition-all"
      style={{
        padding: '12px 16px',
        background: canBuy ? 'white' : 'rgba(255,255,255,0.7)',
        border: canBuy ? '1px solid rgba(0,0,0,0.08)' : '1px dashed rgba(0,0,0,0.2)',
        cursor: 'pointer',
        opacity: canBuy ? 1 : 0.6,
      }}
    >
      <span style={{ fontSize: 22, flexShrink: 0 }}>{emoji}</span>
      <span className="flex-1 text-left font-bold text-sm" style={{ color: '#1a1a2e' }}>{label}</span>
      <div className="flex items-center gap-2 shrink-0">
        {discount && (
          <span className="px-1.5 py-0.5 rounded-lg text-[10px] font-black" style={{ background: 'rgba(34,197,94,0.15)', color: '#16a34a' }}>
            {discount}
          </span>
        )}
        <span className="flex items-center gap-1 font-black text-sm" style={{ color: '#FF6B1A' }}>
          {price} <CoinsIcon size={14} />
        </span>
      </div>
    </button>
  )
}

export default function BoutiquePage() {
  const navigate = useNavigate()

  const { coins, hints, applyCurrencyDelta, mergeFlags } = usePlayerProfile()
  const [toast, setToast] = useState(null)
  const [confirmPurchase, setConfirmPurchase] = useState(null)
  const [streakFreezeCount, setStreakFreezeCount] = useState(() => readWtfData().streakFreezeCount || 0)
  const [purchaseQty, setPurchaseQty] = useState(1)
  const [showRoulette, setShowRoulette] = useState(false)
  const scale = useScale()

  // Backward compat : les endroits qui lisent balances.coins
  const balances = { coins, hints }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  const notEnoughCoins = (price) => {
    // Buzzer neutre (pas le son "wrong" réservé aux mauvaises réponses en jeu)
    audio.play?.('buzzer')
    audio.vibrate?.([30, 20, 30])
    const missing = price - coins
    showToast(`Pas assez de coins — il te manque ${missing} 🪙`)
  }

  // Onglets de la boutique : Packs | Essentiels | Abonnement
  const [activeTab, setActiveTab] = useState('packs')
  // Cadres profil possédés (refresh via wtf_storage_sync)
  const [frameState, setFrameState] = useState(() => readFrameState())
  useEffect(() => {
    const refresh = () => setFrameState(readFrameState())
    window.addEventListener('wtf_storage_sync', refresh)
    return () => window.removeEventListener('wtf_storage_sync', refresh)
  }, [])

  const buyPack = (type, quantity, price) => {
    if (coins < price) return
    const rpcDelta = { coins: -price }
    if (type === 'hint')    rpcDelta.hints   = quantity
    if (type === 'energy')  rpcDelta.energy  = quantity
    applyCurrencyDelta?.(rpcDelta, `shop_buy_${type}`)?.catch?.(e =>
      console.warn('[BoutiquePage] buyPack RPC failed:', e?.message || e)
    )
    if (type === 'energy') {
      // Nouveau modèle T91 : stock persistant via addQuickieEnergy
      addQuickieEnergy(quantity)
    } else if (type === 'streakFreeze') {
      const wd = readWtfData()
      wd.streakFreezeCount = (wd.streakFreezeCount || 0) + 1
      wd.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(wd))
      setStreakFreezeCount(wd.streakFreezeCount)
      // A.9 — miroir Supabase
      mergeFlags?.({ streakFreezeCount: wd.streakFreezeCount }).catch(e =>
        console.warn('[BoutiquePage] streakFreeze mergeFlags failed:', e?.message || e)
      )
    }
    const labels = { hint: 'indice', energy: 'énergie', streakFreeze: 'Streak Freeze' }
    const unit = labels[type] || type
    showToast(`+${quantity} ${unit}${quantity > 1 && type !== 'streakFreeze' ? 's' : ''} !`)
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: '#FAFAF8', paddingBottom: S(80), fontFamily: 'Nunito, sans-serif' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
          background: '#22C55E', color: 'white', borderRadius: 12, padding: '10px 20px',
          fontWeight: 800, fontSize: 14, boxShadow: '0 4px 20px rgba(34,197,94,0.4)',
        }}>{toast}</div>
      )}

      {/* Modale confirmation achat */}
      {confirmPurchase && (() => {
        const isFreeze = confirmPurchase.type === 'streakFreeze'
        const canMultiply = !isFreeze
        const qty = canMultiply ? purchaseQty : 1
        const totalPrice = confirmPurchase.price * qty
        const totalQty = confirmPurchase.quantity * qty
        const canAfford = coins >= totalPrice
        const maxQty = Math.max(1, Math.floor(coins / confirmPurchase.price))

        return (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={() => { setConfirmPurchase(null); setPurchaseQty(1) }}
          >
            <div
              style={{ background: 'white', borderRadius: 20, padding: 24, maxWidth: 320, width: '100%', textAlign: 'center', fontFamily: 'Nunito, sans-serif' }}
              onClick={e => e.stopPropagation()}
            >
              <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1a1a2e', margin: '0 0 12px' }}>Confirmer l'achat ?</h3>

              {/* Sélecteur de quantité */}
              {canMultiply && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
                  <button
                    onClick={() => setPurchaseQty(q => Math.max(1, q - 1))}
                    style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: qty <= 1 ? '#F3F4F6' : '#FF6B1A', border: 'none',
                      color: qty <= 1 ? '#D1D5DB' : 'white', fontSize: 20, fontWeight: 900,
                      cursor: qty <= 1 ? 'default' : 'pointer', fontFamily: 'Nunito, sans-serif',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    disabled={qty <= 1}
                  >−</button>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#1a1a2e', lineHeight: 1 }}>{qty}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700 }}>
                      {totalQty} {confirmPurchase.type === 'hint' ? 'indices' : 'énergies'}
                    </div>
                  </div>
                  <button
                    onClick={() => setPurchaseQty(q => Math.min(maxQty, q + 1))}
                    style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: qty >= maxQty ? '#F3F4F6' : '#FF6B1A', border: 'none',
                      color: qty >= maxQty ? '#D1D5DB' : 'white', fontSize: 20, fontWeight: 900,
                      cursor: qty >= maxQty ? 'default' : 'pointer', fontFamily: 'Nunito, sans-serif',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    disabled={qty >= maxQty}
                  >+</button>
                </div>
              )}

              {!canMultiply && (
                <p style={{ fontSize: 14, color: '#555', margin: '0 0 6px' }}>
                  {confirmPurchase.label}
                </p>
              )}

              <div style={{
                background: '#FFF7ED', border: '1px solid #FFEDD5', borderRadius: 12,
                padding: '10px 16px', marginBottom: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#6B7280' }}>Total</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#FF6B1A', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {totalPrice} <CoinsIcon size={16} />
                </span>
              </div>

              <p style={{ fontSize: 12, color: canAfford ? '#888' : '#EF4444', margin: '0 0 16px', fontWeight: canAfford ? 400 : 700 }}>
                {canAfford
                  ? <>Solde restant : {coins - totalPrice} <CoinsIcon size={11} /></>
                  : 'Pas assez de coins !'}
              </p>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { setConfirmPurchase(null); setPurchaseQty(1) }}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, fontWeight: 800, fontSize: 14, background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#6B7280', cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    if (!canAfford) return
                    buyPack(confirmPurchase.type, totalQty, totalPrice)
                    setConfirmPurchase(null)
                    setPurchaseQty(1)
                  }}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 12, fontWeight: 800, fontSize: 14,
                    background: canAfford ? '#FF6B1A' : '#E5E7EB', border: 'none',
                    color: canAfford ? 'white' : '#9CA3AF',
                    cursor: canAfford ? 'pointer' : 'default', fontFamily: 'Nunito, sans-serif',
                  }}
                >
                  Acheter
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Header */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151' }}
          >←</button>
          <h1 className="flex-1 text-lg font-black" style={{ color: '#1a1a2e' }}>Boutique</h1>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: '#FFF7ED', border: '1px solid #FFEDD5' }}>
            <CoinsIcon size={16} />
            <span className="font-black text-sm" style={{ color: '#FF6B1A' }}>{balances.coins}</span>
          </div>
        </div>
      </div>

      {/* Barre d'onglets */}
      <div className="px-4 pt-2 pb-3 shrink-0" style={{ display: 'flex', gap: 6 }}>
        {[
          { id: 'packs', label: 'Packs', emoji: '🎁' },
          { id: 'essentials', label: 'Essentiels', emoji: <img src="/assets/ui/icon-hint.png?v=2" alt="indices" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} /> },
          { id: 'subscription', label: 'Abonnement', emoji: '👑' },
        ].map(t => {
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => { audio.play('click'); setActiveTab(t.id) }}
              className="active:scale-95 transition-all"
              style={{
                flex: 1, padding: '10px 6px', borderRadius: 12,
                background: isActive
                  ? 'linear-gradient(135deg, #FF6B1A, #D94A10)'
                  : 'white',
                border: isActive
                  ? '1.5px solid #FF6B1A'
                  : '1.5px solid #D1D5DB',
                color: isActive ? 'white' : '#1a1a2e',
                fontWeight: 900, fontSize: 11,
                cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                WebkitTapHighlightColor: 'transparent',
                boxShadow: isActive
                  ? '0 4px 14px rgba(255,107,26,0.35)'
                  : '0 1px 3px rgba(0,0,0,0.06)',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: 18 }}>{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-4">

        {/* Roulette quotidienne (toujours visible) */}
        <button
          onClick={() => setShowRoulette(true)}
          className="w-full rounded-2xl p-4 mb-4 flex items-center gap-3 active:scale-95 transition-all"
          style={{
            background: 'linear-gradient(135deg, rgba(255,107,26,0.1), rgba(249,115,22,0.15))',
            border: '1.5px solid rgba(255,107,26,0.3)',
            cursor: 'pointer', textAlign: 'left',
          }}
        >
          <img src="/assets/ui/emoji-roulette.png?v=2" alt="roulette" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline', fontSize: 28 }} />
          <div className="flex-1">
            <span className="font-black text-sm block" style={{ color: '#1a1a2e' }}>Roulette du jour</span>
            <span className="text-xs" style={{ color: '#6B7280' }}>Tente ta chance pour des récompenses !</span>
          </div>
          {(() => {
            const wd = readWtfData()
            const isFree = !wd.rouletteFreeDate || wd.rouletteFreeDate !== new Date().toISOString().slice(0, 10)
            return isFree ? (
              <span className="px-2 py-1 rounded-lg text-xs font-black" style={{ background: 'rgba(255,107,26,0.15)', color: '#FF6B1A' }}>
                GRATUIT
              </span>
            ) : (
              <span className="text-xs font-bold" style={{ color: '#9CA3AF' }}>100 <CoinsIcon size={10} /></span>
            )
          })()}
        </button>

        {activeTab === 'essentials' && (
        <>
        {/* Section Indices */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(255,107,26,0.06)', border: '1px solid rgba(255,107,26,0.2)' }}>
          <div className="flex items-center gap-2 mb-1">
            <img src="/assets/ui/icon-hint.png?v=2" alt="indice" style={{ width: 20, height: 20, verticalAlign: 'middle', display: 'inline' }} />
            <h2 className="font-black text-sm" style={{ color: '#1a1a2e', margin: 0 }}>Indices</h2>
            <span className="ml-auto px-2 py-0.5 rounded-lg text-xs font-bold" style={{ background: 'rgba(255,107,26,0.1)', color: '#FF6B1A' }}>
              Stock : {balances.hints}
            </span>
          </div>
          <p className="text-xs mb-3" style={{ color: '#6B7280' }}>Aide-toi pendant les questions difficiles</p>
          <div className="flex flex-col gap-2">
            {HINT_PACKS.map(pack => (
              <PackButton
                key={pack.quantity}
                emoji={<img src="/assets/ui/icon-hint.png?v=2" alt="indice" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} />}
                label={pack.label}
                price={pack.price}
                discount={pack.discount}
                canBuy={balances.coins >= pack.price}
                onClick={() => setConfirmPurchase({ type: 'hint', quantity: pack.quantity, price: pack.price, label: pack.label })}
                onCannotBuy={() => notEnoughCoins(pack.price)}
              />
            ))}
          </div>
        </div>

        {/* Section Énergie */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <div className="flex items-center gap-2 mb-1">
            <img src="/assets/ui/emoji-energy.png" alt="energy" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline', fontSize: 20 }} />
            <h2 className="font-black text-sm" style={{ color: '#1a1a2e', margin: 0 }}>Énergie</h2>
            <span className="ml-auto px-2 py-0.5 rounded-lg text-xs font-bold" style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a' }}>
              {getQuickieEnergy().remaining} / {QUICKIE_ENERGY.FREE_SESSIONS_PER_DAY}
            </span>
          </div>
          <p className="text-xs mb-3" style={{ color: '#6B7280' }}>Quickie et Quest consomment de l'énergie</p>
          <div className="flex flex-col gap-2">
            {ENERGY_PACKS.map(pack => (
              <PackButton
                key={pack.quantity}
                emoji={<img src="/assets/ui/emoji-energy.png" alt="energy" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} />}
                label={pack.label}
                price={pack.price}
                discount={pack.discount}
                canBuy={coins >= pack.price}
                onClick={() => setConfirmPurchase({ type: 'energy', quantity: pack.quantity, price: pack.price, label: pack.label })}
                onCannotBuy={() => notEnoughCoins(pack.price)}
              />
            ))}
          </div>
        </div>
        </>
        )}

        {activeTab === 'packs' && (
        <>
        {/* Section Offres de bienvenue (Starter packs €) */}
        {(() => {
          const wd = readWtfData()
          const firstSeen = wd.firstSeenDate || Date.now()
          const daysSinceInstall = (Date.now() - firstSeen) / 86400000
          const inWelcomeWindow = daysSinceInstall <= 7
          const lightBought = !!wd.starterLightBought
          const proBought = !!wd.starterProBought
          const shouldShow = inWelcomeWindow && (!lightBought || !proBought)
          if (!shouldShow) return null
          const daysLeft = Math.max(0, Math.ceil(7 - daysSinceInstall))
          return (
            <div className="rounded-2xl p-4 mb-4" style={{
              background: 'linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,107,26,0.12))',
              border: '1.5px solid rgba(255,165,0,0.5)',
              boxShadow: '0 2px 16px rgba(255,165,0,0.15)',
            }}>
              <div className="flex items-center gap-2 mb-1">
                <span style={{ fontSize: 20 }}>🎁</span>
                <h2 className="font-black text-sm" style={{ color: '#1a1a2e', margin: 0 }}>Offres de bienvenue</h2>
                <span className="ml-auto px-2 py-0.5 rounded-lg text-xs font-black" style={{ background: '#FF6B1A', color: 'white' }}>
                  {daysLeft}j restant{daysLeft > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs mb-3" style={{ color: '#6B7280' }}>Achetable une seule fois pendant 7 jours après installation</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Starter Light */}
                {!lightBought && (
                  <div style={{
                    background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14,
                    padding: 12, display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12,
                      background: 'linear-gradient(135deg, #CD7F32, #a06020)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24, flexShrink: 0,
                    }}>📦</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span className="font-black text-sm block" style={{ color: '#1a1a2e' }}>Starter Light</span>
                      <span className="text-xs block" style={{ color: '#6B7280' }}>5 indices · cadre Bronze</span>
                    </div>
                    <button
                      disabled
                      style={{
                        background: '#F3F4F6', border: '1px solid #E5E7EB',
                        borderRadius: 10, padding: '8px 14px',
                        fontWeight: 900, fontSize: 12, color: '#9CA3AF',
                        fontFamily: 'Nunito, sans-serif', cursor: 'not-allowed',
                        flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                      }}
                    >
                      <span>1,99 €</span>
                      <span style={{ fontSize: 8, fontWeight: 700 }}>Bientôt</span>
                    </button>
                  </div>
                )}
                {/* Starter Pro */}
                {!proBought && (
                  <div style={{
                    background: 'white', border: '1.5px solid rgba(255,215,0,0.5)', borderRadius: 14,
                    padding: 12, display: 'flex', alignItems: 'center', gap: 12,
                    position: 'relative',
                  }}>
                    <span style={{
                      position: 'absolute', top: -8, right: 10,
                      background: '#FF6B1A', color: 'white',
                      fontSize: 9, fontWeight: 900, padding: '2px 8px',
                      borderRadius: 8, textTransform: 'uppercase', letterSpacing: '0.03em',
                    }}>Meilleure offre</span>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12,
                      background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24, flexShrink: 0,
                      boxShadow: '0 0 14px rgba(255,215,0,0.6)',
                    }}>👑</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span className="font-black text-sm block" style={{ color: '#1a1a2e' }}>Starter Pro</span>
                      <span className="text-xs block" style={{ color: '#6B7280' }}>1 500 coins · 5 indices · cadre exclusif</span>
                    </div>
                    <button
                      disabled
                      style={{
                        background: '#F3F4F6', border: '1px solid #E5E7EB',
                        borderRadius: 10, padding: '8px 14px',
                        fontWeight: 900, fontSize: 12, color: '#9CA3AF',
                        fontFamily: 'Nunito, sans-serif', cursor: 'not-allowed',
                        flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                      }}
                    >
                      <span>4,99 €</span>
                      <span style={{ fontSize: 8, fontWeight: 700 }}>Bientôt</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* Section Streak Freeze */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: 20 }}>🛡️</span>
            <h2 className="font-black text-sm" style={{ color: '#1a1a2e', margin: 0 }}>Streak Freeze</h2>
            <span className="ml-auto px-2 py-0.5 rounded-lg text-xs font-bold" style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}>
              Stock : {streakFreezeCount}
            </span>
          </div>
          <p className="text-xs mb-3" style={{ color: '#6B7280' }}>Protège ta série si tu manques un jour</p>
          <PackButton
            emoji="🛡️"
            label="1 Streak Freeze"
            price={150}
            discount={null}
            canBuy={coins >= 150}
            onClick={() => setConfirmPurchase({ type: 'streakFreeze', quantity: 1, price: 150, label: '1 Streak Freeze' })}
            onCannotBuy={() => notEnoughCoins(150)}
          />
        </div>

        {/* Section Cadres de profil */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.25)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: 20 }}>✨</span>
            <h2 className="font-black text-sm" style={{ color: '#1a1a2e', margin: 0 }}>Cadres de profil</h2>
          </div>
          <p className="text-xs mb-3" style={{ color: '#6B7280' }}>Personnalise ta photo de profil avec un cadre unique</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {AVATAR_FRAMES.filter(f => f.cost > 0).map(frame => {
              const isOwned = frameState.owned.includes(frame.id)
              const canBuy = !isOwned && coins >= frame.cost
              return (
                <button
                  key={frame.id}
                  onClick={() => {
                    if (!canBuy) return
                    applyCurrencyDelta?.({ coins: -frame.cost }, `shop_buy_frame_${frame.id}`)?.catch?.(e =>
                      console.warn('[BoutiquePage] frame RPC failed:', e?.message || e)
                    )
                    addOwnedFrame(frame.id)
                    setToast(`✨ Cadre ${frame.label} débloqué !`)
                    setTimeout(() => setToast(null), 2000)
                  }}
                  disabled={!canBuy}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: 10, borderRadius: 12,
                    background: isOwned ? 'rgba(34,197,94,0.1)' : canBuy ? 'white' : '#F3F4F6',
                    border: isOwned ? '1.5px solid #22C55E' : '1px solid #E5E7EB',
                    cursor: canBuy ? 'pointer' : 'default',
                    opacity: canBuy || isOwned ? 1 : 0.55,
                    fontFamily: 'Nunito, sans-serif', textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: '#D1D5DB', flexShrink: 0,
                    border: frame.border, boxShadow: frame.glow,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 900, color: '#1a1a2e', display: 'block' }}>{frame.label}</span>
                    {isOwned ? (
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#22C55E' }}>✓ Débloqué</span>
                    ) : (
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#FF6B1A', display: 'flex', alignItems: 'center', gap: 3 }}>
                        {frame.cost} <CoinsIcon size={10} />
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
        </>
        )}

        {activeTab === 'subscription' && (
        <>
        {/* Packs de Coins (bientôt) */}
        <h2 className="font-black text-sm mb-2" style={{ color: '#1a1a2e' }}>Packs de Coins</h2>
        <div className="flex flex-col gap-2 mb-4">
          {[
            { label: '500 Coins', price: '0,99 €', emoji: <img src="/assets/ui/icon-coins.png" alt="coins" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} /> },
            { label: '2 000 Coins', price: '2,99 €', emoji: <img src="/assets/ui/icon-coins.png" alt="coins" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} /> },
            { label: '5 000 Coins', price: '5,99 €', emoji: '🏆' },
          ].map(pack => (
            <div key={pack.label} className="flex items-center gap-3 rounded-2xl p-3" style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', opacity: 0.5 }}>
              <span className="text-2xl">{pack.emoji}</span>
              <div className="flex-1">
                <span className="font-black text-sm block" style={{ color: '#1a1a2e' }}>{pack.label}</span>
                <span className="text-xs" style={{ color: '#9CA3AF' }}>{pack.price}</span>
              </div>
              <span className="text-lg" style={{ color: '#D1D5DB' }}>Bientôt</span>
            </div>
          ))}
        </div>

        {/* Abonnement */}
        <h2 className="font-black text-sm mb-2" style={{ color: '#1a1a2e' }}>Abonnement Premium</h2>
        <div className="rounded-2xl p-4 text-center mb-4" style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,165,0,0.18))', border: '1.5px solid rgba(255,165,0,0.4)' }}>
          <span className="text-3xl block mb-2">👑</span>
          <span className="font-black text-base block" style={{ color: '#1a1a2e' }}>WTF! Premium</span>
          <span className="text-xs block mb-2" style={{ color: '#6B7280' }}>Énergie illimitée · 3 indices/jour · badge VIP</span>
          <span className="text-sm font-black block" style={{ color: '#FF6B1A' }}>4,99 €/mois</span>
          <span className="inline-block mt-3 px-4 py-1 rounded-lg text-xs font-bold" style={{ background: 'rgba(0,0,0,0.06)', color: '#9CA3AF' }}>Bientôt</span>
        </div>
        </>
        )}
      </div>

      {/* Modal Roulette */}
      {showRoulette && (
        <RouletteModal onClose={() => setShowRoulette(false)} scale={scale} />
      )}
    </div>
  )
}
