import { useState, useEffect, useRef } from 'react'
import CoinsIcon from './CoinsIcon'
import { updateCoins, updateHints, updateTickets } from '../services/currencyService'
import { readWtfData } from '../utils/storageHelper'

const S = (px) => `calc(${px}px * var(--scale))`

// ── Configuration des segments ──────────────────────────────────────────────
const SEGMENTS = [
  { label: '5',    emoji: '🪙', reward: { type: 'coins',   amount: 5  }, color: '#FF6B1A', weight: 25 },
  { label: '1',    emoji: '💡', reward: { type: 'hints',   amount: 1  }, color: '#3B82F6', weight: 20 },
  { label: '10',   emoji: '🪙', reward: { type: 'coins',   amount: 10 }, color: '#F59E0B', weight: 18 },
  { label: '2',    emoji: '💡', reward: { type: 'hints',   amount: 2  }, color: '#8B5CF6', weight: 12 },
  { label: '20',   emoji: '🪙', reward: { type: 'coins',   amount: 20 }, color: '#EF4444', weight: 10 },
  { label: '1',    emoji: '🎟️', reward: { type: 'tickets', amount: 1  }, color: '#10B981', weight: 8  },
  { label: '50',   emoji: '🪙', reward: { type: 'coins',   amount: 50 }, color: '#EC4899', weight: 5  },
  { label: '🛡️',  emoji: '🛡️', reward: { type: 'freeze',  amount: 1  }, color: '#6366F1', weight: 2  },
]

const TOTAL_WEIGHT = SEGMENTS.reduce((sum, s) => sum + s.weight, 0)

function pickSegment() {
  let r = Math.random() * TOTAL_WEIGHT
  for (let i = 0; i < SEGMENTS.length; i++) {
    r -= SEGMENTS[i].weight
    if (r <= 0) return i
  }
  return 0
}

const EXTRA_SPIN_COST = 10

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
  const canvasRef = useRef(null)

  const isFree = !spinData.freeUsed
  const segmentAngle = 360 / SEGMENTS.length

  // Dessiner la roue
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const size = canvas.width
    const center = size / 2
    const radius = center - 4

    ctx.clearRect(0, 0, size, size)

    SEGMENTS.forEach((seg, i) => {
      const startAngle = (i * segmentAngle - 90) * Math.PI / 180
      const endAngle = ((i + 1) * segmentAngle - 90) * Math.PI / 180

      ctx.beginPath()
      ctx.moveTo(center, center)
      ctx.arc(center, center, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = seg.color
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'
      ctx.lineWidth = 2
      ctx.stroke()

      // Texte
      ctx.save()
      ctx.translate(center, center)
      ctx.rotate((startAngle + endAngle) / 2)
      ctx.textAlign = 'center'
      ctx.fillStyle = 'white'
      ctx.font = 'bold 16px Nunito, sans-serif'
      ctx.fillText(seg.emoji, radius * 0.55, 2)
      ctx.font = 'bold 12px Nunito, sans-serif'
      ctx.fillText(seg.label, radius * 0.75, 2)
      ctx.restore()
    })

    // Centre
    ctx.beginPath()
    ctx.arc(center, center, 18, 0, Math.PI * 2)
    ctx.fillStyle = 'white'
    ctx.fill()
    ctx.strokeStyle = '#E5E7EB'
    ctx.lineWidth = 2
    ctx.stroke()
  }, [])

  const handleSpin = () => {
    if (spinning) return

    // Vérifier le coût
    if (!isFree) {
      const wd = readWtfData()
      if ((wd.wtfCoins || 0) < EXTRA_SPIN_COST) return
      updateCoins(-EXTRA_SPIN_COST)
    }

    setSpinning(true)
    setResult(null)

    const winIndex = pickSegment()
    const targetAngle = 360 - (winIndex * segmentAngle + segmentAngle / 2)
    const fullSpins = 5 + Math.floor(Math.random() * 3)
    const finalRotation = rotation + fullSpins * 360 + targetAngle - (rotation % 360)

    setRotation(finalRotation)

    setTimeout(() => {
      setSpinning(false)
      const seg = SEGMENTS[winIndex]
      setResult(seg)

      // Appliquer la récompense
      if (seg.reward.type === 'coins') updateCoins(seg.reward.amount)
      else if (seg.reward.type === 'hints') updateHints(seg.reward.amount)
      else if (seg.reward.type === 'tickets') updateTickets(seg.reward.amount)
      else if (seg.reward.type === 'freeze') {
        const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
        wd.streakFreezeCount = (wd.streakFreezeCount || 0) + 1
        wd.lastModified = Date.now()
        localStorage.setItem('wtf_data', JSON.stringify(wd))
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
    tickets: `+${result.reward.amount} ticket`,
    freeze: '+1 Streak Freeze',
  }[result.reward.type]

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, '--scale': scale }}
      onClick={!spinning ? onClose : undefined}
    >
      <div
        style={{ background: 'white', borderRadius: 24, padding: 24, maxWidth: 340, width: '100%', textAlign: 'center', fontFamily: 'Nunito, sans-serif' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1a1a2e', margin: '0 0 4px' }}>
          🎰 Roulette du jour
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
            background: 'linear-gradient(135deg, rgba(255,107,26,0.1), rgba(255,165,0,0.1))',
            border: '1.5px solid rgba(255,107,26,0.3)', borderRadius: 14,
            padding: '12px 16px', marginBottom: 16,
            animation: 'roulettePop 0.3s ease',
          }}>
            <span style={{ fontSize: 28 }}>{result.emoji}</span>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#FF6B1A', marginTop: 4 }}>
              {rewardLabel}
            </div>
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
