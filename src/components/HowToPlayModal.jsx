import { useState } from 'react'
import { audio } from '../utils/audio'

import { CURRENCY_EMOJI_MAP } from '../utils/renderEmoji'

const EMOJI_IMG = {
  '🎰': '/assets/ui/emoji-roulette.png',
  '🔋': '/assets/ui/emoji-energy.png',
  '🗺️': '/assets/ui/emoji-route.png',
  '🧩': '/assets/ui/emoji-puzzle.png',
  ...CURRENCY_EMOJI_MAP,
}
function renderIcon(value) {
  const src = EMOJI_IMG[value]
  if (!src) return value
  return <img src={src} alt="" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} />
}

// ── Couleurs par chapitre (partagées entre carousel et bandeau) ────────────
const CHAPTER_COLORS = {
  goal: '#3B82F6', tutorial: '#8B5CF6', quest: '#EF4444',
  flash: '#FFD700', explorer: '#22C55E', blitz: '#FF6B1A',
  hunt: '#EC4899', energy: '#10B981', hints: '#6366F1',
  coins: '#F59E0B', streak: '#F97316', roulette: '#A855F7',
  shop: '#06B6D4', mystery: '#7C3AED', collection: '#14B8A6',
  trophies: '#EAB308', profile: '#64748B',
  tips: '#22C55E',
}

