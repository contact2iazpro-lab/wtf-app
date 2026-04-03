import { useState, useEffect, useRef, useCallback } from 'react'
import CircularTimer from '../components/CircularTimer'
import SettingsModal from '../components/SettingsModal'
import CoinsIcon from '../components/CoinsIcon'
import HintFlipButton from '../components/HintFlipButton'
import { getCategoryById } from '../data/facts'
import { audio } from '../utils/audio'

// ── Messages bienveillants (identiques à RevelationScreen) ──────────────────
const WRONG_MESSAGES = [
  "Pas grave, maintenant tu sais... que tu ne sais pas ! 😅",
  "Même les experts se trompent sur celui-là 🧠",
  "Tu l'auras la prochaine fois ! 💪",
  "Ce f*ct est tellement WTF! qu'on comprend que tu aies raté ! 😂",
  "Même Einstein aurait séché sur celui-là ! 🧠",
  "Retente ta chance... ce f*ct mérite d'être connu !",
  "Ce f*ct est dans ta tête pour toujours... même raté ! 🧩",
  "Un de perdu, dix de retrouvés — rejoue ! 🎯",
  "La prochaine fois tu épateras tes amis avec ce f*ct ! 🤩",
  "Raté mais instruit ! C'est le principe de WTF! 😎",
]

