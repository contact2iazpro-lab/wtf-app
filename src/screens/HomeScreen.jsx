import { useState } from 'react'
import { audio } from '../utils/audio'

const CREATURE_SRCS = [
  '/Dauphin.png', '/Etoile.png', '/Garcon.png', '/grenouille.png',
  '/Montgolfiere.png', '/Nuage.png', '/Princesses.png', '/Terre.png', '/zigomar.png',
]

function randomCreatures() {
  return CREATURE_SRCS.map((src) => ({
    src,
    top:  `${Math.random() * 80}%`,
    left: `${Math.random() * 78}%`,
    size: 44 + Math.floor(Math.random() * 30),
    anim: `creature-float-${1 + Math.floor(Math.random() * 6)}`,
    dur:  `${3.2 + Math.random() * 3.8}s`,
    delay: `-${Math.random() * 4}s`,
    opacity: 0.6 + Math.random() * 0.3,
  }))
}

const GAME_MODES = [
  { id: 'solo-flash', label: 'Mode Solo Flash', emoji: '⚡', desc: '60s par F*ct', active: true },
  { id: 'duel', label: 'Multijoueur', emoji: '🎮', desc: '2-6 joueurs', active: true },
  { id: 'marathon', label: 'Marathon', emoji: '🏃', desc: '20 questions', active: true },
  { id: 'blitz', label: 'Blitz', emoji: '🔥', desc: 'Bientôt', active: false },
]

function StarLogo() {
  return (
    <div className="relative flex items-center justify-center animate-fade-up" style={{ width: 200, height: 200 }}>
      {/* Glow behind logo */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(circle, rgba(255,180,0,0.3) 0%, transparent 65%)',
        filter: 'blur(18px)',
      }} />
      <img
        src="/logo-wtf.png"
        alt="WTF!"
        style={{ width: 190, height: 190, objectFit: 'contain', position: 'relative', zIndex: 1, filter: 'drop-shadow(0 6px 20px rgba(255,120,0,0.5))' }}
      />
    </div>
  )
}

