import { useState, useEffect, useRef } from 'react'

export default function SpotlightOverlay({ targetRef, text, onDismiss, shape = 'round', padding = 12 }) {
  const [hole, setHole] = useState(null)
  const [visible, setVisible] = useState(false)
  const bubbleRef = useRef(null)

  useEffect(() => {
    if (!targetRef?.current) return
    const el = targetRef.current
    const rect = el.getBoundingClientRect()
    setHole({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      w: rect.width + padding * 2,
      h: rect.height + padding * 2,
      top: rect.top - padding,
      left: rect.left - padding,
    })
    requestAnimationFrame(() => setVisible(true))
  }, [targetRef, padding])

  if (!hole) return null

  const radius = shape === 'round'
    ? Math.max(hole.w, hole.h) / 2
    : 0

  const bubbleTop = hole.top + hole.h + padding + 8
  const bubbleFlip = bubbleTop + 120 > window.innerHeight

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
        cursor: 'pointer',
      }}
    >
      {/* Overlay sombre avec trou */}
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {shape === 'round' ? (
              <circle cx={hole.x} cy={hole.y} r={radius} fill="black" />
            ) : (
              <rect
                x={hole.left} y={hole.top}
                width={hole.w} height={hole.h}
                rx={12} fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%" height="100%"
          fill="rgba(0,0,0,0.75)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Pulse sur la cible */}
      <div style={{
        position: 'absolute',
        left: hole.left, top: hole.top,
        width: hole.w, height: hole.h,
        borderRadius: shape === 'round' ? '50%' : 12,
        border: '2px solid rgba(255,255,255,0.6)',
        animation: 'spotlightPulse 1.5s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* Bulle texte */}
      <div
        ref={bubbleRef}
        style={{
          position: 'absolute',
          left: '50%', transform: 'translateX(-50%)',
          top: bubbleFlip ? hole.top - 80 : bubbleTop,
          background: 'white',
          borderRadius: 16,
          padding: '14px 20px',
          maxWidth: 300,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          fontFamily: 'Nunito, sans-serif',
          fontSize: 14,
          fontWeight: 700,
          color: '#1a1a2e',
          textAlign: 'center',
          lineHeight: 1.4,
        }}
      >
        {text}
        <div style={{
          marginTop: 8,
          fontSize: 12,
          color: 'rgba(0,0,0,0.4)',
          fontWeight: 400,
        }}>
          Tape pour continuer
        </div>
      </div>

      <style>{`
        @keyframes spotlightPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(255,255,255,0); }
        }
      `}</style>
    </div>
  )
}
