import { forwardRef } from 'react'
import { useScale } from '../hooks/useScale'
import { ICON_SIZES } from '../constants/layoutConfig'

const ModeIcon = forwardRef(({ icon, name, color, onClick }, ref) => {
  const scale = useScale()
  const S = (px) => `calc(${px}px * var(--scale))`
  const size = ICON_SIZES.modeIcon

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
        border: `2.5px solid ${color || 'rgba(255,255,255,0.3)'}`,
        boxShadow: color ? `0 0 14px ${color}55` : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <img
          src={icon} alt={name}
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover', flexShrink: 0,
          }}
        />
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
