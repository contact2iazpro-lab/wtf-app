const RANK_LEVELS = [
  { min: 0,  max: 0,  emoji: '💀', label: 'Catastrophe',  color: '#6B7280' },
  { min: 1,  max: 5,  emoji: '😅', label: 'Apprenti',     color: '#3B82F6' },
  { min: 6,  max: 10, emoji: '🧠', label: 'Curieux',      color: '#8B5CF6' },
  { min: 11, max: 17, emoji: '🔥', label: 'Expert',       color: '#F59E0B' },
  { min: 18, max: 99, emoji: '👑', label: 'GÉNIE WTF',    color: '#FF5C1A' },
]

function getRank(score) {
  return RANK_LEVELS.find((r) => score >= r.min && score <= r.max) || RANK_LEVELS[0]
}

function getStars(correct, total) {
  const ratio = correct / total
  if (ratio === 1) return 3
  if (ratio >= 0.6) return 2
  if (ratio > 0) return 1
  return 0
}

export default function ResultsScreen({ score, correctCount, totalFacts, onReplay, onHome }) {
  const rank = getRank(score)
  const stars = getStars(correctCount, totalFacts)
  const maxScore = totalFacts * 5
  const pct = Math.round((score / maxScore) * 100)

  return (
    <div
      className="flex flex-col h-full w-full screen-enter overflow-y-auto scrollbar-hide"
      style={{ background: `linear-gradient(170deg, #06304A 0%, #0A4870 20%, #C45A00 65%, #7A2E00 85%, #3A1200 100%)` }}>

      {/* Header */}
      <div className="flex flex-col items-center pt-12 pb-6 px-6">
        <div className="text-7xl mb-3 animate-bounce-in">{rank.emoji}</div>
        <div
          className="text-2xl font-black mb-1"
          style={{ color: rank.color }}>
          {rank.label}
        </div>
        <div className="text-white/50 text-sm font-semibold">Partie terminée !</div>
      </div>

      {/* Stars */}
      <div className="flex justify-center gap-3 mb-8">
        {[1, 2, 3].map((s) => (
          <span
            key={s}
            className="text-4xl transition-all duration-300"
            style={{
              filter: s <= stars ? 'drop-shadow(0 0 12px #FF5C1A)' : 'none',
              opacity: s <= stars ? 1 : 0.15,
            }}>
            ⭐
          </span>
        ))}
      </div>

      {/* Score card */}
      <div className="mx-5 mb-5 rounded-3xl border p-6" style={{ background: 'rgba(0,0,0,0.35)', borderColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)' }}>
        {/* Big score */}
        <div className="text-center mb-6">
          <div className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">Score final</div>
          <div className="text-6xl font-black" style={{ color: '#FF5C1A' }}>{score}</div>
          <div className="text-white/40 text-sm font-semibold">/ {maxScore} points max</div>
        </div>

        {/* Progress bar */}
        <div className="h-2.5 bg-wtf-border rounded-full overflow-hidden mb-6">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #FF5C1A, #FF7A42)',
            }}
          />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-2xl font-black text-white">{correctCount}</div>
            <div className="text-white/40 text-xs font-semibold">Correctes</div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">{totalFacts - correctCount}</div>
            <div className="text-white/40 text-xs font-semibold">Ratées</div>
          </div>
          <div>
            <div className="text-2xl font-black" style={{ color: '#FF5C1A' }}>{pct}%</div>
            <div className="text-white/40 text-xs font-semibold">Précision</div>
          </div>
        </div>
      </div>

      {/* Scoring reminder */}
      <div className="mx-5 mb-6 rounded-2xl border p-4" style={{ background: 'rgba(0,0,0,0.25)', borderColor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
        <div className="text-white/50 text-xs font-bold uppercase tracking-widest mb-3">Rappel scoring</div>
        <div className="flex justify-between text-xs font-semibold">
          {[
            { label: 'Open 0 ind.', pts: '+5 pts', color: '#22C55E' },
            { label: 'Open 1 ind.', pts: '+3 pts', color: '#F59E0B' },
            { label: 'Open 2 ind.', pts: '+2 pts', color: '#EF4444' },
            { label: 'QCM', pts: '+1 pt', color: '#3B82F6' },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-1">
              <div className="font-black text-xs" style={{ color: item.color }}>{item.pts}</div>
              <div className="text-white/40 text-2xs">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 pb-10 flex flex-col gap-3 mt-auto">
        <button
          onClick={onReplay}
          className="btn-press w-full py-5 rounded-2xl text-white font-black text-base uppercase tracking-wide active:scale-95 transition-all"
          style={{
            background: 'linear-gradient(135deg, #FF5C1A 0%, #D94A10 100%)',
            boxShadow: '0 8px 32px rgba(255, 92, 26, 0.4)',
          }}>
          🔄  Rejouer
        </button>
        <button
          onClick={onHome}
          className="btn-press w-full py-4 rounded-2xl border border-wtf-border text-white/70 font-bold text-sm active:scale-95 transition-all"
          style={{ background: 'rgba(255,255,255,0.04)' }}>
          🏠  Accueil
        </button>
      </div>
    </div>
  )
}
