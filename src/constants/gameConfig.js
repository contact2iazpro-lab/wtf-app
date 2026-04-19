// ── Difficulty Levels Configuration — 6 modes officiels (CLAUDE.md 15/04/2026)
// Quickie · Vrai ET Fou · Quest · Race · Blitz · Flash
// Économie ×10 appliquée.

// ── Distributions de fausses réponses par mode (CLAUDE.md 19/04/2026) ──
// type 'weighted'  → tirage pondéré (somme des weights = 1). Utilisé pour numWrong=1.
// type 'counts'    → tirage déterministe : prend exactement N de chaque type. Pour numWrong>1.
// Si un pool manque, fallback sur les autres types selon logique buildPools dans answers.js.
export const DIFFICULTY_LEVELS = {
  QUICKIE: {
    id: 'quickie', label: 'Quickie', emoji: '🎯',
    choices: 2, duration: 15, questionsCount: 5,
    hintsAllowed: true, freeHints: 0, paidHints: 1, hintCost: 50,
    coinsPerCorrect: 10, perfectBonus: 50,
    scoring: { correct: 10, wrong: 0 },
    wrongDistribution: { type: 'weighted', weights: { plausible: 0.7, funny: 0.2, close: 0.1 } },
  },
  VRAI_OU_FOU: {
    id: 'vrai_ou_fou', label: 'Vrai ET Fou', emoji: '🤔',
    choices: 0, duration: 15, questionsCount: 10,
    hintsAllowed: false, freeHints: 0, paidHints: 0, hintCost: 0,
    coinsPerCorrect: 0, perfectBonus: 0,
    scoring: { correct: 0, wrong: 0 },
    swipe: true,
    // Tirage du statement_false : 75% plausible / 25% funny — géré dans VraiOuFouScreen
  },
  QUEST: {
    id: 'quest', label: 'Quest', emoji: '🗺️',
    choices: 4, duration: 20, questionsCount: 10,
    hintsAllowed: true, freeHints: 2, paidHints: 0, hintCost: 0,
    coinsPerCorrect: 20, bossBonus: 100, perfectBonus: 0,
    scoring: { correct: 20, wrong: 0 },
    wrongDistribution: { type: 'counts', counts: { funny: 1, plausible: 2 } },
    // Boss VIP : 3 plausible — traité séparément dans QuestScreen.buildBossOptions
  },
  RACE: {
    id: 'race', label: 'Race', emoji: '🏎️',
    choices: 6, duration: 0, questionsCount: Infinity,
    hintsAllowed: false, freeHints: 0, paidHints: 0, hintCost: 0,
    coinsPerCorrect: 0, perfectBonus: 0,
    scoring: { correct: 0, wrong: 0 },
    wrongDistribution: { type: 'counts', counts: { funny: 2, plausible: 3 } },
  },
  BLITZ: {
    id: 'blitz', label: 'Blitz', emoji: '⚡',
    choices: 4, duration: 60,
    hintsAllowed: false, freeHints: 0, paidHints: 0, hintCost: 0,
    coinsPerCorrect: 0, perfectBonus: 0,
    scoring: { correct: 0, wrong: 0 },
    // Sous-modes Blitz (spec 19/04/2026) :
    // Format UNIFIÉ : chrono 60s DESCENDANT pour Solo ET Défi, erreur = -5s de pénalité,
    // score = nombre de bonnes réponses. Tie-break Défi : temps de la dernière bonne
    // réponse (plus tôt = plus rapide au même score), puis créateur (P1) gagne.
    // - solo : 60s descendant, paliers 5/10/20/30/50/100 bonnes réponses
    // - defi : 60s descendant par joueur, même set, plus de bonnes gagne
    duration_s: 60,
    wrongPenalty: 5, // secondes retirées du chrono sur erreur (partagé Solo + Défi)
    defiCost: 200,   // coins pour créer un défi
    soloMinUnlocked: 20,
    wrongDistribution: { type: 'counts', counts: { funny: 1, close: 1, plausible: 1 } },
  },
  FLASH: {
    id: 'flash', label: 'Flash', emoji: '🔥',
    choices: 2, duration: 15, questionsCount: 5,
    hintsAllowed: true, freeHints: 0, paidHints: 0, hintCost: 0,
    coinsPerCorrect: 0, flashDailyCoins: 30, perfectBonus: 0,
    scoring: { correct: 0, wrong: 0 },
    wrongDistribution: { type: 'weighted', weights: { plausible: 0.7, funny: 0.2, close: 0.1 } },
  },
}

