import { forwardRef } from 'react'
import { useScale } from '../hooks/useScale'
import { ICON_SIZES } from '../constants/layoutConfig'

const ModeIcon = forwardRef(({ icon, name, color, onClick }, ref) => {
  const scale = useScale()
  const S = (px) => `calc(${px}px * var(--scale))`

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
      onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.92)')}
      onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <div style={{
        width: S(ICON_SIZES.modeIcon + 8), height: S(ICON_SIZES.modeIcon + 8),
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.08)',
        border: color ? `2px solid ${color}44` : '2px solid rgba(255,255,255,0.12)',
        boxShadow: color ? `0 0 12px ${color}30` : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <img
          src={icon} alt={name}
          style={{
            width: S(ICON_SIZES.modeIcon), height: S(ICON_SIZES.modeIcon),
            objectFit: 'contain', flexShrink: 0,
            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.35))',
          }}
        />
      </div>
      <span style={{
        fontSize: S(11), fontWeight: 700, color: '#ffffff',
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
