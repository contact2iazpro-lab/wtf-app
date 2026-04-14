# 🎨 EMOJI AUDIT — WTF! App

> Audit exhaustif des emojis Unicode et assets PNG rendus à l'écran.
> Périmètre : `src/screens/`, `src/pages/`, `src/components/`, `src/utils/badgeManager.js`, `src/constants/gameConfig.js`, `src/AppRouter.jsx`, `src/App.jsx`.
> Exclusions : console.log, commentaires, noms de variables, `scripts/`.
> Dernière MAJ : 2026-04-14

---

## 📁 src/App.jsx & src/AppRouter.jsx

### App.jsx
EMOJIS TEXTE :
- 🎫 ligne ~133 — modal "Pas de ticket"
- 📡 ligne ~444 — état réseau / reconnexion

### AppRouter.jsx
EMOJIS TEXTE :
- 🛍️ ligne 107 — Boutique (nav)
- 🏆 ligne 108 — Trophées (nav)
- 📚 ligne 109 — Collection (nav)
- 👥 ligne 110 — Social/Amis (nav)

---

## 📁 src/constants/gameConfig.js

EMOJIS TEXTE (via objets config rendus dans HomeScreen / ModeLaunchScreen / HowToPlayModal) :
- ❄️ lignes 6, 81 — difficulté Cool
- 🔥 lignes 12, 40, 82, 108 — difficulté Hot / Hunt
- ⚡ lignes 20, 46, 87, 101, 112, 121 — Blitz / WTF!
- 🎯 lignes 26, 94, 98, 111, 123, 158, 165 — Flash / Explorer / règles Quest
- 🧭 lignes 34, 117 — Explorer
- ⭐ ligne 78 — Quest
- 🎫 ligne 80 — coût Quest
- 📚 ligne 83 — Collection
- 📂 lignes 104, 120 — choix catégorie
- 💡 lignes 102, 113, 122 — indices
- 🔋 lignes 100, 119 — énergie
- 🎲 ligne 103 — Flash aléatoire
- 🆓 lignes 93, 110 — mode gratuit
- ❌ ligne 90 — pénalité Blitz
- 🚫 ligne 91 — pas d'indices
- 🏆 ligne 92 — record
- ⏱️ ligne 89 — timer Blitz

---

## 📁 src/utils/badgeManager.js

EMOJIS TEXTE (rendus dans RecompensesPage + TrophyQueue modale) :
- 🔰 ligne 32 — Découvreur (5 f*cts/cat)
- 🥉 ligne 33 — Connaisseur (10 f*cts/cat)
- 🥈 ligne 34 — Expert (15 f*cts/cat)
- 🥇 ligne 35 — Maître (20 f*cts/cat)
- 👑 lignes 36, 73, 95, 119 — Légende / Perfect
- 🌟 lignes 43, 64 — Premier WTF! / Série 30
- 💫 ligne 44 — Chasseur WTF!
- 🏆 lignes 45, 82 — Roi / Légende WTF!
- 🎭 ligne 46 — Premier Funny
- 😂 ligne 47 — Fan de Funny
- 🤣 ligne 48 — Expert Funny
- 👏 ligne 49 — Maître Funny
- 🎯 lignes 54, 89 — Premier F*ct / Expert
- 🧠 ligne 55 — Curieux
- 🔥 lignes 56, 115 — Passionné / Série 7
- 💎 ligne 57 — Collectionneur (100)
- 📚 ligne 58 — Encyclopédie (200)
- ⚡ lignes 63, 72, 116 — Blitz Master / Série
- ⏱️ ligne 70 — Blitz Rookie
- 🚀 ligne 71 — Blitz Pro
- 💯 ligne 74 — Sans faute Blitz
- 🎮 lignes 79, 117 — Débutant / Régulier
- 🕹️ ligne 80 — Vétéran
- 🎖️ ligne 81 — Vétéran décoré
- 🤝 ligne 87 — Premier ami
- 👥 lignes 88, 118 — Sociable
- ⚔️ ligne 90 — Compétiteur
- 🌍 ligne 112 — Progression globale

---

## 📁 src/components/

