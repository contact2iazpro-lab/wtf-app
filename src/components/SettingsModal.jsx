import { useState } from 'react'
import { audio } from '../utils/audio'
import { useAuth } from '../context/AuthContext'
import HowToPlayModal from './HowToPlayModal'

// ─── Toggle pill ────────────────────────────────────────────────────────────
function TogglePill({ on }) {
  return (
    <div className="relative w-12 h-6 rounded-full transition-all duration-200" style={{ background: on ? '#FF6B1A' : '#D1D5DB' }}>
      <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200" style={{ left: on ? '26px' : '2px' }} />
    </div>
  )
}

// ─── Setting row ────────────────────────────────────────────────────────────
function SettingRow({ icon, label, right, onClick, style }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all active:scale-95"
      style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', ...style }}
    >
      <span className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <span className="font-bold text-sm" style={{ color: '#1a1a2e' }}>{label}</span>
      </span>
      {right}
    </button>
  )
}

// ─── Dev mode toggle — visible only in DEV ──────────────────────────────────
function DevModeToggleRow() {
  const [devMode, setDevMode] = useState(() => localStorage.getItem('wtf_dev_mode') === 'true')

  const toggle = () => {
    const next = !devMode
    localStorage.setItem('wtf_dev_mode', String(next))
    setDevMode(next)
    window.location.reload()
  }

  return (
    <button
      onClick={toggle}
      className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all active:scale-95"
      style={{
        background: devMode ? 'rgba(255,107,26,0.12)' : '#F9FAFB',
        borderColor: devMode ? '#FF6B1A' : '#E5E7EB',
      }}
    >
      <span className="flex items-center gap-3">
        <span className="text-lg">{devMode ? '🛠' : '👤'}</span>
        <span className="font-bold text-sm" style={{ color: devMode ? '#FF6B1A' : '#9CA3AF' }}>
          {devMode ? 'MODE DEV ACTIF' : 'MODE JOUEUR'}
        </span>
      </span>
      <TogglePill on={devMode} />
    </button>
  )
}

// ─── Save progress modal ────────────────────────────────────────────────────
function resetLocalProgress() {
  try {
    localStorage.setItem('wtf_data', JSON.stringify({
      totalScore: 0, streak: 0,
      lastDay: new Date().toDateString(),
      unlockedFacts: [],
    }))
  } catch { /* ignore */ }
}

