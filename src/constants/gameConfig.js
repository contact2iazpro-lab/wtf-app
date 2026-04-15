// ── Difficulty Levels Configuration
// Centralized configuration for all difficulty modes.
// 1e — Snack fusionne ex-Flash + ex-Explorer ; Flash = ex-Flash+Flash (1/jour).

export const DIFFICULTY_LEVELS = {
  SNACK: {
    id: 'snack', label: 'Snack', emoji: '🎯',
    choices: 2, duration: 15,
    hintsAllowed: true, freeHints: 2, paidHints: 0, hintCost: 0,
    coinsPerCorrect: 10, scoring: { correct: 10, wrong: 0 },
  },
  FLASH: {
    id: 'flash', label: 'Flash', emoji: '🔥',
    choices: 2, duration: 15,
    hintsAllowed: true, freeHints: 0, paidHints: 0, hintCost: 0,
    coinsPerCorrect: 6, scoring: { correct: 6, wrong: 0 },
  },
  BLITZ: {
    id: 'blitz', label: 'Blitz', emoji: '⚡',
    choices: 2, duration: 60,
    hintsAllowed: false, freeHints: 0, paidHints: 0, hintCost: 0,
    coinsPerCorrect: 0, scoring: { correct: 0, wrong: 0 },
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
  DUEL_SETUP: 'duel_setup',
  DUEL_PASS: 'duel_pass',
  DUEL_RESULTS: 'duel_results',
  BLITZ: 'blitz',
  BLITZ_RESULTS: 'blitz_results',
  BLITZ_LOBBY: 'blitz_lobby',
  MODE_LAUNCH: 'mode_launch',
  FLASH: 'flash',
  QUEST: 'quest',
}

// ── Mode launch configs (rules displayed before each mode)
export const MODE_CONFIGS = {
  blitz: {
    modeId: 'blitz', modeName: 'Blitz', subtitle: 'Bats ton record de vitesse !', emoji: '⚡', color: '#FF4444',
    rules: [
      { icon: '⏱️', text: 'Réponds le plus vite possible à tes f*cts débloqués' },
      { icon: '❌', text: 'Mauvaise réponse = +5 secondes de pénalité' },
      { icon: '🚫', text: 'Pas d\'indices — c\'est la mémoire pure' },
      { icon: '🏆', text: 'Bats ton record de vitesse' },
      { icon: '🆓', text: 'Gratuit et illimité' },
      { icon: '🎯', text: 'Choisis entre 5, 10, 20, 30, 50 ou 100 questions' },
    ],
  },
  snack: {
    modeId: 'snack', modeName: 'Snack', subtitle: 'Partie rapide, gratuite', emoji: '🎯', color: '#FFD700',
    rules: [
      { icon: '🔋', text: '1 énergie par session (régén 8h, cap 5)' },
      { icon: '⚡', text: '5 questions · 2 QCM · 15s' },
      { icon: '🪙', text: '10 coins par bonne réponse · Perfect = +50 coins' },
      { icon: '📂', text: 'Catégorie au choix (5 gratuites + déblocables)' },
    ],
  },
  flash: {
    modeId: 'flash', modeName: 'Flash', subtitle: 'Le défi du jour !', emoji: '🔥', color: '#E91E63',
    rules: [
      { icon: '🆓', text: 'Gratuit — 1 fois par jour' },
      { icon: '⚡', text: '5 questions · 2 QCM · 15s' },
      { icon: '🎯', text: 'Lun-Sam : thème du jour · Dim : WTF! VIP de la semaine' },
      { icon: '🪙', text: '30 coins en semaine · 1 VIP débloqué le dimanche' },
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
  EXTRA_SESSION_COST: 10,
  FREE_SESSIONS_PER_DAY: 3,
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
