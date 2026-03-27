import { useState, useEffect } from 'react'
import SettingsModal from '../components/SettingsModal'
import { audio } from '../utils/audio'
import { CATEGORIES } from '../data/facts'

const RANK_LEVELS = [
  { min: 0,  max: 0,  emoji: '💀', label: 'Catastrophe',  color: '#6B7280' },
  { min: 1,  max: 5,  emoji: '😅', label: 'Apprenti',     color: '#3B82F6' },
  { min: 6,  max: 10, emoji: '🧠', label: 'Curieux',      color: '#8B5CF6' },
  { min: 11, max: 17, emoji: '🔥', label: 'Expert',       color: '#F59E0B' },
  { min: 18, max: 99, emoji: '👑', label: 'GÉNIE WTF!',   color: '#FF5C1A' },
]

function getRank(score) {
  return RANK_LEVELS.find((r) => score >= r.min && score <= r.max) || RANK_LEVELS[0]
}

function getStars(correct, total) {
  const ratio = correct / total
  if (ratio === 1) return 3
  if (ratio >= 0.6) return 2
  if (ratio > 0) return 1
  return 0
}

const DIFFICULTY_LABELS = { easy: 'Facile', normal: 'Normal', expert: 'Expert' }
const DIFFICULTY_EMOJIS = { easy: '💚', normal: '🧠', expert: '⚡' }

export default function ResultsScreen({ score, correctCount, totalFacts, onReplay, onHome, completedCategoryLevels = [] }) {
  const [showSettings, setShowSettings] = useState(false)
  useEffect(() => { audio.vibrate([50, 30, 100]) }, [])
  const rank = getRank(score)
  const stars = getStars(correctCount, totalFacts)
  const maxScore = totalFacts * 5
  const pct = Math.round((score / maxScore) * 100)

  return (
    <div
      className="flex flex-col h-full w-full screen-enter overflow-hidden"
      style={{ background: `linear-gradient(170deg, #06304A 0%, #0A4870 20%, #C45A00 65%, #7A2E00 85%, #3A1200 100%)` }}>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Settings button — top right */}
      <button
        onClick={() => { audio.play('click'); setShowSettings(true) }}
        className="fixed top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full active:scale-90 transition-all"
        style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(0,0,0,0.12)', zIndex: 40, fontSize: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        ⚙️
      </button>

      {/* Header */}
      <div className="flex flex-col items-center pt-4 pb-2 px-6 shrink-0">
        <div className="text-5xl mb-1 animate-bounce-in">{rank.emoji}</div>
        <div
          className="text-lg font-black mb-0.5"
          style={{ color: rank.color }}>
          {rank.label}
        </div>
        <div className="text-white/50 text-xs font-semibold">Partie terminée !</div>
      </div>

      {/* Stars */}
      <div className="flex justify-center gap-2 pb-2 shrink-0">
        {[1, 2, 3].map((s) => (
          <span
            key={s}
            className="text-4xl transition-all duration-300"
            style={{
              filter: s <= stars ? 'drop-shadow(0 0 12px #FF5C1A)' : 'none',
              opacity: s <= stars ? 1 : 0.15,
            }}>
            ⭐
          </span>
        ))}
      </div>

      {/* Score card */}
      <div className="mx-5 mb-3 rounded-3xl border p-4 shrink-0" style={{ background: 'rgba(0,0,0,0.35)', borderColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)' }}>
        {/* Big score */}
        <div className="text-center mb-4">
          <div className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">Score final</div>
          <div className="text-5xl font-black" style={{ color: '#FF5C1A' }}>{score}</div>
          <div className="text-white/40 text-xs font-semibold">/ {maxScore} points max</div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-wtf-border rounded-full overflow-hidden mb-4">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #FF5C1A, #FF7A42)',
            }}
          />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xl font-black text-white">{correctCount}</div>
            <div className="text-white/40 text-xs font-semibold">Correctes</div>
          </div>
          <div>
            <div className="text-xl font-black text-white">{totalFacts - correctCount}</div>
            <div className="text-white/40 text-xs font-semibold">Ratées</div>
          </div>
          <div>
            <div className="text-xl font-black" style={{ color: '#FF5C1A' }}>{pct}%</div>
            <div className="text-white/40 text-xs font-semibold">Précision</div>
          </div>
        </div>
      </div>

      {/* Scoring reminder */}
      <div className="mx-5 mb-3 rounded-2xl border p-2 shrink-0" style={{ background: 'rgba(0,0,0,0.25)', borderColor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
        <div className="text-white/50 text-xs font-bold uppercase tracking-widest mb-2">Rappel scoring</div>
        <div className="flex justify-between text-2xs gap-1">
          {[
            { label: '+5', pts: '0 ind', color: '#22C55E' },
            { label: '+3', pts: '1 ind', color: '#F59E0B' },
            { label: '+2', pts: '2 ind', color: '#EF4444' },
            { label: '0', pts: 'Faux', color: '#3B82F6' },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center flex-1">
              <div className="font-black text-xs" style={{ color: item.color }}>{item.label}</div>
              <div className="text-white/40 text-2xs font-semibold">{item.pts}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Completion rewards */}
      {completedCategoryLevels.length > 0 && (
        <div className="mx-5 mb-3 rounded-2xl border p-4 shrink-0" style={{ background: 'rgba(255,215,0,0.12)', borderColor: 'rgba(255,215,0,0.4)', backdropFilter: 'blur(8px)' }}>
          <div className="text-white/70 text-xs font-bold uppercase tracking-widest mb-3 text-center">🏆 Niveau complété !</div>
          {completedCategoryLevels.map(({ catId, difficulty }) => {
            const cat = CATEGORIES.find(c => c.id === catId)
            return (
              <div key={`${catId}_${difficulty}`} className="flex items-center gap-3 mb-2 last:mb-0 p-2 rounded-xl" style={{ background: 'rgba(255,215,0,0.1)' }}>
                {cat?.image ? (
                  <img src={cat.image} alt={cat.label} className="w-10 h-10 rounded-lg object-contain" style={{ background: 'rgba(255,255,255,0.1)' }} />
                ) : (
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl" style={{ background: 'rgba(255,255,255,0.1)' }}>{cat?.emoji || '🌟'}</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-black text-white text-xs">{DIFFICULTY_EMOJIS[difficulty]} {cat?.label || catId} — {DIFFICULTY_LABELS[difficulty]}</div>
                  <div className="text-yellow-300 text-xs font-semibold mt-0.5">De nouveaux facts arrivent bientôt !</div>
                </div>
                <div className="text-2xl">🥇</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Actions */}
      <div className="px-5 pb-3 flex flex-col gap-2 shrink-0">
        <button
          onClick={onReplay}
          className="btn-press w-full py-3 rounded-2xl text-white font-black text-sm uppercase tracking-wide active:scale-95 transition-all"
          style={{
            background: 'linear-gradient(135deg, #FF5C1A 0%, #D94A10 100%)',
            boxShadow: '0 8px 32px rgba(255, 92, 26, 0.4)',
          }}>
          🔄 Rejouer
        </button>
        <button
          onClick={onHome}
          className="btn-press w-full py-3 rounded-2xl border border-wtf-border text-white/70 font-bold text-xs active:scale-95 transition-all"
          style={{ background: 'rgba(255,255,255,0.04)' }}>
          🏠 Accueil
        </button>
      </div>
    </div>
  )
}