### GameHeader.jsx
EMOJIS TEXTE :
- ✕ lignes 43, 57 — bouton quitter

ASSETS PNG :
- `icon-coins.png` ligne 80 — pill coins
- `icon-tickets.png` ligne 91 — pill tickets
- `icon-hint.png` ligne 92 — pill indices
- `icon-settings.png` ligne 104 — bouton settings

### HintFlipButton.jsx
ASSETS PNG :
- `icon-hint.png` ligne 30 — icône indice
- `icon-coins.png` ligne 43 — coût

### HowToPlayModal.jsx (livret de règles — très dense)
EMOJIS TEXTE :
- 🤯 ligne 20 — chapitre "Objectif"
- 🎓 ligne 33 — chapitre "Tutoriel"
- ⭐ lignes 48, 78 — mode Quest
- 🎯 lignes 24, 53, 62, 111, 162, 199, 308 — Flash / Explorer
- ⏱️ lignes 25, 95 — timer
- 🪙 lignes 26, 69, 83, 114, 130, 156, 160, 180, 198 — coins
- 📚 lignes 27, 56, 71, 85, 234, 241 — Collection
- 🏆 lignes 28, 101, 186, 232, 249, 256, 295 — trophées
- 🎫 lignes 52, 182, 213 — tickets
- 🎮 lignes 37, 265 — tutoriel / social
- 💡 lignes 38, 70, 84, 113, 139, 143, 181, 212, 309 — indices
- 🏅 ligne 39 — médaille
- 🔄 lignes 40, 248, 546 — restart tutoriel
- ❄️ lignes 54, 145 — Cool
- 🔥 lignes 55, 106, 164, 174, 179, 263, 314 — Hot / Hunt / Série
- 💎 lignes 57, 201 — VIP exclusif
- 🔋 lignes 66, 80, 123, 127, 214 — énergie
- 🎲 ligne 68 — aléatoire
- 🗺️ lignes 76, 163 — Explorer
- 📂 lignes 81, 230, 262 — catégories
- 🆓 lignes 94, 110, 128, 197 — gratuit
- 📊 lignes 96, 200, 246, 268, 280, 297 — stats
- ✅ ligne 97 — correct
- 🚫 lignes 98, 146 — interdits
- 🧠 lignes 99, 311 — mémoire
- 💰 lignes 100, 217 — gains coins
- 📉 ligne 144 — consommation indices
- ⚠️ ligne 147 — stock vide
- 🛒 lignes 148, 167, 208 — boutique
- 🎁 lignes 149, 183, 229 — récompenses / packs
- 🎰 lignes 166, 193, 233 — roulette / pity
- 🔐 ligne 116 — indice payant
- 🔒 ligne 116 — verrou
- ✨ lignes 231, 304 — premium
- 🎴 lignes 108, 110 — pack mystère
- ⚡ lignes 67, 82, 90, 112, 165, 264, 296 — Blitz / Hunt vitesse
- 📋 ligne 245 — formulaire
- 🛡️ lignes 185, 215, 313 — Streak Freeze
- 📦 lignes 131, 216, 224, 228, 312 — packs
- 🌍 ligne 260 — global
- 👤 ligne 275 — profil
- 👥 lignes 266, 290, 294 — social
- ✏️ ligne 279 — éditer pseudo
- 🔗 ligne 281 — lien connect
- 📱 ligne 282 — multi-device
- ⚙️ ligne 283 — réglages
- 📖 ligne 434 — header règles
- ✓ ligne 627 — compris
- ♾️ ligne 132 — illimité
- ⏰ ligne 129 — reset journalier

ASSETS PNG :
- `quete.png` ligne 328 — Quest
- `marathon.png` lignes 329, 330 — Flash/Explorer
- `blitz.png` ligne 331 — Blitz
- `serie.png` ligne 332 — Série
- `multi.png` ligne 333 — Multi

### SettingsModal.jsx
EMOJIS TEXTE :
- 👤 ligne 62 — Mode Joueur
- 🎮 ligne 63 — Mode Test
- 🔧 ligne 64 — Mode Dev
- ✕ lignes 126, 150, 233 — fermer
- 📖 ligne 303 — règles du jeu
- 📤 ligne 305 — export backup
- 📄 ligne 316 — doc
- 📋 ligne 317 — copier
- 🔒 ligne 318 — sécurité

