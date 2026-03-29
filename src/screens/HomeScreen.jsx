import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { audio } from '../utils/audio'
import SettingsModal from '../components/SettingsModal'
import { getCategoryById } from '../data/facts'
import { getDeviceId } from '../config/devConfig'

// ── Série flame visual evolution ──────────────────────────────────────────────
function getStreakFlame(streak) {
  if (streak >= 100) return { emoji: '🌟', label: 'Légendaire', color: '#FF6B1A', glow: 'rgba(255,107,26,0.8)' }
  if (streak >= 30)  return { emoji: '⭐🔥', label: `${streak} jours`, color: '#FFD700', glow: 'rgba(255,215,0,0.6)' }
  if (streak >= 7)   return { emoji: '💙🔥', label: `${streak} jours`, color: '#60A5FA', glow: 'rgba(96,165,250,0.5)' }
  return { emoji: '🔥', label: streak > 0 ? `${streak} jours` : '0 jour', color: '#FF6B1A', glow: 'rgba(255,107,26,0.4)' }
}

// ── Countdown to midnight ─────────────────────────────────────────────────────
function useCountdownToMidnight() {
  const getRemaining = () => {
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0)
    const diff = midnight - now
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return `${h}h ${String(m).padStart(2, '0')}min`
  }
  const [remaining, setRemaining] = useState(getRemaining)
  useEffect(() => {
    const timer = setInterval(() => setRemaining(getRemaining()), 30000)
    return () => clearInterval(timer)
  }, [])
  return remaining
}

