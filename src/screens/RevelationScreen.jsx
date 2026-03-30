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
  "Tu l'auras la prochaine fois ! 💪",
  "Retente ta chance... ce f*ct mérite d'être connu !",
  "Même les experts se trompent sur celui-là 😅",
  "Même Einstein aurait séché sur celui-là ! 🧠",
  "Ce f*ct est tellement WTF! qu'on comprend que tu aies raté ! 😂",
  "Pas grave, maintenant tu sais ! 🎓",
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
  "Magnifique ! Tu aurais fait un excellent WTF! Addict 🌟",
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
        setTimeout(() => audio.playFile('Stamp Refusal.mp3'), 350)
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
    return (
      <div className="relative flex flex-col h-full w-full screen-enter overflow-hidden" style={{ background: screenBg }}>
        {quitModal}
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        {settingsBtn}
        {header}

        <div className="flex-1 min-h-0 flex flex-col px-5 gap-2 overflow-hidden">

          {/* COR 2+7 — Cadre carré identique, fond catégorie, tampon centré */}
          <div
            className="rounded-3xl overflow-hidden border shrink-0 relative"
            style={{ borderColor: cat?.color + '60', aspectRatio: '1/1', background: catGradient }}>

            {/* COR 1+2 — Tampon + message bienveillant empilés, centrés verticalement */}
            {flipped && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                style={{ zIndex: 3, gap: '14px' }}>
                {/* Tampon "PAS CETTE FOIS" — COR 4 : fond blanc semi-transparent pour lisibilité */}
                <div className="stamp-wow" style={{
                  fontSize: '36px', fontWeight: 900, color: '#F44336',
                  textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                  transform: 'rotate(-8deg)',
                  border: '4px solid #F44336', borderRadius: '10px',
                  padding: '14px 28px', textAlign: 'center', lineHeight: 1.15,
                  background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(6px)',
                }}>
                  PAS CETTE<br/>FOIS
                </div>
                {/* Message bienveillant centré sous le tampon */}
                <div style={{
                  background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(6px)',
                  borderRadius: '14px', padding: '7px 14px', maxWidth: '82%', textAlign: 'center',
                }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'white', lineHeight: 1.4, display: 'block' }}>
                    {wrongMsg}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* COR 3 — Stats joueurs sous l'image */}
          <div className="text-center py-1 shrink-0">
            <span className="text-xs font-bold" style={{ color: cat?.color || '#FF6B1A' }}>
              👥 {100 - successRate}% des joueurs ont trouvé ce f*ct
            </span>
          </div>

          {/* Question */}
          <div className="rounded-2xl p-3 border shrink-0" style={{ background: cat?.color + '15', borderColor: cat?.color + '40' }}>
            <div className="text-white/60 text-xs font-semibold mb-1">La question :</div>
            <div className="text-white font-bold text-sm leading-snug">{fact.question}</div>
          </div>

          {/* Mauvaise réponse */}
          {!isOpenMode && !isTimeout && selectedAnswer >= 0 && (
            <div className="rounded-2xl p-3 border border-red-500/40 shrink-0" style={{ background: 'rgba(244, 67, 54, 0.1)' }}>
              <div className="text-red-400 text-xs font-bold uppercase tracking-wide mb-1">✗ Votre réponse :</div>
              <div className="text-white font-bold text-sm">{selectedAnswerText}</div>
            </div>
          )}
          {isTimeout && (
            <div className="rounded-2xl p-3 border border-orange-500/40 shrink-0" style={{ background: 'rgba(255, 152, 0, 0.1)' }}>
              <div className="text-orange-400 text-xs font-bold uppercase tracking-wide">⏱️ Temps écoulé</div>
            </div>
          )}
        </div>

        {/* COR 5 — Boutons bas : "Partager à un ami" + Suivant */}
        <div className="px-5 pb-6 pt-2 flex gap-3 shrink-0">
          <button
            onClick={handleShare}
            className="btn-press flex-1 py-4 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all text-center leading-tight"
            style={{ background: 'white', borderColor: cat?.color || '#FF6B1A', color: cat?.color || '#FF6B1A' }}>
            🤝 Partager à un ami pour avoir de l'aide
          </button>
          <button
            onClick={() => { audio.play('click'); onNext() }}
            className="btn-press flex-1 py-4 rounded-2xl text-white font-black text-sm uppercase tracking-wide active:scale-95 transition-all"
            style={nextBtnStyle}>
            {nextLabel}
          </button>
        </div>
      </div>
    )
  }

  // ── CAS BONNE RÉPONSE (et duel) ───────────────────────────────────────────
  return (
    <div className="relative flex flex-col h-full w-full screen-enter overflow-hidden" style={{ background: screenBg }}>
      {quitModal}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {settingsBtn}
      {floatingBadge}
      {header}

      <div className="flex-1 overflow-y-auto scrollbar-hide">
      <div className="flex flex-col px-5 gap-2 pb-4 pt-1">

        {/* COR 1+7 — Cadre carré identique, même fond catégorie, message en haut du cadre */}
        <div
          className={`rounded-3xl overflow-hidden border shrink-0 relative${!isDuel && flipped && isCorrect ? ' wow-shine wow-glow' : ''}`}
          style={{ borderColor: cat?.color + '60', aspectRatio: '16/9', background: catGradient }}>

          {isCorrect && (
            fact.imageUrl && !imgFailed ? (
              <img
                src={fact.imageUrl}
                alt={fact.question}
                className={`w-full h-full object-cover${!isDuel ? ' wow-image' : ''}`}
                style={!isDuel ? { animationDelay: '0.1s', opacity: 0 } : {}}
                onError={() => setImgFailed(true)}
              />
            ) : (
              <FallbackImage categoryColor={cat?.color || '#10B981'} />
            )
          )}

          {/* Tampon FOU — bas droite */}
          {!isDuel && flipped && isCorrect && (
            <div className="absolute inset-0 flex items-end justify-end pointer-events-none" style={{ padding: '24px', zIndex: 2 }}>
              <div className="stamp-wow" style={{
                fontSize: '94px', fontWeight: 900, color: '#4CAF50',
                textShadow: '0 4px 12px rgba(76, 175, 80, 0.5)',
                transform: 'rotate(-15deg) scale(1.1)', transformOrigin: 'right bottom',
                border: '4px solid #4CAF50', borderRadius: '8px', padding: '12px 24px',
                backgroundColor: 'rgba(76, 175, 80, 0.1)', backdropFilter: 'blur(4px)',
              }}>
                FOU
              </div>
            </div>
          )}

          {/* COR 1 — Message succès en bas du cadre image */}
          {bottomMessageStrip(correctMsg)}
        </div>

        {/* COR 3 — Stats joueurs sous l'image */}
        {!isDuel && (
          <div className="text-center py-1 shrink-0">
            <span className="text-xs font-bold" style={{ color: cat?.color || '#FF6B1A' }}>
              👥 Seulement {successRate}% des joueurs ont trouvé ce f*ct
            </span>
          </div>
        )}

        {/* Duel — badges correct/incorrect + points */}
        {isDuel && (
          <>
            <div className="py-3 rounded-2xl text-center border-2 font-black text-base score-pop"
              style={{
                background: isCorrect ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                borderColor: isCorrect ? '#4CAF50' : '#F44336',
                color: isCorrect ? '#4CAF50' : '#F44336',
                animationDelay: '0.5s', opacity: 0,
              }}>
              {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </div>
            <div className="py-3 rounded-2xl text-center border-2 font-black text-base score-pop"
              style={{
                background: `linear-gradient(135deg, ${cat?.color}20 0%, ${cat?.color}10 100%)`,
                borderColor: cat?.color + '60', color: cat?.color,
                animationDelay: '0.6s', opacity: 0,
              }}>
              +{pointsEarned} pts
            </div>
          </>
        )}

        {/* Mauvaise réponse choisie (visible dans le duel, ou open mode) */}
        {!isOpenMode && !isTimeout && selectedAnswer >= 0 && selectedAnswerText !== correctAnswerText && (
          <div className="rounded-2xl p-3 border border-red-500/40" style={{ background: 'rgba(244, 67, 54, 0.1)' }}>
            <div className="text-red-500 text-xs font-bold uppercase tracking-wide mb-1">✗ Votre réponse :</div>
            <div className="text-white font-bold text-sm">{selectedAnswerText}</div>
          </div>
        )}
        {isOpenMode && (
          <div className="rounded-2xl p-3 border border-green-500/40" style={{ background: 'rgba(76, 175, 80, 0.1)' }}>
            <div className="text-green-500 text-xs font-bold uppercase tracking-wide mb-1">✓ Réponse :</div>
            <div className="text-white font-bold text-sm">{correctAnswerText}</div>
          </div>
        )}
        {isTimeout && (
          <div className="rounded-2xl p-3 border border-orange-500/40" style={{ background: 'rgba(255, 152, 0, 0.1)' }}>
            <div className="text-orange-500 text-xs font-bold uppercase tracking-wide">⏱️ Temps écoulé</div>
          </div>
        )}

        {/* COR 3+4 — Le Saviez-Vous : "bonne réponse" intégrée dans la carte, Partager orange */}
        {!isDuel && isCorrect && (
          <div className="rounded-3xl border p-4" style={{
            background: cat ? `linear-gradient(135deg, ${cat.color}18 0%, ${cat.color}06 100%)` : 'rgba(0,0,0,0.35)',
            borderColor: cat?.color + '70', backdropFilter: 'blur(12px)',
            boxShadow: `0 4px 32px ${cat?.color || '#000'}25`,
          }}>
            {/* COR 3 — Bonne réponse visible immédiatement (pas d'opacity:0 qui crée un espace vide) */}
            {!isOpenMode && !isTimeout && (
              <div className="rounded-xl px-3 py-2 border border-green-500/30 mb-3 score-pop"
                style={{ background: 'rgba(76,175,80,0.1)' }}>
                <div className="text-green-400 text-xs font-bold uppercase tracking-wide mb-0.5">✓ Bonne réponse :</div>
                <div className="text-white font-bold text-sm">{correctAnswerText}</div>
              </div>
            )}

            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🧠</span>
              <span className="text-white font-black text-sm uppercase tracking-wide">Le saviez-vous ?</span>
            </div>
            <p className="text-white/80 text-sm leading-relaxed font-medium mb-3">{fact.explanation}</p>

            {/* Source */}
            {fact.sourceUrl && (
              <div className="flex justify-end mb-2">
                <a href={fact.sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold"
                  style={{ color: cat?.color + 'cc' }}>
                  <span>🔗</span>
                  <span className="underline underline-offset-2 truncate max-w-[180px]">
                    {fact.sourceUrl.replace(/^https?:\/\//, '').split('/')[0]}
                  </span>
                </a>
              </div>
            )}

            {/* COR 4 — Partager orange fixe + Suivant */}
            <div className="flex gap-2">
              <button
                onClick={handleShare}
                className="btn-press flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                style={{
                  background: 'linear-gradient(135deg, #FF6B1A 0%, #D94A10 100%)',
                  color: 'white',
                  boxShadow: '0 4px 20px rgba(255,107,26,0.45)',
                }}>
                {copied ? '✅ Copié !' : '🎩 Partager ce WTF!'}
              </button>
              <button
                onClick={() => { audio.play('click'); onNext() }}
                className="btn-press flex-1 py-3 rounded-xl text-white font-black text-sm uppercase tracking-wide active:scale-95 transition-all"
                style={nextBtnStyle}>
                {nextLabel} →
              </button>
            </div>
          </div>
        )}

        {/* Duel — scores finaux */}
        {isDuel && isLastPlayer && (
          <div className="rounded-2xl border p-4" style={{ background: 'rgba(0,0,0,0.35)', borderColor: 'rgba(255,255,255,0.1)' }}>
            <div className="text-white/50 text-xs font-bold uppercase tracking-widest mb-3">Scores</div>
            <div className="flex flex-col gap-2">
              {[...duelContext.players]
                .map((p, i) => ({ ...p, color: ['#3B82F6', '#FF5C1A', '#22C55E', '#A855F7', '#EAB308', '#EC4899'][i] }))
                .sort((a, b) => b.score - a.score)
                .map((p, rank) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <span className="text-white/30 text-xs w-4">{rank + 1}.</span>
                    <span className="flex-1 text-white font-bold text-sm truncate">{p.name}</span>
                    <span className="font-black text-base" style={{ color: p.color }}>{p.score} pts</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Bouton Suivant duel */}
        {isDuel && (
          <button
            onClick={() => { audio.play('click'); onNext() }}
            className="btn-press w-full py-4 rounded-2xl text-white font-black text-base uppercase tracking-wide active:scale-95 transition-all"
            style={nextBtnStyle}>
            {nextLabel}
          </button>
        )}

      </div>
      </div>
    </div>
  )
}
