// ===== CATÉGORIES DISPONIBLES =====
const CATEGORIES = [
  'animaux', 'art', 'corps_humain', 'definition', 'gastronomie',
  'geographie', 'histoire', 'kids', 'lois_et_regles', 'phobies',
  'records', 'sante', 'sciences', 'sport', 'technologie'
]

const CATEGORY_LABELS = {
  animaux: 'Animaux', art: 'Art', corps_humain: 'Corps Humain',
  definition: 'Définition', gastronomie: 'Gastronomie', geographie: 'Géographie',
  histoire: 'Histoire', kids: 'Kids', lois_et_regles: 'Lois et Règles',
  phobies: 'Phobies', records: 'Records', sante: 'Santé',
  sciences: 'Sciences', sport: 'Sport', technologie: 'Technologie'
}

// Helpers
function countFactsByCategory(data, category) {
  return data.unlockedFactsByCategory?.[category] || 0
}

function isAllFactsInCategory(data, category) {
  const unlocked = data.unlockedFactsByCategory?.[category] || 0
  const total = data.totalFactsByCategory?.[category] || 999
  return unlocked >= total && unlocked > 0
}

// ===== TROPHÉES PAR CATÉGORIE (5 paliers × 15 catégories = 75 trophées) =====
const CATEGORY_TROPHIES = []
for (const cat of CATEGORIES) {
  const label = CATEGORY_LABELS[cat]
  CATEGORY_TROPHIES.push(
    { id: `cat_${cat}_5`, label: `Découvreur ${label}`, emoji: '🔰', section: 'categories', category: cat, description: `Débloque 5 f*cts dans ${label}`, condition: (data) => countFactsByCategory(data, cat) >= 5, target: 5, getCurrent: (data) => countFactsByCategory(data, cat) },
    { id: `cat_${cat}_10`, label: `Connaisseur ${label}`, emoji: '🥉', section: 'categories', category: cat, description: `Débloque 10 f*cts dans ${label}`, condition: (data) => countFactsByCategory(data, cat) >= 10, target: 10, getCurrent: (data) => countFactsByCategory(data, cat) },
    { id: `cat_${cat}_15`, label: `Expert ${label}`, emoji: '🥈', section: 'categories', category: cat, description: `Débloque 15 f*cts dans ${label}`, condition: (data) => countFactsByCategory(data, cat) >= 15, target: 15, getCurrent: (data) => countFactsByCategory(data, cat) },
    { id: `cat_${cat}_20`, label: `Maître ${label}`, emoji: '🥇', section: 'categories', category: cat, description: `Débloque 20 f*cts dans ${label}`, condition: (data) => countFactsByCategory(data, cat) >= 20, target: 20, getCurrent: (data) => countFactsByCategory(data, cat) },
    { id: `cat_${cat}_all`, label: `Légende ${label}`, emoji: '👑', section: 'categories', category: cat, description: `Débloque tous les f*cts dans ${label}`, condition: (data) => isAllFactsInCategory(data, cat), target: 'all', getCurrent: (data) => countFactsByCategory(data, cat) },
  )
}

