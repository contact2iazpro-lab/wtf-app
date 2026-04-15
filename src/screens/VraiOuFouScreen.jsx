import { useState, useMemo, useRef, useEffect } from 'react'
import { getFunnyFactsWithStatement } from '../data/factsService'
import { shuffle } from '../utils/shuffle'
import { audio } from '../utils/audio'
import { useScale } from '../hooks/useScale'
import { usePlayerProfile } from '../hooks/usePlayerProfile'
import GameHeader from '../components/GameHeader'
import renderFormattedText from '../utils/renderFormattedText'

const SESSION_SIZE = 20
const SWIPE_THRESHOLD = 80
const FEEDBACK_MS = 1600
const MODE_COLOR = '#9B59B6'
const MODE_BG = 'linear-gradient(160deg, #2d0a4e 0%, #6a1a9a 100%)'
const SHARE_URL = 'https://wtf-app-production.up.railway.app/'

export default function VraiOuFouScreen({ onHome }) {
  const scale = useScale()
  const S = (px) => `calc(${px}px * var(--scale))`
  const { unlockFact } = usePlayerProfile()

  const [seed, setSeed] = useState(0) // bump to replay
  const pool = useMemo(
    () => shuffle(getFunnyFactsWithStatement()).slice(0, SESSION_SIZE),
    [seed] // eslint-disable-line react-hooks/exhaustive-deps
  )
  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [drag, setDrag] = useState({ x: 0, active: false })
  const [feedback, setFeedback] = useState(null) // { correct, dir, fact }
  const [done, setDone] = useState(false)
  const [showQuit, setShowQuit] = useState(false)
  const [shareMsg, setShareMsg] = useState(null)
  const startX = useRef(0)
  const feedbackTimer = useRef(null)

  useEffect(() => () => clearTimeout(feedbackTimer.current), [])

  const fact = pool[index]

  const handleAnswer = (userSaysTrue) => {
    if (feedback || !fact) return
    const isCorrect = userSaysTrue === fact.statementIsTrue
    setFeedback({ correct: isCorrect, dir: userSaysTrue ? 'right' : 'left', fact })
    audio.play(isCorrect ? 'correct' : 'wrong')

    if (isCorrect) {
      setCorrect(c => c + 1)
      unlockFact?.(fact.id, fact.category, 'vrai_ou_fou_unlock')?.catch?.(e =>
        console.warn('[VraiOuFou] unlockFact failed:', e?.message || e)
      )
    }

    feedbackTimer.current = setTimeout(() => {
      if (index + 1 >= pool.length) {
        setDone(true)
      } else {
        setIndex(i => i + 1)
        setFeedback(null)
        setDrag({ x: 0, active: false })
      }
    }, FEEDBACK_MS)
  }

  const onPointerDown = (e) => {
    if (feedback) return
    startX.current = e.clientX ?? e.touches?.[0]?.clientX ?? 0
    setDrag({ x: 0, active: true })
  }
  const onPointerMove = (e) => {
    if (!drag.active || feedback) return
    const x = (e.clientX ?? e.touches?.[0]?.clientX ?? 0) - startX.current
    setDrag({ x, active: true })
  }
  const onPointerUp = () => {
    if (!drag.active || feedback) return
    if (drag.x > SWIPE_THRESHOLD) handleAnswer(true)
    else if (drag.x < -SWIPE_THRESHOLD) handleAnswer(false)
    else setDrag({ x: 0, active: false })
  }

  const handleReplay = () => {
    audio.play('click')
    setIndex(0)
    setCorrect(0)
    setFeedback(null)
    setDrag({ x: 0, active: false })
    setDone(false)
    setSeed(s => s + 1)
  }

  const handleShare = async () => {
    audio.play('click')
    const text = `J'ai eu ${correct}/${pool.length} au Vrai ou Fou WTF! Et toi ?`
    const url = SHARE_URL
    try {
      if (navigator.share) {
        await navigator.share({ title: 'WTF! — Vrai ou Fou', text, url })
        return
      }
      await navigator.clipboard.writeText(`${text} ${url}`)
      setShareMsg('Lien copié !')
      setTimeout(() => setShareMsg(null), 1800)
    } catch {
      /* user canceled or no clipboard */
    }
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

  // Écran résultats
  if (done) {
    const total = pool.length
    const pct = Math.round((correct / total) * 100)
    const verdict =
      correct === total ? { emoji: '🔥', line: 'Perfect ! Tu es une machine.' } :
      correct >= total * 0.8 ? { emoji: '🎯', line: 'Excellent score !' } :
      correct >= total * 0.5 ? { emoji: '👍', line: 'Pas mal, tu peux mieux.' } :
      { emoji: '😅', line: 'Aïe… retente ta chance !' }

    return (
      <div
        className="absolute inset-0 flex flex-col"
        style={{ '--scale': scale, background: MODE_BG, color: '#fff', fontFamily: 'Nunito, sans-serif', padding: `${S(24)} ${S(20)}` }}
      >
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: S(72), marginBottom: S(4), lineHeight: 1 }}>{verdict.emoji}</div>
          <p style={{ fontSize: S(12), opacity: 0.65, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 800 }}>Score final</p>
          <div style={{ fontSize: S(96), fontWeight: 900, lineHeight: 1, margin: `${S(8)} 0 ${S(4)}` }}>
            {correct}<span style={{ fontSize: S(40), opacity: 0.5 }}>/{total}</span>
          </div>
          <p style={{ fontSize: S(14), opacity: 0.85, marginBottom: S(8) }}>{pct}% de bonnes réponses</p>
          <p style={{ fontSize: S(15), fontWeight: 700, opacity: 0.9 }}>{verdict.line}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: S(10), flexShrink: 0, position: 'relative' }}>
          <button
            onClick={handleShare}
            className="active:scale-95 transition-transform"
            style={{
              padding: `${S(16)} 0`, borderRadius: S(16),
              background: '#25D366', color: '#fff', border: 'none',
              fontWeight: 900, fontSize: S(15), letterSpacing: '0.02em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(8),
              cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
              boxShadow: '0 4px 16px rgba(37,211,102,0.4)',
            }}
          >
            📣 PARTAGER MON SCORE
          </button>
          <button
            onClick={handleReplay}
            className="active:scale-95 transition-transform"
            style={{
              padding: `${S(16)} 0`, borderRadius: S(16),
              background: '#FF6B1A', color: '#fff', border: 'none',
              fontWeight: 900, fontSize: S(15),
              cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
            }}
          >
            🔄 REJOUER
          </button>
          <button
            onClick={onHome}
            className="active:scale-95 transition-transform"
            style={{
              padding: `${S(14)} 0`, borderRadius: S(16),
              background: 'rgba(255,255,255,0.12)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              fontWeight: 800, fontSize: S(13),
              cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
            }}
          >
            Accueil
          </button>
          {shareMsg && (
            <div style={{
              position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
              marginBottom: S(8), padding: `${S(6)} ${S(12)}`, borderRadius: S(8),
              background: 'rgba(0,0,0,0.8)', fontSize: S(12), fontWeight: 700,
            }}>{shareMsg}</div>
          )}
        </div>
      </div>
    )
  }

  const rotate = drag.x * 0.08
  const dragOpacity = Math.min(Math.abs(drag.x) / SWIPE_THRESHOLD, 1)
  const cardX = feedback ? (feedback.dir === 'right' ? 500 : -500) : drag.x

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden"
      style={{ '--scale': scale, background: MODE_BG, fontFamily: 'Nunito, sans-serif' }}
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

      <GameHeader categoryLabel="Vrai ou Fou" categoryColor={MODE_COLOR} onQuit={() => setShowQuit(true)} />

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
            width: '100%', maxWidth: S(340), minHeight: S(340),
            background: '#FAFAF8', borderRadius: S(24),
            padding: S(24), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            transform: `translateX(${cardX}px) rotate(${feedback ? 0 : rotate}deg)`,
            transition: feedback || !drag.active ? 'transform 0.35s ease' : 'none',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            position: 'relative', userSelect: 'none', cursor: 'grab',
          }}
        >
          {!feedback && (
            <p style={{ color: '#1a1a2e', fontSize: S(18), fontWeight: 800, textAlign: 'center', lineHeight: 1.4 }}>
              {fact.statement}
            </p>
          )}

          {feedback && (
            <div style={{ width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: S(10) }}>
              <div style={{
                display: 'inline-block', alignSelf: 'center',
                padding: `${S(6)} ${S(16)}`, borderRadius: S(12),
                background: feedback.correct ? '#22C55E' : '#EF4444',
                color: '#fff', fontWeight: 900, fontSize: S(14), letterSpacing: '0.05em',
              }}>
                {feedback.correct ? '✓ BIEN VU !' : '✗ RATÉ !'}
              </div>
              <p style={{ color: '#1a1a2e', fontSize: S(14), fontWeight: 800, lineHeight: 1.35 }}>
                {feedback.fact.statement}
              </p>
              <div style={{ height: 1, background: 'rgba(0,0,0,0.1)', margin: `${S(2)} 0` }} />
              <p style={{ color: feedback.fact.statementIsTrue ? '#059669' : '#DC2626', fontSize: S(12), fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {feedback.fact.statementIsTrue ? 'C\'était VRAI' : 'C\'était FAUX'}
              </p>
              {(feedback.fact.explanation || feedback.fact.answer) && (
                <p style={{ color: '#374151', fontSize: S(12), fontWeight: 600, lineHeight: 1.4 }}>
                  {renderFormattedText(feedback.fact.explanation || feedback.fact.answer)}
                </p>
              )}
            </div>
          )}

          {!feedback && drag.x > 20 && (
            <div style={{ position: 'absolute', top: S(20), right: S(20), padding: `${S(6)} ${S(14)}`, border: `3px solid #22C55E`, borderRadius: S(10), color: '#22C55E', fontWeight: 900, fontSize: S(18), opacity: dragOpacity, transform: 'rotate(12deg)' }}>
              VRAI
            </div>
          )}
          {!feedback && drag.x < -20 && (
            <div style={{ position: 'absolute', top: S(20), left: S(20), padding: `${S(6)} ${S(14)}`, border: `3px solid #EF4444`, borderRadius: S(10), color: '#EF4444', fontWeight: 900, fontSize: S(18), opacity: dragOpacity, transform: 'rotate(-12deg)' }}>
              FAUX
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 px-6 pb-6" style={{ flexShrink: 0 }}>
        <button
          onClick={() => handleAnswer(false)}
          disabled={!!feedback}
          style={{ flex: 1, padding: `${S(16)} 0`, borderRadius: S(16), border: '2px solid #EF4444', background: 'rgba(239,68,68,0.2)', color: '#fff', fontWeight: 900, fontSize: S(15), cursor: feedback ? 'default' : 'pointer' }}
        >
          ← FAUX
        </button>
        <button
          onClick={() => handleAnswer(true)}
          disabled={!!feedback}
          style={{ flex: 1, padding: `${S(16)} 0`, borderRadius: S(16), border: '2px solid #22C55E', background: 'rgba(34,197,94,0.2)', color: '#fff', fontWeight: 900, fontSize: S(15), cursor: feedback ? 'default' : 'pointer' }}
        >
          VRAI →
        </button>
      </div>
    </div>
  )
}
