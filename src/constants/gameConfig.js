// ── Difficulty Levels Configuration — 6 modes officiels (CLAUDE.md 15/04/2026)
// Quickie · Vrai ou Fou · Quest · No Limit · Blitz · Flash
// Économie ×10 appliquée.

export const DIFFICULTY_LEVELS = {
  QUICKIE: {
    id: 'quickie', label: 'Quickie', emoji: '🎯',
    choices: 2, duration: 15, questionsCount: 5,
    hintsAllowed: true, freeHints: 0, paidHints: 1, hintCost: 50,
    coinsPerCorrect: 10, perfectBonus: 50,
    scoring: { correct: 10, wrong: 0 },
  },
  VRAI_OU_FOU: {
    id: 'vrai_ou_fou', label: 'Vrai ou Fou', emoji: '🤔',
    choices: 0, duration: 0, questionsCount: 20,
    hintsAllowed: false, freeHints: 0, paidHints: 0, hintCost: 0,
    coinsPerCorrect: 0, perfectBonus: 0,
    scoring: { correct: 0, wrong: 0 },
    swipe: true,
  },
  QUEST: {
    id: 'quest', label: 'Quest', emoji: '🗺️',
    choices: 4, duration: 20, questionsCount: 10,
    hintsAllowed: true, freeHints: 2, paidHints: 0, hintCost: 0,
    coinsPerCorrect: 20, bossBonus: 100, perfectBonus: 0,
    scoring: { correct: 20, wrong: 0 },
  },
  NO_LIMIT: {
    id: 'no_limit', label: 'No Limit', emoji: '♾️',
    choices: 4, duration: 0, questionsCount: Infinity,
    hintsAllowed: false, freeHints: 0, paidHints: 0, hintCost: 0,
    coinsPerCorrect: 0, perfectBonus: 0,
    scoring: { correct: 0, wrong: 0 },
  },
  BLITZ: {
    id: 'blitz', label: 'Blitz', emoji: '⚡',
    choices: 2, duration: 60,
    hintsAllowed: false, freeHints: 0, paidHints: 0, hintCost: 0,
    coinsPerCorrect: 0, perfectBonus: 0,
    scoring: { correct: 0, wrong: 0 },
    // Sous-modes Blitz (spec 15/04/2026) :
    // - solo : chrono 60s DESCENDANT, pas de pénalité erreur, score = bonnes réponses
    // - defi : chrono MONTANT, +5s pénalité erreur, score = temps final (le plus bas gagne)
    soloDuration: 60,
    defiWrongPenalty: 5,
    defiCost: 200, // coins pour créer un défi
    soloMinUnlocked: 20,
  },
  FLASH: {
    id: 'flash', label: 'Flash', emoji: '🔥',
    choices: 2, duration: 15, questionsCount: 5,
    hintsAllowed: true, freeHints: 0, paidHints: 0, hintCost: 0,
    coinsPerCorrect: 0, flashDailyCoins: 30, perfectBonus: 0,
    scoring: { correct: 0, wrong: 0 },
  },
}

// ── Screens (state machine)
export const SCREENS = {
  HOME: 'home',
  WTF_TEASER: 'wtf_teaser',
  WTF_REVEAL: 'wtf_reveal',
  CATEGORY: 'category',
  QUESTION: 'question',
  REVELATION: 'revelation',
  RESULTS: 'results',
  BLITZ: 'blitz',
  BLITZ_RESULTS: 'blitz_results',
  BLITZ_LOBBY: 'blitz_lobby',
  MODE_LAUNCH: 'mode_launch',
  FLASH: 'flash',
  QUEST: 'quest',
  VRAI_OU_FOU: 'vrai_ou_fou',
  NO_LIMIT: 'no_limit',
}

