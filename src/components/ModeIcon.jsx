import { forwardRef } from 'react'
import { useScale } from '../hooks/useScale'
import { ICON_SIZES } from '../constants/layoutConfig'

const ModeIcon = forwardRef(({ icon, emoji, name, color, bgColor, onClick, sizeOverride }, ref) => {
  const scale = useScale()
  const S = (px) => `calc(${px}px * var(--scale))`
  const size = sizeOverride || ICON_SIZES.modeIcon

  return (
    <button
      ref={ref}
      onClick={onClick}
      aria-label={name}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: S(4),
        background: 'none', border: 'none', padding: 0,
        cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        transition: 'transform 0.1s',
      }}
      onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.95)')}
      onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <div style={{
        width: S(size + 6), height: S(size + 6),
        borderRadius: '50%',
        border: 'none',
        boxShadow: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        background: icon ? 'transparent' : (bgColor || 'linear-gradient(135deg, #FF6B1A, #C0392B)'),
      }}>
        {icon ? (
          <img
            src={icon} alt={name}
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover', flexShrink: 0,
            }}
          />
        ) : (
          <span style={{
            fontSize: S(size * 0.5),
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
          }}>{emoji}</span>
        )}
      </div>
      <span style={{
        fontSize: S(11), fontWeight: 700, color: color || '#ffffff',
        fontFamily: 'Nunito, sans-serif',
        textShadow: '0 1px 3px rgba(0,0,0,0.4)',
        lineHeight: 1,
      }}>
        {name}
      </span>
    </button>
  )
})

ModeIcon.displayName = 'ModeIcon'
export default ModeIcon
