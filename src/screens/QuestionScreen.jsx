import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import CircularTimer from '../components/CircularTimer'
import GameHeader from '../components/GameHeader'
import CoinsIcon from '../components/CoinsIcon'
import HintFlipButton from '../components/HintFlipButton'
import { getCategoryById } from '../data/facts'
import { audio } from '../utils/audio'
import { updateCoins, updateTickets, updateHints, setAbsolute, getBalances } from '../services/currencyService'
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
  onTutoComplete = null,
}) {
  const isDevMode = localStorage.getItem('wtf_dev_mode') === 'true'
  const onboardingCompleted = JSON.parse(localStorage.getItem('wtf_data') || '{}').onboardingCompleted || false

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
      { originalIndex: -1, text: 'Aaron' },
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
    .qs-timer-wrap svg text { font-size: clamp(48px, 8vh, 64px) !important; font-weight: 900 !important; }`
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
      categoryIcon={fact.category ? `/assets/categories/${fact.category}.png` : null}
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
                height: isActive ? S(20) : S(10),
                borderRadius: S(5),
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
                  fontSize: S(12),
                  fontWeight: 900,
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

  // ── Tirage aléatoire de 2 indices parmi 4 (stable par question) ────────────
  const selectedHints = useMemo(() => {
    const pool = [fact.hint1, fact.hint2, fact.hint3, fact.hint4]
      .filter(h => h && h.trim() !== '')
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 2)
  }, [fact.id])

  // ── Hints ──────────────────────────────────────────────────────────────────
  // Nombre d'indices disponibles selon la difficulté (max boutons affichés)
  const freeHints  = difficulty?.freeHints  ?? 0
  const paidHints  = difficulty?.paidHints  ?? 0
  const totalHints = Math.min(freeHints + paidHints, selectedHints.length)
  // Stock restant = playerHints - indices déjà utilisés dans cette question
  const stockRemaining = Math.max(0, playerHints - hintsUsed)

  // Dev mode: 4 indices pré-révélés
  const devHintButtons = isDevMode && (
    <div className="shrink-0" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
      {[fact.hint1, fact.hint2, fact.hint3, fact.hint4].map((h, i) => (
        <div key={i} style={{
          height: 28, width: '100%', borderRadius: 14, background: 'rgba(235,235,235,0.95)',
          border: `2px solid ${cat?.color || '#FF6B1A'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px 6px',
        }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#1a1a2e', textAlign: 'center', lineHeight: 1 }}>
            {h || '—'}
          </span>
        </div>
      ))}
    </div>
  )

  const hintCost = difficulty?.hintCost || 0
  const hintButtons = totalHints > 0 && !isDevMode && (
    <div
      className="shrink-0"
      style={{ display: 'grid', gridTemplateColumns: totalHints === 1 ? '1fr' : '1fr 1fr', gap: 8 }}
    >
      {Array.from({ length: totalHints }, (_, i) => {
        const hintNum = i + 1
        const hintText = selectedHints[hintNum - 1] ?? null
        const currentCoins = parseInt(JSON.parse(localStorage.getItem('wtf_data') || '{}').wtfCoins || '0', 10)
        // Distinguish free hints from paid hints
        const isFree = hintNum <= freeHints
        const cost = isFree ? 0 : hintCost
        const canAfford = isFree || currentCoins >= cost
        const canUseHint = isFree ? (hintsUsed < freeHints) : (stockRemaining > 0)
        return (
          <HintFlipButton
            key={hintNum}
            num={hintNum}
            hint={hintText}
            catColor={cat?.color || '#FF6B1A'}
            isFree={isFree}
            cost={cost}
            canAfford={canAfford}
            canUse={canUseHint}
            onReveal={() => { onUseHint(hintNum); audio.play('click') }}
            onBuyHint={!isFree && cost > 0 ? () => {
              updateCoins(-cost)
              updateHints(1)
            } : null}
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
  const [tutLightbox, setTutLightbox] = useState(false)
  const [tutCelebrate, setTutCelebrate] = useState(false)
  const [tutoStep, setTutoStep] = useState('intro') // 'intro' | 'hint' | 'answer' | 'done'
  const [spotRect, setSpotRect] = useState(null) // { top, left, width, height } for spotlight hole
  const hintRef = useRef(null)
  const correctBtnRef = useRef(null)
  const [tutWrongMsg] = useState(() => WRONG_MESSAGES[Math.floor(Math.random() * WRONG_MESSAGES.length)])
  const [tutCorrectMsg] = useState(() => CORRECT_MESSAGES[Math.floor(Math.random() * CORRECT_MESSAGES.length)])

  // Image du fact : imageUrl ou fallback local /assets/facts/{id}.png
  const tutorialImageUrl = fact.imageUrl || `/assets/facts/${fact.id}.png`

  // Update spotlight rect when tutoStep changes
  useEffect(() => {
    if (!isTutorial) return
    const pad = 8
    const timer = setTimeout(() => {
      if (tutoStep === 'hint' && hintRef.current) {
        const r = hintRef.current.getBoundingClientRect()
        setSpotRect({ top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 })
      } else if (tutoStep === 'answer' && correctBtnRef.current) {
        const r = correctBtnRef.current.getBoundingClientRect()
        setSpotRect({ top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 })
      } else {
        setSpotRect(null)
      }
    }, 200) // small delay for layout to settle
    return () => clearTimeout(timer)
  }, [tutoStep, isTutorial])

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

    // VIP question: tutoriel est toujours VIP, ou fact a le flag isVip
    const isVipQuestion = isTutorial || fact?.isVip || fact?.type === 'vip'

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
          background: cat
            ? `linear-gradient(160deg, ${cat.color}22 0%, ${cat.color} 100%)`
            : 'linear-gradient(160deg, #1a3a5c22 0%, #1a3a5c 100%)',
        }}
      >
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
          @keyframes tutFingerBounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
          }
          @keyframes tutPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          @keyframes tutFingerToHint {
            0% { top: 40%; left: 50%; opacity: 0; transform: translate(-50%, -50%) scale(1.2); }
            40% { opacity: 1; }
            100% { top: 58%; left: 30%; opacity: 1; transform: translate(-50%, -50%) scale(1); }
          }
          @keyframes tutFingerToAnswer {
            0% { top: 58%; left: 30%; opacity: 0; transform: translate(-50%, -50%) scale(1.2); }
            40% { opacity: 1; }
            100% { top: 75%; left: 50%; opacity: 1; transform: translate(-50%, -50%) scale(1); }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,107,26,0.4); }
            50% { transform: scale(1.05); box-shadow: 0 0 20px 8px rgba(255,107,26,0.3); }
          }
          @keyframes vipParticlePulse {
            0%, 100% { opacity: 0.1; transform: scale(0.8); }
            50%      { opacity: 0.35; transform: scale(1.2); }
          }
        `}</style>

        {/* Particules VIP — overlay doré si isVipQuestion */}
        {isVipQuestion && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} style={{
                position: 'absolute',
                top: `${(i * 31 + 7) % 90}%`,
                left: `${(i * 43 + 13) % 95}%`,
                width: i % 3 === 0 ? 6 : 4,
                height: i % 3 === 0 ? 6 : 4,
                borderRadius: '50%',
                background: `rgba(255,255,255,${0.1 + (i % 4) * 0.07})`,
                animation: `vipParticlePulse ${2 + (i % 3) * 0.5}s ${(i * 0.3).toFixed(1)}s ease-in-out infinite`,
              }} />
            ))}
          </div>
        )}

        {/* Content */}
        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
          gap: 'clamp(12px, 2.5vh, 24px)',
          height: '100%', overflow: 'hidden',
          paddingTop: 'clamp(16px, 3vh, 32px)',
        }}>

          {/* Spotlight hole — box-shadow technique */}
          {(tutoStep === 'hint' || tutoStep === 'answer') && !tutAnswered && spotRect && (
            <>
              {/* Doigt animé — positionné sous le trou */}
              <div style={{
                position: 'fixed',
                top: spotRect.top + spotRect.height + 8,
                left: spotRect.left + spotRect.width / 2,
                transform: 'translateX(-50%)',
                fontSize: 32, zIndex: 102, pointerEvents: 'none',
                animation: 'tutFingerBounce 0.8s ease-in-out infinite',
                transition: 'top 0.6s ease, left 0.6s ease',
              }}>👆</div>

              {/* Texte guide — en bas de l'écran */}
              <div style={{
                position: 'fixed',
                bottom: 'clamp(80px, 12vh, 120px)',
                left: '50%', transform: 'translateX(-50%)',
                zIndex: 102, textAlign: 'center',
              }}>
                <div style={{ background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 14, fontWeight: 800, padding: '8px 20px', borderRadius: 12, fontFamily: 'Nunito, sans-serif', whiteSpace: 'nowrap' }}>
                  {tutoStep === 'hint' ? 'Clique sur un indice 💡' : 'À toi de jouer ! 🎯'}
                </div>
              </div>
            </>
          )}

          {/* Modale d'introduction tuto */}
          {tutoStep === 'intro' && !tutAnswered && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', padding: 20 }}>
              <div style={{ background: 'white', borderRadius: 20, padding: '28px 24px', maxWidth: '85%', width: 340, textAlign: 'center' }}>
                <img src="/assets/ui/vof-logo.png?v=5" alt="Vrai ou Fou?" style={{ width: '60%', height: 'auto', marginBottom: 16, display: 'block', margin: '0 auto 16px' }} />
                <h2 style={{ fontFamily: 'Nunito, sans-serif', fontSize: 18, fontWeight: 900, color: '#FF6B1A', margin: '0 0 12px' }}>Prêt à découvrir des infos<br/>What the...... ? 🤯</h2>
                <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: 14, color: '#555', lineHeight: 1.5, margin: '0 0 16px' }}>
                  Utilise des indices, trouve la bonne réponse et découvre un f*ct incroyable !
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => { audio.play('click'); setTutoStep('hint') }}
                    style={{
                      width: '80%', padding: '16px 40px', borderRadius: 14,
                      background: '#FF6B1A', color: 'white', border: 'none',
                      fontFamily: 'Nunito, sans-serif', fontSize: 16, fontWeight: 900,
                      cursor: 'pointer', animation: 'pulse 1.5s ease-in-out infinite',
                    }}
                  >
                    C'est parti ! 🚀
                  </button>
                  <div style={{
                    fontSize: 24, animation: 'tutFingerBounce 0.8s ease-in-out infinite', pointerEvents: 'none',
                  }}>👆</div>
                </div>
                <button
                  onClick={() => {
                    audio.play('click')
                    // Créditer les devises de départ : 25 coins, 1 ticket, 3 indices
                    const balances = getBalances()
                    const coinsToAdd = Math.max(0, 25 - (balances.coins || 0))
                    const ticketsToAdd = Math.max(0, 1 - (balances.tickets || 0))
                    const hintsToAdd = Math.max(0, 3 - (balances.hints || 0))
                    if (coinsToAdd > 0) updateCoins(coinsToAdd)
                    if (ticketsToAdd > 0) updateTickets(ticketsToAdd)
                    if (hintsToAdd > 0) updateHints(hintsToAdd)

                    // Initialiser wtf_data avec progression complète simulée
                    const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')
                    wtfData.onboardingCompleted = true
                    wtfData.tutorialDone = true
                    wtfData.gamesPlayed = 10
                    wtfData.questsPlayed = 2
                    wtfData.hasSeenFlash = true
                    wtfData.hasSeenQuest = true
                    wtfData.hasSeenCollection = true
                    wtfData.hasSeenBoutique = true
                    wtfData.hasSeenBlitz = true
                    wtfData.hasVisitedCollection = true
                    wtfData.firstFlashTicketGiven = true
                    wtfData.unlockedFacts = wtfData.unlockedFacts || []
                    if (!wtfData.statsByMode) wtfData.statsByMode = {}
                    wtfData.statsByMode.flash_solo = { gamesPlayed: 3, ...(wtfData.statsByMode.flash_solo || {}) }
                    wtfData.statsByMode.parcours = { gamesPlayed: 2, ...(wtfData.statsByMode.parcours || {}) }
                    wtfData.statsByMode.blitz = { gamesPlayed: 1, ...(wtfData.statsByMode.blitz || {}) }
                    wtfData.lastModified = Date.now()
                    localStorage.setItem('wtf_data', JSON.stringify(wtfData))
                    localStorage.setItem('wtf_hints_available', String(Math.max(3, hintsToAdd)))
                    localStorage.setItem('wtf_first_login_done', 'true')

                    // Supprimer les skip_launch flags
                    for (let i = 0; i < localStorage.length; i++) {
                      const key = localStorage.key(i)
                      if (key && key.startsWith('skip_launch_')) {
                        localStorage.removeItem(key)
                      }
                    }

                    import('../utils/tutorialManager').then(({ advanceTutorial, getTutorialState, TUTORIAL_STATES }) => {
                      const advance = async () => {
                        let state = await getTutorialState()
                        while (state !== TUTORIAL_STATES.COMPLETED) {
                          advanceTutorial()
                          state = await getTutorialState()
                        }
                      }
                      advance().then(() => {
                        window.dispatchEvent(new Event('wtf_storage_sync'))
                        if (onTutoComplete) onTutoComplete()
                        else if (onQuit) onQuit()
                      })
                    })
                  }}
                  style={{
                    marginTop: 12, padding: '8px 0',
                    background: 'transparent', border: 'none',
                    fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 700,
                    color: '#9CA3AF', cursor: 'pointer',
                  }}
                >
                  Passer le tutoriel →
                </button>
              </div>
            </div>
          )}

          {/* Logos WTF + tagline + catégorie (pre-answer only) */}
          {!tutAnswered && (
            <div style={{
              flexShrink: 0, textAlign: 'center',
              padding: `${S(10)} ${S(16)} ${S(2)}`,
              animation: 'tutFadeSlideUp 0.6s ease both',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              <img src="/assets/ui/wtf-logo.png?v=4" alt="WTF!" style={{
                width: '30%', maxWidth: 80, height: 'auto', objectFit: 'contain',
                filter: 'drop-shadow(0 3px 12px rgba(255,120,0,0.5))',
              }} />
              <img src="/assets/ui/100logo.png?v=5" alt="Vrai ou Fou?" style={{
                width: '50%', maxWidth: 130, height: 'auto', objectFit: 'contain', marginTop: S(4),
              }} />
              {/* Icône + nom catégorie */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: S(6) }}>
                <img src={`/assets/categories/${fact.category}.png`} alt="" style={{ width: 24, height: 24, borderRadius: 6, objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
                <span style={{ fontSize: S(13), fontWeight: 800, color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                  {cat?.label || fact.category}
                </span>
              </div>
            </div>
          )}

          {/* Post-answer: layout identique à RevelationScreen VIP */}
          {tutAnswered && (
            <>
              {/* Image de la question */}
              <div style={{ flexShrink: 0, padding: `0 ${S(16)}`, maxHeight: '42vh' }}>
                <div
                  className="overflow-hidden relative"
                  style={{
                    background: tutCatGradient, width: '100%', maxHeight: '42vh',
                    borderRadius: S(16), padding: 4,
                    border: `3px solid ${cat?.color || '#1a3a5c'}`,
                  }}
                >
                  {!tutImgFailed ? (
                    <img
                      src={tutorialImageUrl}
                      alt={fact.question}
                      onError={() => setTutImgFailed(true)}
                      onClick={() => tutCorrect && setTutLightbox(true)}
                      style={{
                        objectFit: 'cover', width: '100%', maxHeight: 'calc(42vh - 14px)',
                        display: 'block', borderRadius: S(12),
                        filter: !tutCorrect ? 'blur(12px) brightness(0.5)' : 'none',
                        cursor: tutCorrect ? 'pointer' : 'default',
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
                  {/* Bouton loupe */}
                  {tutCorrect && !tutImgFailed && (
                    <button
                      onClick={() => setTutLightbox(true)}
                      style={{
                        position: 'absolute', top: S(8), right: S(8), zIndex: 10,
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.5)', border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', fontSize: 14,
                      }}
                    >🔍</button>
                  )}
                </div>
              </div>

              {/* Lightbox fullscreen */}
              {tutLightbox && (
                <div
                  onClick={() => setTutLightbox(false)}
                  style={{
                    position: 'fixed', inset: 0, zIndex: 300,
                    background: 'rgba(0,0,0,0.92)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <img src={tutorialImageUrl} alt={fact.question} style={{ objectFit: 'contain', maxWidth: '95vw', maxHeight: '90vh', borderRadius: 8 }} />
                  <button
                    onClick={() => setTutLightbox(false)}
                    style={{
                      position: 'absolute', top: 16, right: 16,
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.15)', border: 'none',
                      color: 'white', fontSize: 24, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >✕</button>
                </div>
              )}

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
              flexShrink: 0, display: 'flex', flexDirection: 'column',
              justifyContent: 'flex-start', gap: 'clamp(10px, 2vh, 16px)',
              padding: `0 ${S(16)}`,
              animation: 'tutFadeSlideUp 0.6s 0.3s ease both',
            }}>
              {/* Indices tutoriel — gratuits, spotlight sur le premier en step 'hint' */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[{ hint: fact.hint1 }, { hint: fact.hint2 }].map((h, i) => (
                  <div key={i} ref={i === 0 ? hintRef : undefined} style={{ position: 'relative' }}>
                    <HintFlipButton num={i + 1} hint={h.hint} catColor={cat?.color || '#FF6B1A'} isFree={true} cost={0} canAfford={true} canUse={true} onReveal={() => { audio.play('click'); setTutoStep('answer') }} onBuyHint={null} />
                  </div>
                ))}
              </div>
              {/* QCM — spotlight sur la bonne réponse en step 'answer', bloqués sinon */}
              <div style={{ transition: 'opacity 0.3s' }}>
                {optionsToRender.map((opt) => {
                  const cleanText = opt.text.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '').trim()
                  const isCorrectOpt = opt.originalIndex === fact.correctIndex
                  const isBlocked = (tutoStep === 'hint') || (tutoStep === 'answer' && !isCorrectOpt)
                  return (
                    <button
                      key={opt.originalIndex}
                      ref={isCorrectOpt ? correctBtnRef : undefined}
                      onClick={() => { if (!isBlocked) handleTutorialAnswer(opt.originalIndex, opt.text) }}
                      className="btn-press transition-all active:scale-95"
                      style={{
                        background: 'rgba(255,255,255,0.12)',
                        border: '1.5px solid rgba(255,255,255,0.35)',
                        borderRadius: S(14), color: 'white', fontWeight: 700,
                        fontSize: S(14), padding: `${S(12)} ${S(10)}`,
                        width: '100%', textAlign: 'center', marginBottom: 'clamp(6px, 1.5vh, 10px)',
                        opacity: isBlocked ? 0.3 : 1,
                        pointerEvents: isBlocked ? 'none' : 'auto',
                        cursor: isBlocked ? 'default' : 'pointer',
                      }}
                    >
                      {cleanText}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Post-answer zone */
            <div style={{
              flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
              justifyContent: 'center', overflow: 'hidden',
              padding: `${S(6)} ${S(16)} 0`,
              animation: 'tutFadeSlideUp 0.4s ease forwards',
            }}>

              {/* Encadré explication (correct uniquement — joueur forcé sur la bonne réponse) */}
              {tutCorrect && (
                <div style={{
                  background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: S(14), padding: `${S(6)} ${S(8)}`,
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
                  <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: S(11), lineHeight: 1.4, fontWeight: 500, margin: 0, overflow: 'hidden' }}>{fact.explanation}</p>
                </div>
              )}

              {/* Wrong: question encadrée (pas de Le saviez-vous) */}
            </div>
          )}

          {/* Boutons — deux boutons côte à côte, partager désactivé pendant tuto */}
          {tutAnswered && tutCorrect && (
            <div style={{
              flexShrink: 0, padding: `${S(6)} ${S(16)} ${S(12)}`,
              animation: 'tutFadeSlideUp 0.4s 0.2s ease both',
              display: 'flex', flexDirection: 'column', gap: S(8),
            }}>
              <div style={{ display: 'flex', gap: S(8), height: S(44) }}>
                <button
                  onClick={isTutorial ? undefined : handleTutorialShare}
                  className="btn-press active:scale-95 transition-all"
                  style={{
                    flex: 1, height: '100%', borderRadius: S(14), fontWeight: 900, fontSize: S(12),
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(4),
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.8)', border: '1.5px solid rgba(255,255,255,0.3)',
                    ...(isTutorial ? {
                      opacity: 0.3,
                      pointerEvents: 'none',
                      filter: 'grayscale(1)',
                    } : {}),
                  }}
                >
                  {tutCorrect ? '🎩 Partager ce WTF!' : '🤝 Demander de l\'aide'}
                </button>
                <button
                  onClick={() => {
                    audio.play('click')
                    // Sauvegarder le fact tuto dans la collection
                    const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')
                    const unlocked = new Set(wtfData.unlockedFacts || [])
                    unlocked.add(fact.id)
                    wtfData.unlockedFacts = [...unlocked]
                    wtfData.lastModified = Date.now()
                    localStorage.setItem('wtf_data', JSON.stringify(wtfData))
                    localStorage.setItem('wtf_first_login_done', 'true')
                    window.dispatchEvent(new Event('wtf_storage_sync'))
                    setTutCelebrate(true)
                  }}
                  className="btn-press active:scale-95 transition-all"
                  style={{
                    flex: 1, height: '100%', borderRadius: S(14), fontWeight: 900, fontSize: S(12),
                    color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', border: '3px solid white',
                    background: `linear-gradient(135deg, ${cat?.color || '#FF6B1A'}dd 0%, ${cat?.color || '#FF6B1A'}99 100%)`,
                    animation: 'pulse 1.5s ease-in-out infinite',
                    boxShadow: '0 0 15px rgba(255,255,255,0.5), 0 0 30px rgba(255,255,255,0.2)',
                  }}
                >
                  CONTINUER →
                </button>
              </div>
              {/* Doigt animé en dessous du bouton CONTINUER */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: S(4) }}>
                <div style={{
                  fontSize: 24, animation: 'tutFingerBounce 0.8s ease-in-out infinite', pointerEvents: 'none',
                }}>👆</div>
              </div>
            </div>
          )}

          {/* Modale de célébration — premier f*ct dans la collection */}
          {tutCelebrate && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', padding: 20 }}>
              <div style={{ background: 'white', borderRadius: 20, padding: '28px 24px', maxWidth: '85%', width: 340, textAlign: 'center' }}>
                {!tutImgFailed && (
                  <img src={tutorialImageUrl} alt="" style={{ width: '40%', borderRadius: 12, border: `3px solid ${cat?.color || '#FF6B1A'}`, marginBottom: 16, display: 'block', margin: '0 auto 16px' }} />
                )}
                <h2 style={{ fontFamily: 'Nunito, sans-serif', fontSize: 20, fontWeight: 900, color: '#FF6B1A', margin: '0 0 10px' }}>Ton premier f*ct WTF! 🏆</h2>
                <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: 14, color: '#555', lineHeight: 1.5, margin: '0 0 6px' }}>
                  Ce f*ct est maintenant dans ta collection.
                </p>
                <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, color: '#888', lineHeight: 1.4, margin: '0 0 18px' }}>
                  Plus tu joues, plus ta collection grandit !
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => { audio.stopAll(); audio.play('click'); onTutoComplete ? onTutoComplete() : onQuit() }}
                    style={{
                      width: '80%', padding: '16px 40px', borderRadius: 14,
                      background: '#FF6B1A', color: 'white', border: 'none',
                      fontFamily: 'Nunito, sans-serif', fontSize: 16, fontWeight: 900,
                      cursor: 'pointer', animation: 'pulse 1.5s ease-in-out infinite',
                    }}
                  >
                    Jouer ma première partie ⚡
                  </button>
                  <div style={{
                    fontSize: 24, animation: 'tutFingerBounce 0.8s ease-in-out infinite', pointerEvents: 'none',
                  }}>👆</div>
                </div>
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
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
        boxSizing: 'border-box', background: screenBg,
      }}
    >
      {quitModal}
      {header}

      {/* Rappel du mode — nom basé sur sessionType */}
      {(() => {
        const modeLabels = { flash_solo: '⚡ MODE FLASH', marathon: '🗺️ MODE EXPLORER', wtf_du_jour: '🔥 MODE HUNT', parcours: '⭐ MODE QUEST' }
        const label = modeLabels[sessionType] || (difficulty ? `${difficulty.emoji || ''} Mode ${difficulty.label || difficulty.id}` : '')
        return label ? (
          <div style={{ textAlign: 'center', flexShrink: 0, padding: `0 0 ${S(2)}` }}>
            <span style={{
              fontSize: S(12), fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.6)', textShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}>
              {label}
            </span>
          </div>
        ) : null
      })()}

      {progressBar}

      {/* Zone centrale : question + indices + QCM */}
      <div className="qs-m" style={{
        flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'flex-start',
        gap: fact.options.length > 4 ? 'clamp(12px, 2.5vh, 20px)' : 'clamp(16px, 3vh, 28px)',
        padding: `0 ${S(16)}`,
        marginTop: 'clamp(8px, 2vh, 16px)',
        overflow: 'auto',
      }}>
        {questionCard}

        {/* Indices */}
        {isDevMode ? devHintButtons : (difficulty?.hintsAllowed && hintButtons)}

        {/* Boutons QCM — taille fixe uniforme */}
        {(() => {
          // Dev mode: afficher les 8 propositions complètes
          const devAllOptions = isDevMode ? [
            { text: fact.shortAnswer || fact.options?.[fact.correctIndex] || '?', type: 'VRAIE', color: '#22C55E' },
            { text: fact.funnyWrong1, type: 'DRÔLE', color: '#EAB308' },
            { text: fact.funnyWrong2, type: 'DRÔLE', color: '#EAB308' },
            { text: fact.closeWrong1, type: 'PROCHE', color: '#F97316' },
            { text: fact.closeWrong2, type: 'PROCHE', color: '#F97316' },
            { text: fact.plausibleWrong1, type: 'PLAUSIBLE', color: '#EF4444' },
            { text: fact.plausibleWrong2, type: 'PLAUSIBLE', color: '#EF4444' },
            { text: fact.plausibleWrong3, type: 'PLAUSIBLE', color: '#EF4444' },
          ].filter(o => o.text) : null

          if (isDevMode && devAllOptions) {
            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: S(4), flexShrink: 0, position: 'relative', zIndex: 5 }}>
                {devAllOptions.map((opt, i) => (
                  <button key={i} onClick={() => { audio.play(i === 0 ? 'correct' : 'wrong'); onSelectAnswer(i === 0 ? fact.correctIndex : -1) }}
                    className="btn-press active:scale-95"
                    style={{
                      background: 'rgba(255,255,255,0.15)', border: `3px solid ${opt.color}`,
                      borderRadius: S(10), color: 'white', fontWeight: 700, fontSize: S(10), lineHeight: 1.15,
                      padding: `${S(2)} ${S(4)}`, height: S(44), width: '100%', overflow: 'hidden',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      textAlign: 'center', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {renderFormattedText(opt.text)}
                    </span>
                    <span style={{ fontSize: 7, fontWeight: 900, opacity: 0.6, marginTop: 1, letterSpacing: '0.05em', flexShrink: 0 }}>{opt.type}</span>
                  </button>
                ))}
              </div>
            )
          }

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

      {/* Timer — centré dans l'espace restant sous les QCM */}
      <div className="qs-timer-wrap" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: S(72), height: S(72), display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <CircularTimer
            key={`${fact.id}-${answerMode}`}
            size={72}
            duration={timerDuration}
            onTimeout={handleTimeout}
          />
        </div>
      </div>
    </div>
  )
}
