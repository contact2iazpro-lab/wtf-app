import { useState, useEffect, useRef } from 'react'
import SettingsModal from '../components/SettingsModal'
import CoinsIcon from '../components/CoinsIcon'
import GameHeader from '../components/GameHeader'
import { getCategoryById } from '../data/facts'
import { audio } from '../utils/audio'
import renderFormattedText from '../utils/renderFormattedText'

// ── isLightColor ────────────────────────────────────────────────────────────
const isLightColor = (hex) => {
  if (!hex) return false
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 160
}

// ── Fallback image — couleur dynamique, remplit exactement le cadre 1:1 ──────
const FallbackImage = ({ categoryColor }) => (
  <div style={{
    background: `linear-gradient(160deg, ${categoryColor}22 0%, ${categoryColor} 100%)`,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '24px',
  }}>
    <div style={{ fontSize: '14px', fontWeight: 900, color: 'rgba(255,255,255,0.25)', letterSpacing: '4px' }}>WTF!</div>
    <div style={{ fontSize: '72px', fontWeight: 900, color: 'white', lineHeight: 1 }}>?</div>
    <div style={{ width: '60%', height: '1px', background: 'rgba(255,255,255,0.3)', margin: '4px 0' }} />
    <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', letterSpacing: '1px', textAlign: 'center' }}>CE FAIT EST SI INCROYABLE</div>
    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 1.5 }}>
      qu'on n'a pas encore trouvé<br/>une image à la hauteur...
    </div>
    <div style={{ width: '60%', height: '1px', background: 'rgba(255,255,255,0.3)', margin: '4px 0' }} />
    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Image bientôt disponible</div>
  </div>
)

// ── Messages bienveillants ─────────────────────────────────────────────────────
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

// ── Stamp animation CSS (injected once) ─────────────────────────────────────
const STAMP_STYLE_ID = 'revelation-stamp-style'
if (typeof document !== 'undefined' && !document.getElementById(STAMP_STYLE_ID)) {
  const style = document.createElement('style')
  style.id = STAMP_STYLE_ID
  style.textContent = `
    @keyframes stampImpact {
      0% { transform: translate(-50%, -50%) scale(2.5) rotate(-12deg); opacity: 0; }
      40% { transform: translate(-50%, -50%) scale(0.9) rotate(-12deg); opacity: 1; }
      60% { transform: translate(-50%, -50%) scale(1.05) rotate(-12deg); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(1) rotate(-12deg); opacity: 1; }
    }
    @keyframes coinFly {
      0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      80% { opacity: 1; }
      100% { opacity: 0; transform: translate(var(--coin-dx), var(--coin-dy)) scale(0.3); }
    }
    @keyframes goldShimmer {
      0%   { transform: translateX(-100%) translateY(-100%) rotate(25deg); }
      100% { transform: translateX(100%) translateY(100%) rotate(25deg); }
    }
    @keyframes goldSparkle {
      0%, 100% { opacity: 0; transform: scale(0.5); }
      50%      { opacity: 1; transform: scale(1.2); }
    }
    @keyframes goldBorderPulse {
      0%, 100% { box-shadow: 0 0 15px rgba(255,215,0,0.4), 0 0 30px rgba(255,215,0,0.2); }
      50%      { box-shadow: 0 0 25px rgba(255,215,0,0.6), 0 0 45px rgba(255,215,0,0.3), 0 0 70px rgba(255,215,0,0.1); }
    }
    .gold-card {
      border: 3px solid transparent !important;
      border-image: linear-gradient(135deg, #FFD700, #FFA500, #FFD700, #FFEC8B, #FFD700) 1 !important;
      border-radius: 0 !important;
      animation: goldBorderPulse 2s ease-in-out infinite;
    }
    .gold-card-rounded {
      border: 3px solid #FFD700 !important;
      box-shadow: 0 0 15px rgba(255,215,0,0.4), 0 0 30px rgba(255,215,0,0.2);
      animation: goldBorderPulse 2s ease-in-out infinite;
    }
    .flip-card { perspective: 800px; }
    .flip-card-inner {
      position: relative; width: 100%; height: 100%;
      transform-style: preserve-3d; transition: transform 0.3s ease-in-out;
    }
    .flip-card-inner.flipped { transform: rotateX(180deg); }
    .flip-card-face {
      position: absolute; inset: 0; backface-visibility: hidden;
      display: flex; align-items: center; justify-content: center;
      border-radius: inherit;
    }
    .flip-card-back { transform: rotateX(180deg); }
  `
  document.head.appendChild(style)
}


