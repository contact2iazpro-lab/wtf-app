import { useState } from 'react'
import SettingsModal from '../components/SettingsModal'
import { audio } from '../utils/audio'

// COR 1 — Ordre croissant : Curieux → À fond → WTF! Addict
const DIFFICULTY_LEVELS = [
  {
    id: 'easy',
    label: 'Curieux',
    emoji: '💚',
    color: '#22C55E',
    colorRgba: 'rgba(34, 197, 94, 0.82)',
    description: [
      '4 choix possibles',
      '60 secondes de réflexion',
      'Avec indices disponibles',
      '3/2/1 points selon les indices',
    ],
  },
  {
    id: 'normal',
    label: 'À fond',
    emoji: '🧠',
    color: '#3B82F6',
    colorRgba: 'rgba(59, 130, 246, 0.82)',
    description: [
      '4 choix possibles',
      '60 secondes de réflexion',
      'Sans indices',
      '3 points par réponse correcte',
    ],
  },
  {
    id: 'expert',
    label: 'WTF! Addict',
    emoji: '⚡',
    color: '#FF5C1A',
    colorRgba: 'rgba(255, 92, 26, 0.82)',
    description: [
      '6 choix possibles',
      '30 secondes de réflexion',
      'Sans indices',
      '5 points par réponse correcte',
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
        {/* COR 3 — Titre plus grand et contrasté */}
        <h1 className="text-xl md:text-2xl font-black text-white text-center flex-1" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
          Jusqu'où tu veux aller ?
        </h1>
        <div className="w-8 md:w-9" />
      </div>

      {/* COR 3 — Sous-titre plus visible */}
      <p className="text-center text-sm font-black uppercase tracking-[0.15em] mb-1.5 shrink-0" style={{ color: 'rgba(255,255,255,0.88)' }}>
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
                opacity: isSelected ? 1 : 0.55,
                // COR 4 — Bordure blanche épaisse (toujours visible), scale + shadow
                border: isSelected
                  ? '4px solid rgba(255,255,255,0.95)'
                  : '4px solid transparent',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isSelected
                  ? `0 8px 28px ${difficulty.color}70, 0 0 0 2px ${difficulty.color}50`
                  : 'none',
                transition: 'opacity 0.2s ease, border-color 0.15s ease, transform 0.15s ease, box-shadow 0.2s ease',
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

              {/* COR 2 — Descripteurs blancs, bold, lisibles sur fond coloré */}
              <div className="space-y-1">
                {difficulty.description.map((desc, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="shrink-0 text-white/60 text-xs">•</span>
                    <span className="text-white font-bold text-xs md:text-sm leading-snug">{desc}</span>
                  </div>
                ))}
              </div>
            </button>
          )
        })}
      </div>

      {/* Bouton "C'EST PARTI ! ⚡" */}
      <div className="px-3 md:px-4 pb-4 pt-2 shrink-0">
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
