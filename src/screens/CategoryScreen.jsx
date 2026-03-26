import { CATEGORIES } from '../data/facts'

export default function CategoryScreen({ onSelectCategory, onBack }) {
  return (
    <div className="flex flex-col h-full w-full screen-enter rainbow-bg">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-6 pb-2" style={{ position: 'relative', zIndex: 1 }}>
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'rgba(255,255,255,0.55)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.12)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', color: '#1a1a2e' }}>
          ←
        </button>
        <div>
          <h1 className="text-xl font-black" style={{ color: '#1a1a2e' }}>Choisis une catégorie</h1>
          <p className="text-sm" style={{ color: 'rgba(0,0,0,0.45)' }}>What The <strong>F*ct</strong> ! Vrai ou fou ?</p>
        </div>
      </div>

      <div className="flex-1 px-4 pb-3 overflow-y-auto scrollbar-hide" style={{ position: 'relative', zIndex: 1 }}>
        {/* Categories grid — 2 per row, 8 rows total */}
        <div className="grid grid-cols-2 gap-1.5">
          {/* Random button — first item in grid */}
          <button
            onClick={() => onSelectCategory(null)}
            className="btn-press rounded-xl px-2 text-center transition-all duration-150 active:scale-95 flex flex-col items-center justify-center gap-1"
            style={{ height: '85px', background: 'rgba(255,255,255,0.6)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.9)', color: '#FF6B1A', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <span className="text-2xl">🎲</span>
            <span className="font-bold text-xs leading-tight">
              Aléatoires
            </span>
          </button>

          {/* Categories */}
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className="btn-press rounded-xl px-2 text-center transition-all duration-150 active:scale-95 flex flex-col items-center justify-center gap-1"
              style={{
                height: '85px',
                background: 'rgba(255,255,255,0.6)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'rgba(255,255,255,0.9)',
                color: '#1a1a2e',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}>
              <span className="text-2xl">{cat.emoji}</span>
              <span className="font-bold text-xs leading-tight">
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
