import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { DIFFICULTY_LEVELS } from '../constants/gameConfig'
import { getMixedUnlockedFacts } from '../data/factsService'
import { CATEGORIES } from '../data/facts'
import { getAnswerOptions } from '../utils/answers'
import { shuffle } from '../utils/shuffle'
import { audio } from '../utils/audio'
import renderFormattedText from '../utils/renderFormattedText'
import { useScale } from '../hooks/useScale'
import { readWtfData, updateWtfData } from '../utils/storageHelper'
import GameHeader from '../components/GameHeader'
import FallbackImage from '../components/FallbackImage'

const WRONG_FLASH_DURATION = 500
const COUNTDOWN_SECONDS = 3
const MIN_UNLOCKED_TO_PLAY = 20

// One-shot migration noLimitBestScore → raceBestScore + statsByMode.no_limit → .race
;(() => {
  try {
    const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    let changed = false
    if (wd.noLimitBestScore != null && wd.raceBestScore == null) {
      wd.raceBestScore = wd.noLimitBestScore
      delete wd.noLimitBestScore
      changed = true
    }
    if (wd.statsByMode?.no_limit && !wd.statsByMode?.race) {
      wd.statsByMode.race = wd.statsByMode.no_limit
      delete wd.statsByMode.no_limit
      changed = true
    }
    if (changed) localStorage.setItem('wtf_data', JSON.stringify(wd))
  } catch { /* ignore */ }
})()

