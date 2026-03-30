import { useNavigate, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/',           icon: '🏠', label: 'Accueil' },
  { path: '/collection', icon: '📚', label: 'Collection' },
  { path: '/trophees',   icon: '🏆', label: 'Trophées',  soon: true },
  { path: '/classement', icon: '⚡', label: 'Blitz',     soon: true },
  { path: '/profil',     icon: '👤', label: 'Profil',    soon: true },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div
      className="fixed bottom-0 left-0 right-0 flex items-center justify-around px-2 pb-safe"
      style={{
        zIndex: 50,
        background: 'rgba(10, 20, 35, 0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        height: 64,
        maxWidth: 480,
        margin: '0 auto',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
      }}
    >
      {NAV_ITEMS.map(item => {
        const isActive = location.pathname === item.path
        return (
          <button
            key={item.path}
            onClick={() => !item.soon && navigate(item.path)}
            className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl active:scale-90 transition-all relative"
            style={{ opacity: item.soon ? 0.35 : 1 }}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span
              className="text-xs font-bold leading-none"
              style={{ color: isActive ? '#FF6B1A' : 'rgba(255,255,255,0.4)', fontSize: 10 }}
            >
              {item.label}
            </span>
            {isActive && (
              <div
                className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full"
                style={{ width: 20, height: 2.5, background: '#FF6B1A' }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
