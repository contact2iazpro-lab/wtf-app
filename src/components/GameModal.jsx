/**
 * GameModal — Modal in-game réutilisable (remplace window.alert et window.confirm)
 *
 * Props:
 *  - emoji: string (emoji en haut)
 *  - title: string
 *  - message: string
 *  - confirmLabel: string (bouton principal, default "OK")
 *  - cancelLabel: string | null (si null → pas de bouton annuler)
 *  - onConfirm: () => void
 *  - onCancel: () => void (si cancelLabel fourni)
 *  - confirmColor: string (couleur du bouton confirm, default '#FF6B1A')
 *  - danger: boolean (bouton confirm en rouge)
 */
export default function GameModal({
  emoji = '💡',
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = null,
  onConfirm,
  onCancel,
  confirmColor = '#FF6B1A',
  danger = false,
}) {
  const btnColor = danger ? '#DC2626' : confirmColor

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={onCancel || onConfirm}
    >
      <div
        style={{
          background: '#FAFAF8', borderRadius: 20, padding: '24px 20px',
          maxWidth: 320, width: '100%', textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          fontFamily: 'Nunito, sans-serif',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 40, marginBottom: 8 }}>{emoji}</div>
        <h3 style={{ fontSize: 17, fontWeight: 900, color: '#1a1a2e', margin: '0 0 8px' }}>
          {title}
        </h3>
        {message && (
          <p style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', margin: '0 0 20px', lineHeight: 1.5 }}>
            {message}
          </p>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          {cancelLabel && (
            <button
              onClick={onCancel}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 14,
                background: '#F3F4F6', border: '1px solid #E5E7EB',
                color: '#6B7280', fontSize: 14, fontWeight: 800,
                fontFamily: 'Nunito, sans-serif', cursor: 'pointer',
              }}
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 14,
              background: btnColor, border: 'none',
              color: 'white', fontSize: 14, fontWeight: 800,
              fontFamily: 'Nunito, sans-serif', cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
