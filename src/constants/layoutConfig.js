/**
 * layoutConfig.js — Configuration centralisée pour HomeScreen
 * Source de vérité unique pour tous les espacements, seuils, messages, assets
 */

// ────────────────────────────────────────────────────────────────────────────
// ZONE HEIGHTS & CONSTRAINTS
// ────────────────────────────────────────────────────────────────────────────

export const ZONE_HEIGHTS = {
  header: 44,           // Zone 1 — Avatar + Coins + Settings
  streak: 32,           // Zone 2 — Streak info (conditionnel: gamesPlayed >= 3)
  badge: 28,            // Zone 2B — Next badge progress (conditionnel: gamesPlayed >= 3)
  coffres: 60,          // Zone 3 — Daily chests (conditionnel: questsPlayed >= 1)
  flashButton: 44,      // Zone 4B — "Jouer" button height
  flashButtonGap: 34,   // CRITICAL: Gap between Snack button and navbar
}

// ────────────────────────────────────────────────────────────────────────────
// GRID LAYOUT CONFIGURATION
// ────────────────────────────────────────────────────────────────────────────

export const GRID_CONFIG = {
  // Default 3-column layout (can be changed for T+31)
  columns: 'auto 1fr auto',
  rows: 'auto auto auto',
  padding: '0 10px',
  rowGap: 0,
  columnGap: 0,

  // Column spacings
  leftColumnGap: 24,      // Quest + Blitz spacing
  centerColumnGap: 24,    // VoF + WTF + Tagline spacing
  rightColumnGap: 12,     // Snack + Flash spacing
}

// ────────────────────────────────────────────────────────────────────────────
// UNLOCK THRESHOLDS — Conditions pour débloquer chaque mode/feature
// ────────────────────────────────────────────────────────────────────────────

export const UNLOCK_THRESHOLDS = {
  // Modes de jeu
  quest: { stat: 'gamesPlayed', threshold: 1 },
  blitz: { stat: 'unlockedFactsCount', threshold: 5 },
  hunt: { stat: 'gamesPlayed', threshold: 10 },
  snack: { stat: 'statsByMode.parcours.gamesPlayed', threshold: 1 },

  // UI Features
  streakDisplay: { stat: 'gamesPlayed', threshold: 3 },
  badgeDisplay: { stat: 'gamesPlayed', threshold: 3 },
  coffresDisplay: { stat: 'questsPlayed', threshold: 1 },
}

// ────────────────────────────────────────────────────────────────────────────
// UNLOCK MESSAGES — Textes affichés quand un bouton est verrouillé
// ────────────────────────────────────────────────────────────────────────────

export const UNLOCK_MESSAGES = {
  // Modes
  quest: 'Joue ta première partie pour débloquer ! 🎮',
  blitz: 'Débloque 5 f*cts pour jouer en Blitz ! ⚡',
  hunt: 'Joue 10 parties pour débloquer la Flash ! 🔥',
  snack: 'Termine une Quest pour explorer librement ! 🧭',

  // Navbar (à synchroniser avec UnlockContext)
  boutique: 'Joue 2 parties pour débloquer la Boutique ! 🛍️',
  trophees: 'Joue 2 parties pour voir tes Trophées ! 🏆',
  collection: 'Termine une Quest pour voir ta Collection ! 📚',
  amis: 'Termine un Blitz pour débloquer les Amis ! 👥',
}

// ────────────────────────────────────────────────────────────────────────────
// SPOTLIGHT MESSAGES — Conseils affichés pendant le tuto
// ────────────────────────────────────────────────────────────────────────────

export const SPOTLIGHT_MESSAGES = {
  flash: 'Lance ta première partie ! 🎮',
  quest: 'Découvre les f*cts les plus dingues 🏆',
  collection: 'Tes f*cts sont dans ta collection ! 📚',
  coffre: 'Ouvre ton coffre du jour ! 🎁',
  boutique: 'Achète indices et énergie ici ! 🛍️',
  blitz: 'Teste ta mémoire en Blitz ! ⚡',
}

// ────────────────────────────────────────────────────────────────────────────
// ICON SIZES & STYLING
// ────────────────────────────────────────────────────────────────────────────

export const ICON_SIZES = {
  modeIcon: 48,         // Mode button icons (Quest, Blitz, etc.)
  coffreIcon: 28,       // Chest icons
  lockBadge: 18,        // Lock badge size
}

export const FONT_FAMILIES = {
  default: "'Nunito', sans-serif",
  accent: "'Fredoka One', cursive",
}

// ────────────────────────────────────────────────────────────────────────────
// ASSET PATHS — Centralisé pour facile changement de CDN/versioning
// ────────────────────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────────────────────
// COLORS & STYLES
// ────────────────────────────────────────────────────────────────────────────

export const THEME = {
  textColor: '#ffffff',
  textShadow: '0 1px 4px rgba(0,0,0,0.3)',
  primaryOrange: '#FF6B1A',
}

// ────────────────────────────────────────────────────────────────────────────
// LAYOUT PRESETS (pour T+31 — permettre de changer le layout rapidement)
// ────────────────────────────────────────────────────────────────────────────

export const LAYOUT_MODES = {
  default: {
    name: '3-column (current)',
    gridColumns: 'auto 1fr auto',
    gridRows: 'auto auto auto',
    leftGap: 24,
    centerGap: 24,
    rightGap: 12,
  },

  // Future layout options for T+31
  vertical: {
    name: 'Vertical stack',
    gridColumns: '1fr',
    gridRows: 'auto auto auto auto auto auto',
    leftGap: 12,
    centerGap: 12,
    rightGap: 12,
  },

  twoColumn: {
    name: '2-column',
    gridColumns: '1fr 1fr',
    gridRows: 'auto auto auto',
    leftGap: 16,
    centerGap: 16,
    rightGap: 16,
  },
}
