import { CATEGORIES } from '../data/facts'

export default function CategoryScreen({ onSelectCategory, onBack }) {
  return (
    <div className="flex flex-col h-full w-full screen-enter" style={{ background: 'linear-gradient(170deg, #06304A 0%, #0A4870 20%, #C45A00 65%, #7A2E00 85%, #3A1200 100%)' }}>
      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-12 pb-4">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl border flex items-center justify-center text-white/80 active:scale-90 transition-transform"
          style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)' }}>
          ←
        </button>
        <div>
          <h1 className="text-xl font-black text-white">Choisis une catégorie</h1>
          <p className="text-white/40 text-sm">Où se trouve le fait le plus What The F*ct ?</p>
        </div>
      </div>

      <div className="flex-1 px-4 pb-8 overflow-y-auto scrollbar-hide">
        {/* Random button — first, full width */}
        <button
          onClick={() => onSelectCategory(null)}
          className="btn-press w-full mb-3 py-3.5 rounded-2xl border text-yellow-300 font-black text-sm tracking-wide active:scale-95 transition-all flex items-center justify-center gap-2"
          style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', borderColor: 'rgba(255,200,50,0.5)' }}>
          🎲 Trouve 20 F*cts Aléatoires
        </button>

        {/* Categories list — compact rows */}
        <div className="flex flex-col gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className="btn-press rounded-xl px-4 py-2.5 text-left relative overflow-hidden border transition-all duration-150 active:scale-95 flex items-center gap-3"
              style={{
                background: `linear-gradient(135deg, ${cat.color}22 0%, ${cat.bg} 100%)`,
                borderColor: cat.color + '55',
              }}>
              <span className="text-2xl shrink-0">{cat.emoji}</span>
              <span className="font-black text-sm text-white leading-tight" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
