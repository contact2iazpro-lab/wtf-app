import { useState, useMemo, useRef, useEffect } from 'react'
import {
  getFunnyFactsWithStatement,
  buildVraiOuFouSessionPool,
} from '../data/factsService'
import { shuffle } from '../utils/shuffle'
import { audio } from '../utils/audio'
import { useScale } from '../hooks/useScale'
import GameHeader from '../components/GameHeader'
import FallbackImage from '../components/FallbackImage'
import { CATEGORIES } from '../data/facts'

const SESSION_SIZE = 20
const SWIPE_THRESHOLD = 60
const FEEDBACK_MS = 1800
const MODE_COLOR = '#9B59B6'
const MODE_BG = 'linear-gradient(160deg, #2d0a4e 0%, #6a1a9a 100%)'
const SHARE_URL = 'https://wtf-app-production.up.railway.app/'

export default function VraiOuFouScreen({ onHome }) {
  const scale = useScale()
  const S = (px) => `calc(${px}px * var(--scale))`

  const [seed, setSeed] = useState(0)
  // Pool = 20 draws. On ne montre qu'UNE affirmation par draw, tirée au hasard
  // entre trueStatement et falseStatement (50/50 via draw.trueSide).
  const pool = useMemo(
    () => buildVraiOuFouSessionPool(shuffle(getFunnyFactsWithStatement()), SESSION_SIZE),
    [seed] // eslint-disable-line react-hooks/exhaustive-deps
  )
  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [drag, setDrag] = useState({ x: 0, active: false })
  // feedback: { correct: bool, pickedSide: 'left'|'right', trueSide: 'left'|'right' }
  const [feedback, setFeedback] = useState(null)
  const [done, setDone] = useState(false)
  const [showQuit, setShowQuit] = useState(false)
  const [shareMsg, setShareMsg] = useState(null)
  const [imgFailed, setImgFailed] = useState(false)
  const startX = useRef(0)
  const feedbackTimer = useRef(null)

  useEffect(() => () => clearTimeout(feedbackTimer.current), [])

  const draw = pool[index]
  const fact = draw?.fact

  // Deux affirmations côte à côte. trueSide désigne la carte (left/right) qui
  // contient l'affirmation VRAIE. Le joueur swipe vers la carte qu'il croit vraie.
  const leftText  = draw && (draw.trueSide === 'left'  ? draw.trueStatement : draw.falseStatement)
  const rightText = draw && (draw.trueSide === 'right' ? draw.trueStatement : draw.falseStatement)

  useEffect(() => {
    setImgFailed(false)
  }, [fact?.id])

  const cat = useMemo(
    () => (fact ? CATEGORIES.find(c => c.id === fact.category) : null),
    [fact]
  )

  // pickedSide : 'left' | 'right' — la carte que le joueur pense vraie
  const handlePick = (pickedSide) => {
    if (feedback || !draw) return
    const isCorrect = pickedSide === draw.trueSide
    setFeedback({ correct: isCorrect, pickedSide, trueSide: draw.trueSide })
    audio.play(isCorrect ? 'correct' : 'wrong_vof')

    if (isCorrect) setCorrect(c => c + 1)

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
    // Swipe vers la carte que le joueur pense vraie
    if (drag.x < -SWIPE_THRESHOLD) handlePick('left')
    else if (drag.x > SWIPE_THRESHOLD) handlePick('right')
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
    } catch { /* user canceled or no clipboard */ }
  }

  if (!draw && !done) {
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
          <p style={{ fontSize: S(11), opacity: 0.6, marginTop: S(12), fontStyle: 'italic' }}>
            🔒 Joue Quickie ou Quest pour débloquer vraiment ces f*cts
          </p>
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

  // ── Phase de jeu : 2 cartes côte à côte, swipe vers la carte qu'on croit vraie ──
  const dragIntensity = Math.min(Math.abs(drag.x) / SWIPE_THRESHOLD, 1)
  const leftHighlight  = !feedback && drag.x < -10
  const rightHighlight = !feedback && drag.x >  10
  const leftIsTrue  = draw && draw.trueSide === 'left'
  const rightIsTrue = draw && draw.trueSide === 'right'

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

      {/* Logo VoF */}
      <div style={{ textAlign: 'center', padding: `${S(10)} ${S(16)} ${S(2)}`, flexShrink: 0 }}>
        <img
          src="/assets/ui/vof-logo.png"
          alt="Vrai ou Fou"
          style={{ height: S(42), width: 'auto', display: 'inline-block', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }}
        />
      </div>

      {/* Compteur */}
      <div style={{ textAlign: 'center', padding: `${S(2)} 0 ${S(6)}`, flexShrink: 0 }}>
        <div style={{ fontSize: S(13), fontWeight: 800, color: 'rgba(255,255,255,0.7)', letterSpacing: 1 }}>
          {index + 1} / {pool.length}
        </div>
      </div>

      {/* Zone des 2 cartes côte à côte — swipable */}
      <div
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
        style={{
          display: 'flex', flexDirection: 'row', gap: S(8),
          padding: `${S(4)} ${S(14)} ${S(6)}`, flex: 1, minHeight: 0,
          userSelect: 'none', cursor: feedback ? 'default' : 'grab',
        }}
      >
        <StatementCard S={S} text={leftText}  side="left"  highlight={leftHighlight}  intensity={dragIntensity} feedback={feedback} isTrue={leftIsTrue} />
        <StatementCard S={S} text={rightText} side="right" highlight={rightHighlight} intensity={dragIntensity} feedback={feedback} isTrue={rightIsTrue} />
      </div>

      {/* Image floutée (preview locked) */}
      <div style={{ display: 'flex', justifyContent: 'center', flexShrink: 0, padding: `${S(6)} ${S(16)} ${S(16)}` }}>
        <div style={{
          position: 'relative',
          aspectRatio: '1 / 1',
          width: '100%',
          borderRadius: S(18),
          overflow: 'hidden',
          boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
        }}>
          {fact?.imageUrl && !imgFailed ? (
            <img
              src={fact.imageUrl}
              alt=""
              onError={() => setImgFailed(true)}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                filter: 'blur(18px) brightness(0.6)',
                transform: 'scale(1.15)',
              }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', filter: 'blur(14px) brightness(0.65)', transform: 'scale(1.1)' }}>
              <FallbackImage categoryColor={cat?.color || '#1a3a5c'} />
            </div>
          )}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: S(52),
            textShadow: '0 2px 10px rgba(0,0,0,0.7)',
          }}>
            🔒
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Carte d'affirmation — partagée gauche/droite
// ─────────────────────────────────────────────────────────────────────────
function StatementCard({ S, text, side, highlight, intensity, feedback, isTrue }) {
  const showingFeedback = !!feedback
  const wasPicked = showingFeedback && feedback.pickedSide === side

  let borderColor = 'rgba(255,255,255,0.2)'
  let borderWidth = 2
  let opacity = 1
  let transform = 'translateY(0) scale(1)'
  let badge = null

  if (showingFeedback) {
    if (isTrue) {
      borderColor = '#22C55E'
      borderWidth = 3
      badge = { text: '✓ VRAI', color: '#22C55E' }
    } else {
      opacity = wasPicked ? 0.9 : 0.45
      borderColor = wasPicked ? '#EF4444' : 'rgba(255,255,255,0.1)'
      borderWidth = wasPicked ? 3 : 2
      if (wasPicked) badge = { text: '✗ FAUX', color: '#EF4444' }
    }
    if (wasPicked) transform = 'translateY(0) scale(1.02)'
    else if (!isTrue) transform = 'translateY(0) scale(0.97)'
  } else if (highlight) {
    borderColor = 'rgba(255,255,255,0.95)'
    borderWidth = 3
    transform = `translateY(0) scale(${1 + 0.03 * intensity})`
  }

  return (
    <div
      style={{
        flex: 1,
        background: '#FAFAF8',
        borderRadius: S(18),
        border: `${borderWidth}px solid ${borderColor}`,
        padding: `${S(14)} ${S(12)}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        position: 'relative',
        opacity,
        transform,
        transition: 'transform 0.25s ease, opacity 0.25s ease, border-color 0.25s ease',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        minWidth: 0,
        minHeight: 0,
      }}
    >
      <p style={{
        color: '#1a1a2e', fontSize: S(15), fontWeight: 800, lineHeight: 1.35,
        overflow: 'hidden', display: '-webkit-box',
        WebkitLineClamp: 8, WebkitBoxOrient: 'vertical',
      }}>
        {text}
      </p>

      {badge && (
        <div style={{
          position: 'absolute', top: S(-10), left: '50%', transform: 'translateX(-50%)',
          background: badge.color, color: '#fff',
          padding: `${S(4)} ${S(12)}`, borderRadius: S(20),
          fontSize: S(11), fontWeight: 900, letterSpacing: '0.05em',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          whiteSpace: 'nowrap',
        }}>
          {badge.text}
        </div>
      )}
    </div>
  )
}
