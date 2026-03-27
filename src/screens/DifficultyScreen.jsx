import { useState } from 'react'
import SettingsModal from '../components/SettingsModal'
import { audio } from '../utils/audio'

const DIFFICULTY_LEVELS = [
  {
    id: 'expert',
    label: 'Parcours Expert',
    emoji: '⚡',
    color: '#FF5C1A',
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
      <div className="px-6 pt-4 pb-3 flex items-center justify-between shrink-0">
        <button
          onClick={handleBack}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors active:scale-90"
          style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
          ←
        </button>
        <h1 className="text-2xl font-black text-white">Choisir un parcours</h1>
        <div className="w-10" />
      </div>

      {/* Difficulty Cards */}
      <div className="px-6 pb-3 flex-1 flex flex-col gap-3 overflow-y-auto scrollbar-hide">
        {DIFFICULTY_LEVELS.map((difficulty) => (
          <button
            key={difficulty.id}
            onClick={() => setSelectedId(difficulty.id)}
            className="btn-press rounded-3xl p-6 border-2 transition-all text-left active:scale-95"
            style={{
              background: difficulty.color,
              borderWidth: '0',
            }}>
            {/* Emoji + Title */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{difficulty.emoji}</span>
              <div>
                <h2 className="text-white font-black text-lg">
                  {difficulty.label}
                </h2>
              </div>
              {selectedId === difficulty.id && (
                <div className="ml-auto text-2xl">✓</div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1 text-sm">
              {difficulty.description.map((desc, i) => (
                <div key={i} className="text-white/80 flex items-center gap-2">
                  <span className="text-xs">•</span>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Start Button */}
      <div className="px-6 pb-3 shrink-0">
        <button
          onClick={() => handleSelect(selectedId)}
          className="btn-press w-full py-3 rounded-2xl text-white font-black text-base uppercase tracking-wide active:scale-95 transition-all"
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
