import { useState } from 'react'
import { useScale } from '../hooks/useScale'
import { audio } from '../utils/audio'
import { TEXTS } from './onboardingConfig'

export default function WelcomeScreen({ onComplete }) {
  const S = useScale()
  const [visible, setVisible] = useState(true)

  const handleStart = () => {
    audio.play('click')
    setVisible(false)
    setTimeout(onComplete, 400)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#FF6B1A',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Nunito, sans-serif',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.4s ease',
      padding: S(24),
    }}>
      {/* Logo */}
      <img
        src="/assets/ui/wtf-logo.png?v=4"
        alt="WTF!"
        style={{
          width: S(140), height: 'auto',
          marginBottom: S(24),
          animation: 'welcomeBounce 0.6s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      />

      {/* Subtitle */}
      <p style={{
        color: 'white',
        fontSize: S(16),
        fontWeight: 700,
        textAlign: 'center',
        lineHeight: 1.5,
        maxWidth: S(300),
        whiteSpace: 'pre-line',
        margin: 0,
        opacity: 0.9,
      }}>
        {TEXTS.welcome.subtitle}
      </p>

      {/* CTA */}
      <button
        onClick={handleStart}
        style={{
          marginTop: S(40),
          padding: `${S(16)}px ${S(48)}px`,
          borderRadius: S(16),
          background: 'white',
          color: '#FF6B1A',
          border: 'none',
          fontWeight: 900,
          fontSize: S(18),
          cursor: 'pointer',
          fontFamily: 'Nunito, sans-serif',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        }}
      >
        {TEXTS.welcome.cta}
      </button>

      <style>{`
        @keyframes welcomeBounce {
          0% { transform: scale(0.3) rotate(-15deg); opacity: 0; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
