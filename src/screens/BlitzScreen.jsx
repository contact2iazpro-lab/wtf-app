import { useState, useEffect, useRef, useCallback } from 'react'
import { getCategoryById } from '../data/facts'
import { useScale } from '../hooks/useScale'
import { audio } from '../utils/audio'
import renderFormattedText from '../utils/renderFormattedText'
import GameHeader from '../components/GameHeader'
import FallbackImage from '../components/FallbackImage'

const BLITZ_RED = '#FF4444'

// Interpolation linéaire entre vert → orange → rouge selon progress [0..1]
function timerColorFromProgress(p) {
  if (p < 0.5) {
    // vert → orange
    const t = p / 0.5
    const r = Math.round(0x22 + (0xF5 - 0x22) * t)
    const g = Math.round(0xC5 + (0x9E - 0xC5) * t)
    const b = Math.round(0x5E + (0x0B - 0x5E) * t)
    return `rgb(${r},${g},${b})`
  } else {
    // orange → rouge
    const t = (p - 0.5) / 0.5
    const r = Math.round(0xF5 + (0xEF - 0xF5) * t)
    const g = Math.round(0x9E + (0x44 - 0x9E) * t)
    const b = Math.round(0x0B + (0x44 - 0x0B) * t)
    return `rgb(${r},${g},${b})`
  }
}

const WRONG_PENALTY = 5       // secondes retirées/ajoutées sur erreur (inverse selon variant)
const FLASH_DURATION = 300
const RUSH_DURATION = 60      // Rush : chrono descendant 60s
const SOLO_TIERS = [5, 10, 20, 30, 50, 100]

