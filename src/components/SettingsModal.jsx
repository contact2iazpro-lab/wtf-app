import { useState } from 'react'
import { audio } from '../utils/audio'
import { useAuth } from '../context/AuthContext'
import HowToPlayModal from './HowToPlayModal'

// Red diagonal "no" bar overlay
function NoBar() {
  return (
    <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none" style={{ borderRadius: '50%' }}>
      <div style={{
        position: 'absolute', top: '50%', left: '-10%', width: '120%', height: 4,
        background: '#EF4444', transform: 'translateY(-50%) rotate(-45deg)', borderRadius: 2,
      }} />
    </div>
  )
}

// Circular icon toggle button (light-bg variant)
function IconToggle({ label, icon, on, onToggle }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={onToggle}
        className="relative flex items-center justify-center active:scale-90 transition-all"
        style={{
          width: 64, height: 64, borderRadius: '50%',
          background: on ? '#22C55E' : '#E5E7EB',
          border: `3px solid ${on ? '#16A34A' : '#D1D5DB'}`,
          boxShadow: on ? '0 3px 12px rgba(34,197,94,0.35)' : 'none',
        }}
      >
        <span style={{ fontSize: 26 }}>{icon}</span>
        {!on && <NoBar />}
      </button>
      <span className="text-xs font-bold" style={{ color: on ? '#15803D' : '#9CA3AF' }}>{label}</span>
    </div>
  )
}

function resetLocalProgress() {
  try {
    localStorage.setItem('wtf_data', JSON.stringify({
      totalScore: 0, streak: 0, lastDay: new Date().toDateString(), unlockedFacts: [],
    }))
  } catch { /* ignore */ }
}

// ─── Provider row — always visible, independent state ───────────────────────
function ProviderRow({ providerKey, label, isConnectedWithThis, email, loading, onConnect, onDisconnect }) {
  const isFacebook = providerKey === 'facebook'

  const Logo = isFacebook ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )

  const bgColor = isFacebook ? '#1877F2' : '#FF8C00'

  if (isConnectedWithThis) {
    return (
      <div className="rounded-2xl p-3 mb-2" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: bgColor }}>
            {Logo}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-xs" style={{ color: '#15803D' }}>✅ Connecté — {label}</p>
            {email && <p className="text-xs truncate" style={{ color: '#6B7280' }}>{email}</p>}
          </div>
          <button
            onClick={onDisconnect}
            disabled={loading === 'signout'}
            className="px-3 py-1.5 rounded-xl font-black text-xs active:scale-95 transition-all shrink-0"
            style={{ background: '#EF4444', color: 'white' }}
          >
            {loading === 'signout' ? '...' : 'Déconnexion'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={onConnect}
      disabled={!!loading}
      className="w-full flex items-center gap-3 py-3.5 rounded-2xl font-black text-white mb-2 active:scale-95 transition-all"
      style={{ background: loading ? '#9CA3AF' : bgColor, opacity: loading ? 0.6 : 1 }}
    >
      <span className="pl-4">{Logo}</span>
      <span className="flex-1 text-sm text-left">Se connecter avec {label}</span>
    </button>
  )
}