// ── Screens (state machine)
export const SCREENS = {
  HOME: 'home',
  WTF_TEASER: 'wtf_teaser',
  WTF_REVEAL: 'wtf_reveal',
  CATEGORY: 'category',
  QUESTION: 'question',
  REVELATION: 'revelation',
  RESULTS: 'results',
  BLITZ: 'blitz',
  BLITZ_RESULTS: 'blitz_results',
  BLITZ_LOBBY: 'blitz_lobby',
  MODE_LAUNCH: 'mode_launch',
  FLASH: 'flash',
  QUEST: 'quest',
  VRAI_OU_FOU: 'vrai_ou_fou',
  RACE: 'race',
}

// ── Mode launch configs (rules displayed before each mode)
export const MODE_CONFIGS = {
  quickie: {
    modeId: 'quickie', modeName: 'Quickie', subtitle: 'Court. Bon. Sans engagement.', emoji: '🍸', icon: '/assets/modes/icon-quickie.png', color: '#FFA500',
    rules: [
      { icon: 'icon:energy', text: '**Coût** : 1 énergie' },
      { icon: 'icon:set', text: '**Set** : 5 questions / set' },
      { icon: 'icon:qcm', text: '**QCM** : 2 / question' },
      { icon: 'icon:timer', text: '**Timer** : 15s / question' },
      { icon: '💡', text: '**Indices** : 1 max / question' },
      { icon: '🪙', text: '**Gains** : 10 Coins / bonne réponse' },
      { icon: 'icon:star', text: '**Perfect** : (5 / 5) +50 Coins' },
    ],
  },
  vrai_ou_fou: {
    modeId: 'vrai_ou_fou', modeName: 'Vrai ET Fou', subtitle: 'Swipe ou pas swipe ?', emoji: '🤔', icon: '/assets/modes/icon-vrai-et-fou.png', color: '#6BCB77',
    ctaLabel: 'VAS-Y, SWIPE !',
    rules: [
      { icon: 'picto:infinity', text: '**Coût** : Illimité' },
      { icon: 'icon:set', text: '**Set** : 10 affirmations / set' },
      { icon: 'picto:swipe', text: '**Swipe** : {{red}}Faux à gauche{{/red}}, Vrai à droite' },
      { icon: 'icon:timer', text: '**Timer** : 15s / question' },
      { icon: 'picto:share', text: '**Social** : Partage ton score' },
    ],
  },
  quest: {
    modeId: 'quest', modeName: 'Quest', subtitle: 'Le chemin des WTF!', emoji: '🗺️', icon: '/assets/modes/icon-quest.png', color: '#FF6B1A',
    rules: [
      { icon: 'icon:energy', text: '**Coût** : 1 énergie par bloc' },
      { icon: 'icon:set', text: '**Bloc** : 10 Funny + 1 boss VIP' },
      { icon: 'icon:qcm', text: '**QCM** : 4 / question' },
      { icon: 'icon:timer', text: '**Timer** : 20s / question' },
      { icon: 'icon:hint', text: '**Indices** : 2 / question' },
      { icon: 'icon:star', text: '**Boss** : 5 / 10 bonnes → VIP' },
      { icon: 'icon:coins', text: '**Gains** : 20c / bonne · +100c / boss' },
    ],
  },
  race: {
    modeId: 'race', modeName: 'Race', subtitle: 'Zéro droit à l\'erreur', emoji: '🏎️', icon: '/assets/modes/icon-race.png', color: '#00E5FF',
    rules: [
      { icon: 'picto:survival', text: '**Survie** : Illimitées jusqu\'à la 1ʳᵉ erreur' },
      { icon: 'icon:qcm', text: '**QCM** : 6 / question' },
      { icon: 'icon:timer', text: '**Timer** : Aucun' },
      { icon: '💡', text: '**Indices** : Aucun' },
      { icon: '🪙', text: '**Coût** : Gratuit' },
      { icon: 'icon:star', text: '**Prestige** : Bats ton record' },
    ],
  },
  blitz: {
    modeId: 'blitz', modeName: 'Blitz', subtitle: 'Défonce le chrono', emoji: '⚡', icon: '/assets/modes/icon-blitz.png', color: '#FF4444',
    rules: [
      // ── Règles communes (Rush + Speedrun) ──
      { icon: 'icon:qcm', text: '**QCM** : 4 / question' },
      { icon: 'icon:hint', text: '**Indices** : Aucun' },
      { icon: 'icon:coins', text: '**Coût** : Gratuit illimité' },
      { icon: 'picto:steps', text: '**Paliers** : 5, 10, 20, 30, 50, 100' },
      // ── Rush (mode par défaut) ──
      { icon: 'icon:timer', text: '**Rush** : 60s descendant · erreur = −5s · score = bonnes réponses' },
      // ── Speedrun (cat 100%) ──
      { icon: 'picto:survival', text: '**Speedrun** : chrono montant · erreur = +5s · score = temps final · cat 100% requise' },
    ],
  },
  multi: {
    modeId: 'multi', modeName: 'Multi', subtitle: 'Défie tes amis', emoji: '⚔️', icon: '/assets/modes/icon-multi.png', color: '#6B2D8E',
    rules: [
      { icon: 'picto:swords', text: '**Mode** : Rush ou Speedrun' },
      { icon: 'icon:qcm', text: '**QCM** : 4 / question' },
      { icon: 'icon:timer', text: '**Chrono** : 60s (Rush) · libre (Speedrun)' },
      { icon: 'picto:penalty', text: '**Pénalité** : ±5 s par erreur' },
      { icon: 'icon:coins', text: '**Mise** : 100 Coins chacun · +150 au gagnant' },
      { icon: 'picto:share', text: '**Social** : défi asynchrone · 48 h pour relever' },
    ],
  },
  flash: {
    modeId: 'flash', modeName: 'Flash', subtitle: 'Le rendez-vous quotidien', emoji: '🔥', icon: '/assets/daily.png', color: '#E91E63',
    rules: [
      { icon: 'picto:free', text: '**Coût** : Gratuit · 1 × / jour' },
      { icon: 'icon:set', text: '**Set** : 5 questions / set' },
      { icon: 'icon:qcm', text: '**QCM** : 2 / question' },
      { icon: 'icon:timer', text: '**Timer** : 15s / question' },
      { icon: 'icon:hint', text: '**Indices** : Aucun (Lun-Sam) · 2 max (Dim)' },
      { icon: 'picto:target', text: '**Lun-Sam** : thème du jour · **Dim** : Hunt VIP' },
      { icon: 'icon:coins', text: '**Gains** : 30 Coins (Lun-Sam) · 1 VIP débloqué (Dim)' },
    ],
  },
}

