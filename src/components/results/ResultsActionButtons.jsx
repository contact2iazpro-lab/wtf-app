/**
 * ResultsActionButtons — footer 2 lignes de boutons sur ResultsScreen.
 *
 * Ligne 1 : Rejouer + (optionnel) Monter en difficulté / Challenge
 * Ligne 2 : Partager + Accueil
 *
 * Les labels du bouton Rejouer s'adaptent au sessionType (icône énergie).
 */

import EnergyIcon from '../icons/EnergyIcon'

const S = (px) => `calc(${px}px * var(--scale))`
export default function ResultsActionButtons({
  sessionType,
  difficulty,
  challengeLabel = null,
  categoryLabel = null,
  categoryId = null,
  onReplay,
  onReplayHarder,
  onShare,
  onHome,
  sharedCopied = false,
  shareLabel = null,
}) {
  const isQuickie = sessionType === 'quickie'
  const isVof = sessionType === 'vrai_ou_fou'
  const replayInner = (() => {
    if (sessionType === 'parcours') {
      return (
        <>
          <EnergyIcon size={16} /> Rejouer en Quest
        </>
      )
    }
    if (isQuickie) {
      const catText = categoryLabel ? `Rejouer ${categoryLabel}` : 'Rejouer en aléatoire'
      return (
        <>
          <EnergyIcon size={16} /> {catText}
          {categoryId && <img src={`/assets/categories/${categoryId}.png`} alt="" style={{ width: S(16), height: S(16), borderRadius: S(4), objectFit: 'cover', flexShrink: 0 }} onError={e => { e.target.style.display = 'none' }} />}
        </>
      )
    }
    if (isVof) return '🔄 Rejouer'
    return '🔄 Rejouer'
  })()

  // Mode VOF : partage prioritaire en tête, puis rejouer + accueil
  if (isVof) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', gap: S(8),
        padding: `${S(12)} ${S(16)} ${S(16)}`, flexShrink: 0,
        position: 'relative', zIndex: 2,
        borderTop: '1px solid rgba(255,255,255,0.1)',
      }}>
        <button
          onClick={onShare}
          className="active:scale-95 transition-all"
          style={{
            width: '100%', padding: `${S(14)} ${S(12)}`, borderRadius: S(14),
            background: 'linear-gradient(135deg, #25D366, #128C7E)',
            border: '3px solid #ffffff', color: '#fff', fontWeight: 900, fontSize: S(13),
            cursor: 'pointer', boxShadow: '0 4px 16px rgba(37,211,102,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(6),
          }}>
          {sharedCopied ? '✅ Copié !' : (shareLabel || '📣 PARTAGER MON SCORE')}
        </button>
        <div style={{ display: 'flex', gap: S(8) }}>
          <button
            onClick={onReplay}
            className="active:scale-95 transition-all"
            style={{
              flex: 1, padding: `${S(12)} ${S(12)}`, borderRadius: S(14),
              background: 'linear-gradient(135deg, #6BCB77, #3A8A4A)',
              border: 'none', color: '#fff', fontWeight: 900, fontSize: S(12),
              cursor: 'pointer', boxShadow: '0 4px 16px rgba(107,203,119,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(4),
            }}>
            🔄 Rejouer
          </button>
          <button
            onClick={onHome}
            className="active:scale-95 transition-all"
            style={{
              flex: 1, padding: `${S(12)} ${S(12)}`, borderRadius: S(14),
              background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)',
              color: '#fff', fontWeight: 800, fontSize: S(12),
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(4),
            }}>
            ← Accueil
          </button>
        </div>
      </div>
    )
  }

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
            background: isQuickie ? 'linear-gradient(135deg, #7F77DD, #4A3FA3)' : 'linear-gradient(135deg, #FFD700, #FFA500)',
            border: 'none', color: isQuickie ? 'white' : '#1a1a2e', fontWeight: 900, fontSize: S(11),
            cursor: 'pointer', boxShadow: isQuickie ? '0 8px 30px rgba(127,119,221,0.5)' : '0 4px 16px rgba(255,215,0,0.4)',
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
            background: isQuickie ? 'linear-gradient(135deg, #7F77DD, #4A3FA3)' : 'rgba(255,255,255,0.25)',
            border: isQuickie ? '3px solid #ffffff' : '2px solid rgba(255,255,255,0.4)',
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
            background: isQuickie ? 'linear-gradient(135deg, #7F77DD, #4A3FA3)' : 'rgba(255,255,255,0.25)',
            border: isQuickie ? '3px solid #ffffff' : '2px solid rgba(255,255,255,0.4)',
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
