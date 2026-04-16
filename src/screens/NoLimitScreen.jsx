import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { DIFFICULTY_LEVELS } from '../constants/gameConfig'
import { getMixedUnlockedFacts } from '../data/factsService'
import { getAnswerOptions } from '../utils/answers'
import { shuffle } from '../utils/shuffle'
import { audio } from '../utils/audio'
import renderFormattedText from '../utils/renderFormattedText'
import { useScale } from '../hooks/useScale'
import { readWtfData, updateWtfData } from '../utils/storageHelper'
import GameHeader from '../components/GameHeader'

const FLASH_DURATION = 380
const MIN_UNLOCKED_TO_PLAY = 20

// Paliers visuels (spec 15/04/2026) : plus la série monte, plus le fond chauffe.
const TIERS = [
  { min: 0,  bg: 'linear-gradient(160deg, #0f3d22 0%, #1a6b3a 100%)' }, // vert — tranquille
  { min: 6,  bg: 'linear-gradient(160deg, #4a3a0a 0%, #8a6a1a 100%)' }, // jaune — ça commence
  { min: 11, bg: 'linear-gradient(160deg, #5a2a0a 0%, #b04a15 100%)' }, // orange — tension
  { min: 21, bg: 'linear-gradient(160deg, #5a0a0a 0%, #b01515 100%)' }, // rouge — danger
  { min: 31, bg: 'linear-gradient(160deg, #1a0000 0%, #4a0000 100%)' }, // rouge foncé — extrême
]
const tierForStreak = (s) => {
  let cur = TIERS[0]
  for (const t of TIERS) if (s >= t.min) cur = t
  return cur
}

