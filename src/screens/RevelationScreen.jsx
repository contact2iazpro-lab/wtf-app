import { useState, useEffect, useRef } from 'react'
import SettingsModal from '../components/SettingsModal'
import CoinsIcon from '../components/CoinsIcon'
import { getCategoryById } from '../data/facts'
import { audio } from '../utils/audio'

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
}) {
  const S = (px) => `calc(${px}px * var(--scale))`

  const [flipped, setFlipped] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const [displayedScore, setDisplayedScore] = useState(sessionScore - pointsEarned)
  const [showScorePulse, setShowScorePulse] = useState(false)
  const [showBadge, setShowBadge] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)

  // Messages aléatoires calculés une seule fois au montage
  const [wrongMsg]   = useState(() => WRONG_MESSAGES[Math.floor(Math.random() * WRONG_MESSAGES.length)])
  const [correctMsg] = useState(() => CORRECT_MESSAGES[Math.floor(Math.random() * CORRECT_MESSAGES.length)])

  const scoreRefTarget = useRef(null)
  const pointsBadgeRef = useRef(null)
  const [animation, setAnimation] = useState(null)

  const cat = getCategoryById(fact.category)
  const isDuel = !!duelContext
  const isLast = factIndex + 1 >= totalFacts
  const successRate = 15 + (fact.id % 40)

  // COR 7 — Gradient catégorie identique dans les deux cas
  const catGradient = cat
    ? `linear-gradient(160deg, ${cat.color}22 0%, ${cat.color} 100%)`
    : 'linear-gradient(160deg, #1a3a5c22 0%, #1a3a5c 100%)'

  useEffect(() => {
    const timer = setTimeout(() => {
      setFlipped(true)
      if (!isDuel && isCorrect) setShowBadge(true)
    }, 300)
    if (!isDuel) {
      if (isCorrect) {
        setTimeout(() => audio.playFile('What the fact.mp3'), 350)
        setTimeout(() => audio.playFile('Coins points.mp3'), 600)
      } else {
      }
    }
    return () => clearTimeout(timer)
  }, [isCorrect, isDuel])

  useEffect(() => {
    if (!isDuel && flipped && pointsBadgeRef.current && scoreRefTarget.current) {
      const badgeRect = pointsBadgeRef.current.getBoundingClientRect()
      const scoreRect = scoreRefTarget.current.getBoundingClientRect()
      const offsetX = scoreRect.left - badgeRect.left
      const offsetY = scoreRect.top - badgeRect.top

      setAnimation({ offsetX, offsetY, duration: 2.5 })

      const scoreTimer = setTimeout(() => {
        setDisplayedScore((prev) => prev + pointsEarned)
        setShowScorePulse(true)
        setShowBadge(false)
        const pulseTimer = setTimeout(() => setShowScorePulse(false), 600)
        return () => clearTimeout(pulseTimer)
      }, 2.5 * 1000)

      return () => clearTimeout(scoreTimer)
    }
  }, [flipped, isDuel, pointsEarned])

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
    console.log('[Share] Message partagé :', shareMessage)
    if (navigator.share) {
      navigator.share({ text: shareMessage })
    }
  }

  const isLastPlayer = isDuel && duelContext.isLastPlayer
  const playerColor = isDuel ? (['#3B82F6', '#FF5C1A', '#22C55E', '#A855F7', '#EAB308', '#EC4899'][duelContext.currentPlayerIndex] ?? '#FF5C1A') : null
  const isOpenMode = selectedAnswer === 100 || selectedAnswer === -2
  const isTimeout = selectedAnswer === -1

  const selectedAnswerText = selectedAnswer >= 0 ? fact.options[selectedAnswer] : 'Pas de réponse'
  const correctAnswerText = fact.options[fact.correctIndex]

  const screenBg = cat
    ? `linear-gradient(160deg, ${cat.color}22 0%, ${cat.color} 100%)`
    : 'linear-gradient(160deg, #1a3a5c22 0%, #1a3a5c 100%)'

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
          <button onClick={onQuit} className="flex-1 py-4 rounded-2xl font-black text-base"
            style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid #F44336', color: '#DC2626' }}>
            Quitter
          </button>
        </div>
      </div>
    </div>
  )

  // ── Header 3 zones — COR 6: "coins" text ─────────────────────────────────
  const header = (
    <div className="px-4 pt-3 pb-2 shrink-0 flex items-center">
      <div className="w-1/3 flex flex-col">
        <button onClick={() => setShowQuitConfirm(true)} className="text-left">
          <span className="font-black text-sm" style={{ color: cat?.color || 'rgba(255,255,255,0.7)' }}>
            #{fact.id} · {factIndex + 1}/{totalFacts}
          </span>
        </button>
        {isDuel && playerColor && (
          <span className="mt-0.5 px-2 py-0.5 rounded-full text-xs font-black self-start" style={{ background: playerColor + '20', color: playerColor }}>
            {duelContext.playerName}
          </span>
        )}
      </div>
      <div className="w-1/3 flex items-center justify-center gap-1.5 min-w-0">
        {cat && <span className="text-lg shrink-0">{cat.emoji}</span>}
        <span className="font-black text-sm tracking-wide truncate" style={{ color: cat?.color || 'rgba(255,255,255,0.7)' }}>
          {cat?.label || ''}
        </span>
      </div>
      <div className="w-1/3 flex justify-end">
        <span ref={scoreRefTarget} className={`font-black text-sm flex items-center gap-1${showScorePulse ? ' score-pulse' : ''}`}
          style={{ color: cat?.color || '#FFA500' }}>
          <CoinsIcon size={14} />{displayedScore}
        </span>
      </div>
    </div>
  )

  // ── ⚙️ fixe bas-droite ──────────────────────────────────────────────────
  const settingsBtn = (
    <button
      onClick={() => { audio.play('click'); setShowSettings(true) }}
      className="fixed bottom-4 right-4 z-20 w-10 h-10 rounded-full flex items-center justify-center"
      style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)', boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
      ⚙️
    </button>
  )

  // ── Badge de points flottant ──────────────────────────────────────────────
  const floatingBadge = !isDuel && showBadge && (
    <div ref={pointsBadgeRef} className="fixed pointer-events-none" style={{
      left: '50%', top: '50%', width: '180px',
      transform: animation
        ? `translateX(calc(-50% + ${animation.offsetX}px)) translateY(calc(-50% + ${animation.offsetY}px)) scale(0)`
        : 'translateX(-50%) translateY(-50%) scale(1)',
      zIndex: 50,
      background: `linear-gradient(135deg, ${cat?.color}50 0%, ${cat?.color}30 100%)`,
      border: `3px solid ${cat?.color}`, borderRadius: '20px', color: cat?.color,
      padding: '16px', textAlign: 'center', fontSize: '44px', fontWeight: 900,
      textShadow: `0 4px 12px ${cat?.color}60`, boxShadow: `0 12px 32px ${cat?.color}40`,
      opacity: animation ? 0 : 1,
      transition: animation ? `all 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)` : 'none',
    }}>
      +{pointsEarned} pts
    </div>
  )

  // ── COR 1 : Message succès — overlay bas ~25% du cadre image ────────────────
  const bottomMessageStrip = (msg) => flipped && !isDuel && (
    <div
      className="absolute bottom-0 left-0 right-0 flex items-center pointer-events-none"
      style={{ zIndex: 4, minHeight: '25%', background: 'rgba(0,0,0,0.6)', padding: '10px 14px' }}>
      <span style={{ fontSize: '12px', fontWeight: 700, color: 'white', lineHeight: 1.45, display: 'block' }}>
        {msg}
      </span>
    </div>
  )

  // ── CAS MAUVAISE RÉPONSE (solo) ───────────────────────────────────────────
  if (!isCorrect && !isDuel) {
    const handleNextWrong = () => {
      audio.stopAll?.()
      audio.play('click')
      onNext()
    }
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
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexShrink: 0, padding: `${S(8)} ${S(12)}` }}>
          <button
            onClick={() => setShowQuitConfirm(true)}
            style={{ width: S(36), height: S(36), borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <span style={{ fontSize: S(16), color: 'white', fontWeight: 900, lineHeight: 1, cursor: 'pointer' }}>✕</span>
          </button>
          <div style={{ flex: 1, minWidth: 0, padding: `0 ${S(8)}` }}>
            <span style={{
              fontWeight: 900, fontSize: S(13), color: 'rgba(255,255,255,0.8)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block',
            }}>
              {cat?.label || 'Question'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexShrink: 0, userSelect: 'none' }}>
            <img src="/assets/ui/icon-coins.png" style={{ width: S(20), height: S(20), marginRight: S(4) }} alt="" />
            <span ref={scoreRefTarget} style={{ fontWeight: 700, color: 'white', fontSize: S(13) }}>
              {displayedScore}
            </span>
          </div>
          <button
            onClick={() => { audio.play('click'); setShowSettings(true) }}
            style={{ width: S(36), height: S(36), borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: S(8) }}
          >
            <img src="/assets/ui/icon-settings.png" style={{ width: S(20), height: S(20) }} alt="" />
          </button>
        </div>

        {/* Image floutée + tampon — flex: 1 */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: `0 ${S(16)}`, minHeight: 0 }}>
          <div
            className="rounded-3xl overflow-hidden border relative"
            style={{ borderColor: 'rgba(255,255,255,0.15)', background: catGradient, maxHeight: '100%', maxWidth: '100%', aspectRatio: '1/1' }}
          >
            {fact.imageUrl && !imgFailed ? (
              <img
                src={fact.imageUrl}
                alt={fact.question}
                style={{ objectFit: 'contain', maxHeight: '100%', maxWidth: '100%', width: '100%', height: '100%', filter: 'blur(12px) brightness(0.5)' }}
                onError={() => setImgFailed(true)}
              />
            ) : (
              <img
                src="/assets/facts/fallback.svg"
                alt="Fallback"
                style={{ objectFit: 'contain', maxHeight: '100%', maxWidth: '100%', width: '100%', height: '100%', filter: 'blur(8px) brightness(0.5)' }}
              />
            )}
            {/* Overlay */}
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.25)', zIndex: 1 }} />
            {/* Tampon PAS CETTE FOIS */}
            {flipped && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 10 }}>
                <div style={{
                  fontSize: S(28), fontWeight: 900, color: '#F44336',
                  textShadow: '0 3px 8px rgba(244, 67, 54, 0.5)',
                  transform: 'rotate(-12deg)',
                  border: '3px solid #F44336', borderRadius: S(8), padding: `${S(8)} ${S(16)}`,
                  backgroundColor: 'rgba(244, 67, 54, 0.1)', backdropFilter: 'blur(4px)',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  Pas cette fois
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Zone info — flexShrink: 0 */}
        <div style={{ flexShrink: 0, padding: `${S(6)} ${S(16)} 0`, display: 'flex', flexDirection: 'column', gap: S(4) }}>
          {/* Message d'échec + social proof */}
          {flipped && (
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: S(12), fontWeight: 700, color: 'white', lineHeight: 1.4, display: 'block' }}>
                {wrongMsg}
              </span>
              <span style={{ fontSize: S(10), fontWeight: 700, color: 'rgba(255,255,255,0.6)', display: 'block', marginTop: S(2) }}>
                👥 {100 - successRate}% des joueurs ont trouvé ce f*ct
              </span>
            </div>
          )}

          {/* Encadré question (pas la réponse) */}
          <div style={{
            background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: S(16), padding: `${S(10)} ${S(12)}`,
          }}>
            <div style={{ fontSize: S(9), fontWeight: 900, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: S(4) }}>La question :</div>
            <div style={{ fontSize: S(12), fontWeight: 700, color: 'white', lineHeight: 1.3 }}>{fact.question}</div>
            {isTimeout && (
              <div style={{ marginTop: S(6), fontSize: S(10), fontWeight: 700, color: '#FB923C' }}>⏱️ Temps écoulé</div>
            )}
          </div>
        </div>

        {/* Boutons — flexShrink: 0 */}
        <div style={{ flexShrink: 0, padding: `${S(8)} ${S(16)} ${S(12)}`, display: 'flex', gap: S(8) }}>
          <button
            onClick={handleNativeShare}
            className="btn-press active:scale-95 transition-all"
            style={{
              flex: 1, padding: `${S(12)} 0`, borderRadius: S(14), fontWeight: 900, fontSize: S(11),
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(4),
              background: `linear-gradient(135deg, ${cat?.color || '#FF6B1A'} 0%, ${cat?.color || '#FF6B1A'}cc 100%)`,
              color: 'white', border: 'none',
            }}
          >
            🤝 Demander de l'aide
          </button>
          <button
            onClick={handleNextWrong}
            className="btn-press active:scale-95 transition-all"
            style={{
              flex: 1, padding: `${S(12)} 0`, borderRadius: S(14), fontWeight: 900, fontSize: S(12),
              color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', border: 'none',
              background: `linear-gradient(135deg, ${cat?.color || '#FF6B1A'}dd 0%, ${cat?.color || '#FF6B1A'}99 100%)`,
            }}
          >
            SUIVANT →
          </button>
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
      {floatingBadge}

      {/* Header — flexShrink: 0 */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexShrink: 0, padding: `${S(8)} ${S(12)}` }}>
        <button
          onClick={() => setShowQuitConfirm(true)}
          style={{ width: S(36), height: S(36), borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <span style={{ fontSize: S(16), color: 'white', fontWeight: 900, lineHeight: 1, cursor: 'pointer' }}>✕</span>
        </button>
        <div style={{ flex: 1, minWidth: 0, padding: `0 ${S(8)}` }}>
          <span style={{
            fontWeight: 900, fontSize: S(13), color: 'rgba(255,255,255,0.8)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block',
          }}>
            {cat?.label || 'Question'}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexShrink: 0, userSelect: 'none' }}>
          <img src="/assets/ui/icon-coins.png" style={{ width: S(20), height: S(20), marginRight: S(4) }} alt="" />
          <span
            ref={scoreRefTarget}
            className={showScorePulse ? 'score-pulse' : ''}
            style={{ fontWeight: 700, color: 'white', fontSize: S(13) }}
          >
            {displayedScore}
          </span>
        </div>
        <button
          onClick={() => { audio.play('click'); setShowSettings(true) }}
          style={{ width: S(36), height: S(36), borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: S(8) }}
        >
          <img src="/assets/ui/icon-settings.png" style={{ width: S(20), height: S(20) }} alt="" />
        </button>
      </div>

      {/* Image + tampon — flex: 1 */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: `0 ${S(16)}`, minHeight: 0 }}>
        <div
          className={`rounded-3xl overflow-hidden border relative${!isDuel && flipped && isCorrect ? ' wow-shine wow-glow' : ''}`}
          style={{ borderColor: 'rgba(255,255,255,0.2)', background: catGradient, maxHeight: '100%', maxWidth: '100%', aspectRatio: '1/1' }}
        >
          {isCorrect && (
            fact.imageUrl && !imgFailed ? (
              <img
                src={fact.imageUrl}
                alt={fact.question}
                style={{ objectFit: 'contain', maxHeight: '100%', maxWidth: '100%', width: '100%', height: '100%' }}
                onError={() => setImgFailed(true)}
              />
            ) : (
              <img
                src="/assets/facts/fallback.svg"
                alt="Fallback"
                style={{ objectFit: 'contain', maxHeight: '100%', maxWidth: '100%', width: '100%', height: '100%' }}
              />
            )
          )}
          {!isDuel && flipped && isCorrect && (
            <div className="absolute inset-0 flex items-end justify-end pointer-events-none" style={{ padding: S(12), zIndex: 10 }}>
              <div style={{
                fontSize: S(60), fontWeight: 900, color: '#4CAF50',
                textShadow: '0 3px 8px rgba(76, 175, 80, 0.5)',
                transform: 'rotate(-15deg) scale(1.1)', transformOrigin: 'right bottom',
                border: '3px solid #4CAF50', borderRadius: S(6), padding: `${S(6)} ${S(14)}`,
                backgroundColor: 'rgba(76, 175, 80, 0.1)', backdropFilter: 'blur(4px)',
              }}>
                FOU
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Zone info — flexShrink: 0, no scroll */}
      <div style={{ flexShrink: 0, padding: `${S(6)} ${S(16)} 0`, display: 'flex', flexDirection: 'column', gap: S(4) }}>
        {/* Message de succès + social proof */}
        {flipped && !isDuel && isCorrect && (
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: S(12), fontWeight: 700, color: 'white', lineHeight: 1.4, display: 'block' }}>
              {correctMsg}
            </span>
            <span style={{ fontSize: S(10), fontWeight: 700, color: 'rgba(255,255,255,0.6)', display: 'block', marginTop: S(2) }}>
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

        {/* Encadré explication */}
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
              <div style={{ fontSize: S(9), fontWeight: 900, color: '#4CAF50', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: S(2) }}>✓ Bonne réponse :</div>
              <div style={{ fontSize: S(12), fontWeight: 700, color: 'white' }}>{correctAnswerText}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: S(4), marginBottom: S(4) }}>
              <span style={{ fontSize: S(14) }}>🧠</span>
              <span style={{ color: 'white', fontWeight: 900, fontSize: S(10), textTransform: 'uppercase', letterSpacing: '0.05em' }}>Le saviez-vous ?</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: S(11), lineHeight: 1.4, fontWeight: 500, margin: 0 }}>{fact.explanation}</p>
            {fact.sourceUrl && (
              <a href={fact.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: S(9), color: 'rgba(255,255,255,0.4)', display: 'block', marginTop: S(4), textDecoration: 'underline', textAlign: 'right' }}>
                Source
              </a>
            )}
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

      {/* Boutons — flexShrink: 0 */}
      <div style={{ flexShrink: 0, padding: `${S(8)} ${S(16)} ${S(12)}` }}>
        {!isDuel && isCorrect && (
          <div style={{ display: 'flex', gap: S(8) }}>
            <button
              onClick={handleNativeShare}
              className="btn-press active:scale-95 transition-all"
              style={{
                flex: 1, padding: `${S(12)} 0`, borderRadius: S(14), fontWeight: 900, fontSize: S(12),
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(4),
                background: `linear-gradient(135deg, ${cat?.color || '#FF6B1A'} 0%, ${cat?.color || '#FF6B1A'}cc 100%)`,
                color: 'white', border: 'none',
              }}
            >
              🎩 Partager ce WTF!
            </button>
            <button
              onClick={() => { audio.play('click'); onNext() }}
              className="btn-press active:scale-95 transition-all"
              style={{
                flex: 1, padding: `${S(12)} 0`, borderRadius: S(14), fontWeight: 900, fontSize: S(12),
                color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', border: 'none',
                background: `linear-gradient(135deg, ${cat?.color || '#FF6B1A'}dd 0%, ${cat?.color || '#FF6B1A'}99 100%)`,
              }}
            >
              SUIVANT →
            </button>
          </div>
        )}

        {isDuel && (
          <button
            onClick={() => { audio.play('click'); onNext() }}
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
