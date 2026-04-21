import { useState, useEffect } from 'react'

const S = (px) => `calc(${px}px * var(--scale))`

export default function OnboardingToast({ icon, message, cta, onCta, onDismiss, delay = 600 }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onDismiss?.(), 400)
    }, 8000)
    return () => clearTimeout(t)
  }, [visible, onDismiss])

  return (
    <div style={{
      position: 'fixed', bottom: S(90), left: S(16), right: S(16),
      zIndex: 9000,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(20px)',
      transition: 'opacity 0.4s ease, transform 0.4s ease',
      pointerEvents: visible ? 'auto' : 'none',
    }}>
      <div style={{
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
        borderRadius: S(16), padding: `${S(14)} ${S(16)}`,
        display: 'flex', alignItems: 'center', gap: S(12),
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        fontFamily: 'Nunito, sans-serif',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        {icon && <span style={{ fontSize: S(28), flexShrink: 0 }}>{icon}</span>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: 'white', fontSize: S(13), fontWeight: 700, margin: 0, lineHeight: 1.4 }}>
            {message}
          </p>
        </div>
        {cta && onCta && (
          <button
            onClick={() => { onCta(); onDismiss?.() }}
            style={{
              flexShrink: 0, padding: `${S(8)} ${S(14)}`,
              borderRadius: S(10), border: 'none',
              background: '#FF6B1A', color: 'white',
              fontWeight: 900, fontSize: S(11),
              cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
              whiteSpace: 'nowrap',
            }}
          >
            {cta}
          </button>
        )}
        <button
          onClick={() => { setVisible(false); setTimeout(() => onDismiss?.(), 400) }}
          style={{
            flexShrink: 0, width: S(24), height: S(24),
            borderRadius: '50%', border: 'none',
            background: 'rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.6)', fontSize: S(12),
            cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
        >✕</button>
      </div>
    </div>
  )
}
