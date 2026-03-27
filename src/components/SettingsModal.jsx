import { useState } from 'react'
import { audio } from '../utils/audio'

export default function SettingsModal({ onClose, onShowRules }) {
  const [musicOn, setMusicOn] = useState(audio.musicEnabled)
  const [sfxOn, setSfxOn] = useState(audio.sfxEnabled)
  const [vibOn, setVibOn] = useState(audio.vibrationEnabled)
  const [autoShowRules, setAutoShowRules] = useState(() =>
    localStorage.getItem('wtf_hide_howtoplay') !== 'true'
  )
  // childMode: true = Kids category included in random draws (default ON)
  // Future: replace with userProfile.age < 18 check when profile exists
  const [childMode, setChildMode] = useState(() =>
    localStorage.getItem('wtf_child_mode') !== 'false'
  )

  const toggleMusic = () => {
    const next = !musicOn
    setMusicOn(next)
    audio.setMusicEnabled(next)
  }

  const toggleSfx = () => {
    const next = !sfxOn
    setSfxOn(next)
    audio.setSfxEnabled(next)
    if (next) audio.play('click')
  }

  const toggleVib = () => {
    const next = !vibOn
    setVibOn(next)
    audio.setVibrationEnabled(next)
    if (next) audio.vibrate(40)
  }

  const toggleChildMode = () => {
    const next = !childMode
    setChildMode(next)
    localStorage.setItem('wtf_child_mode', String(next))
  }

  const toggleAutoShowRules = () => {
    const next = !autoShowRules
    setAutoShowRules(next)
    if (next) {
      localStorage.removeItem('wtf_hide_howtoplay')
    } else {
      localStorage.setItem('wtf_hide_howtoplay', 'true')
    }
  }

  const handleViewRules = () => {
    audio.play('click')
    onShowRules?.()
    onClose()
  }

  const rows = [
    { label: 'Musique', emojiOn: '🎵', emojiOff: '🔇', on: musicOn, toggle: toggleMusic },
    { label: 'Bruitages', emojiOn: '🔔', emojiOff: '🔕', on: sfxOn, toggle: toggleSfx },
    { label: 'Vibreur', emojiOn: '📳', emojiOff: '📴', on: vibOn, toggle: toggleVib },
    { label: 'Mode Enfant', emojiOn: '👶', emojiOff: '🔞', on: childMode, toggle: toggleChildMode },
  ]

  return (
    <div
      className="fixed inset-0 flex items-end justify-center"
      style={{ zIndex: 100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl p-6 pb-10"
        style={{ background: 'rgba(18,18,28,0.97)', border: '1px solid rgba(255,255,255,0.12)' }}
        onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-black text-lg tracking-wide">⚙️ Paramètres</h2>
        </div>

        <div className="flex flex-col gap-3 mb-4">
          {rows.map((row) => (
            <button
              key={row.label}
              onClick={row.toggle}
              className="flex items-center justify-between px-5 py-4 rounded-2xl border transition-all active:scale-95"
              style={{
                background: row.on ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                borderColor: row.on ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)',
              }}>
              <span className="flex items-center gap-3">
                <span className="text-2xl">{row.on ? row.emojiOn : row.emojiOff}</span>
                <span className="font-bold text-sm" style={{ color: row.on ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)' }}>
                  {row.label}
                </span>
              </span>
              {/* Toggle pill */}
              <div
                className="relative w-12 h-6 rounded-full transition-all duration-200"
                style={{ background: row.on ? '#FF6B1A' : 'rgba(255,255,255,0.12)' }}>
                <div
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
                  style={{ left: row.on ? '26px' : '2px' }} />
              </div>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px mb-4" style={{ background: 'rgba(255,255,255,0.1)' }} />

        {/* View Rules Button */}
        <button
          onClick={handleViewRules}
          className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-2xl border transition-all active:scale-95 mb-3"
          style={{
            background: 'rgba(100,200,255,0.1)',
            borderColor: 'rgba(100,200,255,0.3)',
            color: 'rgba(255,255,255,0.9)',
          }}>
          <span className="text-lg">📖</span>
          <span className="font-bold text-sm">Voir les règles</span>
        </button>

        {/* Auto Show Rules Toggle */}
        <button
          onClick={toggleAutoShowRules}
          className="flex items-center justify-between px-5 py-4 rounded-2xl border transition-all active:scale-95"
          style={{
            background: autoShowRules ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
            borderColor: autoShowRules ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)',
          }}>
          <span className="flex items-center gap-3">
            <span className="text-2xl">{autoShowRules ? '✓' : '○'}</span>
            <span className="font-bold text-sm" style={{ color: autoShowRules ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)' }}>
              Afficher les règles automatiquement
            </span>
          </span>
          {/* Toggle pill */}
          <div
            className="relative w-12 h-6 rounded-full transition-all duration-200"
            style={{ background: autoShowRules ? '#FF6B1A' : 'rgba(255,255,255,0.12)' }}>
            <div
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
              style={{ left: autoShowRules ? '26px' : '2px' }} />
          </div>
        </button>
      </div>
    </div>
  )
}