### ConnectBanner.jsx
EMOJIS TEXTE :
- 🔓 ligne 38 — débloquer fonctionnalités
- ✅ ligne 65 — feature dispo

### AppModals.jsx
EMOJIS TEXTE :
- 🔥 lignes 63, 80 — streak toast / J30
- 🪙 lignes 67, 154, 193 — coins reward
- 🎟️ ligne 68 — tickets reward
- 💡 ligne 69 — hints reward
- 🏅 ligne 70 — badge
- 👑 lignes 88, 90 — WTF Premium choice
- 🎴 lignes 108, 110 — 10 f*cts débloqués
- 🔋 ligne 146 — no energy modal
- 🎫 ligne 164 — no ticket modal
- 🎯 lignes 170, 191 — jouer pour gagner
- ⚡ ligne 174 — Blitz
- 🚀 ligne 208 — lancer mini-parcours

### DevPanel.jsx
EMOJIS TEXTE :
- ✓ lignes 106, 175, 338 — succès
- ❌ lignes 108, 151, 310, 339 — erreur
- 📬 lignes 116, 191 — notif WTF weekly
- 🤯 lignes 117, 231, 276 — fact notif
- 🔥 lignes 121, 122, 126, 127, 137, 213 — streak
- ⚔️ ligne 131 — défi notif
- 🦁 lignes 132, 258 — opposant
- 📦 lignes 136, 137 — pack dispo
- 🛠️ ligne 163 — header dev tools
- 🔀 ligne 183 — shuffle
- ⚠️ ligne 206 — warning
- ⚡ ligne 235 — blitz metric
- ✅ ligne 231 — état
- 🎬 ligne 250 — intro test
- 🆓 ligne 252 — free mode
- 📅 ligne 255 — daily event
- 💳 ligne 261 — payment
- 🛡️ ligne 264 — freeze
- 📖 ligne 269 — logs
- 📚 ligne 227 — collection
- ✨ ligne 319 — special
- 📊 ligne 324 — stats
- ⏳ ligne 231 — timing

### BottomNav.jsx
*(aucun emoji — purement icônes)*

---

## 📁 src/screens/

### SplashScreen.jsx
ASSETS PNG :
- `/assets/ui/wtf-logo.png` ligne 88
- `/assets/ui/vof-logo.png` ligne 102

### FalkonIntroScreen.jsx
ASSETS PNG :
- `/assets/ui/falkon-logo.png` ligne 24

### HomeScreen.jsx
*(voir gameConfig pour les emojis de modes affichés ; header : voir GameHeader)*
EMOJIS TEXTE (headers, coffres, toasts) :
- ⚡ 🎯 🔥 ❄️ 🧭 ⭐ — tuiles modes via `gameConfig.MODE_CONFIGS[x].emoji`
- 🪙 — pills coins (via ImagePill ou texte)
- 🎟️ 💡 — pills tickets/indices
- 🔥 — streak display

### QuestionScreen.jsx
EMOJIS TEXTE :
- 🏃 ligne ~120 — modal quitter
- 🧠 ligne ~341 — label mode question ouverte
- ✗ ligne ~399 — bouton faux
- ✓ ligne ~406 — bouton vrai

ASSETS PNG :
- `/assets/categories/{category}.png` ligne ~159

### RevelationScreen.jsx
EMOJIS TEXTE (arrays CORRECT_MESSAGES / WRONG_MESSAGES rendus) :
- 🤯 🌀 💪 👆 🎯 🌱 🔍 🔥 👁️ 😎 🎩 🌟 ✨ 👏 💡 — messages réaction

### ResultsScreen.jsx
EMOJIS TEXTE :
- 😵 🐣 🤔 😅 🧐 🙂 😎 🧠 🔥 👑 🌟 lignes 23-33 — paliers rangs
- ❄️ 🔥 ⚡ ligne 45 — difficulté badge

