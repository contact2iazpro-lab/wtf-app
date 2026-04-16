/**
 * GainsBreakdown — card "récap gains structurés" : base + bonus + total.
 *
 * Réutilisé par ResultsScreen (Quest/Quickie/Quickie/Flash) et peut aussi être branché
 * sur Flash / Route / autres modes qui n'avaient que "+N coins" sèchement.
 *
 * Props :
 * - items: array [{label, value, color?, icon?}] — lignes détaillées optionnelles.
 *          Si omis, tu peux utiliser les raccourcis baseCoins/bonusCoins.
 * - total: number (animé ou non, le parent contrôle)
 * - totalColor: string (couleur catégorie, par défaut orange WTF)
 * - footerStats: array [{label, color?}] (ex: "8/10 trouvés", "80% précision")
 */

const S = (px) => `calc(${px}px * var(--scale))`

const CoinImg = () => (
  <img src="/assets/ui/icon-coins.png" alt="coins" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} />
)

export default function GainsBreakdown({
  // Mode structuré (ResultsScreen)
  correctCount,
  coinsPerCorrect,
  baseCoins,
  bonusCoins = 0,
  isPerfect = false,
  // Total
  total = 0,
  totalColor = '#FF6B1A',
  textColor = '#ffffff',
  // Mini stats en pied
  footerStats = null,
  // Mode libre (Flash/Route) : override des lignes avec un tableau
  items = null,
}) {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.35)', border: '1.5px solid rgba(255,255,255,0.15)',
      borderRadius: S(12), padding: `${S(8)} ${S(12)}`, flexShrink: 0,
      textShadow: '0 1px 4px rgba(0,0,0,0.7)',
      display: 'flex', flexDirection: 'column', gap: S(4),
    }}>
      {/* Lignes détails : soit items custom, soit le mode structuré */}
      {items ? items.map((it, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: S(10), fontWeight: 700, color: it.color || textColor, opacity: 0.9 }}>
            {it.label}
          </span>
          <span style={{ fontSize: S(11), fontWeight: 900, color: it.color || textColor }}>
            {it.value}
          </span>
        </div>
      )) : (
        <>
          {/* Ligne 1 : Base */}
          {typeof baseCoins === 'number' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: S(10), fontWeight: 700, color: textColor, opacity: 0.85 }}>
                ✅ {correctCount} bonne{correctCount > 1 ? 's' : ''} × {coinsPerCorrect}
              </span>
              <span style={{ fontSize: S(11), fontWeight: 900, color: textColor }}>
                +{baseCoins} <CoinImg />
              </span>
            </div>
          )}
          {/* Ligne 2 : Bonus (si > 0) */}
          {bonusCoins > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: S(10), fontWeight: 700, color: '#FDE047', opacity: 0.95 }}>
                ⭐ Bonus {isPerfect ? 'Perfect' : ''}
              </span>
              <span style={{ fontSize: S(11), fontWeight: 900, color: '#FDE047' }}>
                +{bonusCoins} <CoinImg />
              </span>
            </div>
          )}
        </>
      )}

      {/* Séparateur */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.18)', margin: `${S(2)} 0` }} />

      {/* Total */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: S(11), fontWeight: 900, color: textColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Total
        </span>
        <span style={{ fontSize: S(16), fontWeight: 900, color: totalColor }}>
          +{total} <CoinImg />
        </span>
      </div>

      {/* Mini stats secondaires */}
      {footerStats && footerStats.length > 0 && (
        <div style={{ display: 'flex', gap: S(12), justifyContent: 'center', marginTop: S(2), opacity: 0.6 }}>
          {footerStats.map((s, i) => (
            <span key={i} style={{ fontSize: S(9), fontWeight: 700, color: s.color || textColor }}>
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
