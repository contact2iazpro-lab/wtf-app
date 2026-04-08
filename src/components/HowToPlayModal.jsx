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
      { icon: '⏱️', text: 'Timer : **Cool = 30s**, **Hot / WTF! / Jouer / Hunt = 20s** par question.' },
      { icon: '🪙', text: 'Gagne des **WTF! Coins** à chaque bonne réponse.' },
      { icon: '📚', text: 'Débloque des **f*cts VIP** en Quest. Joue **gratuitement** en Jouer (Flash).' },
    ],
  },
  {
    id: 'tutorial',
    emoji: '🎓',
    shortTitle: 'Tutoriel',
    title: 'Tutoriel',
    content: [
      { icon: '🎮', text: 'Lors de ta première partie, WTF! te guide **pas à pas** avec un f*ct spécial.' },
      { icon: '💡', text: 'Tu découvres les bases : **question, indices, réponse et révélation**.' },
      { icon: '🔄', text: 'Si tu veux revivre cette expérience, clique ci-dessous.' },
    ],
    tutorialButton: true,
  },
  {
    id: 'quest',
    emoji: '⭐',
    shortTitle: 'Quest',
    title: 'Quest',
    content: [
      { icon: '🎫', text: '**Coûte 1 ticket** par session.' },
      { icon: '🎯', text: 'Choisis un **niveau de difficulté**.' },
      { icon: '❄️', text: '**Cool** — 4 QCM · 30s · 2 indices · 5 coins/bonne réponse' },
      { icon: '🔥', text: '**Hot** — 4 QCM · 20s · 2 indices · 3 coins/bonne réponse' },
      { icon: '⚡', text: '**WTF!** — 6 QCM · 20s · 1 indice · 2 coins/bonne réponse' },
      { icon: '📚', text: '**10 questions** par session. Les f*cts trouvés rejoignent ta **Collection**.' },
      { icon: '🏆', text: 'Score parfait (10/10) = **bonus de 25 coins** !' },
    ],
  },
  {
    id: 'explorer',
    emoji: '🎮',
    shortTitle: 'Jouer',
    title: 'Jouer',
    content: [
      { icon: '🆓', text: '**Gratuit illimité** — pas de ticket requis.' },
      { icon: '⚡', text: 'Session rapide de **5 questions**.' },
      { icon: '🎯', text: '**Mode Aléatoire** : catégories mélangées · **5 coins**/bonne réponse.' },
      { icon: '🗂️', text: '**Mode Catégorie** : catégorie au choix · **3 coins**/bonne réponse.' },
      { icon: '💡', text: '**2 indices** disponibles par question, 4 QCM, 20s timer.' },
      { icon: '🚪', text: 'Tes coins et f*cts sont sauvegardés même si tu quittes.' },
    ],
  },
  {
    id: 'blitz',
    emoji: '⚡',
    shortTitle: 'Blitz',
    title: 'Blitz',
    content: [
      { icon: '⏱️', text: '**Chrono montant** — réponds le plus vite possible, accumule les points.' },
      { icon: '📊', text: 'Paliers : **5 / 10 / 20 / 30 / 40 / 50 questions**.' },
      { icon: '✅', text: 'Bonne réponse = **+2s** · Mauvaise = **-3s** (pénalité).' },
      { icon: '🚫', text: '**Pas d\'indices** — c\'est la mémoire pure, 4 QCM par question.' },
      { icon: '💰', text: '**Pas de coins** — seul le **prestige** compte !' },
      { icon: '🏆', text: '**Jeu illimité** — bats tes records personnels.' },
    ],
  },
  {
    id: 'hunt',
    emoji: '🔥',
    shortTitle: 'Hunt',
    title: 'Hunt',
    content: [
      { icon: '🆓', text: '**Gratuit** — pas de ticket requis, **1 fois par jour**.' },
      { icon: '🎯', text: 'Un **f*ct WTF spécial** à découvrir chaque jour. Débloque le WTF du Jour !' },
      { icon: '📚', text: '**5 questions** pour le débloquer · 4 QCM · **20s** · **2 indices**.' },
      { icon: '🪙', text: 'Coins variables selon le défi.' },
      { icon: '📅', text: 'Reviens **chaque jour** pour un nouveau WTF du Jour !' },
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

// Get chapter icon: image for modes, emoji for others
function getChapterIcon(chapterId) {
  const modeIcons = {
    quest: '/assets/modes/quete.png',
    explorer: '/assets/modes/marathon.png',
    blitz: '/assets/modes/blitz.png',
    streak: '/assets/modes/serie.png',
    multi: '/assets/modes/multi.png',
  }

  if (modeIcons[chapterId]) {
    return <img src={modeIcons[chapterId]} style={{ width: 40, height: 40, objectFit: 'contain' }} alt="" />
  }

  // For hunt and non-mode chapters, use emoji
  const chapter = CHAPTERS.find(c => c.id === chapterId)
  return <span style={{ fontSize: 20 }}>{chapter?.emoji || ''}</span>
}

// ── Main component ──────────────────────────────────────────────────────────
export default function HowToPlayModal({ onClose, onRestartTutorial }) {
  // Read player progress from localStorage
  const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')

  // Filter chapters based on player progress
  const visibleChapters = CHAPTERS.filter(ch => {
    switch (ch.id) {
      case 'goal':
      case 'tutorial':
      case 'hints':
      case 'collection':
        return true // Always visible

      case 'quest':
        return (wd.statsByMode?.parcours?.gamesPlayed || 0) >= 1

      case 'explorer':
        return (wd.statsByMode?.flash_solo?.gamesPlayed || 0) >= 1

      case 'flash':
        return false // Removed: merged with explorer

      case 'blitz':
        return (wd.statsByMode?.blitz?.gamesPlayed || 0) >= 1

      case 'hunt':
        return (wd.gamesPlayed || 0) >= 1

      case 'streak':
        return (wd.gamesPlayed || 0) >= 3

      case 'multi':
        return (wd.statsByMode?.blitz?.gamesPlayed || 0) >= 1

      default:
        return true
    }
  })

  const [activeId, setActiveId] = useState(visibleChapters[0]?.id || 'goal')
  const chapter = visibleChapters.find(c => c.id === activeId) || visibleChapters[0]

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
            {visibleChapters.map(ch => {
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

          {/* Content area - fullscreen, no scroll */}
          <div className="flex-1 overflow-hidden p-3" style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Chapter title */}
            <div className="flex items-center gap-2 mb-1" style={{ flexShrink: 0 }}>
              {getChapterIcon(chapter.id)}
              <h2 className="font-black" style={{ color: '#1a1a2e', lineHeight: '1.2', fontSize: '15px' }}>
                {chapter.title}
              </h2>
            </div>

            {chapter.soon && (
              <div
                className="mb-1 py-0.5 px-2 rounded-xl text-center"
                style={{ background: 'rgba(255,107,26,0.12)', border: '1px solid rgba(255,107,26,0.3)', flexShrink: 0 }}
              >
                <span className="text-xs font-black uppercase tracking-widest" style={{ color: '#FF6B1A', fontSize: '9px' }}>
                  🚧 Bientôt disponible
                </span>
              </div>
            )}

            {/* Rules items */}
            <div className="flex flex-col gap-1" style={{ overflow: 'hidden', flexShrink: 1, minHeight: 0 }}>
              {chapter.content.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-1 p-1 rounded-2xl"
                  style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', flexShrink: 0 }}
                >
                  <span style={{ fontSize: 14, flexShrink: 0, lineHeight: '1.3' }}>{item.icon}</span>
                  <p className="font-semibold" style={{ color: '#374151', lineHeight: '1.3', fontSize: '11px' }}>
                    {renderText(item.text)}
                  </p>
                </div>
              ))}

              {/* Bouton relancer tutoriel */}
              {chapter.tutorialButton && onRestartTutorial && (
                <button
                  onClick={() => { audio.play('click'); onRestartTutorial(); onClose() }}
                  className="w-full rounded-2xl font-black active:scale-95 transition-all mt-1"
                  style={{ background: '#FF6B1A', color: 'white', border: 'none', padding: '6px 8px', fontSize: '11px', flexShrink: 0 }}
                >
                  🔄 Relancer le tutoriel
                </button>
              )}

              {/* Bouton réafficher les règles des modes */}
              {['quest', 'explorer', 'blitz', 'hunt'].includes(chapter.id) && (
                <button
                  onClick={() => {
                    audio.play('click')
                    // Supprimer toutes les clés skip_launch_*
                    const keysToRemove = []
                    for (let i = 0; i < localStorage.length; i++) {
                      const k = localStorage.key(i)
                      if (k && k.startsWith('skip_launch_')) keysToRemove.push(k)
                    }
                    keysToRemove.forEach(k => localStorage.removeItem(k))
                    alert('Règles réactivées ✅')
                    onClose()
                  }}
                  className="w-full rounded-2xl font-black active:scale-95 transition-all mt-1"
                  style={{ background: '#22C55E', color: 'white', border: 'none', padding: '6px 8px', fontSize: '11px', flexShrink: 0 }}
                >
                  🔄 Réafficher les règles des modes
                </button>
              )}
            </div>

            {/* Chapter dots navigation */}
            <div className="flex flex-wrap justify-center gap-0.5 mt-1" style={{ flexShrink: 0 }}>
              {visibleChapters.map(ch => (
                <button
                  key={ch.id}
                  onClick={() => { audio.play('click'); setActiveId(ch.id) }}
                  style={{
                    width: ch.id === activeId ? 16 : 4,
                    height: 4,
                    borderRadius: 2,
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
              const idx = visibleChapters.findIndex(c => c.id === activeId)
              if (idx > 0) setActiveId(visibleChapters[idx - 1].id)
            }}
            disabled={visibleChapters.findIndex(c => c.id === activeId) === 0}
            className="px-4 py-3 rounded-2xl font-black text-sm active:scale-95 transition-all disabled:opacity-30"
            style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#6B7280' }}
          >
            ←
          </button>
          <button
            onClick={() => {
              audio.play('click')
              const idx = visibleChapters.findIndex(c => c.id === activeId)
              if (idx < visibleChapters.length - 1) setActiveId(visibleChapters[idx + 1].id)
              else onClose()
            }}
            className="flex-1 py-3 rounded-2xl font-black text-sm active:scale-95 transition-all text-white"
            style={{
              background: visibleChapters.findIndex(c => c.id === activeId) === visibleChapters.length - 1
                ? 'linear-gradient(135deg, #22C55E, #16A34A)'
                : 'linear-gradient(135deg, #FF6B1A, #D94A10)',
            }}
          >
            {visibleChapters.findIndex(c => c.id === activeId) === visibleChapters.length - 1 ? '✓ Compris !' : 'Suivant →'}
          </button>
        </div>
      </div>
    </div>
  )
}
