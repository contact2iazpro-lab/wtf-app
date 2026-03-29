import { useState } from 'react'
import SettingsModal from '../components/SettingsModal'
import { audio } from '../utils/audio'

// MOD 1+2 — Niveaux renommés : Curieux / À fond / WTF! Addict (plus de "Parcours")
const DIFFICULTY_LEVELS = [
  {
    id: 'expert',
    label: 'WTF! Addict',       // était : Parcours Expert
    emoji: '⚡',
    color: '#FF5C1A',
    colorRgba: 'rgba(255, 92, 26, 0.7)',
    description: [
      '6 choix possibles',
      '30 secondes de réflexion',
      'Sans indices',
      '5 points par réponse correcte',
    ],
  },
  {
    id: 'normal',
    label: 'À fond',             // était : Parcours Normal
    emoji: '🧠',
    color: '#3B82F6',
    colorRgba: 'rgba(59, 130, 246, 0.7)',
    description: [
      '4 choix possibles',
      '60 secondes de réflexion',
      'Sans indices',
      '3 points par réponse correcte',
    ],
  },
  {
    id: 'easy',
    label: 'Curieux',            // était : Parcours Facile
    emoji: '💚',
    color: '#22C55E',
    colorRgba: 'rgba(34, 197, 94, 0.7)',
    description: [
      '4 choix possibles',
      '60 secondes de réflexion',
      'Avec indices',
      '3/2/1 points selon les indices',
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

  const handleBack = () => {
    audio.play('click')
    onBack()
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden scrollbar-hide screen-enter rainbow-bg">
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* MOD 6 — ⚙️ en bas à droite (cohérent avec les autres écrans) */}
      <button
        onClick={() => { audio.play('click'); setShowSettings(true) }}
        className="fixed bottom-4 right-4 w-10 h-10 flex items-center justify-center rounded-full active:scale-90 transition-all"
        style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(0,0,0,0.12)', zIndex: 40, fontSize: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        ⚙️
      </button>

      {/* Header */}
      <div className="px-3 md:px-4 pt-2 md:pt-3 pb-2 flex items-center justify-between shrink-0">
        <button
          onClick={handleBack}
          className="w-8 md:w-9 h-8 md:h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors active:scale-90 text-base"
          style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
          ←
        </button>
        {/* MOD 3 — Nouveau titre */}
        <h1 className="text-lg md:text-xl font-black text-white text-center flex-1">
          Jusqu'où tu veux aller ?
        </h1>
        <div className="w-8 md:w-9" />
      </div>

      {/* MOD 1 — Sous-titre "Quête WTF!" */}
      <p className="text-center text-xs font-bold uppercase tracking-[0.18em] mb-1 shrink-0" style={{ color: 'rgba(255,255,255,0.55)' }}>
        Quête WTF! — choisis ton niveau
      </p>

      {/* Difficulty Cards */}
      <div className="px-3 md:px-4 py-1 md:py-2 flex flex-col gap-2 md:gap-2.5 overflow-y-auto scrollbar-hide">
        {DIFFICULTY_LEVELS.map((difficulty) => {
          const isSelected = selectedId === difficulty.id
          return (
            <button
              key={difficulty.id}
              onClick={() => { audio.play('click'); setSelectedId(difficulty.id) }}
              className="btn-press rounded-xl md:rounded-2xl p-3 md:p-4 text-left"
              style={{
                background: difficulty.colorRgba,
                opacity: isSelected ? 1 : 0.52,
                // MOD 4 — Bordure couleur niveau, scale animation, shadow affirmé
                border: isSelected
                  ? `3px solid ${difficulty.color}`
                  : '3px solid transparent',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isSelected
                  ? `0 6px 24px ${difficulty.color}55, 0 0 0 1px ${difficulty.color}30`
                  : 'none',
                transition: 'opacity 0.2s ease, border-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease',
              }}>

              {/* Emoji + Titre + ✓ */}
              <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                <span className="text-xl md:text-2xl shrink-0">{difficulty.emoji}</span>
                <h2 className="text-white font-black text-sm md:text-base flex-1">
                  {difficulty.label}
                </h2>
                {/* MOD 4 — ✓ plus visible : cercle blanc avec couleur niveau */}
                {isSelected && (
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-black shrink-0"
                    style={{ background: 'rgba(255,255,255,0.92)', color: difficulty.color }}>
                    ✓
                  </span>
                )}
              </div>

              {/* Descripteurs */}
              <div className="space-y-0.5">
                {difficulty.description.map((desc, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs md:text-sm">
                    <span className="text-black/50 text-2xs md:text-xs shrink-0">•</span>
                    <span className="text-black font-medium leading-snug">{desc}</span>
                  </div>
                ))}
              </div>
            </button>
          )
        })}
      </div>

      {/* MOD 5 — Bouton "C'EST PARTI ! ⚡" */}
      <div className="px-3 md:px-4 pb-16 md:pb-16 pt-2 shrink-0">
        <button
          onClick={() => handleSelect(selectedId)}
          className="btn-press w-full py-3 md:py-3.5 rounded-xl md:rounded-2xl text-white font-black text-sm md:text-base uppercase tracking-wide active:scale-95 transition-all"
          style={{
            background: DIFFICULTY_LEVELS.find(d => d.id === selectedId)?.color,
            boxShadow: `0 8px 32px ${DIFFICULTY_LEVELS.find(d => d.id === selectedId)?.color}55`,
          }}>
          C'EST PARTI ! ⚡
        </button>
      </div>
    </div>
  )
}
