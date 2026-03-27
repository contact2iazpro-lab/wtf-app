import { useState, useEffect, useRef } from 'react'
import SettingsModal from '../components/SettingsModal'
import { getCategoryById } from '../data/facts'
import { audio } from '../utils/audio'

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

  const scoreRefTarget = useRef(null)
  const pointsBadgeRef = useRef(null)
  const [animation, setAnimation] = useState(null)

  const cat = getCategoryById(fact.category)
  const isDuel = !!duelContext
  const isLast = factIndex + 1 >= totalFacts

  useEffect(() => {
    const timer = setTimeout(() => {
      setFlipped(true)
      if (!isDuel) setShowBadge(true)
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

  // Animation: calcul des positions et lancement
  useEffect(() => {
    if (!isDuel && flipped && pointsBadgeRef.current && scoreRefTarget.current) {
      const badgeRect = pointsBadgeRef.current.getBoundingClientRect()
      const scoreRect = scoreRefTarget.current.getBoundingClientRect()

      const offsetX = scoreRect.left - badgeRect.left
      const offsetY = scoreRect.top - badgeRect.top

      setAnimation({
        offsetX,
        offsetY,
        duration: 2.5,
      })

      const scoreTimer = setTimeout(() => {
        setDisplayedScore((prev) => prev + pointsEarned)
        setShowScorePulse(true)
        setShowBadge(false) // Masquer le badge quand il arrive à destination

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

  const quitModal = showQuitConfirm && (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full rounded-3xl p-6 border" style={{ background: '#1A1A2E', borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="text-2xl text-center mb-3">🏃</div>
        <h2 className="text-white font-black text-lg text-center mb-2">Quitter la partie ?</h2>
        <p className="text-white/50 text-sm text-center mb-6 leading-relaxed">
          {gameMode === 'marathon'
            ? 'Tes points accumulés ne seront pas comptabilisés au classement.'
            : 'Ta progression sera perdue.'
          }
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowQuitConfirm(false)}
            className="flex-1 py-4 rounded-2xl font-black text-base border"
            style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>
            Annuler
          </button>
          <button
            onClick={onQuit}
            className="flex-1 py-4 rounded-2xl font-black text-base border"
            style={{ background: 'rgba(244,67,54,0.15)', borderColor: '#F44336', color: '#F44336' }}>
            Quitter
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="relative flex flex-col h-full w-full screen-enter overflow-y-auto scrollbar-hide" style={{ background: cat ? `linear-gradient(135deg, ${cat.color}45 0%, ${cat.color}30 50%, ${cat.color}15 100%)` : 'linear-gradient(170deg, #06304A 0%, #0A4870 20%, #C45A00 65%, #7A2E00 85%, #3A1200 100%)' }}>
      {quitModal}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Badge de points flottant vers le score */}
      {!isDuel && showBadge && (
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
            transition: animation
              ? `all 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)`
              : 'none',
          }}>
          +{pointsEarned} pts
        </div>
      )}

      {/* Header avec numéro de fait et score */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {isDuel && (
            <div
              className="px-2.5 py-1 rounded-full text-xs font-black"
              style={{ background: playerColor + '20', color: playerColor }}>
              {duelContext.playerName}
            </div>
          )}
          <div className="text-xs font-bold uppercase tracking-wide" style={{ color: cat?.color || 'rgba(255,255,255,0.5)' }}>
            #{fact.id} · {factIndex + 1} / {totalFacts}
          </div>
          {!isDuel && (
            <div
              ref={scoreRefTarget}
              className={`text-xs font-black text-white/70 uppercase tracking-wide px-2.5 py-1 rounded-full transition-transform${showScorePulse ? ' score-pulse' : ''}`}
              style={{
                background: 'rgba(255, 165, 0, 0.15)',
                color: '#FFA500',
              }}>
              ⭐ {displayedScore}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {cat && (
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: cat.color + '20', color: cat.color }}>
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { audio.play('click'); setShowSettings(true) }}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors active:scale-90"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
              ⚙️
            </button>
            <button
              onClick={() => setShowQuitConfirm(true)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors active:scale-90"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* Image du fait ou animation de mauvaise réponse */}
      {fact.imageUrl && (
        <div
          className={`mx-5 mb-3 rounded-3xl overflow-hidden border shrink-0 relative${!isDuel && flipped && isCorrect ? ' wow-shine wow-glow' : ''}`}
          style={{ borderColor: cat?.color + '60', height: '240px', background: !isCorrect && !isDuel && flipped ? '#1a1a1a' : 'transparent' }}>
          {/* Afficher l'image seulement si bonne réponse */}
          {isCorrect && (
            <img
              src={fact.imageUrl}
              alt={fact.question}
              className={`w-full h-full object-cover${!isDuel ? ' wow-image' : ''}`}
              style={!isDuel ? { animationDelay: '0.1s', opacity: 0 } : {}}
              onError={(e) => { e.target.style.display = 'none' }}
            />
          )}

          {/* Animation logo WTF! pour mauvaise réponse */}
          {!isCorrect && !isDuel && flipped && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Logo WTF! */}
              <div
                style={{
                  position: 'relative',
                  width: '180px',
                  height: '180px',
                  animation: 'wrong-answer-zoom 0.6s ease-out forwards, wrong-answer-desaturate 0.6s ease-out forwards',
                }}>
                <img
                  src="/logo-wtf.png"
                  alt="WTF"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
                {/* Cercle rouge avec croix */}
                <svg
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                  }}
                  viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="95" fill="none" stroke="#F44336" strokeWidth="8" />
                  <line x1="50" y1="50" x2="150" y2="150" stroke="#F44336" strokeWidth="12" strokeLinecap="round" />
                  <line x1="150" y1="50" x2="50" y2="150" stroke="#F44336" strokeWidth="12" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          )}

          {/* Tampon — mode solo uniquement, mauvaise réponse */}
          {!isDuel && flipped && isCorrect && (
            <div className="absolute inset-0 flex items-end justify-end pointer-events-none" style={{ padding: '24px' }}>
              <div
                className="stamp-wow"
                style={{
                  fontSize: '94px',
                  fontWeight: 900,
                  color: '#4CAF50',
                  textShadow: `0 4px 12px rgba(76, 175, 80, 0.5)`,
                  transform: 'rotate(-15deg) scale(1.1)',
                  transformOrigin: 'right bottom',
                  border: `4px solid ${isCorrect ? '#4CAF50' : '#F44336'}`,
                  borderRadius: '8px',
                  padding: '12px 24px',
                  backgroundColor: isCorrect ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                  backdropFilter: 'blur(4px)',
                }}>
                {isCorrect ? 'FOU' : 'FAUX'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Question */}
      <div className="mx-5 mb-4 rounded-2xl p-4 border shrink-0" style={{ background: cat?.color + '15', borderColor: cat?.color + '40' }}>
        <div className="text-white/60 text-xs font-semibold mb-2">La question:</div>
        <div className="text-white font-bold text-base">{fact.question}</div>
      </div>

      {/* Indicateur de score */}
      <div className="mx-5 mb-3 grid grid-cols-2 gap-3 shrink-0">
        {/* Badge correct/incorrect — mode duel uniquement */}
        {isDuel && (
          <div
            className="py-4 rounded-2xl text-center border-2 font-black text-base score-pop"
            style={{
              background: isCorrect ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
              borderColor: isCorrect ? '#4CAF50' : '#F44336',
              color: isCorrect ? '#4CAF50' : '#F44336',
              animationDelay: '0.5s',
              opacity: 0,
              gridColumn: 'span 2',
            }}>
            {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
          </div>
        )}

        {/* Points gagnés — mode duel */}
        {isDuel && (
          <div
            className="py-4 rounded-2xl text-center border-2 font-black text-base score-pop"
            style={{
              background: `linear-gradient(135deg, ${cat?.color}20 0%, ${cat?.color}10 100%)`,
              borderColor: cat?.color + '60',
              color: cat?.color,
              animationDelay: '0.6s',
              opacity: 0,
              gridColumn: 'span 2',
            }}>
            +{pointsEarned} pts
          </div>
        )}
      </div>

      {/* Comparaison des réponses */}
      <div className="mx-5 mb-3 space-y-3 shrink-0">
        {!isOpenMode && !isTimeout && isCorrect && (
          <div className="rounded-2xl p-4 border border-green-500/40" style={{ background: 'rgba(76, 175, 80, 0.1)' }}>
            <div className="text-green-500 text-xs font-bold uppercase tracking-wide mb-2">✓ Bonne réponse:</div>
            <div className="text-white font-bold text-base">{correctAnswerText}</div>
          </div>
        )}

        {!isOpenMode && !isTimeout && selectedAnswer >= 0 && selectedAnswerText !== correctAnswerText && (
          <div className="rounded-2xl p-4 border border-red-500/40" style={{ background: 'rgba(244, 67, 54, 0.1)' }}>
            <div className="text-red-500 text-xs font-bold uppercase tracking-wide mb-2">✗ Votre réponse:</div>
            <div className="text-white font-bold text-base">{selectedAnswerText}</div>
          </div>
        )}

        {isOpenMode && (
          <div className="rounded-2xl p-4 border border-green-500/40" style={{ background: 'rgba(76, 175, 80, 0.1)' }}>
            <div className="text-green-500 text-xs font-bold uppercase tracking-wide mb-2">✓ Réponse:</div>
            <div className="text-white font-bold text-base">{correctAnswerText}</div>
          </div>
        )}

        {isTimeout && (
          <div className="rounded-2xl p-4 border border-orange-500/40" style={{ background: 'rgba(255, 152, 0, 0.1)' }}>
            <div className="text-orange-500 text-xs font-bold uppercase tracking-wide">⏱️ Temps écoulé</div>
          </div>
        )}
      </div>

      {/* Section scrollable explication + scores */}
      <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-3 px-5 pt-1">
        {/* Section explication — mode solo uniquement */}
        {!isDuel && isCorrect && (
          <div className="rounded-3xl border p-4" style={{ background: cat ? `linear-gradient(135deg, ${cat.color}18 0%, ${cat.color}06 100%)` : 'rgba(0,0,0,0.35)', borderColor: cat?.color + '70', backdropFilter: 'blur(12px)', boxShadow: `0 4px 32px ${cat?.color || '#000'}25` }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🧠</span>
              <span className="text-white font-black text-sm uppercase tracking-wide">Le saviez-vous ?</span>
            </div>
            <p className="text-white/80 text-sm leading-relaxed font-medium">{fact.explanation}</p>
            {fact.sourceUrl && (
              <a
                href={fact.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center gap-1.5 text-xs font-semibold"
                style={{ color: cat?.color + 'aa' }}>
                <span>🔗</span>
                <span className="underline underline-offset-2 truncate">{fact.sourceUrl.replace(/^https?:\/\//, '').split('/')[0]}</span>
              </a>
            )}
          </div>
        )}

        {/* Multi score (affiché après la réponse du dernier joueur) */}
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
      </div>

      {/* Boutons d'action */}
      <div className="px-5 pb-3 flex flex-col gap-3 shrink-0">
        {!isDuel && (
          <button
            onClick={handleShare}
            className="btn-press w-full py-4 rounded-2xl border text-white/70 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
            <span>{copied ? '✅' : '📤'}</span>
            {copied ? 'Copié !' : 'Partager ce WTF'}
          </button>
        )}
        <button
          onClick={() => { audio.play('click'); onNext() }}
          className="btn-press w-full py-5 rounded-2xl text-white font-black text-base uppercase tracking-wide active:scale-95 transition-all"
          style={{
            background: isDuel
              ? `linear-gradient(135deg, ${playerColor} 0%, ${playerColor}bb 100%)`
              : `linear-gradient(135deg, ${cat?.color} 0%, ${cat?.color}dd 100%)`,
            boxShadow: `0 8px 32px ${isDuel ? playerColor : cat?.color}40`,
          }}>
          {isDuel
            ? !isLastPlayer
              ? `▶ Au tour de ${duelContext.players[duelContext.currentPlayerIndex + 1]?.name}`
              : isLast
                ? '🏆 Résultats'
                : '⚡ Question suivante'
            : isLast
              ? '🏁 Mes résultats'
              : '⚡ Suivant'
          }
        </button>
      </div>
    </div>
  )
}