### ExplorerResultsScreen.jsx / WTFRevealScreen
*(Voir ResultsScreen pour les patterns — mêmes rangs)*

### WTFWeeklyRevealScreen.jsx
EMOJIS TEXTE :
- ⭐ ligne 86 — VIP
- 🧠 ligne 138 — "Le saviez-vous"
- 🔥 ligne 163 — streak
- ✓ ligne 186 — ajouté collection
- 📤 ligne 197 — partager

ASSETS PNG :
- `/assets/categories/{category}.png` ligne 76

### WTFWeeklyTeaserScreen.jsx
EMOJIS TEXTE :
- ← ligne 46 — retour
- 🔒 ligne 95 — locked
- 🔓 ligne 120 — instruction
- 😎 🧠 🤯 🦊 ligne 127 — social proof
- 💙 🔥 ligne 146 — streak
- 🎯 ligne 168 — lancer

### PuzzleDuJourScreen.jsx
EMOJIS TEXTE :
- 🟩 🟥 ligne ~91 — share score Wordle-like
- 🧩 ligne ~118 — titre
- 🎉 ligne ~176 — succès
- 😢 ligne ~176 — échec
- 📤 ligne ~185 — partager

### RouteScreen.jsx
EMOJIS TEXTE :
- ← ligne 127 — retour
- 🗺️ ligne 128 — titre
- ⭐ lignes 133, 172 — niveau boss
- ✓ ligne 172 — niveau fait
- 👑 ligne 195 — boss victoire
- 🎉 ligne 195 — niveau clear
- 😢 ligne 195 — échec

### BlitzLobbyScreen.jsx
EMOJIS TEXTE :
- ← ligne 112 — retour
- ⚡ lignes 114, 276 — titre / GO
- 🏆 ligne 122 — record
- 🎲 ligne 160 — aléatoire
- 🔓 ligne 207 — instruction
- ⏳ ligne 213 — loading
- 😕 ligne 218 — pas de catégorie commune
- 🔒 ligne 252 — palier verrouillé

ASSETS PNG :
- `/assets/categories/{id}.png` ligne 190

### BlitzScreen.jsx
EMOJIS TEXTE :
- ⚡ ligne 119 — modal quitter
- ❌ ligne 184 — pénalité

### BlitzResultsScreen.jsx
EMOJIS TEXTE :
- 🏆 ligne 78 — "Légende Blitz"
- ⚡ ligne 79 — "Sans faute"
- 🔥 ligne 80 — "Impressionnant"
- 💪 ligne 81 — "Bien joué"
- 🎮 ligne 82 — "Continue"
- 🎯 ligne 139 — titre
- ✅ ligne 168 — défi envoyé
- ❌ ligne 194 — erreur
- 📤 ligne 185 — partager
- ⏳ ligne 198 — loading

### ChallengeScreen.jsx
EMOJIS TEXTE :
- 😕 lignes 99, 202 — erreur / pas assez
- 🎯 ligne 160 — titre défi
- ⏱️ ligne 179 — timer
- 🏆 ligne 113 — victoire
- 🎮 ligne 214 — jouer
- 🚀 ligne 229 — relever défi

### DuelHistoryScreen.jsx
EMOJIS TEXTE :
- ⏳ ligne 181 — en attente
- 💀 ligne 181 — expiré
- 🏆 ligne 181 — gagné
- 💔 ligne 181 — perdu
- 🤝 ligne 181 — égalité

### DuelSetupScreen.jsx
EMOJIS TEXTE :
- ⚙️ ligne 29 — réglages
- ← ligne 37 — retour
- 🎮 lignes 40, 115 — multijoueur / lancer
- 🎲 🙈 🏆 lignes 96-98 — règles
- ⚡ 🔥 🌿 💜 ⭐ 🌸 — options emoji joueurs (array PLAYER_EMOJIS)

### DuelPassScreen.jsx
EMOJIS TEXTE :
- 📱 ligne 15 — passer le tel

### DuelResultsScreen.jsx
EMOJIS TEXTE :
- 🤝 ligne 13 — égalité
- 🏆 ligne 13 — victoire
- 🥇 🥈 🥉 ligne 4 — médailles classement
- 🎉 ligne 45 — célébration
- 🎮 ligne 63 — rejouer
- 🏠 ligne 69 — accueil