function SaveProgressModal({ onClose }) {
  const { user, isConnected, signInWithGoogle, signInWithFacebook, signOut } = useAuth()
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(null)
  const [pendingProvider, setPendingProvider] = useState(null)

  const provider = user?.app_metadata?.provider
  const email = user?.email ?? ''
  const isGoogleUser = isConnected && provider === 'google'

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

  if (pendingProvider) {
    const providerLabel = pendingProvider === 'google' ? 'Google' : 'Facebook'
    return (
      <div className="fixed inset-0 flex items-center justify-center p-5" style={{ zIndex: 200, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}>
        <div className="w-full rounded-3xl overflow-hidden" style={{ maxWidth: 340, background: '#FAFAF8', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-3" style={{ background: '#FEE2E2' }}>
            <span className="font-black text-base" style={{ color: '#1a1a2e' }}>⚠️ Attention</span>
            <button onClick={() => setPendingProvider(null)} className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white active:scale-90" style={{ background: '#EF4444' }}>✕</button>
          </div>
          <div className="p-5">
            <p className="text-sm mb-5 font-bold text-center" style={{ color: '#374151', lineHeight: '1.6' }}>
              La connexion à {providerLabel} réinitialisera ta progression locale
              <span style={{ color: '#EF4444' }}> (série, points, f*cts débloqués)</span>.
              <br /><br />
              Cette action est <strong style={{ color: '#EF4444' }}>irréversible</strong>. Continuer ?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setPendingProvider(null)} className="flex-1 py-3 rounded-2xl font-black text-sm active:scale-95 transition-all" style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#6B7280' }}>Annuler</button>
              <button onClick={confirmSignIn} className="flex-1 py-3 rounded-2xl font-black text-sm active:scale-95 transition-all" style={{ background: '#EF4444', color: 'white' }}>Confirmer</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-5" style={{ zIndex: 200, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="w-full rounded-3xl overflow-hidden" style={{ maxWidth: 340, background: '#FAFAF8', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3" style={{ background: '#D1FAE5', borderBottom: '1px solid #A7F3D0' }}>
          <span className="font-black text-base" style={{ color: '#1a1a2e' }}>Progression</span>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white active:scale-90" style={{ background: '#EF4444' }}>✕</button>
        </div>
        <div className="p-5">
          {isConnected ? (
            <>
              <div className="flex flex-col items-center gap-2 mb-5 p-4 rounded-2xl" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
                <span className="text-3xl">{isGoogleUser ? '🔵' : '🔷'}</span>
                <span className="font-black text-sm" style={{ color: '#1a1a2e' }}>Connecté avec {isGoogleUser ? 'Google' : 'Facebook'}</span>
                {email && <span className="text-xs font-semibold" style={{ color: '#6B7280' }}>{email}</span>}
                <span className="text-xs font-bold" style={{ color: '#22C55E' }}>✅ Progression sauvegardée</span>
              </div>
              <button onClick={handleSignOut} disabled={loading === 'signout'} className="w-full py-3.5 rounded-2xl font-black text-white active:scale-95 transition-all" style={{ background: loading === 'signout' ? '#6B7280' : '#EF4444' }}>
                {loading === 'signout' ? '...' : 'Se déconnecter'}
              </button>
            </>
          ) : (
            <>
              <p className="text-center text-sm mb-5 font-bold" style={{ color: '#374151' }}>Connectez-vous pour sauvegarder votre progression !</p>
              <button onClick={() => { setError(null); setPendingProvider('google') }} disabled={!!loading} className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-black text-white active:scale-95 transition-all" style={{ background: '#FF8C00', opacity: loading ? 0.5 : 1 }}>
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

// ─── Main settings modal ────────────────────────────────────────────────────
export default function SettingsModal({ onClose }) {
  const [soundOn, setSoundOn] = useState(audio.sfxEnabled)
  const [musicOn, setMusicOn] = useState(audio.musicEnabled)
  const [notifOn, setNotifOn] = useState(() => localStorage.getItem('wtf_notifications') !== 'false')
  const [showRulesModal, setShowRulesModal] = useState(false)
  const [vibrOn, setVibrOn] = useState(() => localStorage.getItem('wtf_vibration') !== 'false')

  const toggleSound = () => { const n = !soundOn; setSoundOn(n); audio.setSfxEnabled(n); if (n) audio.play('click') }
  const toggleMusic = () => { const n = !musicOn; setMusicOn(n); audio.setMusicEnabled(n) }
  const toggleNotif = () => { const n = !notifOn; setNotifOn(n); localStorage.setItem('wtf_notifications', String(n)) }
  const toggleVibr = () => { const n = !vibrOn; setVibrOn(n); localStorage.setItem('wtf_vibration', String(n)); if (n && navigator.vibrate) navigator.vibrate(50) }

  return (
    <>
      {showRulesModal && <HowToPlayModal onClose={() => setShowRulesModal(false)} />}

      <div
        className="fixed inset-0 flex items-end justify-center"
        style={{ zIndex: 100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-t-3xl overflow-hidden"
          style={{ background: '#FAFAF8', border: '1px solid rgba(0,0,0,0.08)', maxHeight: '90vh' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid #E5E7EB' }}>
            <h2 className="font-black text-lg" style={{ color: '#1a1a2e' }}>⚙️ Paramètres</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white active:scale-90" style={{ background: '#EF4444' }}>✕</button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: 'calc(90vh - 60px)' }}>
            <div className="flex flex-col gap-2.5">

              {/* Dev mode — DEV only */}
              {import.meta.env.DEV && (
                <div className="mb-1 p-2 rounded-2xl" style={{ background: 'rgba(255,100,0,0.1)', border: '1px solid rgba(255,100,0,0.3)' }}>
                  <DevModeToggleRow />
                </div>
              )}

              {/* ── Audio & Notifications ── */}
              <p className="text-xs font-black uppercase tracking-wider mt-1" style={{ color: '#9CA3AF' }}>Audio & Notifications</p>

              <SettingRow icon="🔊" label="Son" right={<TogglePill on={soundOn} />} onClick={toggleSound} style={{ background: soundOn ? 'rgba(34,197,94,0.06)' : undefined, borderColor: soundOn ? 'rgba(34,197,94,0.3)' : undefined }} />
              <SettingRow icon="🎵" label="Musique" right={<TogglePill on={musicOn} />} onClick={toggleMusic} style={{ background: musicOn ? 'rgba(34,197,94,0.06)' : undefined, borderColor: musicOn ? 'rgba(34,197,94,0.3)' : undefined }} />
              <SettingRow icon="🔔" label="Notifications" right={<TogglePill on={notifOn} />} onClick={toggleNotif} style={{ background: notifOn ? 'rgba(34,197,94,0.06)' : undefined, borderColor: notifOn ? 'rgba(34,197,94,0.3)' : undefined }} />
              <SettingRow icon="📳" label="Vibreur" right={<TogglePill on={vibrOn} />} onClick={toggleVibr} style={{ background: vibrOn ? 'rgba(34,197,94,0.06)' : undefined, borderColor: vibrOn ? 'rgba(34,197,94,0.3)' : undefined }} />

              {/* ── Langue ── */}
              <p className="text-xs font-black uppercase tracking-wider mt-3" style={{ color: '#9CA3AF' }}>Langue</p>

              <div className="w-full flex items-center justify-between px-4 py-3 rounded-2xl" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                <span className="flex items-center gap-3">
                  <span className="text-lg">🇫🇷</span>
                  <span className="font-bold text-sm" style={{ color: '#1a1a2e' }}>Français</span>
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#E5E7EB', color: '#9CA3AF' }}>Unique</span>
              </div>

              {/* ── Divers ── */}
              <p className="text-xs font-black uppercase tracking-wider mt-3" style={{ color: '#9CA3AF' }}>Divers</p>

              <SettingRow icon="📖" label="Règles du jeu" right={<span style={{ color: '#D1D5DB' }}>›</span>} onClick={() => { audio.play('click'); setShowRulesModal(true) }} />

              <SettingRow icon="📤" label="Partager l'app" right={<span style={{ color: '#D1D5DB' }}>›</span>} onClick={() => {
                audio.play('click')
                const text = '🤯 What The F*ct! Vrai ou fou ?\nhttps://wtf-app-production.up.railway.app/'
                if (navigator.share) navigator.share({ text }).catch(() => {})
                else navigator.clipboard?.writeText(text).catch(() => {})
              }} />

              {/* ── Légal ── */}
              <p className="text-xs font-black uppercase tracking-wider mt-3" style={{ color: '#9CA3AF' }}>Légal</p>

              <SettingRow icon="📄" label="Mentions légales" right={<span style={{ color: '#D1D5DB' }}>›</span>} onClick={() => { audio.play('click') }} />
              <SettingRow icon="📋" label="CGU" right={<span style={{ color: '#D1D5DB' }}>›</span>} onClick={() => { audio.play('click') }} />
              <SettingRow icon="🔒" label="Politique de confidentialité" right={<span style={{ color: '#D1D5DB' }}>›</span>} onClick={() => { audio.play('click') }} />

              {/* Version */}
              <div className="text-center mt-4 mb-2">
                <span className="text-xs font-bold" style={{ color: '#D1D5DB' }}>What The F*ct! v0.1.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
