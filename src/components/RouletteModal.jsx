import { useState, useEffect, useRef } from 'react'
import CoinsIcon from './CoinsIcon'
import { usePlayerProfile } from '../hooks/usePlayerProfile'
import { readWtfData } from '../utils/storageHelper'
import { getVipFacts } from '../data/factsService'

const S = (px) => `calc(${px}px * var(--scale))`

// ── Configuration des segments ──────────────────────────────────────────────
// Le `weight` définit à la fois la taille du segment sur la roue ET la probabilité.
// Total des weights = 100 pour lire les % directement.
// Bloc 3.5 — ajustement T95 : avg coins/spin descendu de ~7,1 à ~5,4
//   5×26 + 8×18 + 15×10 + 30×4 = 130 + 144 + 150 + 120 = 544 / 100 = 5,44 coins/spin
const SEGMENTS = [
  { label: '5',     emoji: '🪙', reward: { type: 'coins',   amount: 5  }, color: '#FF6B1A', weight: 26 },
  { label: '1',     emoji: '💡', reward: { type: 'hints',   amount: 1  }, color: '#3B82F6', weight: 21 },
  { label: '8',     emoji: '🪙', reward: { type: 'coins',   amount: 8  }, color: '#F59E0B', weight: 18 },
  { label: '2',     emoji: '💡', reward: { type: 'hints',   amount: 2  }, color: '#8B5CF6', weight: 12 },
  { label: '15',    emoji: '🪙', reward: { type: 'coins',   amount: 15 }, color: '#EF4444', weight: 10 },
  { label: '1',     emoji: '🎟️', reward: { type: 'tickets', amount: 1  }, color: '#10B981', weight: 7  },
  { label: '30',    emoji: '🪙', reward: { type: 'coins',   amount: 30 }, color: '#EC4899', weight: 4  },
  { label: '🛡️',   emoji: '🛡️', reward: { type: 'freeze',  amount: 1  }, color: '#6366F1', weight: 1  },
  { label: 'VIP',   emoji: '⭐', reward: { type: 'vipFact', amount: 1  }, color: '#FFD700', weight: 1  },
]

const TOTAL_WEIGHT = SEGMENTS.reduce((sum, s) => sum + s.weight, 0)