// ── Mode launch configs (rules displayed before each mode)
export const MODE_CONFIGS = {
  quickie: {
    modeId: 'quickie', modeName: 'Quickie', subtitle: 'Court. Bon. Sans engagement.', emoji: '🍸', icon: '/assets/modes/quickie.png?v=2', color: '#7F77DD',
    rules: [
      { icon: 'icon:energy', text: 'Coût : 1 énergie' },
      { icon: 'icon:set', text: 'Set : 5 questions/set' },
      { icon: 'icon:qcm', text: 'QCM : 2/question' },
      { icon: 'icon:timer', text: 'Timer : 15s/question' },
      { icon: '💡', text: 'Indices : 1 max/question' },
      { icon: '🪙', text: 'Gains : 10 Coins/bonne réponse' },
      { icon: 'icon:perfect', text: 'Perfect (5/5) : +50 Coins' },
    ],
  },
  vrai_ou_fou: {
    modeId: 'vrai_ou_fou', modeName: 'Vrai ou Fou', subtitle: 'Swipe ou pas Swipe ?', emoji: '🤔', color: '#9B59B6',
    rules: [
      { icon: '🆓', text: 'Coût : Gratuit et illimité' },
      { icon: '📋', text: 'Set : 20 manches' },
      { icon: '👯', text: 'Format : 2 affirmations' },
      { icon: '👉', text: 'Swipe du bon côté' },
      { icon: '⏱️', text: 'Timer : aucun' },
    ],
  },
  quest: {
    modeId: 'quest', modeName: 'Quest', subtitle: 'Le chemin des WTF!', emoji: '🗺️', color: '#FF6B1A',
    rules: [
      { icon: 'icon:energy', text: 'Coût : 1 énergie par bloc' },
      { icon: 'icon:set', text: 'Bloc : 10 Funny + 1 boss VIP' },
      { icon: 'icon:qcm', text: 'QCM : 4/question' },
      { icon: 'icon:timer', text: 'Timer : 20s/question' },
      { icon: '💡', text: 'Indices : 2/question' },
      { icon: '👑', text: 'Boss débloqué : 5/10 bonnes réponses' },
      { icon: '🪙', text: 'Gains : 20 WTFCoins/bonne · +100 WTFCoins/boss' },
    ],
  },
  no_limit: {
    modeId: 'no_limit', modeName: 'No Limit', subtitle: 'Zéro droit à l\'erreur', emoji: '♾️', color: '#E84535',
    rules: [
      { icon: '∞', text: 'Questions illimitées jusqu\'à la 1ʳᵉ erreur' },
      { icon: '🧠', text: '4 QCM · Pas de timer · Pas d\'indices' },
      { icon: '🆓', text: 'Gratuit et illimité' },
      { icon: '🏆', text: 'Mode prestige · 0 coins · Bats ton record de série' },
    ],
  },
  blitz: {
    modeId: 'blitz', modeName: 'Blitz', subtitle: 'Défie tes potes', emoji: '⚡', color: '#FF4444',
    rules: [
      { icon: 'icon:timer', text: 'Chrono 60s · 2 QCM · Pas d\'indices' },
      { icon: '❌', text: 'Mauvaise réponse = +5 secondes de pénalité' },
      { icon: '🪙', text: 'Blitz Solo gratuit · Blitz Défi 200 coins pour créer' },
      { icon: '🎯', text: 'Choisis entre 5, 10, 20, 30, 50 ou 100 questions' },
    ],
  },
  flash: {
    modeId: 'flash', modeName: 'Flash', subtitle: 'Le rendez-vous quotidien', emoji: '🔥', color: '#E91E63',
    rules: [
      { icon: '🆓', text: 'Gratuit — 1 fois par jour' },
      { icon: 'icon:timer', text: '5 questions · 2 QCM · 15s' },
      { icon: '🎯', text: 'Lun-Sam : thème du jour · Dim : VIP Hunt de la semaine' },
      { icon: '🪙', text: '30 coins fixe en semaine · 1 VIP débloqué le dimanche' },
    ],
  },
}

// ── Nombre de questions par session
export const QUESTIONS_PER_GAME = 5

// ── Énergie Quickie — modèle stock+régen (T91, 2026-04-12)
// Stock persistant max 5, régénération +1 toutes les 8h jusqu'au cap de 5.
export const QUICKIE_ENERGY = {
  INITIAL_STOCK: 5,
  MAX_STOCK: 5,
  REGEN_HOURS: 8,
  REGEN_MS: 8 * 60 * 60 * 1000,
  EXTRA_SESSION_COST: 75,
  FREE_SESSIONS_PER_DAY: 5,
}

// ── Paliers Streak/Coffres fusionnés (décision 16/04/2026 Option B)
// Pas de J1 (redondant avec Flash quotidien). 4 paliers nommés.
export const STREAK_PALIERS = [
  { day: 3,  name: 'Débutant', coins: 75,   hints: 0, badge: false, special: null },
  { day: 7,  name: 'Habitué',  coins: 200,  hints: 2, badge: true,  special: null },
  { day: 14, name: 'Fidèle',   coins: 500,  hints: 0, badge: true,  special: null },
  { day: 30, name: 'Légende',  coins: 1000, hints: 0, badge: true,  special: 'wtf_premium' },
]

export function getStreakReward(streakDays) {
  const palier = STREAK_PALIERS.find(p => p.day === streakDays)
  return palier ? { coins: palier.coins, hints: palier.hints, badge: palier.badge, special: palier.special } : null
}

// ── Tutorial Configs (isolated, used by TutoTunnel)
export const TUTO_QUICKIE_CONFIG = {
  id: 'tuto_quickie', label: 'Tutoriel', emoji: '🎯',
  choices: 2, duration: 20,
  hintsAllowed: true, freeHints: 0, paidHints: 2, hintCost: 0,
  coinsPerCorrect: 2, questionsCount: 5, scoring: { correct: 5, wrong: 0 },
}

export const TUTO_FACT_IDS = [189, 127, 61, 92, 350, 6, 10, 109, 301, 45, 174]
