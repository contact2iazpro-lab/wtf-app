import { useState, useMemo } from 'react'
import SettingsModal from '../components/SettingsModal'
import { CATEGORIES, VALID_FACTS } from '../data/facts'
import { audio } from '../utils/audio'

export default function CategoryScreen({ onSelectCategory, onBack }) {
  const [showSettings, setShowSettings] = useState(false)

  // Compute which categories have at least one valid fact
  const categoriesWithFacts = useMemo(() => {
    const categoryIds = new Set(VALID_FACTS.map(f => f.category))
    return categoryIds
  }, [])
  return (
    <div className="flex flex-col h-full w-full overflow-hidden screen-enter rainbow-bg">
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Settings button — top right */}
      <button
        onClick={() => { audio.play('click'); setShowSettings(true) }}
        className="fixed top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full active:scale-90 transition-all"
        style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(0,0,0,0.12)', zIndex: 40, fontSize: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        ⚙️
      </button>

      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-4 pb-2 shrink-0" style={{ position: 'relative', zIndex: 1 }}>
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'rgba(255,255,255,0.12)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.15)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', color: 'white' }}>
          ←
        </button>
        <div>
          <h1 className="text-xl font-black" style={{ color: 'white' }}>Choisis une catégorie</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>What The <strong>F*ct</strong> ! Vrai ou fou ?</p>
        </div>
      </div>

      <div className="flex-1 px-4 pb-3 overflow-y-auto scrollbar-hide" style={{ position: 'relative', zIndex: 1 }}>
        {/* Categories grid — 2 per row, 8 rows total */}
        <div className="grid grid-cols-2 gap-1.5">
          {/* Random button — arc-en-ciel uniquement */}
          <button
            onClick={() => onSelectCategory(null)}
            className="btn-press rounded-xl px-2 text-center transition-all duration-150 active:scale-95 flex flex-col items-center justify-center gap-1"
            style={{ height: '85px', background: 'linear-gradient(135deg, #FF6B1A 0%, #FF3385 30%, #9B59B6 60%, #3498DB 80%, #2ECC71 100%)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.5)', color: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>
            <span className="text-2xl">🎲</span>
            <span className="font-bold text-xs leading-tight">
              Aléatoires
            </span>
          </button>

          {/* Categories — chaque carte utilise la couleur de sa catégorie */}
          {CATEGORIES.map((cat) => {
            const hasFacts = categoriesWithFacts.has(cat.id)
            return (
              <button
                key={cat.id}
                onClick={() => hasFacts && onSelectCategory(cat.id)}
                disabled={!hasFacts}
                className={`rounded-xl px-2 text-center transition-all duration-150 flex flex-col items-center justify-center gap-1 ${hasFacts ? 'btn-press active:scale-95 cursor-pointer' : 'cursor-not-allowed opacity-40'}`}
                style={{
                  height: '85px',
                  background: hasFacts ? (cat.color + '30') : 'rgba(100, 100, 100, 0.15)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: hasFacts ? (cat.color + '90') : 'rgba(100, 100, 100, 0.3)',
                  color: hasFacts ? cat.color : 'rgba(255, 255, 255, 0.3)',
                  boxShadow: hasFacts ? `0 2px 12px ${cat.color}30` : 'none',
                }}>
                <span className="text-2xl">{cat.emoji}</span>
                <span className="font-bold text-xs leading-tight">
                  {cat.label}
                </span>
                {!hasFacts && <span className="text-xs" style={{ marginTop: '4px' }}>Bientôt</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
