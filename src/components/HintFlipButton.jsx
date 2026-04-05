import { useState } from 'react'

// Shared hint flip card button — used by QuestionScreen and BlitzScreen
// hasStock: player has hints in stock
// stockCount: number of hints (or string like 'gratuit')
// canBuyWithCoins: player has >= 5 coins to buy a hint
// onBuyHint: callback when buying with coins (null if not applicable)
export default function HintFlipButton({ num, hint, catColor, hasStock, stockCount, canBuyWithCoins, onReveal, onBuyHint }) {
  const [phase, setPhase] = useState('front') // 'front' | 'flip' | 'back'

  const canUse = hasStock || canBuyWithCoins
  const disabled = !canUse

  const handleClick = () => {
    if (phase !== 'front' || disabled) return
    // If no stock but can buy with coins, buy first
    if (!hasStock && canBuyWithCoins && onBuyHint) {
      onBuyHint()
    }
    setPhase('flip')
    onReveal()
    setTimeout(() => setPhase('back'), 160)
  }

  const color = catColor || '#FF6B1A'

  // Front label depends on stock state
  let frontLabel
  if (hasStock) {
    frontLabel = (
      <span style={{ fontWeight: 900, fontSize: 13, color: '#ffffff', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
        💡 {stockCount}
      </span>
    )
  } else if (canBuyWithCoins) {
    frontLabel = (
      <span style={{ fontWeight: 900, fontSize: 12, color: '#ffffff', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}>
        Indice 5 🪙
      </span>
    )
  } else {
    frontLabel = (
      <>
        <span style={{ fontWeight: 900, fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap', textDecoration: 'line-through', display: 'flex', alignItems: 'center', gap: 3 }}>
          Indice 5 🪙
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
