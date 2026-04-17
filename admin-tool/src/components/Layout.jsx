import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { logout } from '../lib/auth'

const NAV = [
  { to: '/',              label: 'Dashboard',   icon: '📊' },
  { to: '/facts',         label: 'Facts',       icon: '📋' },
  { to: '/facts-mobile',  label: 'Fact Mobile', icon: '📱' },
  { to: '/generate',      label: 'Générer',     icon: '✨' },
  { to: '/images',        label: 'Images',      icon: '📸' },
  { to: '/archived',      label: 'Supprimés',   icon: '🗑' },
]

export default function Layout({ toast }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function closeMenu() { setMenuOpen(false) }

  // Tailwind responsive note:
  // - Mobile  : aside is `fixed` (out of flow) + slides in/out via translate
  // - Desktop : aside is `md:static` (in flex flow), always translated to 0

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden">

      {/* ── Backdrop (mobile only) ─────────────────────────────────── */}
      <div
        className={`fixed inset-0 z-30 bg-black/60 transition-opacity duration-300 md:hidden ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMenu}
      />

      {/* ── Sidebar ─────────────────────────────────────────────────
          Mobile  : fixed, slides from left (translateX)
          Desktop : static in flex flow, always visible               */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-40
          w-52 shrink-0 flex flex-col
          bg-slate-950 border-r border-slate-800
          transition-transform duration-300 ease-in-out
          md:translate-x-0
          ${menuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo + mobile close button */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-lg font-black" style={{ color: '#FF6B1A' }}>🤯 WTF! Admin</div>
            <div className="text-xs text-slate-500 mt-0.5">Facts Manager</div>
          </div>
          <button
            onClick={closeMenu}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 active:bg-slate-700 transition-all shrink-0 text-lg"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              onClick={closeMenu}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive ? '' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`
              }
              style={({ isActive }) =>
                isActive ? { color: '#FF6B1A', background: 'rgba(255,107,26,0.15)' } : {}
              }
            >
              <span className="text-base">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-all"
          >
            <span>🚪</span>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile top bar (hamburger + title) */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-slate-950 border-b border-slate-800 shrink-0">
          <button
            onClick={() => setMenuOpen(true)}
            className="w-10 h-10 flex flex-col items-center justify-center gap-[5px] rounded-xl hover:bg-slate-800 active:bg-slate-700 transition-all shrink-0"
            aria-label="Ouvrir le menu"
          >
            <span className="block w-5 h-0.5 rounded-full bg-slate-300" />
            <span className="block w-5 h-0.5 rounded-full bg-slate-300" />
            <span className="block w-5 h-0.5 rounded-full bg-slate-300" />
          </button>
          <span className="text-base font-black" style={{ color: '#FF6B1A' }}>🤯 WTF! Admin</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet context={{ toast }} />
        </main>
      </div>
    </div>
  )
}
