import { useState } from 'react'

// Shared hint flip card button — used by QuestionScreen and BlitzScreen
// isFree: true if this is a free hint, false if paid
// cost: 0 for free hints, number of coins for paid hints
// canAfford: player can use (has stock or can buy with coins)
// canUse: player can use this hint right now
// onBuyHint: callback when buying with coins (null if free)
// onReveal: callback when revealing the hint
export default function HintFlipButton({ num, hint, catColor, isFree, cost, canAfford, canUse, onReveal, onBuyHint }) {
  const [phase, setPhase] = useState('front') // 'front' | 'flip' | 'back'

  const disabled = !canAfford || !canUse
  const canBuyNow = !canUse && canAfford && !isFree && onBuyHint

  const handleClick = () => {
    if (phase !== 'front' || disabled) return
    // If buying, buy first
    if (canBuyNow && onBuyHint) {
      onBuyHint()
    }
    setPhase('flip')
    onReveal()
    setTimeout(() => setPhase('back'), 160)
  }

  const color = catColor || '#FF6B1A'

  // Front label depends on hint state
  let frontLabel
  if (isFree) {
    // Free hint
    frontLabel = (
      <span style={{ fontWeight: 900, fontSize: 13, color: '#ffffff', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
        <img src="/assets/ui/icon-hint.png" alt="indice" style={{ width: 14, height: 14, display: 'inline-block', verticalAlign: 'middle' }} />
        Indice
      </span>
    )
  } else if (canAfford) {
    // Paid hint, can afford
    frontLabel = (
      <span style={{ fontWeight: 900, fontSize: 12, color: '#ffffff', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}>
        <img src="/assets/ui/icon-hint.png" alt="indice" style={{ width: 14, height: 14, display: 'inline-block', verticalAlign: 'middle' }} />
        Indice {cost}
      </span>
    )
  } else {
    // Paid hint, cannot afford
    frontLabel = (
      <>
        <span style={{ fontWeight: 900, fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap', textDecoration: 'line-through', display: 'flex', alignItems: 'center', gap: 3 }}>
          <img src="/assets/ui/icon-hint.png" alt="indice" style={{ width: 14, height: 14, display: 'inline-block', verticalAlign: 'middle', opacity: 0.5 }} />
          Indice {cost}
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
          Pas assez
        </span>
      </>
    )
  }

  return (
    <button
      onClick={handleClick}
      style={{
        height: 48,
        width: '100%',
        borderRadius: 24,
        border: (disabled && phase !== 'back') ? '2px solid #6B7280' : `2px solid ${color}`,
        background: (disabled && phase !== 'back')
          ? 'rgba(107,114,128,0.15)'
          : phase === 'back' ? 'rgba(235,235,235,0.95)' : `${color}28`,
        transform: phase === 'flip' ? 'scaleY(0.08)' : 'scaleY(1)',
        transition: 'transform 0.15s ease, background 0.3s, border-color 0.3s',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 12px',
        cursor: (disabled && phase !== 'back') ? 'not-allowed' : 'pointer',
        pointerEvents: phase !== 'front' ? 'none' : 'auto',
        flexShrink: 0,
        opacity: (disabled && phase !== 'back') ? 0.55 : 1,
        gap: 1,
      }}
    >
      {phase !== 'back' ? (
        frontLabel
      ) : (
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#1a1a2e',
            textAlign: 'center',
            lineHeight: 1.35,
            wordBreak: 'break-word',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {hint || '—'}
        </span>
      )}
    </button>
  )
}
