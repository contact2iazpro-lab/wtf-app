import { useState, useEffect, useRef, useCallback } from 'react'
import CircularTimer from '../components/CircularTimer'
import GameHeader from '../components/GameHeader'
import CoinsIcon from '../components/CoinsIcon'
import HintFlipButton from '../components/HintFlipButton'
import { getCategoryById } from '../data/facts'
import { audio } from '../utils/audio'
import renderFormattedText from '../utils/renderFormattedText'

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
  playerTickets = 0,
  sessionType = 'parcours',
  isTutorial = false,
}) {
  const isDevMode = localStorage.getItem('wtf_dev_mode') === 'true'

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
  const displayTotalFacts = totalFacts

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

  // ── Header: ✕ | catégorie | coins | tickets | hints | ⚙️ ─────────────────
  const header = (
    <GameHeader
      playerCoins={playerCoins}
      playerHints={playerHints}
      playerTickets={playerTickets}
      showTickets={sessionType === 'parcours'}
      categoryLabel={cat?.label || 'Question'}
      categoryColor={cat?.color}
      onQuit={() => setShowQuitConfirm(true)}
      coinFlash={coinFlash}
    />
  )

  // ── Barre de progression ─────────────────────────────────────────────────────
  const progressBar = (
    <div style={{ padding: `0 ${S(16)}`, flexShrink: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: S(3) }}>
        {Array.from({ length: displayTotalFacts }).map((_, i) => {
          const isActive = i === factIndex
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: isActive ? S(16) : S(8),
                borderRadius: S(4),
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
                  fontSize: S(10),
                  fontWeight: 800,
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
      className="rounded-2xl p-3 border shrink-0"
      style={{
        background: cardBg,
        borderColor: cat?.color + '70',
        backdropFilter: 'blur(12px)',
        boxShadow: `0 4px 32px ${cat?.color || '#000'}30`,
      }}
    >
      <h2 className="text-white font-bold leading-snug" style={{ fontSize: 'calc(1.1rem * var(--scale))' }}>{renderFormattedText(fact.question)}</h2>
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
        // Dev mode: show hints pre-revealed
        if (isDevMode) {
          return (
            <div key={hintNum} style={{
              height: 32, width: '100%', borderRadius: 16, background: 'rgba(255,255,255,0.92)',
              border: `2px solid ${cat?.color || '#FF6B1A'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px 8px',
            }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#1a1a2e', textAlign: 'center', lineHeight: 1 }}>
                {hintText || '—'}
              </span>
            </div>
          )
        }
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
    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `${S(8)} 0 ${S(12)}` }}>
      <div className="qs-timer-wrap" style={{ width: S(64), height: S(64), display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <CircularTimer
          key={`${fact.id}-${answerMode}`}
          size={64}
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
        setTutFlipDone(true) // Afficher les boutons immédiatement
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

          {/* Logos WTF + Vrai ou Fou + intro (pre-answer only) */}
          {!tutAnswered && (
            <div style={{
              flexShrink: 0, textAlign: 'center',
              padding: `${S(16)} ${S(16)} ${S(4)}`,
              animation: 'tutFadeSlideUp 0.6s ease both',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              <img src="/assets/ui/wtf-logo.png?v=4" alt="WTF!" style={{
                width: '40%', maxWidth: 100, height: 'auto', objectFit: 'contain',
                filter: 'drop-shadow(0 3px 12px rgba(255,120,0,0.5))',
              }} />
              <img src="/assets/ui/100logo.png?v=5" alt="Vrai ou Fou?" style={{
                width: '55%', maxWidth: 140, height: 'auto', objectFit: 'contain', marginTop: S(4),
              }} />
              <p style={{
                color: 'rgba(255,255,255,0.7)', fontWeight: 700,
                fontSize: S(13), marginTop: S(8), marginBottom: 0,
              }}>
                Prêt pour ton premier f*ct incroyable ?
              </p>
            </div>
          )}

          {/* Post-answer: layout identique à RevelationScreen VIP */}
          {tutAnswered && (
            <>
              {/* Header factice avec GameHeader */}
              <GameHeader
                playerCoins={playerCoins}
                playerHints={playerHints}
                playerTickets={playerTickets}
                categoryLabel={cat?.label || 'Tuto'}
                categoryColor={cat?.color}
                onQuit={() => { audio.stopAll(); onQuit() }}
              />

              {/* Image VIP glow + stamp FOU */}
              <div style={{ flexShrink: 0, padding: `0 ${S(16)}`, maxHeight: '35vh' }}>
                <div
                  className={`overflow-hidden relative${tutCorrect ? ' wow-shine wow-glow gold-card-rounded' : ''}`}
                  style={{
                    background: tutCatGradient, width: '100%', maxHeight: '35vh',
                    borderRadius: S(16), padding: 4,
                    border: tutCorrect ? undefined : `3px solid ${cat?.color || '#1a3a5c'}`,
                  }}
                >
                  {!tutImgFailed ? (
                    <img
                      src={tutorialImageUrl}
                      alt={fact.question}
                      onError={() => setTutImgFailed(true)}
                      style={{
                        objectFit: 'contain', width: '100%', maxHeight: 'calc(35vh - 14px)',
                        display: 'block', borderRadius: S(12),
                        filter: !tutCorrect ? 'blur(12px) brightness(0.5)' : 'none',
                      }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: 'calc(30vh - 14px)', background: tutCatGradient, filter: !tutCorrect ? 'blur(8px) brightness(0.5)' : 'none', borderRadius: S(12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 72, fontWeight: 900, color: 'white', opacity: 0.3 }}>?</span>
                    </div>
                  )}
                  {/* Wrong: overlay + stamp bienveillant */}
                  {!tutCorrect && (
                    <>
                      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.35)', zIndex: 1 }} />
                      <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 5 }}>
                        <div style={{ position: 'absolute', left: '50%', top: '50%', animation: 'tutStampImpact 0.5s ease-out forwards', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', border: '2px solid rgba(255,255,255,0.3)', borderRadius: S(14), padding: `${S(10)} ${S(16)}`, maxWidth: '85%', textAlign: 'center' }}>
                          <span style={{ fontSize: S(13), fontWeight: 900, color: 'white', lineHeight: 1.4 }}>{tutWrongMsg}</span>
                        </div>
                      </div>
                    </>
                  )}
                  {/* Correct: shimmer + stamp FOU */}
                  {tutCorrect && (
                    <>
                      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 7, overflow: 'hidden', borderRadius: S(12) }}>
                        <div style={{ position: 'absolute', inset: '-50%', background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 45%, rgba(255,215,0,0.15) 50%, rgba(255,255,255,0.08) 55%, transparent 60%)', animation: 'goldShimmer 3s ease-in-out infinite' }} />
                      </div>
                      <div className="absolute pointer-events-none" style={{ right: S(8), bottom: S(8), zIndex: 10 }}>
                        <div style={{ fontSize: S(18), fontWeight: 900, color: '#4CAF50', textShadow: '0 2px 6px rgba(76,175,80,0.5)', transform: 'rotate(-12deg)', border: '2px solid #4CAF50', borderRadius: S(4), padding: `${S(2)} ${S(8)}`, backgroundColor: 'rgba(76,175,80,0.15)', backdropFilter: 'blur(4px)', animation: 'tutStampCorner 0.5s ease-out forwards' }}>FOU</div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Message succès + social proof */}
              <div style={{ textAlign: 'center', padding: `${S(8)} ${S(16)} 0`, flexShrink: 0 }}>
                {tutCorrect && (
                  <span style={{ fontSize: S(12), fontWeight: 700, color: 'white', lineHeight: 1.4, display: 'block', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{tutCorrectMsg}</span>
                )}
                <span style={{ fontSize: S(14), fontWeight: 800, color: 'rgba(255,255,255,0.8)', display: 'block', marginTop: S(4), textShadow: '0 1px 3px rgba(0,0,0,0.5)', lineHeight: 1.3 }}>
                  👥 {tutCorrect ? `Seulement ${successRate}` : `${100 - successRate}`}% des joueurs{'\n'}ont trouvé ce f*ct
                </span>
              </div>
            </>
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
                  {renderFormattedText(fact.question)}
                </h2>
              </div>
            </div>
          )}

          {/* Réponses ou post-answer content */}
          {!tutAnswered ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              justifyContent: 'center', gap: S(8),
              padding: `0 ${S(16)}`,
              animation: 'tutFadeSlideUp 0.6s 0.3s ease both',
            }}>
              {/* Logo Vrai ou Fou dans l'espace vide */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <img src="/assets/ui/vof-logo.png?v=5" alt="Vrai ou Fou?" style={{ width: '60%', height: 'auto', objectFit: 'contain', opacity: 0.9 }} />
              </div>
              {/* Indices tutoriel — gratuits, label "Indice (gratuit)" */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[{ hint: 'Luxe' }, { hint: 'Brillant' }].map((h, i) => (
                  <HintFlipButton key={i} num={i + 1} hint={h.hint} catColor={cat?.color || '#FF6B1A'} hasStock={true} stockCount={'gratuit'} onReveal={() => audio.play('click')} />
                ))}
              </div>
              {optionsToRender.map((opt) => {
                const cleanText = opt.text.replace(/[\u{1F600}-\u{1FFFF}]/gu, '').trim()
                return (
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
                    {cleanText}
                  </button>
                )
              })}
            </div>
          ) : (
            /* Post-answer zone */
            <div style={{
              flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
              justifyContent: 'center', overflow: 'hidden',
              padding: `${S(6)} ${S(16)} 0`,
              animation: 'tutFadeSlideUp 0.4s ease forwards',
            }}>

              {/* Wrong answer: ta réponse (pas de bonne réponse affichée) */}
              {!tutCorrect && (
                <div style={{
                  background: 'rgba(244,67,54,0.15)', border: '2px solid #F44336',
                  borderRadius: S(14), padding: `${S(14)} ${S(16)}`,
                  textAlign: 'center', marginBottom: S(8),
                }}>
                  <div style={{ fontSize: S(10), fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: S(4), color: '#F44336' }}>
                    ✗ Ta réponse
                  </div>
                  <div style={{ fontSize: S(15), fontWeight: 900, color: 'white' }}>
                    {tutWrongText}
                  </div>
                </div>
              )}

              {/* Encadré explication (correct) — identique RevelationScreen VIP */}
              {tutCorrect && (
                <div style={{
                  background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: S(14), padding: `${S(8)} ${S(10)}`,
                  flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                }}>
                  <div style={{
                    background: 'rgba(76,175,80,0.12)', border: '1px solid rgba(76,175,80,0.3)',
                    borderRadius: S(10), padding: `${S(6)} ${S(10)}`, marginBottom: S(6), flexShrink: 0,
                  }}>
                    <div style={{ fontSize: S(9), fontWeight: 900, color: '#4CAF50', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: S(2) }}>✓ Bonne réponse :</div>
                    <div style={{ fontSize: S(12), fontWeight: 700, color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{fact.options[fact.correctIndex]}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: S(4), marginBottom: S(3), flexShrink: 0 }}>
                    <span style={{ fontSize: S(12) }}>🧠</span>
                    <span style={{ color: 'white', fontWeight: 900, fontSize: S(9), textTransform: 'uppercase', letterSpacing: '0.05em' }}>Le saviez-vous ?</span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: S(12), lineHeight: 1.4, fontWeight: 500, margin: 0, overflow: 'hidden' }}>{fact.explanation}</p>
                </div>
              )}

              {/* Wrong: question encadrée (pas de Le saviez-vous) */}
              {!tutCorrect && tutFlipDone && (
                <div style={{
                  background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: S(16), padding: `${S(10)} ${S(12)}`,
                  animation: 'tutFadeSlideUp 0.5s ease forwards',
                }}>
                  <div style={{ fontSize: S(9), fontWeight: 900, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: S(4) }}>La question :</div>
                  <div style={{ fontSize: S(12), fontWeight: 700, color: 'white', lineHeight: 1.3 }}>{renderFormattedText(fact.question)}</div>
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
        justifyContent: 'flex-start', gap: S(8),
        padding: `0 ${S(16)}`,
        overflow: 'hidden',
      }}>
        {questionCard}

        {/* Indices */}
        {difficulty?.hintsAllowed && hintButtons}

        {/* Boutons QCM — taille fixe uniforme */}
        {(() => {
          const is6 = fact.options.length > 4
          const btnH = is6 ? 50 : 64
          const btnFont = is6 ? 11 : 13
          return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: S(5), flexShrink: 0, position: 'relative', zIndex: 5 }}>
              {fact.options.map((option, index) => {
                let devType = null
                let devBorder = '1.5px solid rgba(255,255,255,0.4)'
                if (isDevMode) {
                  try {
                    const funnyWrongs = [fact?.funnyWrong1, fact?.funnyWrong2].filter(Boolean)
                    const closeWrongs = [fact?.closeWrong1, fact?.closeWrong2].filter(Boolean)
                    const plausibleWrongs = [fact?.plausibleWrong1, fact?.plausibleWrong2, fact?.plausibleWrong3].filter(Boolean)
                    if (index === fact.correctIndex) { devType = 'VRAIE'; devBorder = '3px solid #22C55E' }
                    else if (funnyWrongs.includes(option)) { devType = 'DRÔLE'; devBorder = '3px solid #EAB308' }
                    else if (closeWrongs.includes(option)) { devType = 'PROCHE'; devBorder = '3px solid #F97316' }
                    else if (plausibleWrongs.includes(option)) { devType = 'PLAUSIBLE'; devBorder = '3px solid #EF4444' }
                    else { devType = 'AUTRE'; devBorder = '2px solid rgba(255,255,255,0.3)' }
                  } catch (e) { console.warn('[DEV MODE] Erreur rendu dev:', e) }
                }
                return (
                  <button
                    key={index}
                    onClick={() => {
                      const correct = index === fact.correctIndex
                      audio.play(correct ? 'correct' : 'wrong')
                      audio.vibrate(correct ? [40, 20, 40] : [120])
                      onSelectAnswer(index)
                    }}
                    className="btn-press active:scale-95"
                    style={{
                      background: 'rgba(255,255,255,0.15)',
                      border: devBorder,
                      borderRadius: S(12),
                      color: 'white',
                      fontWeight: 700,
                      fontSize: S(btnFont),
                      lineHeight: 1.2,
                      padding: `${S(4)} ${S(6)}`,
                      height: S(btnH),
                      width: '100%',
                      overflow: 'hidden',
                      wordBreak: 'break-word',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      cursor: 'pointer',
                      WebkitTapHighlightColor: 'transparent',
                      transition: 'transform 0.1s, background 0.15s',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: is6 ? 2 : 3, WebkitBoxOrient: 'vertical' }}>
                      {renderFormattedText(option)}
                    </span>
                    {isDevMode && devType && (
                      <span style={{ fontSize: 8, fontWeight: 900, opacity: 0.6, marginTop: 1, letterSpacing: '0.05em', flexShrink: 0 }}>{devType}</span>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })()}
      </div>

      {timerZone}
    </div>
  )
}
