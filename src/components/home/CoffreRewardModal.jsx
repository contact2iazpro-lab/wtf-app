/**
 * CoffreRewardModal — modal "Tu as gagné X" quand l'utilisateur ouvre un coffre.
 */

export default function CoffreRewardModal({ reward, onClose }) {
  if (!reward) return null

  const message = reward.type === 'coins' && reward.bonus
    ? `Tu as gagné ${reward.amount} coins et ${reward.bonus.amount} ticket ! 🎉`
    : reward.type === 'coins'
      ? `Tu as gagné ${reward.amount} coins !`
      : `Tu as gagné ${reward.amount} indice${reward.amount > 1 ? 's' : ''} !`

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 24, padding: 32,
          textAlign: 'center', maxWidth: 340, width: '90%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          fontFamily: 'Nunito, sans-serif',
        }}
        onClick={e => e.stopPropagation()}
      >
        <img src="/assets/ui/chest-open.png" alt="coffre" style={{ width: 48, height: 48, marginBottom: 16 }} />
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginBottom: 12, lineHeight: 1.4 }}>
          Coffre du jour !
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginBottom: 24, lineHeight: 1.4 }}>
          {message}
        </div>
        <button
          onClick={onClose}
          style={{
            background: '#FF6B1A',
            color: 'white', border: 'none',
            borderRadius: 16, padding: '14px 0',
            width: '100%', fontWeight: 900, fontSize: 16, cursor: 'pointer',
            fontFamily: 'Nunito, sans-serif',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Super !
        </button>
      </div>
    </div>
  )
}
