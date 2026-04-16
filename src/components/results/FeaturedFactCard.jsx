/**
 * FeaturedFactCard — card "Le plus WTF" mise en avant à la fin d'une session.
 * Priorise un VIP si présent, sinon prend le dernier fact unlocké.
 *
 * Animation : glow pulse sur la couleur catégorie.
 */

import { CATEGORIES } from '../../data/facts'

const S = (px) => `calc(${px}px * var(--scale))`

export default function FeaturedFactCard({
  fact,
  fallbackColor = '#FF6B1A',
  textColor = '#ffffff',
  isQuickie = false,
  onClick,
}) {
  if (!fact) return null
  const fCat = CATEGORIES.find(c => c.id === fact.category)
  const fColor = fCat?.color || fallbackColor
  const glowColor = isQuickie ? '#7F77DD' : fColor

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: S(10),
        background: isQuickie ? 'rgba(127,119,221,0.15)' : `linear-gradient(135deg, ${fColor}33, ${fColor}11)`,
        border: `2px solid ${glowColor}`,
        borderRadius: S(14), padding: S(10), flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: `0 0 24px ${glowColor}55`,
        animation: 'wtf-featured-glow 2.4s ease-in-out infinite',
        position: 'relative', overflow: 'hidden',
      }}
    >
      <style>{`@keyframes wtf-featured-glow {
        0%, 100% { box-shadow: 0 0 14px ${glowColor}33; }
        50%      { box-shadow: 0 0 30px ${glowColor}88; }
      }`}</style>
      {/* Image carrée */}
      <div style={{
        width: S(64), height: S(64), borderRadius: S(10),
        background: `linear-gradient(135deg, ${fColor}66, ${fColor})`,
        flexShrink: 0, overflow: 'hidden', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        border: `1.5px solid ${fColor}`,
      }}>
        {fact.imageUrl ? (
          <img
            src={fact.imageUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { e.target.style.display = 'none' }}
          />
        ) : (
          <span style={{ fontSize: S(22) }}>{fCat?.emoji || '⭐'}</span>
        )}
      </div>
      {/* Texte */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: S(9), fontWeight: 900, color: glowColor,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          marginBottom: S(2), display: 'flex', alignItems: 'center', gap: S(4),
        }}>
          ⭐ {fact.isVip ? 'LE PLUS WTF DE TA SESSION (VIP)' : 'LE PLUS WTF DE TA SESSION'}
        </div>
        <div style={{
          fontSize: S(11), fontWeight: 800, color: textColor, lineHeight: 1.25,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {fact.question || fact.shortAnswer || fCat?.label || '—'}
        </div>
      </div>
      {/* Chevron */}
      <span style={{
        fontSize: S(16), color: fColor, flexShrink: 0, fontWeight: 900,
      }}>›</span>
    </div>
  )
}
