export default function DuelResultsScreen({ players, onReplay, onHome }) {
  const sorted = [...players].sort((a, b) => b.score - a.score)
  const isDraw = sorted.length > 1 && sorted[0].score === sorted[1].score
  const medals = ['🥇', '🥈', '🥉']

  return (
    <div
      className="flex flex-col h-full w-full bg-wtf-bg screen-enter overflow-y-auto scrollbar-hide"
      style={{ background: `radial-gradient(ellipse at 50% -10%, ${isDraw ? '#6B728022' : '#FF5C1A22'} 0%, #0D0D0D 60%)` }}>

      {/* Header */}
      <div className="flex flex-col items-center pt-12 pb-8 px-6">
        <div className="text-7xl mb-3 animate-bounce-in">{isDraw ? '🤝' : '🏆'}</div>
        <div className="text-2xl font-black mb-1" style={{ color: isDraw ? '#6B7280' : '#FF5C1A' }}>
          {isDraw ? 'Égalité !' : `${sorted[0].name} gagne !`}
        </div>
        <div className="text-white/50 text-sm font-semibold">Partie terminée !</div>
      </div>

      {/* Ranking */}
      <div className="mx-5 mb-5 bg-wtf-card rounded-3xl border border-wtf-border p-4 card-shadow flex flex-col gap-2">
        {sorted.map((player, rank) => (
          <div
            key={player.name}
            className="flex items-center gap-4 py-3 px-4 rounded-2xl border"
            style={{
              background: rank === 0 ? 'rgba(255,92,26,0.1)' : 'rgba(255,255,255,0.03)',
              borderColor: rank === 0 ? 'rgba(255,92,26,0.4)' : 'rgba(255,255,255,0.08)',
            }}>
            <div className="text-2xl w-8 text-center">{medals[rank] ?? `#${rank + 1}`}</div>
            <div className="flex-1 font-black text-white truncate">{player.name}</div>
            <div className="font-black text-xl" style={{ color: rank === 0 ? '#FF5C1A' : 'rgba(255,255,255,0.45)' }}>
              {player.score}
              <span className="text-xs font-semibold text-white/25 ml-1">pts</span>
            </div>
          </div>
        ))}
      </div>

      {!isDraw && sorted.length > 1 && (
        <div
          className="mx-5 mb-6 rounded-2xl border border-wtf-border p-4 text-center"
          style={{ background: 'rgba(255,92,26,0.05)' }}>
          <div className="text-white font-bold text-sm">
            🎉 {sorted[0].name} l'emporte avec{' '}
            <span style={{ color: '#FF5C1A' }}>
              {sorted[0].score - sorted[1].score} pt{sorted[0].score - sorted[1].score > 1 ? 's' : ''}
            </span>{' '}
            d'avance !
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-5 pb-10 flex flex-col gap-3 mt-auto">
        <button
          onClick={onReplay}
          className="btn-press w-full py-5 rounded-2xl text-white font-black text-base uppercase tracking-wide active:scale-95 transition-all"
          style={{
            background: 'linear-gradient(135deg, #FF5C1A 0%, #D94A10 100%)',
            boxShadow: '0 8px 32px rgba(255, 92, 26, 0.4)',
          }}>
          🎮 Rejouer
        </button>
        <button
          onClick={onHome}
          className="btn-press w-full py-4 rounded-2xl border border-wtf-border text-white/70 font-bold text-sm active:scale-95 transition-all"
          style={{ background: 'rgba(255,255,255,0.04)' }}>
          🏠 Accueil
        </button>
      </div>
    </div>
  )
}
