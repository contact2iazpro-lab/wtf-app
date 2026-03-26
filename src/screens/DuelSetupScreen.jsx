import { useState } from 'react'
import SettingsModal from '../components/SettingsModal'
import { audio } from '../utils/audio'

export const PLAYER_COLORS = ['#3B82F6', '#FF5C1A', '#22C55E', '#A855F7', '#EAB308', '#EC4899']
export const PLAYER_EMOJIS = ['⚡', '🔥', '🌿', '💜', '⭐', '🌸']

export default function DuelSetupScreen({ onStart, onBack }) {
  const [playerCount, setPlayerCount] = useState(2)
  const [names, setNames] = useState(['', '', '', '', '', ''])
  const [showSettings, setShowSettings] = useState(false)

  const updateName = (i, val) =>
    setNames(n => n.map((v, idx) => (idx === i ? val : v)))

  const updateCount = (count) => setPlayerCount(Math.min(6, Math.max(2, count)))

  const canStart = names.slice(0, playerCount).every(n => n.trim().length > 0)

  return (
    <div className="flex flex-col h-full w-full bg-wtf-bg screen-enter overflow-y-auto scrollbar-hide">
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Settings button — top right */}
      <button
        onClick={() => { audio.play('click'); setShowSettings(true) }}
        className="fixed top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full active:scale-90 transition-all"
        style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(0,0,0,0.12)', zIndex: 40, fontSize: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        ⚙️
      </button>

      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-6 pb-4 shrink-0">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-wtf-card border border-wtf-border flex items-center justify-center text-white/70 active:scale-90 transition-transform">
          ←
        </button>
        <div>
          <h1 className="text-xl font-black text-white">Multijoueur 🎮</h1>
          <p className="text-white/40 text-sm">10 questions, chacun son tour</p>
        </div>
      </div>

      {/* Player count */}
      <div className="px-6 mb-4 shrink-0">
        <div className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">Nombre de joueurs</div>
        <div className="flex items-center justify-center gap-6 bg-wtf-card rounded-2xl border border-wtf-border py-5">
          <button
            onClick={() => updateCount(playerCount - 1)}
            disabled={playerCount <= 2}
            className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-2xl transition-all"
            style={{
              background: playerCount <= 2 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.1)',
              color: playerCount <= 2 ? 'rgba(255,255,255,0.15)' : 'white',
            }}>
            −
          </button>
          <span className="text-5xl font-black text-white w-12 text-center">{playerCount}</span>
          <button
            onClick={() => updateCount(playerCount + 1)}
            disabled={playerCount >= 6}
            className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-2xl transition-all"
            style={{
              background: playerCount >= 6 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.1)',
              color: playerCount >= 6 ? 'rgba(255,255,255,0.15)' : 'white',
            }}>
            +
          </button>
        </div>
      </div>

      {/* Names */}
      <div className="px-6 flex flex-col gap-2 mb-4 flex-1 overflow-y-auto scrollbar-hide">
        {Array.from({ length: playerCount }).map((_, i) => (
          <div key={i} className="bg-wtf-card rounded-2xl border border-wtf-border p-3 shrink-0">
            <div className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: PLAYER_COLORS[i] }}>
              {PLAYER_EMOJIS[i]} Joueur {i + 1}
            </div>
            <input
              type="text"
              placeholder="Prénom..."
              value={names[i]}
              onChange={e => updateName(i, e.target.value)}
              maxLength={16}
              autoComplete="off"
              className="w-full bg-wtf-bg rounded-xl px-4 py-2.5 text-white font-bold text-base border border-wtf-border focus:outline-none placeholder:text-white/20"
            />
          </div>
        ))}
      </div>

      {/* Rules */}
      <div className="mx-6 mb-3 rounded-2xl border border-wtf-border p-3 shrink-0" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <div className="text-white/40 text-xs font-semibold leading-relaxed space-y-1">
          <div>🎲 10 questions aléatoires toutes catégories</div>
          <div>🙈 Chaque joueur répond à son tour, sans regarder</div>
          <div>🏆 Le plus grand score l'emporte !</div>
        </div>
      </div>

      {/* Start */}
      <div className="px-6 pb-4 shrink-0">
        <button
          onClick={() => canStart && onStart(names.slice(0, playerCount).map(n => n.trim()))}
          disabled={!canStart}
          className="btn-press w-full py-4 rounded-2xl text-white font-black text-base uppercase tracking-wide transition-all active:scale-95"
          style={{
            background: canStart
              ? 'linear-gradient(135deg, #FF5C1A 0%, #D94A10 100%)'
              : 'rgba(255,255,255,0.05)',
            boxShadow: canStart ? '0 8px 32px rgba(255, 92, 26, 0.4)' : 'none',
            color: canStart ? 'white' : 'rgba(255,255,255,0.2)',
          }}>
          🎮 Lancer la partie
        </button>
      </div>
    </div>
  )
}
