const STORAGE_KEY = 'tutorial_state';

export const TUTORIAL_STATES = {
  FIRST_FACT: 'FIRST_FACT',
  HOME_DISCOVERED: 'HOME_DISCOVERED',
  FLASH_DONE: 'FLASH_DONE',
  QUEST_DONE: 'QUEST_DONE',
  COMPLETED: 'COMPLETED',
};

const STATE_ORDER = [
  TUTORIAL_STATES.FIRST_FACT,
  TUTORIAL_STATES.HOME_DISCOVERED,
  TUTORIAL_STATES.FLASH_DONE,
  TUTORIAL_STATES.QUEST_DONE,
  TUTORIAL_STATES.COMPLETED,
];

export async function getTutorialState() {
  try {
    const state = localStorage.getItem(STORAGE_KEY);
    return state || TUTORIAL_STATES.FIRST_FACT;
  } catch {
    return TUTORIAL_STATES.FIRST_FACT;
  }
}

export async function advanceTutorial() {
  const current = await getTutorialState();
  if (current === TUTORIAL_STATES.COMPLETED) return current;

  const idx = STATE_ORDER.indexOf(current);
  const next = STATE_ORDER[idx + 1] || TUTORIAL_STATES.COMPLETED;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch { /* ignore */ }
  return next;
}

export async function isTutorialComplete() {
  const state = await getTutorialState();
  return state === TUTORIAL_STATES.COMPLETED;
}

export function getTutorialFactId() {
  return 340;
}
