import { createContext, useContext } from 'react'
import { UNLOCK_MESSAGES, UNLOCK_THRESHOLDS, SPOTLIGHT_MESSAGES } from '../constants/layoutConfig'

export const UnlockContext = createContext({
  // Navbar unlock conditions
  canBoutique: false,
  canTrophees: false,
  canCollection: false,
  canAmis: false,

  // Mode unlock conditions
  canQuest: false,
  canBlitz: false,
  canHunt: false,
  canExplorer: false,
  canMulti: false,
  canSerie: false,

  // UI feature display conditions
  showStreakDisplay: false,
  showBadgeDisplay: false,
  showCoffresDisplay: false,

  // All unlock messages (from layoutConfig)
  unlockMessages: UNLOCK_MESSAGES,

  // Spotlight messages for tutorial
  spotlightMessages: SPOTLIGHT_MESSAGES,

  // Unlock thresholds (for reference)
  unlockThresholds: UNLOCK_THRESHOLDS,

  // Notifications
  socialNotifCount: 0,
  pendingChallengesCount: 0,
})

export function useUnlock() {
  const context = useContext(UnlockContext)
  if (!context) {
    console.warn('useUnlock() called outside UnlockProvider')
    return {
      // Navbar
      canBoutique: false,
      canTrophees: false,
      canCollection: false,
      canAmis: false,

      // Modes
      canQuest: false,
      canBlitz: false,
      canHunt: false,
      canExplorer: false,
      canMulti: false,
      canSerie: false,

      // UI features
      showStreakDisplay: false,
      showBadgeDisplay: false,
      showCoffresDisplay: false,

      unlockMessages: UNLOCK_MESSAGES,
      spotlightMessages: SPOTLIGHT_MESSAGES,
      unlockThresholds: UNLOCK_THRESHOLDS,
      socialNotifCount: 0,
      pendingChallengesCount: 0,
    }
  }
  return context
}