export default function NoLimitScreen({ onHome }) {
  const scale = useScale()
  const S = (px) => `calc(${px}px * var(--scale))`
  const diff = DIFFICULTY_LEVELS.NO_LIMIT

  const unlockedPool = useMemo(() => getMixedUnlockedFacts(), [])
  const hasEnough = unlockedPool.length >= MIN_UNLOCKED_TO_PLAY
  const missing = Math.max(0, MIN_UNLOCKED_TO_PLAY - unlockedPool.length)

  const initialBest = useMemo(() => readWtfData().noLimitBestScore || 0, [])
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
  const flashTimer = useRef(null)
  const pulseTimer = useRef(null)

  const preparedFact = useMemo(() => {
    const raw = shuffledPool[index]
    if (!raw) return null
    return { ...raw, ...getAnswerOptions(raw, diff) }
  }, [shuffledPool, index, diff])

  useEffect(() => () => {
    clearTimeout(flashTimer.current)
    clearTimeout(pulseTimer.current)
  }, [])

  const finalizeGameOver = useCallback((finalStreak) => {
    setShake(true)
    setTimeout(() => setShake(false), 520)
    try { audio.play('timeout') } catch {}
    const prev = readWtfData().noLimitBestScore || 0
    if (finalStreak > prev) {
      updateWtfData(wd => { wd.noLimitBestScore = finalStreak })
      setBestScore(finalStreak)
      setNewRecord(true)
    }
    setGameOver(true)
  }, [])

  const handleAnswer = useCallback((answerIdx) => {
    if (flash !== null || !preparedFact || gameOver) return
    const isCorrect = answerIdx === preparedFact.correctIndex
    setFlash({ idx: answerIdx, correct: isCorrect })
    audio.play(isCorrect ? 'correct' : 'buzzer')

    flashTimer.current = setTimeout(() => {
      if (!isCorrect) {
        finalizeGameOver(streak)
        return
      }
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
    }, FLASH_DURATION)
  }, [flash, preparedFact, streak, index, shuffledPool.length, gameOver, finalizeGameOver])

  const replay = useCallback(() => {
    setIndex(0)
    setStreak(0)
    setFlash(null)
    setGameOver(false)
    setNewRecord(false)
    setPulse(false)
    setRunKey(k => k + 1)
  }, [])

  const handleShare = useCallback(() => {
    const text = `♾️ J'ai fait une série de ${streak} en No Limit WTF! Et toi ?`
    const url = window.location.origin
    if (navigator.share) {
      navigator.share({ title: 'No Limit WTF!', text, url }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(`${text}\n${url}`)
    }
  }, [streak])

  const currentTier = tierForStreak(streak)
  const bg = currentTier.bg
  const isExtreme = streak >= 31

  // ─── Gate : pas assez de f*cts débloqués ───
  if (!hasEnough) {
    return (
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #1a0a2e 0%, #2e1a4e 100%)', color: '#fff', fontFamily: 'Nunito, sans-serif', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{ fontSize: 72, marginBottom: 12 }}>♾️</div>
          <p style={{ fontSize: 20, fontWeight: 900, marginBottom: 10 }}>No Limit verrouillé</p>
          <p style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.5, marginBottom: 8 }}>
            Débloque encore <strong style={{ color: '#FF6B1A' }}>{missing} f*ct{missing > 1 ? 's' : ''}</strong> pour jouer.
          </p>
          <p style={{ fontSize: 12, opacity: 0.6, lineHeight: 1.5, marginBottom: 28 }}>
            No Limit pioche dans les f*cts que tu connais déjà. Joue à Quickie, Quest ou Flash pour agrandir ton pool.
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
    return (
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          '--scale': scale,
          background: bg,
          color: '#fff',
          fontFamily: 'Nunito, sans-serif',
          padding: 24,
          animation: shake ? 'noLimitShake 0.52s ease' : 'none',
        }}
      >
        <style>{`
          @keyframes noLimitShake {
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
          @keyframes noLimitGoldPulse {
            0%, 100% { transform: scale(1); filter: drop-shadow(0 0 12px rgba(255,215,0,0.6)) }
            50% { transform: scale(1.05); filter: drop-shadow(0 0 24px rgba(255,215,0,0.9)) }
          }
        `}</style>
        <div style={{ textAlign: 'center', maxWidth: 340 }}>
          <div style={{ fontSize: 72, marginBottom: 8 }}>💥</div>
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
              marginBottom: 14,
              animation: 'noLimitGoldPulse 1.4s ease-in-out infinite',
            }}>
              ⭐ NOUVEAU RECORD !
            </div>
          )}
          <p style={{ fontSize: 13, opacity: 0.7, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>Ta série</p>
          <div style={{ fontSize: 110, fontWeight: 900, lineHeight: 1, margin: '6px 0 14px', textShadow: '0 6px 24px rgba(0,0,0,0.4)' }}>
            {streak}
          </div>
          <p style={{ fontSize: 14, opacity: 0.85, marginBottom: 24 }}>
            Record personnel : <strong>{bestScore}</strong>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={replay} style={{ padding: '14px 28px', background: '#FF6B1A', color: '#fff', border: 'none', borderRadius: 16, fontWeight: 900, fontSize: 15, cursor: 'pointer' }}>
              Rejouer
            </button>
            <button onClick={handleShare} style={{ padding: '12px 28px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '2px solid rgba(255,255,255,0.35)', borderRadius: 16, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
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

  // ─── En jeu ───
  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden"
      style={{
        '--scale': scale,
        background: bg,
        fontFamily: 'Nunito, sans-serif',
        transition: 'background 0.8s ease',
        animation: isExtreme ? 'noLimitExtremePulse 1.4s ease-in-out infinite' : 'none',
      }}
    >
      <style>{`
        @keyframes noLimitExtremePulse {
          0%, 100% { filter: brightness(1) }
          50% { filter: brightness(1.25) }
        }
        @keyframes noLimitCounterPop {
          0% { transform: scale(1) }
          40% { transform: scale(1.18) }
          100% { transform: scale(1) }
        }
      `}</style>

      {showQuit && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full rounded-3xl p-6 mx-4" style={{ background: '#FAFAF8', maxWidth: 360 }}>
            <div className="text-2xl text-center mb-3">♾️</div>
            <h2 className="font-black text-lg text-center mb-2" style={{ color: '#1a1a2e' }}>Quitter No Limit ?</h2>
            <p className="text-sm text-center mb-6" style={{ color: '#6B7280' }}>Ta série de {streak} sera perdue.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => setShowQuit(false)} className="w-full py-4 rounded-2xl font-black text-base" style={{ background: '#FF6B1A', color: 'white' }}>Continuer</button>
              <button onClick={onHome} className="w-full py-3 rounded-2xl font-bold text-sm" style={{ background: '#F3F4F6', color: '#6B7280' }}>Quitter</button>
            </div>
          </div>
        </div>
      )}

      <GameHeader categoryLabel="No Limit" categoryColor="#E84535" onQuit={() => setShowQuit(true)} />

      <div style={{ textAlign: 'center', padding: `${S(10)} 0 ${S(2)}`, flexShrink: 0 }}>
        <div
          style={{
            fontSize: S(72),
            fontWeight: 900,
            color: '#fff',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            textShadow: '0 4px 20px rgba(0,0,0,0.4)',
            animation: pulse ? 'noLimitCounterPop 0.26s ease' : 'none',
            display: 'inline-block',
          }}
        >
          {streak}
        </div>
        <div style={{ fontSize: S(11), fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: 2, textTransform: 'uppercase', marginTop: S(2) }}>
          Série · Record {bestScore}
        </div>
      </div>

      <div className="flex-1 flex flex-col px-4 pb-4 min-h-0" style={{ gap: S(12) }}>
        <div className="rounded-3xl flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,0.28)', minHeight: S(110), flex: '0 0 auto' }}>
          <p style={{ color: '#ffffff', fontSize: S(16), fontWeight: 800, textAlign: 'center', lineHeight: 1.4 }}>
            {renderFormattedText(preparedFact.question)}
          </p>
        </div>

        <div className="flex-1 flex items-center">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: S(8), width: '100%' }}>
            {preparedFact.options.map((opt, i) => {
              const isFlashed = flash?.idx === i
              const isAnswer = i === preparedFact.correctIndex
              let btnBg = 'rgba(255,255,255,0.15)'
              let btnBorder = 'rgba(255,255,255,0.2)'
              if (flash) {
                if (isFlashed && flash.correct) { btnBg = 'rgba(34,197,94,0.4)'; btnBorder = '#22C55E' }
                else if (isFlashed && !flash.correct) { btnBg = 'rgba(239,68,68,0.4)'; btnBorder = '#EF4444' }
                else if (isAnswer && !flash.correct) { btnBg = 'rgba(34,197,94,0.25)'; btnBorder = '#22C55E' }
              }
              return (
                <button
                  key={`${index}-${i}`}
                  onClick={() => handleAnswer(i)}
                  disabled={flash !== null}
                  className="rounded-2xl text-center transition-all active:scale-[0.97]"
                  style={{
                    background: btnBg, border: `2px solid ${btnBorder}`,
                    height: S(64), padding: S(10), borderRadius: S(14),
                    opacity: flash && !isFlashed && !(isAnswer && !flash.correct) ? 0.5 : 1,
                    transition: 'all 0.15s ease',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: S(13), fontWeight: 700, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {renderFormattedText(opt)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
