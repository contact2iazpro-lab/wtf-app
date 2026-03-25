import { useState, useEffect } from 'react'
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
}) {
  const [flipped, setFlipped] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const cat = getCategoryById(fact.category)

  useEffect(() => {
    const timer = setTimeout(() => setFlipped(true), 300)
    if (!isDuel) {
      setTimeout(() => audio.play('reveal'), 150)
      setTimeout(() => audio.play('points'), 600)
    }
    return () => clearTimeout(timer)
  }, []) // eslint-disable-line

  const handleShare = () => {
    onShare()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isLast = factIndex + 1 >= totalFacts
  const isDuel = !!duelContext
  const isLastPlayer = isDuel && duelContext.isLastPlayer
  const playerColor = isDuel ? (['#3B82F6', '#FF5C1A', '#22C55E', '#A855F7', '#EAB308', '#EC4899'][duelContext.currentPlayerIndex] ?? '#FF5C1A') : null
  const isOpenMode = selectedAnswer === 100 || selectedAnswer === -2
  const isTimeout = selectedAnswer === -1

  // Get selected and correct answer text
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
    <div className="relative flex flex-col h-full w-full screen-enter overflow-y-auto scrollbar-hide" style={{ background: cat ? `radial-gradient(ellipse at 50% -10%, ${cat.color}55 0%, ${cat.bg} 50%, #060606 100%)` : 'linear-gradient(170deg, #06304A 0%, #0A4870 20%, #C45A00 65%, #7A2E00 85%, #3A1200 100%)' }}>
      {quitModal}
      {/* Header with fact number */}
      <div className="px-5 pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isDuel && (
            <div
              className="px-2.5 py-1 rounded-full text-xs font-black"
              style={{ background: playerColor + '20', color: playerColor }}>
              {duelContext.playerName}
            </div>
          )}
          <div className="text-xs font-bold text-white/50 uppercase tracking-wide">
            {factIndex + 1} / {totalFacts}
          </div>
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
          <button
            onClick={() => setShowQuitConfirm(true)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            ✕
          </button>
        </div>
      </div>

      {/* Fact Image */}
      {fact.imageUrl && (
        <div
          className={`mx-5 mb-6 rounded-3xl overflow-hidden border shrink-0 relative${!isDuel && flipped ? ' wow-shine wow-glow' : ''}`}
          style={{ borderColor: cat?.color + '60', height: '280px' }}>
          <img
            src={fact.imageUrl}
            alt={fact.question}
            className={`w-full h-full object-cover${!isDuel ? ' wow-image' : ''}`}
            style={!isDuel ? { animationDelay: '0.1s', opacity: 0 } : {}}
            onError={(e) => { e.target.style.display = 'none' }}
          />
        </div>
      )}

      {/* Question */}
      <div className="mx-5 mb-4 rounded-2xl p-4 border" style={{ background: cat?.color + '15', borderColor: cat?.color + '40' }}>
        <div className="text-white/60 text-xs font-semibold mb-2">La question:</div>
        <div className="text-white font-bold text-base">{fact.question}</div>
      </div>

      {/* Score indicator */}
      <div className="mx-5 mb-6 flex items-center gap-4">
        {/* Correct/Incorrect badge */}
        <div
          className={`flex-1 py-4 rounded-2xl text-center border-2 font-black text-lg${!isDuel ? ' score-pop' : ''}`}
          style={{
            background: isCorrect ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
            borderColor: isCorrect ? '#4CAF50' : '#F44336',
            color: isCorrect ? '#4CAF50' : '#F44336',
            animationDelay: !isDuel ? '0.5s' : '0s',
            opacity: !isDuel ? 0 : 1,
          }}>
          {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
        </div>

        {/* Points earned */}
        <div
          className={`flex-1 py-4 rounded-2xl text-center border-2 font-black text-lg${!isDuel ? ' score-pop' : ''}`}
          style={{
            background: `linear-gradient(135deg, ${cat?.color}20 0%, ${cat?.color}10 100%)`,
            borderColor: cat?.color + '60',
            color: cat?.color,
            animationDelay: !isDuel ? '0.6s' : '0s',
            opacity: !isDuel ? 0 : 1,
          }}>
          +{pointsEarned} pts
        </div>
      </div>

      {/* Answer comparison */}
      <div className="mx-5 mb-6 space-y-3">
        {/* QCM mode: show correct answer and player's answer */}
        {!isOpenMode && !isTimeout && (
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

        {/* Open mode: show correct answer for reference */}
        {isOpenMode && (
          <div className="rounded-2xl p-4 border border-green-500/40" style={{ background: 'rgba(76, 175, 80, 0.1)' }}>
            <div className="text-green-500 text-xs font-bold uppercase tracking-wide mb-2">✓ Réponse:</div>
            <div className="text-white font-bold text-base">{correctAnswerText}</div>
          </div>
        )}

        {/* Timeout */}
        {isTimeout && (
          <div className="rounded-2xl p-4 border border-orange-500/40" style={{ background: 'rgba(255, 152, 0, 0.1)' }}>
            <div className="text-orange-500 text-xs font-bold uppercase tracking-wide">⏱️ Temps écoulé</div>
          </div>
        )}
      </div>

      {/* Explanation section */}
      <div className="mx-5 mb-6 rounded-3xl border p-5" style={{ background: cat ? `linear-gradient(135deg, ${cat.color}18 0%, ${cat.color}06 100%)` : 'rgba(0,0,0,0.35)', borderColor: cat?.color + '70', backdropFilter: 'blur(12px)', boxShadow: `0 4px 32px ${cat?.color || '#000'}25` }}>
        <div className="flex items-center gap-2 mb-4">
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

      {/* Multi score (shown after last player answers each round) */}
      {isDuel && isLastPlayer && (
        <div className="mx-5 mb-5 bg-wtf-card rounded-2xl border border-wtf-border p-4">
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

      {/* Action buttons */}
      <div className="px-5 pb-8 flex flex-col gap-3 mt-auto">
        {!isDuel && (
          <button
            onClick={handleShare}
            className="btn-press w-full py-4 rounded-2xl border border-wtf-border text-white/70 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
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
