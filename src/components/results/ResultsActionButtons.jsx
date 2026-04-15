/**
 * ResultsActionButtons — footer 2 lignes de boutons sur ResultsScreen.
 *
 * Ligne 1 : Rejouer + (optionnel) Monter en difficulté / Challenge
 * Ligne 2 : Partager + Accueil
 *
 * Les labels du bouton Rejouer s'adaptent au sessionType (icône ticket/énergie).
 */

const S = (px) => `calc(${px}px * var(--scale))`
const DIFFICULTY_LABELS = { cool: 'Cool', hot: 'Hot', wtf: 'WTF!' }

export default function ResultsActionButtons({
  sessionType,
  difficulty,
  challengeLabel = null,    // ex: "Tenter le niveau Hot ? 🔥" — null si pas dispo
  onReplay,
  onReplayHarder,
  onShare,
  onHome,
  sharedCopied = false,
}) {
  const replayInner = (() => {
    if (sessionType === 'parcours') {
      return (
        <>
          <img src="/assets/ui/emoji-energy.png" alt="energy" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} /> Rejouer en {DIFFICULTY_LABELS[difficulty?.id] || 'Quest'}
        </>
      )
    }
    if (sessionType === 'snack' || sessionType === 'snack') {
      return (
        <>
          <img src="/assets/ui/emoji-energy.png" alt="energy" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} /> Rejouer
        </>
      )
    }
    return '🔄 Rejouer'
  })()

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: S(8),
      padding: `${S(12)} ${S(16)} ${S(16)}`, flexShrink: 0,
      position: 'relative', zIndex: 2,
      borderTop: '1px solid rgba(255,255,255,0.1)',
    }}>
      {/* Ligne 1 : Rejouer + Challenge optionnel */}
      <div style={{ display: 'flex', gap: S(8) }}>
        <button
          onClick={onReplay}
          className="active:scale-95 transition-all"
          style={{
            flex: 1, padding: `${S(12)} ${S(12)}`, borderRadius: S(14),
            background: 'linear-gradient(135deg, #FFD700, #FFA500)',
            border: 'none', color: '#1a1a2e', fontWeight: 900, fontSize: S(11),
            cursor: 'pointer', boxShadow: '0 4px 16px rgba(255,215,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(4),
          }}>
          {replayInner}
        </button>
        {challengeLabel && (
          <button
            onClick={onReplayHarder || onReplay}
            className="active:scale-95 transition-all"
            style={{
              flex: 1, padding: `${S(12)} ${S(12)}`, borderRadius: S(14),
              background: 'linear-gradient(135deg, #FF6B1A, #D94A10)',
              border: 'none', color: 'white', fontWeight: 900, fontSize: S(11),
              cursor: 'pointer', boxShadow: '0 4px 16px rgba(255,107,26,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            {challengeLabel}
          </button>
        )}
      </div>

      {/* Ligne 2 : Partager + Accueil */}
      <div style={{ display: 'flex', gap: S(8) }}>
        <button
          onClick={onShare}
          className="active:scale-95 transition-all"
          style={{
            flex: 1, padding: `${S(10)} ${S(12)}`, borderRadius: S(14),
            background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.4)',
            color: '#fff', fontWeight: 800, fontSize: S(11),
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(4),
          }}>
          {sharedCopied ? '✅ Copié !' : '📤 Partager'}
        </button>
        <button
          onClick={onHome}
          className="active:scale-95 transition-all"
          style={{
            flex: 1, padding: `${S(10)} ${S(12)}`, borderRadius: S(14),
            background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.4)',
            color: '#fff', fontWeight: 800, fontSize: S(11),
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(4),
          }}>
          ← Accueil
        </button>
      </div>
    </div>
  )
}
