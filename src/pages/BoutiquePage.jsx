import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CoinsIcon from '../components/CoinsIcon'
import { updateCoins, updateHints, updateTickets, getBalances } from '../services/currencyService'

const S = (px) => `calc(${px}px * var(--scale))`

const HINT_PACKS = [
  { quantity: 1, price: 5,  label: '1 indice',   discount: null },
  { quantity: 3, price: 12, label: '3 indices',   discount: '-20%' },
  { quantity: 5, price: 18, label: '5 indices',   discount: '-28%' },
]

const TICKET_PACKS = [
  { quantity: 1, price: 25, label: '1 ticket',    discount: null },
  { quantity: 3, price: 65, label: '3 tickets',   discount: '-13%' },
  { quantity: 5, price: 100, label: '5 tickets',   discount: '-20%' },
]

function PackButton({ emoji, label, price, discount, canBuy, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={!canBuy}
      className="w-full flex items-center gap-3 rounded-xl active:scale-95 transition-all"
      style={{
        padding: '12px 16px',
        background: canBuy ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
        border: '1px solid rgba(0,0,0,0.08)',
        cursor: canBuy ? 'pointer' : 'not-allowed',
        opacity: canBuy ? 1 : 0.4,
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

  const [balances, setBalances] = useState(() => getBalances())
  const [toast, setToast] = useState(null)
  const [confirmPurchase, setConfirmPurchase] = useState(null)

  useEffect(() => {
    const refresh = () => setBalances(getBalances())
    window.addEventListener('wtf_currency_updated', refresh)
    window.addEventListener('wtf_storage_sync', refresh)
    return () => {
      window.removeEventListener('wtf_currency_updated', refresh)
      window.removeEventListener('wtf_storage_sync', refresh)
    }
  }, [])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  const buyPack = (type, quantity, price) => {
    if (balances.coins < price) return
    updateCoins(-price)
    if (type === 'hint') updateHints(quantity)
    else updateTickets(quantity)
    setBalances(getBalances())
    const unit = type === 'hint' ? 'indice' : 'ticket'
    showToast(`+${quantity} ${unit}${quantity > 1 ? 's' : ''} !`)
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
      {confirmPurchase && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setConfirmPurchase(null)}
        >
          <div
            style={{ background: 'white', borderRadius: 20, padding: 24, maxWidth: 300, width: '100%', textAlign: 'center', fontFamily: 'Nunito, sans-serif' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1a1a2e', margin: '0 0 12px' }}>Confirmer l'achat ?</h3>
            <p style={{ fontSize: 14, color: '#555', margin: '0 0 6px' }}>
              {confirmPurchase.label} pour {confirmPurchase.price} <CoinsIcon size={14} />
            </p>
            <p style={{ fontSize: 12, color: '#888', margin: '0 0 20px' }}>
              Solde restant : {balances.coins - confirmPurchase.price} <CoinsIcon size={12} />
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirmPurchase(null)}
                style={{ flex: 1, padding: '12px 0', borderRadius: 12, fontWeight: 800, fontSize: 14, background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#6B7280', cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  buyPack(confirmPurchase.type, confirmPurchase.quantity, confirmPurchase.price)
                  setConfirmPurchase(null)
                }}
                style={{ flex: 1, padding: '12px 0', borderRadius: 12, fontWeight: 800, fontSize: 14, background: '#FF6B1A', border: 'none', color: 'white', cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}
              >
                Acheter
              </button>
            </div>
          </div>
        </div>
      )}

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

      <div className="flex-1 overflow-y-auto scrollbar-hide px-4">

        {/* Section Indices */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(255,107,26,0.06)', border: '1px solid rgba(255,107,26,0.2)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: 20 }}>💡</span>
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
                emoji="💡"
                label={pack.label}
                price={pack.price}
                discount={pack.discount}
                canBuy={balances.coins >= pack.price}
                onClick={() => setConfirmPurchase({ type: 'hint', quantity: pack.quantity, price: pack.price, label: pack.label })}
              />
            ))}
          </div>
        </div>

        {/* Section Tickets */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: 20 }}>🎟️</span>
            <h2 className="font-black text-sm" style={{ color: '#1a1a2e', margin: 0 }}>Tickets de Quest</h2>
            <span className="ml-auto px-2 py-0.5 rounded-lg text-xs font-bold" style={{ background: 'rgba(139,92,246,0.1)', color: '#7C3AED' }}>
              Stock : {balances.tickets}
            </span>
          </div>
          <p className="text-xs mb-3" style={{ color: '#6B7280' }}>Lance des parties Quest pour débloquer des WTF! rares</p>
          <div className="flex flex-col gap-2">
            {TICKET_PACKS.map(pack => (
              <PackButton
                key={pack.quantity}
                emoji="🎟️"
                label={pack.label}
                price={pack.price}
                discount={pack.discount}
                canBuy={balances.coins >= pack.price}
                onClick={() => setConfirmPurchase({ type: 'ticket', quantity: pack.quantity, price: pack.price, label: pack.label })}
              />
            ))}
          </div>
        </div>

        {/* Packs de Coins (bientôt) */}
        <h2 className="font-black text-sm mb-2" style={{ color: '#1a1a2e' }}>Packs de Coins</h2>
        <div className="flex flex-col gap-2 mb-4">
          {[
            { label: '50 Coins', price: '0,99 €', emoji: '🪙' },
            { label: '200 Coins', price: '2,99 €', emoji: '💰' },
            { label: '500 Coins', price: '5,99 €', emoji: '🏆' },
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
        <div className="rounded-2xl p-4 text-center mb-4" style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', opacity: 0.5 }}>
          <span className="text-3xl block mb-2">👑</span>
          <span className="font-black text-sm block" style={{ color: '#1a1a2e' }}>WTF! Premium</span>
          <span className="text-xs block mb-2" style={{ color: '#9CA3AF' }}>Coins illimités, indices gratuits, pas de pub</span>
          <span className="text-lg" style={{ color: '#D1D5DB' }}>Bientôt</span>
        </div>
      </div>
    </div>
  )
}
