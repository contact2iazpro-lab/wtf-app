import { useState } from 'react'
import { audio } from '../utils/audio'
import { useAuth } from '../context/AuthContext'

// Red diagonal "no" bar overlay
function NoBar() {
  return (
    <div
      className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
      style={{ borderRadius: '50%' }}
    >
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '-10%',
        width: '120%',
        height: 4,
        background: '#EF4444',
        transform: 'translateY(-50%) rotate(-45deg)',
        borderRadius: 2,
      }} />
    </div>
  )
}

// Circular icon toggle button
function IconToggle({ label, icon, on, onToggle }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={onToggle}
        className="relative flex items-center justify-center active:scale-90 transition-all"
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: on ? '#22C55E' : '#374151',
          border: `3px solid ${on ? '#16A34A' : '#4B5563'}`,
          boxShadow: on ? '0 3px 12px rgba(34,197,94,0.35)' : 'none',
        }}
      >
        <span style={{ fontSize: 26 }}>{icon}</span>
        {!on && <NoBar />}
      </button>
      <span className="text-xs font-bold" style={{ color: on ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)' }}>
        {label}
      </span>
    </div>
  )
}

function resetLocalProgress() {
  try {
    localStorage.setItem('wtf_data', JSON.stringify({
      totalScore: 0, streak: 0,
      lastDay: new Date().toDateString(),
      unlockedFacts: [],
    }))
  } catch { /* ignore */ }
}

