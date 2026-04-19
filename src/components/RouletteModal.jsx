import { useState, useEffect, useRef } from 'react'
import { usePlayerProfile } from '../hooks/usePlayerProfile'
import { readWtfData } from '../utils/storageHelper'
import { audio } from '../utils/audio'

const S = (px) => `calc(${px}px * var(--scale))`

// ── Configuration des segments ──────────────────────────────────────────────
// Affichage : tous les segments ont la même taille visuelle (équité perçue).
// Probabilités : définies séparément via `weight` (indépendant de la taille).
// Bloc 3.5 — T95 : avg coins/spin ~5,44
// Spec ROULETTE_WTF_SPECS 15/04/2026 — 8 segments, économie ×10, spin = 100 coins
// 12 segments — 8 classiques + 4 nouvelles récompenses (décision 18/04/2026)
// Total weight = 100. EV = 85.4 coins/spin. Sink net = 14.6 coins (14.6%).
// Nouvelles récompenses : +1 énergie, 1 f*ct débloqué, relance gratuite, streak freeze.
// Couleurs : 8 distinctes classiques + 4 nouvelles (cyan/turquoise/rose/indigo)
// Icône par segment — coins.png uniquement pour les rewards de type 'coins'.
// Les autres utilisent une icône dédiée ou aucune (le label emoji suffit).
const SEGMENTS = [
  { label: '20',  icon: '/assets/ui/icon-coins.png',    reward: { type: 'coins', amount: 20  }, color: '#9CA3AF', weight: 22 }, // gris
  { label: '50',  icon: '/assets/ui/icon-coins.png',    reward: { type: 'coins', amount: 50  }, color: '#F97316', weight: 18 }, // orange
  { label: '1',   icon: '/assets/ui/icon-hint.png?v=2', reward: { type: 'hints', amount: 1   }, color: '#8B5CF6', weight: 14 }, // violet
  { label: '100', icon: '/assets/ui/icon-coins.png',    reward: { type: 'coins', amount: 100 }, color: '#3B82F6', weight: 10 }, // bleu
  { label: '+1',  icon: '/assets/ui/emoji-lightning.png', reward: { type: 'energy', amount: 1 }, color: '#06B6D4', weight: 8 }, // cyan — énergie
  { label: '150', icon: '/assets/ui/icon-coins.png',    reward: { type: 'coins', amount: 150 }, color: '#22C55E', weight: 7  }, // vert
  { label: '🔓',  icon: null,                           reward: { type: 'factUnlock', amount: 1 }, color: '#14B8A6', weight: 4 }, // turquoise — fact
  { label: '2',   icon: '/assets/ui/icon-hint.png?v=2', reward: { type: 'hints', amount: 2   }, color: '#EC4899', weight: 4  }, // fuchsia
  { label: '🎯',  icon: null,                           reward: { type: 'freeSpin', amount: 1 }, color: '#F472B6', weight: 5 }, // rose pâle — relance
  { label: '300', icon: '/assets/ui/icon-coins.png',    reward: { type: 'coins', amount: 300 }, color: '#EAB308', weight: 3  }, // jaune
  { label: '🛡️', icon: null,                           reward: { type: 'streakFreeze', amount: 1 }, color: '#6366F1', weight: 3 }, // indigo — streak freeze
  { label: '750', icon: '/assets/ui/icon-coins.png',    reward: { type: 'coins', amount: 750 }, color: '#EF4444', weight: 2  }, // rouge — jackpot
]

const TOTAL_WEIGHT = SEGMENTS.reduce((sum, s) => sum + s.weight, 0)
const SEG_ANGLE = 360 / SEGMENTS.length

// Tous les segments ont la même taille visuelle — seul le poids change la probabilité.
function computeSegmentBounds() {
  return SEGMENTS.map((seg, i) => {
    const start = i * SEG_ANGLE
    const end = start + SEG_ANGLE
    return { ...seg, startDeg: start, endDeg: end, midDeg: start + SEG_ANGLE / 2 }
  })
}

const SEGMENT_BOUNDS = computeSegmentBounds()

function pickSegment() {
  let r = Math.random() * TOTAL_WEIGHT
  for (let i = 0; i < SEGMENTS.length; i++) {
    r -= SEGMENTS[i].weight
    if (r <= 0) return i
  }
  return 0
}

const EXTRA_SPIN_COST = 100

function getSpinData() {
  const wd = readWtfData()
  const today = new Date().toISOString().slice(0, 10)
  const freeUsed = wd.rouletteFreeDate === today
  const spinsToday = wd.rouletteSpinsToday || 0
  return { freeUsed, spinsToday, today }
}

