import { useNavigate } from 'react-router-dom'

const S = (px) => `calc(${px}px * var(--scale))`

export default function SocialPage() {
  const navigate = useNavigate()

  const handleInvite = () => {
    const text = "Rejoins-moi sur What The F*ct! Des f*cts 100% vrais, des réactions 100% fun 🤯\nhttps://wtf-app-production.up.railway.app/"
    if (navigator.share) {
      navigator.share({ text }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(text).catch(() => {})
    }
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: '#FAFAF8', paddingBottom: S(80) }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151' }}
          >←</button>
          <h1 className="flex-1 text-lg font-black" style={{ color: '#1a1a2e' }}>Amis</h1>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
        {/* Bandeau bientôt disponible */}
        <div className="w-full rounded-2xl p-5 mb-6 text-center" style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)' }}>
          <span className="text-3xl block mb-2">👥</span>
          <span className="font-black text-base text-white block mb-1">Bientôt disponible</span>
          <span className="text-xs block leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Défie tes amis et compare vos collections de F*cts !
          </span>
        </div>

        {/* Explications */}
        <div className="w-full flex flex-col gap-3 mb-6">
          {[
            { emoji: '⚔️', text: 'Défie tes amis en duel' },
            { emoji: '📊', text: 'Compare vos collections' },
            { emoji: '🏆', text: 'Grimpe dans le classement' },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-3 rounded-xl p-3" style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
              <span className="text-xl">{item.emoji}</span>
              <span className="font-bold text-sm" style={{ color: '#374151' }}>{item.text}</span>
            </div>
          ))}
        </div>

        {/* Bouton inviter */}
        <button
          onClick={handleInvite}
          className="w-full py-3.5 rounded-2xl font-black text-sm active:scale-95 transition-all"
          style={{
            background: 'linear-gradient(135deg, #FF6B1A 0%, #FF3385 100%)',
            color: 'white', border: 'none',
            boxShadow: '0 4px 16px rgba(255,107,26,0.4)',
          }}
        >
          🎉 Inviter un ami
        </button>
      </div>
    </div>
  )
}
