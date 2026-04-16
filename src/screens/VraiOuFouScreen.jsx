import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  getFunnyFactsWithStatement,
  buildVraiOuFouSessionPool,
} from '../data/factsService'
import { shuffle } from '../utils/shuffle'
import { audio } from '../utils/audio'
import { useScale } from '../hooks/useScale'
import { usePlayerProfile } from '../hooks/usePlayerProfile'
import GameHeader from '../components/GameHeader'
import CircularTimer from '../components/CircularTimer'
import FallbackImage from '../components/FallbackImage'
import RevelationScreen from './RevelationScreen'
import { CATEGORIES } from '../data/facts'

const SESSION_SIZE = 20
const SWIPE_THRESHOLD = 60
const WRONG_DELAY_MS = 1200
const VOF_GREEN = '#6BCB77'
const VOF_RED = '#E84535'
const UNLOCK_COST = 25
const TIMER_DURATION = 15
const SHARE_URL = 'https://wtf-app-production.up.railway.app/'

function lerpColor(ratio) {
  const r1 = 0xE8, g1 = 0x45, b1 = 0x35
  const r2 = 0x6B, g2 = 0xCB, b2 = 0x77
  const r = Math.round(r1 + (r2 - r1) * ratio)
  const g = Math.round(g1 + (g2 - g1) * ratio)
  const b = Math.round(b1 + (b2 - b1) * ratio)
  return `rgb(${r},${g},${b})`
}

