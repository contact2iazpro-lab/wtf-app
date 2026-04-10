import { useState, useEffect, useRef } from 'react'
import SettingsModal from '../components/SettingsModal'
import CoinsIcon from '../components/CoinsIcon'
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
  "What the... non ! 🤯",
  "Ton cerveau a bugué 🧠💥",
  "Même Google aurait hésité 🤖",
  "C'est un f*ct, pas une fiction ! 📖",
  "Presque... dans un univers parallèle 🌀",
  "Le f*ct a gagné cette manche 💪",
  "Ton doigt a glissé, avoue 👆",
  "WTF! Tu y étais presque ! 🎯",
  "Le savoir, ça se cultive 🌱",
  "Erreur 404 : bonne réponse non trouvée 🔍",
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
    @keyframes holoRotate {
      from { --holo-angle: 0deg; }
      to   { --holo-angle: 360deg; }
    }
    @keyframes holoPrism {
      0%   { transform: translateX(-100%); }
      100% { transform: translateX(200%); }
    }
    @keyframes vipParticlePulse {
      0%, 100% { opacity: 0.1; transform: scale(0.8); }
      50%      { opacity: 0.35; transform: scale(1.2); }
    }
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

  const [flipped, setFlipped] = useState(true)
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const [showLightbox, setShowLightbox] = useState(false)
  // sessionScore includes current points already — start display BEFORE this question's points
  const [displayedScore, setDisplayedScore] = useState(isCorrect ? sessionScore - pointsEarned : sessionScore)
  const [showScorePulse, setShowScorePulse] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  const [showCoins, setShowCoins] = useState(false)

  // Messages aléatoires calculés une seule fois au montage
  const [wrongMsg]   = useState(() => WRONG_MESSAGES[Math.floor(Math.random() * WRONG_MESSAGES.length)])
  const [correctMsg] = useState(() => CORRECT_MESSAGES[Math.floor(Math.random() * CORRECT_MESSAGES.length)])

  const scoreRefTarget = useRef(null)
  const nextButtonRef = useRef(null)

  const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')
  const gamesPlayed = wtfData.gamesPlayed || 0

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

  const handleNativeShare = () => {
    const shareMessages = [
      `Mate ce f*ct !\n\n"${fact.question}"\n\n${window.location.origin}`,
      `Tu savais ça ?!\n\n"${fact.question}"\n\n${window.location.origin}`,
      `Incroyable !\n\n"${fact.question}"\n\n${window.location.origin}`,
    ]
    const shareMessage = shareMessages[Math.floor(Math.random() * shareMessages.length)]
    if (navigator.share) {
      navigator.share({ text: shareMessage }).catch(() => {})
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
          Tes f*cts et tes coins gagnés ne seront pas sauvegardés.
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
        <img
          src={`/assets/categories/${cat?.id || 'kids'}.png`}
          alt={cat?.label || ''}
          style={{ width: S(24), height: S(24), borderRadius: 4, objectFit: 'cover' }}
          onError={e => { e.target.style.display = 'none' }}
        />
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0, maxHeight: '42vh' }}>
          <div
            className="overflow-hidden relative"
            style={{ background: catGradient, width: '100%', maxHeight: '42vh', borderRadius: S(16), border: `3px solid ${cat?.color || '#1a3a5c'}`, padding: 4 }}
          >
            {fact.imageUrl && !imgFailed ? (
              <img
                src={fact.imageUrl}
                alt={fact.question}
                style={{ objectFit: 'cover', width: '100%', maxHeight: 'calc(42vh - 14px)', display: 'block', borderRadius: S(12), filter: 'blur(12px) brightness(0.5)' }}
                onError={() => setImgFailed(true)}
              />
            ) : (
              <div style={{ width: '100%', height: 'calc(42vh - 14px)', background: catGradient, filter: 'blur(8px) brightness(0.5)', borderRadius: S(12) }}>
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
                  background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
                  border: '3px solid #EF4444',
                  borderRadius: S(14), padding: `${S(14)} ${S(20)}`,
                  maxWidth: '90%', textAlign: 'center',
                }}>
                  <span style={{ fontSize: S(16), fontWeight: 900, color: '#EF4444', lineHeight: 1.4 }}>
                    {wrongMsg}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Social proof */}
        {flipped && (
          <div style={{ textAlign: 'center', padding: `${S(8)} ${S(16)} 0`, flexShrink: 0 }}>
            <span style={{ fontSize: S(14), fontWeight: 800, color: '#ffffff', opacity: 0.8, display: 'block', textShadow: '0 1px 3px rgba(0,0,0,0.3)', lineHeight: 1.3 }}>
              👥 {100 - successRate}% des joueurs<br />ont trouvé ce f*ct
            </span>
          </div>
        )}

        {/* Encadré question */}
        <div style={{ flex: 1, minHeight: 0, padding: `${S(8)} ${S(16)} 0`, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
          <div style={{
            background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: S(16), padding: `${S(10)} ${S(12)}`,
          }}>
            <div style={{ fontSize: S(9), fontWeight: 900, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: S(4) }}>La question :</div>
            <div style={{ fontSize: S(12), fontWeight: 700, color: '#ffffff', lineHeight: 1.3 }}>{renderFormattedText(fact.question)}</div>
            {isTimeout && (
              <div style={{ marginTop: S(6), fontSize: S(10), fontWeight: 700, color: '#FB923C' }}>⏱️ Temps écoulé</div>
            )}
          </div>
        </div>

        {/* Boutons */}
        <div style={{ flexShrink: 0, padding: `${S(4)} ${S(16)} ${S(8)}`, position: 'relative' }}>
          <div style={{ display: 'flex', gap: S(8), height: S(44) }}>
            {gamesPlayed > 1 && (
              <button
                onClick={handleNativeShare}
                className="btn-press active:scale-95 transition-all"
                style={{
                  flex: 1, height: '100%', borderRadius: S(14), fontWeight: 900, fontSize: S(12),
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(4),
                  background: `linear-gradient(135deg, ${cat?.color || '#FF6B1A'} 0%, ${cat?.color || '#FF6B1A'}cc 100%)`,
                  color: 'white', border: '2px solid rgba(255,255,255,0.4)',
                }}
              >
                🤝 Demander de l'aide
              </button>
            )}
            <button
              onClick={handleNext}
              className="btn-press active:scale-95 transition-all"
              style={{
                flex: 1, height: '100%', borderRadius: S(14), fontWeight: 900, fontSize: S(12),
                color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em',
                border: '2px solid rgba(255,255,255,0.4)',
                background: `linear-gradient(135deg, ${cat?.color || '#FF6B1A'}dd 0%, ${cat?.color || '#FF6B1A'}99 100%)`,
                ...(false ? {
                  animation: 'pulse 1.5s ease-in-out infinite',
                  boxShadow: '0 0 15px rgba(255,107,26,0.5), 0 0 30px rgba(255,107,26,0.2)',
                } : {}),
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
  const isVipReveal = !isDuel && isCorrect && fact.isVip
  const showVipGlow = isVipReveal
  return (
    <div className="relative screen-enter" style={{
      height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      boxSizing: 'border-box', width: '100%',
      ...(showVipGlow ? {
        background: catGradient,
      } : {
        backgroundImage: 'url(/assets/backgrounds/question-default.webp)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        backgroundColor: cat?.color || '#1a1a2e',
      }),
    }}>
      {/* Overlay couleur catégorie (non-VIP) ou particules VIP */}
      {showVipGlow ? (
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
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: `${cat?.color || '#1a1a2e'}cc`, zIndex: 0 }} />
      )}

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {quitModal}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {coinsAnimation}

      {/* Header */}
      {renderHeader()}

      {/* Image pleine largeur — cover, plein cadre */}
      {showVipGlow && (
        <style>{`
          @keyframes vipCardGlow {
            0%, 100% {
              box-shadow: inset 0 0 15px ${cat?.color}4D, 0 0 15px ${cat?.color}80, 0 0 30px ${cat?.color}4D, 0 0 45px ${cat?.color}26;
            }
            50% {
              box-shadow: inset 0 0 20px ${cat?.color}66, 0 0 20px ${cat?.color}B3, 0 0 40px ${cat?.color}66, 0 0 60px ${cat?.color}33;
            }
          }
        `}</style>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: `0 ${S(16)}`, maxHeight: '42vh' }}>
        <div
          className="overflow-hidden relative"
          style={{
            background: catGradient, width: '100%', maxHeight: '42vh',
            borderRadius: S(16), padding: 4,
            border: showVipGlow ? `2px solid ${cat?.color}AA` : `3px solid ${cat?.color || '#1a3a5c'}`,
            ...(showVipGlow ? {
              animation: 'vipCardGlow 2s ease-in-out infinite',
            } : {}),
          }}
        >
          {fact.imageUrl && !imgFailed ? (
            <>
              <img
                src={fact.imageUrl}
                alt={fact.question}
                onClick={() => isCorrect && setShowLightbox(true)}
                style={{ objectFit: 'cover', width: '100%', maxHeight: 'calc(42vh - 14px)', display: 'block', borderRadius: S(12), cursor: isCorrect ? 'pointer' : 'default' }}
                onError={() => setImgFailed(true)}
              />
              {isCorrect && (
                <button
                  onClick={() => setShowLightbox(true)}
                  style={{
                    position: 'absolute', top: S(8), right: S(8), zIndex: 10,
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.5)', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontSize: 14,
                  }}
                >🔍</button>
              )}
            </>
          ) : (
            <div style={{ width: '100%', height: 'calc(42vh - 14px)', borderRadius: S(12), overflow: 'hidden' }}>
              <FallbackImage categoryColor={cat?.color || '#1a3a5c'} />
            </div>
          )}

        </div>
      </div>

      {/* Zone info — flex: 1, gap 8px uniforme */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: `0 ${S(16)}`, display: 'flex', flexDirection: 'column', gap: S(8) }}>
        {/* Social proof */}
        {flipped && !isDuel && isCorrect && (
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: S(14), fontWeight: 800, color: '#ffffff', opacity: 0.8, display: 'block', textShadow: '0 1px 3px rgba(0,0,0,0.3)', lineHeight: 1.3 }}>
              👥 Seulement {successRate}% des joueurs<br />ont trouvé ce f*ct
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

        {/* Encadré explication */}
        {!isDuel && isCorrect && (
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
              <div style={{ fontSize: S(12), fontWeight: 700, color: 'white' }}>{correctAnswerText}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: S(4), marginBottom: S(3), flexShrink: 0 }}>
              <span style={{ fontSize: S(12) }}>🧠</span>
              <span style={{ color: 'white', fontWeight: 900, fontSize: S(9), textTransform: 'uppercase', letterSpacing: '0.05em' }}>Le saviez-vous ?</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: S(12), lineHeight: 1.4, fontWeight: 500, margin: 0, overflow: 'hidden' }}>{fact.explanation}</p>
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
          <>
            <div style={{ display: 'flex', gap: S(8), height: S(44), position: 'relative' }}>
              <button
                onClick={handleNativeShare}
                className="btn-press active:scale-95 transition-all"
                style={{
                  flex: 1, height: '100%', borderRadius: S(14), fontWeight: 900, fontSize: S(12),
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(4),
                  background: `linear-gradient(135deg, ${cat?.color || '#FF6B1A'} 0%, ${cat?.color || '#FF6B1A'}cc 100%)`,
                  color: 'white', border: '2px solid rgba(255,255,255,0.4)',
                }}
              >
                🎩 Partager ce WTF!
              </button>
              <button
                ref={nextButtonRef}
                onClick={handleNext}
                className="btn-press active:scale-95 transition-all"
                style={{
                  flex: 1, height: '100%', borderRadius: S(14), fontWeight: 900, fontSize: S(12),
                  color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em',
                  border: '2px solid rgba(255,255,255,0.4)',
                  background: `linear-gradient(135deg, ${cat?.color || '#FF6B1A'}dd 0%, ${cat?.color || '#FF6B1A'}99 100%)`,
                }}
              >
                {isLast ? '🏁 RÉSULTATS' : 'SUIVANT →'}
              </button>
            </div>
            {/* Doigt animé en dessous du bouton SUIVANT/RÉSULTATS (pendant le tutoriel onboarding) */}
            {false && (
              <div style={{
                position: 'relative',
                height: S(40),
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'flex-start',
                pointerEvents: 'none',
              }}>
                <div style={{
                  position: 'absolute',
                  bottom: -S(26),
                  right: S(4),
                  fontSize: S(28),
                  animation: 'bounce 0.8s ease-in-out infinite',
                }}>👆</div>
              </div>
            )}
          </>
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


      {/* Lightbox image — bonne réponse uniquement */}
      {showLightbox && fact.imageUrl && (
        <div
          onClick={() => setShowLightbox(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <button
            onClick={() => setShowLightbox(false)}
            style={{
              position: 'absolute', top: 16, right: 16, zIndex: 10,
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)', border: 'none',
              color: 'white', fontSize: 18, fontWeight: 900,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >✕</button>
          <img
            src={fact.imageUrl}
            alt={fact.question}
            onClick={e => e.stopPropagation()}
            style={{
              width: '95%', maxHeight: '80vh', objectFit: 'contain',
              borderRadius: 12,
              animation: 'lightboxZoom 0.2s ease-out',
            }}
          />
          <style>{`
            @keyframes lightboxZoom {
              from { transform: scale(0.8); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      )}
      </div>
    </div>
  )
}
