import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'tutorial_state';

export const TUTORIAL_STATES = {
  FIRST_FACT: 'FIRST_FACT',
  HOME_DISCOVERED: 'HOME_DISCOVERED',
  HINT_SHOWN: 'HINT_SHOWN',
  VIP_CARD: 'VIP_CARD',
  COMPLETED: 'COMPLETED',
};

const STATE_ORDER = [
  TUTORIAL_STATES.FIRST_FACT,
  TUTORIAL_STATES.HOME_DISCOVERED,
  TUTORIAL_STATES.HINT_SHOWN,
  TUTORIAL_STATES.VIP_CARD,
  TUTORIAL_STATES.COMPLETED,
];

export async function getTutorialState() {
  const state = await AsyncStorage.getItem(STORAGE_KEY);
  return state || TUTORIAL_STATES.FIRST_FACT;
}

export async function advanceTutorial() {
  const current = await getTutorialState();
  if (current === TUTORIAL_STATES.COMPLETED) return current;

  const idx = STATE_ORDER.indexOf(current);
  const next = STATE_ORDER[idx + 1] || TUTORIAL_STATES.COMPLETED;
  await AsyncStorage.setItem(STORAGE_KEY, next);
  return next;
}

export async function isTutorialComplete() {
  const state = await getTutorialState();
  return state === TUTORIAL_STATES.COMPLETED;
}

export function getTutorialFactId() {
  return 340;
}
