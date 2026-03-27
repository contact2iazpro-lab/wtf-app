import { useState, useEffect, useRef } from 'react'
import { audio } from '../utils/audio'
import SettingsModal from '../components/SettingsModal'

const CREATURE_SRCS = [
  '/Dauphin.png', '/Etoile.png', '/Garcon.png', '/grenouille.png',
  '/Montgolfiere.png', '/Nuage.png', '/Princesses.png', '/Terre.png', '/zigomar.png',
]

// Static cosmetic data per creature (size, opacity) — computed once
const CREATURE_META = CREATURE_SRCS.map(() => ({
  size: 50 + Math.floor(Math.random() * 36),
  opacity: 0.65 + Math.random() * 0.25,
}))

const GAME_MODES = [
  { id: 'solo-flash', label: 'Mode Solo Flash', emoji: '⚡', desc: '60s par F*ct', active: true },
  { id: 'duel', label: 'Multijoueur', emoji: '🎮', desc: '2-6 joueurs', active: true },
  { id: 'marathon', label: 'Marathon', emoji: '🏃', desc: '20 questions', active: true },
  { id: 'blitz', label: 'Blitz', emoji: '🔥', desc: 'Bientôt', active: false },
]

// Helper to render text with bold F*ct
function renderTextWithBoldFact(text) {
  if (!text || !text.includes('F*ct')) return text
  const parts = text.split(/(F\*ct)/g)
  return parts.map((part, i) => part === 'F*ct' ? <strong key={i}>{part}</strong> : part)
}

