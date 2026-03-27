import { useState, useMemo } from 'react'
import SettingsModal from '../components/SettingsModal'
import { PLAYABLE_PLAYABLE_CATEGORIES, VALID_FACTS } from '../data/facts'
import { audio } from '../utils/audio'

// Convert hex color to "r, g, b" string for rgba()
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

export default function CategoryScreen({ onSelectCategory, onBack, selectedDifficulty }) {
  const [showSettings, setShowSettings] = useState(false)
  const [selectedCatId, setSelectedCatId] = useState(null) // null = nothing selected, 'random' = aléatoires, else cat.id
  const [showConfirm, setShowConfirm] = useState(false)

  const categoriesWithFacts = useMemo(() => {
    const categoryIds = new Set(VALID_FACTS.map(f => f.category))
    return categoryIds
  }, [])

  const selectedCat = selectedCatId === 'random'
    ? { label: 'Aléatoires', emoji: '🎲' }
    : PLAYABLE_CATEGORIES.find(c => c.id === selectedCatId)

  const hasSelection = selectedCatId !== null

  const handleCategoryClick = (catId) => {
    audio.play('click')
    setSelectedCatId(catId)
  }

  const handleValider = () => {
    audio.play('click')
    setShowConfirm(true)
  }

  const handleConfirm = () => {
    audio.play('click')
    onSelectCategory(selectedCatId === 'random' ? null : selectedCatId)
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden screen-enter rainbow-bg">
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Confirmation modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 flex items-center justify-center p-6"
          style={{ zIndex: 100, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowConfirm(false)}>
          <div
            className="w-full rounded-3xl p-6 border"
            style={{ background: '#fff', borderColor: 'rgba(0,0,0,0.1)', maxWidth: '420px' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="text-4xl text-center mb-4">🚀</div>
            <h2 className="text-xl font-black text-center mb-5" style={{ color: '#1a1a2e' }}>Confirmer la partie ?</h2>

            <div className="space-y-2 mb-6">
              {selectedDifficulty && (
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <span className="text-2xl shrink-0">{selectedDifficulty.emoji}</span>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide mb-0.5" style={{ color: 'rgba(0,0,0,0.35)' }}>Parcours</div>
                    <div className="font-black text-sm" style={{ color: '#1a1a2e' }}>{selectedDifficulty.label}</div>
                  </div>
                </div>
              )}
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <span className="text-2xl shrink-0">{selectedCat?.emoji}</span>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide mb-0.5" style={{ color: 'rgba(0,0,0,0.35)' }}>Catégorie</div>
                  <div className="font-black text-sm" style={{ color: '#1a1a2e' }}>{selectedCat?.label}</div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { audio.play('click'); setShowConfirm(false) }}
                className="flex-1 py-3 rounded-2xl font-black text-sm active:scale-95 transition-all"
                style={{ background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.1)', color: 'rgba(0,0,0,0.45)' }}>
                Annuler
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3 rounded-2xl font-black text-sm active:scale-95 transition-all"
                style={{ background: '#FF6B1A', color: 'white' }}>
                C'est parti ! 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings button — top right */}
      <button
        onClick={() => { audio.play('click'); setShowSettings(true) }}
        className="fixed top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full active:scale-90 transition-all"
        style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(0,0,0,0.12)', zIndex: 40, fontSize: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        ⚙️
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2 shrink-0" style={{ position: 'relative', zIndex: 1 }}>
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform shrink-0"
          style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}>
          ←
        </button>
        <div>
          <h1 className="text-lg font-black" style={{ color: 'white' }}>Choisis une catégorie</h1>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>What The <strong>F*ct</strong> ! Vrai ou fou ?</p>
        </div>
      </div>

      {/* Categories grid */}
      <div className="flex-1 px-3 pb-2 overflow-y-auto scrollbar-hide" style={{ position: 'relative', zIndex: 1 }}>
        <div className="grid grid-cols-2 gap-1.5">

          {/* Random button */}
          <button
            onClick={() => handleCategoryClick('random')}
            className="btn-press rounded-xl px-2 text-center active:scale-95 flex flex-col items-center justify-center gap-1"
            style={{
              height: '78px',
              background: 'linear-gradient(135deg, rgba(255,107,26,0.7) 0%, rgba(255,51,133,0.7) 30%, rgba(155,89,182,0.7) 60%, rgba(52,152,219,0.7) 80%, rgba(46,204,113,0.7) 100%)',
              border: selectedCatId === 'random' ? '2px solid rgba(255,255,255,0.6)' : '2px solid transparent',
              opacity: selectedCatId === null ? 1 : selectedCatId === 'random' ? 1 : 0.5,
              transition: 'opacity 0.2s ease, border-color 0.2s ease',
            }}>
            <span className="text-2xl">🎲</span>
            <span className="font-bold text-xs leading-tight text-black">Aléatoires</span>
          </button>

          {/* Category cards */}
          {PLAYABLE_CATEGORIES.map((cat) => {
            const hasFacts = categoriesWithFacts.has(cat.id)
            const isSelected = selectedCatId === cat.id
            const dimOpacity = selectedCatId === null ? 1 : isSelected ? 1 : 0.5

            return (
              <button
                key={cat.id}
                onClick={() => hasFacts && handleCategoryClick(cat.id)}
                disabled={!hasFacts}
                className={`rounded-xl px-2 text-center flex flex-col items-center justify-center gap-1 ${hasFacts ? 'btn-press active:scale-95 cursor-pointer' : 'cursor-not-allowed'}`}
                style={{
                  height: '78px',
                  background: hasFacts
                    ? `rgba(${hexToRgb(cat.color)}, 0.7)`
                    : 'rgba(100, 100, 100, 0.15)',
                  border: isSelected ? '2px solid rgba(255,255,255,0.6)' : '2px solid transparent',
                  opacity: hasFacts ? dimOpacity : 0.4,
                  transition: 'opacity 0.2s ease, border-color 0.2s ease',
                }}>
                <span className="text-2xl">{cat.emoji}</span>
                <span className="font-bold text-xs leading-tight" style={{ color: hasFacts ? '#000' : 'rgba(255,255,255,0.3)' }}>
                  {cat.label}
                </span>
                {!hasFacts && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Bientôt</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Valider button */}
      <div className="px-4 pb-3 shrink-0">
        <button
          onClick={handleValider}
          disabled={!hasSelection}
          className="btn-press w-full py-3 rounded-2xl font-black text-base uppercase tracking-wide active:scale-95"
          style={{
            background: hasSelection
              ? 'linear-gradient(135deg, #FF6B1A 0%, #D94A10 100%)'
              : 'rgba(255,255,255,0.15)',
            boxShadow: hasSelection ? '0 8px 32px rgba(255,92,26,0.4)' : 'none',
            color: hasSelection ? 'white' : 'rgba(255,255,255,0.3)',
            transition: 'all 0.2s ease',
          }}>
          {hasSelection ? 'Valider ▶' : 'Choisir une catégorie'}
        </button>
      </div>
    </div>
  )
}