### CategoryScreen.jsx
EMOJIS TEXTE :
- ← ligne 165 — retour
- 🎲 — tuile aléatoire

ASSETS PNG :
- `/assets/categories/{id}.png`

### DifficultyScreen.jsx
EMOJIS TEXTE :
- ← ligne 113 — retour
- ⏱️ ligne 55 — timer

ASSETS PNG :
- `/assets/ui/level-cool.png` ligne 22
- `/assets/ui/level-hot.png` ligne 30

### ModeLaunchScreen.jsx
EMOJIS TEXTE :
- ← ligne 42 — retour
- ✓ ligne 111 — checkbox

---

## 📁 src/pages/

### ProfilPage.jsx
EMOJIS TEXTE :
- ⚡ ligne 16 — Flash
- ⭐ ligne 17 — Quest
- 🗺️ ligne 18 — Explorer
- ⏱️ ligne 19 — Blitz
- 🔥 lignes 20, 166 — Hunt / streak
- 🎯 ligne 167 — taux réussite
- 🎮 ligne 168 — games played
- 🏆 ligne 169 — badges
- ← ligne 207 — retour
- 📷 ligne 242 — upload avatar
- ✨ lignes 250, 446 — cadres
- ✓ lignes 273, 482 — save / équipé
- ✗ ligne 274 — annuler
- ✏️ ligne 279 — éditer pseudo
- ✅ ligne 302 — vérifié
- 🎟️ ligne 338 — tickets
- 💡 ligne 339 — indices
- ⭐ ligne 352 — section étoile
- 🎭 ligne 357 — section cadre
- ✕ ligne 450 — fermer
- 🔒 ligne 486 — cadre locked

### SocialPage.jsx
EMOJIS TEXTE :
- 🌍 ligne 42 — toutes catégories
- 📚 ligne 43 — fallback cat
- 👋 ligne 209 — salutation
- ← ligne 228 — retour
- 👥 ligne 302 — section amis
- ⚔️ lignes 170, 411 — défi
- 📜 ligne 171 — historique
- ⚡ ligne 172 — records blitz
- 🗑️ ligne 173 — supprimer ami
- ✕ ligne 467 — refuser
- ➕ ligne 488 — nouveau défi
- 👑 ligne 533 — meilleur temps

### RecompensesPage.jsx
EMOJIS TEXTE :
- ← ligne 40 — retour
- 🏆 ligne 69 — section trophées
- ✅ lignes 146, 192 — badge gagné
- 🔒 lignes 147, 192 — badge verrouillé

ASSETS PNG :
- `/assets/categories/{catId}.png` ligne 103 — icônes catégories

### CollectionPage.jsx
EMOJIS TEXTE :
- ← ligne 194 — retour
- 🔒 ligne 291 — catégorie verrouillée
- 🏆 ligne 299 — catégorie complète

### BoutiquePage.jsx
EMOJIS TEXTE :
- 📦 lignes 35, 639 — Pack Découverte / reveal
- 🎁 lignes 36, 452 — Pack Standard / onglet
- 📂 ligne 37 — Pack Catégorie
- ✨ ligne 38 — Pack Premium
- 🏆 lignes 39, 832 — Pack Mega / palier
- 💡 ligne 523 — indices
- 🎟️ lignes 453, 549 — tickets / essentiels
- 👑 lignes 454, 678, 848 — abo / mega reveal
- 🔋 ligne 575 — énergie
- 🎰 ligne 500 — roulette
- 🛡️ ligne 750 — streak freeze
- ✓ ligne 809 — frame débloqué
- 💰 ligne 831 — coins pack
- ❓ ligne 405 — mystère reveal

### InvitePage.jsx
EMOJIS TEXTE :
- 😕 lignes 136, 167 — code invalide / erreur
- 🎉 ligne 151 — succès
- 🤝 ligne 156 — déjà amis
- 😅 ligne 161 — déjà envoyé