const CORRECT_MESSAGES = [
  "Parfait ! Ce f*ct est gravé dans ta mémoire 🔥",
  "Impressionnant ! Tu connaissais vraiment ça ? 🧠",
  "Exactement ! Tu es officiellement WTF! certifié 🏆",
  "Bravo ! Peu de gens savent ça 👏",
  "Bien joué ! Ce f*ct ne te quittera plus 💡",
  "Yes ! Tu as l'œil pour les f*cts incroyables 👁️",
  "Correct ! On t'a vu venir 😎",
  "Chapeau ! Ce f*ct est dans ta collection 🎩",
  "Magnifique ! Tu aurais fait un excellent joueur WTF! 🌟",
  "Incroyable mais vrai... comme toi ! ✨",
]

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
  playerHints = 0,
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
  // Nombre d'indices disponibles selon la difficulté (max boutons affichés)
  const freeHints  = difficulty?.freeHints  ?? 0
  const paidHints  = difficulty?.paidHints  ?? 0
  const totalHints = freeHints + paidHints
  // Stock restant = playerHints - indices déjà utilisés dans cette question
  const stockRemaining = Math.max(0, playerHints - hintsUsed)

  const hintButtons = totalHints > 0 && (
    <div
      className="shrink-0"
      style={{ display: 'grid', gridTemplateColumns: totalHints === 1 ? '1fr' : '1fr 1fr', gap: 8 }}
    >
      {Array.from({ length: totalHints }, (_, i) => {
        const hintNum = i + 1
        const hintText = hintNum === 1 ? fact.hint1 : fact.hint2
        return (
          <HintFlipButton
            key={hintNum}
            num={hintNum}
            hint={hintText}
            catColor={cat?.color || '#FF6B1A'}
            hasStock={stockRemaining > 0}
            stockCount={stockRemaining}
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
  const [tutWrongMsg] = useState(() => WRONG_MESSAGES[Math.floor(Math.random() * WRONG_MESSAGES.length)])
  const [tutCorrectMsg] = useState(() => CORRECT_MESSAGES[Math.floor(Math.random() * CORRECT_MESSAGES.length)])

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
        setTimeout(() => audio.playFile('What the fact.mp3'), 350)
      }
      if (!correct) {
        setTimeout(() => setTutFlipDone(true), 900)
      }
    }

    const successRate = 15 + (fact.id % 40)
    const tutCatGradient = cat
      ? `linear-gradient(160deg, ${cat.color}22 0%, ${cat.color} 100%)`
      : 'linear-gradient(160deg, #1a3a5c22 0%, #1a3a5c 100%)'

    const handleTutorialShare = () => {
      const shareMessages = [
        `🤯 Mate ce f*ct !\n\n"${fact.question}"\n\n👉 https://wtf-app-livid.vercel.app/`,
        `🤯 Tu savais ça ?!\n\n"${fact.question}"\n\n👉 https://wtf-app-livid.vercel.app/`,
        `🤯 WOOW incroyable !\n\n"${fact.question}"\n\n👉 https://wtf-app-livid.vercel.app/`,
      ]
      const shareMessage = shareMessages[Math.floor(Math.random() * shareMessages.length)]
      if (navigator.share) navigator.share({ text: shareMessage })
    }

    return (
      <div
        className="qs-root relative"
        style={{
          height: '100%', width: '100%', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
          backgroundImage: 'url(/assets/backgrounds/question-default.webp)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          backgroundColor: cat?.color || '#1a1a2e',
        }}
      >
        {/* Overlay couleur catégorie */}
        <div style={{ position: 'absolute', inset: 0, background: `${cat?.color || '#1a1a2e'}cc`, zIndex: 0 }} />

        {/* CSS animations for tutorial */}
        <style>{`
          @keyframes tutFadeSlideUp {
            from { opacity: 0; transform: translateY(30px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes tutGlow {
            0%, 100% { box-shadow: 0 0 15px ${cat?.color || '#FF6B1A'}40, 0 0 30px ${cat?.color || '#FF6B1A'}20; }
            50%      { box-shadow: 0 0 25px ${cat?.color || '#FF6B1A'}80, 0 0 50px ${cat?.color || '#FF6B1A'}40, 0 0 80px rgba(255,215,0,0.15); }
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
            0%   { transform: translate(-50%, -50%) scale(2.5) rotate(-12deg); opacity: 0; }
            40%  { transform: translate(-50%, -50%) scale(0.9) rotate(-12deg); opacity: 1; }
            60%  { transform: translate(-50%, -50%) scale(1.05) rotate(-12deg); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(1) rotate(-12deg); opacity: 1; }
          }
          @keyframes tutStampCorner {
            0%   { transform: scale(2.5) rotate(-12deg); opacity: 0; }
            40%  { transform: scale(0.9) rotate(-12deg); opacity: 1; }
            60%  { transform: scale(1.05) rotate(-12deg); opacity: 1; }
            100% { transform: scale(1) rotate(-12deg); opacity: 1; }
          }
        `}</style>

        {/* Content */}
        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex', flexDirection: 'column',
          height: '100%', overflow: 'hidden',
        }}>

          {/* Logo WTF! texte + intro (pre-answer only) */}
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

          {/* Post-answer: Image encadrée avec bordure catégorie (comme RevelationScreen) */}
          {tutAnswered && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, padding: `${S(8)} ${S(16)}`, maxHeight: '30vh',
              animation: 'tutFadeSlideUp 0.4s ease forwards',
            }}>
              <div
                className="overflow-hidden relative"
                style={{
                  background: tutCatGradient, width: '100%', maxHeight: '30vh',
                  borderRadius: S(16), border: `3px solid ${cat?.color || '#1a3a5c'}`, padding: 4,
                  animation: tutCorrect ? 'tutGlow 2s ease-in-out infinite' : 'none',
                }}
              >
                {!tutImgFailed ? (
                  <img
                    src={tutorialImageUrl}
                    alt={fact.question}
                    onError={() => setTutImgFailed(true)}
                    style={{
                      objectFit: 'cover', width: '100%', maxHeight: 'calc(30vh - 14px)',
                      display: 'block', borderRadius: S(12),
                      filter: !tutCorrect ? 'blur(12px) brightness(0.5)' : 'none',
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%', height: 'calc(30vh - 14px)',
                    background: tutCatGradient,
                    filter: !tutCorrect ? 'blur(8px) brightness(0.5)' : 'none',
                    borderRadius: S(12),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ fontSize: '72px', fontWeight: 900, color: 'white', lineHeight: 1 }}>?</div>
                  </div>
                )}

                {/* Wrong: overlay sombre + stamp bienveillant centré */}
                {!tutCorrect && (
                  <>
                    <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.35)', zIndex: 1 }} />
                    <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 5 }}>
                      <div style={{
                        position: 'absolute', left: '50%', top: '50%',
                        animation: 'tutStampImpact 0.5s ease-out forwards',
                        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderRadius: S(14), padding: `${S(10)} ${S(16)}`,
                        maxWidth: '85%', textAlign: 'center',
                      }}>
                        <span style={{ fontSize: S(13), fontWeight: 900, color: 'white', lineHeight: 1.4 }}>
                          {tutWrongMsg}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* Correct: stamp FOU petit en coin bas droit + shimmer */}
                {tutCorrect && (
                  <>
                    {/* Shimmer overlay on image */}
                    <div className="absolute inset-0" style={{
                      zIndex: 3, pointerEvents: 'none',
                      background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.06) 42%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.06) 58%, transparent 65%)',
                      backgroundSize: '200% 100%',
                      animation: 'tutShimmer 2s ease-in-out infinite',
                      borderRadius: S(12),
                    }} />
                    <div className="absolute pointer-events-none" style={{ right: S(8), bottom: S(8), zIndex: 10 }}>
                      <div style={{
                        fontSize: S(18), fontWeight: 900, color: '#4CAF50',
                        textShadow: '0 2px 6px rgba(76, 175, 80, 0.5)',
                        transform: 'rotate(-12deg)',
                        border: '2px solid #4CAF50', borderRadius: S(4), padding: `${S(2)} ${S(8)}`,
                        backgroundColor: 'rgba(76, 175, 80, 0.15)', backdropFilter: 'blur(4px)',
                        animation: 'tutStampCorner 0.5s ease-out forwards',
                      }}>
                        FOU
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Message de succès/encouragement + social proof (post-answer) */}
          {tutAnswered && (
            <div style={{ textAlign: 'center', padding: `${S(4)} ${S(16)} 0` }}>
              {tutCorrect && (
                <span style={{ fontSize: S(12), fontWeight: 700, color: 'white', lineHeight: 1.4, display: 'block' }}>
                  {tutCorrectMsg}
                </span>
              )}
              <span style={{ fontSize: tutCorrect ? S(13) : S(11), fontWeight: 900, color: 'rgba(255,255,255,0.7)', display: 'block', marginTop: tutCorrect ? S(2) : 0 }}>
                👥 {tutCorrect ? `Seulement ${successRate}` : `${100 - successRate}`}% des joueurs ont trouvé ce f*ct
              </span>
            </div>
          )}

          {/* Question card (pre-answer) */}
          {!tutAnswered && (
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
          )}

          {/* Réponses ou post-answer content */}
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
              flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
              justifyContent: 'center', overflow: 'hidden',
              padding: `${S(6)} ${S(16)} 0`,
              animation: 'tutFadeSlideUp 0.4s ease forwards',
            }}>

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

              {/* Encadré explication (correct) — comme RevelationScreen */}
              {tutCorrect && (
                <div style={{
                  background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: S(16), padding: `${S(10)} ${S(12)}`,
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
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: S(11), lineHeight: 1.4, fontWeight: 500, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{fact.explanation}</p>
                </div>
              )}

              {/* Wrong: question encadrée + Le saviez-vous après flip */}
              {!tutCorrect && tutFlipDone && (
                <div style={{
                  background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: S(16), padding: `${S(10)} ${S(12)}`,
                  animation: 'tutFadeSlideUp 0.5s ease forwards',
                }}>
                  <div style={{ fontSize: S(9), fontWeight: 900, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: S(4) }}>La question :</div>
                  <div style={{ fontSize: S(12), fontWeight: 700, color: 'white', lineHeight: 1.3, marginBottom: S(8) }}>{fact.question}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: S(4), marginBottom: S(4) }}>
                    <span style={{ fontSize: S(14) }}>🧠</span>
                    <span style={{ color: 'white', fontWeight: 900, fontSize: S(10), textTransform: 'uppercase', letterSpacing: '0.05em' }}>Le saviez-vous ?</span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: S(12), lineHeight: 1.45, fontWeight: 500, margin: 0 }}>
                    {fact.explanation}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Boutons — comme RevelationScreen (deux boutons côte à côte) */}
          {tutAnswered && (tutCorrect || tutFlipDone) && (
            <div style={{
              flexShrink: 0, padding: `${S(6)} ${S(16)} ${S(12)}`,
              animation: 'tutFadeSlideUp 0.4s 0.2s ease both',
            }}>
              <div style={{ display: 'flex', gap: S(8), height: S(44) }}>
                <button
                  onClick={handleTutorialShare}
                  className="btn-press active:scale-95 transition-all"
                  style={{
                    flex: 1, height: '100%', borderRadius: S(14), fontWeight: 900, fontSize: S(12),
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(4),
                    background: `linear-gradient(135deg, ${cat?.color || '#FF6B1A'} 0%, ${cat?.color || '#FF6B1A'}cc 100%)`,
                    color: 'white', border: 'none',
                  }}
                >
                  {tutCorrect ? '🎩 Partager ce WTF!' : '🤝 Demander de l\'aide'}
                </button>
                <button
                  onClick={() => { audio.stopAll(); audio.play('click'); onQuit() }}
                  className="btn-press active:scale-95 transition-all"
                  style={{
                    flex: 1, height: '100%', borderRadius: S(14), fontWeight: 900, fontSize: S(12),
                    color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', border: 'none',
                    background: `linear-gradient(135deg, ${cat?.color || '#FF6B1A'}dd 0%, ${cat?.color || '#FF6B1A'}99 100%)`,
                  }}
                >
                  CONTINUER →
                </button>
              </div>
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
