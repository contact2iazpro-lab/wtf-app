import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import CoinsIcon from '../CoinsIcon'

export default function UserMenu() {
  const { user, profile, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  if (!user) return null

  const displayName = profile?.username || user.email?.split('@')[0] || 'Joueur'
  const coins = profile?.coins ?? 0
  const streak = profile?.streak_current ?? 0

  const handleSignOut = async () => {
    setOpen(false)
    await signOut()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-2xl active:scale-95 transition-all"
        style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}
      >
        {/* Avatar */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black"
          style={{ background: '#FF6B1A', color: 'white' }}
        >
          {displayName[0].toUpperCase()}
        </div>
        <span className="text-xs font-bold text-white max-w-20 truncate">{displayName}</span>
        {coins > 0 && (
          <span className="text-xs font-bold flex items-center gap-0.5" style={{ color: '#FCD34D' }}><CoinsIcon size={14} />{coins}</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0" style={{ zIndex: 90 }} onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 mt-2 rounded-2xl border overflow-hidden"
            style={{ zIndex: 100, background: '#fff', minWidth: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', borderColor: 'rgba(0,0,0,0.08)' }}
          >
            {/* User info */}
            <div className="px-4 py-3 border-b" style={{ borderColor: '#F3F4F6' }}>
              <p className="font-black text-sm" style={{ color: '#1a1a2e' }}>{displayName}</p>
              <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{user.email}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs font-bold" style={{ color: '#6B7280' }}>🔥 {streak} streak</span>
                <span className="text-xs font-bold flex items-center gap-1" style={{ color: '#6B7280' }}><CoinsIcon size={12} /> {coins} coins</span>
              </div>
            </div>

            {/* Menu items */}
            <div className="py-1">
              <button
                className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
                style={{ color: '#374151' }}
                onClick={() => setOpen(false)}
              >
                👤 Mon profil
              </button>
              <button
                className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
                style={{ color: '#374151' }}
                onClick={() => setOpen(false)}
              >
                🏆 Mes trophées
              </button>
              <button
                className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
                style={{ color: '#374151' }}
                onClick={() => setOpen(false)}
              >
                🛍️ Boutique
              </button>
            </div>

            <div className="border-t py-1" style={{ borderColor: '#F3F4F6' }}>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-red-50 transition-colors"
                style={{ color: '#EF4444' }}
              >
                🚪 Se déconnecter
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
