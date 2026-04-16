import { useState } from 'react'
import { audio } from '../utils/audio'
import EnergyIcon from './icons/EnergyIcon'
import MultipleChoiceIcon from './icons/MultipleChoiceIcon'
import QuestionTargetIcon from './icons/QuestionTargetIcon'
import TimerIcon from './icons/TimerIcon'
import PerfectIcon from './icons/PerfectIcon'

import { CURRENCY_EMOJI_MAP } from '../utils/renderEmoji'

const EMOJI_IMG = {
  '🎰': '/assets/ui/emoji-roulette.png?v=2',
  '🗺️': '/assets/ui/emoji-route.png',
  '🧩': '/assets/ui/emoji-puzzle.png',
  ...CURRENCY_EMOJI_MAP,
}

const QUICKIE_VIOLET = '#7F77DD'
const QUICKIE_GOLD = '#FFD700'

const COMPONENT_ICONS = {
  'icon:qcm': (size, color) => <MultipleChoiceIcon size={size} color={color === QUICKIE_GOLD ? QUICKIE_VIOLET : (color || '#ffffff')} accent={color || undefined} />,
  'icon:set': (size, color) => <QuestionTargetIcon size={size} color={color === QUICKIE_GOLD ? '#ffffff' : (color || '#ffffff')} accent={color === QUICKIE_GOLD ? QUICKIE_VIOLET : (color || undefined)} questionColor={color === QUICKIE_GOLD ? QUICKIE_GOLD : null} />,
  'icon:timer': (size, color) => <TimerIcon size={size} color={color === QUICKIE_GOLD ? QUICKIE_VIOLET : (color || '#ffffff')} accent={color || undefined} />,
  'icon:perfect': (size, color) => <PerfectIcon size={size} accent={color || undefined} />,
  'icon:energy': (size, color) => <EnergyIcon size={size} color={color || '#22C55E'} />,
}

function renderIcon(value, size, color) {
  const compFn = COMPONENT_ICONS[value]
  if (compFn) return compFn(size || 18, color)
  if (value === '🔋') return <EnergyIcon size={size || 16} color={color} />
  const src = EMOJI_IMG[value]
  if (!src) return value
  return <img src={src} alt="" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} />
}

// ── Couleurs par chapitre (partagées entre carousel et bandeau) ────────────
const CHAPTER_COLORS = {
  goal: '#3B82F6', tutorial: '#8B5CF6',
  quickie: '#7F77DD', vrai_ou_fou: '#6BCB77', quest: '#EF4444',
  race: '#00E5FF', blitz: '#FF1744', flash: '#FFD700',
  energy: '#10B981', hints: '#6366F1', coins: '#F59E0B',
  streak: '#F97316', roulette: '#A855F7', shop: '#06B6D4',
  collection: '#14B8A6', trophies: '#EAB308', profile: '#64748B',
  tips: '#22C55E',
}

