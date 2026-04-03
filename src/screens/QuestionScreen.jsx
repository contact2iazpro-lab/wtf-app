import { useState, useEffect, useRef, useCallback } from 'react'
import CircularTimer from '../components/CircularTimer'
import SettingsModal from '../components/SettingsModal'
import CoinsIcon from '../components/CoinsIcon'
import { getCategoryById } from '../data/facts'
import { audio } from '../utils/audio'

// ── Hint flip card button ────────────────────────────────────────────────────
// isFree    : indice gratuit (pas de coût)
// cost      : coût en coins si payant
// canAfford : le joueur a assez de coins pour cet indice payant
function HintFlipButton({ num, hint, catColor, isFree, cost, canAfford, onReveal }) {
  const [phase, setPhase] = useState('front') // 'front' | 'flip' | 'back'

  const disabled = !isFree && !canAfford

  const handleClick = () => {
    if (phase !== 'front' || disabled) return
    setPhase('flip')
    onReveal()
    setTimeout(() => setPhase('back'), 160)
  }

  const color = catColor || '#FF6B1A'

  // Texte adaptatif selon luminosité de la couleur catégorie
  const isLight = color.length >= 7
    ? (parseInt(color.slice(1,3),16)*299 + parseInt(color.slice(3,5),16)*587 + parseInt(color.slice(5,7),16)*114) / 1000 > 128
    : false
  const labelColor = '#ffffff'

  return (
    <button
      onClick={handleClick}
      style={{
        height: 48,
        width: '100%',
        borderRadius: 24,
        border: (disabled && phase !== 'back') ? '2px solid #6B7280' : `2px solid ${color}`,
        background: (disabled && phase !== 'back')
          ? 'rgba(107,114,128,0.15)'
          : phase === 'back' ? 'rgba(255,255,255,0.88)' : `${color}28`,
        transform: phase === 'flip' ? 'scaleY(0.08)' : 'scaleY(1)',
        transition: 'transform 0.15s ease, background 0.3s, border-color 0.3s',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 12px',
        cursor: (disabled && phase !== 'back') ? 'not-allowed' : 'pointer',
        pointerEvents: phase !== 'front' ? 'none' : 'auto',
        flexShrink: 0,
        opacity: (disabled && phase !== 'back') ? 0.55 : 1,
        gap: 1,
      }}
    >
      {phase !== 'back' ? (
        disabled ? (
          // Payant + solde insuffisant
          <>
            <span style={{ fontWeight: 900, fontSize: 12, color: '#9CA3AF', textDecoration: 'line-through', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
              Indice — {cost}
              <img src="/assets/ui/icon-coins.png" alt="" style={{ width: 'calc(14px * var(--scale))', height: 'calc(14px * var(--scale))', marginLeft: 'calc(4px * var(--scale))', verticalAlign: 'middle' }} />
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
              Pas assez de coins
            </span>
          </>
        ) : isFree ? (
          // Gratuit
          <span style={{ fontWeight: 900, fontSize: 13, color: labelColor, whiteSpace: 'nowrap' }}>
            N°{num} — Indice offert
          </span>
        ) : (
          // Payant + solde suffisant
          <span style={{ fontWeight: 900, fontSize: 13, color: labelColor, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
            Indice — {cost}
            <img src="/assets/ui/icon-coins.png" alt="" style={{ width: 'calc(14px * var(--scale))', height: 'calc(14px * var(--scale))', marginLeft: 'calc(4px * var(--scale))', verticalAlign: 'middle' }} />
          </span>
        )
      ) : (
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: color,
            textAlign: 'center',
            lineHeight: 1.35,
            wordBreak: 'break-word',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {hint || '—'}
        </span>
      )}
    </button>
  )
}

// ── Main QuestionScreen ──────────────────────────────────────────────────────
export default function QuestionScreen({
  fact,
  factIndex,
  totalFacts,
  hintsUsed,
  onSelectAnswer,
  onOpenValidate,
  onUseHint,
  onTimeout,
  onQuit,
  category,
  gameMode,
  difficulty,
  playerName,
  playerColor,
  playerEmoji,
  playerCoins = 0,
  isTutorial = false,
}) {
  // Solo et marathon → QCM direct, duel → sélection du mode
  const [answerMode, setAnswerMode] = useState(
    (gameMode === 'solo' || gameMode === 'marathon') ? 'qcm' : null
  )

  // ── Tutorial mode: 2 réponses hardcodées (bonne réponse + fausse absurde) ──
  const [stableTutorialOptions] = useState(() => {
    if (!isTutorial) return null
    const correctText = fact.options[fact.correctIndex]
    return [
      { originalIndex: fact.correctIndex, text: correctText },
      { originalIndex: -1, text: 'Il neige des pizzas 🍕' },
    ]
  })

  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const [showSettings, setShowSettings]       = useState(false)
  const [coinFlash, setCoinFlash] = useState(null)
  const prevCoinsRef = useRef(playerCoins)

  useEffect(() => {
    const diff = playerCoins - prevCoinsRef.current
    if (diff > 0) {
      setCoinFlash(`+${diff}`)
      const t = setTimeout(() => setCoinFlash(null), 1200)
      prevCoinsRef.current = playerCoins
      return () => clearTimeout(t)
    }
    prevCoinsRef.current = playerCoins
  }, [playerCoins])

  const cat = getCategoryById(fact.category)

  // ── Lisibilité sur fond coloré ─────────────────────────────────────────────
  const isLightColor = (hex) => {
    if (!hex || hex.length < 7) return false
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return (r * 299 + g * 587 + b * 114) / 1000 > 128
  }
  const catTextColor = cat?.color ? (isLightColor(cat.color) ? '#1a1a1a' : '#ffffff') : '#ffffff'
  const S = (px) => `calc(${px}px * var(--scale))`

  // Timer duration — Flash mode = 20s per question
  const isFlash = difficulty?.id === 'flash'
  const timerDuration = answerMode === 'open' ? 60 : isFlash ? 20 : (difficulty?.duration || 20)

  // Progress display — Flash shows X/10
  const displayTotalFacts = isFlash ? 10 : totalFacts

  // Pause ref — synced to quit modal state (no re-render of CircularTimer)
  const pausedRef = useRef(false)
  useEffect(() => { pausedRef.current = showQuitConfirm }, [showQuitConfirm])

  // Wrapped timeout — no-op while quit modal is open
  const handleTimeout = useCallback(() => {
    if (!pausedRef.current) onTimeout?.()
  }, [onTimeout])


  // ── Style injection: compact screen media query only ───────────────────────
  useEffect(() => {
    const styleId = '__qs-compact'
    if (document.getElementById(styleId)) return
    const s = document.createElement('style')
    s.id = styleId
    s.textContent = `@media (max-height: 700px) {
      .qs-root .qs-h  { padding-top: 0.5rem !important; padding-bottom: 0.25rem !important; }
      .qs-root .qs-pb { padding-bottom: 0.25rem !important; }
      .qs-root .qs-m  { padding-left: 0.75rem !important; padding-right: 0.75rem !important; gap: 0.5rem !important; }
      .qs-root .qs-m .rounded-3xl { padding: 0.75rem !important; }
    }
    .qs-timer-wrap svg text { font-size: 42px !important; font-weight: 900 !important; }`
    document.head.appendChild(s)
    return () => { const el = document.getElementById(styleId); if (el) el.remove() }
  }, [])

  const screenBg = cat
    ? `linear-gradient(160deg, ${cat.color}22 0%, ${cat.color} 100%)`
    : 'linear-gradient(160deg, #1a3a5c22 0%, #1a3a5c 100%)'

  const cardBg = 'rgba(0, 0, 0, 0.28)'

  // ── Quit confirmation modal ────────────────────────────────────────────────
  const quitModal = showQuitConfirm && (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-full rounded-3xl p-6 mx-4"
        style={{ background: '#FAFAF8', border: '1px solid #E5E7EB', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}
      >
        <div className="text-2xl text-center mb-3">🏃</div>
        <h2 className="font-black text-lg text-center mb-2" style={{ color: '#1a1a2e' }}>
          Quitter le parcours ?
        </h2>
        <p className="text-sm text-center mb-6 leading-relaxed" style={{ color: '#6B7280' }}>
          Tu as exploré{' '}
          <strong style={{ color: '#1a1a2e' }}>{factIndex}</strong>{' '}
          f*ct{factIndex !== 1 ? 's' : ''} jusqu'ici.<br />
          Si tu quittes, ils ne seront pas sauvegardés.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setShowQuitConfirm(false)}
            className="w-full py-4 rounded-2xl font-black text-base"
            style={{ background: cat?.color || '#FF6B1A', color: 'white' }}
          >
            Continuer le parcours
          </button>
          <button
            onClick={() => { audio.stopAll(); onQuit() }}
            className="w-full py-3 rounded-2xl font-bold text-sm"
            style={{ background: 'transparent', color: '#9CA3AF' }}
          >
            Quitter quand même
          </button>
        </div>
      </div>
    </div>
  )

  // ── Header: ✕ | catégorie | coins | ⚙️ ──────────────────────────────────
  const header = (
    <div className="qs-h" style={{
      display: 'flex', flexDirection: 'row',
      alignItems: 'center', justifyContent: 'space-between',
      width: '100%', flexShrink: 0,
      padding: `${S(8)} ${S(12)}`,
    }}>

      {/* 1 — Bouton ✕ quitter */}
      <button
        onClick={() => setShowQuitConfirm(true)}
        title="Quitter"
        style={{
          width: S(36), height: S(36), borderRadius: '50%',
          background: 'rgba(255,255,255,0.2)',
          border: '1.5px solid rgba(255,255,255,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: S(16), color: 'white', cursor: 'pointer', flexShrink: 0,
          WebkitTapHighlightColor: 'transparent',
        }}
      >✕</button>

      {/* 2 — Nom de la catégorie */}
      <div style={{ flex: 1, minWidth: 0, padding: `0 ${S(8)}` }}>
        <span style={{
          fontWeight: 900, fontSize: S(13),
          color: cat?.color || 'rgba(255,255,255,0.7)',
          lineHeight: 1.2, whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: 'block',
        }}>
          {cat?.label || 'Question'}
        </span>
      </div>

      {/* 3 — Icône coins + solde */}
      <div style={{
        display: 'flex', flexDirection: 'row', alignItems: 'center',
        flexShrink: 0, pointerEvents: 'none', userSelect: 'none',
      }}>
        <img
          src="/assets/ui/icon-coins.png"
          alt=""
          style={{ width: S(20), height: S(20), marginRight: S(4) }}
        />
        <span style={{ fontWeight: 700, color: 'white', fontSize: S(13), position: 'relative' }}>
          {playerCoins}
          {coinFlash && (
            <span style={{
              position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
              color: '#22C55E', fontWeight: 900, fontSize: S(11), whiteSpace: 'nowrap',
              animation: 'coinFlashUp 1.2s ease-out forwards', pointerEvents: 'none',
            }}>
              {coinFlash}
            </span>
          )}
        </span>
      </div>

      {/* 4 — Bouton ⚙️ paramètres */}
      <button
        onClick={() => { audio.play('click'); setShowSettings(true) }}
        style={{
          width: S(36), height: S(36), borderRadius: '50%',
          background: 'rgba(255,255,255,0.2)',
          border: '1.5px solid rgba(255,255,255,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, cursor: 'pointer', marginLeft: S(8),
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <img src="/assets/ui/icon-settings.png" alt="" style={{ width: S(20), height: S(20) }} />
      </button>
    </div>
  )

  // ── Barre de progression ─────────────────────────────────────────────────────
  const progressBar = (
    <div style={{ padding: `0 ${S(16)} ${S(4)}`, flexShrink: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: S(3) }}>
        {Array.from({ length: displayTotalFacts }).map((_, i) => {
          const isActive = i === factIndex
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: isActive ? S(12) : S(6),
                borderRadius: S(3),
                background: isActive ? 'white' : 'rgba(255,255,255,0.3)',
                position: isActive ? 'relative' : 'static',
                transition: 'all 0.3s ease',
              }}
            >
              {isActive && (
                <span style={{
                  position: 'absolute',
                  top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: S(8),
                  fontWeight: 700,
                  color: cat?.color || '#1a1a2e',
                  whiteSpace: 'nowrap',
                }}>
                  {factIndex + 1}/{displayTotalFacts}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── Question card ──────────────────────────────────────────────────────────
  const questionCard = (
    <div
      className="rounded-3xl p-4 border shrink-0"
      style={{
        background: cardBg,
        borderColor: cat?.color + '70',
        backdropFilter: 'blur(12px)',
        boxShadow: `0 4px 32px ${cat?.color || '#000'}30`,
      }}
    >
      <h2 className="text-white font-bold leading-snug" style={{ fontSize: 'calc(1.1rem * var(--scale))' }}>{fact.question}</h2>
    </div>
  )

  // ── Hints ──────────────────────────────────────────────────────────────────
  // Nombre total d'indices = gratuits + payants (selon le niveau)
  const freeHints  = difficulty?.freeHints  ?? 0
  const paidHints  = difficulty?.paidHints  ?? 0
  const hintCost   = difficulty?.hintCost   ?? 0
  const totalHints = freeHints + paidHints

  const hintButtons = totalHints > 0 && (
    <div
      className="shrink-0"
      style={{ display: 'grid', gridTemplateColumns: totalHints === 1 ? '1fr' : '1fr 1fr', gap: 8 }}
    >
      {Array.from({ length: totalHints }, (_, i) => {
        const hintNum = i + 1
        const isFree  = hintNum <= freeHints
        const hintText = hintNum === 1 ? fact.hint1 : fact.hint2
        return (
          <HintFlipButton
            key={hintNum}
            num={hintNum}
            hint={hintText}
            catColor={cat?.color || '#FF6B1A'}
            isFree={isFree}
            cost={hintCost}
            canAfford={playerCoins >= hintCost}
            onReveal={() => { onUseHint(hintNum); audio.play('click') }}
          />
        )
      })}
    </div>
  )


  // ── Zone timer — COR 4 : flex:1 flottant entre QCM et bas ──────────────────
  const timerZone = (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
      <div className="qs-timer-wrap" style={{ width: S(120), height: S(120), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <CircularTimer
          key={`${fact.id}-${answerMode}`}
          size={120}
          duration={timerDuration}
          onTimeout={handleTimeout}
        />
      </div>
    </div>
  )

  // ── Phase 0 : Sélection du mode (hors solo) ────────────────────────────────
  if (!answerMode) {
    return (
      <div
        className="qs-root relative screen-enter"
        style={{
          height: '100%', width: '100%', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
          background: screenBg,
        }}
      >
        {quitModal}
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        {header}
        {progressBar}


        <div className="qs-m" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: S(10), padding: `0 ${S(16)}` }}>
          {questionCard}

          <div className="flex flex-col gap-3 shrink-0">
            {playerName && (
              <div className="text-white/30 text-xs font-bold uppercase tracking-widest text-center">
                Choisissez votre mode
              </div>
            )}

            {playerName && (
              <button
                onClick={() => setAnswerMode('open')}
                className="btn-press w-full py-4 rounded-2xl active:scale-95 transition-all text-left px-5 border-2"
                style={{
                  background: `${cat?.color || '#22C55E'}12`,
                  borderColor: `${cat?.color || '#22C55E'}60`,
                  boxShadow: `0 4px 20px ${cat?.color || '#22C55E'}18`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-black text-base">🧠 Question ouverte</div>
                    <div className="text-white/40 text-xs font-semibold mt-0.5">N°1 · N°2 · 30 secondes</div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-2xl" style={{ color: cat?.color || '#22C55E' }}>5</div>
                    <div className="text-xs font-bold text-white/40">pts max</div>
                  </div>
                </div>
              </button>
            )}

          </div>
        </div>
      </div>
    )
  }

  // ── Phase 1 : Question ouverte ─────────────────────────────────────────────
  if (answerMode === 'open') {
    return (
      <div
        className="qs-root relative screen-enter"
        style={{
          height: '100%', width: '100%', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
          background: screenBg,
        }}
      >
        {quitModal}
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        {header}
        {difficulty && (
          <div style={{ textAlign: 'center', flexShrink: 0, padding: `0 0 ${S(2)}` }}>
            <span style={{ fontSize: S(10), fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
              {difficulty.emoji || ''} Mode {difficulty.label || difficulty.id}
            </span>
          </div>
        )}
        {progressBar}


        {/* Zone centrale : question + indices + validation */}
        <div className="qs-m" style={{
          flex: 1, minHeight: 0,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'flex-start', gap: S(10),
          padding: `0 ${S(16)}`,
        }}>
          {questionCard}
          {difficulty?.hintsAllowed && hintButtons}
          <div className="text-white/30 text-xs font-bold uppercase tracking-widest text-center shrink-0">
            Le questionneur valide la réponse
          </div>
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <button
              onClick={() => { audio.play('wrong'); audio.vibrate([120]); onOpenValidate(false) }}
              className="btn-press py-4 rounded-2xl border-2 font-black text-base active:scale-95 transition-all"
              style={{ background: 'rgba(244,67,54,0.1)', borderColor: '#F44336', color: '#F44336' }}
            >
              ✗ Incorrect
            </button>
            <button
              onClick={() => { audio.play('correct'); audio.vibrate([40, 20, 40]); onOpenValidate(true) }}
              className="btn-press py-4 rounded-2xl border-2 font-black text-base active:scale-95 transition-all"
              style={{ background: 'rgba(76,175,80,0.1)', borderColor: '#4CAF50', color: '#4CAF50' }}
            >
              ✓ Correct !
            </button>
          </div>
        </div>

        {timerZone}
      </div>
    )
  }

  // ── Phase 2 : QCM ──────────────────────────────────────────────────────────
  const optionsToRender = isTutorial && stableTutorialOptions ? stableTutorialOptions : fact.options.map((text, i) => ({ originalIndex: i, text }))

  // ── Tutorial-specific state ───────────────────────────────────────────────
  const [tutAnswered, setTutAnswered] = useState(false)
  const [tutCorrect, setTutCorrect] = useState(false)
  const [tutWrongText, setTutWrongText] = useState('')
  const [tutFlipDone, setTutFlipDone] = useState(false)
  const [tutImgFailed, setTutImgFailed] = useState(false)

  // Image du fact : imageUrl ou fallback local /assets/facts/{id}.png
  const tutorialImageUrl = fact.imageUrl || `/assets/facts/${fact.id}.png`

  // ── Tutorial mode: full self-contained screen ─────────────────────────────
  if (isTutorial) {
    const handleTutorialAnswer = (index, text) => {
      const correct = index === fact.correctIndex
      audio.play(correct ? 'correct' : 'wrong')
      audio.vibrate(correct ? [40, 20, 40] : [120])
      setTutCorrect(correct)
      if (!correct) setTutWrongText(text)
      setTutAnswered(true)
      if (correct) {
        // Son + stamp comme RevelationScreen
        setTimeout(() => audio.playFile('What the fact.mp3'), 350)
      }
      if (!correct) {
        setTimeout(() => setTutFlipDone(true), 900)
      }
    }

    const successRate = 15 + (fact.id % 40)

    return (
      <div
        className="qs-root relative"
        style={{
          height: '100%', width: '100%', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
          background: '#0A0F1E',
        }}
      >
        {/* CSS animations for tutorial */}
        <style>{`
          @keyframes coinFlashUp {
            0%   { opacity: 1; transform: translateX(-50%) translateY(0); }
            100% { opacity: 0; transform: translateX(-50%) translateY(-18px); }
          }
          @keyframes tutFadeSlideUp {
            from { opacity: 0; transform: translateY(30px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes tutGlow {
            0%, 100% { opacity: 0.3; transform: rotate(0deg); }
            50%      { opacity: 0.7; transform: rotate(180deg); }
          }
          @keyframes tutShimmer {
            0%   { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          @keyframes tutFlipHalf {
            from { transform: rotateX(0deg); }
            to   { transform: rotateX(90deg); }
          }
          @keyframes tutFlipBack {
            from { transform: rotateX(90deg); }
            to   { transform: rotateX(0deg); }
          }
          @keyframes tutStampImpact {
            0%   { transform: scale(2.5) rotate(-12deg); opacity: 0; }
            40%  { transform: scale(0.9) rotate(-12deg); opacity: 1; }
            60%  { transform: scale(1.05) rotate(-12deg); opacity: 1; }
            100% { transform: scale(1) rotate(-12deg); opacity: 1; }
          }
        `}</style>

        {/* Background image — <img> absolue, floutée puis défloutée */}
        <img
          src={tutorialImageUrl}
          alt=""
          onError={() => setTutImgFailed(true)}
          style={{
            position: 'absolute', inset: 0, zIndex: 0,
            width: '100%', height: '100%', objectFit: 'cover',
            filter: tutAnswered ? 'blur(0px) brightness(0.45)' : 'blur(20px) brightness(0.3)',
            transition: 'filter 0.5s ease',
            display: tutImgFailed ? 'none' : 'block',
          }}
        />
        {/* Fallback gradient si image KO */}
        {tutImgFailed && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 0,
            background: `linear-gradient(160deg, ${cat?.color || '#1a3a5c'}22 0%, ${cat?.color || '#1a3a5c'} 100%)`,
          }} />
        )}
        {/* Dark overlay */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: tutAnswered && tutCorrect ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.5)', transition: 'background 0.5s' }} />

        {/* Holographic glow effect — only on correct */}
        {tutAnswered && tutCorrect && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', inset: '-50%', zIndex: 2,
              background: 'conic-gradient(from 0deg, transparent, rgba(255,107,26,0.2), transparent, rgba(168,85,247,0.15), transparent, rgba(59,130,246,0.15), transparent)',
              animation: 'tutGlow 4s linear infinite',
            }} />
            <div style={{
              position: 'absolute', inset: 0, zIndex: 3,
              background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.06) 42%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.06) 58%, transparent 65%)',
              backgroundSize: '200% 100%',
              animation: 'tutShimmer 2s ease-in-out infinite',
            }} />
          </div>
        )}

        {/* Content */}
        <div style={{
          position: 'relative', zIndex: 5,
          display: 'flex', flexDirection: 'column',
          height: '100%', overflow: 'hidden',
          animation: 'tutFadeSlideUp 0.6s ease forwards',
        }}>

          {/* Logo WTF! texte + intro */}
          {!tutAnswered && (
            <div style={{
              flexShrink: 0, textAlign: 'center',
              padding: `${S(28)} ${S(16)} ${S(8)}`,
              animation: 'tutFadeSlideUp 0.6s ease both',
            }}>
              <div style={{
                fontSize: S(42), fontWeight: 900, color: '#FF6B1A',
                letterSpacing: '-0.02em', lineHeight: 1,
                textShadow: '0 2px 16px rgba(255,107,26,0.5), 0 0 40px rgba(255,107,26,0.2)',
              }}>
                WTF!
              </div>
              <div style={{
                fontSize: S(10), fontWeight: 700, color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: S(4),
              }}>
                What The F*ct
              </div>
              <p style={{
                color: 'rgba(255,255,255,0.7)', fontWeight: 700,
                fontSize: S(14), marginTop: S(10),
              }}>
                Prêt pour ton premier f*ct incroyable ?
              </p>
            </div>
          )}

          {/* Post-answer: image défloutée visible + stamp FOU (comme RevelationScreen) */}
          {tutAnswered && tutCorrect && (
            <div style={{
              flexShrink: 0, maxHeight: '30vh', overflow: 'hidden',
              position: 'relative',
              animation: 'tutFadeSlideUp 0.4s ease forwards',
            }}>
              {!tutImgFailed && (
                <img
                  src={tutorialImageUrl}
                  alt={fact.question}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', maxHeight: '30vh' }}
                />
              )}
              {/* Stamp FOU — comme RevelationScreen */}
              <div style={{
                position: 'absolute', right: S(8), bottom: S(8), zIndex: 10,
                animation: 'tutStampImpact 0.5s ease-out forwards',
              }}>
                <div style={{
                  fontSize: S(18), fontWeight: 900, color: '#4CAF50',
                  textShadow: '0 2px 6px rgba(76, 175, 80, 0.5)',
                  transform: 'rotate(-12deg)',
                  border: '2px solid #4CAF50', borderRadius: S(4), padding: `${S(2)} ${S(8)}`,
                  backgroundColor: 'rgba(76, 175, 80, 0.15)', backdropFilter: 'blur(4px)',
                }}>
                  FOU
                </div>
              </div>
            </div>
          )}

          {/* Question card */}
          <div style={{
            flexShrink: 0, padding: `${S(8)} ${S(16)}`,
            animation: 'tutFadeSlideUp 0.6s 0.15s ease both',
          }}>
            <div style={{
              background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)',
              border: `1px solid ${cat?.color || '#FF6B1A'}50`,
              borderRadius: S(16), padding: `${S(14)} ${S(16)}`,
              boxShadow: `0 4px 24px ${cat?.color || '#000'}30`,
            }}>
              <h2 style={{
                color: 'white', fontWeight: 800,
                fontSize: S(16), lineHeight: 1.35,
                textAlign: 'center', margin: 0,
              }}>
                {fact.question}
              </h2>
            </div>
          </div>

          {/* Réponses ou post-answer */}
          {!tutAnswered ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              justifyContent: 'center', gap: S(10),
              padding: `0 ${S(16)}`,
              animation: 'tutFadeSlideUp 0.6s 0.3s ease both',
            }}>
              {optionsToRender.map((opt) => (
                <button
                  key={opt.originalIndex}
                  onClick={() => handleTutorialAnswer(opt.originalIndex, opt.text)}
                  className="btn-press transition-all active:scale-95"
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    border: '1.5px solid rgba(255,255,255,0.35)',
                    borderRadius: S(14), color: 'white', fontWeight: 700,
                    fontSize: S(16), padding: `${S(16)} ${S(12)}`,
                    width: '100%', textAlign: 'center',
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          ) : (
            /* Post-answer zone */
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              justifyContent: 'flex-start', overflow: 'auto',
              padding: `${S(4)} ${S(16)}`,
              animation: 'tutFadeSlideUp 0.4s ease forwards',
            }}>

              {/* Correct: message + social proof (comme RevelationScreen) */}
              {tutCorrect && (
                <div style={{ textAlign: 'center', marginBottom: S(6) }}>
                  <span style={{ fontSize: S(13), fontWeight: 900, color: 'rgba(255,255,255,0.7)', display: 'block' }}>
                    👥 Seulement {successRate}% des joueurs ont trouvé ce f*ct
                  </span>
                </div>
              )}

              {/* Wrong answer: flip card */}
              {!tutCorrect && (
                <div style={{ perspective: '800px', marginBottom: S(8) }}>
                  <div style={{
                    animation: !tutFlipDone
                      ? 'tutFlipHalf 0.4s 0.1s ease forwards'
                      : 'tutFlipBack 0.4s ease forwards',
                    transformStyle: 'preserve-3d',
                    background: !tutFlipDone ? 'rgba(244,67,54,0.15)' : 'rgba(76,175,80,0.15)',
                    border: `2px solid ${!tutFlipDone ? '#F44336' : '#4CAF50'}`,
                    borderRadius: S(14), padding: `${S(14)} ${S(16)}`,
                    textAlign: 'center', transition: 'background 0.01s, border-color 0.01s',
                  }}>
                    <div style={{
                      fontSize: S(10), fontWeight: 900, textTransform: 'uppercase',
                      letterSpacing: '0.05em', marginBottom: S(4),
                      color: !tutFlipDone ? '#F44336' : '#4CAF50',
                    }}>
                      {!tutFlipDone ? '✗ Ta réponse' : '✓ Bonne réponse'}
                    </div>
                    <div style={{ fontSize: S(15), fontWeight: 900, color: 'white' }}>
                      {!tutFlipDone ? tutWrongText : fact.options[fact.correctIndex]}
                    </div>
                  </div>
                </div>
              )}

              {/* Correct answer: encadré vert + explication (comme RevelationScreen) */}
              {tutCorrect && (
                <div style={{
                  background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: S(16), padding: `${S(10)} ${S(12)}`,
                  animation: 'tutFadeSlideUp 0.4s ease forwards',
                }}>
                  <div style={{
                    background: 'rgba(76,175,80,0.12)', border: '1px solid rgba(76,175,80,0.3)',
                    borderRadius: S(10), padding: `${S(8)} ${S(10)}`, marginBottom: S(8),
                  }}>
                    <div style={{ fontSize: S(9), fontWeight: 900, color: '#4CAF50', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: S(2) }}>✓ Bonne réponse :</div>
                    <div style={{ fontSize: S(12), fontWeight: 700, color: 'white' }}>{fact.options[fact.correctIndex]}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: S(4), marginBottom: S(4) }}>
                    <span style={{ fontSize: S(14) }}>🧠</span>
                    <span style={{ color: 'white', fontWeight: 900, fontSize: S(10), textTransform: 'uppercase', letterSpacing: '0.05em' }}>Le saviez-vous ?</span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: S(11), lineHeight: 1.4, fontWeight: 500, margin: 0 }}>{fact.explanation}</p>
                </div>
              )}

              {/* Wrong: Le saviez-vous après flip */}
              {!tutCorrect && tutFlipDone && (
                <div style={{
                  background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: S(16), padding: `${S(12)} ${S(14)}`,
                  animation: 'tutFadeSlideUp 0.5s ease forwards',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: S(4), marginBottom: S(6) }}>
                    <span style={{ fontSize: S(16) }}>🧠</span>
                    <span style={{ color: 'white', fontWeight: 900, fontSize: S(11), textTransform: 'uppercase', letterSpacing: '0.05em' }}>Le saviez-vous ?</span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: S(12), lineHeight: 1.45, fontWeight: 500, margin: 0 }}>
                    {fact.explanation}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Continuer button */}
          {tutAnswered && (tutCorrect || tutFlipDone) && (
            <div style={{
              flexShrink: 0, padding: `${S(8)} ${S(16)} ${S(16)}`,
              animation: 'tutFadeSlideUp 0.4s 0.2s ease both',
            }}>
              <button
                onClick={() => { audio.stopAll(); audio.play('click'); onQuit() }}
                className="btn-press active:scale-95 transition-all"
                style={{
                  width: '100%', padding: `${S(16)} 0`,
                  borderRadius: S(14), border: 'none',
                  background: tutCorrect
                    ? `linear-gradient(135deg, ${cat?.color || '#FF6B1A'}, ${cat?.color || '#FF6B1A'}cc)`
                    : `linear-gradient(135deg, ${cat?.color || '#FF6B1A'}dd, ${cat?.color || '#FF6B1A'}99)`,
                  color: 'white', fontWeight: 900, fontSize: S(16),
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  boxShadow: `0 4px 20px ${cat?.color || '#FF6B1A'}40`,
                }}
              >
                Continuer →
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Phase 2 : QCM (mode normal) ──────────────────────────────────────────
  return (
    <div
      className="qs-root relative screen-enter"
      style={{
        height: '100%', width: '100%', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
        background: screenBg,
      }}
    >
      {quitModal}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {header}

      {/* Rappel du mode */}
      {difficulty && (
        <div style={{ textAlign: 'center', flexShrink: 0, padding: `0 0 ${S(2)}` }}>
          <span style={{
            fontSize: S(10), fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.4)',
          }}>
            {difficulty.emoji || ''} Mode {difficulty.label || difficulty.id}
          </span>
        </div>
      )}

      {progressBar}

      {/* Zone centrale : question + indices + QCM */}
      <div className="qs-m" style={{
        flex: 1, minHeight: 0,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'flex-start', gap: S(10),
        padding: `0 ${S(16)}`,
      }}>
        {questionCard}

        {/* Indices */}
        {difficulty?.hintsAllowed && hintButtons}

        {/* Boutons QCM */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: S(8) }}>
          {fact.options.map((option, index) => (
            <button
              key={index}
              onClick={() => {
                const correct = index === fact.correctIndex
                audio.play(correct ? 'correct' : 'wrong')
                audio.vibrate(correct ? [40, 20, 40] : [120])
                onSelectAnswer(index)
              }}
              className="btn-press transition-all active:scale-95"
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1.5px solid rgba(255,255,255,0.4)',
                borderRadius: S(12),
                color: 'white',
                fontWeight: 700,
                fontSize: fact.options.length > 4 ? S(12) : S(13),
                padding: `${S(8)} ${S(8)}`,
                minHeight: S(64),
                width: '100%',
                overflow: 'hidden',
                wordBreak: 'break-word',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {timerZone}
    </div>
  )
}
