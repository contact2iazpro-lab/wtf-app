import { useState, useEffect, useRef } from 'react'
import { useScale } from '../hooks/useScale'

const S = (px) => `calc(${px}px * var(--scale))`

export default function SplashScreen({ onComplete }) {
  const [logoVisible, setLogoVisible] = useState(false)
  const [taglineVisible, setTaglineVisible] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)
  const scale = useScale()
  const timers = useRef([])

  useEffect(() => {
    const t1 = setTimeout(() => setLogoVisible(true), 100)
    const t2 = setTimeout(() => setTaglineVisible(true), 700)
    const t3 = setTimeout(() => setFadeOut(true), 2400)
    const t4 = setTimeout(() => onComplete(), 2900)
    timers.current = [t1, t2, t3, t4]
    return () => timers.current.forEach(clearTimeout)
  }, [onComplete])

  return (
    <div style={{
      height: '100vh',
      width: '100%',
      background: '#FF6B1A',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      '--scale': scale,
      transition: fadeOut ? 'opacity 0.5s ease' : 'none',
      opacity: fadeOut ? 0 : 1,
    }}>
      <img
        src="/logo-wtf.png"
        alt="WTF!"
        style={{
          width: S(180),
          height: S(180),
          objectFit: 'contain',
          transition: 'transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease',
          opacity: logoVisible ? 1 : 0,
          transform: logoVisible
            ? 'scale(1) rotate(0deg)'
            : 'scale(0.2) rotate(-20deg)',
        }}
      />
      <span style={{
        fontFamily: 'Nunito, sans-serif',
        fontWeight: 900,
        fontSize: S(32),
        color: 'white',
        marginTop: S(20),
        letterSpacing: S(1),
        transition: 'opacity 0.5s ease, transform 0.5s ease',
        opacity: taglineVisible ? 1 : 0,
        transform: taglineVisible ? 'translateY(0)' : 'translateY(24px)',
      }}>
        Vrai ou Fou ?
      </span>
    </div>
  )
}
