import { useState } from 'react'
import { audio } from '../utils/audio'

const PAGES = [
  {
    emoji: '⚡',
    title: 'Mode Parcours',
    content: [
      { icon: '🎯', text: 'Choisis un niveau : **Facile**, **Normal** ou **Expert**.' },
      { icon: '🔀', text: '**10 questions aléatoires** issues de toutes les catégories te sont posées.' },
      { icon: '🏆', text: 'Les f*cts que tu trouves rejoignent ta **Collection** uniquement si tu termines la partie jusqu\'à l\'écran de score final.' },
      { icon: '🚪', text: 'Quitter en cours de partie = aucun f*ct sauvegardé.' },
    ],
  },
  {
    emoji: '💚',
    title: 'Niveaux de difficulté',
    content: [
      { icon: '💚', text: '**Facile** — 60 s · 6 choix · indices disponibles (3→2→1 pts)' },
      { icon: '🧠', text: '**Normal** — 60 s · 4 choix · pas d\'indices · 3 pts/bonne réponse' },
      { icon: '⚡', text: '**Expert** — 30 s · 6 choix · pas d\'indices · 5 pts/bonne réponse' },
      { icon: '🔓', text: 'Tous les niveaux sont disponibles dès le départ. Aucun déblocage séquentiel.' },
    ],
  },
  {
    emoji: '📚',
    title: 'Collection',
    content: [
      { icon: '🗂️', text: 'Tes f*cts débloqués sont organisés par **catégorie** dans ta Collection.' },
      { icon: '🔢', text: '**10 f*cts par niveau** (Facile / Normal / Expert) par catégorie.' },
      { icon: '🌟', text: 'Complète les 10 f*cts d\'une catégorie + niveau → reçois une **carte Super WTF** exclusive !' },
      { icon: '💡', text: 'Un f*ct déjà débloqué ne réapparaît plus dans le parcours de ce niveau.' },
    ],
  },
  {
    emoji: '🎮',
    title: 'Mode Multijoueur',
    content: [
      { icon: '🚧', text: '**Bientôt disponible**' },
      { icon: '👥', text: 'Affrontez vos amis en tour par tour, jusqu\'à 6 joueurs sur le même appareil.' },
    ],
    soon: true,
  },
  {
    emoji: '🏃',
    title: 'Mode Marathon',
    content: [
      { icon: '🚧', text: '**Bientôt disponible**' },
      { icon: '📋', text: '20 questions enchaînées issues de toutes les catégories, sans filet.' },
    ],
    soon: true,
  },
  {
    emoji: '🔥',
    title: 'Mode Blitz',
    content: [
      { icon: '🚧', text: '**Bientôt disponible**' },
      { icon: '⏱️', text: 'Questions ultra-rapides — chaque seconde compte.' },
    ],
    soon: true,
  },
]

function renderText(text) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return parts.map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p)
}

export default function HowToPlayModal({ onClose }) {
  const [page, setPage] = useState(0)
  const current = PAGES[page]
  const isLast = page === PAGES.length - 1

  const next = () => {
    audio.play('click')
    if (isLast) { onClose(); return }
    setPage(p => p + 1)
  }

  const prev = () => {
    audio.play('click')
    setPage(p => p - 1)
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-5"
      style={{ zIndex: 300, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-full rounded-3xl overflow-hidden flex flex-col"
        style={{ maxWidth: 380, maxHeight: '85vh', background: '#FAFAF8', boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ background: '#FFF7ED', borderBottom: '1px solid #FED7AA' }}>
          <span className="text-xs font-bold" style={{ color: '#9CA3AF' }}>{page + 1} / {PAGES.length}</span>
          <span className="font-black text-sm" style={{ color: '#1a1a2e' }}>{current.emoji} {current.title}</span>
          <button
            onClick={() => { audio.play('click'); onClose() }}
            className="w-7 h-7 rounded-full flex items-center justify-center font-black text-white active:scale-90 text-xs"
            style={{ background: '#FF6B1A' }}
          >✕</button>
        </div>

        {/* Progress bar */}
        <div className="h-1 shrink-0" style={{ background: '#E5E7EB' }}>
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${((page + 1) / PAGES.length) * 100}%`, background: 'linear-gradient(90deg, #FF6B1A, #FF9F1A)' }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="text-5xl text-center mb-4">{current.emoji}</div>
          {current.soon && (
            <div className="text-center mb-4 py-2 px-4 rounded-2xl" style={{ background: 'rgba(255,107,26,0.08)', border: '1px solid rgba(255,107,26,0.25)' }}>
              <span className="text-xs font-black uppercase tracking-widest" style={{ color: '#FF6B1A' }}>🚧 Bientôt disponible</span>
            </div>
          )}
          <div className="flex flex-col gap-3">
            {current.content.filter(c => !c.text.startsWith('**Bientôt')).map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-2xl" style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
                <span className="text-xl shrink-0">{item.icon}</span>
                <p className="text-sm font-semibold" style={{ color: '#374151', lineHeight: '1.55' }}>
                  {renderText(item.text)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer nav */}
        <div className="px-5 pb-5 pt-3 flex gap-3 shrink-0" style={{ borderTop: '1px solid #E5E7EB' }}>
          {page > 0 && (
            <button
              onClick={prev}
              className="flex-1 py-3 rounded-2xl font-black text-sm active:scale-95 transition-all"
              style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#6B7280' }}
            >
              ← Précédent
            </button>
          )}
          <button
            onClick={next}
            className="flex-1 py-3 rounded-2xl font-black text-sm active:scale-95 transition-all text-white"
            style={{ background: isLast ? 'linear-gradient(135deg, #22C55E, #16A34A)' : 'linear-gradient(135deg, #FF6B1A, #D94A10)' }}
          >
            {isLast ? '✓ Terminer' : 'Suivant →'}
          </button>
        </div>
      </div>
    </div>
  )
}