// ── Chapters data ───────────────────────────────────────────────────────────
// Source de vérité : CLAUDE.md (économie ×10, 6 modes, Option B streak/coffres)
const CHAPTERS = [
  // ═══ INTRODUCTION ═══
  {
    id: 'goal',
    emoji: '🤯',
    shortTitle: 'But du jeu',
    title: 'Le But du Jeu',
    content: [
      { icon: '🎯', text: 'Des f*cts incroyables te sont présentés — à toi de trouver la **bonne réponse** !' },
      { icon: '🎮', text: '**6 modes de jeu** : Quickie, Vrai ou Fou, Quest, Race, Blitz et Flash.' },
      { icon: '🪙', text: 'Gagne des **Coins** à chaque bonne réponse pour débloquer du contenu.' },
      { icon: '📚', text: 'Débloque des **f*cts** et enrichis ta **Collection** personnelle.' },
      { icon: '🏆', text: 'Remporte des **trophées**, maintiens ta **série** et défie tes amis !' },
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
      { icon: '🏅', text: 'À la fin du tutoriel, tu gagnes tes **premiers coins** pour bien démarrer.' },
      { icon: '🔄', text: 'Si tu veux revivre cette expérience, clique ci-dessous.' },
    ],
    tutorialButton: true,
  },

  // ═══ MODES DE JEU (ordre CLAUDE.md) ═══
  {
    id: 'quickie',
    emoji: '🍸',
    shortTitle: 'Quickie',
    title: 'Mode Quickie',
    content: [
      { icon: 'icon:energy', text: '**Coût** : 1 énergie' },
      { icon: 'icon:set', text: '**Set** : 5 questions/set' },
      { icon: 'icon:qcm', text: '**QCM** : 2/question' },
      { icon: 'icon:timer', text: '**Timer** : 15s/question' },
      { icon: '💡', text: '**Indices** : 1 max/question' },
      { icon: '🪙', text: '**Gains** : 10 Coins/bonne réponse' },
      { icon: 'icon:perfect', text: '**Perfect** : (5/5) +50 Coins' },
    ],
  },
  {
    id: 'vrai_ou_fou',
    emoji: '🤔',
    shortTitle: 'Vrai ou Fou',
    title: 'Mode Vrai ou Fou',
    content: [
      { icon: '🆓', text: 'Coût : Gratuit et illimité' },
      { icon: '📋', text: '20 affirmations/session' },
      { icon: '👉', text: 'Swipe **Vrai** ou **Fou**' },
      { icon: '⏱️', text: 'Timer : 15s/question' },
      { icon: '🪙', text: 'Gains : 0 coin (mode viralité)' },
      { icon: '📣', text: 'Partage ton score X/20 avec tes amis !' },
    ],
  },
  {
    id: 'quest',
    emoji: '🗺️',
    shortTitle: 'Quest',
    title: 'Mode Quest',
    content: [
      { icon: '🔋', text: 'Coût : 1 énergie/bloc' },
      { icon: '📋', text: '10 Funny + 1 boss VIP conditionnel' },
      { icon: '🔢', text: 'QCM : 4/question' },
      { icon: '⏱️', text: '20s/question' },
      { icon: '💡', text: 'Indices : 2/question' },
      { icon: '👑', text: 'Boss VIP débloqué à **≥5/10** bonnes réponses' },
      { icon: '🪙', text: 'Gains : 20 Coins/bonne · +100 Coins/boss vaincu' },
      { icon: '🔒', text: 'Boss raté → retente depuis la carte pour débloquer le VIP' },
    ],
  },
  {
    id: 'race',
    emoji: '♾️',
    shortTitle: 'Race',
    title: 'Mode Race',
    content: [
      { icon: '🆓', text: 'Coût : gratuit illimité' },
      { icon: '📋', text: 'Questions illimitées jusqu\'à la **première erreur**' },
      { icon: '🔢', text: 'QCM : 4/question' },
      { icon: '⏱️', text: 'Timer : aucun' },
      { icon: '🚫', text: 'Aucun indice' },
      { icon: '🧠', text: 'Pioche dans tes f*cts Funny + VIP **déjà débloqués**' },
      { icon: '🏆', text: 'Gains : 0 coin — records et prestige uniquement' },
    ],
  },
  {
    id: 'blitz',
    emoji: '⚡',
    shortTitle: 'Blitz',
    title: 'Mode Blitz',
    content: [
      { icon: '🆓', text: 'Coût : gratuit (Solo) · 200 Coins pour créer un Défi' },
      { icon: '🎮', text: '2 sous-modes : **Solo** et **Défi**' },
      { icon: '⏱️', text: 'Solo : chrono **60s descendant** · Défi : chrono montant **+5s/erreur**' },
      { icon: '🔢', text: 'QCM : 2/question' },
      { icon: '🚫', text: 'Aucun indice — c\'est la mémoire pure !' },
      { icon: '🧠', text: 'Pioche dans tes f*cts **déjà débloqués** (Funny + VIP)' },
      { icon: '🏆', text: 'Gains : 0 coin — paliers de records 5/10/20/30/50/100' },
      { icon: '📣', text: 'Défi : partage ton résultat via WhatsApp (expire sous 48h)' },
    ],
  },
  {
    id: 'flash',
    emoji: '🔥',
    shortTitle: 'Flash',
    title: 'Mode Flash',
    content: [
      { icon: '🆓', text: 'Coût : gratuit · **1 fois par jour**' },
      { icon: '📋', text: '5 questions/set · QCM 2/question · 15s/question' },
      { icon: '📅', text: 'Lun-Sam : Funny thème du jour — 0 indice — **30 Coins fixe**' },
      { icon: '👑', text: 'Dimanche : **VIP Hunt de la semaine** — 2 indices — 1 VIP débloqué' },
      { icon: '⏰', text: 'Ne rate jamais ton rendez-vous quotidien !' },
    ],
  },

  // ═══ ÉNERGIE ═══
  {
    id: 'energy',
    emoji: '🔋',
    shortTitle: 'Énergie',
    title: 'Système d\'Énergie',
    content: [
      { icon: '🔋', text: 'Les modes **Quickie** et **Quest** consomment 1 énergie par session/bloc.' },
      { icon: '🆓', text: 'Stock max **5 énergies** — régénération **+1 toutes les 8h**.' },
      { icon: '🪙', text: 'Plus d\'énergie ? Achète **1 énergie pour 75 Coins** en boutique.' },
      { icon: '♾️', text: '**Vrai ou Fou, Race, Blitz** et **Flash** : gratuits illimités.' },
    ],
  },

  // ═══ INDICES ═══
  {
    id: 'hints',
    emoji: '💡',
    shortTitle: 'Indices',
    title: 'Les Indices',
    content: [
      { icon: '💡', text: 'Un indice **élimine une mauvaise réponse** parmi les choix.' },
      { icon: '📉', text: 'Chaque utilisation **consomme 1 indice** de ton stock personnel.' },
      { icon: '🗺️', text: '**Quest** : 2/question · **Quickie** : 1 max · **Flash dimanche** : 2 max' },
      { icon: '🚫', text: '**Vrai ou Fou, Race, Blitz, Flash lun-sam** : aucun indice disponible.' },
      { icon: '⚠️', text: 'Si ton stock est **vide**, le bouton est **grisé** — le timer ne pause jamais.' },
      { icon: '🛒', text: 'Achète des indices en **boutique** : **50 Coins** par indice.' },
      { icon: '🎁', text: 'Gagne aussi des indices via la **roulette** et les **paliers de série**.' },
    ],
  },

  // ═══ COINS ═══
  {
    id: 'coins',
    emoji: '🪙',
    shortTitle: 'Coins',
    title: 'Coins',
    content: [
      { icon: '🪙', text: 'Les **Coins** sont la monnaie du jeu — tu en gagnes en jouant.' },
      { icon: '🎯', text: '**Quickie** : 10/bonne · +50 perfect' },
      { icon: '🗺️', text: '**Quest** : 20/bonne · +100/boss vaincu' },
      { icon: '🔥', text: '**Flash lun-sam** : 30 fixe · **Flash dimanche** : 1 VIP débloqué' },
      { icon: '🤔', text: '**Vrai ou Fou · Race · Blitz** : 0 coin (prestige)' },
      { icon: '🎰', text: 'Gagne aussi des coins via la **roulette quotidienne** et tes **paliers de série**.' },
      { icon: '🛒', text: 'Dépense-les en **boutique** : indices, énergie, cadres, Défi Blitz (200 Coins).' },
    ],
  },

  // ═══ SÉRIE (STREAK) ═══
  {
    id: 'streak',
    emoji: '🔥',
    shortTitle: 'Série',
    title: 'Série Quotidienne',
    content: [
      { icon: '📅', text: 'Joue **au moins 1 partie par jour** pour maintenir ta série.' },
      { icon: '🔥', text: 'La série se **reset à 0** si tu manques un jour (sauf Streak Freeze).' },
      { icon: '🥉', text: '**Débutant (J3)** : 75 Coins' },
      { icon: '🥈', text: '**Habitué (J7)** : 200 Coins + 2 indices' },
      { icon: '🥇', text: '**Fidèle (J14)** : 500 Coins' },
      { icon: '👑', text: '**Légende (J30)** : 1 000 Coins + cadre exclusif' },
      { icon: '🛡️', text: 'Achète un **Streak Freeze** (150 Coins) pour protéger ta série.' },
    ],
  },

  // ═══ ROULETTE ═══
  {
    id: 'roulette',
    emoji: '🎰',
    shortTitle: 'Roulette',
    title: 'Roulette Quotidienne',
    content: [
      { icon: '🆓', text: '**1 tour gratuit** par jour — reviens chaque jour !' },
      { icon: '🪙', text: 'Tours supplémentaires : **100 Coins**.' },
      { icon: '🎯', text: 'La roue contient : **20 · 50 · 100 · 150 · 300 · 750 Coins** ou **1-2 indices**.' },
      { icon: '💎', text: 'Jackpot **750 Coins** : ultra-rare — tente ta chance !' },
      { icon: '📊', text: 'Combine la roulette avec ta série pour **maximiser tes gains quotidiens**.' },
    ],
  },

  // ═══ BOUTIQUE ═══
  {
    id: 'shop',
    emoji: '🛒',
    shortTitle: 'Boutique',
    title: 'La Boutique',
    content: [
      { icon: '💡', text: '**Indices** : 1 (50 Coins) · 3 (140, -7%) · 5 (220, -12%)' },
      { icon: '🔋', text: '**Énergie** : 1 (75 Coins) · 3 (200, -11%) · 5 (320, -15%)' },
      { icon: '🛡️', text: '**Streak Freeze** : 150 Coins — protège ta série pendant 1 jour' },
      { icon: '✨', text: '**Cadres de profil** : 300 à 800 Coins' },
      { icon: '🎁', text: '**Offres de bienvenue** : Starter Pack 2,99 € (7 premiers jours)' },
    ],
  },

  // ═══ COLLECTION ═══
  {
    id: 'collection',
    emoji: '📚',
    shortTitle: 'Collection',
    title: 'Ta Collection',
    content: [
      { icon: '🗂️', text: 'Tes f*cts débloqués sont organisés par **catégorie** (30+ catégories).' },
      { icon: '📊', text: 'Suis ta **progression par catégorie** avec les barres de progression.' },
      { icon: '⭐', text: '2 onglets : **WTF! VIP** (boss Quest + Hunt Flash) et **Funny F*cts**.' },
      { icon: '🔄', text: 'Un f*ct déjà débloqué **ne réapparaît plus** dans les quiz.' },
      { icon: '🏆', text: 'Complète des catégories pour débloquer des **trophées** !' },
    ],
  },

  // ═══ TROPHÉES ═══
  {
    id: 'trophies',
    emoji: '🏆',
    shortTitle: 'Trophées',
    title: 'Les Trophées',
    content: [
      { icon: '🌍', text: '**Progression** : débloque 1, 10, 50, 100 ou 200 f*cts au total.' },
      { icon: '⭐', text: '**WTF! & Funny** : collectionne des f*cts VIP et Funny par paliers.' },
      { icon: '📂', text: '**Par catégorie** : 5 paliers par catégorie (5, 10, 15, 20, tous).' },
      { icon: '🔥', text: '**Séries** : maintiens une série de 7, 30 ou 100 jours.' },
      { icon: '⚡', text: '**Blitz** : paliers Solo 5/10/20/30/50/100 et records de vitesse.' },
      { icon: '♾️', text: '**Race** : atteins 10, 25, 50 ou 100 bonnes réponses d\'affilée.' },
      { icon: '👥', text: '**Social** : ajoute des amis et relève des Défis Blitz.' },
      { icon: '📊', text: 'Suis ta progression et ton **prochain objectif** sur la page Trophées.' },
    ],
  },

  // ═══ PROFIL ═══
  {
    id: 'profile',
    emoji: '👤',
    shortTitle: 'Profil',
    title: 'Ton Profil',
    content: [
      { icon: '✏️', text: 'Personnalise ton **pseudo** et ton **avatar**.' },
      { icon: '🖼️', text: 'Débloque des **cadres** en boutique ou en atteignant le palier Légende.' },
      { icon: '📊', text: 'Consulte tes **statistiques** par mode : parties jouées, score moyen, records.' },
      { icon: '🔗', text: 'Connecte-toi avec **Google** pour **sauvegarder ta progression** dans le cloud.' },
      { icon: '⚙️', text: 'Accède aux **paramètres** : son, vibrations, mode sombre, etc.' },
    ],
  },

  // ═══ ASTUCES ═══
  {
    id: 'tips',
    emoji: '✨',
    shortTitle: 'Astuces',
    title: 'Astuces & Conseils',
    content: [
      { icon: '🎯', text: 'Commence par le mode **Quickie** pour gagner des coins et débloquer des f*cts.' },
      { icon: '💡', text: 'Garde tes **indices** pour les boss VIP de Quest.' },
      { icon: '📅', text: 'Joue **chaque jour** : Flash + roulette + paliers de série = **250-400 Coins/jour**.' },
      { icon: '🧠', text: 'Joue **Race** pour réviser tes f*cts débloqués sans pression.' },
      { icon: '⚔️', text: 'Envoie un **Défi Blitz** à un ami (200 Coins) pour la gloire !' },
      { icon: '🛡️', text: 'Achète un **Streak Freeze** avant un week-end chargé pour protéger ta série.' },
      { icon: '📣', text: 'Partage tes scores **Vrai ou Fou** pour inviter tes potes à jouer !' },
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
    quest: '/assets/modes/quest.png',
    quickie: '/assets/modes/quickie.png',
    flash: '/assets/modes/flash.svg',
    blitz: '/assets/modes/blitz.png',
    race: '/assets/modes/race.png',
    vrai_ou_fou: '/assets/modes/vrai-ou-fou.png',
  }

  if (modeIcons[chapterId]) {
    return <img src={modeIcons[chapterId]} style={{ width: 22, height: 22, objectFit: 'contain' }} alt="" />
  }

  // For non-mode chapters, use emoji
  const chapter = CHAPTERS.find(c => c.id === chapterId)
  return <span style={{ fontSize: 20 }}>{renderIcon(chapter?.emoji || '')}</span>
}

// ── Main component ──────────────────────────────────────────────────────────
export default function HowToPlayModal({ onClose, onRestartTutorial }) {
  // Read player progress from localStorage

  // State for checkbox "show rules on launch"
  const [showRulesOnLaunch, setShowRulesOnLaunch] = useState(false)

  // Toutes les pages visibles dès le départ (plus de gating progressif)
  const visibleChapters = CHAPTERS

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
          maxWidth: 520,
          height: 'min(92vh, 700px)',
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
            const color = CHAPTER_COLORS[ch.id] || '#FF6B1A'
            const modeIcons = {
              quest: '/assets/modes/quest.png',
              quickie: '/assets/modes/quickie.png',
              flash: '/assets/modes/flash.svg',
              blitz: '/assets/modes/blitz.png',
              race: '/assets/modes/race.png',
              vrai_ou_fou: '/assets/modes/vrai-ou-fou.png',
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
                  ? <img src={modeIcons[ch.id]} style={{ width: 28, height: 28, objectFit: 'contain', filter: isActive && !modeIcons[ch.id].endsWith('.png?v=2') ? 'brightness(10)' : 'none' }} />
                  : <span style={{ fontSize: 24 }}>{renderIcon(ch.emoji)}</span>
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

        {/* ── Bandeau coloré du chapitre actif ───────────────────────────── */}
        {(() => {
          const chapterColor = CHAPTER_COLORS[chapter.id] || '#FF6B1A'
          return (
            <div style={{
              flexShrink: 0,
              background: `linear-gradient(90deg, ${chapterColor}, ${chapterColor}CC)`,
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              borderBottom: `2px solid ${chapterColor}`,
              boxShadow: `0 2px 8px ${chapterColor}33`,
            }}>
              <span style={{ fontSize: 22, display: 'flex', alignItems: 'center' }}>{getChapterIcon(chapter.id)}</span>
              <h2 className="font-black" style={{
                color: '#ffffff',
                lineHeight: 1.2,
                fontSize: 17,
                margin: 0,
                textShadow: '0 1px 2px rgba(0,0,0,0.25)',
                flex: 1,
              }}>
                {chapter.title}
              </h2>
            </div>
          )
        })()}

        {/* ── Content area - scrollable full width ───────────────────────────── */}
        <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <div className="overflow-y-auto p-4" style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
        }}>

            {/* Rules items */}
            <div className="flex flex-col gap-2" style={{ flexShrink: 0 }}>
              {chapter.content.map((item, i) => {
                const isQuickieChapter = chapter.id === 'quickie'
                const isVOFChapter = chapter.id === 'vrai_ou_fou'
                const isCustomChapter = isQuickieChapter || isVOFChapter
                let iconColor = undefined
                if (isQuickieChapter) {
                  iconColor = item.icon === 'icon:energy' ? '#22C55E' : QUICKIE_GOLD
                } else if (isVOFChapter) {
                  iconColor = i % 2 === 0 ? '#6BCB77' : '#E84535'
                }
                const borderCol = isQuickieChapter ? QUICKIE_VIOLET : isVOFChapter ? '#6BCB77' : '#E5E7EB'
                const textCol = isQuickieChapter ? QUICKIE_VIOLET : isVOFChapter ? '#1a1a2e' : '#374151'
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2 rounded-2xl"
                    style={{
                      background: isCustomChapter ? '#ffffff' : '#F3F4F6',
                      border: isCustomChapter ? `2px solid ${borderCol}` : `1px solid ${borderCol}`,
                    }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{renderIcon(item.icon, 18, iconColor)}</span>
                    <p style={{ color: textCol, lineHeight: '1.4', fontSize: '14px', fontWeight: isCustomChapter ? 700 : 600, margin: 0 }}>
                      {renderText(item.text)}
                    </p>
                  </div>
                )
              })}

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
              {['quickie', 'vrai_ou_fou', 'quest', 'race', 'blitz', 'flash', 'energy'].includes(chapter.id) && (
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
          {/* Fade gradient bas pour indiquer le scroll */}
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, height: 24,
            background: 'linear-gradient(to bottom, rgba(250,250,248,0), rgba(250,250,248,1))',
            pointerEvents: 'none',
          }} />
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div
          className="px-5 pb-5 pt-3 shrink-0 flex items-center gap-3"
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
          {/* Indicateur de progression */}
          <span style={{
            fontSize: 11, fontWeight: 800, color: '#9CA3AF',
            minWidth: 38, textAlign: 'center', fontVariantNumeric: 'tabular-nums',
          }}>
            {visibleChapters.findIndex(c => c.id === activeId) + 1}/{visibleChapters.length}
          </span>
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