// ===== TROPHÉES WTF! vs FUNNY (8 trophées) =====
const TYPE_TROPHIES = [
  { id: 'wtf_1', label: 'Premier WTF!', emoji: 'wtf-star', section: 'type', description: 'Débloque ton premier f*ct WTF!', condition: (data) => (data.vipCount || 0) >= 1, target: 1, getCurrent: (data) => data.vipCount || 0 },
  { id: 'wtf_10', label: 'Collectionneur WTF!', emoji: 'wtf-star', section: 'type', description: 'Débloque 10 f*cts WTF!', condition: (data) => (data.vipCount || 0) >= 10, target: 10, getCurrent: (data) => data.vipCount || 0 },
  { id: 'wtf_25', label: 'Chasseur WTF!', emoji: '💫', section: 'type', description: 'Débloque 25 f*cts WTF!', condition: (data) => (data.vipCount || 0) >= 25, target: 25, getCurrent: (data) => data.vipCount || 0 },
  { id: 'wtf_50', label: 'Roi des WTF!', emoji: '🏆', section: 'type', description: 'Débloque 50 f*cts WTF!', condition: (data) => (data.vipCount || 0) >= 50, target: 50, getCurrent: (data) => data.vipCount || 0 },
  { id: 'funny_1', label: 'Premier Funny', emoji: '🎭', section: 'type', description: 'Débloque ton premier Funny F*ct', condition: (data) => (data.funnyCount || 0) >= 1, target: 1, getCurrent: (data) => data.funnyCount || 0 },
  { id: 'funny_10', label: 'Fan de Funny', emoji: '😂', section: 'type', description: 'Débloque 10 Funny F*cts', condition: (data) => (data.funnyCount || 0) >= 10, target: 10, getCurrent: (data) => data.funnyCount || 0 },
  { id: 'funny_25', label: 'Expert Funny', emoji: '🤣', section: 'type', description: 'Débloque 25 Funny F*cts', condition: (data) => (data.funnyCount || 0) >= 25, target: 25, getCurrent: (data) => data.funnyCount || 0 },
  { id: 'funny_50', label: 'Maître Funny', emoji: '👏', section: 'type', description: 'Débloque 50 Funny F*cts', condition: (data) => (data.funnyCount || 0) >= 50, target: 50, getCurrent: (data) => data.funnyCount || 0 },
]

// ===== TROPHÉES PROGRESSION GLOBALE (5 trophées) =====
const GLOBAL_TROPHIES = [
  { id: 'premier_fact', label: 'Premier F*ct', emoji: '🎯', section: 'global', description: 'Débloque ton tout premier f*ct', condition: (data) => (data.unlockedFacts?.length || 0) >= 1, target: 1, getCurrent: (data) => data.unlockedFacts?.length || 0 },
  { id: 'curieux', label: 'Curieux', emoji: '🧠', section: 'global', description: 'Débloque 10 f*cts au total', condition: (data) => (data.unlockedFacts?.length || 0) >= 10, target: 10, getCurrent: (data) => data.unlockedFacts?.length || 0 },
  { id: 'passionne', label: 'Passionné', emoji: '🔥', section: 'global', description: 'Débloque 50 f*cts au total', condition: (data) => (data.unlockedFacts?.length || 0) >= 50, target: 50, getCurrent: (data) => data.unlockedFacts?.length || 0 },
  { id: 'collectionneur', label: 'Collectionneur', emoji: '💎', section: 'global', description: 'Débloque 100 f*cts au total', condition: (data) => (data.unlockedFacts?.length || 0) >= 100, target: 100, getCurrent: (data) => data.unlockedFacts?.length || 0 },
  { id: 'encyclopedie', label: 'Encyclopédie', emoji: '📚', section: 'global', description: 'Débloque 200 f*cts au total', condition: (data) => (data.unlockedFacts?.length || 0) >= 200, target: 200, getCurrent: (data) => data.unlockedFacts?.length || 0 },
]

// ===== TROPHÉES STREAK (3 trophées) =====
const STREAK_TROPHIES = [
  { id: 'serie_7', label: 'Série de 7', emoji: '⚡', section: 'streak', description: 'Maintiens une série de 7 jours consécutifs', condition: (data) => (data.bestStreak || 0) >= 7, target: 7, getCurrent: (data) => data.bestStreak || 0 },
  { id: 'serie_30', label: 'Série de 30', emoji: 'wtf-star', section: 'streak', description: 'Maintiens une série de 30 jours consécutifs', condition: (data) => (data.bestStreak || 0) >= 30, target: 30, getCurrent: (data) => data.bestStreak || 0 },
  { id: 'serie_100', label: 'Série de 100', emoji: '🏅', section: 'streak', description: 'Maintiens une série de 100 jours consécutifs', condition: (data) => (data.bestStreak || 0) >= 100, target: 100, getCurrent: (data) => data.bestStreak || 0 },
]

