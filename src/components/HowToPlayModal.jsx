import { useState } from 'react'
import { audio } from '../utils/audio'
import { MODE_CONFIGS } from '../constants/gameConfig'
// Icons + renderIcon partagés avec ModeLaunchScreen (source unique de vérité)
import { renderIcon, QUICKIE_VIOLET } from '../utils/modeRuleIcons'

// ── Couleurs par chapitre ────────────────────────────────────────────────────
const CHAPTER_COLORS = {
  goal: '#3B82F6', tutorial: '#8B5CF6',
  quickie: '#FFA500', vrai_ou_fou: '#6BCB77', quest: '#EF4444',
  race: '#00E5FF', blitz: '#FF1744', flash: '#FFD700', multi: '#6B2D8E',
  energy: '#10B981', hints: '#6366F1', coins: '#F59E0B',
  streak: '#F97316', roulette: '#A855F7', shop: '#06B6D4',
  collection: '#14B8A6', trophies: '#EAB308', profile: '#64748B',
  tips: '#22C55E',
}

const MULTI_VIOLET = '#6B2D8E'
const MULTI_GOLD = '#FFD700'
const QUEST_ORANGE = '#FF6B1A'
const QUEST_DARK = '#D94A10'

// ── Mode icon mapping — utilise les icon-* pour les modes ────────────────────
const MODE_ICON_MAP = {
  quest: '/assets/modes/icon-quest.png',
  quickie: '/assets/modes/icon-quickie.png',
  flash: '/assets/daily.png',
  blitz: '/assets/modes/icon-blitz.png',
  race: '/assets/modes/icon-race.png',
  vrai_ou_fou: '/assets/modes/icon-vrai-et-fou.png',
  multi: '/assets/modes/icon-multi.png',
}

// Modes qui utilisent un style "white card" dans le livret (identique à ModeLaunchScreen)
const STYLED_MODE_IDS = ['quickie', 'vrai_ou_fou', 'race', 'blitz', 'multi', 'quest']

// ── Chapters data ───────────────────────────────────────────────────────────
const CHAPTERS = [
  // ═══ INTRODUCTION ═══
  {
    id: 'goal',
    emoji: '🤯',
    shortTitle: 'But du jeu',
    title: 'Le But du Jeu',
    content: [
      { icon: '🎯', text: 'Des f*cts incroyables te sont présentés — à toi de trouver la **bonne réponse** !' },
      { icon: '🎮', text: '**6 modes de jeu** : Quickie, Vrai ET Fou, Quest, Race, Blitz et Flash.' },
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

  // ═══ MODES DE JEU — contenu dynamique depuis MODE_CONFIGS ═══
  // Ordre officiel (19/04/2026) : Quest · Quickie · VoF · Race · Blitz · Multi · Flash
  { id: 'quest', shortTitle: 'Quest', dynamic: true },
  { id: 'quickie', shortTitle: 'Quickie', dynamic: true },
  { id: 'vrai_ou_fou', shortTitle: 'Vrai ET Fou', dynamic: true },
  { id: 'race', shortTitle: 'Race', dynamic: true },
  { id: 'blitz', shortTitle: 'Blitz', dynamic: true },
  { id: 'multi', shortTitle: 'Multi', dynamic: true },
  { id: 'flash', shortTitle: 'Flash', dynamic: true },

  // ═══ ROULETTE (juste après les modes) ═══
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
      { icon: '♾️', text: '**Vrai ET Fou, Race, Blitz** et **Flash** : gratuits illimités.' },
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
      { icon: '🗺️', text: '**Quest** : 2 / question · **Quickie** : 1 max · **Flash dimanche** : 2 max' },
      { icon: '🚫', text: '**Vrai ET Fou, Race, Blitz, Flash lun-sam** : aucun indice disponible.' },
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
      { icon: '🤔', text: '**Vrai ET Fou · Race · Blitz** : 0 coin (prestige)' },
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
      { icon: 'icon:star', text: '2 onglets : **WTF! VIP** (boss Quest + Hunt Flash) et **Funny F*cts**.' },
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
      { icon: 'icon:star', text: '**WTF! & Funny** : collectionne des f*cts VIP et Funny par paliers.' },
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
      { icon: '📣', text: 'Partage tes scores **Vrai ET Fou** pour inviter tes potes à jouer !' },
    ],
  },
]

