import { useMemo } from 'react'
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

  const coins = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('wtf_data') || '{}').coins || 0 } catch { return 0 }
  }, [])

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: '#FAFAF8' }}>
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
            <span className="font-black text-sm" style={{ color: '#FF6B1A' }}>{coins}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-24">
        {/* Bandeau bientôt disponible */}
        <div className="rounded-2xl p-4 mb-4 text-center" style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF3385 100%)' }}>
          <span className="text-2xl block mb-1">🚧</span>
          <span className="font-black text-base text-white block">Bientôt disponible</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>La boutique ouvrira très prochainement !</span>
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
        <h2 className="font-black text-sm mb-2" style={{ color: '#1a1a2e' }}>Tickets de Quête</h2>
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
