/**
 * MarathonScreen — Écran de résultats du mode Marathon
 * Affiché après les 20 questions du Marathon (Kids)
 */

import CoinsIcon from '../components/CoinsIcon'

const DIFFICULTY_LABELS = {
  cool: { label: 'Cool', emoji: '❄️' },
  hot:  { label: 'Hot',  emoji: '🔥' },
  wtf:  { label: 'WTF!', emoji: '⚡' },
}

function StarBar({ correctCount, total = 20 }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 18, height: 18, borderRadius: 4,
            background: i < correctCount ? '#FF6B1A' : 'rgba(255,255,255,0.15)',
            transition: `background 0.3s ${i * 30}ms`,
          }}
        />
      ))}
    </div>
  )
}

export default function MarathonScreen({
  correctCount   = 0,
  totalFacts     = 20,
  sessionScore   = 0,
  coinsEarned    = 0,
  isPerfect      = false,
  difficulty     = null,
  onReplay,
  onHome,
}) {
  const diffLabel = difficulty ? DIFFICULTY_LABELS[difficulty.id] : null
  const pct       = Math.round((correctCount / totalFacts) * 100)

  const praise =
    isPerfect           ? `🏆 PARFAIT ! ${totalFacts}/${totalFacts} !`
    : correctCount >= 18 ? '🔥 Quasi parfait !'
    : correctCount >= 15 ? '💪 Très belle course !'
    : correctCount >= 10 ? '👍 Pas mal du tout !'
    : correctCount >= 5  ? '😅 Continue à t\'entraîner !'
    :                       '🧗 Explorer, ça se mérite !'

  return (
    <div style={{
      height: '100%', width: '100%', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(160deg, #1a0a35 0%, #0A0F1E 100%)',
      fontFamily: 'Nunito, sans-serif',
      color: 'white',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'rgba(0,0,0,0.3)',
        flexShrink: 0,
      }}>
        <button
          onClick={onHome}
          style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10,
            color: 'white', fontSize: 16, padding: '6px 12px',
            cursor: 'pointer', fontWeight: 700, fontFamily: 'Nunito, sans-serif',
          }}
        >
          ✕
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em' }}>
            🧭 EXPLORER
          </span>
          {diffLabel && (
            <span style={{
              fontSize: 10, fontWeight: 700,
              background: 'rgba(255,107,26,0.3)', color: '#FF6B1A',
              borderRadius: 8, padding: '2px 8px',
            }}>
              {diffLabel.emoji} {diffLabel.label}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <CoinsIcon size={14} />
          <span style={{ fontSize: 13, fontWeight: 800 }}>{coinsEarned}</span>
        </div>
      </div>

      {/* Corps */}
      <div style={{
        flex: 1, overflow: 'auto',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 20px',
        gap: 20,
      }}>

        {/* Titre */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 4 }}>🧭</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#FF6B1A', letterSpacing: 1 }}>
            EXPLORER TERMINÉ !
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
            {praise}
          </div>
        </div>

        {/* Score principal */}
        <div style={{
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,107,26,0.3)',
          borderRadius: 20, padding: '20px 32px',
          textAlign: 'center',
          width: '100%', boxSizing: 'border-box',
        }}>
          <div style={{ fontSize: 60, fontWeight: 900, lineHeight: 1, color: '#FF6B1A' }}>
            {correctCount}
          </div>
          <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
            / {totalFacts} correctes
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
            {pct}% de réussite
          </div>
        </div>

        {/* Grille de cases */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 16, padding: '16px',
          width: '100%', boxSizing: 'border-box',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 10, textAlign: 'center', letterSpacing: '0.08em' }}>
            PROGRESSION
          </div>
          <StarBar correctCount={correctCount} total={totalFacts} />
        </div>

        {/* Coins */}
        <div style={{
          background: isPerfect ? 'rgba(255,107,26,0.2)' : 'rgba(255,255,255,0.07)',
          border: isPerfect ? '1px solid rgba(255,107,26,0.6)' : '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16, padding: '14px 20px',
          width: '100%', boxSizing: 'border-box',
          textAlign: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: isPerfect ? 6 : 0 }}>
            <CoinsIcon size={20} />
            <span style={{ fontSize: 28, fontWeight: 900, color: '#FF6B1A' }}>+{coinsEarned}</span>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>coins gagnés</span>
          </div>
          {isPerfect && (
            <div style={{
              fontSize: 12, fontWeight: 700,
              color: '#FF6B1A',
              background: 'rgba(255,107,26,0.15)',
              borderRadius: 8, padding: '4px 12px',
              display: 'inline-block',
            }}>
              🏆 Bonus PARFAIT inclus : +20 coins !
            </div>
          )}
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
            {correctCount} × 3 coins{isPerfect ? ' + 20 bonus' : ''}
          </div>
        </div>

      </div>

      {/* CTAs */}
      <div style={{
        padding: '12px 16px 20px',
        display: 'flex', gap: 10,
        flexShrink: 0,
        background: 'rgba(0,0,0,0.3)',
      }}>
        <button
          onClick={onHome}
          style={{
            flex: 1, padding: '14px',
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 14, color: 'white',
            fontWeight: 800, fontSize: 14,
            cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          🏠 Accueil
        </button>
        <button
          onClick={onReplay}
          style={{
            flex: 2, padding: '14px',
            background: 'linear-gradient(135deg, #FF6B1A, #FF8C42)',
            border: 'none', borderRadius: 14, color: 'white',
            fontWeight: 900, fontSize: 14,
            cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
            WebkitTapHighlightColor: 'transparent',
            boxShadow: '0 4px 16px rgba(255,107,26,0.4)',
          }}
        >
          🧭 Relancer Explorer
        </button>
      </div>

    </div>
  )
}
