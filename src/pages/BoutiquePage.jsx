import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CoinsIcon from '../components/CoinsIcon'
import { updateCoins, updateHints, updateTickets } from '../services/currencyService'
import { readWtfData } from '../utils/storageHelper'
import { getValidFacts, getVipFacts, getFunnyFacts, getCategoryById, getPlayableCategories } from '../data/factsService'
import { getFlashEnergy } from '../services/energyService'
import { FLASH_ENERGY } from '../constants/gameConfig'
import { useCurrency } from '../context/CurrencyContext'
import { useScale } from '../hooks/useScale'
import RouletteModal from '../components/RouletteModal'
import { AVATAR_FRAMES, readFrameState, addOwnedFrame } from '../data/avatarFrames'

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

const ENERGY_PACKS = [
  { quantity: 1, price: 10, label: '1 énergie',   discount: null },
  { quantity: 3, price: 25, label: '3 énergies',  discount: '-17%' },
  { quantity: 5, price: 40, label: '5 énergies',  discount: '-20%' },
]

const MYSTERY_PACKS = [
  { id: 'decouverte',  emoji: '📦', label: 'Pack Découverte', desc: '2 Funny f*cts',                          price: 15,  count: 2,  vipChance: 0,    vipGuaranteed: false },
  { id: 'standard',    emoji: '🎁', label: 'Pack Standard',   desc: '5 Funny f*cts',                          price: 35,  count: 5,  vipChance: 0,    vipGuaranteed: false },
  { id: 'categorie',   emoji: '📂', label: 'Pack Catégorie',  desc: '4 Funny f*cts d\'une catégorie au choix', price: 40,  count: 4,  vipChance: 0,    vipGuaranteed: false, pickCategory: true },
  { id: 'premium',     emoji: '✨', label: 'Pack Premium',    desc: '7 f*cts + 5% chance VIP chacun',          price: 80,  count: 7,  vipChance: 0.05, vipGuaranteed: false },
  { id: 'mega',        emoji: '🏆', label: 'Pack Mega',       desc: '12 f*cts + 1 VIP garanti',               price: 150, count: 12, vipChance: 0,    vipGuaranteed: true },
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
  const [purchaseQty, setPurchaseQty] = useState(1)
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

  const [selectedPackCategory, setSelectedPackCategory] = useState(null)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [pendingPack, setPendingPack] = useState(null)
  // Onglets de la boutique : Packs | Essentiels | Abonnement
  const [activeTab, setActiveTab] = useState('packs')
  // Cadres profil possédés (refresh via wtf_storage_sync)
  const [frameState, setFrameState] = useState(() => readFrameState())
  useEffect(() => {
    const refresh = () => setFrameState(readFrameState())
    window.addEventListener('wtf_storage_sync', refresh)
    return () => window.removeEventListener('wtf_storage_sync', refresh)
  }, [])

  const buyMysteryPack = (packId, categoryFilter = null) => {
    const packDef = MYSTERY_PACKS.find(p => p.id === packId)
    if (!packDef || coins < packDef.price) return

    const wd = readWtfData()
    const unlockedIds = new Set(wd.unlockedFacts || [])

    const vipPool = getVipFacts().filter(f => !unlockedIds.has(f.id) && (!categoryFilter || f.category === categoryFilter))
    const funnyPool = getFunnyFacts().filter(f => !unlockedIds.has(f.id) && (!categoryFilter || f.category === categoryFilter))

    if (vipPool.length + funnyPool.length < packDef.count) {
      showToast('Pas assez de f*cts à débloquer !')
      return
    }

    updateCoins(-packDef.price)

    const selected = []
    const usedIds = new Set()

    // VIP garanti (Pack Mega)
    if (packDef.vipGuaranteed && vipPool.length > 0) {
      const vip = vipPool[Math.floor(Math.random() * vipPool.length)]
      selected.push(vip)
      usedIds.add(vip.id)
    }

    // Pity system : après 5 packs Premium sans VIP → forcer 1 VIP
    if (packId === 'premium') {
      const pityCount = (wd.mysteryPackPityCounter || 0) + 1
      if (pityCount >= 5 && vipPool.length > 0) {
        const vip = vipPool.filter(f => !usedIds.has(f.id))[0]
        if (vip) { selected.push(vip); usedIds.add(vip.id) }
        wd.mysteryPackPityCounter = 0
      } else {
        wd.mysteryPackPityCounter = pityCount
      }
    }

    // Remplir le reste
    const pool = [...funnyPool, ...vipPool].filter(f => !usedIds.has(f.id))
    const shuffled = pool.sort(() => Math.random() - 0.5)
    while (selected.length < packDef.count && shuffled.length > 0) {
      const fact = shuffled.shift()
      // Pack Premium : 5% chance VIP par slot
      if (packDef.vipChance > 0 && fact.isVip && Math.random() > packDef.vipChance) {
        // Skip ce VIP, prendre un Funny à la place si dispo
        const funnyAlt = shuffled.find(f => !f.isVip && !usedIds.has(f.id))
        if (funnyAlt) {
          shuffled.splice(shuffled.indexOf(funnyAlt), 1)
          selected.push(funnyAlt)
          usedIds.add(funnyAlt.id)
          shuffled.push(fact) // remettre le VIP dans le pool
          continue
        }
      }
      selected.push(fact)
      usedIds.add(fact.id)
    }

    // Débloquer les facts
    for (const fact of selected) unlockedIds.add(fact.id)
    wd.unlockedFacts = [...unlockedIds]
    wd.mysteryPacksOpened = (wd.mysteryPacksOpened || 0) + 1
    wd.lastModified = Date.now()
    localStorage.setItem('wtf_data', JSON.stringify(wd))

    setPackResult({ facts: selected, packType: packId })
    setPackRevealed(false)
    setPackRevealIndex(0)
  }

  const buyPack = (type, quantity, price) => {
    if (coins < price) return
    updateCoins(-price)
    if (type === 'hint') updateHints(quantity)
    else if (type === 'ticket') updateTickets(quantity)
    else if (type === 'energy') {
      // Ajouter des sessions gratuites en réduisant le compteur "used"
      const wd = readWtfData()
      const today = new Date().toISOString().slice(0, 10)
      if (wd.flashEnergyDate !== today) {
        wd.flashEnergyUsed = 0
        wd.flashEnergyDate = today
      }
      wd.flashEnergyUsed = Math.max(0, (wd.flashEnergyUsed || 0) - quantity)
      wd.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(wd))
      window.dispatchEvent(new Event('wtf_energy_updated'))
    } else if (type === 'streakFreeze') {
      const wd = readWtfData()
      wd.streakFreezeCount = (wd.streakFreezeCount || 0) + 1
      wd.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(wd))
      setStreakFreezeCount(wd.streakFreezeCount)
    }
    const labels = { hint: 'indice', ticket: 'ticket', energy: 'énergie', streakFreeze: 'Streak Freeze' }
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
        const isMystery = confirmPurchase.type?.startsWith('mystery_')
        const isFreeze = confirmPurchase.type === 'streakFreeze'
        const canMultiply = !isMystery && !isFreeze
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
                      {totalQty} {confirmPurchase.type === 'hint' ? 'indices' : confirmPurchase.type === 'energy' ? 'énergies' : 'tickets'}
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
                    if (isMystery) {
                      const packId = confirmPurchase.type.replace('mystery_', '')
                      const packDef = MYSTERY_PACKS.find(p => p.id === packId)
                      if (packDef?.pickCategory) {
                        setPendingPack(packId)
                        setShowCategoryPicker(true)
                        setConfirmPurchase(null)
                        setPurchaseQty(1)
                        return
                      }
                      buyMysteryPack(packId)
                    } else {
                      buyPack(confirmPurchase.type, totalQty, totalPrice)
                    }
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

      {/* Barre d'onglets */}
      <div className="px-4 pt-2 pb-3 shrink-0" style={{ display: 'flex', gap: 6 }}>
        {[
          { id: 'packs', label: 'Packs', emoji: '🎁' },
          { id: 'essentials', label: 'Tickets & Indices', emoji: '🎟️' },
          { id: 'subscription', label: 'Abonnement', emoji: '👑' },
        ].map(t => {
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => { audio.play('click'); setActiveTab(t.id) }}
              style={{
                flex: 1, padding: '8px 4px', borderRadius: 12,
                background: isActive ? '#FF6B1A' : '#F3F4F6',
                border: isActive ? '1px solid #FF6B1A' : '1px solid #E5E7EB',
                color: isActive ? 'white' : '#6B7280',
                fontWeight: 900, fontSize: 11,
                cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span style={{ fontSize: 16 }}>{t.emoji}</span>
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

        {activeTab === 'essentials' && (
        <>
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

        {/* Section Énergie */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: 20 }}>🔋</span>
            <h2 className="font-black text-sm" style={{ color: '#1a1a2e', margin: 0 }}>Énergie</h2>
            <span className="ml-auto px-2 py-0.5 rounded-lg text-xs font-bold" style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a' }}>
              {getFlashEnergy().remaining} / {FLASH_ENERGY.FREE_SESSIONS_PER_DAY}
            </span>
          </div>
          <p className="text-xs mb-3" style={{ color: '#6B7280' }}>Jouer et Explorer consomment de l'énergie</p>
          <div className="flex flex-col gap-2">
            {ENERGY_PACKS.map(pack => (
              <PackButton
                key={pack.quantity}
                emoji="🔋"
                label={pack.label}
                price={pack.price}
                discount={pack.discount}
                canBuy={coins >= pack.price}
                onClick={() => setConfirmPurchase({ type: 'energy', quantity: pack.quantity, price: pack.price, label: pack.label })}
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
                      <span className="text-xs block" style={{ color: '#6B7280' }}>3 tickets · 5 indices · cadre Bronze</span>
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
                      <span className="text-xs block" style={{ color: '#6B7280' }}>10 tickets · 15 indices · cadre Or · 100 coins</span>
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

        {/* Section Mystery Packs */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(236,72,153,0.08))', border: '1px solid rgba(168,85,247,0.25)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: 20 }}>🎁</span>
            <h2 className="font-black text-sm" style={{ color: '#1a1a2e', margin: 0 }}>Mystery Packs</h2>
          </div>
          <p className="text-xs mb-3" style={{ color: '#6B7280' }}>Débloque des f*cts aléatoires — surprise garantie !</p>
          <div className="flex flex-col gap-2">
            {MYSTERY_PACKS.map(pack => (
              <button
                key={pack.id}
                onClick={() => setConfirmPurchase({ type: `mystery_${pack.id}`, quantity: pack.count, price: pack.price, label: `${pack.label} (${pack.desc})` })}
                disabled={coins < pack.price}
                className="w-full flex items-center gap-3 rounded-xl active:scale-95 transition-all"
                style={{
                  padding: '12px 16px',
                  background: coins >= pack.price
                    ? (pack.vipGuaranteed ? 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,165,0,0.1))' : 'rgba(255,255,255,0.9)')
                    : 'rgba(255,255,255,0.5)',
                  border: pack.vipGuaranteed && coins >= pack.price ? '1px solid rgba(255,215,0,0.3)' : '1px solid rgba(0,0,0,0.08)',
                  cursor: coins >= pack.price ? 'pointer' : 'not-allowed',
                  opacity: coins >= pack.price ? 1 : 0.4,
                }}
              >
                <span style={{ fontSize: 22 }}>{pack.emoji}</span>
                <div className="flex-1 text-left">
                  <span className="font-bold text-sm block" style={{ color: '#1a1a2e' }}>{pack.label}</span>
                  <span className="text-xs" style={{ color: pack.vipGuaranteed ? '#D97706' : '#9CA3AF' }}>{pack.desc}</span>
                </div>
                <span className="flex items-center gap-1 font-black text-sm" style={{ color: '#FF6B1A' }}>
                  {pack.price} <CoinsIcon size={14} />
                </span>
              </button>
            ))}
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
                    updateCoins(-frame.cost)
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
        <div className="rounded-2xl p-4 text-center mb-4" style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,165,0,0.18))', border: '1.5px solid rgba(255,165,0,0.4)' }}>
          <span className="text-3xl block mb-2">👑</span>
          <span className="font-black text-base block" style={{ color: '#1a1a2e' }}>WTF! Premium</span>
          <span className="text-xs block mb-2" style={{ color: '#6B7280' }}>Tickets illimités · 3 indices/jour · badge VIP</span>
          <span className="text-sm font-black block" style={{ color: '#FF6B1A' }}>4,99 €/mois</span>
          <span className="inline-block mt-3 px-4 py-1 rounded-lg text-xs font-bold" style={{ background: 'rgba(0,0,0,0.06)', color: '#9CA3AF' }}>Bientôt</span>
        </div>
        </>
        )}
      </div>

      {/* Modal sélection catégorie (Pack Catégorie) */}
      {showCategoryPicker && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => { setShowCategoryPicker(false); setPendingPack(null) }}
        >
          <div
            style={{ background: 'white', borderRadius: 20, padding: 24, maxWidth: 340, width: '100%', fontFamily: 'Nunito, sans-serif', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1a1a2e', margin: '0 0 4px', textAlign: 'center' }}>Choisis une catégorie</h3>
            <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', margin: '0 0 16px' }}>Les f*cts du pack seront de cette catégorie</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {getPlayableCategories().map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setShowCategoryPicker(false)
                    buyMysteryPack(pendingPack, cat.id)
                    setPendingPack(null)
                  }}
                  className="w-full flex items-center gap-3 rounded-xl active:scale-95 transition-all"
                  style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer', textAlign: 'left' }}
                >
                  <img
                    src={`/assets/categories/${cat.id}.png`}
                    alt={cat.label}
                    style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }}
                    onError={e => { e.target.style.display = 'none' }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Roulette */}
      {showRoulette && (
        <RouletteModal onClose={() => setShowRoulette(false)} scale={scale} />
      )}
    </div>
  )
}