export default function BlitzScreen({ facts, category, onFinish, onQuit, playerCoins, variant = 'rush' }) {
  const scale = useScale()
  const S = (px) => `calc(${px}px * var(--scale))`

  const cat = getCategoryById(category)
  const isSpeedrun = variant === 'speedrun'
  const totalQuestions = facts.length

  // Game state
  //  - Rush : timeLeft descend de 60s jusqu'à 0, erreur = -5s
  //  - Speedrun : elapsed monte depuis 0, erreur = +5s, fin à totalQuestions
  const [timeLeft, setTimeLeft] = useState(isSpeedrun ? 0 : RUSH_DURATION)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [flashAnswer, setFlashAnswer] = useState(null)
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const [answeredResults, setAnsweredResults] = useState([])

  // Refs
  const startTimeRef = useRef(null)
  const penaltiesRef = useRef(0)
  const intervalRef = useRef(null)
  const gameOverRef = useRef(false)
  const flashTimeoutRef = useRef(null)
  const correctRef = useRef(0)
  const lastCorrectTimeRef = useRef(isSpeedrun ? 0 : RUSH_DURATION)

  const currentFact = currentIndex < totalQuestions ? facts[currentIndex] : null

  // Termine la partie :
  //  Rush : finalTime = temps à la dernière bonne réponse (tie-break Défi)
  //  Speedrun : finalTime = temps total écoulé (élapsed + pénalités)
  const endGame = useCallback(() => {
    if (gameOverRef.current) return
    gameOverRef.current = true
    clearInterval(intervalRef.current)
    setTimeout(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000 + penaltiesRef.current
      // sessionAnswers = liste de { fact, wasCorrect } pour chaque question répondue
      // (utilisé par BlitzResultsScreen pour afficher les miniatures)
      const sessionAnswers = answeredResults.map((r, i) => ({
        fact: facts[i],
        wasCorrect: r === 'correct',
      })).filter(a => a.fact)
      onFinish({
        variant,
        correctCount: correctRef.current,
        totalAnswered: correctRef.current + answeredResults.filter(r => r === 'wrong').length,
        finalTime: isSpeedrun
          ? Math.round(elapsed * 100) / 100
          : lastCorrectTimeRef.current,
        sessionAnswers,
      })
    }, 200)
  }, [onFinish, variant, answeredResults, isSpeedrun, facts])

  // ── Chrono ──────────────────────────────────────────────────────────────
  //  Rush : décompte depuis RUSH_DURATION, fin à 0s
  //  Speedrun : décompte montant depuis 0, pas de fin automatique (fin à totalQuestions)
  useEffect(() => {
    startTimeRef.current = Date.now()
    intervalRef.current = setInterval(() => {
      if (gameOverRef.current) return
      const spent = (Date.now() - startTimeRef.current) / 1000 + penaltiesRef.current
      if (isSpeedrun) {
        setTimeLeft(Math.round(spent * 100) / 100)
      } else {
        const left = Math.max(0, RUSH_DURATION - spent)
        setTimeLeft(left)
        if (left <= 0) endGame()
      }
    }, 50)

    return () => {
      clearInterval(intervalRef.current)
      clearTimeout(flashTimeoutRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Answer handler UNIFIÉ (Solo + Défi, même mécanique) ───────────────
  const handleAnswer = useCallback((answerIndex) => {
    if (flashAnswer !== null || gameOverRef.current || !currentFact) return

    const isCorrect = answerIndex === currentFact.correctIndex
    setFlashAnswer({ index: answerIndex, correct: isCorrect })

    if (isCorrect) {
      correctRef.current += 1
      setCorrectCount(c => c + 1)
      setAnsweredResults(prev => [...prev, 'correct'])
      // Tie-break Défi Rush : mémorise le temps à la dernière bonne
      const spentNow = (Date.now() - startTimeRef.current) / 1000 + penaltiesRef.current
      lastCorrectTimeRef.current = Math.min(RUSH_DURATION, Math.round(spentNow * 100) / 100)
      audio.play('correct')
    } else {
      // Rush : -5s (pénalité descendante, retire du chrono)
      // Speedrun : +5s (pénalité montante, ajoute au chrono)
      // Dans les 2 cas, accumulation dans penaltiesRef avec le même signe —
      // l'effet est inversé via le calcul (RUSH_DURATION - spent) vs spent.
      penaltiesRef.current += WRONG_PENALTY
      setAnsweredResults(prev => [...prev, 'wrong'])
      audio.play('buzzer')
    }

    const nextIndex = currentIndex + 1

    // Pool épuisé → fin (cas extrême, le lobby fournit normalement un pool large)
    if (nextIndex >= totalQuestions) {
      setTimeout(() => endGame(), FLASH_DURATION + 100)
      return
    }

    // Next question after flash
    flashTimeoutRef.current = setTimeout(() => {
      setFlashAnswer(null)
      setCurrentIndex(nextIndex)
    }, FLASH_DURATION)
  }, [currentFact, currentIndex, flashAnswer, totalQuestions, endGame])

  // ── Background ── Rush : couleur de la catégorie du fact courant (pool mixte)
  //                 Speedrun : couleur de la catégorie choisie (stable)
  // Progress reste calculé pour le chrono/barre UI mais ne pilote plus le bg.
  const progress = isSpeedrun
    ? (totalQuestions > 0 ? currentIndex / totalQuestions : 0)
    : 1 - (timeLeft / RUSH_DURATION)
  const currentFactCat = currentFact ? getCategoryById(currentFact.category) : null
  const bgColor = currentFactCat?.color || cat?.color || '#FF4444'
  const screenBg = `linear-gradient(160deg, ${bgColor}55 0%, ${bgColor} 100%)`

  // Palier atteint en solo (5/10/20/30/50/100 bonnes réponses)
  const soloTierReached = SOLO_TIERS.filter(t => correctCount >= t).pop() || 0

  // ── Quit modal ────────────────────────────────────────────────────────────
  const quitModal = showQuitConfirm && (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full rounded-3xl p-6 mx-4" style={{ background: '#FAFAF8', border: '1px solid #E5E7EB', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>
        <div className="text-2xl text-center mb-3">⚡</div>
        <h2 className="font-black text-lg text-center mb-2" style={{ color: '#1a1a2e' }}>Quitter le Blitz ?</h2>
        <p className="text-sm text-center mb-6 leading-relaxed" style={{ color: '#6B7280' }}>
          Ton temps ne sera pas enregistré.
        </p>
        <div className="flex flex-col gap-3">
          <button onClick={() => setShowQuitConfirm(false)} className="w-full py-4 rounded-2xl font-black text-base" style={{ background: '#FF6B1A', color: 'white' }}>
            Continuer
          </button>
          <button onClick={onQuit} className="w-full py-3 rounded-2xl font-bold text-sm" style={{ background: '#F3F4F6', color: '#6B7280' }}>
            Quitter
          </button>
        </div>
      </div>
    </div>
  )

  // Catégorie du fact courant : en Rush c'est mixte (change par Q), en Speedrun c'est la cat choisie
  const factCat = currentFact ? getCategoryById(currentFact.category) : cat
  const factCatColor = factCat?.color || '#FF6B1A'
  const factCatIcon = factCat?.id ? `/assets/categories/${factCat.id}.png` : null
  const timerColor = timerColorFromProgress(progress)

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden"
      style={{ '--scale': scale, background: screenBg, fontFamily: 'Nunito, sans-serif', transition: 'background 0.4s ease' }}
    >
      {quitModal}

      {/* Header — icône catégorie à côté du bouton close */}
      <GameHeader
        playerCoins={playerCoins}
        categoryLabel={factCat?.label || 'Blitz'}
        categoryColor={factCatColor}
        categoryIcon={factCatIcon}
        onQuit={() => setShowQuitConfirm(true)}
      />

      {/* Bloc mode label + score + progress — height S(56) (identique Race/VoF) */}
      <div style={{ height: S(56), flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: `${S(2)} ${S(16)} ${S(4)}` }}>
        {/* Ligne 1 : icone BLITZ + nom */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(6) }}>
          <img src="/assets/modes/icon-blitz.png" alt="" style={{ width: S(18), height: S(18), objectFit: 'contain' }} />
          <span style={{
            fontSize: S(11), fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: BLITZ_RED, textShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}>
            BLITZ {isSpeedrun ? 'SPEEDRUN' : 'RUSH'}
          </span>
        </div>
        {/* Ligne 2 : nb bonnes réponses (Rush) ou progression N/N (Speedrun) */}
        <div style={{ textAlign: 'center' }}>
          <span style={{
            fontSize: S(12), fontWeight: 900, letterSpacing: 1,
            display: 'inline-block',
          }}>
            <span style={{ color: BLITZ_RED }}>{isSpeedrun ? `${currentIndex}/${totalQuestions}` : correctCount}</span>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>
              {isSpeedrun ? ' questions' : ` · bonne${correctCount > 1 ? 's' : ''}${soloTierReached ? ` · palier ${soloTierReached}` : ''}`}
            </span>
          </span>
        </div>
        {/* Ligne 3 : barre de progression (horizontale) — Rush = chrono qui descend, Speedrun = segments N */}
        {isSpeedrun ? (
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: S(3), height: S(12) }}>
            {Array.from({ length: totalQuestions }).map((_, i) => {
              const result = answeredResults[i]
              const isCurrent = i === currentIndex && !gameOverRef.current
              return (
                <div key={i} style={{
                  flex: 1, height: isCurrent ? S(12) : S(8), borderRadius: S(4),
                  background: result === 'correct' ? '#22C55E'
                    : result === 'wrong' ? '#EF4444'
                    : isCurrent ? BLITZ_RED
                    : 'rgba(255,255,255,0.25)',
                  transition: 'all 0.3s ease',
                }} />
              )
            })}
          </div>
        ) : (
          <div style={{ height: S(12), display: 'flex', alignItems: 'center' }}>
            <div style={{ flex: 1, height: S(8), background: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                width: `${(timeLeft / RUSH_DURATION) * 100}%`,
                height: '100%',
                background: timerColor,
                transition: 'width 0.1s linear, background 0.3s',
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Bloc question + 4 QCM — height S(230) (adapté 4 QCM vs 6 en Race) */}
      <div style={{
        height: S(230), flexShrink: 0, overflow: 'hidden',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: S(6),
        padding: `${S(6)} ${S(16)} 0`,
      }}>
        {/* Question card : fond blanc, texte couleur catégorie, contour rouge Blitz */}
        <div style={{
          borderRadius: S(16), padding: `${S(12)} ${S(16)}`,
          background: '#ffffff', border: `2px solid ${BLITZ_RED}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: S(90), flexShrink: 0, overflow: 'hidden',
        }}>
          <p style={{ color: factCatColor, fontSize: S(15), fontWeight: 800, textAlign: 'center', lineHeight: 1.4, margin: 0 }}>
            {currentFact && renderFormattedText(currentFact.question, factCatColor)}
          </p>
        </div>
        {/* QCM grille 2×2 : fond blanc, texte couleur catégorie, contour rouge Blitz */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: S(5) }}>
          {currentFact?.options?.map((option, i) => {
            const isFlashed = flashAnswer?.index === i
            const isAnswer = i === currentFact.correctIndex
            let btnBg = '#ffffff'
            let btnBorder = BLITZ_RED
            let txtColor = factCatColor
            if (flashAnswer) {
              if (isFlashed && flashAnswer.correct) { btnBg = 'rgba(34,197,94,0.4)'; btnBorder = '#22C55E'; txtColor = '#ffffff' }
              else if (isFlashed && !flashAnswer.correct) { btnBg = 'rgba(239,68,68,0.4)'; btnBorder = '#EF4444'; txtColor = '#ffffff' }
              // Blitz Rush/Speedrun : on ne highlight PAS la bonne réponse sur mauvaise (user spec 19/04)
            }
            return (
              <button
                key={`${currentIndex}-${i}`}
                onClick={() => handleAnswer(i)}
                disabled={flashAnswer !== null}
                className="active:scale-[0.97]"
                style={{
                  background: btnBg, border: `2px solid ${btnBorder}`,
                  height: S(60), padding: `${S(8)} ${S(10)}`, borderRadius: S(12),
                  opacity: flashAnswer && !isFlashed ? 0.5 : 1,
                  transition: 'all 0.15s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: flashAnswer ? 'default' : 'pointer',
                }}
              >
                <span style={{
                  fontSize: S(13), fontWeight: 800, color: txtColor,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {renderFormattedText(option)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Zone image + gros timer — flex:1 space-evenly (aligné Quickie/VoF/Race) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly', padding: `0 ${S(16)}` }}>
        {/* Image — même positionnement que les autres modes */}
        <div key={currentIndex} style={{
          position: 'relative', width: '55%', aspectRatio: '1 / 1',
          borderRadius: S(12), overflow: 'hidden',
          border: `3px solid ${factCatColor}`,
          boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
          background: 'rgba(0,0,0,0.3)',
        }}>
          {(() => {
            // Défloutage image + retrait cadenas sur bonne réponse (spec 19/04)
            const isUnlocked = flashAnswer?.correct === true
            return (
              <>
                {currentFact?.imageUrl ? (
                  <img
                    src={currentFact.imageUrl} alt=""
                    style={{
                      width: '100%', height: '100%', objectFit: 'cover',
                      filter: isUnlocked ? 'none' : 'blur(18px) brightness(0.6)',
                      transform: isUnlocked ? 'none' : 'scale(1.15)',
                      transition: 'filter 0.25s ease, transform 0.25s ease',
                    }}
                    onError={e => { e.target.style.display = 'none' }}
                  />
                ) : (
                  <div style={{
                    width: '100%', height: '100%',
                    filter: isUnlocked ? 'none' : 'blur(14px) brightness(0.65)',
                    transform: isUnlocked ? 'none' : 'scale(1.1)',
                    transition: 'filter 0.25s ease, transform 0.25s ease',
                  }}>
                    <FallbackImage categoryColor={factCatColor} />
                  </div>
                )}
                {!isUnlocked && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
                    <span style={{ fontSize: S(40), filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}>🔒</span>
                  </div>
                )}
              </>
            )
          })()}
        </div>

        {/* Gros timer : rectangle blanc contour rouge Blitz, texte dégradé vert→rouge */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
            background: '#ffffff',
            border: `3px solid ${BLITZ_RED}`,
            borderRadius: S(14),
            padding: `${S(6)} ${S(18)}`,
            boxShadow: '0 4px 18px rgba(0,0,0,0.3)',
          }}>
            <div style={{
              fontSize: S(42), fontWeight: 900, color: timerColor,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            }}>
              {timeLeft.toFixed(2)}s
            </div>
          </div>
          <div style={{ fontSize: S(10), color: 'rgba(255,255,255,0.65)', fontWeight: 700, marginTop: S(4), letterSpacing: '0.04em' }}>
            ❌ erreur = {isSpeedrun ? '+' : '−'}{WRONG_PENALTY}s
          </div>
        </div>
      </div>

      {/* Penalty flash overlay */}
      {flashAnswer && !flashAnswer.correct && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 20 }}>
          <span style={{
            fontSize: S(48), fontWeight: 900, color: '#EF4444',
            textShadow: '0 0 20px rgba(239,68,68,0.5)',
            animation: 'blitzFlash 0.4s ease-out',
          }}>
            {isSpeedrun ? '+' : '−'}{WRONG_PENALTY}s
          </span>
        </div>
      )}

      <style>{`
        @keyframes blitzFlash {
          0% { opacity: 0; transform: scale(0.5); }
          30% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0; transform: scale(1) translateY(-20px); }
        }
      `}</style>
    </div>
  )
}
