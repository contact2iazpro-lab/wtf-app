import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useScale } from '../hooks/useScale'

const NAV_ITEMS = [
  { path: '/boutique',    slug: 'boutique',   label: 'Boutique' },
  { path: '/recompenses', slug: 'trophees',   label: 'Trophées' },
  { path: '/',            slug: 'accueil',    label: 'Accueil',  center: true },
  { path: '/social',      slug: 'amis',       label: 'Amis' },
  { path: '/collection',  slug: 'collection', label: 'Collection' },
]

function readPendingCount() {
  try {
    const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    return wd.pendingChallengesCount || 0
  } catch { return 0 }
}

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const scale = useScale()
  const S = (px) => `calc(${px}px * ${scale})`
  const [pendingCount, setPendingCount] = useState(readPendingCount)
  useEffect(() => {
    const refresh = () => setPendingCount(readPendingCount())
    window.addEventListener('wtf_pending_challenges_updated', refresh)
    window.addEventListener('wtf_storage_sync', refresh)
    return () => {
      window.removeEventListener('wtf_pending_challenges_updated', refresh)
      window.removeEventListener('wtf_storage_sync', refresh)
    }
  }, [])

  return (
    <div
      style={{
        position: 'sticky', bottom: 0,
        width: '100%', zIndex: 50, boxSizing: 'border-box',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around',
        padding: `${S(4)} ${S(4)} ${S(10)}`,
        background: 'rgba(255,255,255,0.95)',
        flexShrink: 0,
      }}
    >
      {NAV_ITEMS.map(item => {
        const isActive = item.center
          ? location.pathname === '/'
          : location.pathname === item.path
        const showBadge = item.slug === 'amis' && pendingCount > 0

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
              <div style={{ position: 'relative' }}>
                <img
                  src={`/assets/nav/${item.slug}.png`}
                  alt={item.label}
                  style={{
                    width: S(22), height: S(22),
                    opacity: isActive ? 1 : 0.6,
                    transition: 'all 0.2s ease',
                  }}
                />
                {showBadge && (
                  <span
                    aria-label={`${pendingCount} défi${pendingCount > 1 ? 's' : ''} en attente`}
                    style={{
                      position: 'absolute',
                      top: -6, right: -8,
                      minWidth: 16, height: 16,
                      padding: '0 4px',
                      borderRadius: 8,
                      background: '#EF4444',
                      border: '2px solid white',
                      color: 'white',
                      fontSize: 9, fontWeight: 900,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'Nunito, sans-serif',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                    }}
                  >
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </div>
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