function StarLogo() {
  return (
    <div className="relative flex items-center justify-center animate-fade-up" style={{ width: 140, height: 140 }}>
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

export default function HomeScreen({ totalScore, streak, onPlay, onQuickPlay, onDuel, onMarathon }) {
  const [showSettings, setShowSettings] = useState(false)
  const [showQuickPlayModal, setShowQuickPlayModal] = useState(false)
  const creatureRefs = useRef([])

  // RAF loop: move each creature across the screen, wrap around edges within allowed vertical zone
  useEffect(() => {
    const W = window.innerWidth
    const H = window.innerHeight

    // Define forbidden zones
    const topForbidden = 240 // Logo + "Vrai ou fou?" zone
    const bottomForbidden = 150 // Share button + cat president zone
    const allowedMinY = topForbidden
    const allowedMaxY = H - bottomForbidden
    const allowedHeight = allowedMaxY - allowedMinY

    // Each creature gets its own persistent, random speed within a controlled range
    const speed = () => (Math.random() < 0.5 ? -1 : 1) * (0.3 + Math.random() * 1.2)
    const state = CREATURE_SRCS.map((_, i) => ({
      x: Math.random() * W,
      y: allowedMinY + Math.random() * allowedHeight, // Start within allowed zone
      vx: speed(),
      vy: speed(),
      size: CREATURE_META[i].size,
    }))

    let rafId
    const tick = () => {
      state.forEach((c, i) => {
        c.x += c.vx
        c.y += c.vy
        // Wrap around horizontal edges
        if (c.x > W + c.size)  c.x = -c.size
        if (c.x < -c.size)     c.x = W + c.size
        // Wrap vertically but stay within allowed zone
        if (c.y > allowedMaxY + c.size)  c.y = allowedMinY - c.size
        if (c.y < allowedMinY - c.size)  c.y = allowedMaxY + c.size
        const el = creatureRefs.current[i]
        if (el) { el.style.left = c.x + 'px'; el.style.top = c.y + 'px' }
      })
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  const handlePlay = () => { audio.startMusic(); audio.play('click'); onPlay() }
  const handleDuel = () => { audio.startMusic(); audio.play('click'); onDuel() }
  const handleMarathon = () => { audio.startMusic(); audio.play('click'); onMarathon() }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden scrollbar-hide rainbow-bg">

      {/* Traversing creatures — fixed to viewport, moved by RAF */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {CREATURE_SRCS.map((src, i) => (
          <div
            key={i}
            ref={el => creatureRefs.current[i] = el}
            style={{
              position: 'absolute',
              opacity: CREATURE_META[i].opacity,
              userSelect: 'none',
            }}>
            <img
              src={src}
              alt=""
              width={CREATURE_META[i].size}
              height={CREATURE_META[i].size}
              style={{ objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}
            />
          </div>
        ))}
      </div>

      {/* Settings modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Quick play modal */}
      {showQuickPlayModal && (
        <div
          className="fixed inset-0 flex items-end justify-center"
          style={{ zIndex: 100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowQuickPlayModal(false)}>
          <div
            className="w-full max-w-md rounded-t-3xl p-6 pb-10"
            style={{ background: 'rgba(18,18,28,0.97)', border: '1px solid rgba(255,255,255,0.12)' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="text-4xl text-center mb-3">⚡</div>
            <h2 className="text-white font-black text-lg tracking-wide text-center mb-4">Partie Rapide</h2>
            <div className="flex flex-col gap-2 mb-6" style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.875rem', lineHeight: '1.6' }}>
              <p>🎯 Mode <strong style={{ color: 'white' }}>Normal</strong> avec une catégorie aléatoire.</p>
              <p>⭐ Les points s'affichent en jeu mais <strong style={{ color: 'white' }}>ne sont pas sauvegardés</strong>.</p>
              <p>🔥 Ton <strong style={{ color: 'white' }}>streak</strong> ne sera pas incrémenté.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowQuickPlayModal(false)}
                className="flex-1 py-3 rounded-2xl font-black text-sm active:scale-95 transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}>
                Annuler
              </button>
              <button
                onClick={() => { audio.play('click'); setShowQuickPlayModal(false); onQuickPlay() }}
                className="flex-1 py-3 rounded-2xl font-black text-sm active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #D94A10 100%)', color: 'white' }}>
                C'est parti ! ⚡
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gear button — top right */}
      <button
        onClick={() => { audio.play('click'); setShowSettings(true) }}
        className="fixed top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full active:scale-90 transition-all"
        style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(0,0,0,0.12)', zIndex: 40, fontSize: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        ⚙️
      </button>

      {/* Header */}
      <div className="relative pt-1 pb-0 px-6 flex flex-col items-center shrink-0" style={{ zIndex: 1 }}>

        {/* Star logo */}
        <StarLogo />

        {/* Subtitle */}
        <p className="text-sm font-black tracking-[0.15em] uppercase -mt-1 mb-1.5" style={{ color: '#7C3AED' }}>
          Vrai ou fou ?
        </p>

        {/* Stats row */}
        <div className="flex gap-2 w-full justify-center">
          <div className="flex-1 max-w-32 rounded-2xl p-2 text-center border"
            style={{ background: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
            <div className="text-2xl mb-0.5">🔥</div>
            <div className="text-xl font-black" style={{ color: '#1a1a2e' }}>{streak}</div>
            <div className="text-xs font-bold uppercase tracking-wide" style={{ color: '#666' }}>Streak</div>
          </div>
          <div className="flex-1 max-w-32 rounded-2xl p-2 text-center border"
            style={{ background: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
            <div className="text-2xl mb-0.5">⭐</div>
            <div className="text-xl font-black" style={{ color: '#1a1a2e' }}>{totalScore}</div>
            <div className="text-xs font-bold uppercase tracking-wide" style={{ color: '#666' }}>Score Total</div>
          </div>
        </div>
      </div>

      {/* Play button */}
      <div className="px-6 py-1 shrink-0" style={{ position: 'relative', zIndex: 1 }}>
        <button
          onClick={() => { audio.play('click'); setShowQuickPlayModal(true) }}
          className="btn-press w-full py-2.5 rounded-2xl text-white text-sm font-black tracking-wide uppercase transition-all duration-150 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #FF6B1A 0%, #D94A10 100%)',
            boxShadow: '0 8px 40px rgba(255, 92, 26, 0.55), 0 2px 8px rgba(0,0,0,0.4)',
            WebkitTextStroke: '0.5px rgba(255,255,255,0.3)',
          }}>
          <span className="flex items-center justify-center gap-3">
            <span className="text-xl">⚡</span>
            Lancer une partie rapide
          </span>
        </button>
      </div>

      {/* Game modes grid */}
      <div className="px-6 pb-0.5 flex-1 overflow-hidden flex flex-col" style={{ position: 'relative', zIndex: 1 }}>
        <div className="flex items-center gap-2 mb-0.5 shrink-0">
          <div className="h-px flex-1" style={{ background: 'rgba(0,0,0,0.15)' }} />
          <h2 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(0,0,0,0.45)' }}>Modes de jeu</h2>
          <div className="h-px flex-1" style={{ background: 'rgba(0,0,0,0.15)' }} />
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="grid grid-cols-2 gap-0.5">
          {GAME_MODES.map((mode) => (
            <div
              key={mode.id}
              onClick={mode.active ? (mode.id === 'duel' ? handleDuel : mode.id === 'marathon' ? handleMarathon : handlePlay) : undefined}
              className={`rounded-2xl p-2 border transition-all duration-150 ${
                mode.active ? 'cursor-pointer active:scale-95' : 'opacity-40 cursor-not-allowed'
              }`}
              style={mode.active ? {
                background: 'rgba(255,255,255,0.6)',
                borderColor: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              } : {
                background: 'rgba(255,255,255,0.3)',
                borderColor: 'rgba(255,255,255,0.5)',
                backdropFilter: 'blur(8px)',
              }}>
              <div className="text-2xl mb-1">{mode.emoji}</div>
              <div className="font-black text-xs" style={{ color: mode.active ? '#1a1a2e' : '#555' }}>
                {mode.label}
              </div>
              <div className="text-xs mt-0.5 font-bold" style={{ color: mode.active ? '#FF6B1A' : '#aaa' }}>
                {renderTextWithBoldFact(mode.desc)}
              </div>
            </div>
          ))}
        </div>
        </div>

        {/* Share button — anchored below cards, always visible */}
        <button
          onClick={() => {
            audio.play('click')
            const text = '🤯 What The F*ct! Vrai ou fou ?\n\nTrouve les réponses les plus WTF du web!\n\nhttps://wtf-app-livid.vercel.app/'
            if (navigator.share) {
              navigator.share({ text }).catch(() => {})
            } else {
              navigator.clipboard?.writeText(text).catch(() => {})
            }
          }}
          className="mt-1 pt-0.5 w-full py-1.5 rounded-2xl text-white font-black text-xs uppercase transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)',
            border: '1px solid rgba(255,255,255,0.3)',
            backdropFilter: 'blur(8px)',
          }}>
          <span className="text-lg">📤</span>
          Partager l'app
        </button>
      </div>

      {/* Cat president — bottom decoration */}
      <div className="w-full flex justify-center shrink-0" style={{ position: 'relative', zIndex: 1, maxHeight: '80px', overflow: 'hidden' }}>
        <img
          src="/cat-president.png"
          alt="Cat President"
          className="w-full object-contain"
          style={{ maskImage: 'linear-gradient(to top, transparent 0%, black 30%)', WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 30%)' }}
        />
      </div>
    </div>
  )
}
