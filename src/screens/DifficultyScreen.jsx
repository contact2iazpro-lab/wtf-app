import { useState } from 'react'
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
      '6 choix possibles',
      '20 secondes de réflexion',
      'Avec indices',
      '3/2/1 points selon les indices',
    ],
  },
]

export default function DifficultyScreen({ onSelectDifficulty, onBack }) {
  const [selectedId, setSelectedId] = useState('normal')

  const handleSelect = (difficultyId) => {
    const difficulty = DIFFICULTY_LEVELS.find(d => d.id === difficultyId)
    const difficultyObj = {
      id: difficulty.id,
      label: difficulty.label,
      emoji: difficulty.emoji,
      choices: difficultyId === 'expert' || difficultyId === 'easy' ? 6 : 4,
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
    <div className="flex flex-col h-full w-full overflow-hidden scrollbar-hide screen-enter" style={{ background: 'linear-gradient(170deg, #06304A 0%, #0A4870 20%, #C45A00 65%, #7A2E00 85%, #3A1200 100%)' }}>
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
              background: selectedId === difficulty.id
                ? `${difficulty.color}25`
                : 'rgba(255,255,255,0.08)',
              borderColor: selectedId === difficulty.id
                ? difficulty.color
                : 'rgba(255,255,255,0.15)',
              boxShadow: selectedId === difficulty.id
                ? `0 0 20px ${difficulty.color}40`
                : 'none',
            }}>
            {/* Emoji + Title */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{difficulty.emoji}</span>
              <div>
                <h2 className="text-white font-black text-lg" style={{ color: difficulty.color }}>
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
                <div key={i} className="text-white/70 flex items-center gap-2">
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
