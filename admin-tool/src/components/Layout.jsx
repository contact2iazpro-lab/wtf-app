import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { logout } from '../lib/auth'

const NAV = [
  { to: '/',      label: 'Dashboard',  icon: '📊' },
  { to: '/facts', label: 'Facts',      icon: '📋' },
]

export default function Layout({ toast }) {
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 flex flex-col bg-slate-950 border-r border-slate-800">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-slate-800">
          <div className="text-lg font-black" style={{ color: '#FF6B1A' }}>🤯 WTF! Admin</div>
          <div className="text-xs text-slate-500 mt-0.5">Facts Manager</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-orange-DEFAULT/15 text-orange-DEFAULT'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`
              }
              style={({ isActive }) => isActive ? { color: '#FF6B1A', background: 'rgba(255,107,26,0.15)' } : {}}
            >
              <span>{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-all"
          >
            <span>🚪</span>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet context={{ toast }} />
      </main>
    </div>
  )
}