// ── Nombre de questions par session
export const QUESTIONS_PER_GAME = 5

// ── Énergie Quickie — modèle stock+régen (T91, 2026-04-12)
// Stock persistant max 5, régénération +1 toutes les 8h jusqu'au cap de 5.
export const QUICKIE_ENERGY = {
  INITIAL_STOCK: 5,
  MAX_STOCK: 5,
  REGEN_HOURS: 8,
  REGEN_MS: 8 * 60 * 60 * 1000,
  EXTRA_SESSION_COST: 75,
  FREE_SESSIONS_PER_DAY: 5,
}

// ── Paliers Streak/Coffres fusionnés (décision 16/04/2026 Option B)
// Pas de J1 (redondant avec Flash quotidien). 4 paliers nommés.
export const STREAK_PALIERS = [
  { day: 3,  name: 'Débutant', coins: 75,   hints: 0, badge: false, special: null },
  { day: 7,  name: 'Habitué',  coins: 200,  hints: 2, badge: true,  special: null },
  { day: 14, name: 'Fidèle',   coins: 500,  hints: 0, badge: true,  special: null },
  { day: 30, name: 'Légende',  coins: 1000, hints: 0, badge: true,  special: 'wtf_premium' },
]

export function getStreakReward(streakDays) {
  const palier = STREAK_PALIERS.find(p => p.day === streakDays)
  return palier ? { coins: palier.coins, hints: palier.hints, badge: palier.badge, special: palier.special } : null
}

// ── Tutorial Configs (isolated, used by TutoTunnel)
export const TUTO_QUICKIE_CONFIG = {
  id: 'tuto_quickie', label: 'Tutoriel', emoji: '🎯',
  choices: 2, duration: 20,
  hintsAllowed: true, freeHints: 0, paidHints: 2, hintCost: 0,
  coinsPerCorrect: 2, questionsCount: 5, scoring: { correct: 5, wrong: 0 },
}

export const TUTO_FACT_IDS = [189, 127, 61, 92, 350, 6, 10, 109, 301, 45, 174]
