import { useState } from 'react'
import { audio } from '../utils/audio'

// ── Chapters data ───────────────────────────────────────────────────────────
const CHAPTERS = [
  {
    id: 'goal',
    emoji: '🤯',
    shortTitle: 'But du jeu',
    title: 'Le But du Jeu',
    content: [
      { icon: '🎯', text: 'Réponds à des **affirmations folles** : vraies ou fausses ?' },
      { icon: '⏱️', text: 'Tu as **30 à 60 secondes** par question selon le niveau.' },
      { icon: '📋', text: '**10 questions** par session — réponds vite, gagne plus !' },
      { icon: '🏆', text: 'Débloque des **f*cts** et complète des collections pour gagner des trophées.' },
    ],
  },
  {
    id: 'parcours',
    emoji: '⚡',
    shortTitle: 'Quête WTF!',
    title: 'Quête WTF!',
    content: [
      { icon: '🎯', text: 'Choisis un niveau : **Cool**, **Hot** ou **WTF!**.' },
      { icon: '🔀', text: '**10 questions** issues du pool de ton niveau.' },
      { icon: '🏆', text: 'Les f*cts que tu trouves rejoignent ta **Collection** si tu termines.' },
      { icon: '🚪', text: 'Quitter en cours = aucun f*ct sauvegardé pour cette session.' },
    ],
  },
  {
    id: 'flash',
    emoji: '🌩️',
    shortTitle: 'Session Flash',
    title: 'Session Flash Solo',
    content: [
      { icon: '⚡', text: 'Session courte de **5 questions** rapides.' },
      { icon: '🪙', text: 'Gagne des **WTF! Coins** à chaque session complétée.' },
      { icon: '🎯', text: 'Score parfait (5/5) = **bonus de pièces** supplémentaires !' },
      { icon: '🤯', text: 'Le **WTF! du Jour** est une session Flash spéciale avec un f*ct marquant.' },
    ],
  },
  {
    id: 'difficulty',
    emoji: '🌈',
    shortTitle: 'Niveaux',
    title: 'Niveaux de difficulté',
    content: [
      { icon: '❄️', text: '**Cool** — 30 s · 4 choix · indices à 2 coins · 3 pts' },
      { icon: '🔥', text: '**Hot** — 30 s · 4 choix · indices à 5 coins · 3 pts' },
      { icon: '⚡', text: '**WTF!** — 30 s · 6 choix · 1 indice à 8 coins · 5 pts' },
      { icon: '🔓', text: 'Tous les niveaux sont disponibles **dès le départ**.' },
    ],
  },
  {
    id: 'scoring',
    emoji: '🔥',
    shortTitle: 'Série & Points',
    title: 'Série & Points',
    content: [
      { icon: '📅', text: 'Joue **chaque jour** pour maintenir ta série 🔥' },
      { icon: '🪙', text: 'Une série élevée = plus de **WTF! Coins** gagnés après chaque session.' },
      { icon: '⭐', text: 'Les **points** cumulés mesurent ta progression sur tout le jeu.' },
      { icon: '💡', text: 'Utiliser des **indices** réduit les points : 5 → 3 → 2 pts.' },
    ],
  },
  {
    id: 'collection',
    emoji: '📚',
    shortTitle: 'Collection',
    title: 'Collection',
    content: [
      { icon: '🗂️', text: 'Tes f*cts débloqués sont organisés par **catégorie**.' },
      { icon: '🔢', text: '**10 f*cts par niveau** (Cool / Hot / WTF!) par catégorie.' },
      { icon: '💡', text: 'Un f*ct déjà débloqué **ne réapparaît plus** dans ta quête.' },
      { icon: '📊', text: 'Consulte ta **progression par catégorie** depuis l\'écran Collection.' },
    ],
  },
  {
    id: 'trophies',
    emoji: '🏆',
    shortTitle: 'Trophées',
    title: 'Trophées VIP',
    content: [
      { icon: '🌟', text: 'Complète les **10 f*cts** d\'une catégorie + niveau...' },
      { icon: '🃏', text: '...pour recevoir une **Carte Super WTF!** exclusive !' },
      { icon: '🚫', text: 'Ces trophées ne s\'obtiennent **jamais par achat** — uniquement en jouant !' },
      { icon: '🎁', text: 'Chaque carte est **unique** et documente un f*ct incroyable.' },
    ],
  },
  {
    id: 'multi',
    emoji: '🎮',
    shortTitle: 'Multijoueur',
    title: 'Modes à venir',
    soon: true,
    content: [
      { icon: '👥', text: '**Multijoueur** — Affrontez vos amis en tour par tour (jusqu\'à 6 joueurs).' },
      { icon: '🏃', text: '**Marathon** — 20 questions enchaînées, sans filet.' },
      { icon: '⚡', text: '**Blitz** — Questions ultra-rapides, chaque seconde compte !' },
    ],
  },
]

// Bold markdown renderer
function renderText(text) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return parts.map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p)
}

