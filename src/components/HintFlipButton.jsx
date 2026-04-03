import { useState } from 'react'

// Shared hint flip card button — used by QuestionScreen and BlitzScreen
export default function HintFlipButton({ num, hint, catColor, hasStock, stockCount, onReveal }) {
  const [phase, setPhase] = useState('front') // 'front' | 'flip' | 'back'

  const disabled = !hasStock

  const handleClick = () => {
    if (phase !== 'front' || disabled) return
    setPhase('flip')
    onReveal()
    setTimeout(() => setPhase('back'), 160)
  }

  const color = catColor || '#FF6B1A'
  const labelColor = '#ffffff'

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
          : phase === 'back' ? 'rgba(255,255,255,0.88)' : `${color}28`,
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
        disabled ? (
          <>
            <span style={{ fontWeight: 900, fontSize: 12, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
              Indice
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
              Stock épuisé
            </span>
          </>
        ) : (
          <span style={{ fontWeight: 900, fontSize: 13, color: labelColor, whiteSpace: 'nowrap' }}>
            Indice ({stockCount})
          </span>
        )
      ) : (
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: color,
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
