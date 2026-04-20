import { useState, useRef } from 'react'
import { audio } from '../utils/audio'
import HowToPlayModal from './HowToPlayModal'
import { version } from '../../package.json'

// ─── Setting row ────────────────────────────────────────────────────────────
function SettingRow({ icon, label, right, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all active:scale-95"
      style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
    >
      <span className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <span className="font-bold text-sm" style={{ color: '#1a1a2e' }}>{label}</span>
      </span>
      {right}
    </button>
  )
}

// ─── Dev mode toggle — visible only via cheat code ──────────────────────────
function GameModeSelector() {
  const currentMode = localStorage.getItem('wtf_dev_mode') === 'true' ? 'dev'
    : localStorage.getItem('wtf_test_mode') === 'true' ? 'test' : 'player'

  const select = (mode) => {
    if (mode === currentMode) return
    const existing = JSON.parse(localStorage.getItem('wtf_data') || '{}')

    if (mode === 'player') {
      const bc = parseInt(localStorage.getItem('wtf_dev_backup_coins') || '0', 10)
      const bh = parseInt(localStorage.getItem('wtf_dev_backup_hints') || '0', 10)
      existing.wtfCoins = bc; existing.hints = bh
      localStorage.setItem('wtf_data', JSON.stringify(existing))
      localStorage.removeItem('wtf_dev_backup_coins')
      localStorage.removeItem('wtf_dev_backup_hints')
      localStorage.removeItem('wtf_dev_mode')
      localStorage.removeItem('wtf_test_mode')
      localStorage.removeItem('wtf_dev_access')
    } else {
      if (currentMode === 'player') {
        localStorage.setItem('wtf_dev_backup_coins', String(existing.wtfCoins || 0))
        localStorage.setItem('wtf_dev_backup_hints', String(existing.hints || 0))
      }
      existing.wtfCoins = 999; existing.hints = 999
      localStorage.setItem('wtf_data', JSON.stringify(existing))
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
      <p className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: '#9CA3AF' }}>Mode de jeu</p>
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


// ─── Main settings modal ────────────────────────────────────────────────────
export default function SettingsModal({ onClose, onRestartTutorial }) {
  const [soundOn, setSoundOn] = useState(audio.sfxEnabled)
  const [musicOn, setMusicOn] = useState(audio.musicEnabled)
  const [notifOn, setNotifOn] = useState(() => localStorage.getItem('wtf_notifications') !== 'false')
  const [vibrOn, setVibrOn] = useState(() => localStorage.getItem('wtf_vibration') !== 'false')
  const [showRulesModal, setShowRulesModal] = useState(false)
  const [devAccess, setDevAccess] = useState(() => localStorage.getItem('wtf_dev_access') === 'true')

  const toggleSound = () => { const n = !soundOn; setSoundOn(n); audio.setSfxEnabled(n); if (n) audio.play('click') }
  const toggleMusic = () => { const n = !musicOn; setMusicOn(n); audio.setMusicEnabled(n) }
  const toggleNotif = () => { const n = !notifOn; setNotifOn(n); localStorage.setItem('wtf_notifications', String(n)) }
  const toggleVibr = () => { const n = !vibrOn; setVibrOn(n); localStorage.setItem('wtf_vibration', String(n)); audio.setVibrationEnabled(n); if (n) audio.vibrate(50) }

  // Cheat code: press 3s sur Vibreur pour activer le mode dev
  const vibrPressTimerRef = useRef(null)
  const handleVibrPressStart = () => {
    vibrPressTimerRef.current = setTimeout(() => {
      localStorage.setItem('wtf_dev_access', 'true')
      setDevAccess(true)
      audio.vibrate([100, 50, 100])
    }, 3000)
  }
  const handleVibrPressEnd = () => {
    if (vibrPressTimerRef.current) {
      clearTimeout(vibrPressTimerRef.current)
      vibrPressTimerRef.current = null
    }
  }

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
            <h2 className="font-black text-lg" style={{ color: '#1a1a2e' }}>Paramètres</h2>
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
              {devAccess && (
                <div className="mb-1 p-3 rounded-2xl" style={{ background: 'rgba(255,100,0,0.08)', border: '1px solid rgba(255,100,0,0.2)' }}>
                  <GameModeSelector />
                </div>
              )}

              {/* Audio & Notifications */}
              <p className="text-xs font-black uppercase tracking-wider mt-1 mb-2" style={{ color: '#9CA3AF' }}>Audio & Notifications</p>

              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', padding: '4px 0 8px' }}>
                {[
                  { on: soundOn, toggle: toggleSound, icon: 'son', label: 'Son' },
                  { on: musicOn, toggle: toggleMusic, icon: 'musique', label: 'Musique' },
                  { on: notifOn, toggle: toggleNotif, icon: 'notifications', label: 'Notifs' },
                  { on: vibrOn, toggle: toggleVibr, icon: 'vibreur', label: 'Vibreur', cheat: true },
                ].map(p => (
                  <button
                    key={p.icon}
                    onClick={p.cheat ? toggleVibr : p.toggle}
                    onMouseDown={p.cheat ? handleVibrPressStart : undefined}
                    onMouseUp={p.cheat ? handleVibrPressEnd : undefined}
                    onTouchStart={p.cheat ? handleVibrPressStart : undefined}
                    onTouchEnd={p.cheat ? handleVibrPressEnd : undefined}
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
                        style={{ width: 38, height: 38, objectFit: 'contain' }}
                      />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: p.on ? '#1a1a2e' : '#9CA3AF' }}>{p.label}</span>
                  </button>
                ))}
              </div>

              {/* Langue */}
              <p className="text-xs font-black uppercase tracking-wider mt-3" style={{ color: '#9CA3AF' }}>Langue</p>

              <div className="w-full flex items-center justify-between px-4 py-3 rounded-2xl" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                <span className="flex items-center gap-3">
                  <img src="/assets/ui/icon-france.png" alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
                  <span className="font-bold text-sm" style={{ color: '#1a1a2e' }}>Français</span>
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#E5E7EB', color: '#9CA3AF' }}>Unique</span>
              </div>

              {/* Divers */}
              <p className="text-xs font-black uppercase tracking-wider mt-3" style={{ color: '#9CA3AF' }}>Divers</p>

              <SettingRow icon="📖" label="Règles du jeu" right={<span style={{ color: '#D1D5DB' }}>›</span>} onClick={() => { audio.play('click'); setShowRulesModal(true) }} />

              <SettingRow icon="📤" label="Partager l'app" right={<span style={{ color: '#D1D5DB' }}>›</span>} onClick={() => {
                audio.play('click')
                const url = window.location.origin
                const text = `What The F*ct ! Vrai ou fou ?\n${url}`
                if (navigator.share) navigator.share({ text }).catch(() => {})
                else navigator.clipboard?.writeText(text).catch(() => {})
              }} />

              {/* Légal */}
              <p className="text-xs font-black uppercase tracking-wider mt-3" style={{ color: '#9CA3AF' }}>Légal</p>

              <SettingRow icon="📄" label="Mentions légales" right={<span className="text-xs font-bold" style={{ color: '#9CA3AF' }}>Bientôt</span>} onClick={() => audio.play('click')} />
              <SettingRow icon="📋" label="CGU" right={<span className="text-xs font-bold" style={{ color: '#9CA3AF' }}>Bientôt</span>} onClick={() => audio.play('click')} />
              <SettingRow icon="🔒" label="Politique de confidentialité" right={<span className="text-xs font-bold" style={{ color: '#9CA3AF' }}>Bientôt</span>} onClick={() => audio.play('click')} />
            </div>
          </div>

          {/* Version */}
          <div className="flex items-center justify-center px-5 pb-4 shrink-0" style={{ borderTop: '1px solid #E5E7EB', textAlign: 'center' }}>
            <span className="text-xs font-bold" style={{ color: '#D1D5DB' }}>What The F*ct! v{version}</span>
          </div>
        </div>
      </div>
    </>
  )
}
