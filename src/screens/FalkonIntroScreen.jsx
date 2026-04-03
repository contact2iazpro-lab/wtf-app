import { useState, useEffect } from 'react'

export default function FalkonIntroScreen({ onComplete }) {
  const [phase, setPhase] = useState('in') // in → visible → out → done

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('visible'), 500)
    const t2 = setTimeout(() => setPhase('out'), 1500)
    const t3 = setTimeout(() => onComplete(), 2000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onComplete])

  const opacity = phase === 'in' ? 0 : phase === 'out' ? 0 : 1
  const scale = phase === 'in' ? 0.95 : phase === 'out' ? 0.95 : 1

  return (
    <div style={{
      height: '100%', width: '100%',
      background: '#0a0a0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <img
        src="/assets/ui/falkon-logo.png?v=2"
        alt="Falkon Games"
        style={{
          width: 200, height: 'auto',
          objectFit: 'contain',
          opacity,
          transform: `scale(${scale})`,
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}
      />
    </div>
  )
}
