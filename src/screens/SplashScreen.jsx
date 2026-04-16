import { useState, useEffect, useRef } from 'react'
import { useScale } from '../hooks/useScale'
import { version } from '../../package.json'
import { audio } from '../utils/audio'

const S = (px) => `calc(${px}px * var(--scale))`

export default function SplashScreen({ onComplete, isReady }) {
  const [logoVisible, setLogoVisible] = useState(false)
  const [taglineVisible, setTaglineVisible] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)
  const [showLoading, setShowLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [forceReady, setForceReady] = useState(false)
  const scale = useScale()
  const timers = useRef([])

  // Débloquer l'AudioContext au premier geste utilisateur (cold load)
  useEffect(() => {
    const unlock = () => {
      try { audio.play('click') } catch { /* ignore */ }
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('touchstart', unlock)
    }
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('touchstart', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('touchstart', unlock)
    }
  }, [])

  // Animations d'entrée (logo + tagline) + son "What the fact" sur la tagline
  useEffect(() => {
    const t1 = setTimeout(() => setLogoVisible(true), 100)
    const t2 = setTimeout(() => {
      setTaglineVisible(true)
      try { audio.playFile('What the fact.mp3') } catch { /* ignore */ }
    }, 700)
    const t3 = setTimeout(() => setMinTimeElapsed(true), 3000)
    const t4 = setTimeout(() => {
      if (!isReady) setShowLoading(true)
    }, 2000)
    // Progression simulée
    const p1 = setTimeout(() => setLoadingProgress(20), 200)
    const p2 = setTimeout(() => setLoadingProgress(45), 500)
    const p3 = setTimeout(() => setLoadingProgress(65), 900)
    const p4 = setTimeout(() => setLoadingProgress(80), 1400)
    const p5 = setTimeout(() => setLoadingProgress(90), 2000)
    const tForce = setTimeout(() => {
      console.warn('Splash timeout: forcing transition without facts')
      setForceReady(true)
    }, 8000)
    timers.current = [t1, t2, t3, t4, p1, p2, p3, p4, p5, tForce]
    return () => timers.current.forEach(clearTimeout)
  }, [])

  // Quand isReady → 100%
  useEffect(() => {
    if (isReady) setLoadingProgress(100)
  }, [isReady])

  // Appeler onComplete quand les 2 conditions sont remplies
  useEffect(() => {
    if (minTimeElapsed && (isReady || forceReady)) {
      setFadeOut(true)
      const t = setTimeout(() => onComplete(), 500)
      return () => clearTimeout(t)
    }
  }, [minTimeElapsed, isReady, forceReady, onComplete])

  return (
    <div style={{
      height: '100%',
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
        src="/assets/ui/wtf-logo.png?v=4"
        alt="WTF!"
        style={{
          width: 160,
          height: 'auto',
          objectFit: 'contain',
          transition: 'transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease',
          opacity: logoVisible ? 1 : 0,
          transform: logoVisible
            ? 'scale(1) rotate(0deg)'
            : 'scale(0.2) rotate(-20deg)',
        }}
      />
      <img
        src="/assets/ui/vof-logo.png?v=4"
        alt="Vrai ou fou ?"
        style={{
          width: 200,
          height: 'auto',
          objectFit: 'contain',
          marginTop: S(20),
          transition: 'opacity 0.5s ease, transform 0.5s ease',
          opacity: taglineVisible ? 1 : 0,
          transform: taglineVisible ? 'translateY(0)' : 'translateY(24px)',
        }}
      />

      {/* Barre de progression — même fade que la tagline */}
      <div style={{
        width: '70%',
        marginTop: S(24),
        transition: 'opacity 0.5s ease, transform 0.5s ease',
        opacity: taglineVisible && !minTimeElapsed ? 1 : 0,
        transform: taglineVisible ? 'translateY(0)' : 'translateY(24px)',
      }}>
        <div style={{
          width: '100%',
          height: S(8),
          background: 'rgba(255,255,255,0.25)',
          borderRadius: S(4),
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${loadingProgress}%`,
            background: 'white',
            borderRadius: S(4),
            transition: 'width 0.3s ease',
          }} />
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: S(9),
            fontWeight: 900,
            color: loadingProgress > 50 ? '#FF6B1A' : 'white',
            fontFamily: 'Nunito, sans-serif',
            whiteSpace: 'nowrap',
          }}>
            {loadingProgress}%
          </div>
        </div>
      </div>

      {/* Version */}
      <span style={{
        position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
        color: 'white', opacity: 0.5, fontSize: 12,
        fontFamily: 'Nunito, sans-serif', fontWeight: 700,
      }}>
        v{version}
      </span>
    </div>
  )
}
