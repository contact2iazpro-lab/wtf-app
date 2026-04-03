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
      { icon: '🎯', text: 'Des faits incroyables te sont présentés — à toi de trouver la **bonne réponse** !' },
      { icon: '⏱️', text: 'Tu as **30 secondes** par question. Réponds vite et bien !' },
      { icon: '🪙', text: 'Gagne des **WTF! Coins** à chaque bonne réponse.' },
      { icon: '📚', text: 'Débloque des **f*cts** et complète ta Collection pour devenir un expert WTF!' },
    ],
  },
  {
    id: 'quest',
    emoji: '⭐',
    shortTitle: 'Quest',
    title: 'Quest',
    content: [
      { icon: '🎫', text: '**Coûte 1 ticket** par session.' },
      { icon: '🎯', text: 'Choisis un **niveau de difficulté**.' },
      { icon: '❄️', text: '**Cool** — 4 choix · 2 indices disponibles · 3 coins/bonne réponse' },
      { icon: '🔥', text: '**Hot** — 4 choix · 2 indices disponibles · 3 coins/bonne réponse' },
      { icon: '⚡', text: '**WTF!** — 6 choix · 1 indice disponible · 5 coins/bonne réponse' },
      { icon: '📚', text: '**5 questions** par session. Les f*cts trouvés rejoignent ta **Collection**.' },
      { icon: '🏆', text: 'Score parfait (5/5) = **bonus de 25 coins + 1 ticket** !' },
    ],
  },
  {
    id: 'explorer',
    emoji: '🧭',
    shortTitle: 'Explorer',
    title: 'Explorer',
    content: [
      { icon: '🆓', text: '**Gratuit** pour la première série de 10 questions.' },
      { icon: '🗂️', text: '**10 questions** dans la catégorie de ton choix.' },
      { icon: '🪙', text: '**3 coins** par bonne réponse.' },
      { icon: '💡', text: '**2 indices** disponibles par question.' },
      { icon: '🚪', text: 'Tes coins sont sauvegardés même si tu quittes.' },
      { icon: '🎫', text: 'Continue avec **1 ticket** pour 10 questions de plus !' },
    ],
  },
  {
    id: 'flash',
    emoji: '🎯',
    shortTitle: 'Flash',
    title: 'Flash',
    content: [
      { icon: '🆓', text: '**Gratuit** — pas de ticket requis.' },
      { icon: '⚡', text: 'Session rapide de **5 questions**.' },
      { icon: '💡', text: '**1 indice** disponible par question.' },
      { icon: '🪙', text: '**5 coins** par bonne réponse (3 si tu utilises un indice).' },
      { icon: '🏆', text: 'Score parfait sans indice = **25 coins bonus** !' },
    ],
  },
  {
    id: 'blitz',
    emoji: '⚡',
    shortTitle: 'Blitz',
    title: 'Blitz',
    content: [
      { icon: '🆓', text: '**Gratuit** — pas de ticket requis.' },
      { icon: '⏱️', text: 'Timer de **60 secondes**.' },
      { icon: '✅', text: 'Bonne réponse = **+2 secondes**.' },
      { icon: '❌', text: 'Mauvaise réponse = **-3 secondes**.' },
      { icon: '💡', text: '**1 indice** disponible par question.' },
      { icon: '🪙', text: '**1 coin** par bonne réponse.' },
    ],
  },
  {
    id: 'hunt',
    emoji: '🔥',
    shortTitle: 'Hunt',
    title: 'Hunt',
    content: [
      { icon: '🆓', text: '**Gratuit** — pas de ticket requis.' },
      { icon: '🎯', text: 'Un **f*ct WTF spécial** à découvrir chaque jour.' },
      { icon: '📚', text: '**5 questions** pour le débloquer.' },
      { icon: '💡', text: '**2 indices** disponibles par question.' },
      { icon: '📅', text: 'Reviens **chaque jour** pour un nouveau WTF !' },
    ],
  },
  {
    id: 'hints',
    emoji: '💡',
    shortTitle: 'Indices',
    title: 'Indices & Coins',
    content: [
      { icon: '💡', text: 'Les indices **éliminent une mauvaise réponse** et consomment 1 indice du stock.' },
      { icon: '❄️', text: '**Cool / Hot** : jusqu\'à **2 indices** par question.' },
      { icon: '⚡', text: '**WTF!** : **1 seul indice** par question.' },
      { icon: '🎁', text: 'Gagne des indices via les **coffres quotidiens**, les **bonus Blitz** et ta **série**.' },
    ],
  },
  {
    id: 'collection',
    emoji: '📚',
    shortTitle: 'Collection',
    title: 'Collection',
    content: [
      { icon: '🗂️', text: 'Tes f*cts débloqués sont organisés par **catégorie**.' },
      { icon: '💡', text: 'Un f*ct déjà débloqué **ne réapparaît plus** en Quest.' },
      { icon: '📊', text: 'Suis ta **progression par catégorie** depuis l\'écran Collection.' },
      { icon: '🏆', text: 'Complète une catégorie pour débloquer des **récompenses** !' },
    ],
  },
  {
    id: 'streak',
    emoji: '🔥',
    shortTitle: 'Série',
    title: 'Série & Coffres',
    content: [
      { icon: '📅', text: 'Joue **chaque jour** pour maintenir ta série.' },
      { icon: '🪙', text: 'Une série élevée = plus de **coins bonus** après chaque session.' },
      { icon: '🎁', text: 'Ouvre un **coffre** chaque jour pour gagner des coins ou des indices gratuits.' },
      { icon: '📦', text: 'Les coffres contiennent entre **5 et 10 coins** ou **1 à 2 indices**.' },
    ],
  },
  {
    id: 'multi',
    emoji: '🎮',
    shortTitle: 'Bientôt',
    title: 'Bientôt',
    soon: true,
    content: [
      { icon: '👥', text: '**Multijoueur** — Affrontez vos amis en temps réel !' },
      { icon: '🏆', text: '**Classements & Trophées** — Grimpe dans le classement mondial !' },
      { icon: '🚧', text: 'Ces modes arrivent bientôt. **Reste connecté** !' },
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