// Save progression modal
function SaveProgressModal({ onClose }) {
  const { user, isConnected, signInWithGoogle, signInWithFacebook, signOut } = useAuth()
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(null) // 'google' | 'facebook' | 'signout' | null
  const [pendingProvider, setPendingProvider] = useState(null) // 'google' | 'facebook' | null

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
    setLoading(pendingProvider)
    setPendingProvider(null)
    try {
      if (pendingProvider === 'google') await signInWithGoogle()
      else await signInWithFacebook()
    } catch (e) { setError(e.message); setLoading(null) }
  }

  // Warning confirmation step
  if (pendingProvider) {
    const providerLabel = pendingProvider === 'google' ? 'Google' : 'Facebook'
    return (
      <div
        className="fixed inset-0 flex items-center justify-center p-5"
        style={{ zIndex: 200, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
      >
        <div
          className="w-full rounded-3xl overflow-hidden"
          style={{ maxWidth: 340, background: '#0f2035', border: '2px solid rgba(239,68,68,0.4)' }}
        >
          <div className="flex items-center justify-between px-5 py-3" style={{ background: '#7f1d1d' }}>
            <span className="font-black text-white text-base">⚠️ Attention</span>
            <button onClick={() => setPendingProvider(null)} className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white active:scale-90" style={{ background: '#EF4444' }}>✕</button>
          </div>
          <div className="p-5">
            <p className="text-sm mb-5 font-bold text-center" style={{ color: 'rgba(255,255,255,0.85)', lineHeight: '1.6' }}>
              La connexion à un compte {providerLabel} réinitialisera ta progression locale actuelle
              <span style={{ color: '#FCA5A5' }}> (streak, points, facts débloqués)</span>.
              <br /><br />
              Cette action est <strong style={{ color: '#EF4444' }}>irréversible</strong>. Continuer ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingProvider(null)}
                className="flex-1 py-3 rounded-2xl font-black text-sm active:scale-95 transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}
              >
                Annuler
              </button>
              <button
                onClick={confirmSignIn}
                className="flex-1 py-3 rounded-2xl font-black text-sm active:scale-95 transition-all"
                style={{ background: '#EF4444', color: 'white' }}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-5"
      style={{ zIndex: 200, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-3xl overflow-hidden"
        style={{ maxWidth: 340, background: '#0f2035', border: '2px solid rgba(255,255,255,0.12)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3" style={{ background: '#1a4a2e' }}>
          <span className="font-black text-white text-base">Progression</span>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white active:scale-90" style={{ background: '#EF4444' }}>✕</button>
        </div>

        {/* Body */}
        <div className="p-5">
          {/* Already connected */}
          {isConnected ? (
            <>
              <div className="flex flex-col items-center gap-2 mb-5 p-4 rounded-2xl" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
                <span className="text-3xl">{isGoogleUser ? '🔵' : '🔷'}</span>
                <span className="font-black text-white text-sm">
                  Connecté avec {isGoogleUser ? 'Google' : 'Facebook'}
                </span>
                {email && (
                  <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>{email}</span>
                )}
                <span className="text-xs font-bold" style={{ color: '#22C55E' }}>✅ Progression sauvegardée</span>
              </div>
              <button
                onClick={handleSignOut}
                disabled={loading === 'signout'}
                className="w-full py-3.5 rounded-2xl font-black text-white active:scale-95 transition-all"
                style={{ background: loading === 'signout' ? '#6B7280' : '#EF4444' }}
              >
                {loading === 'signout' ? '...' : 'Se déconnecter'}
              </button>
            </>
          ) : (
            <>
              <p className="text-center text-sm mb-5 font-bold" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Connectez-vous pour enregistrer<br />votre progression !
              </p>

              {/* Facebook */}
              <button
                onClick={() => { setError(null); setPendingProvider('facebook') }}
                disabled={!!loading}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-black text-white mb-3 active:scale-95 transition-all"
                style={{ background: '#1877F2', opacity: loading ? 0.5 : 1 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Se connecter avec Facebook
              </button>

              {/* Google */}
              <button
                onClick={() => { setError(null); setPendingProvider('google') }}
                disabled={!!loading}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-black text-white active:scale-95 transition-all"
                style={{ background: '#FF8C00', opacity: loading ? 0.5 : 1 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Se connecter avec Google
              </button>

              {error && <p className="text-xs text-center mt-3" style={{ color: '#EF4444' }}>{error}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Toggle pill (reusable)
function TogglePill({ on }) {
  return (
    <div className="relative w-12 h-6 rounded-full transition-all duration-200" style={{ background: on ? '#FF6B1A' : 'rgba(255,255,255,0.12)' }}>
      <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200" style={{ left: on ? '26px' : '2px' }} />
    </div>
  )
}

export default function SettingsModal({ onClose, onShowRules }) {
  const [musicOn, setMusicOn] = useState(audio.musicEnabled)
  const [sfxOn, setSfxOn] = useState(audio.sfxEnabled)
  const [vibOn, setVibOn] = useState(audio.vibrationEnabled)
  const [hintsOn, setHintsOn] = useState(() => localStorage.getItem('wtf_hints_enabled') !== 'false')
  const [autoShowRules, setAutoShowRules] = useState(() => localStorage.getItem('wtf_hide_howtoplay') !== 'true')
  const [childMode, setChildMode] = useState(() => localStorage.getItem('wtf_child_mode') !== 'false')
  const [showSaveModal, setShowSaveModal] = useState(false)

  const { user, isConnected } = useAuth()
  const connectedProvider = user?.app_metadata?.provider
  const connectedEmail = user?.email ?? ''

  const toggleMusic = () => { const n = !musicOn; setMusicOn(n); audio.setMusicEnabled(n) }
  const toggleSfx = () => { const n = !sfxOn; setSfxOn(n); audio.setSfxEnabled(n); if (n) audio.play('click') }
  const toggleVib = () => { const n = !vibOn; setVibOn(n); audio.setVibrationEnabled(n); if (n) audio.vibrate(40) }
  const toggleHints = () => { const n = !hintsOn; setHintsOn(n); localStorage.setItem('wtf_hints_enabled', String(n)) }
  const toggleAutoShowRules = () => {
    const n = !autoShowRules; setAutoShowRules(n)
    n ? localStorage.removeItem('wtf_hide_howtoplay') : localStorage.setItem('wtf_hide_howtoplay', 'true')
  }
  const toggleChildMode = () => { const n = !childMode; setChildMode(n); localStorage.setItem('wtf_child_mode', String(n)) }
  const handleViewRules = () => { audio.play('click'); onShowRules?.(); onClose() }

  const iconToggles = [
    { label: 'Musique',   icon: '🎵', on: musicOn, onToggle: toggleMusic },
    { label: 'Son',       icon: '🔊', on: sfxOn,   onToggle: toggleSfx },
    { label: 'Vibration', icon: '📳', on: vibOn,   onToggle: toggleVib },
    { label: 'Indices',   icon: '💡', on: hintsOn, onToggle: toggleHints },
  ]

  return (
    <>
      {showSaveModal && <SaveProgressModal onClose={() => setShowSaveModal(false)} />}

      <div
        className="fixed inset-0 flex items-end justify-center"
        style={{ zIndex: 100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-t-3xl p-6 pb-10"
          style={{ background: 'rgba(18,18,28,0.97)', border: '1px solid rgba(255,255,255,0.12)' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white font-black text-lg tracking-wide">⚙️ Paramètres</h2>
          </div>

          {/* 4 circular icon toggles */}
          <div className="flex justify-around mb-6">
            {iconToggles.map(t => <IconToggle key={t.label} {...t} />)}
          </div>

          <div className="h-px mb-4" style={{ background: 'rgba(255,255,255,0.1)' }} />

          {/* Save progression */}
          <button
            onClick={() => setShowSaveModal(true)}
            className="w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl border transition-all active:scale-95 mb-3"
            style={{
              background: isConnected ? 'rgba(34,197,94,0.12)' : 'rgba(59,130,246,0.12)',
              borderColor: isConnected ? 'rgba(34,197,94,0.35)' : 'rgba(59,130,246,0.35)',
              color: 'white',
            }}
          >
            <span className="text-lg">{isConnected ? '✅' : '💾'}</span>
            <span className="flex flex-col items-start min-w-0">
              <span className="font-bold text-sm">
                {isConnected
                  ? `Connecté — ${connectedProvider === 'google' ? 'Google' : 'Facebook'}`
                  : 'Enregistrer votre progression'}
              </span>
              {isConnected && connectedEmail && (
                <span className="text-xs truncate w-full" style={{ color: 'rgba(255,255,255,0.5)' }}>{connectedEmail}</span>
              )}
            </span>
          </button>

          {/* Mode Enfant */}
          <button
            onClick={toggleChildMode}
            className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all active:scale-95 mb-3"
            style={{
              background: childMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
              borderColor: childMode ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)',
            }}
          >
            <span className="flex items-center gap-3">
              <span className="text-2xl">{childMode ? '👶' : '🔞'}</span>
              <span className="font-bold text-sm" style={{ color: childMode ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)' }}>
                Mode Enfant
              </span>
            </span>
            <TogglePill on={childMode} />
          </button>

          {/* View Rules */}
          <button
            onClick={handleViewRules}
            className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-2xl border transition-all active:scale-95 mb-3"
            style={{ background: 'rgba(100,200,255,0.1)', borderColor: 'rgba(100,200,255,0.3)', color: 'rgba(255,255,255,0.9)' }}
          >
            <span className="text-lg">📖</span>
            <span className="font-bold text-sm">Voir les règles</span>
          </button>

          {/* Auto show rules */}
          <button
            onClick={toggleAutoShowRules}
            className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all active:scale-95"
            style={{
              background: autoShowRules ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
              borderColor: autoShowRules ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)',
            }}
          >
            <span className="flex items-center gap-3">
              <span className="text-2xl">{autoShowRules ? '✓' : '○'}</span>
              <span className="font-bold text-sm" style={{ color: autoShowRules ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)' }}>
                Afficher les règles automatiquement
              </span>
            </span>
            <TogglePill on={autoShowRules} />
          </button>
        </div>
      </div>
    </>
  )
}
