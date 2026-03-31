import { useState } from 'react'
import SettingsModal from '../components/SettingsModal'
import { audio } from '../utils/audio'

const DIFFICULTY_LEVELS = [
  {
    id: 'cool',
    label: 'Cool',
    emoji: '❄️',
    color: '#3B82F6',
    cardBg: '#0a1628',
    badge: 'Accessible',
    description: '4 choix de réponse · Indices disponibles',
    stats: [
      { label: 'QCM', value: '4 choix' },
      { label: 'Indices', value: '2 coins' },
      { label: 'Gains', value: '3 coins' },
    ],
    choices: 4, freeHints: 0, paidHints: 2, hintCost: 2, coinsPerCorrect: 3,
    scoring: { correct: 3, wrong: 0 },
  },
  {
    id: 'hot',
    label: 'Hot',
    emoji: '🔥',
    color: '#FF6B1A',
    cardBg: '#1a0a00',
    badge: 'Intense',
    description: '4 choix de réponse · Indices plus chers',
    stats: [
      { label: 'QCM', value: '4 choix' },
      { label: 'Indices', value: '5 coins' },
      { label: 'Gains', value: '3 coins' },
    ],
    choices: 4, freeHints: 0, paidHints: 2, hintCost: 5, coinsPerCorrect: 3,
    scoring: { correct: 3, wrong: 0 },
  },
  {
    id: 'wtf',
    label: 'WTF!',
    emoji: '⚡',
    color: '#8B5CF6',
    cardBg: '#120a1a',
    badge: 'Sans filet',
    description: '6 choix de réponse · Indices rares',
    stats: [
      { label: 'QCM', value: '6 choix' },
      { label: 'Indices', value: '8 coins' },
      { label: 'Gains', value: '5 coins' },
    ],
    choices: 6, freeHints: 0, paidHints: 1, hintCost: 8, coinsPerCorrect: 5,
    scoring: { correct: 5, wrong: 0 },
  },
]

export default function DifficultyScreen({ onSelectDifficulty, onBack }) {
  const [selectedId, setSelectedId] = useState(null)
  const [showSettings, setShowSettings] = useState(false)

  const handleSelect = (difficultyId) => {
    const d = DIFFICULTY_LEVELS.find(l => l.id === difficultyId)
    audio.play('click')
    onSelectDifficulty({
      id: d.id,
      label: d.label,
      emoji: d.emoji,
      choices: d.choices,
      duration: 30,
      hintsAllowed: true,
      freeHints: d.freeHints,
      paidHints: d.paidHints,
      hintCost: d.hintCost,
      coinsPerCorrect: d.coinsPerCorrect,
      scoring: d.scoring,
    })
  }

  const hasSelection = selectedId !== null

  return (
    <div className="flex flex-col h-full w-full overflow-hidden screen-enter" style={{ background: '#0f0f1a' }}>

      <style>{`
        @keyframes cta-pulse {
          0%, 100% { box-shadow: 0 8px 32px rgba(255,107,26,0.4); }
          50%       { box-shadow: 0 8px 32px rgba(255,107,26,0.7), 0 0 0 6px rgba(255,107,26,0.15); }
        }
        .cta-pulse { animation: cta-pulse 2s ease-in-out infinite; }
      `}</style>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Header */}
      <div className="px-3 pt-2 pb-1 flex items-center justify-between shrink-0">
        <button
          onClick={() => { audio.play('click'); onBack() }}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', fontSize: 16 }}>
          ←
        </button>

        <h1
          className="flex-1 text-center font-black"
          style={{ fontSize: 24, color: 'white', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
          Choisis ton niveau
        </h1>

        <button
          onClick={() => { audio.play('click'); setShowSettings(true) }}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', fontSize: 16 }}>
          ⚙️
        </button>
      </div>

      <p
        className="text-center shrink-0 mb-2"
        style={{ fontSize: 13, fontWeight: 700, letterSpacing: '1.5px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
        Quête WTF!
      </p>

      {/* Cards */}
      <div className="px-3 flex-1 flex flex-col gap-2 overflow-y-auto scrollbar-hide py-1">
        {DIFFICULTY_LEVELS.map((d) => {
          const isSelected = selectedId === d.id
          return (
            <button
              key={d.id}
              onClick={() => { audio.play('click'); setSelectedId(d.id) }}
              className="btn-press rounded-2xl text-left relative overflow-hidden shrink-0"
              style={{
                background: d.cardBg,
                border: isSelected ? `2.5px solid ${d.color}` : `1.5px solid ${d.color}`,
                boxShadow: isSelected ? `0 0 24px ${d.color}40, inset 0 0 30px ${d.color}08` : 'none',
                transition: 'all 0.2s ease',
                padding: '10px 12px',
              }}>

              {/* Decoration emoji */}
              <span style={{
                position: 'absolute', top: -10, right: -5,
                fontSize: 80, opacity: 0.06, lineHeight: 1,
                pointerEvents: 'none',
              }}>{d.emoji}</span>

              {/* Top row: icon + name + badge */}
              <div className="flex items-center gap-2 mb-1" style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `${d.color}33`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, flexShrink: 0,
                }}>{d.emoji}</div>
                <h2 style={{ fontSize: 22, fontWeight: 900, color: d.color, flex: 1 }}>{d.label}</h2>
                <span style={{
                  background: `${d.color}26`,
                  color: d.color,
                  fontSize: 9, fontWeight: 700,
                  padding: '2px 8px', borderRadius: 20,
                }}>{d.badge}</span>
              </div>

              {/* Description */}
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 600, marginBottom: 6, position: 'relative', zIndex: 1 }}>
                {d.description}
              </p>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: 6, position: 'relative', zIndex: 1 }}>
                {d.stats.map((s, i) => (
                  <div key={i} style={{
                    flex: 1, textAlign: 'center',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 8, padding: '4px 3px',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 1 }}>{s.label}</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: d.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </button>
          )
        })}
      </div>

      {/* CTA button */}
      <div className="px-3 pb-4 pt-2 shrink-0">
        <button
          onClick={() => hasSelection && handleSelect(selectedId)}
          disabled={!hasSelection}
          className={`btn-press w-full rounded-2xl font-black uppercase tracking-wide active:scale-95 transition-all ${hasSelection ? 'cta-pulse' : ''}`}
          style={{
            fontSize: 17,
            fontWeight: 900,
            paddingTop: 16,
            paddingBottom: 16,
            background: hasSelection ? '#FF6B1A' : 'rgba(255,255,255,0.08)',
            color: hasSelection ? 'white' : 'rgba(255,255,255,0.25)',
            border: hasSelection ? 'none' : '1px solid rgba(255,255,255,0.1)',
            cursor: hasSelection ? 'pointer' : 'default',
          }}>
          {hasSelection ? "C'EST PARTI !" : 'Sélectionne un niveau'}
        </button>
      </div>
    </div>
  )
}
