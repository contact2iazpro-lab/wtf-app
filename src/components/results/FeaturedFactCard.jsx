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
  onClick,
}) {
  if (!fact) return null
  const fCat = CATEGORIES.find(c => c.id === fact.category)
  const fColor = fCat?.color || fallbackColor

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: S(10),
        background: `linear-gradient(135deg, ${fColor}33, ${fColor}11)`,
        border: `1.5px solid ${fColor}`,
        borderRadius: S(12), padding: S(8), flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: `0 0 20px ${fColor}44`,
        animation: 'wtf-featured-glow 2.4s ease-in-out infinite',
        position: 'relative', overflow: 'hidden',
      }}
    >
      <style>{`@keyframes wtf-featured-glow {
        0%, 100% { box-shadow: 0 0 14px ${fColor}33; }
        50%      { box-shadow: 0 0 26px ${fColor}77; }
      }`}</style>
      {/* Image carrée */}
      <div style={{
        width: S(52), height: S(52), borderRadius: S(8),
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
          fontSize: S(8), fontWeight: 900, color: fColor,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          marginBottom: S(2), display: 'flex', alignItems: 'center', gap: S(4),
        }}>
          ✨ {fact.isVip ? 'Le plus WTF (VIP)' : 'Le plus WTF'}
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
