import { useState, useEffect } from 'react'
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
function GameModeSelector() {
  const currentMode = localStorage.getItem('wtf_dev_mode') === 'true' ? 'dev'
    : localStorage.getItem('wtf_test_mode') === 'true' ? 'test' : 'player'

  const select = (mode) => {
    if (mode === currentMode) return
    const existing = JSON.parse(localStorage.getItem('wtf_data') || '{}')

    if (mode === 'player') {
      // Restaurer les vraies valeurs
      const bc = parseInt(localStorage.getItem('wtf_dev_backup_coins') || '0', 10)
      const bt = parseInt(localStorage.getItem('wtf_dev_backup_tickets') || '0', 10)
      const bh = localStorage.getItem('wtf_dev_backup_hints') || '0'
      existing.wtfCoins = bc; existing.tickets = bt
      localStorage.setItem('wtf_data', JSON.stringify(existing))
      localStorage.setItem('wtf_hints_available', bh)
      localStorage.removeItem('wtf_dev_backup_coins')
      localStorage.removeItem('wtf_dev_backup_tickets')
      localStorage.removeItem('wtf_dev_backup_hints')
      localStorage.removeItem('wtf_dev_mode')
      localStorage.removeItem('wtf_test_mode')
    } else {
      // Sauvegarder si pas déjà fait
      if (currentMode === 'player') {
        localStorage.setItem('wtf_dev_backup_coins', String(existing.wtfCoins || 0))
        localStorage.setItem('wtf_dev_backup_tickets', String(existing.tickets || 0))
        localStorage.setItem('wtf_dev_backup_hints', localStorage.getItem('wtf_hints_available') || '0')
      }
      existing.wtfCoins = 999; existing.tickets = 999
      localStorage.setItem('wtf_data', JSON.stringify(existing))
      localStorage.setItem('wtf_hints_available', '999')
      localStorage.setItem('wtf_dev_mode', String(mode === 'dev'))
      localStorage.setItem('wtf_test_mode', String(mode === 'test'))
      if (mode === 'dev') localStorage.removeItem('wtf_test_mode')
      if (mode === 'test') localStorage.removeItem('wtf_dev_mode')
    }
    window.location.reload()
  }

  const modes = [
    { id: 'player', icon: '👤', label: 'Joueur', sub: 'Expérience réelle' },
    { id: 'test', icon: '🎮', label: 'Test', sub: 'Accès total' },
    { id: 'dev', icon: '🔧', label: 'Dev', sub: 'Debug contenu' },
  ]

  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: '#9CA3AF' }}>🎮 Mode de jeu</p>
      <div style={{ display: 'flex', gap: 8 }}>
        {modes.map(m => {
          const active = currentMode === m.id
          return (
            <button
              key={m.id}
              onClick={() => select(m.id)}
              className="active:scale-95 transition-all"
              style={{
                flex: 1, borderRadius: 10, padding: '10px 4px', textAlign: 'center',
                background: active ? '#FF6B1A' : 'transparent',
                border: active ? '2px solid #FF6B1A' : '1.5px solid #E5E7EB',
                cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
              }}
            >
              <div style={{ fontSize: 18 }}>{m.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: active ? 'white' : '#6B7280', marginTop: 2 }}>{m.label}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: active ? 'rgba(255,255,255,0.7)' : '#9CA3AF', marginTop: 1 }}>{m.sub}</div>
            </button>
          )
        })}
      </div>
    </div>
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
    window.location.reload()
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
export default function SettingsModal({ onClose, onRestartTutorial }) {
  const [soundOn, setSoundOn] = useState(audio.sfxEnabled)
  const [musicOn, setMusicOn] = useState(audio.musicEnabled)
  const [notifOn, setNotifOn] = useState(() => localStorage.getItem('wtf_notifications') !== 'false')
  const [showRulesModal, setShowRulesModal] = useState(false)
  const [vibrOn, setVibrOn] = useState(() => localStorage.getItem('wtf_vibration') !== 'false')

  // Cheat code: tap 5× on version to unlock dev selector
  const [tapCount, setTapCount] = useState(0)
  const [devAccess, setDevAccess] = useState(() => localStorage.getItem('wtf_dev_access') === 'true')
  const [devToast, setDevToast] = useState(false)

  useEffect(() => {
    if (tapCount > 0 && tapCount < 5) {
      const timer = setTimeout(() => setTapCount(0), 3000)
      return () => clearTimeout(timer)
    }
    if (tapCount >= 5) {
      localStorage.setItem('wtf_dev_access', 'true')
      setDevAccess(true)
      setDevToast(true)
      setTimeout(() => setDevToast(false), 2000)
    }
  }, [tapCount])

  const showDevSelector = import.meta.env.DEV || devAccess

  const toggleSound = () => { const n = !soundOn; setSoundOn(n); audio.setSfxEnabled(n); if (n) audio.play('click') }
  const toggleMusic = () => { const n = !musicOn; setMusicOn(n); audio.setMusicEnabled(n) }
  const toggleNotif = () => { const n = !notifOn; setNotifOn(n); localStorage.setItem('wtf_notifications', String(n)) }
  const toggleVibr = () => { const n = !vibrOn; setVibrOn(n); localStorage.setItem('wtf_vibration', String(n)); if (n && navigator.vibrate) navigator.vibrate(50) }

  return (
    <>
      {showRulesModal && <HowToPlayModal onClose={() => setShowRulesModal(false)} onRestartTutorial={() => {
        setShowRulesModal(false)
        if (onRestartTutorial) onRestartTutorial()
      }} />}

      <div
        className="fixed inset-0 flex items-end justify-center"
        style={{ zIndex: 100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', touchAction: 'manipulation' }}
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
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClose() }}
              className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white active:scale-90"
              style={{ background: '#EF4444', position: 'relative', zIndex: 10, touchAction: 'manipulation' }}
            >✕</button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: 'calc(90vh - 60px)' }}>
            <div className="flex flex-col gap-2.5">

              {/* Dev mode — accessible via cheat code */}
              {showDevSelector && (
                <div className="mb-1 p-3 rounded-2xl" style={{ background: 'rgba(255,100,0,0.08)', border: '1px solid rgba(255,100,0,0.2)' }}>
                  <GameModeSelector />
                </div>
              )}

              {/* ── Audio & Notifications ── */}
              <p className="text-xs font-black uppercase tracking-wider mt-1 mb-2" style={{ color: '#9CA3AF' }}>Audio & Notifications</p>

              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', padding: '4px 0 8px' }}>
                {[
                  { on: soundOn, toggle: toggleSound, icon: 'son', label: 'Son' },
                  { on: musicOn, toggle: toggleMusic, icon: 'musique', label: 'Musique' },
                  { on: notifOn, toggle: toggleNotif, icon: 'notifications', label: 'Notifs' },
                  { on: vibrOn, toggle: toggleVibr, icon: 'vibreur', label: 'Vibreur' },
                ].map(p => (
                  <button
                    key={p.icon}
                    onClick={p.toggle}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <div style={{
                      width: 62, height: 62, borderRadius: '50%',
                      background: p.on ? '#F9FAFB' : '#F3F4F6',
                      boxShadow: p.on ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: p.on ? 1 : 0.5,
                      transition: 'all 0.15s ease',
                    }}>
                      <img
                        src={`/assets/ui/icon-${p.icon}${p.on ? '' : '-off'}.png`}
                        alt={p.label}
                        style={{ width: 38, height: 38, objectFit: 'contain', transition: 'transform 0.15s' }}
                        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
                        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                      />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: p.on ? '#1a1a2e' : '#9CA3AF' }}>{p.label}</span>
                  </button>
                ))}
              </div>

              {/* ── Règles des modes ── */}
              <p className="text-xs font-black uppercase tracking-wider mt-3 mb-2" style={{ color: '#9CA3AF' }}>Règles des modes</p>
              <button
                onClick={() => {
                  // Supprimer toutes les clés skip_launch_*
                  const keysToRemove = []
                  for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i)
                    if (k && k.startsWith('skip_launch_')) keysToRemove.push(k)
                  }
                  keysToRemove.forEach(k => localStorage.removeItem(k))
                  alert('Règles réactivées ✅')
                }}
                className="w-full py-2.5 rounded-2xl font-bold text-sm active:scale-95 transition-all mb-2"
                style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151' }}
              >
                🔄 Réafficher les règles des modes
              </button>

              {/* ── Langue ── */}
              <p className="text-xs font-black uppercase tracking-wider mt-3" style={{ color: '#9CA3AF' }}>Langue</p>

              <div className="w-full flex items-center justify-between px-4 py-3 rounded-2xl" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                <span className="flex items-center gap-3">
                  <img src="/assets/ui/icon-france.png" alt="🇫🇷" style={{ width: 24, height: 24, objectFit: 'contain' }} />
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

              {/* Version — tap 5× to unlock dev mode */}
              <div className="text-center mt-4 mb-2" onClick={() => setTapCount(c => c + 1)} style={{ cursor: 'default', userSelect: 'none' }}>
                <span className="text-xs font-bold" style={{ color: '#D1D5DB' }}>What The F*ct! v{import.meta.env.VITE_APP_VERSION || '0.0.0'}</span>
              </div>
              {devToast && (
                <div className="text-center mb-2">
                  <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(255,107,26,0.15)', color: '#FF6B1A' }}>🔓 Mode développeur activé !</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
