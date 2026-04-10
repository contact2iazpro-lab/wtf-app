// ── Difficulty Levels Configuration
// Centralized configuration for all difficulty modes

export const DIFFICULTY_LEVELS = {
  COOL: {
    id: 'cool', label: 'Cool', emoji: '❄️',
    choices: 2, duration: 30,
    hintsAllowed: true, freeHints: 0, paidHints: 2, hintCost: 0,
    coinsPerCorrect: 2, scoring: { correct: 5, wrong: 0 },
  },
  HOT: {
    id: 'hot', label: 'Hot', emoji: '🔥',
    choices: 4, duration: 20,
    hintsAllowed: true, freeHints: 0, paidHints: 2, hintCost: 0,
    coinsPerCorrect: 2, scoring: { correct: 3, wrong: 0 },
  },
  WTF: {
    id: 'wtf', label: 'WTF!', emoji: '⚡',
    choices: 6, duration: 20,
    hintsAllowed: true, freeHints: 0, paidHints: 1, hintCost: 0,
    coinsPerCorrect: 1, scoring: { correct: 2, wrong: 0 },
  },
  FLASH: {
    id: 'flash', label: 'Flash', emoji: '⚡',
    choices: 4, duration: 20,
    hintsAllowed: true, freeHints: 0, paidHints: 2, hintCost: 0,
    coinsPerCorrect: 2, scoring: { correct: 5, wrong: 0 },
  },
  HUNT: {
    id: 'hunt', label: 'Hunt', emoji: '🔥',
    choices: 4, duration: 20,
    hintsAllowed: true, freeHints: 0, paidHints: 2, hintCost: 0,
    scoring: { correct: [5, 3, 2], wrong: 0 },
  },
  BLITZ: {
    id: 'blitz', label: 'Blitz', emoji: '⚡',
    choices: 4, duration: 60,
    hintsAllowed: true, freeHints: 0, paidHints: 2, hintCost: 0,
    coinsPerCorrect: 0, scoring: { correct: 1, wrong: 0 },
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
  MARATHON_RESULTS: 'marathon_results',
  BLITZ: 'blitz',
  BLITZ_RESULTS: 'blitz_results',
  BLITZ_LOBBY: 'blitz_lobby',
  MODE_LAUNCH: 'mode_launch',
}

// ── Mode launch configs (rules displayed before each mode)
export const MODE_CONFIGS = {
  quest: {
    modeId: 'quest', modeName: 'Quest', subtitle: 'Débloque les f*cts les plus rares', emoji: '⭐', color: '#FF6B1A',
    rules: [
      { icon: '🎫', text: '1 ticket (25 coins) par session' },
      { icon: '❄️', text: `Cool : ${DIFFICULTY_LEVELS.COOL.choices} choix · ${DIFFICULTY_LEVELS.COOL.paidHints} indices · ${DIFFICULTY_LEVELS.COOL.duration}s · ${DIFFICULTY_LEVELS.COOL.coinsPerCorrect} coins` },
      { icon: '🔥', text: `Hot : ${DIFFICULTY_LEVELS.HOT.choices} choix · ${DIFFICULTY_LEVELS.HOT.paidHints} indices · ${DIFFICULTY_LEVELS.HOT.duration}s · ${DIFFICULTY_LEVELS.HOT.coinsPerCorrect} coin${DIFFICULTY_LEVELS.HOT.coinsPerCorrect > 1 ? 's' : ''}` },
      { icon: '⚡', text: `WTF! : ${DIFFICULTY_LEVELS.WTF.choices} choix · ${DIFFICULTY_LEVELS.WTF.paidHints} indice · ${DIFFICULTY_LEVELS.WTF.duration}s · ${DIFFICULTY_LEVELS.WTF.coinsPerCorrect} coin` },
      { icon: '📚', text: '5 questions — les f*cts trouvés vont dans ta Collection' },
      { icon: '🏆', text: 'Score parfait = 10 coins bonus + 1 ticket !' },
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
    modeId: 'flash', modeName: 'Jouer', subtitle: 'Partie rapide, gratuite', emoji: '🎯', color: '#FFD700',
    rules: [
      { icon: '🆓', text: 'Gratuit — joue autant que tu veux' },
      { icon: '⚡', text: '5 questions' },
      { icon: '⏱️', text: `${DIFFICULTY_LEVELS.FLASH.duration} secondes par question` },
      { icon: '💡', text: `${DIFFICULTY_LEVELS.FLASH.paidHints} indices disponibles` },
      { icon: '🎲', text: 'Aléatoire : 2 coins par bonne réponse' },
      { icon: '📂', text: 'Catégorie choisie : 1 coin par bonne réponse' },
    ],
  },
  hunt: {
    modeId: 'hunt', modeName: 'Hunt', subtitle: 'Le WTF! du jour !', emoji: '🔥', color: '#E91E63',
    rules: [
      { icon: '🆓', text: 'Gratuit — pas de ticket requis' },
      { icon: '🎯', text: 'Un f*ct WTF! spécial à découvrir chaque jour' },
      { icon: '⏱️', text: `${DIFFICULTY_LEVELS.HUNT.duration} secondes par question` },
      { icon: '📚', text: '5 questions pour le débloquer' },
      { icon: '💡', text: `${DIFFICULTY_LEVELS.HUNT.paidHints} indices disponibles par question` },
      { icon: '📅', text: 'Reviens chaque jour pour un nouveau WTF!' },
    ],
  },
  explorer: {
    modeId: 'explorer', modeName: 'Explorer', subtitle: 'Découvre de nouveaux f*cts', emoji: '🟢', color: '#22C55E',
    rules: [
      { icon: '🆓', text: 'Gratuit et illimité — pas de ticket requis' },
      { icon: '⚡', text: 'Session de 5 questions' },
      { icon: '🎯', text: `Mode Aléatoire : ${DIFFICULTY_LEVELS.FLASH.coinsPerCorrect} coins/bonne réponse` },
      { icon: '🗂️', text: 'Mode Catégorie : 1 coin/bonne réponse' },
      { icon: '💡', text: '2 indices gratuits par question · 4 QCM · 30s' },
    ],
  },
}

// ── Nombre de questions par session
export const QUESTIONS_PER_GAME = 5

// ── Paliers de récompenses fidélité Streak
export function getStreakReward(streakDays) {
  if (streakDays === 1)  return { coins: 5,  tickets: 0, hints: 0, badge: false }
  if (streakDays === 3)  return { coins: 0,  tickets: 0, hints: 2, badge: false }
  if (streakDays === 7)  return { coins: 25, tickets: 1, hints: 3, badge: true  }
  if (streakDays === 14) return { coins: 0,  tickets: 1, hints: 3, badge: false }
  if (streakDays === 30) return { coins: 0,  tickets: 0, hints: 0, badge: false, special: 'wtf_premium' }
  return null
}

// ── Tutorial Configs (isolated, used by TutoTunnel)
export const TUTO_FLASH_CONFIG = {
  id: 'tuto_flash', label: 'Tutoriel', emoji: '🎯',
  choices: 2, duration: 20,
  hintsAllowed: true, freeHints: 2, paidHints: 0, hintCost: 0,
  coinsPerCorrect: 2, questionsCount: 5, scoring: { correct: 5, wrong: 0 },
}

export const TUTO_QUEST_CONFIG = {
  id: 'tuto_quest', label: 'Tutoriel Quest', emoji: '🎯',
  choices: 2, duration: 30,
  hintsAllowed: true, freeHints: 2, paidHints: 0, hintCost: 0,
  coinsPerCorrect: 2, questionsCount: 5, scoring: { correct: 5, wrong: 0 },
}

export const TUTO_FACT_IDS = [189, 127, 61, 92, 350, 6, 10, 109, 301, 45, 174]
