import { useState, useEffect, useRef } from 'react'
import { usePlayerProfile } from '../hooks/usePlayerProfile'
import { readWtfData } from '../utils/storageHelper'
import { getVipFacts } from '../data/factsService'
import { addQuickieEnergy } from '../services/energyService'
import { audio } from '../utils/audio'
import EnergyIcon from './icons/EnergyIcon'
import { CATEGORIES } from '../data/facts'

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
// Energy = emoji-lightning.png. Les 3 segments sans asset PNG (factUnlock,
// freeSpin, streakFreeze) utilisent un `emoji` rendu via ctx.fillText en
// lieu et place de l'icône — le label devient le nombre du gain (1).
const SEGMENTS = [
  { label: '20',  icon: '/assets/ui/icon-coins.png',      reward: { type: 'coins', amount: 20  }, color: '#9CA3AF', weight: 22 }, // gris
  { label: '50',  icon: '/assets/ui/icon-coins.png',      reward: { type: 'coins', amount: 50  }, color: '#F97316', weight: 18 }, // orange
  { label: '1',   icon: '/assets/ui/icon-hint.png?v=2',   reward: { type: 'hints', amount: 1   }, color: '#8B5CF6', weight: 14 }, // violet — 1 indice
  { label: '100', icon: '/assets/ui/icon-coins.png',      reward: { type: 'coins', amount: 100 }, color: '#3B82F6', weight: 10 }, // bleu
  { label: '1',   icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M13 2L4 14h7l-1 8 9-12h-7l1-8z' fill='%2322C55E' stroke='%2322C55E' stroke-width='1' stroke-linejoin='round' stroke-linecap='round'/%3E%3C/svg%3E", reward: { type: 'energy', amount: 1 },  color: '#EAB308', weight: 8  }, // jaune — 1 énergie
  { label: '150', icon: '/assets/ui/icon-coins.png',      reward: { type: 'coins', amount: 150 }, color: '#22C55E', weight: 7  }, // vert
  { label: '1',   icon: '/assets/ui/wtf-logo.png',         reward: { type: 'factUnlock', amount: 1 },    color: '#14B8A6', weight: 4 }, // turquoise — 1 f*ct débloqué
  { label: '2',   icon: '/assets/ui/icon-hint.png?v=2',   reward: { type: 'hints', amount: 2   }, color: '#EC4899', weight: 4  }, // fuchsia — 2 indices
  { label: '1',   icon: '/assets/ui/emoji-roulette.png',  reward: { type: 'freeSpin', amount: 1 },      color: '#F472B6', weight: 5 }, // rose pâle — 1 relance gratuite
  { label: '300', icon: '/assets/ui/icon-coins.png',      reward: { type: 'coins', amount: 300 }, color: '#06B6D4', weight: 3  }, // cyan
  { label: '1',   icon: null, emoji: '🛡️',               reward: { type: 'streakFreeze', amount: 1 }, color: '#6366F1', weight: 3 }, // indigo — 1 streak freeze
  { label: '750', icon: '/assets/ui/icon-coins.png',      reward: { type: 'coins', amount: 750 }, color: '#EF4444', weight: 2  }, // rouge — jackpot
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
  const nextFree = !!wd.rouletteNextFree
  const spinsToday = wd.rouletteSpinsToday || 0
  return { freeUsed, nextFree, spinsToday, today }
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
  const { coins, applyCurrencyDelta, unlockFact } = usePlayerProfile()

  const [unlockedFact, setUnlockedFact] = useState(null)
  const isFree = !spinData.freeUsed || spinData.nextFree

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

        // Icône PNG si disponible, sinon emoji rendu en texte, sinon rien.
        const img = seg.icon ? imagesRef.current[seg.icon] : null
        const iconSize = 20 // réduit de 28 → 20 (spec 19/04/2026)
        const iconX = radius * 0.58
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.save()
          ctx.translate(iconX, 0)
          ctx.rotate(-midAngle)
          ctx.drawImage(img, -iconSize / 2, -iconSize / 2, iconSize, iconSize)
          ctx.restore()
        } else if (seg.emoji) {
          ctx.save()
          ctx.translate(iconX, 0)
          ctx.rotate(-midAngle)
          ctx.font = 'bold 20px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(seg.emoji, 0, 1)
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

    // Vérifier le coût — consommer le flag nextFree si présent
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
    // Consommer le flag nextFree
    if (spinData.nextFree) {
      try {
        const wd0 = JSON.parse(localStorage.getItem('wtf_data') || '{}')
        delete wd0.rouletteNextFree
        wd0.lastModified = Date.now()
        localStorage.setItem('wtf_data', JSON.stringify(wd0))
      } catch { /* ignore */ }
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

      // Son de gain : jackpot pour 300/750 coins et factUnlock, sinon win
      const isJackpot = (seg.reward.type === 'coins' && seg.reward.amount >= 300) || seg.reward.type === 'factUnlock'
      audio.play(isJackpot ? 'roulette_jackpot' : 'roulette_win')

      // Appliquer la récompense selon le type (20/04/2026)
      if (seg.reward.type === 'coins' || seg.reward.type === 'hints') {
        applyCurrencyDelta?.({ [seg.reward.type]: seg.reward.amount }, `roulette_reward_${seg.reward.type}`)?.catch?.(e =>
          console.warn('[RouletteModal] reward RPC failed:', e?.message || e)
        )
      } else if (seg.reward.type === 'energy') {
        addQuickieEnergy(seg.reward.amount)
        window.dispatchEvent(new Event('wtf_energy_updated'))
      } else if (seg.reward.type === 'factUnlock') {
        const wd0 = JSON.parse(localStorage.getItem('wtf_data') || '{}')
        const unlocked = new Set(wd0.unlockedFacts || [])
        const candidates = getVipFacts().filter(f => !unlocked.has(f.id))
        if (candidates.length > 0) {
          const pick = candidates[Math.floor(Math.random() * candidates.length)]
          unlockFact?.(pick.id, pick.category, 'roulette_reward_fact')?.catch?.(() => {})
          setUnlockedFact(pick)
        } else {
          applyCurrencyDelta?.({ coins: 50 }, 'roulette_reward_fact_fallback')?.catch?.(() => {})
        }
      } else if (seg.reward.type === 'freeSpin') {
        try {
          const wd0 = JSON.parse(localStorage.getItem('wtf_data') || '{}')
          wd0.rouletteNextFree = true
          wd0.lastModified = Date.now()
          localStorage.setItem('wtf_data', JSON.stringify(wd0))
        } catch { /* ignore */ }
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
    energy: `+${result.reward.amount} énergie`,
    factUnlock: unlockedFact ? 'Nouveau f*ct débloqué !' : 'Tu as déjà tous les f*cts ! +50 coins',
    freeSpin: 'Relance gratuite !',
    streakFreeze: '+1 Streak Freeze',
  }[result.reward.type]
  const isJackpotResult = result && result.reward.type === 'coins' && result.reward.amount >= 300
  const isFactResult = result && result.reward.type === 'factUnlock' && unlockedFact
  const factCat = isFactResult ? CATEGORIES.find(c => c.id === unlockedFact.category) : null

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
        {result && !spinning && !isFactResult && (
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
            {result.reward.type === 'energy' ? (
              <EnergyIcon size={36} color="#22C55E" />
            ) : result.icon ? (
              <img src={result.icon} alt="" style={{ width: 36, height: 36 }} />
            ) : (
              <span style={{ fontSize: 36 }}>{result.emoji || '🎁'}</span>
            )}
            <div style={{ fontSize: 16, fontWeight: 900, color: isJackpotResult ? '#B8860B' : '#FF6B1A', marginTop: 4 }}>
              {rewardLabel}
            </div>
          </div>
        )}

        {/* Résultat spécial : fact débloqué — overlay doré style VIP surprise */}
        {result && !spinning && isFactResult && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,165,0,0.1))',
            border: '2px solid rgba(255,215,0,0.5)',
            borderRadius: 16, padding: '16px 14px', marginBottom: 16,
            animation: 'roulettePop 0.4s ease',
            boxShadow: '0 0 24px rgba(255,215,0,0.3)',
            textAlign: 'center',
          }}>
            <div style={{
              animation: 'vipSurprisePopInline 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            }}>
              <img src="/assets/ui/wtf-star.png" alt="" style={{ width: 40, height: 40, margin: '0 auto 8px', display: 'block', filter: 'drop-shadow(0 0 12px rgba(255,215,0,0.7))' }} />
              <div style={{ fontSize: 15, fontWeight: 900, color: '#B8860B', marginBottom: 6 }}>
                Nouveau f*ct débloqué !
              </div>
            </div>
            <div style={{
              background: 'white', borderRadius: 12, padding: '12px 10px',
              border: '1.5px solid rgba(255,215,0,0.3)',
            }}>
              {factCat && (
                <div style={{ fontSize: 11, fontWeight: 700, color: factCat.color, marginBottom: 4 }}>
                  {factCat.emoji} {factCat.label}
                </div>
              )}
              <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a2e', lineHeight: 1.4 }}>
                {unlockedFact.question}
              </div>
              <div style={{
                marginTop: 8, fontSize: 13, fontWeight: 900,
                color: '#22C55E', background: 'rgba(34,197,94,0.1)',
                borderRadius: 8, padding: '6px 10px', display: 'inline-block',
              }}>
                {unlockedFact.shortAnswer || unlockedFact.short_answer}
              </div>
            </div>
          </div>
        )}

        {/* Pas assez de coins */}
        {notEnough && (
          <div style={{ fontSize: 13, fontWeight: 700, color: '#EF4444', marginBottom: 8, animation: 'roulettePop 0.3s ease' }}>
            Pas assez de WTFCoins !
          </div>
        )}

        {/* Bouton spin — lance directement */}
        <button
          onClick={() => {
            if (spinning) return
            if (!isFree && (coins ?? 0) < EXTRA_SPIN_COST) {
              setNotEnough(true)
              setTimeout(() => setNotEnough(false), 2000)
              return
            }
            handleSpin()
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
        @keyframes vipSurprisePopInline {
          0%   { transform: scale(0.3) rotate(-10deg); opacity: 0; }
          25%  { transform: scale(1.15) rotate(3deg); opacity: 1; }
          45%  { transform: scale(0.95) rotate(-1deg); }
          60%  { transform: scale(1) rotate(0deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
      `}</style>
    </div>
  )
}
