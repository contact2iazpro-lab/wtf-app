import { useState } from 'react'

// Shared hint flip card button — used by QuestionScreen and BlitzScreen
// isFree: true if this is a free hint, false if paid
// cost: 0 for free hints, number of coins for paid hints
// canAfford: player can use (has stock or can buy with coins)
// canUse: player can use this hint right now
// onBuyHint: callback when buying with coins (null if free)
// onReveal: callback when revealing the hint
export default function HintFlipButton({ num, hint, catColor, isFree, cost, canAfford, canUse, needsBuy = false, onReveal, onBuyHint, initialRevealed = false, revealedTextColor }) {
  const [phase, setPhase] = useState(initialRevealed ? 'back' : 'front') // 'front' | 'flip' | 'back'

  const canBuyNow = (needsBuy || (!canUse && canAfford && !isFree)) && onBuyHint
  const disabled = !canAfford && !canUse

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
  const hintIcon = <img src="/assets/ui/icon-hint.png?v=2" alt="" style={{ width: 14, height: 14, display: 'inline-block', verticalAlign: 'middle', opacity: disabled ? 0.5 : 1 }} />
  let frontLabel
  if (needsBuy && canBuyNow) {
    // No stock but can buy with coins → show price
    frontLabel = (
      <span style={{ fontWeight: 900, fontSize: 12, color: '#ffffff', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}>
        {hintIcon} {cost} <img src="/assets/ui/icon-coins.png" alt="" style={{ width: 12, height: 12 }} />
      </span>
    )
  } else if (isFree || (canUse && !isFree)) {
    // Free hint OR paid hint with stock available → no price shown
    frontLabel = (
      <span style={{ fontWeight: 900, fontSize: 13, color: '#ffffff', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
        {hintIcon} Indice
      </span>
    )
  } else if (canBuyNow) {
    // No stock but can buy with coins → show price
    frontLabel = (
      <span style={{ fontWeight: 900, fontSize: 12, color: '#ffffff', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}>
        {hintIcon} {cost} <img src="/assets/ui/icon-coins.png" alt="" style={{ width: 12, height: 12 }} />
      </span>
    )
  } else {
    // Cannot afford at all
    frontLabel = (
      <>
        <span style={{ fontWeight: 900, fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}>
          {hintIcon} {cost} <img src="/assets/ui/icon-coins.png" alt="" style={{ width: 12, height: 12, opacity: 0.5 }} />
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
      ) : (() => {
        const h = hint || '—'
        const len = h.length
        const dynFontSize = len > 80 ? 11 : len > 55 ? 13 : len > 35 ? 15 : 18
        const dynLineClamp = len > 55 ? 4 : 3
        return (
          <span
            style={{
              fontSize: dynFontSize,
              fontWeight: 700,
              color: revealedTextColor || '#1a1a2e',
              textAlign: 'center',
              lineHeight: 1.3,
              wordBreak: 'break-word',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: dynLineClamp,
              WebkitBoxOrient: 'vertical',
              padding: '0 6px',
            }}
          >
            {h}
          </span>
        )
      })()}
    </button>
  )
}
