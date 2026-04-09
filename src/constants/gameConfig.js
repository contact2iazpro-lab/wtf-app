// ── Difficulty Levels Configuration
// Centralized configuration for all difficulty modes
// Used by App.jsx and DifficultyScreen.jsx

export const DIFFICULTY_LEVELS = {
  COOL: {
    id: 'cool',
    label: 'Cool',
    emoji: '❄️',
    choices: 2,
    duration: 30,
    hintsAllowed: true,
    freeHints: 0,
    paidHints: 2,
    hintCost: 0,
    coinsPerCorrect: 2,
    scoring: { correct: 5, wrong: 0 },
  },
  HOT: {
    id: 'hot',
    label: 'Hot',
    emoji: '🔥',
    choices: 4,
    duration: 20,
    hintsAllowed: true,
    freeHints: 0,
    paidHints: 2,
    hintCost: 0,
    coinsPerCorrect: 2,
    scoring: { correct: 3, wrong: 0 },
  },
  WTF: {
    id: 'wtf',
    label: 'WTF!',
    emoji: '⚡',
    choices: 6,
    duration: 20,
    hintsAllowed: true,
    freeHints: 0,
    paidHints: 1,
    hintCost: 0,
    coinsPerCorrect: 1,
    scoring: { correct: 2, wrong: 0 },
  },
  FLASH: {
    id: 'flash',
    label: 'Flash',
    emoji: '⚡',
    choices: 4,
    duration: 20,
    hintsAllowed: true,
    freeHints: 0,
    paidHints: 2,
    hintCost: 0,
    coinsPerCorrect: 2,
    scoring: { correct: 5, wrong: 0 },
  },
  HUNT: {
    id: 'hunt',
    label: 'Hunt',
    emoji: '🔥',
    choices: 4,
    duration: 20,
    hintsAllowed: true,
    freeHints: 0,
    paidHints: 2,
    hintCost: 0,
    scoring: { correct: [5, 3, 2], wrong: 0 },
  },
  BLITZ: {
    id: 'blitz',
    label: 'Blitz',
    emoji: '⚡',
    choices: 4,
    duration: 60,
    hintsAllowed: true,
    freeHints: 0,
    paidHints: 2,
    hintCost: 0,
    coinsPerCorrect: 0,
    scoring: { correct: 1, wrong: 0 },
  },
}

// ── Tutoriel Configs (isolated from main gameplay)
export const TUTO_FLASH_CONFIG = {
  id: 'tuto_flash',
  label: 'Tutoriel',
  emoji: '🎯',
  choices: 2,
  duration: 20,
  hintsAllowed: true,
  freeHints: 2,
  paidHints: 0,
  hintCost: 0,
  coinsPerCorrect: 2,
  scoring: { correct: 5, wrong: 0 },
}

export const TUTO_QUEST_CONFIG = {
  id: 'tuto_quest',
  label: 'Tutoriel Quest',
  emoji: '🎯',
  choices: 2,
  duration: 30,
  hintsAllowed: true,
  freeHints: 2,
  paidHints: 0,
  hintCost: 0,
  coinsPerCorrect: 2,
  scoring: { correct: 5, wrong: 0 },
}

// ── Tutorial Facts — Premier fact (FIRST_FACT) et pool pour Flash/Quest
export const TUTO_FIRST_FACT_ID = 189
export const TUTO_FACT_IDS = [127, 61, 92, 350, 6, 10, 109, 301, 45, 174]
