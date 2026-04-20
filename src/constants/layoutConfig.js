/**
 * layoutConfig.js — Configuration centralisée pour HomeScreen
 */

// ── Unlock thresholds — conditions pour débloquer chaque mode/feature ────────

export const UNLOCK_THRESHOLDS = {
  quest: { stat: 'gamesPlayed', threshold: 1 },
  blitz: { stat: 'unlockedFactsCount', threshold: 5 },
  drop: { stat: 'gamesPlayed', threshold: 10 },
  quickie: { stat: 'statsByMode.parcours.gamesPlayed', threshold: 1 },
  streakDisplay: { stat: 'gamesPlayed', threshold: 3 },
  badgeDisplay: { stat: 'gamesPlayed', threshold: 3 },
  coffresDisplay: { stat: 'questsPlayed', threshold: 1 },
}

// ── Unlock messages — textes affichés quand un bouton est verrouillé ─────────

export const UNLOCK_MESSAGES = {
  quest: 'Joue ta première partie pour débloquer ! 🎮',
  blitz: 'Débloque 5 f*cts pour jouer en Blitz ! ⚡',
  drop: 'Joue 10 parties pour débloquer le Drop ! 🔥',
  quickie: 'Termine une Quest pour explorer librement ! 🧭',
  boutique: 'Joue 2 parties pour débloquer la Boutique ! 🛍️',
  trophees: 'Joue 2 parties pour voir tes Trophées ! 🏆',
  collection: 'Termine une Quest pour voir ta Collection ! 📚',
  amis: 'Termine un Blitz pour débloquer les Amis ! 👥',
}

// ── Spotlight messages — conseils affichés pendant le tuto ────────────────────

export const SPOTLIGHT_MESSAGES = {
  drop: 'Lance ta première partie ! 🎮',
  quest: 'Découvre les f*cts les plus dingues 🏆',
  collection: 'Tes f*cts sont dans ta collection ! 📚',
  coffre: 'Ouvre ton coffre du jour ! 🎁',
  boutique: 'Achète indices et énergie ici ! 🛍️',
  blitz: 'Teste ta mémoire en Blitz ! ⚡',
}

// ── Icon sizes ───────────────────────────────────────────────────────────────

export const ICON_SIZES = {
  modeIcon: 72,
  coffreIcon: 28,
  lockBadge: 18,
}

// ── Asset paths ──────────────────────────────────────────────────────────────

export const ASSETS = {
  ui: {
    vofLogo: '/assets/ui/vof-logo.png?v=4',
    wtfLogo: '/assets/ui/wtf-logo.png?v=4',
    tagline: '/assets/ui/100logo.png?v=5',
    coinsIcon: '/assets/ui/icon-coins.png',
    chestOpen: '/assets/ui/chest-open.png',
    chestLocked: '/assets/ui/chest-locked.png',
    chestTrophy: '/assets/ui/chest-trophy.png?v=2',
  },
}

// ── Theme colors ─────────────────────────────────────────────────────────────

export const THEME = {
  textColor: '#ffffff',
  textShadow: '0 1px 4px rgba(0,0,0,0.3)',
  primaryOrange: '#FF6B1A',
}