// ─── Save progression modal ──────────────────────────────────────────────────
function SaveProgressModal({ onClose }) {
  const { user, isConnected, signInWithGoogle, signInWithFacebook, signOut } = useAuth()
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(null) // 'google' | 'facebook' | 'signout' | null
  const [pendingProvider, setPendingProvider] = useState(null)

  const provider = user?.app_metadata?.provider
  const email = user?.email ?? ''
  const isGoogleUser = isConnected && provider === 'google'
  const isFacebookUser = isConnected && provider === 'facebook'

  const handleSignOut = async () => {
    setLoading('signout')
    await signOut()
    setLoading(null)
    onClose()
  }

  const confirmSignIn = async () => {
    resetLocalProgress()
    setError(null)
    const p = pendingProvider
    setLoading(p)
    setPendingProvider(null)
    try {
      if (p === 'google') await signInWithGoogle()
      else await signInWithFacebook()
    } catch (e) { setError(e.message); setLoading(null) }
  }

  // Warning confirmation step
  if (pendingProvider) {
    const providerLabel = pendingProvider === 'google' ? 'Google' : 'Facebook'
    return (
      <div className="fixed inset-0 flex items-center justify-center p-5" style={{ zIndex: 200, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}>
        <div className="w-full rounded-3xl overflow-hidden" style={{ maxWidth: 340, background: '#FAFAF8', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
          <div className="flex items-center justify-between px-5 py-3 rounded-t-3xl" style={{ background: '#FEE2E2' }}>
            <span className="font-black text-base" style={{ color: '#991B1B' }}>⚠️ Attention</span>
            <button onClick={() => setPendingProvider(null)} className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white active:scale-90" style={{ background: '#EF4444' }}>✕</button>
          </div>
          <div className="p-5">
            <p className="text-sm mb-5 font-semibold text-center" style={{ color: '#374151', lineHeight: '1.65' }}>
              La connexion à un compte {providerLabel} réinitialisera ta progression locale
              <span style={{ color: '#EF4444', fontWeight: 700 }}> (streak, points, f*cts débloqués)</span>.
              <br /><br />
              Cette action est <strong style={{ color: '#EF4444' }}>irréversible</strong>. Continuer ?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setPendingProvider(null)} className="flex-1 py-3 rounded-2xl font-black text-sm active:scale-95 transition-all" style={{ background: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB' }}>
                Annuler
              </button>
              <button onClick={confirmSignIn} className="flex-1 py-3 rounded-2xl font-black text-sm active:scale-95 transition-all text-white" style={{ background: '#EF4444' }}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-5" style={{ zIndex: 200, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="w-full rounded-3xl overflow-hidden" style={{ maxWidth: 360, background: '#FAFAF8', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3" style={{ background: '#D1FAE5', borderBottom: '1px solid #A7F3D0' }}>
          <span className="font-black text-base" style={{ color: '#065F46' }}>💾 Progression</span>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white active:scale-90" style={{ background: '#EF4444' }}>✕</button>
        </div>
        <div className="p-5">
          <p className="text-center text-sm mb-4 font-semibold" style={{ color: '#6B7280' }}>
            Connecte-toi pour sauvegarder<br />ta progression dans le cloud ☁️
          </p>
          {/* Facebook row — always visible */}
          <ProviderRow
            providerKey="facebook"
            label="Facebook"
            isConnectedWithThis={isFacebookUser}
            email={isFacebookUser ? email : ''}
            loading={loading}
            onConnect={() => { setError(null); setPendingProvider('facebook') }}
            onDisconnect={handleSignOut}
          />
          {/* Google row — always visible */}
          <ProviderRow
            providerKey="google"
            label="Google"
            isConnectedWithThis={isGoogleUser}
            email={isGoogleUser ? email : ''}
            loading={loading}
            onConnect={() => { setError(null); setPendingProvider('google') }}
            onDisconnect={handleSignOut}
          />
          {error && <p className="text-xs text-center mt-2" style={{ color: '#EF4444' }}>{error}</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Toggle pill ─────────────────────────────────────────────────────────────
function TogglePill({ on }) {
  return (
    <div className="relative w-12 h-6 rounded-full transition-all duration-200" style={{ background: on ? '#FF6B1A' : '#D1D5DB' }}>
      <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200" style={{ left: on ? '26px' : '2px' }} />
    </div>
  )
}

// ─── Main settings modal ─────────────────────────────────────────────────────
export default function SettingsModal({ onClose }) {
  const [musicOn, setMusicOn] = useState(audio.musicEnabled)
  const [sfxOn, setSfxOn] = useState(audio.sfxEnabled)
  const [vibOn, setVibOn] = useState(audio.vibrationEnabled)
  const [childMode, setChildMode] = useState(() => localStorage.getItem('wtf_child_mode') !== 'false')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showRulesModal, setShowRulesModal] = useState(false)

  const { user, isConnected } = useAuth()
  const connectedProvider = user?.app_metadata?.provider
  const connectedEmail = user?.email ?? ''

  const toggleMusic = () => { const n = !musicOn; setMusicOn(n); audio.setMusicEnabled(n) }
  const toggleSfx   = () => { const n = !sfxOn; setSfxOn(n); audio.setSfxEnabled(n); if (n) audio.play('click') }
  const toggleVib   = () => { const n = !vibOn; setVibOn(n); audio.setVibrationEnabled(n); if (n) audio.vibrate(40) }
  const toggleChildMode = () => { const n = !childMode; setChildMode(n); localStorage.setItem('wtf_child_mode', String(n)) }
  const handleViewRules = () => { audio.play('click'); setShowRulesModal(true) }

  const iconToggles = [
    { label: 'Musique',   icon: '🎵', on: musicOn, onToggle: toggleMusic },
    { label: 'Son',       icon: '🔊', on: sfxOn,   onToggle: toggleSfx },
    { label: 'Vibration', icon: '📳', on: vibOn,   onToggle: toggleVib },
    { label: 'Règles',    icon: '📖', on: true,    onToggle: handleViewRules },
  ]

  return (
    <>
      {showSaveModal && <SaveProgressModal onClose={() => setShowSaveModal(false)} />}
      {showRulesModal && <HowToPlayModal onClose={() => setShowRulesModal(false)} />}

      <div
        className="fixed inset-0 flex items-center justify-center p-5"
        style={{ zIndex: 100, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      >
        <div
          className="w-full max-w-sm rounded-3xl overflow-hidden"
          style={{ background: '#FAFAF8', boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4" style={{ background: '#FFF7ED', borderBottom: '1px solid #FED7AA' }}>
            <h2 className="font-black text-lg" style={{ color: '#1a1a2e' }}>⚙️ Paramètres</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white active:scale-90 text-sm" style={{ background: '#FF6B1A' }}>✕</button>
          </div>

          <div className="px-6 py-5">
            {/* 4 icon toggles */}
            <div className="flex justify-around mb-5">
              {iconToggles.map(t => <IconToggle key={t.label} {...t} />)}
            </div>

            <div className="h-px mb-4" style={{ background: 'rgba(0,0,0,0.08)' }} />

            {/* Save progression */}
            <button
              onClick={() => setShowSaveModal(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all active:scale-95 mb-3"
              style={{
                background: isConnected ? 'rgba(34,197,94,0.08)' : 'rgba(59,130,246,0.07)',
                borderColor: isConnected ? 'rgba(34,197,94,0.4)' : 'rgba(59,130,246,0.3)',
                color: '#1a1a2e',
              }}
            >
              <span className="text-lg">{isConnected ? '✅' : '💾'}</span>
              <span className="flex flex-col items-start min-w-0">
                <span className="font-bold text-sm">
                  {isConnected ? `Connecté — ${connectedProvider === 'google' ? 'Google' : 'Facebook'}` : 'Enregistrer votre progression'}
                </span>
                {isConnected && connectedEmail && (
                  <span className="text-xs truncate w-full" style={{ color: '#6B7280' }}>{connectedEmail}</span>
                )}
              </span>
            </button>

            {/* Mode Enfant */}
            <button
              onClick={toggleChildMode}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all active:scale-95"
              style={{
                background: childMode ? 'rgba(251,191,36,0.08)' : '#F9FAFB',
                borderColor: childMode ? 'rgba(251,191,36,0.4)' : '#E5E7EB',
              }}
            >
              <span className="flex items-center gap-3">
                <span className="text-2xl">{childMode ? '👶' : '🔞'}</span>
                <span className="font-bold text-sm" style={{ color: childMode ? '#92400E' : '#9CA3AF' }}>Mode Enfant</span>
              </span>
              <TogglePill on={childMode} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
