import { useState } from 'react'
import SettingsModal from '../components/SettingsModal'
import { audio } from '../utils/audio'

// COR 2 — Niveaux avec dégradés, badges et descripteurs iconifiés
const DIFFICULTY_LEVELS = [
  {
    id: 'easy',
    label: 'Curieux',
    emoji: '💚',
    color: '#10B981',
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    badge: 'IDÉAL POUR COMMENCER',
    description: [
      { icon: '🎯', text: '4 choix possibles' },
      { icon: '⏱️', text: '60 secondes de réflexion' },
      { icon: '💡', text: 'Avec indices disponibles' },
      { icon: '⭐', text: '3/2/1 points selon les indices' },
    ],
  },
  {
    id: 'normal',
    label: 'À fond',
    emoji: '🧠',
    color: '#3B82F6',
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
    badge: 'LE PLUS JOUÉ',
    description: [
      { icon: '🎯', text: '4 choix possibles' },
      { icon: '⏱️', text: '60 secondes de réflexion' },
      { icon: '🚫', text: 'Sans indices' },
      { icon: '⭐', text: '3 points par réponse correcte' },
    ],
  },
  {
    id: 'expert',
    label: 'WTF! Addict',
    emoji: '⚡',
    color: '#F97316',
    gradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
    badge: 'POUR LES VRAIS 🔥',
    description: [
      { icon: '🎯', text: '6 choix possibles' },
      { icon: '⏱️', text: '30 secondes de réflexion' },
      { icon: '🚫', text: 'Sans indices' },
      { icon: '⭐', text: '5 points par réponse correcte' },
    ],
  },
]

export default function DifficultyScreen({ onSelectDifficulty, onBack }) {
  const [selectedId, setSelectedId] = useState('normal')
  const [showSettings, setShowSettings] = useState(false)

  const handleSelect = (difficultyId) => {
    const difficulty = DIFFICULTY_LEVELS.find(d => d.id === difficultyId)
    const difficultyObj = {
      id: difficulty.id,
      label: difficulty.label,
      emoji: difficulty.emoji,
      choices: difficultyId === 'expert' ? 6 : 4,
      duration: difficultyId === 'expert' ? 30 : 60,
      hintsAllowed: difficultyId === 'easy',
      scoring: difficultyId === 'expert'
        ? { correct: 5, wrong: 0 }
        : difficultyId === 'normal'
          ? { correct: 3, wrong: 0 }
          : { correct: [3, 2, 1], wrong: 0 },
    }
    audio.play('click')
    onSelectDifficulty(difficultyObj)
  }

  const selectedLevel = DIFFICULTY_LEVELS.find(d => d.id === selectedId)

  return (
    <div className="flex flex-col h-full w-full overflow-hidden screen-enter rainbow-bg">

      {/* COR 5 — Pulse animation pour le bouton CTA */}
      <style>{`
        @keyframes cta-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.5); }
          50%       { box-shadow: 0 0 0 8px rgba(255,255,255,0); }
        }
        .cta-pulse { animation: cta-pulse 2s ease-in-out infinite; }
      `}</style>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Header */}
      <div className="px-3 pt-2 pb-1 flex items-center justify-between shrink-0">
        <button
          onClick={() => { audio.play('click'); onBack() }}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all"
          style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', fontSize: 16 }}>
          ←
        </button>

        {/* COR 1 — Titre 28px, black, blanc pur */}
        <h1
          className="flex-1 text-center font-black"
          style={{ fontSize: 28, color: 'white', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
          Jusqu'où tu veux aller ?
        </h1>

        {/* ⚙️ dans le header, pas fixed */}
        <button
          onClick={() => { audio.play('click'); setShowSettings(true) }}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all"
          style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', fontSize: 16 }}>
          ⚙️
        </button>
      </div>

      {/* COR 1 — Sous-titre 14px, tracking 2px, blanc 80% */}
      <p
        className="text-center shrink-0 mb-1"
        style={{ fontSize: 14, fontWeight: 700, letterSpacing: '2px', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' }}>
        Quête WTF! — Choisis ton niveau
      </p>

      {/* COR 2 — Cartes : flex-1 pour remplir sans espace mort (COR 6) */}
      <div className="px-3 flex-1 flex flex-col gap-2 overflow-hidden py-1">
        {DIFFICULTY_LEVELS.map((difficulty) => {
          const isSelected = selectedId === difficulty.id
          return (
            <button
              key={difficulty.id}
              onClick={() => { audio.play('click'); setSelectedId(difficulty.id) }}
              className="btn-press flex-1 rounded-2xl p-3 text-left relative overflow-hidden"
              style={{
                background: difficulty.gradient,
                // COR 3 — Sélection affirmée : bordure blanche 3px + shadow + scale
                border: isSelected ? '3px solid white' : '3px solid transparent',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isSelected ? '0 0 20px rgba(255,255,255,0.4)' : 'none',
                transition: 'border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
              }}>

              {/* COR 2 — Badge haut-droite */}
              <div
                className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.22)', fontSize: 9, fontWeight: 700, color: 'white', letterSpacing: '0.5px' }}>
                {difficulty.badge}
              </div>

              {/* Emoji (32px) + Titre (22px 900) + ✓ */}
              <div className="flex items-center gap-2 mb-1.5">
                <span style={{ fontSize: 32, lineHeight: 1 }}>{difficulty.emoji}</span>
                <h2 style={{ fontSize: 22, fontWeight: 900, color: 'white', flex: 1 }}>
                  {difficulty.label}
                </h2>
                {isSelected && (
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-black shrink-0"
                    style={{ background: 'rgba(255,255,255,0.92)', color: difficulty.color }}>
                    ✓
                  </span>
                )}
              </div>

              {/* COR 4 — Descripteurs avec icônes, 14px, blanc 90%, font-weight 600 */}
              <div className="space-y-0.5">
                {difficulty.description.map((desc, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span style={{ fontSize: 12, width: 18, textAlign: 'center', flexShrink: 0 }}>{desc.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.9)', lineHeight: 1.3 }}>{desc.text}</span>
                  </div>
                ))}
              </div>
            </button>
          )
        })}
      </div>

      {/* COR 5+6 — Bouton CTA compact, sans espace vide */}
      <div className="px-3 pb-3 pt-2 shrink-0">
        <button
          onClick={() => handleSelect(selectedId)}
          className="btn-press w-full rounded-2xl font-black uppercase tracking-wide active:scale-95 transition-all cta-pulse"
          style={{
            fontSize: 18,
            fontWeight: 900,
            paddingTop: 16,
            paddingBottom: 16,
            background: 'white',
            color: selectedLevel?.color || '#3B82F6',
          }}>
          C'EST PARTI ! ⚡
        </button>
      </div>
    </div>
  )
}
