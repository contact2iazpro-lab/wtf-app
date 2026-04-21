import { useState, useEffect, useRef, useMemo } from 'react'
import { getValidFacts } from '../data/factsService'
import { getAnswerOptions } from '../utils/answers'
import { audio } from '../utils/audio'
import GameHeader from '../components/GameHeader'
import HintFlipButton from '../components/HintFlipButton'
import FallbackImage from '../components/FallbackImage'
import RevelationTemplate from '../components/templates/RevelationTemplate'
import renderFormattedText from '../utils/renderFormattedText'
import { HOOK_FACT_ID, HOOK_FACT_CONFIG, TEXTS } from './onboardingConfig'
import { TUTO_FACT_IDS } from '../constants/gameConfig'

const OB_COLOR = '#FFA500'
const S = (px) => `calc(${px}px * var(--scale))`

export default function OnboardingFact({ onComplete, onSkip }) {
  const [phase, setPhase] = useState('question')
  const [fact, setFact] = useState(null)
  const [options, setOptions] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [hintsRevealed, setHintsRevealed] = useState([false, false])
  const [showHintSpotlight, setShowHintSpotlight] = useState(false)
  const [socialPercent] = useState(() => Math.floor(Math.random() * 30) + 55)
  const [imgFailed, setImgFailed] = useState(false)
  const hintTimerRef = useRef(null)

  const allHintsRevealed = hintsRevealed[0] && hintsRevealed[1]

  useEffect(() => {
    const allFacts = getValidFacts()
    let hookFact = allFacts.find(f => f.id === HOOK_FACT_ID)
    if (!hookFact) {
      for (const id of TUTO_FACT_IDS) {
        hookFact = allFacts.find(f => f.id === id)
        if (hookFact) break
      }
    }
    if (!hookFact && allFacts.length > 0) {
      hookFact = allFacts[Math.floor(Math.random() * allFacts.length)]
    }
    if (!hookFact) return

    const result = getAnswerOptions(hookFact, HOOK_FACT_CONFIG)
    const allOptions = result.options.map((text, i) => ({
      text,
      isCorrect: i === result.correctIndex,
    }))

    setFact(hookFact)
    setOptions(allOptions)
  }, [])

  // Hint spotlight after 3s
  useEffect(() => {
    if (phase !== 'question' || !fact) return
    hintTimerRef.current = setTimeout(() => {
      if (!hintsRevealed[0] && !hintsRevealed[1]) {
        setShowHintSpotlight(true)
      }
    }, 3000)
    return () => clearTimeout(hintTimerRef.current)
  }, [phase, fact])

  const hintTexts = useMemo(() => ['Animal', 'Félin'], [])

  const handleAnswer = (index) => {
    if (selectedIndex !== null) return
    if (!allHintsRevealed) return
    const opt = options[index]
    if (!opt?.isCorrect) return
    setSelectedIndex(index)
    clearTimeout(hintTimerRef.current)
    setShowHintSpotlight(false)
    audio.play('correct')
    setTimeout(() => setPhase('revelation'), 900)
  }

  const handleHintReveal = (num) => {
    const idx = num - 1
    if (hintsRevealed[idx]) return
    setHintsRevealed(prev => { const n = [...prev]; n[idx] = true; return n })
    setShowHintSpotlight(false)
    audio.play('click')
  }

  if (!fact) return null

  // ── Phase: Transition ──
  if (phase === 'transition') {
    const coinsEarned = HOOK_FACT_CONFIG.coinsPerCorrect
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: `linear-gradient(160deg, ${OB_COLOR}22 0%, ${OB_COLOR} 100%)`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Nunito, sans-serif', padding: S(24),
        animation: 'fadeIn 0.4s ease',
      }}>
        <div style={{
          fontSize: S(48), marginBottom: S(16),
          animation: 'transitionBounce 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          🎉
        </div>
        <h2 style={{ color: 'white', fontSize: S(22), fontWeight: 900, textAlign: 'center', margin: 0, marginBottom: S(8) }}>
          {TEXTS.hookFact.transitionTitle}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: S(14), fontWeight: 600, textAlign: 'center', margin: 0, marginBottom: S(32) }}>
          {TEXTS.hookFact.transitionSubtitle}
        </p>
        <div style={{
          background: 'rgba(255,255,255,0.15)', borderRadius: S(16),
          padding: `${S(12)} ${S(24)}`,
          display: 'flex', alignItems: 'center', gap: S(8),
          animation: 'coinsPop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.3s both',
        }}>
          <img src="/assets/ui/icon-coins.png" alt="" style={{ width: S(24), height: S(24) }} />
          <span style={{ color: 'white', fontSize: S(20), fontWeight: 900 }}>+{coinsEarned} WTFCoins</span>
        </div>
        <button
          onClick={() => { audio.play('click'); onComplete({ factId: fact.id, coinsEarned }) }}
          style={{
            marginTop: S(40), padding: `${S(16)} ${S(48)}`,
            borderRadius: S(16), background: 'white', color: OB_COLOR,
            border: 'none', fontWeight: 900, fontSize: S(16),
            cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          }}
        >
          C'est parti !
        </button>
        <style>{`
          @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
          @keyframes transitionBounce { 0% { transform: scale(0) } 100% { transform: scale(1) } }
          @keyframes coinsPop { 0% { transform: scale(0); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
        `}</style>
      </div>
    )
  }

  // ── Phase: Revelation ──
  if (phase === 'revelation') {
    const coinsEarned = HOOK_FACT_CONFIG.coinsPerCorrect
    return (
      <RevelationTemplate
        catColor={OB_COLOR}
        catName={fact.category}
        catIcon={`/assets/categories/${fact.category}.png`}
        isCorrect={true}
        imageUrl={fact.imageUrl || ''}
        question={fact.question}
        correctAnswer={fact.short_answer}
        explanation={fact.explanation || ''}
        message="Bravo !"
        coinsEarned={coinsEarned}
        totalCoins={coinsEarned}
        hintsCount={0}
        socialProofPercent={socialPercent}
        onNext={() => setPhase('transition')}
        onShare={() => {}}
        onQuit={() => onSkip?.()}
        showFinger={true}
        showShareButton={false}
        showExplanation={true}
        isLast={true}
        isVip={fact.isVip || false}
        showCollectionBadge={true}
      />
    )
  }

  // ── Phase: Question (Quickie style) ──
  const screenBg = `linear-gradient(160deg, ${OB_COLOR}22 0%, ${OB_COLOR} 100%)`

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        height: '100%', width: '100%', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        background: screenBg, fontFamily: 'Nunito, sans-serif',
      }}
    >
      {/* Header */}
      <GameHeader
        categoryLabel="Découverte"
        categoryColor={OB_COLOR}
        onQuit={() => onSkip?.()}
      />

      {/* Mode label */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(6), flexShrink: 0 }}>
        <span style={{
          fontSize: S(11), fontWeight: 900, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: OB_COLOR,
          textShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}>
          WHAT THE F*CT !
        </span>
      </div>

      {/* Progress 1/1 */}
      <div style={{ flexShrink: 0, padding: `${S(4)} ${S(16)} ${S(4)}` }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: S(3) }}>
          <div style={{
            flex: 1, height: S(12), borderRadius: S(4),
            background: OB_COLOR, transition: 'all 0.3s ease',
          }} />
        </div>
      </div>

      {/* Content block: question + hints + QCM */}
      <div style={{
        height: S(270), flexShrink: 0, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
        padding: `${S(4)} ${S(16)} 0`,
      }}>
        {/* Question card */}
        <div style={{
          padding: `${S(12)} ${S(16)}`,
          borderRadius: S(16),
          background: 'rgba(0,0,0,0.28)',
          border: `3px solid ${OB_COLOR}`,
          backdropFilter: 'blur(12px)',
          boxShadow: `0 0 20px ${OB_COLOR}50`,
          height: S(72), flexShrink: 0, overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <p style={{ color: '#ffffff', fontSize: S(15), fontWeight: 800, textAlign: 'center', lineHeight: 1.4, margin: 0 }}>
            {renderFormattedText(fact.question, OB_COLOR)}
          </p>
        </div>

        {/* Hints (HintFlipButton style Quickie) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flexShrink: 0 }}>
          {[1, 2].map(num => (
            <HintFlipButton
              key={num}
              num={num}
              hint={hintTexts[num - 1]}
              catColor={OB_COLOR}
              isFree={true}
              cost={0}
              canAfford={true}
              canUse={true}
              needsBuy={false}
              initialRevealed={hintsRevealed[num - 1]}
              onReveal={() => handleHintReveal(num)}
              onBuyHint={null}
              revealedTextColor={OB_COLOR}
            />
          ))}
        </div>

        {/* QCM 2 options (Quickie style: white bg, orange border, orange text) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: S(5), flexShrink: 0, position: 'relative', zIndex: 5 }}>
          {options.map((opt, i) => {
            const answered = selectedIndex !== null
            const isSelected = selectedIndex === i
            const isDisabledWrong = allHintsRevealed && !opt.isCorrect
            let bg = '#FFFFFF'
            let textColor = OB_COLOR
            let borderColor = OB_COLOR
            let opacity = 1

            if (answered) {
              if (opt.isCorrect) { bg = '#22C55E'; textColor = 'white'; borderColor = '#22C55E' }
              else if (isSelected) { bg = '#EF4444'; textColor = 'white'; borderColor = '#EF4444' }
              else { bg = 'rgba(255,255,255,0.3)'; textColor = 'rgba(255,255,255,0.4)'; borderColor = 'transparent' }
            }

            return (
              <button
                key={i}
                disabled={answered || isDisabledWrong || !allHintsRevealed}
                onClick={() => handleAnswer(i)}
                style={{
                  background: bg,
                  border: `3px solid ${borderColor}`,
                  borderRadius: S(12),
                  color: textColor,
                  fontWeight: 800,
                  fontSize: S(13),
                  lineHeight: 1.2,
                  padding: `${S(4)} ${S(6)}`,
                  height: S(50),
                  width: '100%',
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  cursor: (answered || isDisabledWrong || !allHintsRevealed) ? 'default' : 'pointer',
                  transition: 'transform 0.1s, background 0.15s, opacity 0.3s',
                  opacity,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span style={{
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {opt.text}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Image floutée + cadenas (style Quickie) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          position: 'relative',
          width: '55%',
          aspectRatio: '1 / 1',
          borderRadius: S(12),
          overflow: 'hidden',
          background: 'rgba(0,0,0,0.3)',
          border: `3px solid ${OB_COLOR}`,
          flexShrink: 0,
        }}>
          {fact.imageUrl && !imgFailed ? (
            <img
              src={fact.imageUrl}
              alt=""
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                filter: 'blur(18px) brightness(0.6)',
                transform: 'scale(1.15)',
              }}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', filter: 'blur(14px) brightness(0.6)' }}>
              <FallbackImage categoryColor={OB_COLOR} />
            </div>
          )}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: S(4), padding: `0 ${S(10)}` }}>
              <span style={{ fontSize: S(28), filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}>🔒</span>
              <span style={{
                fontSize: S(9), fontWeight: 700, color: 'rgba(255,255,255,0.85)',
                textAlign: 'center', textShadow: '0 1px 3px rgba(0,0,0,0.6)', lineHeight: 1.3,
              }}>
                Trouve la bonne réponse et ajoute-le à ta collection
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hint spotlight — finger pointing up at hint buttons */}
      {showHintSpotlight && (
        <div
          onClick={() => setShowHintSpotlight(false)}
          style={{
            position: 'absolute', left: 0, right: 0,
            top: S(225), zIndex: 100,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center',
            animation: 'spotlightBubble 0.3s ease',
          }}
        >
          <div style={{
            fontSize: S(28),
            animation: 'tutoFingerUp 0.8s ease-in-out infinite',
          }}>👆</div>
          <span style={{
            color: 'white', fontSize: S(14), fontWeight: 800,
            textShadow: '0 1px 4px rgba(0,0,0,0.5)',
            marginTop: S(2),
          }}>
            {TEXTS.hookFact.hintSpotlight}
          </span>
        </div>
      )}

      <style>{`
        @keyframes spotlightBubble {
          0% { transform: translateY(10px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes tutoFingerUp {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  )
}