// ── Logo ──────────────────────────────────────────────────────────────────────
function StarLogo() {
  return (
    <div className="relative flex items-center justify-center animate-fade-up" style={{ width: 110, height: 110 }}>
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(circle, rgba(255,180,0,0.3) 0%, transparent 65%)',
        filter: 'blur(18px)',
      }} />
      <img
        src="/logo-wtf.png"
        alt="WTF!"
        style={{ width: 150, height: 150, objectFit: 'contain', position: 'relative', zIndex: 1, filter: 'drop-shadow(0 6px 20px rgba(255,120,0,0.5))' }}
      />
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function HomeScreen({
  totalScore, streak, wtfCoins, wtfDuJourFait, sessionsToday,
  onWTFDuJour, onFlashSolo, onPlay, onQuickPlay, onDuel, onMarathon,
  onOpenDevPanel,
  // Badge progress: { category, count, difficulty, remaining } or null
  nextBadgeInfo = null,
}) {
  const [showSettings, setShowSettings] = useState(false)
  const navigate = useNavigate()
  const tapCountRef = useRef(0)
  const tapTimerRef = useRef(null)
  const countdownRemaining = useCountdownToMidnight()

  const handleLogoTap = () => {
    tapCountRef.current += 1
    clearTimeout(tapTimerRef.current)
    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0
      if (onOpenDevPanel) onOpenDevPanel()
    } else {
      tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0 }, 600)
    }
  }

  const flame = getStreakFlame(streak)

  // Série state: active (played today) vs in danger (not played yet)
  const streakPlayedToday = (sessionsToday > 0) || wtfDuJourFait
  const streakInDanger = streak > 0 && !streakPlayedToday

  const handleDuel = () => { audio.startMusic(); audio.play('click'); onDuel() }
  const handleMarathon = () => { audio.startMusic(); audio.play('click'); onMarathon() }

  // MOD 6 — Modes de jeu: actifs en haut (Parcours, Flash), inactifs en bas (Marathon, Multijoueur)
  const gameModes = [
    { id: 'parcours', label: 'Quête WTF!', emoji: '🎯', desc: 'Complétez vos Collections', action: () => { audio.startMusic(); audio.play('click'); onPlay() }, active: true },
    { id: 'flash',    label: 'Session Flash',  emoji: '⚡', desc: '5 questions rapides',      action: () => { audio.play('click'); onFlashSolo() }, active: true },
    { id: 'marathon', label: 'Marathon',        emoji: '🏃', desc: '20 questions',             action: handleMarathon, active: false },
    { id: 'duel',     label: 'Multijoueur',     emoji: '🎮', desc: '2-6 joueurs',             action: handleDuel, active: false },
  ]

  return (
    <div className="flex flex-col h-full w-full overflow-hidden scrollbar-hide rainbow-bg">

      {/* ── Flame animations ── */}
      <style>{`
        @keyframes flame-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }
        @keyframes flame-danger {
          0%, 100% { opacity: 1; }
          35%, 65% { opacity: 0.2; }
        }
        .flame-active { animation: flame-pulse 1.8s ease-in-out infinite; display: inline-block; }
        .flame-danger { animation: flame-danger 1.3s ease-in-out infinite; display: inline-block; }
      `}</style>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* ── Settings button — bottom right (au-dessus de la nav bar) ── */}
      <button
        onClick={() => { audio.play('click'); setShowSettings(true) }}
        className="fixed w-10 h-10 flex items-center justify-center rounded-full active:scale-90 transition-all"
        style={{ zIndex: 40, bottom: 64, right: 16, background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(0,0,0,0.12)', fontSize: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        ⚙️
      </button>

      {/* ── Header: logo + taglines + stats ── */}
      <div className="relative pt-1 pb-0 px-4 flex flex-col items-center shrink-0" style={{ zIndex: 1 }}>
        <div onClick={handleLogoTap} style={{ cursor: 'default', WebkitTapHighlightColor: 'transparent' }}>
          <StarLogo />
        </div>

        {import.meta.env.DEV && (
          <button
            onClick={() => {
              const id = getDeviceId()
              navigator.clipboard?.writeText(id).catch(() => {})
              alert(`Device ID (copié):\n\n${id}`)
            }}
            className="text-xs px-2 py-0.5 rounded-lg font-mono -mt-1 mb-0.5"
            style={{ background: 'rgba(0,0,0,0.12)', color: 'rgba(0,0,0,0.35)', border: '1px solid rgba(0,0,0,0.08)' }}>
            Afficher mon Device ID
          </button>
        )}

        {/* MOD 1 — Taglines */}
        <p className="text-sm font-black tracking-[0.15em] uppercase -mt-1 mb-0" style={{ color: '#7C3AED' }}>
          Vrai ou fou ?
        </p>
        <p className="text-sm font-black mb-2" style={{ color: '#7C3AED', letterSpacing: '0.02em' }}>
          Des faits 100% vrais, des réactions 100% fun
        </p>

        {/* MOD 7 — Stats row: Série + WTF Coins — même px-4 que les blocs en dessous */}
        <div className="flex gap-2 w-full">

          {/* MOD 2/3 — Série (ex-Streak) avec flamme animée */}
          <div
            className="flex-1 rounded-2xl p-2 text-center border"
            style={{
              background: 'rgba(255,255,255,0.6)',
              borderColor: streakInDanger ? 'rgba(255,107,26,0.7)' : 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(12px)',
              boxShadow: `0 4px 16px ${streakInDanger ? 'rgba(255,107,26,0.35)' : flame.glow}`,
            }}>
            <div className="text-xl mb-0">
              <span className={streakPlayedToday ? 'flame-active' : streakInDanger ? 'flame-danger' : ''}>
                {flame.emoji}
              </span>
            </div>
            <div className="text-lg font-black leading-tight" style={{ color: '#1a1a2e' }}>{streak}</div>
            <div className="text-xs font-bold uppercase tracking-wide" style={{ color: '#666' }}>Série</div>
            {streakInDanger && (
              <div className="text-xs font-bold mt-0.5" style={{ color: '#FF6B1A' }}>⚠️ En danger !</div>
            )}
          </div>

          {/* WTF Coins */}
          <div
            className="flex-1 rounded-2xl p-2 text-center border"
            style={{ background: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
            <div className="mb-0 flex items-center justify-center">
              <span className="font-black text-xs px-1.5 py-0.5 rounded" style={{ color: 'white', background: '#FF6B1A', letterSpacing: '0.04em' }}>WTF$</span>
            </div>
            <div className="text-lg font-black leading-tight" style={{ color: '#1a1a2e' }}>{wtfCoins}</div>
            <div className="text-xs font-bold uppercase tracking-wide" style={{ color: '#666' }}>WTF Coins</div>
          </div>

        </div>
      </div>

      {/* ── MOD 4 — WTF du Jour avec countdown ── */}
      <div className="px-4 py-1.5 shrink-0" style={{ position: 'relative', zIndex: 1 }}>
        {!wtfDuJourFait ? (
          <button
            onClick={() => { audio.play('click'); onWTFDuJour() }}
            className="btn-press w-full rounded-2xl text-white font-black tracking-wide uppercase transition-all duration-150 active:scale-95 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
              boxShadow: '0 8px 40px rgba(124,58,237,0.55), 0 2px 8px rgba(0,0,0,0.4)',
            }}>
            <div className="flex items-center px-3 py-2 gap-3">
              <span className="text-2xl">🤯</span>
              <div className="flex-1 text-left">
                <div className="text-sm font-black">Le WTF du Jour t'attend !</div>
                <div className="text-xs font-bold opacity-75 normal-case tracking-normal">
                  Disponible encore {countdownRemaining}
                </div>
              </div>
              <div className="text-xs font-black px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
                NOUVEAU
              </div>
            </div>
          </button>
        ) : (
          <button
            onClick={() => { audio.play('click'); onFlashSolo() }}
            className="btn-press w-full py-2 rounded-2xl text-white text-sm font-black tracking-wide uppercase transition-all duration-150 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #FF6B1A 0%, #D94A10 100%)',
              boxShadow: '0 8px 40px rgba(255,92,26,0.55), 0 2px 8px rgba(0,0,0,0.4)',
            }}>
            <span className="flex items-center justify-center gap-3">
              <span className="text-xl">⚡</span>
              Session Flash Solo
            </span>
          </button>
        )}
      </div>

      {/* ── MOD 6/8 — Modes de jeu (Parcours + Flash en haut, Marathon + Multi en bas) ── */}
      <div className="px-4 pb-1 flex-1 overflow-hidden flex flex-col" style={{ position: 'relative', zIndex: 1 }}>
        <div className="flex items-center gap-2 mb-1.5 shrink-0">
          <div className="h-px flex-1" style={{ background: 'rgba(0,0,0,0.15)' }} />
          <h2 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(0,0,0,0.45)' }}>Modes de jeu</h2>
          <div className="h-px flex-1" style={{ background: 'rgba(0,0,0,0.15)' }} />
        </div>

        <div className="shrink-0">
          <div className="grid grid-cols-2 gap-2">
            {gameModes.map((mode) => (
              <div
                key={mode.id}
                onClick={mode.active ? mode.action : undefined}
                className={`rounded-2xl p-2.5 border transition-all duration-150 ${mode.active ? 'cursor-pointer active:scale-95' : 'opacity-40 cursor-not-allowed'}`}
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
                <div className="font-black text-xs" style={{ color: '#1a1a2e' }}>{mode.label}</div>
                {mode.active
                  ? <div className="text-xs mt-0.5 font-bold" style={{ color: '#FF6B1A' }}>{mode.desc}</div>
                  : <div className="text-xs mt-0.5 font-bold px-1.5 py-0.5 rounded-full inline-block" style={{ background: 'rgba(0,0,0,0.08)', color: 'rgba(0,0,0,0.35)' }}>Bientôt</div>
                }
              </div>
            ))}
          </div>
        </div>

        {/* MOD 5 — Bandeau prochain badge */}
        <div
          className="mt-1.5 shrink-0 rounded-xl px-3 py-1.5 border"
          style={{ background: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)' }}>
          {nextBadgeInfo ? (
            <p className="text-xs font-bold" style={{ color: '#1a1a2e' }}>
              🏅{' '}
              <span style={{ color: '#7C3AED' }}>{nextBadgeInfo.category}</span>
              {' × '}{nextBadgeInfo.count} {nextBadgeInfo.difficulty}
              {' — encore '}
              <span style={{ color: '#FF6B1A' }}>{nextBadgeInfo.remaining} facts</span>
            </p>
          ) : (
            <p className="text-xs font-bold" style={{ color: 'rgba(0,0,0,0.4)' }}>
              🏅 Commence un parcours pour débloquer ton premier badge !
            </p>
          )}
        </div>

        {/* Chat — collé au contenu, plus grand */}
        <div className="shrink-0 mt-2 flex justify-center overflow-hidden">
          <img
            src="/cat-president.png"
            alt="Cat President"
            style={{
              width: '88%',
              maxHeight: '160px',
              objectFit: 'contain',
              objectPosition: 'bottom',
              maskImage: 'linear-gradient(to top, transparent 0%, black 40%)',
              WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 40%)',
            }}
          />
        </div>
      </div>

      {/* MOD 10 — Barre de navigation en bas */}
      <div
        className="shrink-0 flex items-center justify-around py-2 px-1 border-t"
        style={{
          background: 'rgba(255,255,255,0.65)',
          borderColor: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(16px)',
          zIndex: 30,
        }}>
        {[
          { icon: '🏠', label: 'Accueil',    path: '/',           active: true },
          { icon: '📚', label: 'Collection', path: '/collection', active: false },
          { icon: '🏆', label: 'Trophées',   path: '/trophees',   active: false },
          { icon: '⚡', label: 'Blitz',      path: '/blitz',      active: false },
          { icon: '👤', label: 'Profil',     path: '/profil',     active: false },
        ].map((item) => (
          <button
            key={item.path}
            onClick={() => { audio.play('click'); if (!item.active) navigate(item.path) }}
            className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all active:scale-90"
            style={{ minWidth: 44 }}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span
              className="font-bold"
              style={{ fontSize: '0.6rem', color: item.active ? '#7C3AED' : 'rgba(0,0,0,0.4)' }}>
              {item.label}
            </span>
          </button>
        ))}
      </div>

    </div>
  )
}