function SettingsModal({ onClose }) {
  const [musicOn, setMusicOn] = useState(audio.musicEnabled)
  const [sfxOn, setSfxOn] = useState(audio.sfxEnabled)
  const [vibOn, setVibOn] = useState(audio.vibrationEnabled)

  const toggleMusic = () => {
    const next = !musicOn; setMusicOn(next); audio.setMusicEnabled(next)
  }
  const toggleSfx = () => {
    const next = !sfxOn; setSfxOn(next); audio.setSfxEnabled(next)
    if (next) audio.play('click')
  }
  const toggleVib = () => {
    const next = !vibOn; setVibOn(next); audio.setVibrationEnabled(next)
    if (next) audio.vibrate(40)
  }

  const rows = [
    { label: 'Musique',   emojiOn: '🎵', emojiOff: '🔇', on: musicOn, toggle: toggleMusic },
    { label: 'Bruitages', emojiOn: '🔔', emojiOff: '🔕', on: sfxOn,   toggle: toggleSfx   },
    { label: 'Vibreur',   emojiOn: '📳', emojiOff: '📴', on: vibOn,   toggle: toggleVib   },
  ]

  return (
    <div
      className="fixed inset-0 flex items-end justify-center"
      style={{ zIndex: 100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl p-6 pb-10"
        style={{ background: 'rgba(18,18,28,0.97)', border: '1px solid rgba(255,255,255,0.12)' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-black text-lg tracking-wide">⚙️ Paramètres</h2>
        </div>

        <div className="flex flex-col gap-3">
          {rows.map(row => (
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

        {/* Close button */}
        <button
          onClick={onClose}
          className="mt-5 w-full py-4 rounded-2xl font-black text-sm tracking-widest uppercase active:scale-95 transition-all"
          style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
          ✕ Fermer
        </button>
      </div>
    </div>
  )
}

export default function HomeScreen({ totalScore, streak, onPlay, onDuel, onMarathon }) {
  const [showSettings, setShowSettings] = useState(false)
  const [creatures] = useState(randomCreatures)

  const handlePlay = () => { audio.startMusic(); audio.play('click'); onPlay() }
  const handleDuel = () => { audio.startMusic(); audio.play('click'); onDuel() }
  const handleMarathon = () => { audio.startMusic(); audio.play('click'); onMarathon() }

  return (
    <div className="flex flex-col h-full w-full overflow-y-auto scrollbar-hide rainbow-bg">

      {/* Floating creatures — fixed to viewport */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {creatures.map((c, i) => (
          <div
            key={i}
            className={c.anim}
            style={{
              position: 'absolute',
              top: c.top,
              left: c.left,
              opacity: c.opacity,
              userSelect: 'none',
              '--dur': c.dur,
              '--delay': c.delay,
            }}>
            <img src={c.src} alt="" width={c.size} height={c.size} style={{ objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }} />
          </div>
        ))}
      </div>

      {/* Settings modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Gear button — top right */}
      <button
        onClick={() => { audio.play('click'); setShowSettings(true) }}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full active:scale-90 transition-all"
        style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', zIndex: 10, fontSize: 18 }}>
        ⚙️
      </button>

      {/* Header */}
      <div className="relative pt-8 pb-4 px-6 flex flex-col items-center" style={{ zIndex: 1 }}>

        {/* Star logo */}
        <StarLogo />

        {/* Subtitle */}
        <p className="text-white/60 text-sm font-black tracking-[0.15em] uppercase -mt-2 mb-5">
          Vrai ou fou ?
        </p>

        {/* Stats row */}
        <div className="flex gap-3 w-full justify-center">
          <div className="flex-1 max-w-36 rounded-2xl p-4 text-center border"
            style={{ background: 'rgba(0,0,0,0.25)', borderColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
            <div className="text-3xl mb-1">🔥</div>
            <div className="text-2xl font-black text-white">{streak}</div>
            <div className="text-xs text-white/60 font-bold uppercase tracking-wide">Streak</div>
          </div>
          <div className="flex-1 max-w-36 rounded-2xl p-4 text-center border"
            style={{ background: 'rgba(0,0,0,0.25)', borderColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
            <div className="text-3xl mb-1">⭐</div>
            <div className="text-2xl font-black text-white">{totalScore}</div>
            <div className="text-xs text-white/60 font-bold uppercase tracking-wide">Score Total</div>
          </div>
        </div>
      </div>

      {/* Play button */}
      <div className="px-6 mb-5" style={{ position: 'relative', zIndex: 1 }}>
        <button
          onClick={handlePlay}
          className="btn-press w-full py-5 rounded-2xl text-white text-xl font-black tracking-widest uppercase transition-all duration-150 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #FF6B1A 0%, #D94A10 100%)',
            boxShadow: '0 8px 40px rgba(255, 92, 26, 0.55), 0 2px 8px rgba(0,0,0,0.4)',
            WebkitTextStroke: '0.5px rgba(255,255,255,0.3)',
          }}>
          <span className="flex items-center justify-center gap-3">
            <span className="text-2xl">▶</span>
            JOUER
          </span>
        </button>
      </div>

      {/* Game modes grid */}
      <div className="px-6 pb-8" style={{ position: 'relative', zIndex: 1 }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-white/10" />
          <h2 className="text-white/40 text-xs font-bold uppercase tracking-[0.2em]">Modes de jeu</h2>
          <div className="h-px flex-1 bg-white/10" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {GAME_MODES.map((mode) => (
            <div
              key={mode.id}
              onClick={mode.active ? (mode.id === 'duel' ? handleDuel : mode.id === 'marathon' ? handleMarathon : handlePlay) : undefined}
              className={`rounded-2xl p-4 border transition-all duration-150 ${
                mode.active ? 'cursor-pointer active:scale-95' : 'opacity-30 cursor-not-allowed'
              }`}
              style={mode.active ? {
                background: 'rgba(0,0,0,0.3)',
                borderColor: 'rgba(255,255,255,0.25)',
                backdropFilter: 'blur(8px)',
              } : {
                background: 'rgba(0,0,0,0.15)',
                borderColor: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(8px)',
              }}>
              <div className="text-3xl mb-2">{mode.emoji}</div>
              <div className={`font-black text-sm ${mode.active ? 'text-white' : 'text-white/50'}`}>
                {mode.label}
              </div>
              <div className={`text-xs mt-0.5 font-semibold ${mode.active ? 'text-yellow-300' : 'text-white/20'}`}>
                {mode.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cat president — bottom decoration */}
      <div className="w-full flex justify-center mt-auto" style={{ position: 'relative', zIndex: 1 }}>
        <img
          src="/cat-president.png"
          alt="Cat President"
          className="w-full max-w-sm object-contain"
          style={{ maskImage: 'linear-gradient(to top, transparent 0%, black 30%)', WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 30%)' }}
        />
      </div>
    </div>
  )
}
