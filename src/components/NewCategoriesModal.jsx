import { getPlayableCategories } from '../data/factsService'
import { useScale } from '../hooks/useScale'
import { audio } from '../utils/audio'

export default function NewCategoriesModal({ categories, onClose }) {
  const scale = useScale()
  const playableCategories = getPlayableCategories()

  // Récupérer les info (label, emoji) des catégories débloquées
  const categoryDetails = categories.map(catId => {
    const cat = playableCategories.find(c => c.id === catId)
    return { id: catId, label: cat?.label || catId, emoji: cat?.emoji || '🎲' }
  })

  const S = (px) => `calc(${px}px * var(--scale))`

  const handleClose = () => {
    audio.play('click')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.7)',
        fontFamily: 'Nunito, sans-serif',
        '--scale': scale,
      }}
      onClick={handleClose}
    >
      <div
        className="rounded-2xl p-8 max-w-md w-11/12"
        style={{
          background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          animation: 'slideUp 0.3s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Titre */}
        <h2 style={{
          fontSize: S(24),
          fontWeight: 900,
          color: '#FF6B1A',
          marginBottom: S(16),
          textAlign: 'center',
        }}>
          🎉 Nouvelle catégorie débloquée !
        </h2>

        {/* Catégories */}
        <div style={{ marginBottom: S(24) }}>
          {categoryDetails.map((cat) => (
            <div
              key={cat.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: S(12),
                marginBottom: S(8),
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: S(12),
                fontSize: S(16),
                fontWeight: 700,
              }}
            >
              <span style={{ marginRight: S(12), fontSize: S(24) }}>{cat.emoji}</span>
              <span style={{ color: '#ffffff' }}>{cat.label}</span>
            </div>
          ))}
        </div>

        {/* Message */}
        <p style={{
          fontSize: S(14),
          color: 'rgba(255,255,255,0.6)',
          lineHeight: 1.5,
          marginBottom: S(24),
          textAlign: 'center',
        }}>
          Tu peux maintenant jouer {categories.length > 1 ? 'ces catégories' : 'cette catégorie'} en Quickie et les retrouver dans ta collection !
        </p>

        {/* Bouton Continuer */}
        <button
          onClick={handleClose}
          style={{
            width: '100%',
            padding: `${S(14)} ${S(24)}`,
            backgroundColor: '#FF6B1A',
            color: '#fff',
            border: 'none',
            borderRadius: S(12),
            fontFamily: 'Nunito, sans-serif',
            fontWeight: 900,
            fontSize: S(16),
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#E55A0A'
            e.target.style.transform = 'scale(1.02)'
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#FF6B1A'
            e.target.style.transform = 'scale(1)'
          }}
        >
          Continuer
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
