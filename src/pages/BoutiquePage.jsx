import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CoinsIcon from '../components/CoinsIcon'
import { updateCoins, updateHints, updateTickets } from '../services/currencyService'
import { readWtfData } from '../utils/storageHelper'
import { getValidFacts, getVipFacts, getFunnyFacts, getCategoryById } from '../data/factsService'
import { useCurrency } from '../context/CurrencyContext'
import { useScale } from '../hooks/useScale'
import RouletteModal from '../components/RouletteModal'

const S = (px) => `calc(${px}px * var(--scale))`

const HINT_PACKS = [
  { quantity: 1, price: 10, label: '1 indice',   discount: null },
  { quantity: 3, price: 30, label: '3 indices',   discount: null },
  { quantity: 5, price: 45, label: '5 indices',   discount: '-10%' },
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

  const { coins, tickets, hints } = useCurrency()
  const [toast, setToast] = useState(null)
  const [confirmPurchase, setConfirmPurchase] = useState(null)
  const [streakFreezeCount, setStreakFreezeCount] = useState(() => readWtfData().streakFreezeCount || 0)
  const [packResult, setPackResult] = useState(null) // { facts: [...], packType: 'standard'|'wtf' }
  const [packRevealed, setPackRevealed] = useState(false)
  const [packRevealIndex, setPackRevealIndex] = useState(0)
  const [showRoulette, setShowRoulette] = useState(false)
  const scale = useScale()

  // Backward compat : les endroits qui lisent balances.coins
  const balances = { coins, tickets, hints }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  const buyMysteryPack = (packType) => {
    const isWtf = packType === 'wtf'
    const price = isWtf ? 50 : 25
    const count = isWtf ? 5 : 3
    if (coins < price) return

    const wd = readWtfData()
    const unlockedIds = new Set(wd.unlockedFacts || [])

    // Pool : facts non débloqués
    const allFacts = getValidFacts()
    const vipPool = getVipFacts().filter(f => !unlockedIds.has(f.id))
    const funnyPool = getFunnyFacts().filter(f => !unlockedIds.has(f.id))

    if (vipPool.length + funnyPool.length < count) {
      showToast('Pas assez de f*cts à débloquer !')
      return
    }

    updateCoins(-price)

    // Sélection aléatoire
    const selected = []
    const usedIds = new Set()

    // WTF! pack : au moins 1 VIP garanti
    if (isWtf && vipPool.length > 0) {
      const vip = vipPool[Math.floor(Math.random() * vipPool.length)]
      selected.push(vip)
      usedIds.add(vip.id)
    }

    // Pity system : si 10+ packs sans VIP → forcer 1 VIP
    const pityCount = (wd.mysteryPackPityCounter || 0) + 1
    if (!isWtf && pityCount >= 10 && vipPool.length > 0) {
      const vip = vipPool.filter(f => !usedIds.has(f.id))[0]
      if (vip) { selected.push(vip); usedIds.add(vip.id) }
      wd.mysteryPackPityCounter = 0
    } else if (!isWtf) {
      wd.mysteryPackPityCounter = pityCount
    } else {
      wd.mysteryPackPityCounter = 0
    }

    // Remplir le reste
    const remainingPool = [...vipPool, ...funnyPool].filter(f => !usedIds.has(f.id))
    const shuffled = remainingPool.sort(() => Math.random() - 0.5)
    while (selected.length < count && shuffled.length > 0) {
      selected.push(shuffled.shift())
    }

    // Débloquer les facts
    for (const fact of selected) {
      unlockedIds.add(fact.id)
    }
    wd.unlockedFacts = [...unlockedIds]
    wd.mysteryPacksOpened = (wd.mysteryPacksOpened || 0) + 1
    wd.lastModified = Date.now()
    localStorage.setItem('wtf_data', JSON.stringify(wd))

    // Afficher le résultat
    setPackResult({ facts: selected, packType: packType })
    setPackRevealed(false)
    setPackRevealIndex(0)
  }

  const buyPack = (type, quantity, price) => {
    if (coins < price) return
    updateCoins(-price)
    if (type === 'hint') updateHints(quantity)
    else if (type === 'ticket') updateTickets(quantity)
    else if (type === 'streakFreeze') {
      const wd = readWtfData()
      wd.streakFreezeCount = (wd.streakFreezeCount || 0) + 1
      wd.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(wd))
      setStreakFreezeCount(wd.streakFreezeCount)
    }
    const labels = { hint: 'indice', ticket: 'ticket', streakFreeze: 'Streak Freeze' }
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
                  if (confirmPurchase.type === 'mysteryStandard') {
                    buyMysteryPack('standard')
                  } else if (confirmPurchase.type === 'mysteryWtf') {
                    buyMysteryPack('wtf')
                  } else {
                    buyPack(confirmPurchase.type, confirmPurchase.quantity, confirmPurchase.price)
                  }
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

      {/* Modal révélation Mystery Pack */}
      {packResult && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => { setPackResult(null); setPackRevealed(false) }}
        >
          <div
            style={{ background: 'white', borderRadius: 24, padding: 24, maxWidth: 340, width: '100%', textAlign: 'center', fontFamily: 'Nunito, sans-serif' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 40, marginBottom: 8 }}>{packResult.packType === 'wtf' ? '✨' : '📦'}</div>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: '#1a1a2e', margin: '0 0 4px' }}>
              {packResult.packType === 'wtf' ? 'WTF! Pack' : 'Mystery Pack'}
            </h3>
            <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 16px' }}>
              {packResult.facts.length} f*cts débloqués !
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {packResult.facts.map((fact, i) => {
                const revealed = packRevealed || i <= packRevealIndex
                const cat = getCategoryById(fact.category)
                return (
                  <div
                    key={fact.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!packRevealed && i === packRevealIndex + 1) setPackRevealIndex(i)
                    }}
                    style={{
                      padding: '10px 14px', borderRadius: 12,
                      background: revealed
                        ? fact.isVip ? 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,165,0,0.1))' : 'rgba(243,244,246,1)'
                        : 'rgba(0,0,0,0.06)',
                      border: revealed && fact.isVip ? '1.5px solid rgba(255,215,0,0.4)' : '1px solid rgba(0,0,0,0.06)',
                      cursor: !revealed && i === packRevealIndex + 1 ? 'pointer' : 'default',
                      transition: 'all 0.3s ease',
                      textAlign: 'left',
                    }}
                  >
                    {revealed ? (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {fact.isVip && <span style={{ fontSize: 12, color: '#D97706', fontWeight: 900 }}>VIP</span>}
                          <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700 }}>{cat?.label || fact.category}</span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.3 }}>
                          {fact.text?.slice(0, 80)}{fact.text?.length > 80 ? '...' : ''}
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '4px 0' }}>
                        <span style={{ fontSize: 20 }}>❓</span>
                        <span style={{ fontSize: 11, color: '#9CA3AF', display: 'block', marginTop: 2 }}>Touche pour révéler</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {!packRevealed ? (
              <button
                onClick={(e) => { e.stopPropagation(); setPackRevealed(true) }}
                style={{ width: '100%', padding: '12px 0', borderRadius: 14, fontWeight: 900, fontSize: 14, background: '#FF6B1A', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}
              >
                Tout révéler
              </button>
            ) : (
              <button
                onClick={() => { setPackResult(null); setPackRevealed(false) }}
                style={{ width: '100%', padding: '12px 0', borderRadius: 14, fontWeight: 900, fontSize: 14, background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB', cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}
              >
                Fermer
              </button>
            )}
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

        {/* Roulette quotidienne */}
        <button
          onClick={() => setShowRoulette(true)}
          className="w-full rounded-2xl p-4 mb-4 flex items-center gap-3 active:scale-95 transition-all"
          style={{
            background: 'linear-gradient(135deg, rgba(255,107,26,0.1), rgba(249,115,22,0.15))',
            border: '1.5px solid rgba(255,107,26,0.3)',
            cursor: 'pointer', textAlign: 'left',
          }}
        >
          <span style={{ fontSize: 28 }}>🎰</span>
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
              <span className="text-xs font-bold" style={{ color: '#9CA3AF' }}>10 <CoinsIcon size={10} /></span>
            )
          })()}
        </button>

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

        {/* Section Mystery Packs */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(236,72,153,0.08))', border: '1px solid rgba(168,85,247,0.25)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: 20 }}>🎁</span>
            <h2 className="font-black text-sm" style={{ color: '#1a1a2e', margin: 0 }}>Mystery Packs</h2>
          </div>
          <p className="text-xs mb-3" style={{ color: '#6B7280' }}>Débloque des f*cts aléatoires — surprise garantie !</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setConfirmPurchase({ type: 'mysteryStandard', quantity: 3, price: 25, label: 'Mystery Pack (3 f*cts)' })}
              disabled={coins < 25}
              className="w-full flex items-center gap-3 rounded-xl active:scale-95 transition-all"
              style={{
                padding: '12px 16px',
                background: coins >= 25 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
                border: '1px solid rgba(0,0,0,0.08)',
                cursor: coins >= 25 ? 'pointer' : 'not-allowed',
                opacity: coins >= 25 ? 1 : 0.4,
              }}
            >
              <span style={{ fontSize: 22 }}>📦</span>
              <div className="flex-1 text-left">
                <span className="font-bold text-sm block" style={{ color: '#1a1a2e' }}>Mystery Pack</span>
                <span className="text-xs" style={{ color: '#9CA3AF' }}>3 f*cts aléatoires</span>
              </div>
              <span className="flex items-center gap-1 font-black text-sm" style={{ color: '#FF6B1A' }}>
                25 <CoinsIcon size={14} />
              </span>
            </button>
            <button
              onClick={() => setConfirmPurchase({ type: 'mysteryWtf', quantity: 5, price: 50, label: 'WTF! Pack (5 f*cts dont 1 VIP)' })}
              disabled={coins < 50}
              className="w-full flex items-center gap-3 rounded-xl active:scale-95 transition-all"
              style={{
                padding: '12px 16px',
                background: coins >= 50 ? 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,165,0,0.1))' : 'rgba(255,255,255,0.5)',
                border: coins >= 50 ? '1px solid rgba(255,215,0,0.3)' : '1px solid rgba(0,0,0,0.08)',
                cursor: coins >= 50 ? 'pointer' : 'not-allowed',
                opacity: coins >= 50 ? 1 : 0.4,
              }}
            >
              <span style={{ fontSize: 22 }}>✨</span>
              <div className="flex-1 text-left">
                <span className="font-bold text-sm block" style={{ color: '#1a1a2e' }}>WTF! Pack</span>
                <span className="text-xs" style={{ color: '#D97706' }}>5 f*cts dont 1 VIP garanti</span>
              </div>
              <span className="flex items-center gap-1 font-black text-sm" style={{ color: '#FF6B1A' }}>
                50 <CoinsIcon size={14} />
              </span>
            </button>
          </div>
        </div>

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
            price={15}
            discount={null}
            canBuy={coins >= 15}
            onClick={() => setConfirmPurchase({ type: 'streakFreeze', quantity: 1, price: 15, label: '1 Streak Freeze' })}
          />
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

      {/* Modal Roulette */}
      {showRoulette && (
        <RouletteModal onClose={() => setShowRoulette(false)} scale={scale} />
      )}
    </div>
  )
}