ASSETS PNG :
- `/assets/ui/wtf-logo.png` ligne 126
- avatar `inviter.avatar_url` ligne 99

---

## 📊 Tableau récapitulatif

| Emoji | Occurrences | Écrans/composants | Asset PNG équivalent |
|-------|-------------|-------------------|----------------------|
| 🔥 | ~30 | gameConfig, HowToPlayModal, badgeManager, ResultsScreen, RevelationScreen, ProfilPage, WTFWeeklyTeaser/Reveal, BlitzResults, DevPanel, AppModals | — |
| ⚡ | ~25 | gameConfig, HowToPlayModal, badgeManager, BlitzLobby/Screen/Results, SocialPage, ProfilPage, AppModals, DevPanel | — |
| 🎯 | ~18 | gameConfig, HowToPlayModal, badgeManager, ResultsScreen, RevelationScreen, ProfilPage, ChallengeScreen, BlitzResults, AppModals, WTFWeeklyTeaser | — |
| 🏆 | ~15 | AppRouter, gameConfig, HowToPlayModal, badgeManager, ResultsScreen (rangs), BlitzLobby/Results, ChallengeScreen, DuelHistory/Results, DuelSetup, CollectionPage, RecompensesPage, ProfilPage, BoutiquePage | — |
| 🪙 | ~12 | HowToPlayModal, AppModals | `icon-coins.png` |
| 💡 | ~12 | gameConfig, HowToPlayModal, badgeManager, ProfilPage, BoutiquePage, AppModals | `icon-hint.png` |
| 📚 | ~10 | AppRouter, gameConfig, HowToPlayModal, badgeManager, SocialPage, DevPanel | — |
| 👑 | ~10 | badgeManager, HowToPlayModal, ResultsScreen (rangs), RouteScreen, SocialPage, BoutiquePage, AppModals | — |
| 🎮 | ~9 | HowToPlayModal, badgeManager, ProfilPage, BlitzResults, ChallengeScreen, SettingsModal, DuelSetup, DuelResults | — |
| 🎫 | ~8 | gameConfig, HowToPlayModal, AppModals, App (modal) | — |
| 🎟️ | ~6 | ProfilPage, BoutiquePage, AppModals | `icon-tickets.png` |
| 📂 | ~6 | gameConfig, HowToPlayModal, badgeManager, BoutiquePage | — |
| 🔋 | ~6 | gameConfig, HowToPlayModal, BoutiquePage, AppModals | — |
| 📊 | ~6 | HowToPlayModal, DevPanel | — |
| ✅ | ~7 | HowToPlayModal, ConnectBanner, RecompensesPage, BlitzResults, ProfilPage, DevPanel | — |
| ❌ | ~6 | gameConfig, BlitzScreen, BlitzResults, DevPanel | — |
| ✓ | ~8 | QuestionScreen, RouteScreen, ModeLaunchScreen, HowToPlayModal, ProfilPage, BoutiquePage, DevPanel, WTFWeeklyReveal | — |
| ✕ | ~6 | GameHeader, SettingsModal, ProfilPage, SocialPage | — |
| ← | ~12 | RouteScreen, BlitzLobby, CategoryScreen, DifficultyScreen, ModeLaunchScreen, ProfilPage, SocialPage, RecompensesPage, CollectionPage, WTFWeeklyTeaser, DuelSetup | — |
| 🔒 | ~8 | HowToPlayModal, SettingsModal, RecompensesPage, CollectionPage, ProfilPage, BlitzLobby, WTFWeeklyTeaser | — |
| 🔓 | ~3 | ConnectBanner, BlitzLobby, WTFWeeklyTeaser | — |
| ❄️ | ~4 | gameConfig, HowToPlayModal, ResultsScreen (diff badge) | — |
| ⭐ | ~8 | gameConfig (Quest), badgeManager, HowToPlayModal, RouteScreen, WTFWeeklyReveal, ProfilPage, DuelSetup | — |
| 🌟 | ~4 | badgeManager, ResultsScreen (rang), RevelationScreen (correct msg) | — |
| 🥇 🥈 🥉 | 3 chacun | badgeManager, DuelResultsScreen | — |
| 👥 | ~6 | AppRouter, HowToPlayModal, badgeManager, SocialPage | — |
| ⚔️ | ~4 | badgeManager, SocialPage, DevPanel | — |
| 🤝 | ~5 | badgeManager, DuelHistory, DuelResults, InvitePage, HowToPlayModal | — |
| 🎁 | ~5 | HowToPlayModal, BoutiquePage (packs + onglet) | — |
| 📦 | ~5 | HowToPlayModal, BoutiquePage, DevPanel | — |
| ✨ | ~6 | HowToPlayModal, DevPanel, ProfilPage, BoutiquePage (packs), HomeScreen | — |
| 🎰 | ~4 | HowToPlayModal, BoutiquePage | — |
| 🛡️ | ~4 | HowToPlayModal, BoutiquePage, DevPanel | — |
| 🧠 | ~7 | HowToPlayModal, badgeManager, QuestionScreen, ResultsScreen, WTFWeeklyReveal/Teaser | — |
| 🤯 | ~5 | HowToPlayModal, RevelationScreen, WTFWeeklyTeaser, DevPanel | — |
| 😎 | ~4 | ResultsScreen (rang), RevelationScreen, WTFWeeklyTeaser | — |
| 😕 | ~5 | ChallengeScreen, BlitzLobby, InvitePage | — |
| 🎲 | ~5 | gameConfig, HowToPlayModal, BlitzLobby, CategoryScreen, DuelSetup | — |
| 🗺️ | ~4 | HowToPlayModal, RouteScreen, ProfilPage | — |
| ⏱️ | ~6 | gameConfig, HowToPlayModal, badgeManager, ChallengeScreen, DifficultyScreen, ProfilPage | — |
| 📤 | ~4 | SettingsModal, PuzzleDuJour, BlitzResults, WTFWeeklyReveal | — |
| 🎴 | ~4 | HowToPlayModal, AppModals | — |
| 🆓 | ~3 | gameConfig, HowToPlayModal, DevPanel | — |
| 🚫 | ~2 | gameConfig, HowToPlayModal | — |
| 🚀 | ~3 | badgeManager, AppModals, ChallengeScreen | — |
| 🏅 | ~3 | gameConfig, HowToPlayModal, badgeManager, AppModals | — |
| 💎 | ~3 | gameConfig, HowToPlayModal, badgeManager | — |
| 🧭 | 2 | gameConfig, HowToPlayModal | — |
| 💫 | 1 | badgeManager | — |
| 🎭 | 2 | badgeManager, ProfilPage | — |
| 😂 🤣 👏 | 1 chacun | badgeManager (Funny badges) | — |
| 🔰 | 1 | badgeManager | — |
| 💯 | 1 | badgeManager | — |
| 🕹️ 🎖️ | 1 chacun | badgeManager | — |
| 🌍 | 3 | HowToPlayModal, badgeManager, SocialPage | — |
| 🦁 | 2 | DevPanel | — |
| 📬 | 1 | DevPanel | — |
| 🔀 | 1 | DevPanel | — |
| 🎬 | 1 | DevPanel | — |
| 💳 | 1 | DevPanel | — |
| 📅 | 1 | DevPanel | — |
| 🛠️ | 1 | DevPanel | — |
| 🔧 | 1 | SettingsModal | — |
| 🛍️ | 1 | AppRouter | — |
| 🛒 | 3 | HowToPlayModal | — |
| 💰 | 2 | HowToPlayModal, BoutiquePage | — |
| 🔐 | 1 | HowToPlayModal | — |
| 🔗 | 1 | HowToPlayModal | — |
| 📱 | 2 | HowToPlayModal, DuelPassScreen | — |
| ⚙️ | 2 | HowToPlayModal, DuelSetup | — |
| 📖 | 3 | HowToPlayModal, SettingsModal, DevPanel | — |
| 📄 📋 | 1/2 | SettingsModal, HowToPlayModal, DevPanel | — |
| 🎓 | 1 | HowToPlayModal | — |
| 🔄 | 3 | HowToPlayModal | — |
| 📉 | 1 | HowToPlayModal | — |
| ⚠️ | 2 | HowToPlayModal, DevPanel | — |
| ♾️ | 1 | HowToPlayModal | — |
| ⏰ | 1 | HowToPlayModal | — |
| ⏳ | 3 | BlitzLobby, BlitzResults, DuelHistory, DevPanel | — |
| 💀 | 1 | DuelHistory | — |
| 💔 | 1 | DuelHistory | — |
| 👤 | 2 | HowToPlayModal, SettingsModal | — |
| 👋 | 1 | SocialPage | — |
| ✏️ | 2 | HowToPlayModal, ProfilPage | — |
| 📷 | 1 | ProfilPage | — |
| ➕ | 1 | SocialPage | — |
| 🗑️ | 1 | SocialPage | — |
| 📜 | 1 | SocialPage | — |
| 📡 | 1 | App.jsx | — |
| ❓ | 1 | BoutiquePage (reveal mystery) | — |
| 🧩 | 1 | PuzzleDuJourScreen | — |
| 🟩 🟥 | 1 chacun | PuzzleDuJour (partage Wordle) | — |
| 🎉 | 4 | PuzzleDuJour, RouteScreen, DuelResults, InvitePage | — |
| 😢 | 2 | PuzzleDuJour, RouteScreen | — |
| 🏠 | 1 | DuelResults | — |
| 🏃 | 1 | QuestionScreen | — |
| ✗ | 1 | QuestionScreen | — |
| 🙈 | 1 | DuelSetup | — |
| 🌿 💜 🌸 | 1 chacun | DuelSetup (PLAYER_EMOJIS) | — |
| 💪 | 3 | RevelationScreen, BlitzResults, ProfilPage | — |
| 👆 | 1 | RevelationScreen | — |
| 🌱 | 1 | RevelationScreen | — |
| 🔍 | 1 | RevelationScreen | — |
| 👁️ | 1 | RevelationScreen | — |
| 🎩 | 1 | RevelationScreen | — |
| 🌀 | 1 | RevelationScreen | — |
| 🦊 | 1 | WTFWeeklyTeaser | — |
| 💙 | 1 | WTFWeeklyTeaser | — |
| 😵 🐣 🤔 😅 🧐 🙂 | 1 chacun | ResultsScreen (paliers rangs) | — |