export default function RaceScreen({ onHome }) {
  const scale = useScale()
  const S = (px) => `calc(${px}px * var(--scale))`
  const diff = DIFFICULTY_LEVELS.RACE

  const unlockedPool = useMemo(() => getMixedUnlockedFacts(), [])
  const hasEnough = unlockedPool.length >= MIN_UNLOCKED_TO_PLAY
  const missing = Math.max(0, MIN_UNLOCKED_TO_PLAY - unlockedPool.length)

  const initialBest = useMemo(() => readWtfData().raceBestScore || 0, [])
  const [bestScore, setBestScore] = useState(initialBest)

  const [runKey, setRunKey] = useState(0)
  const shuffledPool = useMemo(() => shuffle(unlockedPool), [unlockedPool, runKey])

  const [index, setIndex] = useState(0)
  const [streak, setStreak] = useState(0)
  const [flash, setFlash] = useState(null)
  const [gameOver, setGameOver] = useState(false)
  const [showQuit, setShowQuit] = useState(false)
  const [pulse, setPulse] = useState(false)
  const [shake, setShake] = useState(false)
  const [newRecord, setNewRecord] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  const [showLightbox, setShowLightbox] = useState(false)
  const [awaitingNext, setAwaitingNext] = useState(false)
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const flashTimer = useRef(null)
  const pulseTimer = useRef(null)
  const countdownRef = useRef(null)

  const preparedFact = useMemo(() => {
    const raw = shuffledPool[index]
    if (!raw) return null
    return { ...raw, ...getAnswerOptions(raw, diff) }
  }, [shuffledPool, index, diff])

  const cat = useMemo(
    () => (preparedFact ? CATEGORIES.find(c => c.id === preparedFact.category) : null),
    [preparedFact?.category]
  )
  const catBg = cat?.color || '#1a3a5c'

  useEffect(() => () => {
    clearTimeout(flashTimer.current)
    clearTimeout(pulseTimer.current)
    clearInterval(countdownRef.current)
  }, [])

  const finalizeGameOver = useCallback((finalStreak) => {
    setShake(true)
    setTimeout(() => setShake(false), 520)
    try { audio.play('timeout') } catch {}
    const prev = readWtfData().raceBestScore || 0
    if (finalStreak > prev) {
      updateWtfData(wd => { wd.raceBestScore = finalStreak })
      setBestScore(finalStreak)
      setNewRecord(true)
    }
    setGameOver(true)
  }, [])

  const advanceToNext = useCallback(() => {
    clearInterval(countdownRef.current)
    const newStreak = streak + 1
    setStreak(newStreak)
    setPulse(true)
    clearTimeout(pulseTimer.current)
    pulseTimer.current = setTimeout(() => setPulse(false), 260)
    if (index + 1 >= shuffledPool.length) {
      finalizeGameOver(newStreak)
      return
    }
    setIndex(i => i + 1)
    setFlash(null)
    setAwaitingNext(false)
    setImgFailed(false)
    setShowLightbox(false)
    setCountdown(COUNTDOWN_SECONDS)
  }, [streak, index, shuffledPool.length, finalizeGameOver])

  const handleAnswer = useCallback((answerIdx) => {
    if (flash !== null || awaitingNext || !preparedFact || gameOver) return
    const isCorrect = answerIdx === preparedFact.correctIndex
    setFlash({ idx: answerIdx, correct: isCorrect })
    audio.play(isCorrect ? 'correct' : 'buzzer')

    if (!isCorrect) {
      flashTimer.current = setTimeout(() => {
        finalizeGameOver(streak)
      }, WRONG_FLASH_DURATION)
      return
    }

    setAwaitingNext(true)
    setCountdown(COUNTDOWN_SECONDS)
    let remaining = COUNTDOWN_SECONDS
    countdownRef.current = setInterval(() => {
      remaining--
      setCountdown(remaining)
      if (remaining <= 0) {
        clearInterval(countdownRef.current)
        advanceToNext()
      }
    }, 1000)
  }, [flash, awaitingNext, preparedFact, streak, gameOver, finalizeGameOver, advanceToNext])

  const replay = useCallback(() => {
    clearInterval(countdownRef.current)
    setIndex(0)
    setStreak(0)
    setFlash(null)
    setGameOver(false)
    setNewRecord(false)
    setPulse(false)
    setAwaitingNext(false)
    setCountdown(COUNTDOWN_SECONDS)
    setImgFailed(false)
    setRunKey(k => k + 1)
  }, [])

  const handleShare = useCallback(() => {
    const url = window.location.origin
    const text = newRecord
      ? `🏆 NOUVEAU RECORD : ${streak} en Race WTF! Tu peux faire mieux ?\n${url}`
      : `♾️ Série de ${streak} en Race WTF! (mon record : ${bestScore}). Et toi ?\n${url}`
    if (navigator.share) {
      navigator.share({ title: 'Race WTF!', text }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(text)
    }
  }, [streak, newRecord, bestScore])

  const bg = `linear-gradient(160deg, ${catBg}88, ${catBg})`

  // ─── Gate : pas assez de f*cts débloqués ───
  if (!hasEnough) {
    return (
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #1a0a2e 0%, #2e1a4e 100%)', color: '#fff', fontFamily: 'Nunito, sans-serif', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{ fontSize: 72, marginBottom: 12 }}>♾️</div>
          <p style={{ fontSize: 20, fontWeight: 900, marginBottom: 10 }}>Race verrouillé</p>
          <p style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.5, marginBottom: 8 }}>
            Débloque encore <strong style={{ color: '#FF6B1A' }}>{missing} f*ct{missing > 1 ? 's' : ''}</strong> pour jouer.
          </p>
          <p style={{ fontSize: 12, opacity: 0.6, lineHeight: 1.5, marginBottom: 28 }}>
            Race pioche dans les f*cts que tu connais déjà. Joue à Quickie, Quest ou Flash pour agrandir ton pool.
          </p>
          <button onClick={onHome} style={{ padding: '14px 36px', background: '#FF6B1A', color: '#fff', border: 'none', borderRadius: 16, fontWeight: 900, fontSize: 15, cursor: 'pointer' }}>
            Retour
          </button>
        </div>
      </div>
    )
  }

  // ─── Game over ───
  if (gameOver) {
    // Facts de la run pour le carrousel ✓/✗
    const correctFacts = shuffledPool.slice(0, streak)
    const wrongFact = index < shuffledPool.length ? shuffledPool[index] : null
    const runFacts = wrongFact
      ? [...correctFacts.map(f => ({ fact: f, ok: true })), { fact: wrongFact, ok: false }]
      : correctFacts.map(f => ({ fact: f, ok: true }))
    const confettiColors = ['#FFD700', '#FFA500', '#FF6B1A', '#23D5D5', '#ffffff']
    const confettiCount = newRecord ? 40 : 0

    return (
      <div
        className="absolute inset-0 flex flex-col items-center justify-start overflow-y-auto"
        style={{
          '--scale': scale,
          background: bg,
          color: '#fff',
          fontFamily: 'Nunito, sans-serif',
          padding: '24px 16px 16px',
          animation: shake ? 'raceShake 0.52s ease' : 'none',
        }}
      >
        <style>{`
          @keyframes raceShake {
            0%, 100% { transform: translate(0, 0) }
            10% { transform: translate(-8px, 4px) }
            20% { transform: translate(7px, -6px) }
            30% { transform: translate(-6px, -5px) }
            40% { transform: translate(8px, 5px) }
            50% { transform: translate(-5px, 4px) }
            60% { transform: translate(6px, -4px) }
            70% { transform: translate(-4px, 3px) }
            80% { transform: translate(4px, -2px) }
            90% { transform: translate(-2px, 1px) }
          }
          @keyframes raceGoldPulse {
            0%, 100% { transform: scale(1); filter: drop-shadow(0 0 12px rgba(255,215,0,0.6)) }
            50% { transform: scale(1.05); filter: drop-shadow(0 0 24px rgba(255,215,0,0.9)) }
          }
          @keyframes raceConfettiFall {
            0%   { transform: translateY(-10px) rotate(0deg); opacity: 1; }
            80%  { opacity: 1; }
            100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
          }
        `}</style>

        {/* Confetti overlay — uniquement sur nouveau record */}
        {confettiCount > 0 && (
          <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 200, overflow: 'hidden' }}>
            {Array.from({ length: confettiCount }, (_, i) => (
              <div key={i} style={{
                position: 'absolute', top: '-12px',
                left: `${(i * 37 + 11) % 97}%`,
                width: i % 3 === 0 ? 8 : 6,
                height: i % 3 === 0 ? 8 : 6,
                borderRadius: i % 2 === 0 ? '50%' : '2px',
                background: confettiColors[i % confettiColors.length],
                animation: `raceConfettiFall ${(1.8 + (i % 5) * 0.25).toFixed(2)}s ${((i * 0.07) % 1.2).toFixed(2)}s ease-in both`,
              }} />
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', maxWidth: 360, width: '100%', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: newRecord ? 80 : 72, marginBottom: 4 }}>{newRecord ? '🏆' : '💥'}</div>
          {newRecord && (
            <div style={{
              display: 'inline-block',
              padding: '6px 16px',
              borderRadius: 999,
              background: 'linear-gradient(90deg, #FFD700, #FFA500)',
              color: '#1a1a2e',
              fontWeight: 900,
              fontSize: 13,
              letterSpacing: 1,
              marginBottom: 10,
              animation: 'raceGoldPulse 1.4s ease-in-out infinite',
            }}>
              <img src="/assets/ui/wtf-star.png" alt="" style={{ width: 16, height: 16, objectFit: 'contain', verticalAlign: 'middle', marginRight: 4 }} /> NOUVEAU RECORD !
            </div>
          )}
          <p style={{ fontSize: 13, opacity: 0.7, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>Ta série</p>
          <div style={{ fontSize: 96, fontWeight: 900, lineHeight: 1, margin: '4px 0 10px', textShadow: '0 6px 24px rgba(0,0,0,0.4)' }}>
            {streak}
          </div>
          <p style={{ fontSize: 14, opacity: 0.85, marginBottom: 16 }}>
            Record personnel : <strong>{bestScore}</strong>
          </p>

          {/* Carrousel ✓/✗ facts de la run */}
          {runFacts.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(10, 1fr)',
                gap: 4,
                width: '100%',
              }}>
                {runFacts.map(({ fact, ok }, i) => {
                  const fc = CATEGORIES.find(c => c.id === fact.category)
                  const fcColor = fc?.color || '#23D5D5'
                  return (
                    <div key={`${fact.id}-${i}`} style={{
                      aspectRatio: '1', borderRadius: 6, overflow: 'hidden', position: 'relative',
                      border: `2px solid ${ok ? '#6BCB77' : '#E84535'}`,
                      background: `linear-gradient(135deg, ${fcColor}44, ${fcColor})`,
                    }}>
                      {fact.imageUrl ? (
                        <img src={fact.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={e => { e.target.style.display = 'none' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img src={`/assets/categories/${fact.category}.png`} alt="" style={{ width: '55%', height: '55%', objectFit: 'contain', opacity: 0.7 }} onError={e => { e.target.style.display = 'none' }} />
                        </div>
                      )}
                      <div style={{
                        position: 'absolute', top: 2, right: 2, width: 14, height: 14, borderRadius: '50%',
                        background: ok ? '#6BCB77' : '#E84535',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 900, color: '#fff', lineHeight: 1,
                      }}>
                        {ok ? '✓' : '✗'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={replay} style={{ padding: '14px 28px', background: '#FF6B1A', color: '#fff', border: '3px solid #ffffff', borderRadius: 16, fontWeight: 900, fontSize: 15, cursor: 'pointer' }}>
              Rejouer
            </button>
            <button onClick={handleShare} style={{ padding: '12px 28px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '3px solid #ffffff', borderRadius: 16, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
              Partager
            </button>
            <button onClick={onHome} style={{ padding: '12px 28px', background: 'transparent', color: 'rgba(255,255,255,0.7)', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Accueil
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Barre de progression glissante (fenêtre de 10) ───
  const WINDOW_SIZE = 10
  const windowStart = Math.max(0, streak - WINDOW_SIZE + 1)
  const segCount = Math.min(streak + 1, WINDOW_SIZE)
  const isImageRevealed = awaitingNext

  // ─── En jeu ───
  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden"
      style={{
        '--scale': scale,
        background: bg,
        fontFamily: 'Nunito, sans-serif',
        transition: 'background 0.8s ease',
      }}
    >
      <style>{`
        @keyframes raceCounterPop {
          0% { transform: scale(1) }
          40% { transform: scale(1.18) }
          100% { transform: scale(1) }
        }
        @keyframes holoShimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes holoSweep {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(200%) skewX(-15deg); }
        }
      `}</style>

      {showQuit && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full rounded-3xl p-6 mx-4" style={{ background: '#FAFAF8', maxWidth: 360 }}>
            <div className="text-2xl text-center mb-3">♾️</div>
            <h2 className="font-black text-lg text-center mb-2" style={{ color: '#1a1a2e' }}>Quitter Race ?</h2>
            <p className="text-sm text-center mb-6" style={{ color: '#6B7280' }}>Ta série de {streak} sera perdue.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => setShowQuit(false)} className="w-full py-4 rounded-2xl font-black text-base" style={{ background: '#FF6B1A', color: 'white' }}>Continuer</button>
              <button onClick={onHome} className="w-full py-3 rounded-2xl font-bold text-sm" style={{ background: '#F3F4F6', color: '#6B7280' }}>Quitter</button>
            </div>
          </div>
        </div>
      )}

      <GameHeader
        categoryLabel={cat?.label || 'Race'}
        categoryColor={catBg}
        categoryIcon={cat?.id ? `/assets/categories/${cat.id}.png` : null}
        onQuit={() => setShowQuit(true)}
      />

      {/* Bloc mode label + info + progress — hauteur fixe identique aux 3 modes */}
      <div style={{ height: S(56), flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: `${S(2)} ${S(16)} ${S(4)}` }}>
        {/* Mode label */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(6) }}>
          <img src="/assets/modes/icon-race.png" alt="" style={{ width: S(18), height: S(18), objectFit: 'contain' }} />
          <span style={{
            fontSize: S(11), fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: '#23D5D5', textShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}>
            RACE
          </span>
        </div>
        {/* Streak + Record */}
        <div style={{ textAlign: 'center' }}>
          <span style={{
            fontSize: S(12), fontWeight: 900, letterSpacing: 1,
            animation: pulse ? 'raceCounterPop 0.26s ease' : 'none',
            display: 'inline-block',
          }}>
            <span style={{ color: '#23D5D5' }}>{streak}</span>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}> · Record {bestScore}</span>
          </span>
        </div>
        {/* Barre de progression glissante */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: S(3) }}>
          {Array.from({ length: segCount }).map((_, i) => {
            const isActive = i === segCount - 1
            return (
              <div
                key={windowStart + i}
                style={{
                  flex: 1,
                  height: isActive ? S(12) : S(8),
                  borderRadius: S(4),
                  background: isActive ? '#23D5D5' : 'rgba(35,213,213,0.4)',
                  transition: 'all 0.3s ease',
                }}
              />
            )
          })}
        </div>
      </div>

      {/* ── Bloc contenu S(264) — question + 6 QCM ── */}
      <div style={{
        height: S(270), flexShrink: 0, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'flex-start', gap: S(6),
        padding: `${S(6)} ${S(16)} 0`,
      }}>
        <div style={{
          borderRadius: S(16), padding: `${S(12)} ${S(16)}`,
          background: 'rgba(0,0,0,0.28)', border: '2px solid #23D5D5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: S(90), flexShrink: 0, overflow: 'hidden',
        }}>
          <p style={{ color: '#ffffff', fontSize: S(15), fontWeight: 800, textAlign: 'center', lineHeight: 1.4, margin: 0 }}>
            {renderFormattedText(preparedFact.question, '#23D5D5')}
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: S(5) }}>
          {preparedFact.options.map((opt, i) => {
            const isFlashed = flash?.idx === i
            const isAnswer = i === preparedFact.correctIndex
            let btnBg = '#ffffff'
            let btnBorder = '#23D5D5'
            let txtColor = catBg
            if (flash) {
              if (isFlashed && flash.correct) { btnBg = 'rgba(34,197,94,0.4)'; btnBorder = '#22C55E'; txtColor = '#ffffff' }
              else if (isFlashed && !flash.correct) { btnBg = 'rgba(239,68,68,0.4)'; btnBorder = '#EF4444'; txtColor = '#ffffff' }
              else if (isAnswer && !flash.correct) { btnBg = 'rgba(34,197,94,0.25)'; btnBorder = '#22C55E'; txtColor = '#ffffff' }
            }
            return (
              <button
                key={`${index}-${i}`}
                onClick={() => handleAnswer(i)}
                disabled={flash !== null}
                className="active:scale-[0.97]"
                style={{
                  background: btnBg, border: `2px solid ${btnBorder}`,
                  height: S(52), padding: `${S(6)} ${S(8)}`, borderRadius: S(12),
                  opacity: flash && !isFlashed && !(isAnswer && !flash.correct) ? 0.5 : 1,
                  transition: 'all 0.15s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: awaitingNext ? 'default' : 'pointer',
                }}
              >
                <span style={{ fontSize: S(12), fontWeight: 800, color: txtColor, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {renderFormattedText(opt)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Zone image + timer — flex:1 space-evenly (aligné Quickie/VoF) ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly' }}>
        {/* Image — position Y identique aux 3 modes */}
        <div key={index} style={{
          position: 'relative', width: '55%', aspectRatio: '1 / 1',
          borderRadius: S(12), overflow: 'hidden',
          border: '3px solid #23D5D5',
          boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
          background: 'rgba(0,0,0,0.3)',
        }}>
          {preparedFact?.imageUrl && !imgFailed ? (
            <>
              <img
                src={preparedFact.imageUrl} alt=""
                onError={() => setImgFailed(true)}
                style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  filter: isImageRevealed ? 'none' : 'blur(18px) brightness(0.6)',
                  transform: isImageRevealed ? 'none' : 'scale(1.15)',
                  transition: isImageRevealed ? 'filter 0.4s ease, transform 0.4s ease' : 'none',
                }}
              />
              {isImageRevealed && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowLightbox(true) }}
                    style={{
                      position: 'absolute', top: S(6), right: S(6), zIndex: 10,
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.5)', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', fontSize: 16,
                    }}
                  >🔍</button>
                  {/* Holo shimmer */}
                  <div style={{
                    position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
                    background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.15) 30%, rgba(35,213,213,0.2) 38%, rgba(255,215,0,0.15) 44%, rgba(0,188,212,0.15) 50%, rgba(255,64,129,0.15) 56%, rgba(35,213,213,0.2) 62%, rgba(255,255,255,0.15) 70%, transparent 80%)',
                    backgroundSize: '200% 100%',
                    animation: 'holoShimmer 3s linear infinite',
                    mixBlendMode: 'screen',
                  }} />
                  {/* Lame de lumière */}
                  <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', overflow: 'hidden' }}>
                    <div style={{
                      position: 'absolute', top: '-20%', bottom: '-20%', width: '45%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
                      animation: 'holoSweep 2.5s 0.5s ease-in-out infinite',
                    }} />
                  </div>
                  {/* Stamp Unlocked */}
                  <div style={{
                    position: 'absolute', bottom: S(8), right: S(8), zIndex: 5,
                    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
                    borderRadius: S(6), padding: `${S(3)} ${S(8)}`,
                  }}>
                    <span style={{ color: '#23D5D5', fontSize: S(9), fontWeight: 900, letterSpacing: '0.04em' }}>Unlocked !</span>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div style={{
                width: '100%', height: '100%',
                filter: isImageRevealed ? 'none' : 'blur(14px) brightness(0.65)',
                transform: isImageRevealed ? 'none' : 'scale(1.1)',
                transition: isImageRevealed ? 'filter 0.4s ease, transform 0.4s ease' : 'none',
              }}>
                <FallbackImage categoryColor={catBg} />
              </div>
              {isImageRevealed && (
                <>
                  <div style={{
                    position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
                    background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.15) 30%, rgba(35,213,213,0.2) 38%, rgba(255,215,0,0.15) 44%, rgba(0,188,212,0.15) 50%, rgba(255,64,129,0.15) 56%, rgba(35,213,213,0.2) 62%, rgba(255,255,255,0.15) 70%, transparent 80%)',
                    backgroundSize: '200% 100%',
                    animation: 'holoShimmer 3s linear infinite',
                    mixBlendMode: 'screen',
                  }} />
                  <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', overflow: 'hidden' }}>
                    <div style={{
                      position: 'absolute', top: '-20%', bottom: '-20%', width: '45%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
                      animation: 'holoSweep 2.5s 0.5s ease-in-out infinite',
                    }} />
                  </div>
                  <div style={{
                    position: 'absolute', bottom: S(8), right: S(8), zIndex: 5,
                    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
                    borderRadius: S(6), padding: `${S(3)} ${S(8)}`,
                  }}>
                    <span style={{ color: '#23D5D5', fontSize: S(9), fontWeight: 900, letterSpacing: '0.04em' }}>Unlocked !</span>
                  </div>
                </>
              )}
            </>
          )}
        </div>
        {/* Slot 2 — fantôme timer (même taille que CircularTimer Quickie/VoF) */}
        <div style={{ width: S(96), height: S(96), visibility: 'hidden' }} />
      </div>

      {/* ── Boutons — absolus, ne décalent pas l'image ── */}
      {awaitingNext && (
        <div style={{ position: 'absolute', bottom: S(12), left: S(16), right: S(16), display: 'flex', flexDirection: 'column', gap: S(6), zIndex: 10 }}>
          <div style={{ display: 'flex', gap: S(8) }}>
          <button
            onClick={handleShare}
            className="active:scale-95"
            style={{
              flex: 1, padding: `${S(10)} 0`, borderRadius: S(14),
              background: 'linear-gradient(135deg, #23D5D5, #0A8F8F)',
              border: '3px solid #ffffff',
              color: '#fff', fontWeight: 800, fontSize: S(12),
              cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(4),
              boxShadow: '0 4px 16px rgba(35,213,213,0.5)',
            }}
          >
            Partager ce f*ct
          </button>
          <button
            onClick={advanceToNext}
            className="active:scale-95"
            style={{
              flex: 1, padding: `${S(10)} 0`, borderRadius: S(14),
              background: 'linear-gradient(135deg, #23D5D5, #0A8F8F)',
              border: '3px solid #ffffff',
              color: '#fff', fontWeight: 900, fontSize: S(12),
              cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(4),
              boxShadow: '0 4px 16px rgba(35,213,213,0.5)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}
          >
            SUIVANT ({countdown}s) →
          </button>
          </div>
        </div>
      )}

      {showLightbox && preparedFact?.imageUrl && (
        <div
          onClick={() => setShowLightbox(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <button
            onClick={() => setShowLightbox(false)}
            style={{
              position: 'absolute', top: 16, right: 16, zIndex: 10,
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)', border: 'none',
              color: 'white', fontSize: 18, fontWeight: 900,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >✕</button>
          <img
            src={preparedFact.imageUrl}
            alt=""
            onClick={e => e.stopPropagation()}
            style={{
              width: '95%', maxHeight: '80vh', objectFit: 'contain',
              borderRadius: 12,
              animation: 'lightboxZoom 0.2s ease-out',
            }}
          />
          <style>{`
            @keyframes lightboxZoom {
              from { transform: scale(0.8); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </div>
  )
}