export default function RouletteModal({ onClose, scale }) {
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [rotation, setRotation] = useState(0)
  const [spinData, setSpinData] = useState(getSpinData)
  const [notEnough, setNotEnough] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false) // confirmation avant spin (19/04/2026)
  const canvasRef = useRef(null)
  const tickIntervalRef = useRef(null)
  const imagesRef = useRef({})
  // Phase A.6/A.7 — miroir Supabase
  const { coins, applyCurrencyDelta } = usePlayerProfile()

  const isFree = !spinData.freeUsed

  // Dessiner la roue (segments égaux + icônes PNG préchargées)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const size = canvas.width
    const center = size / 2
    const radius = center - 4

    const drawWheel = () => {
      ctx.clearRect(0, 0, size, size)

      SEGMENT_BOUNDS.forEach(seg => {
        const startAngle = (seg.startDeg - 90) * Math.PI / 180
        const endAngle = (seg.endDeg - 90) * Math.PI / 180

        ctx.beginPath()
        ctx.moveTo(center, center)
        ctx.arc(center, center, radius, startAngle, endAngle)
        ctx.closePath()
        ctx.fillStyle = seg.color
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.45)'
        ctx.lineWidth = 2
        ctx.stroke()

        const midAngle = (startAngle + endAngle) / 2
        ctx.save()
        ctx.translate(center, center)
        ctx.rotate(midAngle)

        // Icône PNG si chargée (null → pas d'icône, seul le label s'affiche)
        const img = seg.icon ? imagesRef.current[seg.icon] : null
        const iconSize = 20 // réduit de 28 → 20 (spec 19/04/2026)
        const iconX = radius * 0.58
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.save()
          ctx.translate(iconX, 0)
          ctx.rotate(-midAngle)
          ctx.drawImage(img, -iconSize / 2, -iconSize / 2, iconSize, iconSize)
          ctx.restore()
        }

        // Label (nombre) sous l'icône
        if (seg.label) {
          ctx.textAlign = 'center'
          ctx.fillStyle = 'white'
          ctx.strokeStyle = 'rgba(0,0,0,0.4)'
          ctx.lineWidth = 3
          ctx.font = 'bold 13px Nunito, sans-serif'
          const labelX = radius * 0.82
          ctx.save()
          ctx.translate(labelX, 0)
          ctx.rotate(-midAngle)
          ctx.strokeText(seg.label, 0, 4)
          ctx.fillText(seg.label, 0, 4)
          ctx.restore()
        }
        ctx.restore()
      })

      // Centre
      ctx.beginPath()
      ctx.arc(center, center, 20, 0, Math.PI * 2)
      ctx.fillStyle = 'white'
      ctx.fill()
      ctx.strokeStyle = '#E5E7EB'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // Précharger toutes les icônes uniques (filtre les null — segments sans icône)
    const uniqueIcons = [...new Set(SEGMENTS.map(s => s.icon).filter(Boolean))]
    if (uniqueIcons.length === 0) { drawWheel(); return }
    let loadedCount = 0
    uniqueIcons.forEach(src => {
      if (imagesRef.current[src]) { loadedCount++; if (loadedCount === uniqueIcons.length) drawWheel(); return }
      const img = new Image()
      img.onload = () => {
        imagesRef.current[src] = img
        loadedCount++
        if (loadedCount === uniqueIcons.length) drawWheel()
      }
      img.onerror = () => {
        loadedCount++
        if (loadedCount === uniqueIcons.length) drawWheel()
      }
      img.src = src
    })
    drawWheel() // premier paint immédiat (couleurs au moins)
  }, [])

  // Cleanup tick interval
  useEffect(() => () => {
    if (tickIntervalRef.current) clearInterval(tickIntervalRef.current)
  }, [])

  const handleSpin = () => {
    if (spinning) return

    // Vérifier le coût
    if (!isFree) {
      if ((coins ?? 0) < EXTRA_SPIN_COST) {
        setNotEnough(true)
        setTimeout(() => setNotEnough(false), 2000)
        return
      }
      applyCurrencyDelta?.({ coins: -EXTRA_SPIN_COST }, 'roulette_spin_paid')?.catch?.(e =>
        console.warn('[RouletteModal] spin cost RPC failed:', e?.message || e)
      )
    }

    setSpinning(true)
    setResult(null)
    audio.play('roulette_spin')

    const winIndex = pickSegment()
    const targetSeg = SEGMENT_BOUNDS[winIndex]
    // Vise le milieu du segment gagnant ; l'angle à atteindre est (360 - midDeg)
    // car la roue tourne vers la flèche fixée en haut.
    const targetAngle = 360 - targetSeg.midDeg
    const fullSpins = 5 + Math.floor(Math.random() * 3)
    const finalRotation = rotation + fullSpins * 360 + targetAngle - (rotation % 360)

    setRotation(finalRotation)

    // Ticks de la roue qui ralentit : intervalles croissants
    if (tickIntervalRef.current) clearInterval(tickIntervalRef.current)
    const tickTimes = [80, 90, 100, 115, 135, 160, 190, 230, 280, 340, 420, 520]
    let tickI = 0
    const scheduleTick = () => {
      audio.play('roulette_tick')
      tickI++
      const next = tickTimes[Math.min(tickI, tickTimes.length - 1)]
      if (tickI < 25) tickIntervalRef.current = setTimeout(scheduleTick, next)
    }
    scheduleTick()

    setTimeout(() => {
      setSpinning(false)
      if (tickIntervalRef.current) { clearTimeout(tickIntervalRef.current); tickIntervalRef.current = null }
      const seg = SEGMENTS[winIndex]
      setResult(seg)

      // Son de gain : jackpot pour 300/750 coins, sinon win
      const isJackpot = seg.reward.type === 'coins' && seg.reward.amount >= 300
      audio.play(isJackpot ? 'roulette_jackpot' : 'roulette_win')

      // Appliquer la récompense selon le type (18/04/2026)
      if (seg.reward.type === 'coins' || seg.reward.type === 'hints' || seg.reward.type === 'energy') {
        // Monnaies gérées par le RPC apply_currency_delta
        const rpcDelta = { [seg.reward.type]: seg.reward.amount }
        applyCurrencyDelta?.(rpcDelta, `roulette_reward_${seg.reward.type}`)?.catch?.(e =>
          console.warn('[RouletteModal] reward RPC failed:', e?.message || e)
        )
      } else if (seg.reward.type === 'factUnlock') {
        // TODO : appeler RPC unlock_fact sur un fact aléatoire non-débloqué
        // Pour l'instant on crédite 25 coins (valeur équivalente)
        applyCurrencyDelta?.({ coins: 25 }, 'roulette_reward_fact_fallback')?.catch?.(() => {})
      } else if (seg.reward.type === 'freeSpin') {
        // Relance gratuite : refund les 100 coins du spin courant (sauf si c'était un spin gratuit)
        if (spinData.freeUsed) {
          applyCurrencyDelta?.({ coins: EXTRA_SPIN_COST }, 'roulette_reward_free_spin')?.catch?.(() => {})
        }
      } else if (seg.reward.type === 'streakFreeze') {
        // Incrémente le compteur de streak freezes disponibles dans wtf_data
        try {
          const wd0 = JSON.parse(localStorage.getItem('wtf_data') || '{}')
          wd0.streakFreezeCount = (wd0.streakFreezeCount || 0) + 1
          wd0.lastModified = Date.now()
          localStorage.setItem('wtf_data', JSON.stringify(wd0))
          window.dispatchEvent(new Event('wtf_storage_sync'))
        } catch { /* ignore */ }
      }

      // Enregistrer le spin
      const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      const today = new Date().toISOString().slice(0, 10)
      if (!spinData.freeUsed) {
        wd.rouletteFreeDate = today
      }
      wd.rouletteSpinsToday = (wd.rouletteSpinsToday || 0) + 1
      wd.rouletteTotalSpins = (wd.rouletteTotalSpins || 0) + 1
      wd.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(wd))
      setSpinData(getSpinData())
    }, 4000)
  }

  const rewardLabel = result && {
    coins: `+${result.reward.amount} coins`,
    hints: `+${result.reward.amount} indice${result.reward.amount > 1 ? 's' : ''}`,
    energy: `+${result.reward.amount} énergie${result.reward.amount > 1 ? 's' : ''}`,
    factUnlock: '1 f*ct débloqué',
    freeSpin: 'Relance gratuite',
    streakFreeze: '+1 Streak Freeze',
  }[result.reward.type]
  const isJackpotResult = result && result.reward.type === 'coins' && result.reward.amount >= 300

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, '--scale': scale }}
      onClick={!spinning ? onClose : undefined}
    >
      <div
        style={{ background: 'white', borderRadius: 24, padding: 24, maxWidth: 340, width: '100%', textAlign: 'center', fontFamily: 'Nunito, sans-serif', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1a1a2e', margin: '0 0 4px' }}>
          <img src="/assets/ui/emoji-roulette.png?v=2" alt="roulette" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} /> Roulette du jour
        </h2>
        <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 16px' }}>
          {isFree ? '1 spin gratuit disponible !' : `Spin supplémentaire : ${EXTRA_SPIN_COST} coins`}
        </p>

        {/* Roue */}
        <div style={{ position: 'relative', width: 240, height: 240, margin: '0 auto 16px' }}>
          {/* Flèche indicateur */}
          <div style={{
            position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent',
            borderTop: '16px solid #FF6B1A', zIndex: 2, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
          }} />
          <div style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
          }}>
            <canvas ref={canvasRef} width={240} height={240} style={{ width: 240, height: 240 }} />
          </div>
        </div>

        {/* Résultat — icône centrée horizontalement */}
        {result && !spinning && (
          <div style={{
            background: isJackpotResult
              ? 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,165,0,0.15))'
              : 'linear-gradient(135deg, rgba(255,107,26,0.1), rgba(255,165,0,0.1))',
            border: isJackpotResult ? '1.5px solid rgba(255,215,0,0.5)' : '1.5px solid rgba(255,107,26,0.3)',
            borderRadius: 14,
            padding: '12px 16px', marginBottom: 16,
            animation: 'roulettePop 0.3s ease',
            boxShadow: isJackpotResult ? '0 0 20px rgba(255,215,0,0.4)' : 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <img src={result.icon} alt="" style={{ width: 36, height: 36 }} />
            <div style={{ fontSize: 16, fontWeight: 900, color: isJackpotResult ? '#B8860B' : '#FF6B1A', marginTop: 4 }}>
              {rewardLabel}
            </div>
          </div>
        )}

        {/* Pas assez de coins */}
        {notEnough && (
          <div style={{ fontSize: 13, fontWeight: 700, color: '#EF4444', marginBottom: 8, animation: 'roulettePop 0.3s ease' }}>
            Pas assez de WTFCoins !
          </div>
        )}

        {/* Bouton spin — affiche une confirmation avant de lancer (évite clics accidentels) */}
        <button
          onClick={() => {
            if (spinning) return
            if (!isFree && (coins ?? 0) < EXTRA_SPIN_COST) {
              setNotEnough(true)
              setTimeout(() => setNotEnough(false), 2000)
              return
            }
            setShowConfirm(true)
          }}
          disabled={spinning}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 14, fontWeight: 900, fontSize: 16,
            border: 'none', cursor: spinning ? 'default' : 'pointer',
            fontFamily: 'Nunito, sans-serif',
            background: spinning ? '#E5E7EB' : isFree ? 'linear-gradient(135deg, #FF6B1A, #D94A10)' : 'linear-gradient(135deg, #F59E0B, #D97706)',
            color: spinning ? '#9CA3AF' : 'white',
            boxShadow: spinning ? 'none' : '0 4px 16px rgba(255,107,26,0.3)',
            transition: 'all 0.2s ease',
          }}
        >
          {spinning ? 'En cours...' : isFree ? 'Spin gratuit !' : `Spin (${EXTRA_SPIN_COST} coins)`}
        </button>

        {/* Modal de confirmation avant spin */}
        {showConfirm && !spinning && (
          <div
            onClick={() => setShowConfirm(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10000, padding: 20, backdropFilter: 'blur(4px)',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: '#fff', borderRadius: 20, padding: '24px 20px',
                maxWidth: 320, width: '100%', textAlign: 'center',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                fontFamily: 'Nunito, sans-serif',
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎰</div>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1a1a2e', margin: '0 0 8px' }}>
                Lancer la roue ?
              </h3>
              <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px', lineHeight: 1.5 }}>
                {isFree
                  ? 'C\'est ton spin gratuit du jour — prêt ?'
                  : `${EXTRA_SPIN_COST} coins seront débités. Prêt ?`}
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowConfirm(false)}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 12, fontWeight: 800, fontSize: 14,
                    border: '1px solid #E5E7EB', background: '#F3F4F6', color: '#6B7280',
                    cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={() => { setShowConfirm(false); handleSpin() }}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 12, fontWeight: 900, fontSize: 14,
                    border: 'none',
                    background: 'linear-gradient(135deg, #FF6B1A, #D94A10)', color: '#fff',
                    cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
                    boxShadow: '0 4px 12px rgba(255,107,26,0.4)',
                  }}
                >
                  C'est parti !
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Fermer */}
        {!spinning && (
          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 14, fontWeight: 700, fontSize: 13,
              border: '1px solid #E5E7EB', background: 'transparent', color: '#6B7280',
              cursor: 'pointer', fontFamily: 'Nunito, sans-serif', marginTop: 8,
            }}
          >
            Fermer
          </button>
        )}
      </div>

      <style>{`
        @keyframes roulettePop {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
