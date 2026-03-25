import { CATEGORIES } from '../data/facts'

export default function CategoryScreen({ onSelectCategory, onBack }) {
  return (
    <div className="flex flex-col h-full w-full screen-enter" style={{ background: 'linear-gradient(170deg, #06304A 0%, #0A4870 20%, #C45A00 65%, #7A2E00 85%, #3A1200 100%)' }}>
      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-12 pb-6">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl border flex items-center justify-center text-white/80 active:scale-90 transition-transform"
          style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)' }}>
          ←
        </button>
        <div>
          <h1 className="text-xl font-black text-white">Choisis une catégorie</h1>
          <p className="text-white/40 text-sm">Quel sujet te fait peur ?</p>
        </div>
      </div>

      {/* Categories grid */}
      <div className="flex-1 px-4 pb-8 overflow-y-auto scrollbar-hide">
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((cat, i) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className="btn-press rounded-xl p-3 text-left relative overflow-hidden border transition-all duration-150 active:scale-95"
              style={{
                background: `linear-gradient(135deg, ${cat.color} 0%, ${cat.color}99 50%, ${cat.bg} 100%)`,
                borderColor: cat.color,
                boxShadow: `0 4px 20px ${cat.color}50`,
              }}>
              <div className="absolute -top-2 -right-2 w-14 h-14 rounded-full opacity-20" style={{ background: cat.color, filter: 'blur(16px)' }} />
              <div className="text-3xl mb-2">{cat.emoji}</div>
              <div className="font-black text-xs leading-tight text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{cat.label}</div>
            </button>
          ))}
        </div>

        {/* All categories button */}
        <button
          onClick={() => onSelectCategory(null)}
          className="btn-press mt-4 w-full py-4 rounded-2xl border text-yellow-300 font-black text-sm tracking-wide active:scale-95 transition-all"
          style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', borderColor: 'rgba(255,200,50,0.5)' }}>
          🎲  TOUT MÉLANGER
        </button>
      </div>
    </div>
  )
}