// ── Chapters data ───────────────────────────────────────────────────────────
const CHAPTERS = [
  // ═══ INTRODUCTION ═══
  {
    id: 'goal',
    emoji: '🤯',
    shortTitle: 'But du jeu',
    title: 'Le But du Jeu',
    content: [
      { icon: '🎯', text: 'Des faits incroyables te sont présentés — à toi de trouver la **bonne réponse** parmi les choix proposés !' },
      { icon: '⏱️', text: 'Chaque question a un **timer** — réponds avant la fin du temps !' },
      { icon: '🪙', text: 'Gagne des **WTF! Coins** à chaque bonne réponse pour débloquer du contenu.' },
      { icon: '📚', text: 'Débloque des **f*cts** et enrichis ta **Collection** personnelle.' },
      { icon: '🏆', text: 'Remporte des **trophées**, maintiens ta **série** et grimpe dans les classements !' },
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

  // ═══ MODES DE JEU ═══
  {
    id: 'quest',
    emoji: '🗺️',
    shortTitle: 'Quest',
    title: 'Quest',
    content: [
      { icon: '🆓', text: '**Gratuit et illimité** — progression linéaire niveau par niveau.' },
      { icon: '🎯', text: '**3 f*cts funny** par niveau · 4 QCM · 20s.' },
      { icon: '👑', text: 'Tous les **10 niveaux** : un **boss VIP** avec un f*ct WTF! exclusif.' },
      { icon: '⭐', text: 'Niveau réussi à 100% = niveau suivant débloqué.' },
      { icon: '🪙', text: '**+4 coins** par niveau parfait · **+15 coins** par boss vaincu.' },
      { icon: '💎', text: 'Les boss VIP sont la seule façon de débloquer les **f*cts WTF!** en Quest.' },
    ],
  },
  {
    id: 'snack',
    emoji: '🎯',
    shortTitle: 'Snack',
    title: 'Mode Snack',
    content: [
      { icon: '🔋', text: '**Coût :** 1 Capsule d\'énergie.' },
      { icon: '📋', text: '**Set :** 5 questions/set.' },
      { icon: '🔢', text: '**QCM :** 2/question.' },
      { icon: '⏱️', text: '**Timer :** 15s/question.' },
      { icon: '🪙', text: '**Récompense :** 10 WTFCoins/bonne réponse.' },
      { icon: '🎁', text: '**Perfect :** +50 WTFCoins.' },
    ],
  },
  {
    id: 'blitz',
    emoji: '⚡',
    shortTitle: 'Blitz',
    title: 'Mode Blitz',
    content: [
      { icon: '🆓', text: '**Gratuit et illimité** — joue autant que tu veux !' },
      { icon: '⏱️', text: 'Chrono de **60 secondes** qui descend — réponds le plus vite possible.' },
      { icon: '📊', text: 'Choisis ton palier : **5 / 10 / 20 / 30 / 50 / 100 questions**.' },
      { icon: '✅', text: 'Bonne réponse = **+2s** au chrono · Mauvaise = **-3s** de pénalité.' },
      { icon: '🚫', text: '**Pas d\'indices** — c\'est la mémoire pure !' },
      { icon: '🧠', text: 'Joue uniquement avec tes **f*cts déjà débloqués**.' },
      { icon: '💰', text: '**0 coin** — seul le **prestige** et tes **records** comptent !' },
      { icon: '🏆', text: 'Bats tes **records personnels** de vitesse.' },
    ],
  },
  {
    id: 'flash',
    emoji: '🔥',
    shortTitle: 'Flash',
    title: 'Flash (WTF! de la Semaine)',
    content: [
      { icon: '🆓', text: '**Gratuit** — disponible **1 fois par semaine** (le dimanche).' },
      { icon: '🎯', text: 'Un **f*ct WTF! spécial** à découvrir chaque semaine !' },
      { icon: '⚡', text: '**5 questions** · 4 QCM · **20s** par question.' },
      { icon: '💡', text: 'Jusqu\'à **2 indices** utilisables (consomme ton stock).' },
      { icon: '🪙', text: 'Gagne des **coins** et débloque le **WTF! de la Semaine**.' },
      { icon: '📅', text: 'Reviens **chaque dimanche** — un nouveau WTF! t\'attend !' },
      { icon: '🔒', text: 'Si tu rates le dimanche, le f*ct disparaît jusqu\'au dimanche suivant.' },
    ],
  },

  // ═══ ÉNERGIE ═══
  {
    id: 'energy',
    emoji: '🔋',
    shortTitle: 'Énergie',
    title: 'Système d\'Énergie',
    content: [
      { icon: '🔋', text: 'Les modes **Snack** et **Snack** consomment de l\'**énergie**.' },
      { icon: '🆓', text: 'Tu as **3 sessions gratuites** par jour (les barres oranges sur l\'accueil).' },
      { icon: '⏰', text: 'L\'énergie se **recharge à minuit** automatiquement.' },
      { icon: '🪙', text: 'Plus d\'énergie ? Achète **1 session pour 10 coins** en boutique.' },
      { icon: '📦', text: 'Tu peux aussi acheter des **packs d\'énergie** avec réduction en boutique.' },
      { icon: '♾️', text: 'Les modes **Quest**, **Blitz** et **Flash** ne consomment **pas d\'énergie**.' },
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
      { icon: '❄️', text: '**Quest / Snack / Snack / Flash** : jusqu\'à **2 indices** par question.' },
      { icon: '🚫', text: '**Blitz** : aucun indice disponible.' },
      { icon: '⚠️', text: 'Si ton stock est **vide**, le bouton est **grisé** — le timer ne pause jamais.' },
      { icon: '🛒', text: 'Achète des indices en **boutique** : 1 pour 10 coins, 3 pour 30, 5 pour 45.' },
      { icon: '🎁', text: 'Gagne des indices via la **roulette**, les **récompenses de série** et les **mystery packs**.' },
    ],
  },

  // ═══ COINS ═══
  {
    id: 'coins',
    emoji: '🪙',
    shortTitle: 'Coins',
    title: 'WTF! Coins',
    content: [
      { icon: '🪙', text: 'Les **WTF! Coins** sont la monnaie du jeu — tu en gagnes en jouant.' },
      { icon: '⭐', text: '**Quest** : 4 coins/niveau parfait · 15 coins/boss vaincu.' },
      { icon: '🎯', text: '**Snack** : **2 coins** par bonne réponse.' },
      { icon: '🗺️', text: '**Snack** : **1 coin** par bonne réponse.' },
      { icon: '🔥', text: '**Flash** : **2 coins** par bonne réponse.' },
      { icon: '⚡', text: '**Blitz** : **0 coin** — prestige uniquement.' },
      { icon: '🎰', text: 'Gagne aussi des coins via la **roulette quotidienne** et ta **série**.' },
      { icon: '🛒', text: 'Dépense-les en **boutique** : indices, énergie, mystery packs, streak freezes.' },
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
      { icon: '🔥', text: 'La série se **reset à 0** si tu manques un jour (sauf avec un Streak Freeze).' },
      { icon: '🪙', text: '**Jour 1** : 2 coins.' },
      { icon: '💡', text: '**Jour 3** : 2 indices.' },
      { icon: '🪙', text: '**Jour 7** : 35 coins + badge.' },
      { icon: '🎁', text: '**Jour 14** : 25 coins + 3 indices.' },
      { icon: '👑', text: '**Jour 30** : récompense spéciale premium !' },
      { icon: '🛡️', text: 'Achète un **Streak Freeze** (15 coins) pour protéger ta série si tu rates un jour.' },
      { icon: '🏆', text: 'Des **trophées** sont liés à ta série : 7, 30 et 100 jours consécutifs.' },
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
      { icon: '🪙', text: 'Tours supplémentaires : **10 coins** chacun.' },
      { icon: '🎯', text: 'La roue contient : **5, 10, 20 ou 50 coins** · **1 ou 2 indices** · **1 Streak Freeze**.' },
      { icon: '📊', text: 'Les gains les plus rares (50 coins, Streak Freeze) ont **moins de chances** de tomber.' },
      { icon: '💎', text: 'Combine la roulette avec ta série pour **maximiser tes gains quotidiens** !' },
    ],
  },

  // ═══ BOUTIQUE ═══
  {
    id: 'shop',
    emoji: '🛒',
    shortTitle: 'Boutique',
    title: 'La Boutique',
    content: [
      { icon: '💡', text: '**Indices** : 1 (10 coins) · 3 (30 coins) · 5 (45 coins, -10%).' },
      { icon: '🔋', text: '**Énergie** : 1 (10 coins) · 3 (25 coins, -17%) · 5 (40 coins, -20%).' },
      { icon: '🛡️', text: '**Streak Freeze** : 15 coins — protège ta série pendant 1 jour.' },
      { icon: '📦', text: '**Mystery Packs** : ouvre des packs pour débloquer des f*cts aléatoires !' },
      { icon: '💰', text: 'Achète en **lots** pour profiter des **réductions** !' },
    ],
  },

  // ═══ MYSTERY PACKS ═══
  {
    id: 'mystery',
    emoji: '📦',
    shortTitle: 'Packs',
    title: 'Mystery Packs',
    content: [
      { icon: '📦', text: '**Pack Découverte** (15 coins) : 2 Funny f*cts aléatoires.' },
      { icon: '🎁', text: '**Pack Standard** (35 coins) : 5 Funny f*cts aléatoires.' },
      { icon: '📂', text: '**Pack Catégorie** (40 coins) : 4 Funny f*cts d\'une **catégorie au choix**.' },
      { icon: '✨', text: '**Pack Premium** (80 coins) : 7 f*cts avec **5% de chance VIP** chacun.' },
      { icon: '🏆', text: '**Pack Mega** (150 coins) : 12 f*cts + **1 VIP garanti** !' },
      { icon: '🎰', text: '**Pity system** : après 5 Packs Premium sans VIP, le suivant en **garantit 1**.' },
      { icon: '📚', text: 'Les f*cts débloqués par pack vont directement dans ta **Collection**.' },
    ],
  },

  // ═══ COLLECTION ═══
  {
    id: 'collection',
    emoji: '📚',
    shortTitle: 'Collection',
    title: 'Ta Collection',
    content: [
      { icon: '🗂️', text: 'Tes f*cts débloqués sont organisés par **catégorie** (15+ catégories).' },
      { icon: '📊', text: 'Suis ta **progression par catégorie** avec les barres de progression.' },
      { icon: '⭐', text: '2 onglets : **WTF! VIP** (f*cts exclusifs Quest) et **Funny F*cts** (tous les autres).' },
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
      { icon: '⭐', text: '**WTF! & Funny** : collectionne des f*cts VIP (1, 10, 25, 50) et Funny (1, 10, 25, 50).' },
      { icon: '📂', text: '**Par catégorie** : 5 paliers par catégorie (5, 10, 15, 20, tous) = **75 trophées** !' },
      { icon: '🔥', text: '**Séries** : maintiens une série de 7, 30 ou 100 jours.' },
      { icon: '⚡', text: '**Blitz** : rookie, pro (<30s), master (<20s), légende (<15s), sans faute.' },
      { icon: '🎮', text: '**Parties** : joue 10, 50, 100 ou 500 parties au total.' },
      { icon: '👥', text: '**Social** : ajoute des amis et envoie des défis.' },
      { icon: '👑', text: '**Perfect** : fais un score parfait en Quest.' },
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
      { icon: '📊', text: 'Consulte tes **statistiques** par mode : parties jouées, score moyen, etc.' },
      { icon: '🔗', text: 'Connecte-toi avec **Google** pour **sauvegarder ta progression** dans le cloud.' },
      { icon: '📱', text: 'La connexion te permet de **retrouver tes données** si tu changes d\'appareil.' },
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
      { icon: '🎯', text: 'Commence par le mode **Snack** pour gagner des coins et débloquer des f*cts.' },
      { icon: '💡', text: 'Garde tes **indices** pour les questions difficiles en Quest WTF!.' },
      { icon: '📅', text: 'Joue **chaque jour** : la série + la roulette = **30-50 coins/jour** gratuits !' },
      { icon: '🧠', text: 'Joue en **Blitz** pour réviser tes f*cts débloqués et améliorer tes records.' },
      { icon: '📦', text: 'Les **Packs Catégorie** sont idéaux pour compléter une catégorie spécifique.' },
      { icon: '🛡️', text: 'Achète un **Streak Freeze** avant un week-end chargé pour protéger ta série !' },
      { icon: '🔥', text: 'Le **Flash** est 100% gratuit — ne rate jamais le WTF! de la Semaine !' },
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
    quest: '/assets/modes/quest.svg',
    snack: '/assets/modes/snack.svg',
    flash: '/assets/modes/flash.svg',
    blitz: '/assets/modes/blitz.svg',
    marathon: '/assets/modes/marathon.svg',
    vrai_ou_fou: '/assets/modes/vrai-ou-fou.svg',
  }

  if (modeIcons[chapterId]) {
    return <img src={modeIcons[chapterId]} style={{ width: 40, height: 40, objectFit: 'contain' }} alt="" />
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
              quest: '/assets/modes/quest.svg',
              snack: '/assets/modes/snack.svg',
              flash: '/assets/modes/flash.svg',
              blitz: '/assets/modes/blitz.svg',
              marathon: '/assets/modes/marathon.svg',
              vrai_ou_fou: '/assets/modes/vrai-ou-fou.svg',
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
              <span style={{ fontSize: 22 }}>{renderIcon(chapter.emoji)}</span>
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
              {chapter.content.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2 rounded-2xl"
                  style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0, lineHeight: '1.6' }}>{renderIcon(item.icon)}</span>
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
              {['quest', 'snack', 'blitz', 'flash', 'energy'].includes(chapter.id) && (
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