// ===== TROPHÉES BLITZ (5 trophées) =====
const BLITZ_TROPHIES = [
  { id: 'blitz_rookie', label: 'Blitz Rookie', emoji: '⏱️', section: 'blitz', description: 'Termine ta première partie Blitz', condition: (data) => (data.statsByMode?.blitz?.gamesPlayed || 0) >= 1, target: 1, getCurrent: (data) => data.statsByMode?.blitz?.gamesPlayed || 0 },
  { id: 'blitz_pro', label: 'Blitz Pro', emoji: '🚀', section: 'blitz', description: 'Finis un Blitz en moins de 30 secondes', condition: (data) => (data.bestBlitzTime || 999) <= 30 && data.bestBlitzTime > 0, target: 30, getCurrent: (data) => data.bestBlitzTime > 0 ? Math.max(0, 30 - data.bestBlitzTime) : 0, invertedProgress: true },
  { id: 'blitz_master', label: 'Blitz Master', emoji: '⚡', section: 'blitz', description: 'Finis un Blitz en moins de 20 secondes', condition: (data) => (data.bestBlitzTime || 999) <= 20 && data.bestBlitzTime > 0, target: 20, getCurrent: (data) => data.bestBlitzTime > 0 ? Math.max(0, 20 - data.bestBlitzTime) : 0, invertedProgress: true },
  { id: 'blitz_legend', label: 'Blitz Légende', emoji: '👑', section: 'blitz', description: 'Finis un Blitz en moins de 15 secondes', condition: (data) => (data.bestBlitzTime || 999) <= 15 && data.bestBlitzTime > 0, target: 15, getCurrent: (data) => data.bestBlitzTime > 0 ? Math.max(0, 15 - data.bestBlitzTime) : 0, invertedProgress: true },
  { id: 'blitz_perfect', label: 'Sans faute Blitz', emoji: '💯', section: 'blitz', description: 'Termine un Blitz sans aucune erreur', condition: (data) => (data.blitzPerfects || 0) >= 1, target: 1, getCurrent: (data) => data.blitzPerfects || 0 },
]

// ===== TROPHÉES PARTIES JOUÉES (4 trophées) =====
const GAMES_TROPHIES = [
  { id: 'debutant', label: 'Débutant', emoji: '🎮', section: 'games', description: 'Joue 10 parties', condition: (data) => (data.gamesPlayed || 0) >= 10, target: 10, getCurrent: (data) => data.gamesPlayed || 0 },
  { id: 'regulier', label: 'Régulier', emoji: '🕹️', section: 'games', description: 'Joue 50 parties', condition: (data) => (data.gamesPlayed || 0) >= 50, target: 50, getCurrent: (data) => data.gamesPlayed || 0 },
  { id: 'veteran', label: 'Vétéran', emoji: '🎖️', section: 'games', description: 'Joue 100 parties', condition: (data) => (data.gamesPlayed || 0) >= 100, target: 100, getCurrent: (data) => data.gamesPlayed || 0 },
  { id: 'legende_wtf', label: 'Légende WTF!', emoji: '🏆', section: 'games', description: 'Joue 500 parties', condition: (data) => (data.gamesPlayed || 0) >= 500, target: 500, getCurrent: (data) => data.gamesPlayed || 0 },
]

// ===== TROPHÉES SOCIAUX (4 trophées) =====
const SOCIAL_TROPHIES = [
  { id: 'premier_ami', label: 'Premier ami', emoji: '🤝', section: 'social', description: 'Ajoute ton premier ami', condition: (data) => (data.friendCount || 0) >= 1, target: 1, getCurrent: (data) => data.friendCount || 0 },
  { id: 'sociable', label: 'Sociable', emoji: '👥', section: 'social', description: 'Ajoute 5 amis', condition: (data) => (data.friendCount || 0) >= 5, target: 5, getCurrent: (data) => data.friendCount || 0 },
  { id: 'premier_defi', label: 'Premier défi', emoji: '🎯', section: 'social', description: 'Envoie ton premier défi', condition: (data) => (data.challengesSent || 0) >= 1, target: 1, getCurrent: (data) => data.challengesSent || 0 },
  { id: 'competiteur', label: 'Compétiteur', emoji: '⚔️', section: 'social', description: 'Envoie 10 défis', condition: (data) => (data.challengesSent || 0) >= 10, target: 10, getCurrent: (data) => data.challengesSent || 0 },
]