// ── Main component ──────────────────────────────────────────────────────────
export default function HowToPlayModal({ onClose }) {
  const [activeId, setActiveId] = useState(CHAPTERS[0].id)
  const chapter = CHAPTERS.find(c => c.id === activeId) || CHAPTERS[0]

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-5"
      style={{ zIndex: 300, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full flex flex-col rounded-3xl overflow-hidden"
        style={{
          maxWidth: 420,
          height: 'min(88vh, 580px)',
          background: '#FAFAF8',
          boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{ background: '#FFF7ED', borderBottom: '1px solid #FED7AA' }}
        >
          <span className="font-black text-sm" style={{ color: '#1a1a2e' }}>📖 Règles du jeu</span>
          <button
            onClick={() => { audio.play('click'); onClose() }}
            className="w-7 h-7 rounded-full flex items-center justify-center font-black text-white active:scale-90 text-xs"
            style={{ background: '#FF6B1A' }}
          >✕</button>
        </div>

        {/* ── Body: sidebar + content ─────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Sidebar — chapter list */}
          <div
            className="shrink-0 overflow-y-auto scrollbar-hide"
            style={{ width: 100, background: '#F3F4F6', borderRight: '1px solid #E5E7EB' }}
          >
            {CHAPTERS.map(ch => {
              const isActive = ch.id === activeId
              return (
                <button
                  key={ch.id}
                  onClick={() => { audio.play('click'); setActiveId(ch.id) }}
                  className="w-full flex flex-col items-center py-3 px-2 transition-all active:scale-95"
                  style={{
                    background: isActive ? '#FFF7ED' : 'transparent',
                    borderRight: isActive ? '2.5px solid #FF6B1A' : '2.5px solid transparent',
                    borderBottom: '1px solid #E5E7EB',
                  }}
                >
                  <span style={{ fontSize: 20, lineHeight: 1 }}>{ch.emoji}</span>
                  <span
                    className="text-center leading-tight mt-1.5"
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: isActive ? '#C2410C' : '#6B7280',
                      wordBreak: 'break-word',
                      lineHeight: '1.3',
                    }}
                  >
                    {ch.shortTitle}
                  </span>
                  {ch.soon && (
                    <span
                      className="mt-1 px-1 py-0.5 rounded-md"
                      style={{ fontSize: 8, fontWeight: 800, background: 'rgba(255,107,26,0.15)', color: '#FF6B1A' }}
                    >
                      BIENTÔT
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Chapter title */}
            <div className="flex items-center gap-2 mb-3">
              <span style={{ fontSize: 26 }}>{chapter.emoji}</span>
              <h2 className="font-black text-sm" style={{ color: '#1a1a2e', lineHeight: '1.3' }}>
                {chapter.title}
              </h2>
            </div>

            {chapter.soon && (
              <div
                className="mb-3 py-1.5 px-3 rounded-xl text-center"
                style={{ background: 'rgba(255,107,26,0.12)', border: '1px solid rgba(255,107,26,0.3)' }}
              >
                <span className="text-xs font-black uppercase tracking-widest" style={{ color: '#FF6B1A' }}>
                  🚧 Bientôt disponible
                </span>
              </div>
            )}

            {/* Rules items */}
            <div className="flex flex-col gap-2">
              {chapter.content.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 p-3 rounded-2xl"
                  style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}
                >
                  <span className="text-base shrink-0">{item.icon}</span>
                  <p className="text-xs font-semibold" style={{ color: '#374151', lineHeight: '1.6' }}>
                    {renderText(item.text)}
                  </p>
                </div>
              ))}
            </div>

            {/* Chapter dots navigation */}
            <div className="flex flex-wrap justify-center gap-1.5 mt-4">
              {CHAPTERS.map(ch => (
                <button
                  key={ch.id}
                  onClick={() => { audio.play('click'); setActiveId(ch.id) }}
                  style={{
                    width: ch.id === activeId ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: ch.id === activeId ? '#FF6B1A' : 'rgba(0,0,0,0.15)',
                    transition: 'all 0.25s ease',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div
          className="px-5 pb-5 pt-3 shrink-0 flex gap-3"
          style={{ borderTop: '1px solid #E5E7EB' }}
        >
          {/* Prev / Next shortcuts */}
          <button
            onClick={() => {
              audio.play('click')
              const idx = CHAPTERS.findIndex(c => c.id === activeId)
              if (idx > 0) setActiveId(CHAPTERS[idx - 1].id)
            }}
            disabled={CHAPTERS.findIndex(c => c.id === activeId) === 0}
            className="px-4 py-3 rounded-2xl font-black text-sm active:scale-95 transition-all disabled:opacity-30"
            style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#6B7280' }}
          >
            ←
          </button>
          <button
            onClick={() => {
              audio.play('click')
              const idx = CHAPTERS.findIndex(c => c.id === activeId)
              if (idx < CHAPTERS.length - 1) setActiveId(CHAPTERS[idx + 1].id)
              else onClose()
            }}
            className="flex-1 py-3 rounded-2xl font-black text-sm active:scale-95 transition-all text-white"
            style={{
              background: CHAPTERS.findIndex(c => c.id === activeId) === CHAPTERS.length - 1
                ? 'linear-gradient(135deg, #22C55E, #16A34A)'
                : 'linear-gradient(135deg, #FF6B1A, #D94A10)',
            }}
          >
            {CHAPTERS.findIndex(c => c.id === activeId) === CHAPTERS.length - 1 ? '✓ Compris !' : 'Suivant →'}
          </button>
        </div>
      </div>
    </div>
  )
}