---

## 📌 Notes

1. **Total emojis uniques rendus** : ~100 caractères emoji distincts
2. **Fichiers denses** : `HowToPlayModal.jsx` (~70 emojis), `badgeManager.js` (~27 emojis), `BoutiquePage.jsx` (~20 emojis), `DevPanel.jsx` (~20 emojis)
3. **Assets PNG critiques à conserver** (équivalents icônes déjà utilisées) :
   - `icon-coins.png`, `icon-tickets.png`, `icon-hint.png`, `icon-settings.png` → remplacent 🪙 🎟️ 💡 ⚙️ dans GameHeader/HintFlipButton
   - `/assets/categories/{id}.png` (15 catégories) → icônes catégories
   - `/assets/ui/level-cool.png`, `level-hot.png` → remplacent ❄️ 🔥 dans DifficultyScreen
   - `quete.png`, `marathon.png`, `blitz.png`, `serie.png`, `multi.png` → HowToPlayModal pastilles modes
   - `wtf-logo.png`, `vof-logo.png`, `falkon-logo.png` → intros
4. **Priorité refonte Recraft.ai** (emojis les plus fréquents et emblématiques) :
   - **P1** : 🔥 ⚡ 🎯 🏆 — modes + rangs (30+ occurrences chacun)
   - **P2** : 👑 💎 ⭐ 🌟 — badges / prestige
   - **P3** : ⚔️ 👥 🤝 — social / duels
   - **P4** : 🎁 📦 🎰 ✨ — boutique / récompenses
5. **Emojis spécialisés** (non prioritaires refonte) : paliers rangs ResultsScreen (😵 🐣 🤔 🧐 🙂 😎), messages Revelation (🌀 👆 🎩 🔍 👁️), PLAYER_EMOJIS DuelSetup (🌿 💜 🌸), status duels (💀 💔 ⏳)
