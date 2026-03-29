import { useState, useEffect, useRef } from 'react'
import SettingsModal from '../components/SettingsModal'
import { getCategoryById } from '../data/facts'
import { audio } from '../utils/audio'

// ── Fallback image — couleur dynamique par catégorie ─────────────────────────
const FallbackImage = ({ categoryColor }) => (
  <div style={{
    background: `linear-gradient(160deg, ${categoryColor}22 0%, ${categoryColor} 100%)`,
    width: '100%',
    aspectRatio: '16/9',
    borderRadius: '12px',
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

  const scoreRefTarget = useRef(null)
  const pointsBadgeRef = useRef(null)
  const [animation, setAnimation] = useState(null)

  const cat = getCategoryById(fact.category)
  const isDuel = !!duelContext
  const isLast = factIndex + 1 >= totalFacts

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

  // MOD 1 — Fond dégradé lumineux par catégorie
  const screenBg = cat
    ? `linear-gradient(160deg, ${cat.color}22 0%, ${cat.color} 100%)`
    : 'linear-gradient(160deg, #1a3a5c22 0%, #1a3a5c 100%)'

  // Next button label + style
  const nextLabel = isDuel
    ? !isLastPlayer
      ? `▶ Au tour de ${duelContext.players[duelContext.currentPlayerIndex + 1]?.name}`
      : isLast ? '🏆 Résultats' : '⚡ Question suivante'
    : isLast ? '🏁 Mes résultats' : '⚡ Suivant'

  const nextBtnStyle = {
    background: isDuel
      ? `linear-gradient(135deg, ${playerColor} 0%, ${playerColor}bb 100%)`
      : `linear-gradient(135deg, ${cat?.color} 0%, ${cat?.color}dd 100%)`,
    boxShadow: `0 8px 32px ${isDuel ? playerColor : cat?.color}40`,
  }

  // ── Quit confirmation modal ──────────────────────────────────────────────
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
          <button
            onClick={() => setShowQuitConfirm(false)}
            className="flex-1 py-4 rounded-2xl font-black text-base"
            style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151' }}>
            Annuler
          </button>
          <button
            onClick={onQuit}
            className="flex-1 py-4 rounded-2xl font-black text-base"
            style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid #F44336', color: '#DC2626' }}>
            Quitter
          </button>
        </div>
      </div>
    </div>
  )

  // MOD 2 — Header 3 zones identique à QuestionScreen
  const header = (
    <div className="px-4 pt-4 pb-2 shrink-0 flex items-center">
      {/* Left (w-1/3): #id · X/total — tappable → quit */}
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

      {/* Center (w-1/3): emoji + catégorie */}
      <div className="w-1/3 flex items-center justify-center gap-1.5 min-w-0">
        {cat && <span className="text-lg shrink-0">{cat.emoji}</span>}
        <span className="font-black text-sm tracking-wide truncate" style={{ color: cat?.color || 'rgba(255,255,255,0.7)' }}>
          {cat?.label || ''}
        </span>
      </div>

      {/* Right (w-1/3): ⭐ coins */}
      <div className="w-1/3 flex justify-end">
        <span
          ref={scoreRefTarget}
          className={`font-black text-sm${showScorePulse ? ' score-pulse' : ''}`}
          style={{ color: cat?.color || '#FFA500' }}>
          ⭐ {displayedScore}
        </span>
      </div>
    </div>
  )

  // ── Badge de points flottant vers le score ────────────────────────────────
  const floatingBadge = !isDuel && showBadge && (
    <div
      ref={pointsBadgeRef}
      className="fixed pointer-events-none"
      style={{
        left: '50%',
        top: '50%',
        width: '180px',
        transform: animation
          ? `translateX(calc(-50% + ${animation.offsetX}px)) translateY(calc(-50% + ${animation.offsetY}px)) scale(0)`
          : 'translateX(-50%) translateY(-50%) scale(1)',
        zIndex: 50,
        background: `linear-gradient(135deg, ${cat?.color}50 0%, ${cat?.color}30 100%)`,
        border: `3px solid ${cat?.color}`,
        borderRadius: '20px',
        color: cat?.color,
        padding: '16px',
        textAlign: 'center',
        fontSize: '44px',
        fontWeight: 900,
        textShadow: `0 4px 12px ${cat?.color}60`,
        boxShadow: `0 12px 32px ${cat?.color}40`,
        opacity: animation ? 0 : 1,
        transition: animation ? `all 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)` : 'none',
      }}>
      +{pointsEarned} pts
    </div>
  )

  // ── MOD 5 — CAS MAUVAISE RÉPONSE (solo) : full screen fixe ───────────────
  if (!isCorrect && !isDuel) {
    return (
      <div className="relative flex flex-col h-full w-full screen-enter overflow-hidden" style={{ background: screenBg }}>
        {quitModal}
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        {header}

        {/* Contenu principal — flexible, pas de scroll */}
        <div className="flex-1 min-h-0 flex flex-col px-5 gap-3 overflow-hidden">
          {/* Image block — animation WTF! avec tampon FAUX */}
          <div
            className="rounded-3xl overflow-hidden border shrink-0 relative"
            style={{
              borderColor: cat?.color + '60',
              aspectRatio: '16 / 9',
              background: '#111',
            }}>
            {flipped && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  style={{
                    position: 'relative',
                    width: '120px',
                    height: '120px',
                    animation: 'wrong-answer-zoom 0.6s ease-out forwards, wrong-answer-desaturate 3.432s ease-out 0.05s forwards',
                  }}>
                  <img
                    src="/logo-wtf.png"
                    alt="WTF!"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="95" fill="none" stroke="#F44336" strokeWidth="8" />
                    <line x1="50" y1="50" x2="150" y2="150" stroke="#F44336" strokeWidth="12" strokeLinecap="round" />
                    <line x1="150" y1="50" x2="50" y2="150" stroke="#F44336" strokeWidth="12" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            )}
            {/* Tampon FAUX */}
            {flipped && (
              <div className="absolute inset-0 flex items-end justify-end pointer-events-none" style={{ padding: '12px' }}>
                <div
                  className="stamp-wow"
                  style={{
                    fontSize: '52px',
                    fontWeight: 900,
                    color: '#F44336',
                    textShadow: '0 4px 12px rgba(244, 67, 54, 0.5)',
                    transform: 'rotate(-15deg) scale(1.1)',
                    transformOrigin: 'right bottom',
                    border: '3px solid #F44336',
                    borderRadius: '8px',
                    padding: '6px 16px',
                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                    backdropFilter: 'blur(4px)',
                  }}>
                  FAUX
                </div>
              </div>
            )}
          </div>

          {/* Question */}
          <div className="rounded-2xl p-4 border shrink-0" style={{ background: cat?.color + '15', borderColor: cat?.color + '40' }}>
            <div className="text-white/60 text-xs font-semibold mb-1">La question :</div>
            <div className="text-white font-bold text-sm leading-snug">{fact.question}</div>
          </div>

          {/* Mauvaise réponse affichée */}
          {!isOpenMode && !isTimeout && selectedAnswer >= 0 && (
            <div className="rounded-2xl p-4 border border-red-500/40 shrink-0" style={{ background: 'rgba(244, 67, 54, 0.1)' }}>
              <div className="text-red-400 text-xs font-bold uppercase tracking-wide mb-1">✗ Votre réponse :</div>
              <div className="text-white font-bold text-sm">{selectedAnswerText}</div>
            </div>
          )}
          {isTimeout && (
            <div className="rounded-2xl p-4 border border-orange-500/40 shrink-0" style={{ background: 'rgba(255, 152, 0, 0.1)' }}>
              <div className="text-orange-400 text-xs font-bold uppercase tracking-wide">⏱️ Temps écoulé</div>
            </div>
          )}
        </div>

        {/* MOD 5 — Boutons bas, visibles sans scroll */}
        <div className="px-5 pb-6 pt-3 flex flex-col gap-3 shrink-0">
          <div className="flex justify-end">
            <button
              onClick={() => { audio.play('click'); setShowSettings(true) }}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
              ⚙️
            </button>
          </div>
          <button
            onClick={handleShare}
            className="btn-press w-full py-4 rounded-2xl border font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
            style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }}>
            👫 Demander de l'aide à un ami
          </button>
          <button
            onClick={() => { audio.play('click'); onNext() }}
            className="btn-press w-full py-5 rounded-2xl text-white font-black text-base uppercase tracking-wide active:scale-95 transition-all"
            style={nextBtnStyle}>
            {nextLabel}
          </button>
        </div>
      </div>
    )
  }

  // ── MOD 6 — CAS BONNE RÉPONSE (et duel) : scrollable ────────────────────
  return (
    <div className="relative flex flex-col h-full w-full screen-enter overflow-y-auto scrollbar-hide" style={{ background: screenBg }}>
      {quitModal}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {floatingBadge}
      {header}

      {/* MOD 3 — Espacement uniforme gap-3 entre tous les blocs */}
      <div className="flex flex-col px-5 gap-3 pb-6">

        {/* Image avec WOW effect + tampon FOU */}
        <div
          className={`rounded-3xl overflow-hidden border shrink-0 relative${!isDuel && flipped && isCorrect ? ' wow-shine wow-glow' : ''}`}
          style={{ borderColor: cat?.color + '60', aspectRatio: '1 / 1', background: 'transparent' }}>
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
          {/* Tampon FOU */}
          {!isDuel && flipped && isCorrect && (
            <div className="absolute inset-0 flex items-end justify-end pointer-events-none" style={{ padding: '24px' }}>
              <div
                className="stamp-wow"
                style={{
                  fontSize: '94px',
                  fontWeight: 900,
                  color: '#4CAF50',
                  textShadow: '0 4px 12px rgba(76, 175, 80, 0.5)',
                  transform: 'rotate(-15deg) scale(1.1)',
                  transformOrigin: 'right bottom',
                  border: '4px solid #4CAF50',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  backgroundColor: 'rgba(76, 175, 80, 0.1)',
                  backdropFilter: 'blur(4px)',
                }}>
                FOU
              </div>
            </div>
          )}
        </div>

        {/* Question */}
        <div className="rounded-2xl p-4 border" style={{ background: cat?.color + '15', borderColor: cat?.color + '40' }}>
          <div className="text-white/60 text-xs font-semibold mb-2">La question :</div>
          <div className="text-white font-bold text-base">{fact.question}</div>
        </div>

        {/* Duel — badges correct/incorrect + points */}
        {isDuel && (
          <>
            <div
              className="py-4 rounded-2xl text-center border-2 font-black text-base score-pop"
              style={{
                background: isCorrect ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                borderColor: isCorrect ? '#4CAF50' : '#F44336',
                color: isCorrect ? '#4CAF50' : '#F44336',
                animationDelay: '0.5s',
                opacity: 0,
              }}>
              {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </div>
            <div
              className="py-4 rounded-2xl text-center border-2 font-black text-base score-pop"
              style={{
                background: `linear-gradient(135deg, ${cat?.color}20 0%, ${cat?.color}10 100%)`,
                borderColor: cat?.color + '60',
                color: cat?.color,
                animationDelay: '0.6s',
                opacity: 0,
              }}>
              +{pointsEarned} pts
            </div>
          </>
        )}

        {/* Comparaison des réponses */}
        {!isOpenMode && !isTimeout && isCorrect && (
          <div className="rounded-2xl p-4 border border-green-500/40" style={{ background: 'rgba(76, 175, 80, 0.1)' }}>
            <div className="text-green-500 text-xs font-bold uppercase tracking-wide mb-2">✓ Bonne réponse :</div>
            <div className="text-white font-bold text-base">{correctAnswerText}</div>
          </div>
        )}
        {!isOpenMode && !isTimeout && selectedAnswer >= 0 && selectedAnswerText !== correctAnswerText && (
          <div className="rounded-2xl p-4 border border-red-500/40" style={{ background: 'rgba(244, 67, 54, 0.1)' }}>
            <div className="text-red-500 text-xs font-bold uppercase tracking-wide mb-2">✗ Votre réponse :</div>
            <div className="text-white font-bold text-base">{selectedAnswerText}</div>
          </div>
        )}
        {isOpenMode && (
          <div className="rounded-2xl p-4 border border-green-500/40" style={{ background: 'rgba(76, 175, 80, 0.1)' }}>
            <div className="text-green-500 text-xs font-bold uppercase tracking-wide mb-2">✓ Réponse :</div>
            <div className="text-white font-bold text-base">{correctAnswerText}</div>
          </div>
        )}
        {isTimeout && (
          <div className="rounded-2xl p-4 border border-orange-500/40" style={{ background: 'rgba(255, 152, 0, 0.1)' }}>
            <div className="text-orange-500 text-xs font-bold uppercase tracking-wide">⏱️ Temps écoulé</div>
          </div>
        )}

        {/* MOD 4 — Le Saviez-Vous avec Suivant intégré (solo correct uniquement) */}
        {!isDuel && isCorrect && (
          <div className="rounded-3xl border p-4" style={{
            background: cat ? `linear-gradient(135deg, ${cat.color}18 0%, ${cat.color}06 100%)` : 'rgba(0,0,0,0.35)',
            borderColor: cat?.color + '70',
            backdropFilter: 'blur(12px)',
            boxShadow: `0 4px 32px ${cat?.color || '#000'}25`,
          }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🧠</span>
              <span className="text-white font-black text-sm uppercase tracking-wide">Le saviez-vous ?</span>
            </div>
            <p className="text-white/80 text-sm leading-relaxed font-medium mb-3">{fact.explanation}</p>
            {/* MOD 4 — source à gauche, Suivant à droite sur la même ligne */}
            <div className="flex items-center justify-between gap-3">
              {fact.sourceUrl ? (
                <a
                  href={fact.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold min-w-0"
                  style={{ color: cat?.color + 'aa' }}>
                  <span>🔗</span>
                  <span className="underline underline-offset-2 truncate">
                    {fact.sourceUrl.replace(/^https?:\/\//, '').split('/')[0]}
                  </span>
                </a>
              ) : (
                <div />
              )}
              <button
                onClick={() => { audio.play('click'); onNext() }}
                className="btn-press shrink-0 px-4 py-2 rounded-xl text-white font-black text-sm active:scale-95 transition-all"
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

        {/* Actions bas — ⚙️ + Partager (solo correct) + Suivant (duel) */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <button
              onClick={() => { audio.play('click'); setShowSettings(true) }}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
              ⚙️
            </button>
          </div>
          {/* MOD 6 — Partager conservé (solo bonne réponse) */}
          {!isDuel && (
            <button
              onClick={handleShare}
              className="btn-press w-full py-4 rounded-2xl border text-white/70 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
              <span>{copied ? '✅' : '📤'}</span>
              {copied ? 'Copié !' : 'Partager ce WTF!'}
            </button>
          )}
          {/* Suivant duel — solo a son bouton dans "Le Saviez-Vous" */}
          {isDuel && (
            <button
              onClick={() => { audio.play('click'); onNext() }}
              className="btn-press w-full py-5 rounded-2xl text-white font-black text-base uppercase tracking-wide active:scale-95 transition-all"
              style={nextBtnStyle}>
              {nextLabel}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
