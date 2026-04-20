/**
 * ResultsRankHeader — emoji rank + label + 3 étoiles + badge Perfect.
 *
 * Composant d'affichage pur : toutes les valeurs animées (rankVisible, visibleStars,
 * animatedScore…) sont passées en props par le parent qui gère ses useEffect.
 * Permet de réutiliser la tête d'écran entre ResultsScreen, BlitzResults, DuelResults,
 * etc. sans dupliquer le layout + les classes.
 */

const S = (px) => `calc(${px}px * var(--scale))`

export default function ResultsRankHeader({
  emoji,
  customIcon = null,
  label,
  stars = 0,
  visibleStars = 0,
  rankVisible = true,
  catColor = '#FF6B1A',
  textOnBg = '#ffffff',
  isPerfect = false,
  hideEmoji = false,
  hideStars = false,
  largeLabelFont = false,
}) {
  // Quand hideEmoji : label + étoiles inline (gagne de la hauteur — ex. Quickie)
  const inlineStars = hideEmoji
  return (
    <>
      {/* Rang + étoiles */}
      <div style={{ display: 'flex', flexDirection: hideEmoji ? 'row' : 'row', alignItems: 'center', justifyContent: 'center', gap: S(10), flexShrink: 0, flexWrap: 'wrap' }}>
        {!hideEmoji && (
          <div
            style={{
              fontSize: S(38), lineHeight: 1,
              transform: rankVisible ? 'scale(1)' : 'scale(0)',
              transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}>
            {customIcon
              ? <img src={customIcon} alt="" style={{ width: S(42), height: S(42), objectFit: 'contain' }} />
              : emoji === 'wtf-star'
                ? <img src="/assets/ui/wtf-star.png" alt="" style={{ width: S(42), height: S(42), objectFit: 'contain' }} />
                : emoji}
          </div>
        )}
        <div style={{
          display: 'flex',
          flexDirection: inlineStars ? 'row' : 'column',
          alignItems: 'center',
          gap: inlineStars ? S(10) : S(4),
        }}>
          <div
            style={{
              fontSize: largeLabelFont ? S(18) : S(13), fontWeight: 900, color: textOnBg, lineHeight: 1.2,
              textAlign: 'center',
              transform: rankVisible ? 'scale(1)' : 'scale(0)',
              transformOrigin: 'center center',
              transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.08s',
            }}>
            {label}
          </div>
          {!hideStars && (
            <div style={{ display: 'flex', gap: S(3), justifyContent: 'center' }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <span
                  key={s}
                  style={{
                    fontSize: S(16), lineHeight: 1,
                    transform: s <= visibleStars ? 'scale(1)' : 'scale(0)',
                    transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    filter: s <= stars ? `drop-shadow(0 0 10px ${catColor})` : 'none',
                    opacity: s <= stars ? 1 : 0.2,
                  }}>
                  <img src="/assets/ui/wtf-star.png" alt="" style={{ width: S(16), height: S(16), objectFit: 'contain' }} />
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Badge Perfect */}
      {isPerfect && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(6),
          background: 'linear-gradient(135deg, rgba(253,224,71,0.22), rgba(245,158,11,0.35))',
          border: '1.5px solid rgba(253,224,71,0.6)',
          borderRadius: S(14), padding: `${S(6)} ${S(16)}`, flexShrink: 0,
        }}>
          <img src="/assets/ui/wtf-star.png" alt="" style={{ width: S(16), height: S(16), objectFit: 'contain' }} />
          <span style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: S(12), color: '#FDE047', letterSpacing: '0.05em' }}>PERFECT !</span>
          <img src="/assets/ui/wtf-star.png" alt="" style={{ width: S(16), height: S(16), objectFit: 'contain' }} />
        </div>
      )}
    </>
  )
}
