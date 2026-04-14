// ── Difficulty Levels Configuration
// Centralized configuration for all difficulty modes

export const DIFFICULTY_LEVELS = {
  COOL: {
    id: 'cool', label: 'Cool', emoji: '❄️',
    choices: 2, duration: 20,
    hintsAllowed: true, freeHints: 2, paidHints: 1, hintCost: 8,
    coinsPerCorrect: 2, scoring: { correct: 2, wrong: 0 },
  },
  HOT: {
    id: 'hot', label: 'Hot', emoji: '🔥',
    choices: 4, duration: 30,
    hintsAllowed: true, freeHints: 2, paidHints: 1, hintCost: 8,
    coinsPerCorrect: 2, scoring: { correct: 2, wrong: 0 },
  },
  // WTF! retiré de Quest (2026-04-12) — gardé en legacy pour compat
  // avec d'éventuels facts difficulty='wtf' en base. Pas affiché en UI.
  WTF: {
    id: 'wtf', label: 'WTF!', emoji: '⚡',
    choices: 6, duration: 20,
    hintsAllowed: true, freeHints: 1, paidHints: 1, hintCost: 8,
    coinsPerCorrect: 1, scoring: { correct: 1, wrong: 0 },
  },
  FLASH: {
    id: 'flash', label: 'Standard', emoji: '🎯',
    choices: 4, duration: 20,
    hintsAllowed: true, freeHints: 2, paidHints: 0, hintCost: 0,
    coinsPerCorrect: 2, scoring: { correct: 2, wrong: 0 },
  },
  // Explorer : comme Flash mais catégorie imposée → seulement 1 coin/correct
  // (CLAUDE.md §Mode Explorer)
  EXPLORER: {
    id: 'explorer', label: 'Explorer', emoji: '🧭',
    choices: 4, duration: 20,
    hintsAllowed: true, freeHints: 2, paidHints: 0, hintCost: 0,
    coinsPerCorrect: 1, scoring: { correct: 1, wrong: 0 },
  },
  HUNT: {
    id: 'hunt', label: 'Hunt', emoji: '🔥',
    choices: 4, duration: 20,
    hintsAllowed: true, freeHints: 2, paidHints: 0, hintCost: 0,
    coinsPerCorrect: 2, scoring: { correct: 2, wrong: 0 },
  },
  BLITZ: {
    id: 'blitz', label: 'Blitz', emoji: '⚡',
    choices: 4, duration: 60,
    hintsAllowed: false, freeHints: 0, paidHints: 0, hintCost: 0,
    coinsPerCorrect: 0, scoring: { correct: 0, wrong: 0 },
  },
}

// ── Screens (state machine)
export const SCREENS = {
  HOME: 'home',
  WTF_TEASER: 'wtf_teaser',
  WTF_REVEAL: 'wtf_reveal',
  DIFFICULTY: 'difficulty',
  CATEGORY: 'category',
  QUESTION: 'question',
  REVELATION: 'revelation',
  RESULTS: 'results',
  DUEL_SETUP: 'duel_setup',
  DUEL_PASS: 'duel_pass',
  DUEL_RESULTS: 'duel_results',
  EXPLORER_RESULTS: 'explorer_results',
  BLITZ: 'blitz',
  BLITZ_RESULTS: 'blitz_results',
  BLITZ_LOBBY: 'blitz_lobby',
  MODE_LAUNCH: 'mode_launch',
  PUZZLE_DU_JOUR: 'puzzle_du_jour',
  ROUTE: 'route',
}