// ===== TROPHÉE PERFECT (1 trophée) =====
const PERFECT_TROPHIES = [
  { id: 'perfect', label: 'Perfect', emoji: '👑', section: 'perfect', description: 'Fais un score parfait en Quest', condition: (data) => (data.totalPerfects || 0) >= 1, target: 1, getCurrent: (data) => data.totalPerfects || 0 },
]

// ===== TOUT COMBINER =====
const ALL_TROPHIES = [
  ...GLOBAL_TROPHIES,
  ...TYPE_TROPHIES,
  ...CATEGORY_TROPHIES,
  ...STREAK_TROPHIES,
  ...BLITZ_TROPHIES,
  ...GAMES_TROPHIES,
  ...SOCIAL_TROPHIES,
  ...PERFECT_TROPHIES,
]

// ===== SECTIONS POUR L'AFFICHAGE =====
const TROPHY_SECTIONS = [
  { id: 'global', label: '🌍 Progression', trophies: GLOBAL_TROPHIES },
  { id: 'type', label: 'WTF! & Funny', trophies: TYPE_TROPHIES },
  { id: 'categories', label: '📂 Par catégorie', trophies: CATEGORY_TROPHIES },
  { id: 'streak', label: '🔥 Séries', trophies: STREAK_TROPHIES },
  { id: 'blitz', label: '⚡ Blitz', trophies: BLITZ_TROPHIES },
  { id: 'games', label: '🎮 Parties', trophies: GAMES_TROPHIES },
  { id: 'social', label: '👥 Social', trophies: SOCIAL_TROPHIES },
  { id: 'perfect', label: '👑 Perfect', trophies: PERFECT_TROPHIES },
]

// ===== FONCTIONS EXPORTÉES =====

export function checkBadges() {
  const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')
  const earned = [...(wtfData.badgesEarned || [])]
  const newBadges = []

  for (const trophy of ALL_TROPHIES) {
    if (!earned.includes(trophy.id) && trophy.condition(wtfData)) {
      newBadges.push(trophy)
      earned.push(trophy.id)
    }
  }

  if (newBadges.length > 0) {
    wtfData.badgesEarned = earned
    wtfData.lastModified = Date.now()
    localStorage.setItem('wtf_data', JSON.stringify(wtfData))
  }

  return newBadges
}

export function getNextBadge() {
  const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')
  const earned = wtfData.badgesEarned || []

  const next = ALL_TROPHIES.find(t => !earned.includes(t.id))
  if (!next) return null

  const current = next.getCurrent(wtfData)
  const target = next.target === 'all' ? (wtfData.totalFactsByCategory?.[next.category] || 20) : next.target

  return {
    badge: next,
    current: Math.min(current, target),
    target,
    progress: Math.min(100, Math.round((current / target) * 100)),
  }
}

export function getAllBadges() {
  const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')
  const earned = wtfData.badgesEarned || []
  return ALL_TROPHIES.map(t => ({ ...t, earned: earned.includes(t.id) }))
}

export function getTrophySections() {
  const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')
  const earned = wtfData.badgesEarned || []

  return TROPHY_SECTIONS.map(section => ({
    ...section,
    trophies: section.trophies.map(t => ({
      ...t,
      earned: earned.includes(t.id),
      current: t.getCurrent(wtfData),
      target: t.target === 'all' ? (wtfData.totalFactsByCategory?.[t.category] || 20) : t.target,
    })),
    earnedCount: section.trophies.filter(t => earned.includes(t.id)).length,
    totalCount: section.trophies.length,
  }))
}

export { ALL_TROPHIES, TROPHY_SECTIONS, CATEGORIES, CATEGORY_LABELS }
