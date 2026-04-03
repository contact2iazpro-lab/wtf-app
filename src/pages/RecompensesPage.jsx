import { useNavigate } from 'react-router-dom'

const BADGES = [
  { label: 'Premier F*ct', emoji: '🎯' },
  { label: '10 F*cts', emoji: '🧠' },
  { label: '50 F*cts', emoji: '🔥' },
  { label: '100 F*cts', emoji: '💎' },
  { label: 'Série de 5', emoji: '⚡' },
  { label: 'Série de 10', emoji: '🌟' },
  { label: 'Perfect', emoji: '👑' },
  { label: 'Marathon', emoji: '🏃' },
  { label: 'Blitz Master', emoji: '⏱️' },
  { label: 'Collectionneur', emoji: '📚' },
  { label: 'Expert WTF!', emoji: '🏆' },
  { label: 'Légende', emoji: '✨' },
]

export default function RecompensesPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: '#FAFAF8', paddingBottom: 72 }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151' }}
          >←</button>
          <h1 className="flex-1 text-lg font-black" style={{ color: '#1a1a2e' }}>Trophées</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-24">
        {/* Message encouragement */}
        <div className="rounded-2xl p-4 mb-4 text-center" style={{ background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' }}>
          <span className="text-2xl block mb-1">🏆</span>
          <span className="font-black text-sm block" style={{ color: '#1a1a2e' }}>Joue pour débloquer tes premiers trophées !</span>
          <span className="text-xs" style={{ color: 'rgba(26,26,46,0.6)' }}>Chaque badge récompense un exploit</span>
        </div>

        {/* Grille de badges */}
        <div className="grid grid-cols-3 gap-2">
          {BADGES.map(badge => (
            <div
              key={badge.label}
              className="rounded-2xl p-3 flex flex-col items-center justify-center text-center"
              style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', opacity: 0.5, minHeight: 100 }}
            >
              <div className="relative mb-1.5">
                <span className="text-3xl" style={{ filter: 'grayscale(100%)' }}>{badge.emoji}</span>
                <span className="absolute -bottom-0.5 -right-1 text-sm">🔒</span>
              </div>
              <span className="font-bold text-xs" style={{ color: '#9CA3AF', lineHeight: 1.2 }}>{badge.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
