import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { DIFFICULTY_LEVELS } from '../constants/gameConfig'
import { getMixedUnlockedFacts } from '../data/factsService'
import { getAnswerOptions } from '../utils/answers'
import { shuffle } from '../utils/shuffle'
import { audio } from '../utils/audio'
import renderFormattedText from '../utils/renderFormattedText'
import { useScale } from '../hooks/useScale'
import GameHeader from '../components/GameHeader'

const FLASH_DURATION = 400
const COLORS = [
  'linear-gradient(160deg, #1a0a2e 0%, #3a0a4e 100%)',
  'linear-gradient(160deg, #0a2e1a 0%, #0a4e3a 100%)',
  'linear-gradient(160deg, #2e1a0a 0%, #4e3a0a 100%)',
  'linear-gradient(160deg, #2e0a1a 0%, #4e0a3a 100%)',
  'linear-gradient(160deg, #0a1a2e 0%, #0a3a4e 100%)',
]

export default function MarathonScreen({ onHome }) {
  const scale = useScale()
  const S = (px) => `calc(${px}px * var(--scale))`
  const diff = DIFFICULTY_LEVELS.MARATHON

  const shuffledPool = useMemo(() => shuffle(getMixedUnlockedFacts()), [])
  const [index, setIndex] = useState(0)
  const [streak, setStreak] = useState(0)
  const [flash, setFlash] = useState(null)
  const [gameOver, setGameOver] = useState(false)
  const [showQuit, setShowQuit] = useState(false)
  const flashTimer = useRef(null)

  const preparedFact = useMemo(() => {
    const raw = shuffledPool[index]
    if (!raw) return null
    return { ...raw, ...getAnswerOptions(raw, diff) }
  }, [shuffledPool, index, diff])

  useEffect(() => () => clearTimeout(flashTimer.current), [])

  const handleAnswer = useCallback((answerIdx) => {
    if (flash !== null || !preparedFact || gameOver) return
    const isCorrect = answerIdx === preparedFact.correctIndex
    setFlash({ idx: answerIdx, correct: isCorrect })
    audio.play(isCorrect ? 'correct' : 'buzzer')

    flashTimer.current = setTimeout(() => {
      if (!isCorrect) {
        setGameOver(true)
        return
      }
      const newStreak = streak + 1
      setStreak(newStreak)
      if (index + 1 >= shuffledPool.length) {
        setGameOver(true)
        return
      }
      setIndex(i => i + 1)
      setFlash(null)
    }, FLASH_DURATION)
  }, [flash, preparedFact, streak, index, shuffledPool.length, gameOver])

  const bg = COLORS[streak % COLORS.length]

  // Pool vide
  if (!preparedFact && !gameOver) {
    return (
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#1a0a2e', color: '#fff', fontFamily: 'Nunito, sans-serif', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🏃</div>
          <p style={{ fontSize: 18, fontWeight: 900 }}>Marathon indisponible</p>
          <p style={{ fontSize: 13, opacity: 0.7, marginTop: 10, lineHeight: 1.5 }}>
            Tu dois d'abord débloquer des f*cts (Snack, Quest, Flash) pour alimenter le Marathon.
          </p>
          <button onClick={onHome} style={{ marginTop: 28, padding: '14px 36px', background: '#FF6B1A', color: '#fff', border: 'none', borderRadius: 16, fontWeight: 900, fontSize: 15, cursor: 'pointer' }}>
            Retour
          </button>
        </div>
      </div>
    )
  }

  // Game over
  if (gameOver) {
    return (
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: bg, color: '#fff', fontFamily: 'Nunito, sans-serif', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 72, marginBottom: 8 }}>💥</div>
          <p style={{ fontSize: 14, opacity: 0.7, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>Série finale</p>
          <div style={{ fontSize: 96, fontWeight: 900, lineHeight: 1, margin: '12px 0 20px', textShadow: '0 6px 24px rgba(0,0,0,0.4)' }}>
            {streak}
          </div>
          <p style={{ fontSize: 15, opacity: 0.85, marginBottom: 32 }}>
            {streak === 0 ? 'La prochaine sera la bonne !' : streak < 10 ? 'Pas mal — tu peux mieux faire.' : streak < 25 ? 'Belle série !' : 'Impressionnant 🔥'}
          </p>
          <button onClick={onHome} style={{ padding: '14px 40px', background: '#FF6B1A', color: '#fff', border: 'none', borderRadius: 16, fontWeight: 900, fontSize: 15, cursor: 'pointer' }}>
            Retour
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden"
      style={{ '--scale': scale, background: bg, fontFamily: 'Nunito, sans-serif', transition: 'background 0.8s ease' }}
    >
      {showQuit && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full rounded-3xl p-6 mx-4" style={{ background: '#FAFAF8', maxWidth: 360 }}>
            <div className="text-2xl text-center mb-3">🏃</div>
            <h2 className="font-black text-lg text-center mb-2" style={{ color: '#1a1a2e' }}>Quitter le Marathon ?</h2>
            <p className="text-sm text-center mb-6" style={{ color: '#6B7280' }}>Ta série de {streak} sera perdue.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => setShowQuit(false)} className="w-full py-4 rounded-2xl font-black text-base" style={{ background: '#FF6B1A', color: 'white' }}>Continuer</button>
              <button onClick={onHome} className="w-full py-3 rounded-2xl font-bold text-sm" style={{ background: '#F3F4F6', color: '#6B7280' }}>Quitter</button>
            </div>
          </div>
        </div>
      )}

      <GameHeader categoryLabel="Marathon" categoryColor="#E84535" onQuit={() => setShowQuit(true)} />

      <div style={{ textAlign: 'center', padding: `${S(12)} 0 ${S(4)}`, flexShrink: 0 }}>
        <div style={{ fontSize: S(64), fontWeight: 900, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums', textShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          {streak}
        </div>
        <div style={{ fontSize: S(11), fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: 2, textTransform: 'uppercase', marginTop: S(4) }}>
          Série en cours
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