export default function RevelationScreen({
  fact,
  isCorrect,
  selectedAnswer,
  pointsEarned,
  hintsUsed,
  onNext,
  onShare,
  onQuit,
  factIndex,
  totalFacts,
  duelContext,
  gameMode,
  sessionScore,
  playerCoins = 0,
  playerTickets = 0,
  playerHints = 0,
  sessionType = 'parcours',
  wrongAnswer,
  correctAnswer,
}) {
  const S = (px) => `calc(${px}px * var(--scale))`

  // ── Flip animation state (mauvaise réponse → bonne réponse) ───────────────
  // Désactivé : ne pas montrer la bonne réponse sur mauvaise réponse
  const hasFlipIntro = false
  const [flipDone, setFlipDone] = useState(true)
  const [flipCardFlipped, setFlipCardFlipped] = useState(false)

  useEffect(() => {
    if (!hasFlipIntro) return
    // Petit délai avant de lancer le flip pour que l'utilisateur voie la mauvaise réponse
    const startTimer = setTimeout(() => setFlipCardFlipped(true), 600)
    // Une fois le flip terminé (300ms transition), on enchaîne sur l'écran normal
    const doneTimer = setTimeout(() => setFlipDone(true), 1200)
    return () => { clearTimeout(startTimer); clearTimeout(doneTimer) }
  }, [hasFlipIntro])

  const [flipped, setFlipped] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const [displayedScore, setDisplayedScore] = useState(playerCoins - pointsEarned)
  const [showScorePulse, setShowScorePulse] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  const [showCoins, setShowCoins] = useState(false)

  // Messages aléatoires calculés une seule fois au montage
  const [wrongMsg]   = useState(() => WRONG_MESSAGES[Math.floor(Math.random() * WRONG_MESSAGES.length)])
  const [correctMsg] = useState(() => CORRECT_MESSAGES[Math.floor(Math.random() * CORRECT_MESSAGES.length)])

  const scoreRefTarget = useRef(null)

  const cat = getCategoryById(fact.category)
  const isDuel = !!duelContext
  const isLast = factIndex + 1 >= totalFacts
  const successRate = 15 + (fact.id % 40)
  const catTextColor = cat?.color ? (isLightColor(cat.color) ? '#1a1a1a' : '#ffffff') : 'rgba(255,255,255,0.8)'

  // COR 7 — Gradient catégorie identique dans les deux cas
  const catGradient = cat
    ? `linear-gradient(160deg, ${cat.color}22 0%, ${cat.color} 100%)`
    : 'linear-gradient(160deg, #1a3a5c22 0%, #1a3a5c 100%)'

  // ── Coins animation (replaces floating +5 pts badge) ──────────────────────
  useEffect(() => {
    if (!isDuel && isCorrect) {
      setTimeout(() => audio.playFile('What the fact.mp3'), 350)
      setTimeout(() => audio.playFile('Coins points.mp3'), 600)
      // Trigger coins animation after a short delay
      setTimeout(() => setShowCoins(true), 400)
      // Update score after coins reach target
      const scoreTimer = setTimeout(() => {
        setDisplayedScore(prev => prev + pointsEarned)
        setShowScorePulse(true)
        setTimeout(() => setShowScorePulse(false), 600)
      }, 1800)
      return () => clearTimeout(scoreTimer)
    }
  }, [isCorrect, isDuel])

  const handleShare = () => {
    onShare()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleNativeShare = () => {
    const shareMessages = [
      `🤯 Mate ce f*ct !\n\n"${fact.question}"\n\n👉 https://wtf-app-livid.vercel.app/`,
      `🤯 Tu savais ça ?!\n\n"${fact.question}"\n\n👉 https://wtf-app-livid.vercel.app/`,
      `🤯 WOOW incroyable !\n\n"${fact.question}"\n\n👉 https://wtf-app-livid.vercel.app/`,
      `🤯 Regarde ce que j'ai découvert !\n\n"${fact.question}"\n\n👉 https://wtf-app-livid.vercel.app/`,
      `🤯 Non mais t'as vu ça ?!\n\n"${fact.question}"\n\n👉 https://wtf-app-livid.vercel.app/`,
    ]
    const shareMessage = shareMessages[Math.floor(Math.random() * shareMessages.length)]
    if (navigator.share) {
      navigator.share({ text: shareMessage })
    }
  }

  const handleNext = () => {
    audio.stopAll()
    audio.play('click')
    onNext()
  }

  const isLastPlayer = isDuel && duelContext.isLastPlayer
  const playerColor = isDuel ? (['#3B82F6', '#FF5C1A', '#22C55E', '#A855F7', '#EAB308', '#EC4899'][duelContext.currentPlayerIndex] ?? '#FF5C1A') : null
  const isOpenMode = selectedAnswer === 100 || selectedAnswer === -2
  const isTimeout = selectedAnswer === -1

  const selectedAnswerText = selectedAnswer >= 0 ? fact.options[selectedAnswer] : 'Pas de réponse'
  const correctAnswerText = fact.options[fact.correctIndex]

  const nextLabel = isDuel
    ? !isLastPlayer
      ? `▶ Au tour de ${duelContext.players[duelContext.currentPlayerIndex + 1]?.name}`
      : isLast ? '🏆 Résultats' : '⚡ Question suivante'
    : isLast ? '🏁 Mes résultats' : '⚡ Suivant'

  const nextBtnStyle = {
    background: isDuel
      ? `linear-gradient(135deg, ${playerColor} 0%, ${playerColor}bb 100%)`
      : `linear-gradient(135deg, ${cat?.color} 0%, ${cat?.color}dd 100%)`,
    boxShadow: `0 4px 20px ${isDuel ? playerColor : cat?.color}40`,
  }

  // ── Coins flying animation ────────────────────────────────────────────────
  const coinsAnimation = showCoins && !isDuel && isCorrect && scoreRefTarget.current && (
    (() => {
      const scoreRect = scoreRefTarget.current.getBoundingClientRect()
      const targetX = scoreRect.left + scoreRect.width / 2
      const targetY = scoreRect.top + scoreRect.height / 2
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      return Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2
        const spread = 30
        const startX = centerX + Math.cos(angle) * spread
        const startY = centerY + Math.sin(angle) * spread
        const dx = targetX - startX
        const dy = targetY - startY
        return (
          <div key={i} className="fixed pointer-events-none" style={{
            left: startX, top: startY, zIndex: 60,
            '--coin-dx': `${dx}px`, '--coin-dy': `${dy}px`,
            animation: `coinFly 1.2s ${0.05 * i}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
          }}>
            <CoinsIcon size={22} />
          </div>
        )
      })
    })()
  )

  // ── Quit confirmation modal ───────────────────────────────────────────────
  const quitModal = showQuitConfirm && (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full rounded-3xl p-6 mx-4" style={{ background: '#FAFAF8', border: '1px solid #E5E7EB', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>
        <div className="text-2xl text-center mb-3">🏃</div>
        <h2 className="font-black text-lg text-center mb-2" style={{ color: '#1a1a2e' }}>Quitter la partie ?</h2>
        <p className="text-sm text-center mb-6 leading-relaxed" style={{ color: '#6B7280' }}>
          {gameMode === 'marathon'
            ? 'Tes points accumulés ne seront pas comptabilisés au classement.'
            : 'Ta progression sera perdue.'
          }
        </p>
        <div className="flex gap-3">
          <button onClick={() => setShowQuitConfirm(false)} className="flex-1 py-4 rounded-2xl font-black text-base"
            style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151' }}>
            Annuler
          </button>
          <button onClick={() => { audio.stopAll(); onQuit() }} className="flex-1 py-4 rounded-2xl font-black text-base"
            style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid #F44336', color: '#DC2626' }}>
            Quitter
          </button>
        </div>
      </div>
    </div>
  )

  // ── Header commun ─────────────────────────────────────────────────────────
  const renderHeader = () => (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexShrink: 0, padding: `${S(8)} ${S(12)}` }}>
      <button
        onClick={() => setShowQuitConfirm(true)}
        style={{ width: S(36), height: S(36), borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
      >
        <span style={{ fontSize: S(16), color: 'white', fontWeight: 900, lineHeight: 1, cursor: 'pointer' }}>✕</span>
      </button>
      <div style={{ flex: 1, minWidth: 0, padding: `0 ${S(8)}` }}>
        <span style={{
          fontWeight: 900, fontSize: S(13), color: catTextColor,
          whiteSpace: 'normal', overflow: 'visible', display: 'block',
        }}>
          {cat?.label || 'Question'}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: S(8), flexShrink: 0, userSelect: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: S(3) }}>
          <img src="/assets/ui/icon-coins.png" style={{ width: S(16), height: S(16) }} alt="" />
          <span ref={scoreRefTarget} className={showScorePulse ? 'score-pulse' : ''} style={{ fontWeight: 700, color: 'white', fontSize: S(12) }}>{displayedScore}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: S(3) }}>
          <img src="/assets/ui/icon-tickets.png" style={{ width: S(16), height: S(16) }} alt="" />
          <span style={{ fontWeight: 700, color: 'white', fontSize: S(12) }}>{playerTickets}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: S(3) }}>
          <img src="/assets/ui/icon-hint.png" style={{ width: S(16), height: S(16) }} alt="" />
          <span style={{ fontWeight: 700, color: 'white', fontSize: S(12) }}>{playerHints}</span>
        </div>
      </div>
      <button
        onClick={() => { audio.play('click'); setShowSettings(true) }}
        style={{ width: S(36), height: S(36), borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: S(6) }}
      >
        <img src="/assets/ui/icon-settings.png" style={{ width: S(20), height: S(20) }} alt="" />
      </button>
    </div>
  )

  // ── Flip intro overlay (mauvaise réponse → bonne réponse) ─────────────────
  if (hasFlipIntro && !flipDone) {
    return (
      <div style={{
        height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: catGradient,
      }}>
        <div className="flip-card" style={{ width: '80%', height: S(80) }}>
          <div className={`flip-card-inner${flipCardFlipped ? ' flipped' : ''}`}>
            {/* Face avant : mauvaise réponse */}
            <div className="flip-card-face" style={{
              background: 'rgba(244,67,54,0.15)', border: '2px solid #F44336',
              borderRadius: S(16), padding: `${S(16)} ${S(20)}`,
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: S(10), fontWeight: 900, color: '#F44336', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: S(6) }}>✗ Ta réponse</div>
                <div style={{ fontSize: S(15), fontWeight: 900, color: 'white', lineHeight: 1.3 }}>{wrongAnswer}</div>
              </div>
            </div>
            {/* Face arrière : bonne réponse */}
            <div className="flip-card-face flip-card-back" style={{
              background: 'rgba(76,175,80,0.15)', border: '2px solid #4CAF50',
              borderRadius: S(16), padding: `${S(16)} ${S(20)}`,
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: S(10), fontWeight: 900, color: '#4CAF50', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: S(6) }}>✓ Bonne réponse</div>
                <div style={{ fontSize: S(15), fontWeight: 900, color: 'white', lineHeight: 1.3 }}>{correctAnswer}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── CAS MAUVAISE RÉPONSE (solo) ───────────────────────────────────────────
  if (!isCorrect && !isDuel) {
    return (
      <div className="relative screen-enter" style={{
        height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxSizing: 'border-box', width: '100%',
        backgroundImage: 'url(/assets/backgrounds/question-default.webp)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        backgroundColor: cat?.color || '#1a1a2e',
      }}>
        {/* Overlay couleur catégorie */}
        <div style={{ position: 'absolute', inset: 0, background: `${cat?.color || '#1a1a2e'}cc`, zIndex: 0 }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {quitModal}
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

        {/* Header */}
        {renderHeader()}

        {/* Image floutée + stamp bienveillant par-dessus */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: `0 ${S(16)}`, maxHeight: '35vh' }}>
          <div
            className="overflow-hidden relative"
            style={{ background: catGradient, width: '100%', maxHeight: '30vh', borderRadius: S(16), border: `3px solid ${cat?.color || '#1a3a5c'}`, padding: 4 }}
          >
            {fact.imageUrl && !imgFailed ? (
              <img
                src={fact.imageUrl}
                alt={fact.question}
                style={{ objectFit: 'contain', width: '100%', maxHeight: 'calc(35vh - 14px)', display: 'block', borderRadius: S(12), filter: 'blur(12px) brightness(0.5)' }}
                onError={() => setImgFailed(true)}
              />
            ) : (
              <div style={{ width: '100%', height: 'calc(30vh - 14px)', background: catGradient, filter: 'blur(8px) brightness(0.5)', borderRadius: S(12) }}>
                <FallbackImage categoryColor={cat?.color || '#1a3a5c'} />
              </div>
            )}
            {/* Overlay sombre */}
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.35)', zIndex: 1 }} />
            {/* Stamp bienveillant centré par-dessus l'image */}
            {flipped && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 5 }}>
                <div style={{
                  position: 'absolute', left: '50%', top: '50%',
                  animation: 'stampImpact 0.5s ease-out forwards',
                  background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderRadius: S(14), padding: `${S(10)} ${S(16)}`,
                  maxWidth: '85%', textAlign: 'center',
                }}>
                  <span style={{ fontSize: S(13), fontWeight: 900, color: 'white', lineHeight: 1.4 }}>
                    {wrongMsg}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Social proof */}
        {flipped && (
          <div style={{ textAlign: 'center', padding: `${S(6)} ${S(16)} 0` }}>
            <span style={{ fontSize: S(11), fontWeight: 900, color: 'rgba(255,255,255,0.7)', display: 'block' }}>
              👥 {100 - successRate}% des joueurs ont trouvé ce f*ct
            </span>
          </div>
        )}

        {/* Encadré question */}
        <div style={{ flex: 1, minHeight: 0, padding: `${S(6)} ${S(16)} 0`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{
            background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: S(16), padding: `${S(10)} ${S(12)}`,
          }}>
            <div style={{ fontSize: S(9), fontWeight: 900, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: S(4) }}>La question :</div>
            <div style={{ fontSize: S(12), fontWeight: 700, color: 'white', lineHeight: 1.3 }}>{renderFormattedText(fact.question)}</div>
            {isTimeout && (
              <div style={{ marginTop: S(6), fontSize: S(10), fontWeight: 700, color: '#FB923C' }}>⏱️ Temps écoulé</div>
            )}
          </div>
        </div>

        {/* Boutons */}
        <div style={{ flexShrink: 0, padding: `${S(6)} ${S(16)} ${S(12)}` }}>
          <div style={{ display: 'flex', gap: S(8), height: S(44) }}>
            <button
              onClick={handleNativeShare}
              className="btn-press active:scale-95 transition-all"
              style={{
                flex: 1, height: '100%', borderRadius: S(14), fontWeight: 900, fontSize: S(12),
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(4),
                background: `linear-gradient(135deg, ${cat?.color || '#FF6B1A'} 0%, ${cat?.color || '#FF6B1A'}cc 100%)`,
                color: 'white', border: 'none',
              }}
            >
              🤝 Demander de l'aide
            </button>
            <button
              onClick={handleNext}
              className="btn-press active:scale-95 transition-all"
              style={{
                flex: 1, height: '100%', borderRadius: S(14), fontWeight: 900, fontSize: S(12),
                color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', border: 'none',
                background: `linear-gradient(135deg, ${cat?.color || '#FF6B1A'}dd 0%, ${cat?.color || '#FF6B1A'}99 100%)`,
              }}
            >
              {isLast ? '🏁 RÉSULTATS' : 'SUIVANT →'}
            </button>
          </div>
        </div>
        </div>
      </div>
    )
  }

  // ── CAS BONNE RÉPONSE (et duel) ───────────────────────────────────────────
  return (
    <div className="relative screen-enter" style={{
      height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      boxSizing: 'border-box', width: '100%',
      backgroundImage: `url(/assets/backgrounds/question-default.webp)`,
      backgroundSize: 'cover', backgroundPosition: 'center',
      backgroundColor: cat?.color || '#1a1a2e',
    }}>
      {/* Overlay couleur catégorie */}
      <div style={{ position: 'absolute', inset: 0, background: `${cat?.color || '#1a1a2e'}cc`, zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {quitModal}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {coinsAnimation}

      {/* Header */}
      {renderHeader()}

      {/* Image pleine largeur — contain, pas de crop */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: `0 ${S(16)}`, maxHeight: '35vh' }}>
        <div
          className={`overflow-hidden relative${!isDuel && flipped && isCorrect ? ' wow-shine wow-glow gold-card-rounded' : ''}`}
          style={{
            background: catGradient, width: '100%', maxHeight: '35vh',
            borderRadius: S(16), padding: 4,
            border: !isDuel && flipped && isCorrect ? undefined : `3px solid ${cat?.color || '#1a3a5c'}`,
          }}
        >
          {fact.imageUrl && !imgFailed ? (
            <img
              src={fact.imageUrl}
              alt={fact.question}
              style={{ objectFit: 'contain', width: '100%', maxHeight: 'calc(35vh - 14px)', display: 'block', borderRadius: S(12) }}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <FallbackImage categoryColor={cat?.color || '#1a3a5c'} />
          )}

          {/* Gold overlay + shimmer (bonne réponse uniquement) */}
          {!isDuel && flipped && isCorrect && (
            <>
              {/* Overlay gold semi-transparent */}
              <div className="absolute inset-0 pointer-events-none" style={{
                zIndex: 6,
                background: 'linear-gradient(135deg, rgba(255,215,0,0.08) 0%, rgba(255,180,0,0.15) 25%, rgba(255,215,0,0.05) 50%, rgba(255,180,0,0.15) 75%, rgba(255,215,0,0.08) 100%)',
                borderRadius: S(12),
              }} />
              {/* Shimmer diagonal gliding */}
              <div className="absolute inset-0 pointer-events-none" style={{
                zIndex: 7, overflow: 'hidden', borderRadius: S(12),
              }}>
                <div style={{
                  position: 'absolute', inset: '-50%',
                  background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 45%, rgba(255,215,0,0.15) 50%, rgba(255,255,255,0.08) 55%, transparent 60%)',
                  animation: 'goldShimmer 3s ease-in-out infinite',
                }} />
              </div>
              {/* Sparkle particles */}
              {[
                { top: '-3px', left: '15%', delay: '0s' },
                { top: '20%', right: '-3px', delay: '0.4s' },
                { bottom: '10%', left: '-3px', delay: '0.8s' },
                { bottom: '-3px', right: '25%', delay: '1.2s' },
                { top: '50%', right: '10%', delay: '1.6s' },
              ].map((pos, i) => (
                <div key={i} className="absolute pointer-events-none" style={{
                  ...pos, zIndex: 8,
                  width: '5px', height: '5px', borderRadius: '50%',
                  background: 'radial-gradient(circle, #FFD700, #FFA500)',
                  boxShadow: '0 0 6px rgba(255,215,0,0.8)',
                  animation: `goldSparkle 2s ${pos.delay} ease-in-out infinite`,
                }} />
              ))}
            </>
          )}

          {/* Stamp FOU — petit, coin bas droit */}
          {!isDuel && flipped && isCorrect && (
            <div className="absolute pointer-events-none" style={{ right: S(8), bottom: S(8), zIndex: 10 }}>
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
          )}
        </div>
      </div>

      {/* Zone info — flex: 1, overflow auto si nécessaire */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: `${S(4)} ${S(16)} 0`, display: 'flex', flexDirection: 'column', gap: S(2) }}>
        {/* Message de succès + social proof */}
        {flipped && !isDuel && isCorrect && (
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: S(12), fontWeight: 700, color: 'white', lineHeight: 1.4, display: 'block' }}>
              {correctMsg}
            </span>
            <span style={{ fontSize: S(13), fontWeight: 900, color: 'rgba(255,255,255,0.7)', display: 'block', marginTop: S(2) }}>
              👥 Seulement {successRate}% des joueurs ont trouvé ce f*ct
            </span>
          </div>
        )}

        {/* Duel — badges */}
        {isDuel && (
          <div style={{ display: 'flex', gap: S(8) }}>
            <div className="score-pop" style={{
              flex: 1, textAlign: 'center', padding: S(8), borderRadius: S(12),
              background: isCorrect ? 'rgba(76,175,80,0.15)' : 'rgba(244,67,54,0.15)',
              border: `2px solid ${isCorrect ? '#4CAF50' : '#F44336'}`,
              color: isCorrect ? '#4CAF50' : '#F44336', fontWeight: 900, fontSize: S(13),
              animationDelay: '0.5s', opacity: 0,
            }}>
              {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </div>
            <div className="score-pop" style={{
              flex: 1, textAlign: 'center', padding: S(8), borderRadius: S(12),
              background: `${cat?.color}15`, border: `2px solid ${cat?.color}60`,
              color: cat?.color, fontWeight: 900, fontSize: S(13),
              animationDelay: '0.6s', opacity: 0,
            }}>
              +{pointsEarned} pts
            </div>
          </div>
        )}

        {/* Encadré explication — sans lien Source */}
        {!isDuel && isCorrect && (
          <div style={{
            background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: S(16), padding: `${S(10)} ${S(12)}`,
          }}>
            <div style={{
              background: 'rgba(76,175,80,0.12)', border: '1px solid rgba(76,175,80,0.3)',
              borderRadius: S(10), padding: `${S(8)} ${S(10)}`, marginBottom: S(8),
            }}>
              <div style={{ fontSize: S(9), fontWeight: 900, color: '#4CAF50', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: S(2), textShadow: '0 0 10px rgba(255,215,0,0.5)' }}>✓ Bonne réponse :</div>
              <div style={{ fontSize: S(12), fontWeight: 700, color: 'white' }}>{correctAnswerText}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: S(4), marginBottom: S(4) }}>
              <span style={{ fontSize: S(14) }}>🧠</span>
              <span style={{ color: 'white', fontWeight: 900, fontSize: S(10), textTransform: 'uppercase', letterSpacing: '0.05em' }}>Le saviez-vous ?</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: S(11), lineHeight: 1.35, fontWeight: 500, margin: 0 }}>{fact.explanation}</p>
          </div>
        )}

        {/* Duel — scores finaux */}
        {isDuel && isLastPlayer && (
          <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: S(12), padding: S(10) }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: S(9), fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: S(6) }}>Scores</div>
            {[...duelContext.players]
              .map((p, i) => ({ ...p, color: ['#3B82F6', '#FF5C1A', '#22C55E', '#A855F7', '#EAB308', '#EC4899'][i] }))
              .sort((a, b) => b.score - a.score)
              .map((p, rank) => (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: S(6), marginBottom: S(3) }}>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: S(10), width: S(14) }}>{rank + 1}.</span>
                  <span style={{ flex: 1, color: 'white', fontWeight: 700, fontSize: S(11) }}>{p.name}</span>
                  <span style={{ fontWeight: 900, fontSize: S(12), color: p.color }}>{p.score} pts</span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Boutons — compact */}
      <div style={{ flexShrink: 0, padding: `${S(4)} ${S(16)} ${S(8)}` }}>
        {!isDuel && isCorrect && (
          <div style={{ display: 'flex', gap: S(8), height: S(44) }}>
            <button
              onClick={handleNativeShare}
              className="btn-press active:scale-95 transition-all"
              style={{
                flex: 1, height: '100%', borderRadius: S(14), fontWeight: 900, fontSize: S(12),
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(4),
                background: `linear-gradient(135deg, ${cat?.color || '#FF6B1A'} 0%, ${cat?.color || '#FF6B1A'}cc 100%)`,
                color: 'white', border: 'none',
              }}
            >
              🎩 Partager ce WTF!
            </button>
            <button
              onClick={handleNext}
              className="btn-press active:scale-95 transition-all"
              style={{
                flex: 1, height: '100%', borderRadius: S(14), fontWeight: 900, fontSize: S(12),
                color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', border: 'none',
                background: `linear-gradient(135deg, ${cat?.color || '#FF6B1A'}dd 0%, ${cat?.color || '#FF6B1A'}99 100%)`,
              }}
            >
              {isLast ? '🏁 RÉSULTATS' : 'SUIVANT →'}
            </button>
          </div>
        )}

        {isDuel && (
          <button
            onClick={handleNext}
            className="btn-press active:scale-95 transition-all"
            style={{
              width: '100%', padding: `${S(14)} 0`, borderRadius: S(14),
              color: 'white', fontWeight: 900, fontSize: S(14),
              textTransform: 'uppercase', letterSpacing: '0.05em', border: 'none',
              ...nextBtnStyle,
            }}
          >
            {nextLabel}
          </button>
        )}
      </div>
      </div>
    </div>
  )
}