// ── Mode launch configs (rules displayed before each mode)
export const MODE_CONFIGS = {
  quest: {
    modeId: 'quest', modeName: 'Quest', subtitle: 'Débloque les f*cts les plus rares', emoji: '⭐', color: '#FF6B1A',
    rules: [
      { icon: '🎫', text: '1 ticket (25 coins) par session' },
      { icon: '❄️', text: `Cool : ${DIFFICULTY_LEVELS.COOL.choices} choix · ${DIFFICULTY_LEVELS.COOL.freeHints} indices · ${DIFFICULTY_LEVELS.COOL.duration}s · ${DIFFICULTY_LEVELS.COOL.coinsPerCorrect} coins` },
      { icon: '🔥', text: `Hot : ${DIFFICULTY_LEVELS.HOT.choices} choix · ${DIFFICULTY_LEVELS.HOT.freeHints} indices · ${DIFFICULTY_LEVELS.HOT.duration}s · ${DIFFICULTY_LEVELS.HOT.coinsPerCorrect} coins` },
      { icon: '📚', text: '5 questions — les f*cts trouvés vont dans ta Collection' },
    ],
  },
  blitz: {
    modeId: 'blitz', modeName: 'Blitz', subtitle: 'Bats ton record de vitesse !', emoji: '⚡', color: '#FF4444',
    rules: [
      { icon: '⏱️', text: 'Réponds le plus vite possible à tes f*cts débloqués' },
      { icon: '❌', text: 'Mauvaise réponse = +3 secondes de pénalité' },
      { icon: '🚫', text: 'Pas d\'indices — c\'est la mémoire pure' },
      { icon: '🏆', text: 'Bats ton record de vitesse' },
      { icon: '🆓', text: 'Gratuit et illimité' },
      { icon: '🎯', text: 'Choisis entre 5, 10, 20, 30, 40 ou 50 questions' },
    ],
  },
  flash: {
    modeId: 'flash', modeName: 'Flash', subtitle: 'Partie rapide, gratuite', emoji: '🎯', color: '#FFD700',
    rules: [
      { icon: '🔋', text: '3 sessions gratuites par jour' },
      { icon: '⚡', text: '5 questions · 4 QCM · 20s' },
      { icon: '💡', text: `${DIFFICULTY_LEVELS.FLASH.freeHints} indices (stock gratuit)` },
      { icon: '🎲', text: `Aléatoire : ${DIFFICULTY_LEVELS.FLASH.coinsPerCorrect} coins par bonne réponse` },
      { icon: '📂', text: 'Catégorie choisie : 1 coin par bonne réponse' },
    ],
  },
  hunt: {
    modeId: 'hunt', modeName: 'Hunt', subtitle: 'Le WTF! de la semaine !', emoji: '🔥', color: '#E91E63',
    rules: [
      { icon: '🆓', text: 'Gratuit — 1 fois par semaine (dimanche)' },
      { icon: '🎯', text: 'Un f*ct WTF! spécial à découvrir chaque semaine' },
      { icon: '⚡', text: '5 questions · 4 QCM · 20s' },
      { icon: '💡', text: `${DIFFICULTY_LEVELS.HUNT.freeHints} indices (stock gratuit)` },
    ],
  },
  explorer: {
    modeId: 'explorer', modeName: 'Explorer', subtitle: 'Explore une catégorie', emoji: '🧭', color: '#6BCB77',
    rules: [
      { icon: '🔋', text: '3 sessions gratuites par jour (partagé avec Jouer)' },
      { icon: '📂', text: 'Choisis une catégorie — 5 questions dedans' },
      { icon: '⚡', text: '4 QCM · 20s par question' },
      { icon: '💡', text: `${DIFFICULTY_LEVELS.HOT.freeHints} indices (stock gratuit)` },
      { icon: '🎯', text: '1 coin/bonne réponse' },
    ],
  },
}

// ── Nombre de questions par session
export const QUESTIONS_PER_GAME = 5

// ── Énergie Flash/Explorer — modèle stock+régen (T91, 2026-04-12)
// Stock persistant max 5, régénération +1 toutes les 8h jusqu'au cap de 5.
// L'achat en boutique permet d'aller jusqu'au cap mais pas au-delà.
// Un joueur qui dépasse le cap (via achat au-dessus) ne régénère plus jusqu'à
// redescendre sous le cap.
export const FLASH_ENERGY = {
  INITIAL_STOCK: 5,           // nouveau joueur à la création (C10 — 14/04/2026, plein cap)
  MAX_STOCK: 5,               // cap soft pour régén
  REGEN_HOURS: 8,             // 1 énergie régénérée toutes les 8h
  REGEN_MS: 8 * 60 * 60 * 1000,
  EXTRA_SESSION_COST: 10,     // coins (legacy, à revoir en T95)
  // Clé legacy conservée pour retro-compat dans le code qui la référence encore
  FREE_SESSIONS_PER_DAY: 3,
}

// ── Paliers de récompenses fidélité Streak
export function getStreakReward(streakDays) {
  if (streakDays === 1)  return { coins: 2,  tickets: 0, hints: 0, badge: false }
  if (streakDays === 3)  return { coins: 0,  tickets: 0, hints: 2, badge: false }
  if (streakDays === 7)  return { coins: 10, tickets: 1, hints: 0, badge: true  }
  if (streakDays === 14) return { coins: 0,  tickets: 1, hints: 3, badge: false }
  if (streakDays === 30) return { coins: 0,  tickets: 0, hints: 0, badge: false, special: 'wtf_premium' }
  return null
}

// ── Tutorial Configs (isolated, used by TutoTunnel)
export const TUTO_FLASH_CONFIG = {
  id: 'tuto_flash', label: 'Tutoriel', emoji: '🎯',
  choices: 2, duration: 20,
  hintsAllowed: true, freeHints: 0, paidHints: 2, hintCost: 0,
  coinsPerCorrect: 2, questionsCount: 5, scoring: { correct: 5, wrong: 0 },
}

export const TUTO_QUEST_CONFIG = {
  id: 'tuto_quest', label: 'Tutoriel Quest', emoji: '🎯',
  choices: 2, duration: 30,
  hintsAllowed: true, freeHints: 0, paidHints: 2, hintCost: 0,
  coinsPerCorrect: 2, questionsCount: 5, scoring: { correct: 5, wrong: 0 },
}

export const TUTO_FACT_IDS = [189, 127, 61, 92, 350, 6, 10, 109, 301, 45, 174]
