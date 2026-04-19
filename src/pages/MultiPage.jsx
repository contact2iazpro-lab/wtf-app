import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useScale } from '../hooks/useScale'
import { useAuth } from '../context/AuthContext'
import { useDuelContext } from '../features/duels/context/DuelContext'
import { getValidFacts, getPlayableCategories } from '../data/factsService'
import { usePlayerProfile } from '../hooks/usePlayerProfile'
import { expirePendingChallenges } from '../data/duelService'
import { audio } from '../utils/audio'

const SPEEDRUN_PALIERS = [5, 10, 20, 30, 50, 100]
const DEFI_COST = 100 // mise créateur (accepteur mise 100 de son côté, gagnant reçoit 150)

/**
 * MultiPage — Mode Multi (défier un ami en Rush ou Speedrun)
 * Flow :
 *  1. Choix variant (Rush / Speedrun — gate cat 100% pour Speedrun)
 *  2. Choix ami (liste des friends acceptés)
 *  3. Choix catégorie (en Rush : toutes dispo. En Speedrun : seulement 100%)
 *  4. Si Speedrun : choix palier (5/10/20/30/50/100)
 *  5. Coût 200 coins → setPendingDuel mode='create' → App.jsx lance la partie
 */
export default function MultiPage() {
  const navigate = useNavigate()
  const scale = useScale()
  const S = (px) => `calc(${px}px * var(--scale))`
  const { isConnected, signInWithGoogle } = useAuth()
  const { friends, unlockedFacts, startCreateDefi } = useDuelContext()
  const { coins } = usePlayerProfile()

  const [variant, setVariant] = useState('rush')
  const [opponentId, setOpponentId] = useState(null)
  const [categoryId, setCategoryId] = useState(null)
  const [palier, setPalier] = useState(null)

  // Au mount : expire les défis > 48h et rembourse les créateurs (idempotent serveur)
  useEffect(() => { expirePendingChallenges().catch(() => {}) }, [])

  const allFacts = getValidFacts()
  const totalUnlocked = allFacts.filter(f => unlockedFacts.has(f.id)).length

  const categories = useMemo(() => {
    const cats = getPlayableCategories()
    return cats
      .map(cat => {
        const factsInCat = allFacts.filter(f => f.category === cat.id)
        const unlocked = factsInCat.filter(f => unlockedFacts.has(f.id)).length
        const total = factsInCat.length
        return { ...cat, unlocked, total, isComplete: total > 0 && unlocked === total }
      })
      .sort((a, b) => (b.isComplete - a.isComplete) || b.unlocked - a.unlocked)
  }, [allFacts, unlockedFacts])

  const completedCats = categories.filter(c => c.isComplete)
  const RUSH_MIN_FACTS = 10 // aligné avec solo (19/04)
  const availableCats = variant === 'speedrun'
    ? completedCats
    : categories.filter(c => c.unlocked >= RUSH_MIN_FACTS)

  const selectedCat = categoryId ? categories.find(c => c.id === categoryId) : null
  const maxPalier = selectedCat?.unlocked || 0

  const hasEnoughCoins = coins >= DEFI_COST
  const canLaunch = isConnected
    && opponentId
    && categoryId
    && (variant === 'rush' || palier)
    && hasEnoughCoins

  const handleLaunch = () => {
    if (!canLaunch) return
    audio.play('click')
    // Rush : questionCount = null (tout le pool jusqu'à ce que chrono=0)
    // Speedrun : questionCount = palier choisi
    const qc = variant === 'speedrun' ? palier : null
    startCreateDefi(opponentId, categoryId, qc, variant)
    navigate('/') // Le useEffect sur pendingDuel dans App.jsx prend le relais et lance la partie
  }

  // Non connecté → prompt Google
  if (!isConnected) {
    return (
      <div
        className="flex flex-col h-full w-full overflow-hidden"
        style={{ '--scale': scale, background: 'linear-gradient(160deg, #1a0a2e 0%, #0a0a3e 100%)', fontFamily: 'Nunito, sans-serif' }}
      >
        <div className="px-4 pt-4 pb-2 shrink-0">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}
          >←</button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6" style={{ gap: S(16) }}>
          <span style={{ fontSize: S(56) }}>⚔️</span>
          <h1 style={{ fontSize: S(24), fontWeight: 900, color: '#FFD700' }}>Multi — défie un ami</h1>
          <p style={{ fontSize: S(13), color: 'rgba(255,255,255,0.7)', textAlign: 'center', maxWidth: 280 }}>
            Connecte-toi avec Google pour affronter tes amis en Rush ou Speedrun.
          </p>
          <button
            onClick={signInWithGoogle}
            style={{ padding: '14px 28px', borderRadius: 14, background: '#fff', color: '#374151', border: 'none', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}
          >
            Se connecter avec Google
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col h-full w-full overflow-hidden"
      style={{ '--scale': scale, background: 'linear-gradient(160deg, #1a0a2e 0%, #2a1050 50%, #0a0a3e 100%)', fontFamily: 'Nunito, sans-serif', color: '#fff' }}
    >
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 pt-4 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}
        >←</button>
        <h1 style={{ fontSize: S(22), fontWeight: 900, margin: 0, letterSpacing: '0.02em' }}>⚔️ MULTI</h1>
        <div style={{ marginLeft: 'auto', fontSize: S(13), fontWeight: 800, color: hasEnoughCoins ? '#FFD700' : '#EF4444' }}>
          {coins} <img src="/assets/ui/icon-coins.png" alt="coins" style={{ width: 14, height: 14, verticalAlign: 'middle', display: 'inline' }} />
        </div>
      </div>

      {/* Toggle variant */}
      <div className="shrink-0 px-3 pb-2">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            onClick={() => { audio.play('click'); setVariant('rush'); setCategoryId(null); setPalier(null) }}
            style={{
              padding: '12px 0', borderRadius: 12,
              background: variant === 'rush' ? 'linear-gradient(135deg, #FF6B1A, #D94A10)' : 'rgba(255,255,255,0.08)',
              border: variant === 'rush' ? '2.5px solid white' : '2.5px solid transparent',
              color: 'white', fontWeight: 900, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s ease',
            }}
          >
            Rush
            <div style={{ fontSize: 9, fontWeight: 600, opacity: 0.85, marginTop: 2 }}>
              60s · plus de bonnes gagne
            </div>
          </button>
          <button
            onClick={() => { audio.play('click'); setVariant('speedrun'); setCategoryId(null); setPalier(null) }}
            disabled={completedCats.length === 0}
            style={{
              padding: '12px 0', borderRadius: 12,
              background: variant === 'speedrun' ? 'linear-gradient(135deg, #00E5FF, #0097A7)'
                : completedCats.length === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
              border: variant === 'speedrun' ? '2.5px solid white' : '2.5px solid transparent',
              color: completedCats.length === 0 ? 'rgba(255,255,255,0.3)' : 'white',
              fontWeight: 900, fontSize: 14,
              cursor: completedCats.length === 0 ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease',
            }}
          >
            Speedrun
            <div style={{ fontSize: 9, fontWeight: 600, opacity: 0.85, marginTop: 2 }}>
              {completedCats.length === 0 ? '🔒 catégorie 100%' : 'le + rapide gagne'}
            </div>
          </button>
        </div>
      </div>

      {/* Liste amis + catégorie + palier */}
      <div className="flex-1 overflow-y-auto px-3 pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Amis */}
        <div style={{ fontSize: 12, fontWeight: 900, color: 'rgba(255,255,255,0.7)', padding: '8px 4px 6px', textTransform: 'uppercase', letterSpacing: 1 }}>
          Choisis ton adversaire
        </div>
        {friends.length === 0 ? (
          <div style={{ padding: '16px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
            Pas encore d'ami.
            <br />
            <button
              onClick={() => navigate('/social')}
              style={{ marginTop: 8, padding: '8px 16px', borderRadius: 10, background: '#FF6B1A', color: '#fff', border: 'none', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}
            >
              Ajouter un ami
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {friends.map(f => {
              const selected = opponentId === f.userId
              return (
                <button
                  key={f.userId}
                  onClick={() => { audio.play('click'); setOpponentId(f.userId) }}
                  style={{
                    padding: '10px 14px', borderRadius: 12,
                    background: selected ? 'linear-gradient(135deg, #7C3AED, #3B82F6)' : 'rgba(255,255,255,0.06)',
                    border: selected ? '2.5px solid white' : '2.5px solid transparent',
                    display: 'flex', alignItems: 'center', gap: 10,
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  {f.avatarUrl ? (
                    <img src={f.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 14 }}>
                      {(f.displayName || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{f.displayName || 'Ami'}</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Catégorie */}
        {opponentId && (
          <>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'rgba(255,255,255,0.7)', padding: '8px 4px 6px', textTransform: 'uppercase', letterSpacing: 1 }}>
              Catégorie {variant === 'speedrun' && '(100% requis)'}
            </div>
            {availableCats.length === 0 ? (
              <div style={{ padding: '16px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
                {variant === 'speedrun'
                  ? '🔒 Aucune catégorie 100% complétée.'
                  : `Débloque au moins ${RUSH_MIN_FACTS} f*cts dans une catégorie.`}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                {/* Option Aléatoire (Rush uniquement) — toutes catégories */}
                {variant === 'rush' && totalUnlocked >= RUSH_MIN_FACTS && (() => {
                  const selected = categoryId === 'all'
                  return (
                    <button
                      key="all"
                      onClick={() => { audio.play('click'); setCategoryId('all'); setPalier(null) }}
                      style={{
                        padding: '10px 14px', borderRadius: 12,
                        background: selected ? 'linear-gradient(135deg, #7C3AED, #3B82F6)' : 'rgba(124,58,237,0.35)',
                        border: selected ? '2.5px solid white' : '2.5px solid transparent',
                        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🎲</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 900, color: '#fff' }}>Aléatoire</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
                          {totalUnlocked} f*cts · toutes catégories
                        </div>
                      </div>
                    </button>
                  )
                })()}
                {availableCats.map(cat => {
                  const selected = categoryId === cat.id
                  return (
                    <button
                      key={cat.id}
                      onClick={() => { audio.play('click'); setCategoryId(cat.id); setPalier(null) }}
                      style={{
                        padding: '10px 14px', borderRadius: 12,
                        background: selected ? cat.color : `${cat.color}88`,
                        border: selected ? '2.5px solid white' : '2.5px solid transparent',
                        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <img
                        src={`/assets/categories/${cat.id}.png`}
                        alt=""
                        style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                        onError={e => { e.target.style.display = 'none' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 900, color: '#fff' }}>{cat.label}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
                          {cat.unlocked} / {cat.total}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* Palier Speedrun */}
        {opponentId && categoryId && variant === 'speedrun' && (
          <>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'rgba(255,255,255,0.7)', padding: '8px 4px 6px', textTransform: 'uppercase', letterSpacing: 1 }}>
              Palier (nb questions)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
              {SPEEDRUN_PALIERS.map(n => {
                const available = n <= maxPalier
                const selected = palier === n
                return (
                  <button
                    key={n}
                    onClick={() => available && setPalier(n)}
                    disabled={!available}
                    style={{
                      borderRadius: 12, padding: '10px 0',
                      fontSize: 16, fontWeight: 900, cursor: available ? 'pointer' : 'default',
                      background: selected ? '#00E5FF' : available ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                      color: available ? (selected ? '#0a0a2e' : '#fff') : 'rgba(255,255,255,0.2)',
                      border: selected ? '2px solid #00E5FF' : '1px solid rgba(255,255,255,0.15)',
                      opacity: available ? 1 : 0.35,
                    }}
                  >
                    {n}
                    {!available && <span style={{ display: 'block', fontSize: 8, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>🔒</span>}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* CTA */}
      <div className="shrink-0 px-3 pb-4 pt-1">
        <button
          onClick={handleLaunch}
          disabled={!canLaunch}
          style={{
            width: '100%', padding: 14, borderRadius: 14,
            fontSize: 16, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em',
            border: 'none', cursor: canLaunch ? 'pointer' : 'not-allowed',
            background: canLaunch
              ? (variant === 'speedrun' ? 'linear-gradient(135deg, #00E5FF, #0097A7)' : 'linear-gradient(135deg, #FF6B1A, #D94A10)')
              : 'rgba(255,255,255,0.12)',
            color: canLaunch ? 'white' : 'rgba(255,255,255,0.4)',
            boxShadow: canLaunch ? '0 6px 24px rgba(0,0,0,0.3)' : 'none',
          }}
        >
          {!opponentId ? 'Choisis un ami'
            : !categoryId ? 'Choisis une catégorie'
            : variant === 'speedrun' && !palier ? 'Choisis un palier'
            : !hasEnoughCoins ? `${DEFI_COST} coins requis`
            : `LANCER LE DÉFI · ${DEFI_COST}`}
        </button>
      </div>
    </div>
  )
}
