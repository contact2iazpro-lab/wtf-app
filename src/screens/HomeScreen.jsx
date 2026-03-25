import { useState } from 'react'
import { audio } from '../utils/audio'

const CREATURES = [
  { emoji: '🦄', style: { top: '8%',  left: '6%',  fontSize: 44 }, anim: 'creature-float-1' },
  { emoji: '🐸', style: { top: '6%',  right: '8%', fontSize: 38 }, anim: 'creature-float-2' },
  { emoji: '🦊', style: { top: '30%', left: '2%',  fontSize: 34 }, anim: 'creature-float-3' },
  { emoji: '🦋', style: { top: '28%', right: '3%', fontSize: 36 }, anim: 'creature-float-2' },
  { emoji: '🐙', style: { top: '55%', left: '4%',  fontSize: 32 }, anim: 'creature-float-1' },
  { emoji: '⭐', style: { top: '52%', right: '5%', fontSize: 36 }, anim: 'creature-float-3' },
]

const GAME_MODES = [
  { id: 'solo-flash', label: 'Solo Flash', emoji: '⚡', desc: '60s par fact', active: true },
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

export default function HomeScreen({ totalScore, streak, onPlay, onDuel, onMarathon }) {
  const [musicOn, setMusicOn] = useState(audio.musicEnabled)
  const [sfxOn, setSfxOn] = useState(audio.sfxEnabled)

  const handlePlay = () => { audio.startMusic(); audio.play('click'); onPlay() }
  const handleDuel = () => { audio.startMusic(); audio.play('click'); onDuel() }
  const handleMarathon = () => { audio.startMusic(); audio.play('click'); onMarathon() }

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

  return (
    <div className="flex flex-col h-full w-full overflow-y-auto scrollbar-hide rainbow-bg">

      {/* Floating creatures — fixed to viewport */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {CREATURES.map((c, i) => (
          <div
            key={i}
            className={c.anim}
            style={{ position: 'absolute', fontSize: c.style.fontSize, opacity: 0.55, userSelect: 'none', ...c.style }}>
            {c.emoji}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="relative pt-8 pb-4 px-6 flex flex-col items-center" style={{ zIndex: 1 }}>

        {/* Star logo */}
        <StarLogo />

        {/* Subtitle */}
        <p className="text-white/50 text-xs font-bold tracking-[0.35em] uppercase -mt-2 mb-5">
          What The Fact
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

      {/* Audio controls */}
      <div className="px-6 pb-8 flex gap-3" style={{ position: 'relative', zIndex: 1 }}>
        <button
          onClick={toggleMusic}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border font-bold text-sm transition-all active:scale-95"
          style={{
            background: musicOn ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
            borderColor: musicOn ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
            color: musicOn ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)',
          }}>
          <span>{musicOn ? '🎵' : '🔇'}</span>
          <span>Musique</span>
        </button>
        <button
          onClick={toggleSfx}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border font-bold text-sm transition-all active:scale-95"
          style={{
            background: sfxOn ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
            borderColor: sfxOn ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
            color: sfxOn ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)',
          }}>
          <span>{sfxOn ? '🔔' : '🔕'}</span>
          <span>Bruitages</span>
        </button>
      </div>
    </div>
  )
}
