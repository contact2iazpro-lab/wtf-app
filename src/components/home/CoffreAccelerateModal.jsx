/**
 * CoffreAccelerateModal — modal "Ouvrir le coffre de demain" pour 15 coins.
 * Option "paid day+1 unlock" sur les coffres quotidiens.
 */

const ACCELERATE_COST = 15

export default function CoffreAccelerateModal({ currentCoins, onCancel, onConfirm }) {
  const canAfford = currentCoins >= ACCELERATE_COST

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 24, padding: 28,
          textAlign: 'center', maxWidth: 340, width: '90%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          fontFamily: 'Nunito, sans-serif',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 44, marginBottom: 8 }}>⏩</div>
        <div style={{ fontSize: 17, fontWeight: 900, color: '#1a1a2e', marginBottom: 6 }}>
          Ouvrir le coffre de demain ?
        </div>
        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 16, lineHeight: 1.4 }}>
          Tu auras ta récompense tout de suite, mais plus de coffre à ouvrir demain.
        </div>
        <div style={{
          background: '#FFF7ED', border: '1px solid #FFEDD5', borderRadius: 12,
          padding: '10px 16px', marginBottom: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#6B7280' }}>Coût</span>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#FF6B1A', display: 'flex', alignItems: 'center', gap: 4 }}>
            {ACCELERATE_COST}<img src="/assets/ui/icon-coins.png" alt="" style={{ width: 16, height: 16 }} />
          </span>
        </div>
        {!canAfford && (
          <div style={{ fontSize: 11, color: '#EF4444', fontWeight: 700, marginBottom: 10 }}>
            Pas assez de coins ({currentCoins} <img src="/assets/ui/icon-coins.png" alt="coins" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} />)
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 12,
              background: '#F3F4F6', border: '1px solid #E5E7EB',
              color: '#6B7280', fontWeight: 800, fontSize: 14,
              cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
            }}
          >
            Annuler
          </button>
          <button
            disabled={!canAfford}
            onClick={() => canAfford && onConfirm(ACCELERATE_COST)}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 12,
              background: canAfford ? 'linear-gradient(135deg, #FFD700, #FFA500)' : '#E5E7EB',
              color: canAfford ? '#1a1a2e' : '#9CA3AF',
              border: 'none', fontWeight: 900, fontSize: 14,
              cursor: canAfford ? 'pointer' : 'not-allowed',
              fontFamily: 'Nunito, sans-serif',
            }}
          >
            Ouvrir
          </button>
        </div>
      </div>
    </div>
  )
}
