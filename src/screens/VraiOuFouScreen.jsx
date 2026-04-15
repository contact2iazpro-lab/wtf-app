import { useState, useMemo, useRef, useEffect } from 'react'
import { getFunnyFactsWithStatement } from '../data/factsService'
import { shuffle } from '../utils/shuffle'
import { audio } from '../utils/audio'
import { useScale } from '../hooks/useScale'
import GameHeader from '../components/GameHeader'

const SESSION_SIZE = 20
const SWIPE_THRESHOLD = 80

export default function VraiOuFouScreen({ onHome }) {
  const scale = useScale()
  const S = (px) => `calc(${px}px * var(--scale))`

  const pool = useMemo(() => shuffle(getFunnyFactsWithStatement()).slice(0, SESSION_SIZE), [])
  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [drag, setDrag] = useState({ x: 0, active: false })
  const [flash, setFlash] = useState(null)
  const [done, setDone] = useState(false)
  const [showQuit, setShowQuit] = useState(false)
  const startX = useRef(0)
  const flashTimer = useRef(null)

  useEffect(() => () => clearTimeout(flashTimer.current), [])

  const fact = pool[index]

  const handleAnswer = (userSaysTrue) => {
    if (flash || !fact) return
    const isCorrect = userSaysTrue === fact.statementIsTrue
    setFlash({ correct: isCorrect, dir: userSaysTrue ? 'right' : 'left' })
    audio.play(isCorrect ? 'correct' : 'buzzer')
    flashTimer.current = setTimeout(() => {
      if (isCorrect) setCorrect(c => c + 1)
      if (index + 1 >= pool.length) {
        setDone(true)
      } else {
        setIndex(i => i + 1)
        setFlash(null)
        setDrag({ x: 0, active: false })
      }
    }, 450)
  }

  const onPointerDown = (e) => {
    if (flash) return
    startX.current = e.clientX ?? e.touches?.[0]?.clientX ?? 0
    setDrag({ x: 0, active: true })
  }
  const onPointerMove = (e) => {
    if (!drag.active || flash) return
    const x = (e.clientX ?? e.touches?.[0]?.clientX ?? 0) - startX.current
    setDrag({ x, active: true })
  }
  const onPointerUp = () => {
    if (!drag.active || flash) return
    if (drag.x > SWIPE_THRESHOLD) handleAnswer(true)
    else if (drag.x < -SWIPE_THRESHOLD) handleAnswer(false)
    else setDrag({ x: 0, active: false })
  }

  // Pool vide
  if (!fact && !done) {
    return (
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#1a0a2e', color: '#fff', fontFamily: 'Nunito, sans-serif', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🤔</div>
          <p style={{ fontSize: 18, fontWeight: 900 }}>Vrai ou Fou indisponible</p>
          <p style={{ fontSize: 13, opacity: 0.7, marginTop: 10, lineHeight: 1.5 }}>
            Aucune affirmation disponible pour le moment.
          </p>
          <button onClick={onHome} style={{ marginTop: 28, padding: '14px 36px', background: '#FF6B1A', color: '#fff', border: 'none', borderRadius: 16, fontWeight: 900, fontSize: 15, cursor: 'pointer' }}>
            Retour
          </button>
        </div>
      </div>
    )
  }

  // Fin
  if (done) {
    return (
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #2d0a4e 0%, #6a1a9a 100%)', color: '#fff', fontFamily: 'Nunito, sans-serif', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 72, marginBottom: 8 }}>🤔</div>
          <p style={{ fontSize: 14, opacity: 0.7, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>Score final</p>
          <div style={{ fontSize: 96, fontWeight: 900, lineHeight: 1, margin: '12px 0 8px' }}>
            {correct}<span style={{ fontSize: 40, opacity: 0.5 }}>/{pool.length}</span>
          </div>
          <p style={{ fontSize: 15, opacity: 0.85, marginBottom: 32 }}>
            {correct === pool.length ? 'Parfait 🔥' : correct >= pool.length * 0.75 ? 'Bien joué !' : 'Tu peux mieux faire.'}
          </p>
          <button onClick={onHome} style={{ padding: '14px 40px', background: '#FF6B1A', color: '#fff', border: 'none', borderRadius: 16, fontWeight: 900, fontSize: 15, cursor: 'pointer' }}>
            Retour
          </button>
        </div>
      </div>
    )
  }

  const rotate = drag.x * 0.08
  const opacity = Math.min(Math.abs(drag.x) / SWIPE_THRESHOLD, 1)
  const flashDir = flash?.dir
  const cardX = flash ? (flashDir === 'right' ? 500 : -500) : drag.x

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden"
      style={{ '--scale': scale, background: 'linear-gradient(160deg, #2d0a4e 0%, #6a1a9a 100%)', fontFamily: 'Nunito, sans-serif' }}
    >
      {showQuit && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full rounded-3xl p-6 mx-4" style={{ background: '#FAFAF8', maxWidth: 360 }}>
            <div className="text-2xl text-center mb-3">🤔</div>
            <h2 className="font-black text-lg text-center mb-2" style={{ color: '#1a1a2e' }}>Quitter Vrai ou Fou ?</h2>
            <p className="text-sm text-center mb-6" style={{ color: '#6B7280' }}>Tes réponses seront perdues.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => setShowQuit(false)} className="w-full py-4 rounded-2xl font-black text-base" style={{ background: '#FF6B1A', color: 'white' }}>Continuer</button>
              <button onClick={onHome} className="w-full py-3 rounded-2xl font-bold text-sm" style={{ background: '#F3F4F6', color: '#6B7280' }}>Quitter</button>
            </div>
          </div>
        </div>
      )}

      <GameHeader categoryLabel="Vrai ou Fou" categoryColor="#9B59B6" onQuit={() => setShowQuit(true)} />

      <div style={{ textAlign: 'center', padding: `${S(12)} 0 ${S(4)}`, flexShrink: 0 }}>
        <div style={{ fontSize: S(14), fontWeight: 800, color: 'rgba(255,255,255,0.7)', letterSpacing: 1 }}>
          {index + 1} / {pool.length}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 min-h-0">
        <div
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onTouchStart={onPointerDown}
          onTouchMove={onPointerMove}
          onTouchEnd={onPointerUp}
          style={{
            width: '100%', maxWidth: S(340), minHeight: S(320),
            background: '#FAFAF8', borderRadius: S(24),
            padding: S(28), display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: `translateX(${cardX}px) rotate(${flash ? 0 : rotate}deg)`,
            transition: flash || !drag.active ? 'transform 0.35s ease' : 'none',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            position: 'relative', userSelect: 'none', cursor: 'grab',
          }}
        >
          <p style={{ color: '#1a1a2e', fontSize: S(18), fontWeight: 800, textAlign: 'center', lineHeight: 1.4 }}>
            {fact.statement}
          </p>

          {drag.x > 20 && (
            <div style={{ position: 'absolute', top: S(20), right: S(20), padding: `${S(6)} ${S(14)}`, border: `3px solid #22C55E`, borderRadius: S(10), color: '#22C55E', fontWeight: 900, fontSize: S(18), opacity, transform: 'rotate(12deg)' }}>
              VRAI
            </div>
          )}
          {drag.x < -20 && (
            <div style={{ position: 'absolute', top: S(20), left: S(20), padding: `${S(6)} ${S(14)}`, border: `3px solid #EF4444`, borderRadius: S(10), color: '#EF4444', fontWeight: 900, fontSize: S(18), opacity, transform: 'rotate(-12deg)' }}>
              FAUX
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 px-6 pb-6" style={{ flexShrink: 0 }}>
        <button
          onClick={() => handleAnswer(false)}
          disabled={!!flash}
          style={{ flex: 1, padding: `${S(16)} 0`, borderRadius: S(16), border: '2px solid #EF4444', background: 'rgba(239,68,68,0.2)', color: '#fff', fontWeight: 900, fontSize: S(15) }}
        >
          ← FAUX
        </button>
        <button
          onClick={() => handleAnswer(true)}
          disabled={!!flash}
          style={{ flex: 1, padding: `${S(16)} 0`, borderRadius: S(16), border: '2px solid #22C55E', background: 'rgba(34,197,94,0.2)', color: '#fff', fontWeight: 900, fontSize: S(15) }}
        >
          VRAI →
        </button>
      </div>
    </div>
  )
}