// Bold + {{red}} markdown renderer
function renderText(text) {
  const parts = text.split(/(\{\{red\}\}.*?\{\{\/red\}\}|\*\*.*?\*\*)/g)
  return parts.map((p, i) => {
    const redMatch = p.match(/^\{\{red\}\}(.*?)\{\{\/red\}\}$/)
    if (redMatch) return <span key={i} style={{ color: '#E84535' }}>{redMatch[1]}</span>
    if (i % 2 === 1 && p.startsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>
    return p
  })
}

function getChapterIcon(chapterId) {
  if (MODE_ICON_MAP[chapterId]) {
    return <img src={MODE_ICON_MAP[chapterId]} style={{ width: 22, height: 22, objectFit: 'contain' }} alt="" />
  }
  const chapter = resolveChapter(CHAPTERS.find(c => c.id === chapterId))
  return <span style={{ fontSize: 20 }}>{renderIcon(chapter?.emoji || '')}</span>
}

function resolveChapter(ch) {
  if (!ch || !ch.dynamic) return ch
  const cfg = MODE_CONFIGS[ch.id]
  if (!cfg) return ch
  return {
    ...ch,
    emoji: cfg.emoji,
    title: `Mode ${cfg.modeName}`,
    content: cfg.rules,
  }
}

// ── Main component ──────────────────────────────────────────────────────────
// Modes qui ont une page de règles déclenchée par skip_launch_${mode}
const MODES_WITH_LAUNCH_RULES = ['quickie', 'vrai_ou_fou', 'quest', 'race', 'blitz', 'flash', 'multi']

export default function HowToPlayModal({ onClose, onRestartTutorial }) {
  // État initial : coché si AUCUN mode n'a de skip_launch_* = 'true' (les règles
  // s'affichent par défaut). Décoché dès qu'un mode est flaggé skip.
  const [showRulesOnLaunch, setShowRulesOnLaunch] = useState(() => {
    try {
      return !MODES_WITH_LAUNCH_RULES.some(m => localStorage.getItem(`skip_launch_${m}`) === 'true')
    } catch { return true }
  })

  const visibleChapters = CHAPTERS
  const [activeId, setActiveId] = useState(visibleChapters[0]?.id || 'goal')
  const rawChapter = visibleChapters.find(c => c.id === activeId) || visibleChapters[0]
  const chapter = resolveChapter(rawChapter)

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 300, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full h-full flex flex-col overflow-hidden"
        style={{
          maxWidth: 520,
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
            const resolvedCh = resolveChapter(ch)
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
                {MODE_ICON_MAP[ch.id]
                  ? <img src={MODE_ICON_MAP[ch.id]} style={{ width: 28, height: 28, objectFit: 'contain' }} alt="" />
                  : <span style={{ fontSize: 24 }}>{renderIcon(resolvedCh?.emoji || '')}</span>
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

        {/* ── Content area - fullscreen sans scroll ───────────────────────────── */}
        <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <div className="p-3" style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>

            {/* Rules items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: STYLED_MODE_IDS.includes(chapter.id) ? 4 : 6, flexShrink: 0 }}>
              {(chapter.content || []).map((item, i) => {
                const isStyledMode = STYLED_MODE_IDS.includes(chapter.id)
                let iconColor = undefined
                if (chapter.id === 'quickie') {
                  iconColor = item.icon === 'icon:energy' ? '#22C55E' : QUICKIE_GOLD
                } else if (chapter.id === 'vrai_ou_fou') {
                  iconColor = i % 2 === 0 ? '#6BCB77' : '#E84535'
                } else if (chapter.id === 'race') {
                  iconColor = i % 2 === 0 ? '#00E5FF' : '#0097A7'
                } else if (chapter.id === 'blitz') {
                  iconColor = i % 2 === 0 ? '#FF4444' : '#CC0000'
                } else if (chapter.id === 'multi') {
                  iconColor = i % 2 === 0 ? MULTI_VIOLET : '#4A1E63'
                } else if (chapter.id === 'quest') {
                  iconColor = i % 2 === 0 ? QUEST_ORANGE : QUEST_DARK
                }
                const BORDER_OVERRIDES = { quickie: '#FF7518', vrai_ou_fou: '#008000', race: '#0F52BA', blitz: '#FF4444', multi: MULTI_VIOLET, quest: QUEST_DARK }
                const TEXT_OVERRIDES = { quickie: QUICKIE_VIOLET, vrai_ou_fou: '#6BCB77', race: '#23D5D5', blitz: '#FF4444', multi: MULTI_VIOLET, quest: QUEST_ORANGE }
                const modeColor = CHAPTER_COLORS[chapter.id] || '#FF6B1A'
                const borderCol = isStyledMode ? (BORDER_OVERRIDES[chapter.id] || modeColor) : '#E5E7EB'
                const textCol = isStyledMode ? (TEXT_OVERRIDES[chapter.id] || '#1a1a2e') : '#374151'
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: isStyledMode ? '#ffffff' : '#F3F4F6',
                      border: isStyledMode ? `3px solid ${borderCol}` : `1px solid ${borderCol}`,
                      borderRadius: 12, padding: isStyledMode ? '8px 14px' : '12px 14px',
                    }}
                  >
                    <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, color: isStyledMode ? textCol : 'inherit' }}>
                      {renderIcon(item.icon, 22, iconColor, chapter.id)}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: isStyledMode ? 700 : 600, lineHeight: 1.35, color: isStyledMode ? textCol : '#374151', margin: 0 }}>
                      {renderText(item.text)}
                    </span>
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
            </div>
          </div>
        </div>

        {/* ── Checkbox réafficher règles — extraite pour ne jamais être coupée ── */}
        {['quickie', 'vrai_ou_fou', 'quest', 'race', 'blitz', 'flash', 'energy'].includes(chapter.id) && (
          <label style={{
            display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(0,0,0,0.7)',
            cursor: 'pointer', margin: '6px 12px 0', padding: '6px 8px',
            background: 'rgba(255,107,26,0.08)',
            borderRadius: '8px', border: '1px solid rgba(255,107,26,0.2)', flexShrink: 0,
          }}>
            <input
              type="checkbox"
              checked={showRulesOnLaunch}
              onChange={(e) => {
                audio.play('click')
                setShowRulesOnLaunch(e.target.checked)
                if (e.target.checked) {
                  // Coché → les règles doivent s'afficher → on efface tous les skip flags
                  const keysToRemove = []
                  for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i)
                    if (k && k.startsWith('skip_launch_')) keysToRemove.push(k)
                  }
                  keysToRemove.forEach(k => localStorage.removeItem(k))
                } else {
                  // Décoché → les règles NE doivent PAS s'afficher → on pose le flag
                  // skip_launch_${mode} = 'true' pour chaque mode ayant une page de règles.
                  MODES_WITH_LAUNCH_RULES.forEach(m => {
                    localStorage.setItem(`skip_launch_${m}`, 'true')
                  })
                }
              }}
              style={{ width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
            />
            <span>Afficher les règles au lancement</span>
          </label>
        )}

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div
          className="px-5 pb-5 pt-3 shrink-0 flex items-center gap-3"
          style={{ borderTop: '1px solid #E5E7EB' }}
        >
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
