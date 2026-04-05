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
    const stateFromDirect = localStorage.getItem(STORAGE_KEY);
    const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}');
    const stateFromWtfData = wtfData.tutorialState || null;

    if (stateFromDirect) {
      // Sync vers wtf_data si différent
      if (stateFromWtfData !== stateFromDirect) {
        wtfData.tutorialState = stateFromDirect;
        wtfData.lastModified = Date.now();
        localStorage.setItem('wtf_data', JSON.stringify(wtfData));
      }
      return stateFromDirect;
    }

    if (stateFromWtfData) {
      // Restaurer depuis wtf_data (ex: sync Supabase)
      localStorage.setItem(STORAGE_KEY, stateFromWtfData);
      return stateFromWtfData;
    }

    return TUTORIAL_STATES.FIRST_FACT;
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
    // Persister dans wtf_data pour sync Supabase
    const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}');
    wtfData.tutorialState = next;
    wtfData.lastModified = Date.now();
    localStorage.setItem('wtf_data', JSON.stringify(wtfData));
  } catch { /* ignore */ }
  return next;
}

export async function isTutorialComplete() {
  const state = await getTutorialState();
  return state === TUTORIAL_STATES.COMPLETED;
}

export function getTutorialFactId() {
  return 999;
}
