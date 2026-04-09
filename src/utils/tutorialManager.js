import { TUTO_FIRST_FACT_ID } from '../constants/gameConfig';

const STORAGE_KEY = 'tutorial_state';

/**
 * tutorialManager v2 — Système simplifié
 * Un seul rôle : savoir si le tuto premier f*ct est terminé.
 * Tout le reste (spotlights, cadenas, débloquage) est géré par
 * les seuils wtf_data dans HomeScreen.
 */

export const TUTORIAL_STATES = {
  FIRST_FACT: 'FIRST_FACT',
  COMPLETED: 'COMPLETED',
};

export async function getTutorialState() {
  try {
    const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}');
    if (wtfData.tutorialDone === true) return TUTORIAL_STATES.COMPLETED;

    // Migration : si l'ancien système avait avancé au-delà de FIRST_FACT, considérer comme terminé
    const legacyState = localStorage.getItem(STORAGE_KEY);
    if (legacyState && legacyState !== TUTORIAL_STATES.FIRST_FACT) {
      // Migrer vers le nouveau système
      wtfData.tutorialDone = true;
      wtfData.lastModified = Date.now();
      localStorage.setItem('wtf_data', JSON.stringify(wtfData));
      localStorage.removeItem(STORAGE_KEY);
      return TUTORIAL_STATES.COMPLETED;
    }

    return TUTORIAL_STATES.FIRST_FACT;
  } catch {
    return TUTORIAL_STATES.FIRST_FACT;
  }
}

export async function completeTutorial() {
  try {
    const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}');
    wtfData.tutorialDone = true;
    wtfData.lastModified = Date.now();
    localStorage.setItem('wtf_data', JSON.stringify(wtfData));
    // Nettoyer l'ancien système
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
  return TUTORIAL_STATES.COMPLETED;
}

// Rétrocompatibilité — les anciens appels à advanceTutorial() doivent continuer à fonctionner
export async function advanceTutorial() {
  return completeTutorial();
}

export async function isTutorialComplete() {
  const state = await getTutorialState();
  return state === TUTORIAL_STATES.COMPLETED;
}

export function getTutorialFactId() {
  return TUTO_FIRST_FACT_ID;
}