// Précalcul des bornes angulaires de chaque segment (en degrés depuis 0 = haut)
function computeSegmentBounds() {
  let acc = 0
  return SEGMENTS.map(seg => {
    const start = (acc / TOTAL_WEIGHT) * 360
    acc += seg.weight
    const end = (acc / TOTAL_WEIGHT) * 360
    return { ...seg, startDeg: start, endDeg: end, midDeg: (start + end) / 2 }
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
  const [showProbas, setShowProbas] = useState(false)
  const canvasRef = useRef(null)
  // Phase A.6/A.7 — miroir Supabase
  const { applyCurrencyDelta, unlockFact } = usePlayerProfile()

  const isFree = !spinData.freeUsed

  // Dessiner la roue avec des segments proportionnels aux weights
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const size = canvas.width
    const center = size / 2
    const radius = center - 4

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
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.lineWidth = 2
      ctx.stroke()

      // Texte : angle mid du segment
      const midAngle = (startAngle + endAngle) / 2
      const segSpan = seg.endDeg - seg.startDeg
      ctx.save()
      ctx.translate(center, center)
      ctx.rotate(midAngle)
      ctx.textAlign = 'center'
      ctx.fillStyle = 'white'
      // Si le segment est très petit (<= 6°), on réduit la police
      if (segSpan <= 6) {
        ctx.font = 'bold 10px Nunito, sans-serif'
        ctx.fillText(seg.emoji, radius * 0.70, 2)
      } else if (segSpan <= 15) {
        ctx.font = 'bold 14px Nunito, sans-serif'
        ctx.fillText(seg.emoji, radius * 0.60, -4)
        ctx.font = 'bold 10px Nunito, sans-serif'
        ctx.fillText(seg.label, radius * 0.76, 10)
      } else {
        ctx.font = 'bold 16px Nunito, sans-serif'
        ctx.fillText(seg.emoji, radius * 0.55, 2)
        ctx.font = 'bold 12px Nunito, sans-serif'
        ctx.fillText(seg.label, radius * 0.76, 2)
      }
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
      applyCurrencyDelta?.({ coins: -EXTRA_SPIN_COST }, 'roulette_spin_paid')?.catch?.(e =>
        console.warn('[RouletteModal] spin cost RPC failed:', e?.message || e)
      )
    }

    setSpinning(true)
    setResult(null)

    const winIndex = pickSegment()
    const targetSeg = SEGMENT_BOUNDS[winIndex]
    // Vise le milieu du segment gagnant ; l'angle à atteindre est (360 - midDeg)
    // car la roue tourne vers la flèche fixée en haut.
    const targetAngle = 360 - targetSeg.midDeg
    const fullSpins = 5 + Math.floor(Math.random() * 3)
    const finalRotation = rotation + fullSpins * 360 + targetAngle - (rotation % 360)

    setRotation(finalRotation)

    setTimeout(() => {
      setSpinning(false)
      const seg = SEGMENTS[winIndex]
      setResult(seg)

      // Appliquer la récompense via RPC (anonyme = localStorage, connecté = Supabase)
      if (['coins', 'hints', 'tickets'].includes(seg.reward.type)) {
        const rpcDelta = { [seg.reward.type]: seg.reward.amount }
        applyCurrencyDelta?.(rpcDelta, `roulette_reward_${seg.reward.type}`)?.catch?.(e =>
          console.warn('[RouletteModal] reward RPC failed:', e?.message || e)
        )
      }
      else if (seg.reward.type === 'freeze') {
        const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
        wd.streakFreezeCount = (wd.streakFreezeCount || 0) + 1
        wd.lastModified = Date.now()
        localStorage.setItem('wtf_data', JSON.stringify(wd))
      } else if (seg.reward.type === 'vipFact') {
        // Débloquer un VIP random non possédé
        try {
          const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
          const owned = new Set(wd.unlockedFacts || [])
          const pool = getVipFacts().filter(f => !owned.has(f.id))
          if (pool.length > 0) {
            const vip = pool[Math.floor(Math.random() * pool.length)]
            owned.add(vip.id)
            wd.unlockedFacts = [...owned]
            // Phase A.7 : miroir Supabase
            unlockFact?.(vip.id, vip.category, 'roulette_reward_vip').catch(e =>
              console.warn('[RouletteModal] unlockFact RPC failed:', e?.message || e)
            )
          }
          wd.lastModified = Date.now()
          localStorage.setItem('wtf_data', JSON.stringify(wd))
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
    tickets: `+${result.reward.amount} ticket`,
    freeze: '+1 Streak Freeze',
    vipFact: '⭐ 1 f*ct VIP débloqué !',
  }[result.reward.type]

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
            background: result.reward.type === 'vipFact'
              ? 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,165,0,0.15))'
              : 'linear-gradient(135deg, rgba(255,107,26,0.1), rgba(255,165,0,0.1))',
            border: result.reward.type === 'vipFact' ? '1.5px solid rgba(255,215,0,0.5)' : '1.5px solid rgba(255,107,26,0.3)',
            borderRadius: 14,
            padding: '12px 16px', marginBottom: 16,
            animation: 'roulettePop 0.3s ease',
            boxShadow: result.reward.type === 'vipFact' ? '0 0 20px rgba(255,215,0,0.4)' : 'none',
          }}>
            <span style={{ fontSize: 28 }}>{result.emoji}</span>
            <div style={{ fontSize: 16, fontWeight: 900, color: result.reward.type === 'vipFact' ? '#B8860B' : '#FF6B1A', marginTop: 4 }}>
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

        {/* Toggle probabilités */}
        {!spinning && (
          <button
            onClick={() => setShowProbas(v => !v)}
            style={{
              marginTop: 10, background: 'transparent', border: 'none',
              fontSize: 11, fontWeight: 700, color: '#6B7280',
              cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
              textDecoration: 'underline',
            }}
          >
            {showProbas ? 'Masquer les probabilités' : '📊 Voir les probabilités'}
          </button>
        )}

        {/* Table des probabilités */}
        {showProbas && !spinning && (
          <div style={{
            marginTop: 8, padding: '10px 12px',
            background: '#F9FAFB', borderRadius: 12,
            border: '1px solid #E5E7EB',
            textAlign: 'left',
          }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Chances de gain
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {SEGMENTS.map((seg, i) => {
                const pct = (seg.weight / TOTAL_WEIGHT * 100).toFixed(seg.weight < 2 ? 1 : 0)
                const label = seg.reward.type === 'coins' ? `${seg.reward.amount} coins`
                  : seg.reward.type === 'hints' ? `${seg.reward.amount} indice${seg.reward.amount > 1 ? 's' : ''}`
                  : seg.reward.type === 'tickets' ? `${seg.reward.amount} ticket`
                  : seg.reward.type === 'freeze' ? 'Streak Freeze'
                  : '⭐ F*ct VIP'
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: seg.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, color: '#374151', fontWeight: 700 }}>{seg.emoji} {label}</span>
                    <span style={{
                      fontWeight: 900,
                      color: seg.reward.type === 'vipFact' ? '#B8860B' : '#6B7280',
                      fontVariantNumeric: 'tabular-nums',
                    }}>{pct}%</span>
                  </div>
                )
              })}
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
