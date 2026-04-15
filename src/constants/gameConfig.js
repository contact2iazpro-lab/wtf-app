// ── Difficulty Levels Configuration — 6 modes officiels (CLAUDE.md 15/04/2026)
// Snack · Vrai ou Fou · Quest · Marathon · Blitz · Flash
// Économie ×10 appliquée.

export const DIFFICULTY_LEVELS = {
  SNACK: {
    id: 'snack', label: 'Snack', emoji: '🎯',
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
  MARATHON: {
    id: 'marathon', label: 'Marathon', emoji: '🏃',
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
  MARATHON: 'marathon',
}

// ── Mode launch configs (rules displayed before each mode)
export const MODE_CONFIGS = {
  snack: {
    modeId: 'snack', modeName: 'Snack', subtitle: 'Le quotidien sans prise de tête', emoji: '🎯', color: '#FFD700',
    rules: [
      { icon: '🔋', text: 'Coût : 1 Capsule d\'énergie' },
      { icon: '📋', text: 'Set : 5 questions/set' },
      { icon: '🔢', text: 'QCM : 2/question' },
      { icon: '⏱️', text: 'Timer : 15s/question' },
      { icon: '🪙', text: 'Gains : 10 WTFCoins/bonne réponse' },
      { icon: '🎁', text: 'Perfect : +50 WTFCoins' },
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
      { icon: '🔋', text: 'Coût : 1 énergie par bloc' },
      { icon: '📋', text: 'Bloc : 10 Funny + 1 boss VIP' },
      { icon: '🔢', text: 'QCM : 4/question' },
      { icon: '⏱️', text: 'Timer : 20s/question' },
      { icon: '💡', text: 'Indices : 2/question' },
      { icon: '👑', text: 'Boss débloqué : 5/10 bonnes réponses' },
      { icon: '🪙', text: 'Gains : 20 WTFCoins/bonne · +100 WTFCoins/boss' },
    ],
  },
  marathon: {
    modeId: 'marathon', modeName: 'Marathon', subtitle: 'Zéro droit à l\'erreur', emoji: '🏃', color: '#E84535',
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
      { icon: '⏱️', text: 'Chrono 60s · 2 QCM · Pas d\'indices' },
      { icon: '❌', text: 'Mauvaise réponse = +5 secondes de pénalité' },
      { icon: '🪙', text: 'Blitz Solo gratuit · Blitz Défi 200 coins pour créer' },
      { icon: '🎯', text: 'Choisis entre 5, 10, 20, 30, 50 ou 100 questions' },
    ],
  },
  flash: {
    modeId: 'flash', modeName: 'Flash', subtitle: 'Le rendez-vous quotidien', emoji: '🔥', color: '#E91E63',
    rules: [
      { icon: '🆓', text: 'Gratuit — 1 fois par jour' },
      { icon: '⚡', text: '5 questions · 2 QCM · 15s' },
      { icon: '🎯', text: 'Lun-Sam : thème du jour · Dim : VIP Hunt de la semaine' },
      { icon: '🪙', text: '30 coins fixe en semaine · 1 VIP débloqué le dimanche' },
    ],
  },
}

// ── Nombre de questions par session
export const QUESTIONS_PER_GAME = 5

// ── Énergie Snack — modèle stock+régen (T91, 2026-04-12)
// Stock persistant max 5, régénération +1 toutes les 8h jusqu'au cap de 5.
export const SNACK_ENERGY = {
  INITIAL_STOCK: 5,
  MAX_STOCK: 5,
  REGEN_HOURS: 8,
  REGEN_MS: 8 * 60 * 60 * 1000,
  EXTRA_SESSION_COST: 75,
  FREE_SESSIONS_PER_DAY: 5,
}

// ── Paliers de récompenses fidélité Streak
export function getStreakReward(streakDays) {
  if (streakDays === 1)  return { coins: 2,  hints: 0, badge: false }
  if (streakDays === 3)  return { coins: 0,  hints: 2, badge: false }
  if (streakDays === 7)  return { coins: 35, hints: 0, badge: true  }
  if (streakDays === 14) return { coins: 25, hints: 3, badge: false }
  if (streakDays === 30) return { coins: 0,  hints: 0, badge: false, special: 'wtf_premium' }
  return null
}

// ── Tutorial Configs (isolated, used by TutoTunnel)
export const TUTO_SNACK_CONFIG = {
  id: 'tuto_snack', label: 'Tutoriel', emoji: '🎯',
  choices: 2, duration: 20,
  hintsAllowed: true, freeHints: 0, paidHints: 2, hintCost: 0,
  coinsPerCorrect: 2, questionsCount: 5, scoring: { correct: 5, wrong: 0 },
}

export const TUTO_FACT_IDS = [189, 127, 61, 92, 350, 6, 10, 109, 301, 45, 174]