export default function VraiOuFouScreen({ onHome }) {
  const scale = useScale()
  const S = (px) => `calc(${px}px * var(--scale))`
  const { coins: _cCoins, unlockFact, applyCurrencyDelta } = usePlayerProfile()

  const [seed, setSeed] = useState(0)
  const pool = useMemo(
    () => buildVraiOuFouSessionPool(shuffle(getFunnyFactsWithStatement()), SESSION_SIZE),
    [seed] // eslint-disable-line react-hooks/exhaustive-deps
  )
  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [drag, setDrag] = useState({ x: 0, active: false })
  const [feedback, setFeedback] = useState(null) // null | { correct: bool }
  const [done, setDone] = useState(false)
  const [showQuit, setShowQuit] = useState(false)
  const [shareMsg, setShareMsg] = useState(null)
  const [imgFailed, setImgFailed] = useState(false)

  // Revelation (bonne réponse)
  const [showReveal, setShowReveal] = useState(false)
  const [revealFact, setRevealFact] = useState(null)

  // Unlock
  const [unlockedIds, setUnlockedIds] = useState(new Set())

  const startX = useRef(0)
  const feedbackTimer = useRef(null)

  const trueIsGreen = useMemo(
    () => pool.map(() => Math.random() < 0.5),
    [pool]
  )

  useEffect(() => () => clearTimeout(feedbackTimer.current), [])

  const draw = pool[index]
  const fact = draw?.fact

  useEffect(() => { setImgFailed(false) }, [fact?.id])

  const cat = useMemo(
    () => (fact ? CATEGORIES.find(c => c.id === fact.category) : null),
    [fact]
  )
  const catBg = cat?.color || '#1a3a5c'

  // Côte à côte : left = anciennement "top", right = anciennement "bottom"
  const leftIsTrue = draw && draw.trueSide === 'left'
  const leftText = draw && (leftIsTrue ? draw.trueStatement : draw.falseStatement)
  const rightText = draw && (!leftIsTrue ? draw.trueStatement : draw.falseStatement)

  const currentTrueIsGreen = trueIsGreen[index]
  const leftIsGreen = leftIsTrue ? currentTrueIsGreen : !currentTrueIsGreen
  const rightIsGreen = !leftIsGreen

  const advanceToNext = useCallback(() => {
    if (index + 1 >= pool.length) {
      setDone(true)
    } else {
      setIndex(i => i + 1)
      setFeedback(null)
      setDrag({ x: 0, active: false })
    }
  }, [index, pool.length])

  const handlePick = useCallback((pickedGreenAsTrue) => {
    if (feedback || !draw) return
    const isCorrect = pickedGreenAsTrue === currentTrueIsGreen

    setFeedback({ correct: isCorrect })
    audio.play(isCorrect ? 'correct' : 'wrong_vof')
    if (isCorrect) setCorrect(c => c + 1)

    if (isCorrect) {
      // Bonne réponse → afficher revelation
      feedbackTimer.current = setTimeout(() => {
        setRevealFact(draw)
        setShowReveal(true)
      }, 600)
    } else {
      // Mauvaise réponse → pas de révélation, passe à la suivante
      feedbackTimer.current = setTimeout(() => {
        advanceToNext()
      }, WRONG_DELAY_MS)
    }
  }, [feedback, draw, currentTrueIsGreen, advanceToNext])

  const handleRevealNext = () => {
    setShowReveal(false)
    setRevealFact(null)
    advanceToNext()
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
    // Swipe droite → choisir la carte droite, swipe gauche → carte gauche
    if (drag.x > SWIPE_THRESHOLD) handlePick(rightIsGreen)
    else if (drag.x < -SWIPE_THRESHOLD) handlePick(leftIsGreen)
    else setDrag({ x: 0, active: false })
  }

  // Unlock via bouton sur l'image — même flow que Quickie/RevelationScreen
  const handleUnlockConfirm = async () => {
    if (!fact || _cCoins < UNLOCK_COST) return

    applyCurrencyDelta?.({ coins: -UNLOCK_COST }, 'unlock_fact_vof')?.catch?.(e =>
      console.warn('[VOF] unlock currency failed:', e?.message || e)
    )
    unlockFact?.(fact.id, fact.category, 'unlock_fact_vof').catch(e =>
      console.warn('[VOF] unlockFact RPC failed:', e?.message || e)
    )
    try {
      const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      const unlocked = wd.unlockedFacts || []
      if (!unlocked.includes(fact.id)) unlocked.push(fact.id)
      wd.unlockedFacts = unlocked
      wd.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(wd))
      window.dispatchEvent(new Event('wtf_storage_sync'))
    } catch { /* ignore */ }

    setUnlockedIds(prev => { const n = new Set(prev); n.add(fact.id); return n })
    audio.play?.('correct')
    // Ouvrir la revelation après unlock
    setRevealFact({ fact, trueStatement: fact.statementTrue })
    setShowReveal(true)
  }

  const handleTimeout = useCallback(() => {
    if (feedback || !draw) return
    setFeedback({ correct: false })
    audio.play('wrong_vof')
    feedbackTimer.current = setTimeout(() => {
      advanceToNext()
    }, WRONG_DELAY_MS)
  }, [feedback, draw, advanceToNext])

  const handleReplay = () => {
    audio.play('click')
    setIndex(0); setCorrect(0); setFeedback(null); setDrag({ x: 0, active: false })
    setDone(false); setShowReveal(false); setRevealFact(null)
    setSeed(s => s + 1)
  }

  const handleShare = async () => {
    audio.play('click')
    const text = `J'ai eu ${correct}/${pool.length} au Vrai ou Fou WTF! Et toi ?`
    try {
      if (navigator.share) { await navigator.share({ title: 'WTF! — Vrai ou Fou', text, url: SHARE_URL }); return }
      await navigator.clipboard.writeText(`${text} ${SHARE_URL}`)
      setShareMsg('Lien copié !')
      setTimeout(() => setShareMsg(null), 1800)
    } catch { /* canceled */ }
  }

  // ── Écran indisponible ──
  if (!draw && !done) {
    return (
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#1a0a2e', color: '#fff', fontFamily: 'Nunito, sans-serif', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🤔</div>
          <p style={{ fontSize: 18, fontWeight: 900 }}>Vrai ou Fou indisponible</p>
          <p style={{ fontSize: 13, opacity: 0.7, marginTop: 10, lineHeight: 1.5 }}>Aucune affirmation disponible pour le moment.</p>
          <button onClick={onHome} style={{ marginTop: 28, padding: '14px 36px', background: '#FF6B1A', color: '#fff', border: 'none', borderRadius: 16, fontWeight: 900, fontSize: 15, cursor: 'pointer' }}>Retour</button>
        </div>
      </div>
    )
  }

  // ── Revelation screen — réutilise RevelationScreen commun ──
  if (showReveal && revealFact) {
    const rFact = revealFact.fact || revealFact
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', '--scale': scale }}>
        <RevelationScreen
          fact={rFact}
          isCorrect={true}
          selectedAnswer={0}
          pointsEarned={0}
          hintsUsed={0}
          onNext={handleRevealNext}
          onQuit={handleRevealNext}
          factIndex={index}
          totalFacts={pool.length}
          gameMode="vrai_ou_fou"
          sessionScore={0}
          sessionType="vrai_ou_fou"
          correctAnswer={revealFact.trueStatement || rFact.statementTrue}
        />
      </div>
    )
  }

  // ── Résultats ──
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
        style={{ '--scale': scale, background: `linear-gradient(160deg, ${VOF_GREEN}88, ${VOF_GREEN})`, color: '#fff', fontFamily: 'Nunito, sans-serif', padding: `${S(24)} ${S(20)}` }}
      >
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: S(72), marginBottom: S(4), lineHeight: 1 }}>{verdict.emoji}</div>
          <p style={{ fontSize: S(12), opacity: 0.65, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 800 }}>Score final</p>
          <div style={{ fontSize: S(96), fontWeight: 900, lineHeight: 1, margin: `${S(8)} 0 ${S(4)}` }}>
            <span style={{ color: lerpColor(correct / total) }}>{correct}</span>
            <span style={{ fontSize: S(40), color: VOF_GREEN }}>/{total}</span>
          </div>
          <p style={{ fontSize: S(14), opacity: 0.85, marginBottom: S(8) }}>{pct}% de bonnes réponses</p>
          <p style={{ fontSize: S(15), fontWeight: 700, opacity: 0.9 }}>{verdict.line}</p>
          <p style={{ fontSize: S(11), opacity: 0.6, marginTop: S(12), fontStyle: 'italic' }}>
            🔒 Joue Quickie ou Quest pour débloquer vraiment ces f*cts
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: S(10), flexShrink: 0, position: 'relative' }}>
          <button onClick={handleShare} className="active:scale-95 transition-transform" style={{
            padding: `${S(16)} 0`, borderRadius: S(16), background: '#25D366', color: '#fff', border: 'none',
            fontWeight: 900, fontSize: S(15), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(8),
            cursor: 'pointer', fontFamily: 'Nunito, sans-serif', boxShadow: '0 4px 16px rgba(37,211,102,0.4)',
          }}>
            📣 PARTAGER MON SCORE
          </button>
          <button onClick={handleReplay} className="active:scale-95 transition-transform" style={{
            padding: `${S(16)} 0`, borderRadius: S(16), background: VOF_RED, color: '#fff', border: 'none',
            fontWeight: 900, fontSize: S(15), cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
          }}>
            🔄 REJOUER
          </button>
          <button onClick={onHome} className="active:scale-95 transition-transform" style={{
            padding: `${S(14)} 0`, borderRadius: S(16), background: 'rgba(255,255,255,0.12)', color: '#fff',
            border: '1px solid rgba(255,255,255,0.2)', fontWeight: 800, fontSize: S(13), cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
          }}>
            Accueil
          </button>
          {shareMsg && (
            <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
              marginBottom: S(8), padding: `${S(6)} ${S(12)}`, borderRadius: S(8), background: 'rgba(0,0,0,0.8)', fontSize: S(12), fontWeight: 700,
            }}>{shareMsg}</div>
          )}
        </div>
      </div>
    )
  }

  // ── Phase de jeu ──
  const dragIntensity = Math.min(Math.abs(drag.x) / SWIPE_THRESHOLD, 1)
  const swipingRight = !feedback && drag.x > 10
  const swipingLeft = !feedback && drag.x < -10
  const isRevealed = unlockedIds.has(fact?.id)
  const counterColor = correct === 0 ? VOF_RED : lerpColor(correct / pool.length)

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden"
      style={{ '--scale': scale, background: `linear-gradient(160deg, ${catBg}88, ${catBg})`, fontFamily: 'Nunito, sans-serif' }}
    >
      {/* Modal quitter */}
      {showQuit && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full rounded-3xl p-6 mx-4" style={{ background: '#FAFAF8', maxWidth: 360 }}>
            <div className="text-2xl text-center mb-3">🤔</div>
            <h2 className="font-black text-lg text-center mb-2" style={{ color: '#1a1a2e' }}>Quitter Vrai ou Fou ?</h2>
            <p className="text-sm text-center mb-6" style={{ color: '#6B7280' }}>Tes réponses seront perdues.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => setShowQuit(false)} className="w-full py-4 rounded-2xl font-black text-base" style={{ background: VOF_GREEN, color: 'white' }}>Continuer</button>
              <button onClick={onHome} className="w-full py-3 rounded-2xl font-bold text-sm" style={{ background: '#F3F4F6', color: '#6B7280' }}>Quitter</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <GameHeader
        categoryLabel={cat?.label || 'Vrai ou Fou'}
        categoryColor={catBg}
        categoryIcon={cat?.id ? `/assets/categories/${cat.id}.png` : null}
        onQuit={() => setShowQuit(true)}
      />

      {/* Mode label + progression N/20 — sur une seule ligne */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(8), flexShrink: 0, padding: `0 ${S(16)} ${S(2)}` }}>
        <span style={{
          fontSize: S(12), fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase',
          color: VOF_GREEN, textShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}>
          VRAI OU FOU
        </span>
        <span style={{ fontSize: S(12), fontWeight: 900, color: '#ffffff', opacity: 0.7 }}>—</span>
        <span style={{ fontSize: S(13), fontWeight: 900, letterSpacing: 1 }}>
          <span style={{ color: counterColor }}>{index + 1}</span>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>/{pool.length}</span>
        </span>
      </div>

      {/* Barre de progression */}
      <div style={{ padding: `0 ${S(16)}`, flexShrink: 0 }}>
        <div style={{ height: S(4), borderRadius: S(2), background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: S(2),
            background: VOF_GREEN,
            width: `${((index + 1) / pool.length) * 100}%`,
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {/* Zone centrale : 2 propositions côte à côte — swipe ou clic direct */}
      <div
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
        style={{
          flex: 0, display: 'flex', gap: S(10),
          padding: `${S(10)} ${S(16)} 0`,
          userSelect: 'none', cursor: feedback ? 'default' : 'grab',
        }}
      >
        {/* Proposition gauche — clic = pick green si leftIsGreen, sinon pick not-green */}
        <VOFCard S={S} text={leftText} isTrue={leftIsTrue} feedback={feedback}
          swiping={swipingLeft} dragIntensity={dragIntensity} side="left"
          onClick={() => handlePick(leftIsGreen)} />

        {/* Proposition droite */}
        <VOFCard S={S} text={rightText} isTrue={!leftIsTrue} feedback={feedback}
          swiping={swipingRight} dragIntensity={dragIntensity} side="right"
          onClick={() => handlePick(rightIsGreen)} />
      </div>

      {/* Image + Timer — même layout que Quickie (space-evenly) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly' }}>
        {/* Image floutée + cadenas */}
        <div style={{
          position: 'relative', width: '55%', aspectRatio: '1 / 1',
          borderRadius: S(12), overflow: 'hidden',
          border: `3px solid ${isRevealed ? '#4CAF50' : '#ffffff'}`,
          boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
          background: 'rgba(0,0,0,0.3)', flexShrink: 0,
        }}>
          {fact?.imageUrl && !imgFailed ? (
            <img src={fact.imageUrl} alt="" onError={() => setImgFailed(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', filter: isRevealed ? 'none' : 'blur(18px) brightness(0.6)', transform: isRevealed ? 'none' : 'scale(1.15)' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', filter: isRevealed ? 'none' : 'blur(14px) brightness(0.65)', transform: isRevealed ? 'none' : 'scale(1.1)' }}>
              <FallbackImage categoryColor={catBg} />
            </div>
          )}
          {!isRevealed && (
            <>
              <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.35)', zIndex: 1 }} />
              <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ zIndex: 5, gap: S(10) }}>
                <span style={{ fontSize: S(48), filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}>🔒</span>
                <button
                  onClick={() => {
                    if (_cCoins < UNLOCK_COST) return
                    handleUnlockConfirm()
                  }}
                  className="btn-press active:scale-95"
                  style={{
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                    border: '2px solid rgba(255,255,255,0.5)',
                    borderRadius: S(12), padding: `${S(8)} ${S(16)}`,
                    color: _cCoins >= UNLOCK_COST ? '#ffffff' : '#9CA3AF',
                    fontWeight: 800, fontSize: S(13),
                    cursor: _cCoins >= UNLOCK_COST ? 'pointer' : 'not-allowed',
                    opacity: _cCoins >= UNLOCK_COST ? 1 : 0.6,
                    display: 'flex', alignItems: 'center', gap: S(6),
                  }}
                >
                  🔓 Débloquer — {UNLOCK_COST} <img src="/assets/ui/icon-coins.png" alt="" style={{ width: S(14), height: S(14) }} />
                </button>
              </div>
            </>
          )}
          {isRevealed && (
            <div style={{ position: 'absolute', bottom: S(8), right: S(8), zIndex: 5, background: 'transparent', border: '2px solid #4CAF50', borderRadius: S(6), padding: `${S(3)} ${S(8)}`, pointerEvents: 'none' }}>
              <span style={{ fontSize: S(10), fontWeight: 900, color: '#4CAF50', letterSpacing: '0.04em' }}>Unlocked !</span>
            </div>
          )}
        </div>

        {/* Timer */}
        <div style={{ width: S(96), height: S(96), display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <CircularTimer
            key={`vof-${index}-${seed}`}
            size={96}
            duration={TIMER_DURATION}
            onTimeout={handleTimeout}
            paused={!!feedback}
            variant="vof"
          />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
function VOFCard({ S, text, isTrue, feedback, swiping, dragIntensity, side, onClick }) {
  const showingFeedback = !!feedback

  let borderColor = VOF_GREEN
  let borderWidth = 2
  let opacity = 1
  let cardTransform = 'scale(1)'

  if (showingFeedback) {
    if (!feedback.correct) {
      opacity = 0.6
    } else {
      if (isTrue) { borderWidth = 3 }
      else { opacity = 0.4 }
    }
  } else if (swiping) {
    borderWidth = 3
    cardTransform = `scale(${1 + 0.02 * dragIntensity})`
  }

  return (
    <div
      onClick={!showingFeedback ? onClick : undefined}
      style={{
        flex: 1, background: '#ffffff', borderRadius: S(14),
        border: `${borderWidth}px solid ${borderColor}`,
        padding: `${S(10)} ${S(8)}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        position: 'relative', opacity, transform: cardTransform,
        transition: 'transform 0.2s ease, opacity 0.3s ease, border-color 0.2s ease',
        boxShadow: swiping ? `0 6px 24px ${VOF_GREEN}55` : '0 4px 16px rgba(0,0,0,0.12)',
        minHeight: S(180), overflow: 'hidden',
        cursor: showingFeedback ? 'default' : 'pointer',
      }}
    >
      {/* Indicateur visuel swipe */}
      {swiping && !showingFeedback && (
        <div style={{
          position: 'absolute', top: S(6), left: '50%', transform: 'translateX(-50%)',
          background: VOF_GREEN, borderRadius: S(8), padding: `${S(2)} ${S(10)}`,
          fontSize: S(10), fontWeight: 900, color: '#fff', letterSpacing: '0.05em',
        }}>
          {side === 'left' ? '◀' : '▶'}
        </div>
      )}
      <p style={{
        color: VOF_GREEN, fontSize: S(13), fontWeight: 800, lineHeight: 1.35,
        margin: 0, overflow: 'hidden', display: '-webkit-box',
        WebkitLineClamp: 7, WebkitBoxOrient: 'vertical',
      }}>
        {text}
      </p>
    </div>
  )
}
