import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CoinsIcon from '../components/CoinsIcon'

const COIN_PACKS = [
  { label: '50 Coins', price: '0,99 €', emoji: '🪙' },
  { label: '200 Coins', price: '2,99 €', emoji: '💰' },
  { label: '500 Coins', price: '5,99 €', emoji: '🏆' },
]

const TICKET_PACKS = [
  { label: '3 Tickets', price: '20 coins', emoji: '🎟️' },
  { label: '10 Tickets', price: '60 coins', emoji: '🎫' },
]

export default function BoutiquePage() {
  const navigate = useNavigate()

  const [playerCoins, setPlayerCoins] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wtf_data') || '{}').wtfCoins || 0 } catch { return 0 }
  })
  const [playerHints, setPlayerHints] = useState(() => {
    return parseInt(localStorage.getItem('wtf_hints_available') || '0', 10)
  })
  const [toast, setToast] = useState(null)

  const buyHint = () => {
    if (playerCoins < 5) return
    // Décrémenter coins
    const data = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    data.wtfCoins = (data.wtfCoins || 0) - 5
    data.lastModified = Date.now()
    localStorage.setItem('wtf_data', JSON.stringify(data))
    // Incrémenter hints
    const newHints = parseInt(localStorage.getItem('wtf_hints_available') || '0', 10) + 1
    localStorage.setItem('wtf_hints_available', String(newHints))
    // Update state
    setPlayerCoins(data.wtfCoins)
    setPlayerHints(newHints)
    // Refresh App state
    window.dispatchEvent(new Event('wtf_storage_sync'))
    // Toast
    setToast('✅ +1 indice !')
    setTimeout(() => setToast(null), 2000)
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: '#FAFAF8', paddingBottom: 72, fontFamily: 'Nunito, sans-serif' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
          background: '#22C55E', color: 'white', borderRadius: 12, padding: '10px 20px',
          fontWeight: 800, fontSize: 14, boxShadow: '0 4px 20px rgba(34,197,94,0.4)',
        }}>{toast}</div>
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
            <span className="font-black text-sm" style={{ color: '#FF6B1A' }}>{playerCoins}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-24">

        {/* ── Section Indices — FONCTIONNELLE ── */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(255,107,26,0.06)', border: '1px solid rgba(255,107,26,0.2)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: 20 }}>💡</span>
            <h2 className="font-black text-sm" style={{ color: '#1a1a2e', margin: 0 }}>Indices</h2>
          </div>
          <p className="text-xs mb-3" style={{ color: '#6B7280' }}>Aide-toi pendant les questions difficiles</p>

          {/* Stock actuel */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1.5">
              <span style={{ fontSize: 14 }}>💡</span>
              <span className="font-bold text-sm" style={{ color: '#1a1a2e' }}>{playerHints} indices</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CoinsIcon size={14} />
              <span className="font-bold text-sm" style={{ color: '#FF6B1A' }}>{playerCoins} coins</span>
            </div>
          </div>

          {/* Bouton achat */}
          <button
            onClick={buyHint}
            disabled={playerCoins < 5}
            className="w-full py-3 rounded-xl font-black text-sm active:scale-95 transition-all flex items-center justify-center gap-2"
            style={{
              background: playerCoins >= 5 ? '#FF6B1A' : '#E5E7EB',
              color: playerCoins >= 5 ? 'white' : '#9CA3AF',
              border: 'none',
              cursor: playerCoins >= 5 ? 'pointer' : 'not-allowed',
              opacity: playerCoins >= 5 ? 1 : 0.5,
            }}
          >
            <span>💡 1 indice</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              — 5 <CoinsIcon size={14} />
            </span>
          </button>
          {playerCoins < 5 && (
            <p className="text-xs text-center mt-2" style={{ color: '#EF4444', fontWeight: 700 }}>Pas assez de coins</p>
          )}
        </div>

        {/* Bandeau bientôt disponible */}
        <div className="rounded-2xl p-4 mb-4 text-center" style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF3385 100%)' }}>
          <span className="text-2xl block mb-1">🚧</span>
          <span className="font-black text-base text-white block">Bientôt disponible</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>Plus d'achats arrivent prochainement !</span>
        </div>

        {/* Packs de Coins */}
        <h2 className="font-black text-sm mb-2" style={{ color: '#1a1a2e' }}>Packs de Coins</h2>
        <div className="flex flex-col gap-2 mb-4">
          {COIN_PACKS.map(pack => (
            <div key={pack.label} className="flex items-center gap-3 rounded-2xl p-3" style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', opacity: 0.5 }}>
              <span className="text-2xl">{pack.emoji}</span>
              <div className="flex-1">
                <span className="font-black text-sm block" style={{ color: '#1a1a2e' }}>{pack.label}</span>
                <span className="text-xs" style={{ color: '#9CA3AF' }}>{pack.price}</span>
              </div>
              <span className="text-lg" style={{ color: '#D1D5DB' }}>🔒</span>
            </div>
          ))}
        </div>

        {/* Tickets */}
        <h2 className="font-black text-sm mb-2" style={{ color: '#1a1a2e' }}>Tickets de Quest</h2>
        <div className="flex flex-col gap-2 mb-4">
          {TICKET_PACKS.map(pack => (
            <div key={pack.label} className="flex items-center gap-3 rounded-2xl p-3" style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', opacity: 0.5 }}>
              <span className="text-2xl">{pack.emoji}</span>
              <div className="flex-1">
                <span className="font-black text-sm block" style={{ color: '#1a1a2e' }}>{pack.label}</span>
                <span className="text-xs" style={{ color: '#9CA3AF' }}>{pack.price}</span>
              </div>
              <span className="text-lg" style={{ color: '#D1D5DB' }}>🔒</span>
            </div>
          ))}
        </div>

        {/* Abonnement */}
        <h2 className="font-black text-sm mb-2" style={{ color: '#1a1a2e' }}>Abonnement Premium</h2>
        <div className="rounded-2xl p-4 text-center" style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', opacity: 0.5 }}>
          <span className="text-3xl block mb-2">👑</span>
          <span className="font-black text-sm block" style={{ color: '#1a1a2e' }}>WTF! Premium</span>
          <span className="text-xs block mb-2" style={{ color: '#9CA3AF' }}>Coins illimités, indices gratuits, pas de pub</span>
          <span className="text-lg" style={{ color: '#D1D5DB' }}>🔒</span>
        </div>
      </div>
    </div>
  )
}
