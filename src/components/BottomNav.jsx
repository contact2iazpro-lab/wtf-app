import { useNavigate, useLocation } from 'react-router-dom'
import { useScale } from '../hooks/useScale'

const NAV_ITEMS = [
  { path: '/boutique',    slug: 'boutique',   label: 'Boutique' },
  { path: '/recompenses', slug: 'trophees',   label: 'Trophées' },
  { path: '/',            slug: 'accueil',    label: 'Accueil',  center: true },
  { path: '/social',      slug: 'amis',       label: 'Amis' },
  { path: '/collection',  slug: 'collection', label: 'Collection' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const scale = useScale()
  const S = (px) => `calc(${px}px * ${scale})`

  return (
    <div
      style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 448, zIndex: 50,
        boxSizing: 'border-box',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around',
        padding: `${S(4)} ${S(4)} ${S(10)}`,
        background: 'rgba(255,255,255,0.95)',
      }}
    >
      {NAV_ITEMS.map(item => {
        const isActive = item.center
          ? location.pathname === '/'
          : location.pathname === item.path

        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: S(2),
              background: 'none', border: 'none',
              cursor: 'pointer', padding: `0 ${S(6)}`,
              position: 'relative',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {item.center ? (
              <div style={{
                width: S(38), height: S(38), borderRadius: '50%',
                background: '#FF6B1A',
                border: '3px solid white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: S(-14),
                boxShadow: '0 2px 10px rgba(255,107,26,0.4)',
              }}>
                <img
                  src={`/assets/nav/${item.slug}.png`}
                  alt={item.label}
                  style={{ width: S(18), height: S(18), filter: 'brightness(0) invert(1)' }}
                />
              </div>
            ) : (
              <img
                src={`/assets/nav/${item.slug}.png`}
                alt={item.label}
                style={{
                  width: S(22), height: S(22),
                  opacity: isActive ? 1 : 0.6,
                  transition: 'all 0.2s ease',
                }}
              />
            )}
            <span style={{
              fontSize: S(10), fontWeight: 700,
              color: isActive ? '#FF6B1A' : '#666',
            }}>
              {item.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
