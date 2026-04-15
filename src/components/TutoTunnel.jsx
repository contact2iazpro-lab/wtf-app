import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { TUTO_FACT_IDS, TUTO_FLASH_CONFIG } from '../constants/gameConfig'
import { getValidFacts, getPlayableCategories } from '../data/factsService'
import { useScale } from '../hooks/useScale'
import { audio } from '../utils/audio'
import { getAnswerOptions } from '../utils/answers'
import QuestionTemplate from './templates/QuestionTemplate'
import RevelationTemplate from './templates/RevelationTemplate'

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════
const CAT_COLORS = {
  sport: '#EF4444', records: '#F59E0B', animaux: '#22C55E',
  kids: '#EC4899', definition: '#8B5CF6', sciences: '#3B82F6',
  histoire: '#F97316', geographie: '#14B8A6', gastronomie: '#D97706',
  technologie: '#6366F1', sante: '#10B981', art: '#A855F7',
  'corps-humain': '#EF4444', phobies: '#7C3AED', lois: '#64748B',
}

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
  const [sessionFacts, setSessionFacts] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [isCorrect, setIsCorrect] = useState(false)
  const [showRevelation, setShowRevelation] = useState(false)
  const [sessionScore, setSessionScore] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [phase3FactDetail, setPhase3FactDetail] = useState(null)
  const [showFirstFactModal, setShowFirstFactModal] = useState(false)
  const [currentOptions, setCurrentOptions] = useState([])
  const [hintsRevealed, setHintsRevealed] = useState([])
  const [timeLeft, setTimeLeft] = useState(30)
  const [socialPercent, setSocialPercent] = useState(50)

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

  // Generate options when question changes
  useEffect(() => {
    if (!sessionFacts[currentIndex]) return
    const fact = sessionFacts[currentIndex]
    const config = phase === 'phase1' ? TUTO_FLASH_CONFIG : TUTO_FLASH_CONFIG
    const correctAnswer = fact.short_answer
    const wrongAnswers = (fact.options || []).filter(o => o !== correctAnswer)
    const shuffledWrong = wrongAnswers.sort(() => Math.random() - 0.5).slice(0, config.choices - 1)
    const allOptions = [correctAnswer, ...shuffledWrong].sort(() => Math.random() - 0.5)
    const optionsForTemplate = allOptions.map(text => ({ text, isCorrect: text === correctAnswer }))
    setCurrentOptions(optionsForTemplate)
    setHintsRevealed([])
  }, [currentIndex, sessionFacts, phase])

  // Reset timer when question changes
  useEffect(() => {
    setTimeLeft(30)
    const timerRef = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef)
  }, [currentIndex, sessionFacts])

  // Generate socialPercent when revelation happens
  useEffect(() => {
    if (showRevelation) {
      setSocialPercent(Math.floor(Math.random() * 40) + 45)
    }
  }, [showRevelation])

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
              const factWithOptions = { ...first, ...getAnswerOptions(first, TUTO_FLASH_CONFIG) }
              setSessionFacts([factWithOptions])
              setCurrentIndex(0)
              setSessionScore(0)
              setShowRevelation(false)
              setSelectedAnswer(null)
              setHintsUsed(0)
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
  // PHASE: PHASE0 (1 question with real QuestionScreen)
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === 'phase0') {
    const currentFact = sessionFacts[currentIndex]

    if (showRevelation && currentFact) {
      const catColor = CAT_COLORS[currentFact.category] || '#FF6B1A'
      const coinsEarned = isCorrect ? TUTO_FLASH_CONFIG.coinsPerCorrect : 0
      return (
        <RevelationTemplate
          catColor={catColor}
          catName={currentFact.category}
          catIcon={'/assets/categories/' + currentFact.category + '.png'}
          isCorrect={isCorrect}
          imageUrl={currentFact.image_url || currentFact.imageUrl || ''}
          question={currentFact.question}
          correctAnswer={currentFact.short_answer}
          explanation={currentFact.explanation || ''}
          message={isCorrect ? 'Bravo ! 🎉' : 'Pas grave ! 😅'}
          coinsEarned={coinsEarned}
          totalCoins={sessionScore + coinsEarned}
          tickets={0}
          hintsCount={0}
          socialProofPercent={isCorrect ? socialPercent : 0}
          onNext={() => {
            if (isCorrect) {
              setSessionScore(prev => prev + coinsEarned)
            }
            setShowRevelation(false)
            setShowFirstFactModal(true)
          }}
          onShare={() => {}}
          onQuit={() => onSkip?.()}
          showFinger={true}
          showShareButton={false}
          showExplanation={isCorrect}
          isLast={false}
          isVip={currentFact.isVip || false}
        />
      )
    }

    if (showFirstFactModal) {
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
            {/* Fact image */}
            {firstFact?.imageUrl && (
              <img
                src={firstFact.imageUrl}
                alt="First fact"
                style={{
                  width: S_val(120),
                  height: S_val(120),
                  borderRadius: S_val(16),
                  objectFit: 'cover',
                }}
              />
            )}

            {/* Title */}
            <div style={{
              fontSize: S_val(22), fontWeight: 900, color: '#FF6B1A',
              textAlign: 'center', fontFamily: 'Nunito, sans-serif',
            }}>
              Ton premier f*ct WTF! 🏆
            </div>

            {/* Description 1 */}
            <div style={{
              fontSize: S_val(14), color: '#666', textAlign: 'center',
              fontFamily: 'Nunito, sans-serif',
            }}>
              Ce f*ct est maintenant dans ta collection.
            </div>

            {/* Description 2 */}
            <div style={{
              fontSize: S_val(14), color: '#666', textAlign: 'center',
              fontFamily: 'Nunito, sans-serif',
            }}>
              Plus tu joues, plus ta collection grandit !
            </div>

            {/* Play button */}
            <button
              onClick={() => {
                console.log('[TutoTunnel] FirstFactModal -> phase1_home')
                audio.play('click')
                setShowFirstFactModal(false)
                setPhase('phase1_home')
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
              Jouer ma première partie ⚡
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

    if (currentFact && currentOptions.length > 0) {
      const catColor = CAT_COLORS[currentFact.category] || '#FF6B1A'
      return (
        <QuestionTemplate
          catColor={catColor}
          catName={currentFact.category}
          catIcon={'/assets/categories/' + currentFact.category + '.png'}
          modeLabel='⭐ MODE QUEST'
          question={currentFact.question}
          options={currentOptions}
          selectedAnswerIndex={selectedAnswer !== null ? currentOptions.findIndex(opt => opt.text === selectedAnswer) : null}
          onSelectAnswer={(index) => {
            const selectedIdx = currentOptions[index]?.text
            setSelectedAnswer(selectedIdx)
            setIsCorrect(currentOptions[index]?.isCorrect || false)
            setTimeout(() => setShowRevelation(true), 800)
          }}
          hints={[
            { text: currentFact.hint1 || '', revealed: hintsRevealed.includes(0), label: '💡 Indice — Gratuit' },
            { text: currentFact.hint2 || '', revealed: hintsRevealed.includes(1), label: '💡 Indice — Gratuit' },
          ].filter(h => h.text)}
          onRevealHint={(i) => { if (!hintsRevealed.includes(i)) setHintsRevealed(prev => [...prev, i]) }}
          timer={timeLeft}
          progressIndex={currentIndex}
          totalQuestions={sessionFacts.length}
          coins={sessionScore}
          tickets={0}
          hintsCount={0}
          onQuit={() => onSkip?.()}
          showFinger={false}
        />
      )
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE: PHASE0_COMPLETE (Ton premier f*ct modal)
  // ═══════════════════════════════════════════════════════════════════════════
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
        {/* Header */}
        <div style={{
          display: 'flex', gap: S_val(24), justifyContent: 'center',
          marginTop: S_val(24), marginBottom: S_val(32),
          fontSize: S_val(16), fontWeight: 700, fontFamily: 'Nunito, sans-serif',
        }}>
          <div><img src="/assets/ui/icon-coins.png" alt="coins" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} /> {sessionScore}</div>
          <div><img src="/assets/ui/icon-tickets.png" alt="tickets" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} /> 0</div>
          <div><img src="/assets/ui/icon-hint.png" alt="indice" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} /> 0</div>
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
              setHintsUsed(0)
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
  // PHASE: PHASE1 (5 Flash questions with real QuestionScreen)
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === 'phase1') {
    const currentFact = sessionFacts[currentIndex]

    if (!currentFact) {
      return null
    }

    if (showRevelation) {
      const catColor = CAT_COLORS[currentFact.category] || '#FF6B1A'
      const coinsEarned = isCorrect ? TUTO_FLASH_CONFIG.coinsPerCorrect : 0
      const isLast = currentIndex >= sessionFacts.length - 1
      return (
        <RevelationTemplate
          catColor={catColor}
          catName={currentFact.category}
          catIcon={'/assets/categories/' + currentFact.category + '.png'}
          isCorrect={isCorrect}
          imageUrl={currentFact.image_url || currentFact.imageUrl || ''}
          question={currentFact.question}
          correctAnswer={currentFact.short_answer}
          explanation={currentFact.explanation || ''}
          message={isCorrect ? 'Bravo ! 🎉' : 'Pas grave ! 😅'}
          coinsEarned={coinsEarned}
          totalCoins={sessionScore + coinsEarned}
          tickets={0}
          hintsCount={0}
          socialProofPercent={isCorrect ? socialPercent : 0}
          onNext={() => {
            if (isCorrect) {
              setSessionScore(prev => prev + coinsEarned)
            }
            const nextIndex = currentIndex + 1
            if (nextIndex >= sessionFacts.length) {
              setPhase('flash_complete')
            } else {
              setCurrentIndex(nextIndex)
              setSelectedAnswer(null)
              setShowRevelation(false)
              setIsCorrect(false)
              setHintsUsed(0)
            }
          }}
          onShare={() => {}}
          onQuit={() => onSkip?.()}
          showFinger={true}
          showShareButton={false}
          showExplanation={isCorrect}
          isLast={isLast}
          isVip={currentFact.isVip || false}
        />
      )
    }

    const catColor = CAT_COLORS[currentFact.category] || '#FF6B1A'
    return (
      <QuestionTemplate
        catColor={catColor}
        catName={currentFact.category}
        catIcon={'/assets/categories/' + currentFact.category + '.png'}
        modeLabel='⚡ MODE FLASH'
        question={currentFact.question}
        options={currentOptions}
        selectedAnswerIndex={selectedAnswer !== null ? currentOptions.findIndex(opt => opt.text === selectedAnswer) : null}
        onSelectAnswer={(index) => {
          const selectedIdx = currentOptions[index]?.text
          setSelectedAnswer(selectedIdx)
          setIsCorrect(currentOptions[index]?.isCorrect || false)
          setTimeout(() => setShowRevelation(true), 800)
        }}
        hints={[
          { text: currentFact.hint1 || '', revealed: hintsRevealed.includes(0), label: '💡 Indice — Gratuit' },
          { text: currentFact.hint2 || '', revealed: hintsRevealed.includes(1), label: '💡 Indice — Gratuit' },
        ].filter(h => h.text)}
        onRevealHint={(i) => { if (!hintsRevealed.includes(i)) setHintsRevealed(prev => [...prev, i]) }}
        timer={timeLeft}
        progressIndex={currentIndex}
        totalQuestions={sessionFacts.length}
        coins={sessionScore}
        tickets={0}
        hintsCount={0}
        onQuit={() => onSkip?.()}
        showFinger={false}
      />
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
          <div style={{ fontSize: S_val(48) }}><img src="/assets/ui/icon-tickets.png" alt="tickets" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} /></div>

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
        {/* Header */}
        <div style={{
          display: 'flex', gap: S_val(24), justifyContent: 'center',
          marginTop: S_val(24), marginBottom: S_val(32),
          fontSize: S_val(16), fontWeight: 700, fontFamily: 'Nunito, sans-serif',
        }}>
          <div><img src="/assets/ui/icon-coins.png" alt="coins" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} /> {sessionScore}</div>
          <div><img src="/assets/ui/icon-tickets.png" alt="tickets" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} /> 1</div>
          <div><img src="/assets/ui/icon-hint.png" alt="indice" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} /> 0</div>
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
                ...getAnswerOptions(f, TUTO_FLASH_CONFIG),
              }))
              setUsedIds(prev => [...prev, ...questFacts.map(f => f.id)])
              setSessionFacts(factsWithOptions)
              setCurrentIndex(0)
              setShowRevelation(false)
              setSelectedAnswer(null)
              setHintsUsed(0)
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
  // PHASE: PHASE2 (5 Quest questions with real QuestionScreen)
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === 'phase2') {
    const currentFact = sessionFacts[currentIndex]

    if (!currentFact) {
      return null
    }

    if (showRevelation) {
      const catColor = CAT_COLORS[currentFact.category] || '#FF6B1A'
      const coinsEarned = isCorrect ? TUTO_FLASH_CONFIG.coinsPerCorrect : 0
      const isLast = currentIndex >= sessionFacts.length - 1
      return (
        <RevelationTemplate
          catColor={catColor}
          catName={currentFact.category}
          catIcon={'/assets/categories/' + currentFact.category + '.png'}
          isCorrect={isCorrect}
          imageUrl={currentFact.image_url || currentFact.imageUrl || ''}
          question={currentFact.question}
          correctAnswer={currentFact.short_answer}
          explanation={currentFact.explanation || ''}
          message={isCorrect ? 'Bravo ! 🎉' : 'Pas grave ! 😅'}
          coinsEarned={coinsEarned}
          totalCoins={sessionScore + coinsEarned}
          tickets={0}
          hintsCount={0}
          socialProofPercent={isCorrect ? socialPercent : 0}
          onNext={() => {
            if (isCorrect) {
              setSessionScore(prev => prev + coinsEarned)
            }
            const nextIndex = currentIndex + 1
            if (nextIndex >= sessionFacts.length) {
              setPhase('quest_complete')
            } else {
              setCurrentIndex(nextIndex)
              setSelectedAnswer(null)
              setShowRevelation(false)
              setIsCorrect(false)
              setHintsUsed(0)
            }
          }}
          onShare={() => {}}
          onQuit={() => onSkip?.()}
          showFinger={true}
          showShareButton={false}
          showExplanation={isCorrect}
          isLast={isLast}
          isVip={currentFact.isVip || false}
        />
      )
    }

    const catColor = CAT_COLORS[currentFact.category] || '#FF6B1A'
    return (
      <QuestionTemplate
        catColor={catColor}
        catName={currentFact.category}
        catIcon={'/assets/categories/' + currentFact.category + '.png'}
        modeLabel='⭐ MODE QUEST'
        question={currentFact.question}
        options={currentOptions}
        selectedAnswerIndex={selectedAnswer !== null ? currentOptions.findIndex(opt => opt.text === selectedAnswer) : null}
        onSelectAnswer={(index) => {
          const selectedIdx = currentOptions[index]?.text
          setSelectedAnswer(selectedIdx)
          setIsCorrect(currentOptions[index]?.isCorrect || false)
          setTimeout(() => setShowRevelation(true), 800)
        }}
        hints={[
          { text: currentFact.hint1 || '', revealed: hintsRevealed.includes(0), label: '💡 Indice — Gratuit' },
          { text: currentFact.hint2 || '', revealed: hintsRevealed.includes(1), label: '💡 Indice — Gratuit' },
        ].filter(h => h.text)}
        onRevealHint={(i) => { if (!hintsRevealed.includes(i)) setHintsRevealed(prev => [...prev, i]) }}
        timer={timeLeft}
        progressIndex={currentIndex}
        totalQuestions={sessionFacts.length}
        coins={sessionScore}
        tickets={0}
        hintsCount={0}
        onQuit={() => onSkip?.()}
        showFinger={false}
      />
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
