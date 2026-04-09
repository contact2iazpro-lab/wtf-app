import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { TUTO_FACT_IDS, TUTO_FLASH_CONFIG, TUTO_QUEST_CONFIG } from '../constants/gameConfig'
import { getValidFacts } from '../data/factsService'
import { useScale } from '../hooks/useScale'
import { audio } from '../utils/audio'
import { getAnswerOptions } from '../utils/answers'

export default function TutoTunnel({ onComplete, onSkip }) {
  const S = useScale()
  const S_val = (px) => `calc(${px}px * var(--scale))`

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════
  const [phase, setPhase] = useState('intro')
  const [allTutoFacts, setAllTutoFacts] = useState([])
  const [usedIds, setUsedIds] = useState([])
  const [firstFactId, setFirstFactId] = useState(null)
  const [firstFactCorrect, setFirstFactCorrect] = useState(false)
  const [sessionFacts, setSessionFacts] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [isCorrect, setIsCorrect] = useState(false)
  const [showRevelation, setShowRevelation] = useState(false)
  const [sessionScore, setSessionScore] = useState(0)
  const [hintsRevealed, setHintsRevealed] = useState([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [phase3FactDetail, setPhase3FactDetail] = useState(null)

  // ═══════════════════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const facts = getValidFacts()
    const tutoFacts = TUTO_FACT_IDS
      .map(id => facts.find(f => f.id === id))
      .filter(Boolean)
    setAllTutoFacts(tutoFacts)
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNAL COMPONENTS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── QuestionScreenTuto ───────────────────────────────────────────────────
  const QuestionScreenTuto = ({ fact, config, onAnswer, onTimeout }) => {
    const [timeRemaining, setTimeRemaining] = useState(config.duration)
    const timerRef = useRef(null)

    useEffect(() => {
      timerRef.current = setInterval(() => {
        setTimeRemaining(t => {
          if (t <= 1) {
            clearInterval(timerRef.current)
            onTimeout?.()
            return 0
          }
          return t - 1
        })
      }, 1000)
      return () => clearInterval(timerRef.current)
    }, [onTimeout])

    const options = fact.options || []
    const shuffledOptions = [...options].sort(() => Math.random() - 0.5).slice(0, config.choices)

    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'linear-gradient(160deg, rgba(255,107,26,0.1), rgba(255,107,26,0.05))',
        display: 'flex', flexDirection: 'column',
        padding: S_val(16),
        overflow: 'auto',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: S_val(20), paddingTop: S_val(8),
        }}>
          <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: S_val(14), fontWeight: 700, color: '#1a1a2e' }}>
            🪙 {sessionScore} coins
          </div>
          <div style={{ fontSize: S_val(14), fontWeight: 700, color: '#1a1a2e' }}>
            {currentIndex + 1} / {sessionFacts.length}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          width: '100%', height: S_val(4), background: '#e5e7eb', borderRadius: 999,
          marginBottom: S_val(20), overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', background: '#FF6B1A',
            width: `${((currentIndex + 1) / sessionFacts.length) * 100}%`,
            transition: 'width 0.3s',
          }} />
        </div>

        {/* Timer */}
        <div style={{
          fontSize: S_val(13), fontWeight: 700, color: timeRemaining <= 5 ? '#FF6B1A' : '#666',
          marginBottom: S_val(16),
        }}>
          ⏱️ {timeRemaining}s
        </div>

        {/* Question */}
        <div style={{
          fontSize: S_val(20), fontWeight: 900, color: '#1a1a2e',
          marginBottom: S_val(24), lineHeight: 1.4, textAlign: 'center',
        }}>
          {fact.question}
        </div>

        {/* Answer buttons */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: S_val(12),
          marginBottom: S_val(20),
        }}>
          {shuffledOptions.map((opt, idx) => {
            const isSelected = selectedAnswer === opt
            const isCorrectAnswer = opt === fact.answer
            let bgColor = '#f3f4f6'
            let borderColor = '#e5e7eb'
            let textColor = '#1a1a2e'

            if (showRevelation) {
              if (isCorrectAnswer) {
                bgColor = '#dcfce7'
                borderColor = '#86efac'
              } else if (isSelected && !isCorrectAnswer) {
                bgColor = '#fee2e2'
                borderColor = '#fca5a5'
              }
            } else if (isSelected) {
              bgColor = '#FFE8D6'
              borderColor = '#FF6B1A'
            }

            return (
              <button
                key={idx}
                onClick={() => {
                  if (!showRevelation) {
                    audio.play('click')
                    const correct = opt === fact.answer
                    setSelectedAnswer(opt)
                    setIsCorrect(correct)
                    setTimeout(() => setShowRevelation(true), 600)
                    onAnswer?.(correct)
                  }
                }}
                disabled={showRevelation}
                style={{
                  padding: S_val(16),
                  borderRadius: S_val(14),
                  border: `2px solid ${borderColor}`,
                  background: bgColor,
                  fontSize: S_val(15),
                  fontWeight: 700,
                  color: textColor,
                  cursor: showRevelation ? 'default' : 'pointer',
                  fontFamily: 'Nunito, sans-serif',
                  transition: 'all 0.2s',
                  opacity: showRevelation && isSelected === false && selectedAnswer !== null && opt !== fact.answer ? 0.5 : 1,
                }}
              >
                {opt}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ─── RevelationScreenTuto ──────────────────────────────────────────────────
  const RevelationScreenTuto = ({ fact, isCorrect, onNext }) => {
    const coinsEarned = isCorrect ? TUTO_FLASH_CONFIG.coinsPerCorrect : 0

    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'linear-gradient(160deg, rgba(255,107,26,0.1), rgba(255,107,26,0.05))',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: S_val(24),
        overflow: 'auto',
      }}>
        {/* Card */}
        <div style={{
          background: 'white', borderRadius: S_val(24), padding: S_val(32),
          maxWidth: S_val(360), width: '90%',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          gap: S_val(16),
        }}>
          {/* Emoji */}
          <div style={{ fontSize: S_val(56), lineHeight: 1 }}>
            {isCorrect ? '✅' : '❌'}
          </div>

          {/* Title */}
          <div style={{
            fontSize: S_val(24), fontWeight: 900, color: '#1a1a2e',
            textAlign: 'center', fontFamily: 'Nunito, sans-serif',
          }}>
            {isCorrect ? 'Bravo !' : 'Pas grave !'}
          </div>

          {/* Question + Answer */}
          <div style={{
            background: '#f9f9f9', borderRadius: S_val(12), padding: S_val(16),
            width: '100%', textAlign: 'center',
          }}>
            <div style={{
              fontSize: S_val(13), color: '#999', marginBottom: S_val(8),
              fontFamily: 'Nunito, sans-serif',
            }}>
              {fact.question}
            </div>
            <div style={{
              fontSize: S_val(16), fontWeight: 900, color: '#FF6B1A',
              fontFamily: 'Nunito, sans-serif',
            }}>
              ✓ {fact.answer}
            </div>
          </div>

          {/* Coins earned */}
          {isCorrect && (
            <div style={{
              fontSize: S_val(18), fontWeight: 900, color: '#FF6B1A',
              fontFamily: 'Nunito, sans-serif',
            }}>
              +{coinsEarned} 🪙
            </div>
          )}

          {/* Next button */}
          <button
            onClick={() => {
              audio.play('click')
              if (isCorrect) {
                setSessionScore(prev => prev + coinsEarned)
              }
              setCurrentIndex(prev => prev + 1)
              setSelectedAnswer(null)
              setShowRevelation(false)
              setIsCorrect(false)
              onNext?.()
            }}
            style={{
              width: '100%',
              padding: S_val(16),
              borderRadius: S_val(14),
              background: '#FF6B1A',
              color: 'white',
              border: 'none',
              fontWeight: 900,
              fontSize: S_val(16),
              cursor: 'pointer',
              fontFamily: 'Nunito, sans-serif',
              marginTop: S_val(8),
            }}
          >
            Suivant →
          </button>

          {/* Animated finger */}
          <div style={{
            fontSize: S_val(32),
            marginTop: S_val(8),
            animation: 'tutoFinger 0.8s ease-in-out infinite',
            pointerEvents: 'none',
          }}>
            👆
          </div>
        </div>

        <style>{`
          @keyframes tutoFinger {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
        `}</style>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE: INTRO
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === 'intro') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: S_val(20),
      }}>
        <div style={{
          background: 'white', borderRadius: S_val(24), padding: S_val(32),
          maxWidth: S_val(360), width: '90%',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          gap: S_val(16),
        }}>
          {/* Emoji */}
          <div style={{ fontSize: S_val(56), lineHeight: 1 }}>🤯</div>

          {/* Title */}
          <div style={{
            fontSize: S_val(22), fontWeight: 900, color: '#1a1a2e',
            textAlign: 'center', fontFamily: 'Nunito, sans-serif',
          }}>
            Prêt à découvrir
          </div>

          {/* Subtitle */}
          <div style={{
            fontSize: S_val(28), fontWeight: 900, color: '#FF6B1A',
            textAlign: 'center', fontFamily: 'Nunito, sans-serif',
          }}>
            What The F*ct ?
          </div>

          {/* Description */}
          <div style={{
            fontSize: S_val(14), color: '#666', textAlign: 'center',
            fontFamily: 'Nunito, sans-serif', lineHeight: 1.5,
            marginTop: S_val(8),
          }}>
            Des faits 100% vrais, des réactions 100% fun !
          </div>

          {/* Start button */}
          <button
            onClick={() => {
              audio.play('click')
              const shuffled = [...allTutoFacts].sort(() => Math.random() - 0.5)
              const first = shuffled[0]
              setFirstFactId(first.id)
              setUsedIds([first.id])
              const factWithOptions = { ...first, ...getAnswerOptions(first, TUTO_QUEST_CONFIG) }
              setSessionFacts([factWithOptions])
              setCurrentIndex(0)
              setSessionScore(0)
              setShowRevelation(false)
              setSelectedAnswer(null)
              setHintsRevealed([])
              setPhase('phase0')
            }}
            style={{
              width: '100%',
              padding: S_val(16),
              borderRadius: S_val(16),
              background: '#FF6B1A',
              color: 'white',
              border: 'none',
              fontWeight: 900,
              fontSize: S_val(16),
              cursor: 'pointer',
              fontFamily: 'Nunito, sans-serif',
              marginTop: S_val(24),
            }}
          >
            Commencer le tutoriel
          </button>

          {/* Skip link */}
          <button
            onClick={() => {
              audio.play('click')
              onSkip?.()
            }}
            style={{
              background: 'none',
              border: 'none',
              fontSize: S_val(13),
              color: 'rgba(0,0,0,0.4)',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontFamily: 'Nunito, sans-serif',
              marginTop: S_val(16),
            }}
          >
            Passer le tutoriel →
          </button>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE: PHASE0 (1 question)
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === 'phase0') {
    const currentFact = sessionFacts[currentIndex]

    if (showRevelation && currentFact) {
      return (
        <>
          <RevelationScreenTuto
            fact={currentFact}
            isCorrect={isCorrect}
            onNext={() => {
              setPhase('phase1_home')
              setFirstFactCorrect(isCorrect)
            }}
          />
          {/* Skip button */}
          <button
            onClick={() => {
              audio.play('click')
              onSkip?.()
            }}
            style={{
              position: 'fixed', top: S_val(20), right: S_val(20), zIndex: 10000,
              background: 'rgba(255,255,255,0.2)', border: 'none',
              color: 'rgba(255,255,255,0.8)',
              padding: S_val(8),
              borderRadius: S_val(8),
              fontSize: S_val(12),
              cursor: 'pointer',
              fontFamily: 'Nunito, sans-serif',
            }}
          >
            Passer &gt;
          </button>
        </>
      )
    }

    if (currentFact) {
      return (
        <>
          <QuestionScreenTuto
            fact={currentFact}
            config={TUTO_QUEST_CONFIG}
            onAnswer={(correct) => setIsCorrect(correct)}
            onTimeout={() => setShowRevelation(true)}
          />
          {/* Skip button */}
          <button
            onClick={() => {
              audio.play('click')
              onSkip?.()
            }}
            style={{
              position: 'fixed', top: S_val(20), right: S_val(20), zIndex: 10000,
              background: 'rgba(255,255,255,0.2)', border: 'none',
              color: 'rgba(255,255,255,0.8)',
              padding: S_val(8),
              borderRadius: S_val(8),
              fontSize: S_val(12),
              cursor: 'pointer',
              fontFamily: 'Nunito, sans-serif',
            }}
          >
            Passer &gt;
          </button>
        </>
      )
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE: PHASE1_HOME (simplified home for flash)
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === 'phase1_home') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'linear-gradient(160deg, #E8F5E9 0%, #F1F8E9 100%)',
        display: 'flex', flexDirection: 'column',
        padding: S_val(16), overflow: 'auto',
      }}>
        {/* Skip button */}
        <button
          onClick={() => {
            audio.play('click')
            onSkip?.()
          }}
          style={{
            position: 'fixed', top: S_val(20), right: S_val(20), zIndex: 10000,
            background: 'rgba(0,0,0,0.1)', border: 'none',
            color: 'rgba(0,0,0,0.6)',
            padding: S_val(8),
            borderRadius: S_val(8),
            fontSize: S_val(12),
            cursor: 'pointer',
            fontFamily: 'Nunito, sans-serif',
          }}
        >
          Passer &gt;
        </button>

        {/* Header */}
        <div style={{
          display: 'flex', gap: S_val(24), justifyContent: 'center',
          marginTop: S_val(24), marginBottom: S_val(32),
          fontSize: S_val(16), fontWeight: 700, fontFamily: 'Nunito, sans-serif',
        }}>
          <div>🪙 {sessionScore}</div>
          <div>🎫 0</div>
          <div>💡 0</div>
        </div>

        {/* Message */}
        <div style={{
          fontSize: S_val(18), fontWeight: 900, color: '#1a1a2e',
          textAlign: 'center', marginBottom: S_val(40),
          fontFamily: 'Nunito, sans-serif',
        }}>
          Joue en mode Flash !
        </div>

        {/* Modes grid (all disabled except Flash) */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: S_val(16),
          alignItems: 'center', flex: 1, justifyContent: 'center',
        }}>
          {/* Flash button - highlighted */}
          <button
            onClick={() => {
              audio.play('click')
              const available = allTutoFacts.filter(f => !usedIds.includes(f.id))
              const shuffled = available.sort(() => Math.random() - 0.5)
              const flashFacts = shuffled.slice(0, 5)
              const factsWithOptions = flashFacts.map(f => ({
                ...f,
                ...getAnswerOptions(f, TUTO_FLASH_CONFIG),
              }))
              setUsedIds(prev => [...prev, ...flashFacts.map(f => f.id)])
              setSessionFacts(factsWithOptions)
              setCurrentIndex(0)
              setShowRevelation(false)
              setSelectedAnswer(null)
              setHintsRevealed([])
              setPhase('phase1')
            }}
            style={{
              position: 'relative',
              padding: S_val(24),
              borderRadius: S_val(20),
              background: 'linear-gradient(135deg, #FF6B1A, #FF8A3D)',
              color: 'white',
              border: '3px solid #FFD700',
              fontSize: S_val(24),
              fontWeight: 900,
              cursor: 'pointer',
              fontFamily: 'Nunito, sans-serif',
              boxShadow: '0 0 30px rgba(255,107,26,0.4)',
              animation: 'tutoPulse 1.5s ease-in-out infinite',
              minWidth: S_val(200),
            }}
          >
            ⚡ Flash
            <div style={{
              position: 'absolute', top: S_val(8), right: S_val(12),
              background: '#FF0000', color: 'white',
              padding: `${S_val(4)} ${S_val(8)}`,
              borderRadius: S_val(4),
              fontSize: S_val(10),
              fontWeight: 900,
            }}>
              NEW
            </div>
          </button>

          {/* Other modes disabled */}
          {['Quest 🎯', 'Explorer 🧭', 'Blitz ⚡'].map((label, i) => (
            <div
              key={i}
              style={{
                padding: S_val(24),
                borderRadius: S_val(20),
                background: 'rgba(0,0,0,0.1)',
                color: 'rgba(0,0,0,0.3)',
                border: '3px solid transparent',
                fontSize: S_val(24),
                fontWeight: 900,
                fontFamily: 'Nunito, sans-serif',
                minWidth: S_val(200),
                opacity: 0.3,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Animated finger */}
        <div style={{
          position: 'fixed', bottom: S_val(120), left: '50%', transform: 'translateX(-50%)',
          fontSize: S_val(40),
          animation: 'tutoFinger 0.8s ease-in-out infinite',
          pointerEvents: 'none',
        }}>
          👆
        </div>

        <style>{`
          @keyframes tutoPulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 30px rgba(255,107,26,0.4); }
            50% { transform: scale(1.05); box-shadow: 0 0 40px rgba(255,107,26,0.6); }
          }
          @keyframes tutoFinger {
            0%, 100% { transform: translateX(-50%) translateY(0); }
            50% { transform: translateX(-50%) translateY(-8px); }
          }
        `}</style>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE: PHASE1 (5 Flash questions)
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === 'phase1') {
    const currentFact = sessionFacts[currentIndex]

    if (!currentFact) {
      return null
    }

    if (showRevelation) {
      return (
        <>
          <RevelationScreenTuto
            fact={currentFact}
            isCorrect={isCorrect}
            onNext={() => {
              const nextIndex = currentIndex + 1
              if (nextIndex >= sessionFacts.length) {
                setPhase('flash_complete')
              }
            }}
          />
          {/* Skip button */}
          <button
            onClick={() => {
              audio.play('click')
              onSkip?.()
            }}
            style={{
              position: 'fixed', top: S_val(20), right: S_val(20), zIndex: 10000,
              background: 'rgba(255,255,255,0.2)', border: 'none',
              color: 'rgba(255,255,255,0.8)',
              padding: S_val(8),
              borderRadius: S_val(8),
              fontSize: S_val(12),
              cursor: 'pointer',
              fontFamily: 'Nunito, sans-serif',
            }}
          >
            Passer &gt;
          </button>
        </>
      )
    }

    return (
      <>
        <QuestionScreenTuto
          fact={currentFact}
          config={TUTO_FLASH_CONFIG}
          onAnswer={(correct) => setIsCorrect(correct)}
          onTimeout={() => setShowRevelation(true)}
        />
        {/* Skip button */}
        <button
          onClick={() => {
            audio.play('click')
            onSkip?.()
          }}
          style={{
            position: 'fixed', top: S_val(20), right: S_val(20), zIndex: 10000,
            background: 'rgba(255,255,255,0.2)', border: 'none',
            color: 'rgba(255,255,255,0.8)',
            padding: S_val(8),
            borderRadius: S_val(8),
            fontSize: S_val(12),
            cursor: 'pointer',
            fontFamily: 'Nunito, sans-serif',
          }}
        >
          Passer &gt;
        </button>
      </>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE: FLASH_COMPLETE
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === 'flash_complete') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: S_val(20),
      }}>
        <div style={{
          background: 'white', borderRadius: S_val(24), padding: S_val(32),
          maxWidth: S_val(360), width: '90%',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          gap: S_val(16),
        }}>
          {/* Emoji */}
          <div style={{ fontSize: S_val(56), lineHeight: 1 }}>🎉</div>

          {/* Title */}
          <div style={{
            fontSize: S_val(24), fontWeight: 900, color: '#1a1a2e',
            textAlign: 'center', fontFamily: 'Nunito, sans-serif',
          }}>
            Bravo !
          </div>

          {/* Message */}
          <div style={{
            fontSize: S_val(16), color: '#666', textAlign: 'center',
            fontFamily: 'Nunito, sans-serif',
          }}>
            Tu as terminé ta première session !
          </div>

          {/* Reward */}
          <div style={{
            fontSize: S_val(14), color: '#FF6B1A', fontWeight: 700,
            textAlign: 'center', fontFamily: 'Nunito, sans-serif',
            marginTop: S_val(8),
          }}>
            Tu gagnes 1 ticket pour jouer en mode Quest !
          </div>

          {/* Ticket emoji */}
          <div style={{ fontSize: S_val(48) }}>🎫</div>

          {/* Continue button */}
          <button
            onClick={() => {
              audio.play('click')
              setPhase('phase2_home')
            }}
            style={{
              width: '100%',
              padding: S_val(16),
              borderRadius: S_val(16),
              background: '#FF6B1A',
              color: 'white',
              border: 'none',
              fontWeight: 900,
              fontSize: S_val(16),
              cursor: 'pointer',
              fontFamily: 'Nunito, sans-serif',
              marginTop: S_val(16),
            }}
          >
            Continuer
          </button>

          {/* Animated finger */}
          <div style={{
            fontSize: S_val(32),
            animation: 'tutoFinger 0.8s ease-in-out infinite',
            marginTop: S_val(8),
          }}>
            👆
          </div>
        </div>

        <style>{`
          @keyframes tutoFinger {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
        `}</style>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE: PHASE2_HOME (simplified home for quest)
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === 'phase2_home') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'linear-gradient(160deg, #E3F2FD 0%, #F3E5F5 100%)',
        display: 'flex', flexDirection: 'column',
        padding: S_val(16), overflow: 'auto',
      }}>
        {/* Skip button */}
        <button
          onClick={() => {
            audio.play('click')
            onSkip?.()
          }}
          style={{
            position: 'fixed', top: S_val(20), right: S_val(20), zIndex: 10000,
            background: 'rgba(0,0,0,0.1)', border: 'none',
            color: 'rgba(0,0,0,0.6)',
            padding: S_val(8),
            borderRadius: S_val(8),
            fontSize: S_val(12),
            cursor: 'pointer',
            fontFamily: 'Nunito, sans-serif',
          }}
        >
          Passer &gt;
        </button>

        {/* Header */}
        <div style={{
          display: 'flex', gap: S_val(24), justifyContent: 'center',
          marginTop: S_val(24), marginBottom: S_val(32),
          fontSize: S_val(16), fontWeight: 700, fontFamily: 'Nunito, sans-serif',
        }}>
          <div>🪙 {sessionScore}</div>
          <div>🎫 1</div>
          <div>💡 0</div>
        </div>

        {/* Message */}
        <div style={{
          fontSize: S_val(18), fontWeight: 900, color: '#1a1a2e',
          textAlign: 'center', marginBottom: S_val(40),
          fontFamily: 'Nunito, sans-serif',
        }}>
          Maintenant, joue en mode Quest !
        </div>

        {/* Modes grid */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: S_val(16),
          alignItems: 'center', flex: 1, justifyContent: 'center',
        }}>
          {/* Flash disabled */}
          <div
            style={{
              padding: S_val(24),
              borderRadius: S_val(20),
              background: 'rgba(0,0,0,0.1)',
              color: 'rgba(0,0,0,0.3)',
              border: '3px solid transparent',
              fontSize: S_val(24),
              fontWeight: 900,
              fontFamily: 'Nunito, sans-serif',
              minWidth: S_val(200),
              opacity: 0.3,
            }}
          >
            ⚡ Flash
          </div>

          {/* Quest button - highlighted */}
          <button
            onClick={() => {
              audio.play('click')
              const available = allTutoFacts.filter(f => !usedIds.includes(f.id))
              const questFacts = available.slice(0, 5)
              const factsWithOptions = questFacts.map(f => ({
                ...f,
                ...getAnswerOptions(f, TUTO_QUEST_CONFIG),
              }))
              setUsedIds(prev => [...prev, ...questFacts.map(f => f.id)])
              setSessionFacts(factsWithOptions)
              setCurrentIndex(0)
              setShowRevelation(false)
              setSelectedAnswer(null)
              setHintsRevealed([])
              setPhase('phase2')
            }}
            style={{
              position: 'relative',
              padding: S_val(24),
              borderRadius: S_val(20),
              background: 'linear-gradient(135deg, #FF6B1A, #FF8A3D)',
              color: 'white',
              border: '3px solid #FFD700',
              fontSize: S_val(24),
              fontWeight: 900,
              cursor: 'pointer',
              fontFamily: 'Nunito, sans-serif',
              boxShadow: '0 0 30px rgba(255,107,26,0.4)',
              animation: 'tutoPulse 1.5s ease-in-out infinite',
              minWidth: S_val(200),
            }}
          >
            🎯 Quest
            <div style={{
              position: 'absolute', top: S_val(8), right: S_val(12),
              background: '#FF0000', color: 'white',
              padding: `${S_val(4)} ${S_val(8)}`,
              borderRadius: S_val(4),
              fontSize: S_val(10),
              fontWeight: 900,
            }}>
              NEW
            </div>
          </button>

          {/* Other modes disabled */}
          {['Explorer 🧭', 'Blitz ⚡'].map((label, i) => (
            <div
              key={i}
              style={{
                padding: S_val(24),
                borderRadius: S_val(20),
                background: 'rgba(0,0,0,0.1)',
                color: 'rgba(0,0,0,0.3)',
                border: '3px solid transparent',
                fontSize: S_val(24),
                fontWeight: 900,
                fontFamily: 'Nunito, sans-serif',
                minWidth: S_val(200),
                opacity: 0.3,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Animated finger */}
        <div style={{
          position: 'fixed', bottom: S_val(120), left: '50%', transform: 'translateX(-50%)',
          fontSize: S_val(40),
          animation: 'tutoFinger 0.8s ease-in-out infinite',
          pointerEvents: 'none',
        }}>
          👆
        </div>

        <style>{`
          @keyframes tutoPulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 30px rgba(255,107,26,0.4); }
            50% { transform: scale(1.05); box-shadow: 0 0 40px rgba(255,107,26,0.6); }
          }
          @keyframes tutoFinger {
            0%, 100% { transform: translateX(-50%) translateY(0); }
            50% { transform: translateX(-50%) translateY(-8px); }
          }
        `}</style>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE: PHASE2 (5 Quest questions)
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === 'phase2') {
    const currentFact = sessionFacts[currentIndex]

    if (!currentFact) {
      return null
    }

    if (showRevelation) {
      return (
        <>
          <RevelationScreenTuto
            fact={currentFact}
            isCorrect={isCorrect}
            onNext={() => {
              const nextIndex = currentIndex + 1
              if (nextIndex >= sessionFacts.length) {
                setPhase('quest_complete')
              }
            }}
          />
          {/* Skip button */}
          <button
            onClick={() => {
              audio.play('click')
              onSkip?.()
            }}
            style={{
              position: 'fixed', top: S_val(20), right: S_val(20), zIndex: 10000,
              background: 'rgba(255,255,255,0.2)', border: 'none',
              color: 'rgba(255,255,255,0.8)',
              padding: S_val(8),
              borderRadius: S_val(8),
              fontSize: S_val(12),
              cursor: 'pointer',
              fontFamily: 'Nunito, sans-serif',
            }}
          >
            Passer &gt;
          </button>
        </>
      )
    }

    return (
      <>
        <QuestionScreenTuto
          fact={currentFact}
          config={TUTO_QUEST_CONFIG}
          onAnswer={(correct) => setIsCorrect(correct)}
          onTimeout={() => setShowRevelation(true)}
        />
        {/* Skip button */}
        <button
          onClick={() => {
            audio.play('click')
            onSkip?.()
          }}
          style={{
            position: 'fixed', top: S_val(20), right: S_val(20), zIndex: 10000,
            background: 'rgba(255,255,255,0.2)', border: 'none',
            color: 'rgba(255,255,255,0.8)',
            padding: S_val(8),
            borderRadius: S_val(8),
            fontSize: S_val(12),
            cursor: 'pointer',
            fontFamily: 'Nunito, sans-serif',
          }}
        >
          Passer &gt;
        </button>
      </>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE: QUEST_COMPLETE
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === 'quest_complete') {
    const firstFact = allTutoFacts.find(f => f.id === firstFactId)

    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: S_val(20),
      }}>
        <div style={{
          background: 'white', borderRadius: S_val(24), padding: S_val(32),
          maxWidth: S_val(360), width: '90%',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          gap: S_val(16),
        }}>
          {/* Emoji */}
          <div style={{ fontSize: S_val(56), lineHeight: 1 }}>⭐</div>

          {/* Title */}
          <div style={{
            fontSize: S_val(22), fontWeight: 900, color: '#1a1a2e',
            textAlign: 'center', fontFamily: 'Nunito, sans-serif',
          }}>
            Premier f*ct débloqué !
          </div>

          {/* Fact image */}
          {firstFact?.imageUrl && (
            <img
              src={firstFact.imageUrl}
              alt="First fact"
              style={{
                width: S_val(200),
                height: S_val(200),
                borderRadius: S_val(16),
                objectFit: 'cover',
                margin: S_val(16),
              }}
            />
          )}

          {/* Fact title */}
          {firstFact && (
            <div style={{
              fontSize: S_val(14), color: '#666', textAlign: 'center',
              fontFamily: 'Nunito, sans-serif', fontWeight: 700,
            }}>
              {firstFact.question}
            </div>
          )}

          {/* View collection button */}
          <button
            onClick={() => {
              audio.play('click')
              setPhase('phase3')
              setSelectedCategoryId(null)
              setPhase3FactDetail(null)
            }}
            style={{
              width: '100%',
              padding: S_val(16),
              borderRadius: S_val(16),
              background: '#FF6B1A',
              color: 'white',
              border: 'none',
              fontWeight: 900,
              fontSize: S_val(16),
              cursor: 'pointer',
              fontFamily: 'Nunito, sans-serif',
              marginTop: S_val(16),
            }}
          >
            Voir ma Collection
          </button>

          {/* Animated finger */}
          <div style={{
            fontSize: S_val(32),
            animation: 'tutoFinger 0.8s ease-in-out infinite',
            marginTop: S_val(8),
          }}>
            👆
          </div>
        </div>

        <style>{`
          @keyframes tutoFinger {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
        `}</style>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE: PHASE3 (Collection onboarding - simplified)
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === 'phase3') {
    const firstFact = allTutoFacts.find(f => f.id === firstFactId)
    const GUEST_CATEGORIES = ['kids', 'animaux', 'sport', 'records', 'definition']

    // Fact detail view
    if (phase3FactDetail) {
      return (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: S_val(20),
        }}>
          <div style={{
            background: 'white', borderRadius: S_val(24), padding: S_val(32),
            maxWidth: S_val(360), width: '90%',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            gap: S_val(16),
            position: 'relative',
          }}>
            {/* Close button */}
            <button
              onClick={() => setPhase3FactDetail(null)}
              style={{
                position: 'absolute', top: S_val(16), right: S_val(16),
                background: '#f3f4f6', border: 'none',
                borderRadius: S_val(50), width: S_val(32), height: S_val(32),
                fontSize: S_val(18), cursor: 'pointer',
              }}
            >
              ✕
            </button>

            {/* Fact image */}
            {phase3FactDetail.imageUrl && (
              <img
                src={phase3FactDetail.imageUrl}
                alt="Fact"
                style={{
                  width: '100%',
                  borderRadius: S_val(16),
                  objectFit: 'cover',
                  marginTop: S_val(16),
                }}
              />
            )}

            {/* Fact title */}
            <div style={{
              fontSize: S_val(18), fontWeight: 900, color: '#FF6B1A',
              textAlign: 'center', fontFamily: 'Nunito, sans-serif',
            }}>
              {phase3FactDetail.question}
            </div>

            {/* Fact explanation */}
            <div style={{
              fontSize: S_val(14), color: '#666', textAlign: 'center',
              fontFamily: 'Nunito, sans-serif', lineHeight: 1.5,
            }}>
              {phase3FactDetail.explanation}
            </div>

            {/* Back button */}
            <button
              onClick={() => setPhase3FactDetail(null)}
              style={{
                width: '100%',
                padding: S_val(14),
                borderRadius: S_val(14),
                background: '#f3f4f6',
                color: '#1a1a2e',
                border: 'none',
                fontWeight: 700,
                fontSize: S_val(14),
                cursor: 'pointer',
                fontFamily: 'Nunito, sans-serif',
              }}
            >
              Retour
            </button>
          </div>
        </div>
      )
    }

    // Category list view
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#FAFAF8',
        display: 'flex', flexDirection: 'column',
        padding: S_val(16), overflow: 'auto',
      }}>
        {/* Header */}
        <div style={{
          fontSize: S_val(24), fontWeight: 900, color: '#1a1a2e',
          textAlign: 'center', marginBottom: S_val(24),
          fontFamily: 'Nunito, sans-serif', marginTop: S_val(16),
        }}>
          Ma Collection
        </div>

        {/* Categories */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: S_val(12),
          flex: 1,
        }}>
          {GUEST_CATEGORIES.map((catId, idx) => {
            const isFirstFact = firstFact?.category === catId
            const backgroundColor = isFirstFact
              ? 'linear-gradient(135deg, #FFE8D6, #FFD4B3)'
              : 'linear-gradient(135deg, #f3f4f6, #e5e7eb)'
            const borderColor = isFirstFact ? '#FF6B1A' : '#e5e7eb'

            return (
              <button
                key={catId}
                onClick={() => {
                  if (isFirstFact) {
                    setPhase3FactDetail(firstFact)
                  }
                }}
                style={{
                  padding: S_val(20),
                  borderRadius: S_val(16),
                  background: backgroundColor,
                  border: `2px solid ${borderColor}`,
                  fontSize: S_val(16),
                  fontWeight: 900,
                  color: '#1a1a2e',
                  cursor: isFirstFact ? 'pointer' : 'default',
                  fontFamily: 'Nunito, sans-serif',
                  textAlign: 'left',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <span>{catId.charAt(0).toUpperCase() + catId.slice(1)}</span>
                {isFirstFact && <span>🔓 1 f*ct</span>}
                {!isFirstFact && <span>🔒 0 f*cts</span>}
              </button>
            )
          })}
        </div>

        {/* Finish button */}
        <button
          onClick={() => {
            audio.play('click')
            onComplete?.(firstFactId)
          }}
          style={{
            padding: S_val(16),
            borderRadius: S_val(16),
            background: '#FF6B1A',
            color: 'white',
            border: 'none',
            fontWeight: 900,
            fontSize: S_val(16),
            cursor: 'pointer',
            fontFamily: 'Nunito, sans-serif',
            marginTop: S_val(24),
            marginBottom: S_val(20),
            position: 'relative',
          }}
        >
          Terminer le tutoriel 🚀
          <div style={{
            position: 'absolute', bottom: S_val(-32), left: '50%', transform: 'translateX(-50%)',
            fontSize: S_val(32),
            animation: 'tutoFinger 0.8s ease-in-out infinite',
            pointerEvents: 'none',
          }}>
            👆
          </div>
        </button>

        <style>{`
          @keyframes tutoFinger {
            0%, 100% { transform: translateX(-50%) translateY(0); }
            50% { transform: translateX(-50%) translateY(-8px); }
          }
        `}</style>
      </div>
    )
  }

  return null
}
