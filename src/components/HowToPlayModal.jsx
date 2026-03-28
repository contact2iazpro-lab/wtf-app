import { useState } from 'react'
import { audio } from '../utils/audio'

const PAGES = [
  {
    emoji: '🤯',
    title: 'Le But du Jeu',
    content: [
      { icon: '🎯', text: 'Réponds à des **affirmations folles** : vraies ou fausses ?' },
      { icon: '⏱️', text: 'Tu as **30 à 60 secondes** par question selon le niveau.' },
      { icon: '📋', text: '**10 questions** par session — réponds vite, gagne plus !' },
      { icon: '🏆', text: 'Débloque des **facts** et complète des collections pour gagner des trophées.' },
    ],
  },
  {
    emoji: '⚡',
    title: 'Mode Parcours',
    content: [
      { icon: '🎯', text: 'Choisis un niveau : **Facile**, **Normal** ou **Expert**.' },
      { icon: '🔀', text: '**10 questions** issues du pool de ton niveau.' },
      { icon: '🏆', text: 'Les facts que tu trouves rejoignent ta **Collection** si tu termines.' },
      { icon: '🚪', text: 'Quitter en cours = aucun fact sauvegardé pour cette session.' },
    ],
  },
  {
    emoji: '🌈',
    title: 'Niveaux de difficulté',
    content: [
      { icon: '💚', text: '**Facile** — 60 s · 6 choix · indices dispo (3→2→1 pts)' },
      { icon: '🧠', text: '**Normal** — 60 s · 4 choix · pas d\'indices · 3 pts' },
      { icon: '⚡', text: '**Expert** — 30 s · 6 choix · pas d\'indices · 5 pts' },
      { icon: '🔓', text: 'Tous les niveaux sont disponibles **dès le départ**.' },
    ],
  },
  {
    emoji: '📚',
    title: 'Collection',
    content: [
      { icon: '🗂️', text: 'Tes facts débloqués sont organisés par **catégorie**.' },
      { icon: '🔢', text: '**10 facts par niveau** (Facile / Normal / Expert) par catégorie.' },
      { icon: '💡', text: 'Un fact déjà débloqué **ne réapparaît plus** dans ton parcours.' },
      { icon: '📊', text: 'Consulte ta **progression par catégorie** depuis l\'écran Collection.' },
    ],
  },
  {
    emoji: '🏆',
    title: 'Trophées VIP',
    content: [
      { icon: '🌟', text: 'Complète les **10 facts** d\'une catégorie + niveau...' },
      { icon: '🃏', text: '...pour recevoir une **Carte Super WTF** exclusive !' },
      { icon: '🚫', text: 'Ces trophées ne s\'obtiennent **jamais par achat** — uniquement en jouant !' },
      { icon: '🎁', text: 'Chaque carte est **unique** et documente un fait incroyable.' },
    ],
  },
  {
    emoji: '🔥',
    title: 'Streak & Points',
    content: [
      { icon: '📅', text: 'Joue **chaque jour** pour maintenir ton streak 🔥' },
      { icon: '🪙', text: 'Un streak élevé = plus de **WTF Coins** gagnés après chaque session.' },
      { icon: '⭐', text: 'Les **points** cumulés mesurent ta progression sur tout le jeu.' },
      { icon: '🤯', text: 'Le **WTF du Jour** est un fait spécial quotidien avec coins bonus !' },
    ],
  },
  {
    emoji: '🎮',
    title: 'Modes à venir',
    content: [
      { icon: '👥', text: '**Multijoueur** — Affrontez vos amis en tour par tour (jusqu\'à 6 joueurs).' },
      { icon: '🏃', text: '**Marathon** — 20 questions enchaînées, sans filet.' },
      { icon: '⚡', text: '**Blitz** — Questions ultra-rapides, chaque seconde compte !' },
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
      onClick={onClose}
    >
      <div
        className="w-full rounded-3xl overflow-hidden flex flex-col"
        style={{ maxWidth: 380, maxHeight: '88vh', background: '#0f172a', border: '2px solid rgba(255,255,255,0.12)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{ background: 'rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <span className="text-white/50 text-xs font-bold">{page + 1} / {PAGES.length}</span>
          <span className="font-black text-white text-sm">{current.emoji} {current.title}</span>
          <button
            onClick={() => { audio.play('click'); onClose() }}
            className="w-7 h-7 rounded-full flex items-center justify-center font-black text-white active:scale-90 text-xs"
            style={{ background: '#EF4444' }}
          >✕</button>
        </div>

        {/* Progress bar */}
        <div className="h-1 shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${((page + 1) / PAGES.length) * 100}%`,
              background: 'linear-gradient(90deg, #FF6B1A, #FF9F1A)',
            }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="text-5xl text-center mb-4">{current.emoji}</div>
          {current.soon && (
            <div
              className="text-center mb-4 py-2 px-4 rounded-2xl"
              style={{ background: 'rgba(255,107,26,0.12)', border: '1px solid rgba(255,107,26,0.3)' }}
            >
              <span className="text-xs font-black uppercase tracking-widest" style={{ color: '#FF6B1A' }}>
                🚧 Bientôt disponible
              </span>
            </div>
          )}
          <div className="flex flex-col gap-3">
            {current.content.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <span className="text-xl shrink-0">{item.icon}</span>
                <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.8)', lineHeight: '1.55' }}>
                  {renderText(item.text)}
                </p>
              </div>
            ))}
          </div>

          {/* Page dots */}
          <div className="flex justify-center gap-1.5 mt-5">
            {PAGES.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === page ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === page ? '#FF6B1A' : 'rgba(255,255,255,0.2)',
                  transition: 'all 0.25s ease',
                  cursor: 'pointer',
                }}
                onClick={() => { audio.play('click'); setPage(i) }}
              />
            ))}
          </div>
        </div>

        {/* Footer nav */}
        <div
          className="px-5 pb-5 pt-3 flex gap-3 shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          {page > 0 && (
            <button
              onClick={prev}
              className="flex-1 py-3 rounded-2xl font-black text-sm active:scale-95 transition-all"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              ← Précédent
            </button>
          )}
          <button
            onClick={next}
            className="flex-1 py-3 rounded-2xl font-black text-sm active:scale-95 transition-all text-white"
            style={{
              background: isLast
                ? 'linear-gradient(135deg, #22C55E, #16A34A)'
                : 'linear-gradient(135deg, #FF6B1A, #D94A10)',
            }}
          >
            {isLast ? '✓ Terminer' : 'Suivant →'}
          </button>
        </div>
      </div>
    </div>
  )
}
