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
const SEGMENTS = [
  { label: '20',  icon: '/assets/ui/icon-coins.png', reward: { type: 'coins', amount: 20  }, color: '#9CA3AF', weight: 28 },
  { label: '50',  icon: '/assets/ui/icon-coins.png', reward: { type: 'coins', amount: 50  }, color: '#CD7F32', weight: 24 },
  { label: '1',   icon: '/assets/ui/icon-hint.png?v=2',  reward: { type: 'hints', amount: 1   }, color: '#8B5CF6', weight: 18 },
  { label: '100', icon: '/assets/ui/icon-coins.png', reward: { type: 'coins', amount: 100 }, color: '#C0C0C0', weight: 12 },
  { label: '150', icon: '/assets/ui/icon-coins.png', reward: { type: 'coins', amount: 150 }, color: '#3B82F6', weight: 8  },
  { label: '2',   icon: '/assets/ui/icon-hint.png?v=2',  reward: { type: 'hints', amount: 2   }, color: '#6D28D9', weight: 5  },
  { label: '300', icon: '/assets/ui/icon-coins.png', reward: { type: 'coins', amount: 300 }, color: '#F59E0B', weight: 3  },
  { label: '750', icon: '/assets/ui/icon-coins.png', reward: { type: 'coins', amount: 750 }, color: '#FFD700', weight: 2  },
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

        // Icône PNG si chargée, sinon fallback texte
        const img = imagesRef.current[seg.icon]
        const iconSize = 28
        const iconX = radius * 0.58
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.save()
          ctx.translate(iconX, 0)
          ctx.rotate(-midAngle) // garder l'icône droite
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

    // Précharger toutes les icônes uniques
    const uniqueIcons = [...new Set(SEGMENTS.map(s => s.icon))]
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

      // Appliquer la récompense via RPC (anonyme = localStorage, connecté = Supabase)
      const rpcDelta = { [seg.reward.type]: seg.reward.amount }
      applyCurrencyDelta?.(rpcDelta, `roulette_reward_${seg.reward.type}`)?.catch?.(e =>
        console.warn('[RouletteModal] reward RPC failed:', e?.message || e)
      )

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

        {/* Résultat */}
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

        {/* Bouton spin */}
        <button
          onClick={handleSpin}
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
