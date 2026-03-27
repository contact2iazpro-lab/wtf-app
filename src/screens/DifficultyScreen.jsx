import { useState } from 'react'
import SettingsModal from '../components/SettingsModal'
import { audio } from '../utils/audio'

const DIFFICULTY_LEVELS = [
  {
    id: 'expert',
    label: 'Parcours Expert',
    emoji: '⚡',
    color: '#FF5C1A',
    colorRgba: 'rgba(255, 92, 26, 0.7)',
    description: [
      '6 choix possibles',
      '10 secondes de réflexion',
      'Sans indices',
      '5 points par réponse correcte',
    ],
  },
  {
    id: 'normal',
    label: 'Parcours Normal',
    emoji: '🧠',
    color: '#3B82F6',
    colorRgba: 'rgba(59, 130, 246, 0.7)',
    description: [
      '4 choix possibles',
      '20 secondes de réflexion',
      'Sans indices',
      '3 points par réponse correcte',
    ],
  },
  {
    id: 'easy',
    label: 'Parcours Facile',
    emoji: '💚',
    color: '#22C55E',
    colorRgba: 'rgba(34, 197, 94, 0.7)',
    description: [
      '4 choix possibles',
      '20 secondes de réflexion',
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
      duration: difficultyId === 'expert' ? 10 : 20,
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

      {/* Settings button — top right */}
      <button
        onClick={() => { audio.play('click'); setShowSettings(true) }}
        className="fixed top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full active:scale-90 transition-all"
        style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(0,0,0,0.12)', zIndex: 40, fontSize: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        ⚙️
      </button>

      {/* Header */}
      <div className="px-3 md:px-4 pt-2 md:pt-3 pb-2 md:pb-2 flex items-center justify-between shrink-0">
        <button
          onClick={handleBack}
          className="w-8 md:w-9 h-8 md:h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors active:scale-90 text-base md:text-base"
          style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
          ←
        </button>
        <h1 className="text-lg md:text-xl font-black text-white text-center flex-1">Choisir un parcours</h1>
        <div className="w-8 md:w-9" />
      </div>

      {/* Difficulty Cards */}
      <div className="px-3 md:px-4 py-2 md:py-3 flex flex-col gap-2 md:gap-2.5 overflow-y-auto scrollbar-hide">
        {DIFFICULTY_LEVELS.map((difficulty) => {
          const isSelected = selectedId === difficulty.id
          return (
            <button
              key={difficulty.id}
              onClick={() => { audio.play('click'); setSelectedId(difficulty.id) }}
              className="btn-press rounded-xl md:rounded-2xl p-3 md:p-4 text-left active:scale-95"
              style={{
                background: difficulty.colorRgba,
                opacity: isSelected ? 1 : 0.5,
                border: isSelected ? '2px solid rgba(255,255,255,0.5)' : '2px solid transparent',
                transition: 'opacity 0.2s ease, border-color 0.2s ease',
              }}>

              {/* Emoji + Title */}
              <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                <span className="text-xl md:text-2xl shrink-0">{difficulty.emoji}</span>
                <h2 className="text-white font-black text-sm md:text-base flex-1">
                  {difficulty.label}
                </h2>
                {isSelected && (
                  <span className="text-white font-black text-base md:text-lg shrink-0">✓</span>
                )}
              </div>

              {/* Description */}
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

      {/* Start Button */}
      <div className="px-3 md:px-4 pb-2 md:pb-3 pt-1 shrink-0">
        <button
          onClick={() => handleSelect(selectedId)}
          className="btn-press w-full py-2.5 md:py-3 rounded-xl md:rounded-2xl text-white font-black text-sm md:text-base uppercase tracking-wide active:scale-95 transition-all"
          style={{
            background: DIFFICULTY_LEVELS.find(d => d.id === selectedId)?.color,
            boxShadow: `0 8px 32px ${DIFFICULTY_LEVELS.find(d => d.id === selectedId)?.color}40`,
          }}>
          C'est parti ! 🚀
        </button>
      </div>
    </div>
  )
}
