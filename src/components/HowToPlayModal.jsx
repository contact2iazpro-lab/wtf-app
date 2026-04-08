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
      { icon: '📚', text: 'Débloque des **f*cts VIP** en Quest. Joue **gratuitement** en Jouer.' },
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
      { icon: '🎫', text: '**Coûte 1 ticket** (25 coins) par session.' },
      { icon: '🎯', text: 'Choisis un **niveau de difficulté** : Cool, Hot, ou WTF!.' },
      { icon: '❄️', text: '**Cool** — 2 QCM · 30s · 2 indices gratuits · **2 coins**/bonne réponse' },
      { icon: '🔥', text: '**Hot** — 4 QCM · 20s · 2 indices gratuits · **2 coins**/bonne réponse' },
      { icon: '⚡', text: '**WTF!** — 6 QCM · 20s · 1 indice gratuit · **1 coin**/bonne réponse' },
      { icon: '📚', text: '**5 questions** par session. Les f*cts trouvés rejoignent ta **Collection**.' },
      { icon: '🏆', text: 'Score parfait (5/5) = **bonus de 10 coins** !' },
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
      { icon: '🎯', text: '**Mode Aléatoire** : catégories mélangées · **2 coins**/bonne réponse.' },
      { icon: '🗂️', text: '**Mode Catégorie** : catégorie au choix · **1 coin**/bonne réponse.' },
      { icon: '💡', text: '**2 indices** gratuits par question, 4 QCM, 20s timer.' },
      { icon: '🚪', text: 'Tes coins et f*cts sont sauvegardés même si tu quittes.' },
    ],
  },
  {
    id: 'marathon',
    emoji: '🏃',
    shortTitle: 'Marathon',
    title: 'Marathon',
    content: [
      { icon: '📊', text: '**20 questions** — test ta connaissance sur un plus long parcours.' },
      { icon: '🎯', text: 'Format : 4 QCM, **20s** par question, **2 indices** disponibles.' },
      { icon: '🪙', text: 'Gains : **3 coins** par bonne réponse · **20 coins bonus** si score parfait (20/20).' },
      { icon: '🆓', text: '**Gratuit** — pas de ticket requis, pas de collecte de f*cts.' },
      { icon: '🏆', text: 'Entraîne-toi pour améliorer ton score personnel.' },
    ],
  },
  {
    id: 'blitz',
    emoji: '⚡',
    shortTitle: 'Blitz',
    title: 'Blitz',
    content: [
      { icon: '⏱️', text: '**Chrono montant** — réponds le plus vite possible, accumule les points.' },
      { icon: '📊', text: 'Paliers : **5 / 10 / 20 / 30 / 40 / 50+ questions**.' },
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
      { icon: '🪙', text: 'Gagne le **WTF du Jour** et des **coins bonus**.' },
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
      { icon: '❄️', text: '**Cool / Hot** : jusqu\'à **2 indices gratuits** par question.' },
      { icon: '⚡', text: '**WTF!** : **1 indice gratuit** par question.' },
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
    emoji: '👥',
    shortTitle: 'Multi',
    title: 'Multijoueur',
    content: [
      { icon: '👥', text: '**Défie tes amis** en Blitz et compare vos scores !' },
      { icon: '🏆', text: 'Ajoute des amis via leur **pseudo** et envoie des **défis**.' },
      { icon: '⚡', text: 'Mode **Blitz** — réponds le plus vite possible pour vaincre tes adversaires.' },
      { icon: '📊', text: 'Grimpe dans le **classement** avec tes amis et deviens champion !' },
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
    marathon: '/assets/modes/marathon.png',
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

  // State for checkbox "show rules on launch"
  const [showRulesOnLaunch, setShowRulesOnLaunch] = useState(false)

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

      case 'marathon':
        return (wd.statsByMode?.marathon?.gamesPlayed || 0) >= 1

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

        {/* ── Carousel horizontal des chapitres ─────────────────────────────── */}
        <div style={{
          display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 16px',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
        }}>
          {visibleChapters.map(ch => {
            const isActive = ch.id === activeId
            const colors = {
              goal: '#3B82F6', tutorial: '#8B5CF6', quest: '#EF4444',
              explorer: '#22C55E', marathon: '#F59E0B', blitz: '#FF6B1A',
              hunt: '#EC4899', hints: '#6366F1', collection: '#14B8A6',
              streak: '#F97316', multi: '#8B5CF6',
            }
            const color = colors[ch.id] || '#FF6B1A'
            const modeIcons = {
              quest: '/assets/modes/quete.png',
              explorer: '/assets/modes/marathon.png',
              marathon: '/assets/modes/marathon.png',
              blitz: '/assets/modes/blitz.png',
              streak: '/assets/modes/serie.png',
              multi: '/assets/modes/multi.png',
            }
            return (
              <button
                key={ch.id}
                onClick={() => { audio.play('click'); setActiveId(ch.id) }}
                style={{
                  flexShrink: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 4, padding: '8px 12px',
                  borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: isActive ? color : 'rgba(0,0,0,0.04)',
                  transition: 'all 0.2s',
                  minWidth: 70,
                }}
              >
                {modeIcons[ch.id]
                  ? <img src={modeIcons[ch.id]} style={{ width: 28, height: 28, objectFit: 'contain', filter: isActive ? 'brightness(10)' : 'none' }} />
                  : <span style={{ fontSize: 24 }}>{ch.emoji}</span>
                }
                <span style={{
                  fontSize: 10, fontWeight: 800, lineHeight: 1.2, textAlign: 'center',
                  color: isActive ? 'white' : 'rgba(0,0,0,0.5)',
                  maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {ch.shortTitle}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── Content area - scrollable full width ───────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4" style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Chapter title */}
            <div className="flex items-center gap-2 mb-4" style={{ flexShrink: 0 }}>
              {getChapterIcon(chapter.id)}
              <h2 className="font-black" style={{ color: '#1a1a2e', lineHeight: '1.6', fontSize: '18px' }}>
                {chapter.title}
              </h2>
            </div>

            {/* Rules items */}
            <div className="flex flex-col gap-2" style={{ flexShrink: 0 }}>
              {chapter.content.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2 rounded-2xl"
                  style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0, lineHeight: '1.6' }}>{item.icon}</span>
                  <p className="font-semibold" style={{ color: '#374151', lineHeight: '1.6', fontSize: '14px' }}>
                    {renderText(item.text)}
                  </p>
                </div>
              ))}

              {/* Bouton relancer tutoriel */}
              {chapter.tutorialButton && onRestartTutorial && (
                <button
                  onClick={() => { audio.play('click'); onRestartTutorial(); onClose() }}
                  className="w-full rounded-2xl font-black active:scale-95 transition-all mt-2"
                  style={{ background: '#FF6B1A', color: 'white', border: 'none', padding: '8px 12px', fontSize: '12px', flexShrink: 0 }}
                >
                  🔄 Relancer le tutoriel
                </button>
              )}

              {/* Checkbox réafficher les règles des modes — bien visible */}
              {['quest', 'explorer', 'blitz', 'hunt', 'marathon'].includes(chapter.id) && (
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(0,0,0,0.7)',
                  cursor: 'pointer', marginTop: 12, padding: '8px', background: 'rgba(255,107,26,0.08)',
                  borderRadius: '8px', border: '1px solid rgba(255,107,26,0.2)', flexShrink: 0
                }}>
                  <input
                    type="checkbox"
                    checked={showRulesOnLaunch}
                    onChange={(e) => {
                      audio.play('click')
                      setShowRulesOnLaunch(e.target.checked)
                      if (e.target.checked) {
                        // Supprimer toutes les clés skip_launch_*
                        const keysToRemove = []
                        for (let i = 0; i < localStorage.length; i++) {
                          const k = localStorage.key(i)
                          if (k && k.startsWith('skip_launch_')) keysToRemove.push(k)
                        }
                        keysToRemove.forEach(k => localStorage.removeItem(k))
                      }
                    }}
                    style={{ width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
                  />
                  <span>Réafficher les règles au lancement</span>
                </label>
              )}
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
