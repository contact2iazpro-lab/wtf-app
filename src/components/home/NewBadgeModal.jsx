/**
 * NewBadgeModal — modal "Badge débloqué !" affiché au retour sur le Home
 * quand `newlyEarnedBadges` contient un badge.
 */

export default function NewBadgeModal({ badge, onClose }) {
  if (!badge) return null
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 24, padding: '32px 28px',
          textAlign: 'center', maxWidth: 300, width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          fontFamily: 'Nunito, sans-serif',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 48, marginBottom: 12, lineHeight: 1 }}>{badge.emoji}</div>
        <div style={{
          fontSize: 20, fontWeight: 900, color: '#FF6B1A',
          marginBottom: 10, letterSpacing: '0.05em',
        }}>
          Badge débloqué ! 🎉
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', marginBottom: 24 }}>
          {badge.label}
        </div>
        <button
          onClick={onClose}
          style={{
            background: '#FF6B1A',
            color: 'white', border: 'none',
            borderRadius: 16, padding: '13px 36px',
            fontWeight: 900, fontSize: 15, cursor: 'pointer',
            fontFamily: 'Nunito, sans-serif',
          }}
        >
          Super !
        </button>
      </div>
    </div>
  )
}
