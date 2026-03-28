import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { audio } from '../utils/audio'
import SettingsModal from '../components/SettingsModal'
import { getCategoryById } from '../data/facts'
import { getDeviceId } from '../config/devConfig'

// Streak flame visual evolution
function getStreakFlame(streak) {
  if (streak >= 100) return { emoji: '🌟', label: 'Légendaire', color: '#FF6B1A', glow: 'rgba(255,107,26,0.8)' }
  if (streak >= 30) return { emoji: '⭐🔥', label: `${streak} jours`, color: '#FFD700', glow: 'rgba(255,215,0,0.6)' }
  if (streak >= 7) return { emoji: '💙🔥', label: `${streak} jours`, color: '#60A5FA', glow: 'rgba(96,165,250,0.5)' }
  return { emoji: '🔥', label: streak > 0 ? `${streak} jours` : '0 jour', color: '#FF6B1A', glow: 'rgba(255,107,26,0.4)' }
}

function StarLogo() {
  return (
    <div className="relative flex items-center justify-center animate-fade-up" style={{ width: 140, height: 140 }}>
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

export default function HomeScreen({
  totalScore, streak, wtfCoins, wtfDuJourFait, sessionsToday,
  onWTFDuJour, onFlashSolo, onPlay, onQuickPlay, onDuel, onMarathon,
  onOpenDevPanel,
}) {
  const [showSettings, setShowSettings] = useState(false)
  const [showQuickPlayModal, setShowQuickPlayModal] = useState(false)
  const navigate = useNavigate()
  const tapCountRef = useRef(0)
  const tapTimerRef = useRef(null)

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

  const handleDuel = () => { audio.startMusic(); audio.play('click'); onDuel() }
  const handleMarathon = () => { audio.startMusic(); audio.play('click'); onMarathon() }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden scrollbar-hide rainbow-bg">

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Quick play modal */}
      {showQuickPlayModal && (
        <div className="fixed inset-0 flex items-end justify-center" style={{ zIndex: 100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setShowQuickPlayModal(false)}>
          <div className="w-full max-w-md rounded-t-3xl p-6 pb-10" style={{ background: 'rgba(18,18,28,0.97)', border: '1px solid rgba(255,255,255,0.12)' }} onClick={e => e.stopPropagation()}>
            <div className="text-4xl text-center mb-3">⚡</div>
            <h2 className="text-white font-black text-lg tracking-wide text-center mb-4">Partie Rapide</h2>
            <div className="flex flex-col gap-2 mb-6" style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.875rem', lineHeight: '1.6' }}>
              <p>🎯 Mode <strong style={{ color: 'white' }}>Normal</strong> avec une catégorie aléatoire.</p>
              <p>⭐ Les points s'affichent mais <strong style={{ color: 'white' }}>ne sont pas sauvegardés</strong>.</p>
              <p>🔥 Ton <strong style={{ color: 'white' }}>streak</strong> ne sera pas incrémenté.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowQuickPlayModal(false)} className="flex-1 py-3 rounded-2xl font-black text-sm active:scale-95 transition-all" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}>
                Annuler
              </button>
              <button onClick={() => { audio.play('click'); setShowQuickPlayModal(false); onQuickPlay() }} className="flex-1 py-3 rounded-2xl font-black text-sm active:scale-95 transition-all" style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #D94A10 100%)', color: 'white' }}>
                C'est parti ! ⚡
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collection button — top left */}
      <button onClick={() => { audio.play('click'); navigate('/collection') }} className="fixed w-10 h-10 flex items-center justify-center rounded-full active:scale-90 transition-all" style={{ zIndex: 40, top: 12, left: 16, background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(0,0,0,0.12)', fontSize: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        🏆
      </button>

      {/* Settings button — top right */}
      <button onClick={() => { audio.play('click'); setShowSettings(true) }} className="fixed w-10 h-10 flex items-center justify-center rounded-full active:scale-90 transition-all" style={{ zIndex: 40, top: 12, right: 16, background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(0,0,0,0.12)', fontSize: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        ⚙️
      </button>

      {/* Header */}
      <div className="relative pt-1 pb-0 px-6 flex flex-col items-center shrink-0" style={{ zIndex: 1 }}>
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
        <p className="text-sm font-black tracking-[0.15em] uppercase -mt-1 mb-1.5" style={{ color: '#7C3AED' }}>
          Vrai ou fou ?
        </p>

        {/* Stats row: streak + coins */}
        <div className="flex gap-2 w-full justify-center">
          <div className="flex-1 max-w-32 rounded-2xl p-2 text-center border"
            style={{ background: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', boxShadow: `0 4px 16px ${flame.glow}` }}>
            <div className="text-2xl mb-0.5">{flame.emoji}</div>
            <div className="text-xl font-black" style={{ color: '#1a1a2e' }}>{streak}</div>
            <div className="text-xs font-bold uppercase tracking-wide" style={{ color: '#666' }}>Streak</div>
          </div>
          <div className="flex-1 max-w-32 rounded-2xl p-2 text-center border"
            style={{ background: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
            <div className="text-2xl mb-0.5">🪙</div>
            <div className="text-xl font-black" style={{ color: '#1a1a2e' }}>{wtfCoins}</div>
            <div className="text-xs font-bold uppercase tracking-wide" style={{ color: '#666' }}>WTF Coins</div>
          </div>
        </div>
      </div>

      {/* Main CTA — WTF du Jour or Flash Solo */}
      <div className="px-6 py-1.5 shrink-0" style={{ position: 'relative', zIndex: 1 }}>
        {!wtfDuJourFait ? (
          /* WTF du Jour not done yet — primary CTA */
          <button
            onClick={() => { audio.play('click'); onWTFDuJour() }}
            className="btn-press w-full rounded-2xl text-white font-black tracking-wide uppercase transition-all duration-150 active:scale-95 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
              boxShadow: '0 8px 40px rgba(124,58,237,0.55), 0 2px 8px rgba(0,0,0,0.4)',
            }}>
            <div className="flex items-center px-4 py-3 gap-3">
              <span className="text-3xl">🤯</span>
              <div className="flex-1 text-left">
                <div className="text-sm font-black">Le WTF du Jour t'attend !</div>
                <div className="text-xs font-bold opacity-80">Joue pour débloquer le fait du jour</div>
              </div>
              <div className="text-xs font-black px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
                NOUVEAU
              </div>
            </div>
          </button>
        ) : (
          /* WTF du Jour done — show Flash Solo CTA */
          <button
            onClick={() => { audio.play('click'); onFlashSolo() }}
            className="btn-press w-full py-2.5 rounded-2xl text-white text-sm font-black tracking-wide uppercase transition-all duration-150 active:scale-95"
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

      {/* Game modes grid */}
      <div className="px-6 pb-0.5 flex-1 overflow-hidden flex flex-col" style={{ position: 'relative', zIndex: 1 }}>
        <div className="flex items-center gap-2 mb-0.5 shrink-0">
          <div className="h-px flex-1" style={{ background: 'rgba(0,0,0,0.15)' }} />
          <h2 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(0,0,0,0.45)' }}>Autres modes</h2>
          <div className="h-px flex-1" style={{ background: 'rgba(0,0,0,0.15)' }} />
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="grid grid-cols-2 gap-0.5">
            {[
              { id: 'parcours', label: 'Mode Parcours', emoji: '🎯', desc: 'Complétez vos Collections', action: () => { audio.startMusic(); audio.play('click'); onPlay() }, active: true },
              { id: 'duel', label: 'Multijoueur', emoji: '🎮', desc: '2-6 joueurs', action: handleDuel, active: false },
              { id: 'marathon', label: 'Marathon', emoji: '🏃', desc: '20 questions', action: handleMarathon, active: false },
              { id: 'flash', label: 'Session Flash', emoji: '⚡', desc: '5 questions rapides', action: () => { audio.play('click'); onFlashSolo() }, active: true },
            ].map((mode) => (
              <div
                key={mode.id}
                onClick={mode.active ? mode.action : undefined}
                className={`rounded-2xl p-2 border transition-all duration-150 ${mode.active ? 'cursor-pointer active:scale-95' : 'opacity-40 cursor-not-allowed'}`}
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
                  : <div className="text-xs mt-0.5 font-bold px-1.5 py-0.5 rounded-full inline-block" style={{ background: 'rgba(0,0,0,0.08)', color: 'rgba(0,0,0,0.35)' }}>Bientôt disponible</div>
                }
              </div>
            ))}
          </div>
        </div>

        {/* Share app button */}
        <button
          onClick={() => {
            audio.play('click')
            const text = '🤯 What The F*ct! Vrai ou fou ?\n\nTrouve les réponses les plus WTF! du web\n\nhttps://wtf-app-livid.vercel.app/'
            if (navigator.share) navigator.share({ text }).catch(() => {})
            else navigator.clipboard?.writeText(text).catch(() => {})
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

      {/* Cat president decoration */}
      <div className="w-full flex justify-center shrink-0" style={{ position: 'relative', zIndex: 1, maxHeight: '80px', overflow: 'hidden' }}>
        <img src="/cat-president.png" alt="Cat President" className="w-full object-contain" style={{ maskImage: 'linear-gradient(to top, transparent 0%, black 30%)', WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 30%)' }} />
      </div>
    </div>
  )
}
