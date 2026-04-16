Lis ce plan et exécute-le directement sans me demander de confirmation ni réexpliquer ce que tu vas faire.

CONTEXTE : Remplacement des 5 icônes de modes de jeu sur la HomeScreen + renommage No Limit → Race. Les 5 nouvelles icônes PNG sont dans /public/assets/modes/. Drop n'est pas concerné (il est placé ailleurs dans la HomeScreen, à côté de la roulette).

═══════════════════════════════════════
ÉTAPE 1 — RENOMMAGE NO LIMIT → RACE
═══════════════════════════════════════

Renommage complet dans tout le codebase :
- noLimit → race
- NoLimit → Race  
- NO_LIMIT → RACE
- noLimit_* → race_*
- NoLimitScreen → RaceScreen
- NO_LIMIT_CONFIG → RACE_CONFIG
- DIFFICULTY_LEVELS.NO_LIMIT → DIFFICULTY_LEVELS.RACE
- SCREENS.NO_LIMIT → SCREENS.RACE
- handleNoLimit → handleRace
- handleNoLimitStart → handleRaceStart
- getNoLimitFacts → getRaceFacts
- noLimitBestScore → raceBestScore (clé localStorage)
- statsByMode.no_limit → statsByMode.race

Strings UI visibles :
- "No Limit" → "Race" partout dans l'UI
- "Mode No Limit" → "Mode Race"
- Livret de règles : section No Limit → section Race

Fichiers :
- src/screens/NoLimitScreen.jsx → src/screens/RaceScreen.jsx (git mv)

CLAUDE.md :
- Section MAPPING DE RENOMMAGE : ajouter "No Limit → Race (16/04/2026)"
- Remplacer toutes les mentions de No Limit par Race

Migration localStorage one-shot :
- noLimitBestScore → raceBestScore
- statsByMode.no_limit → statsByMode.race

═══════════════════════════════════════
ÉTAPE 2 — REMPLACEMENT DES 5 ICÔNES
═══════════════════════════════════════

Les 5 nouveaux fichiers PNG sont déjà dans /public/assets/modes/ :

| Mode | Fichier | Ancien fichier à remplacer |
|---|---|---|
| Quickie | quickie.png | (déjà en place ou ancien snack.png) |
| Vrai ou Fou | vrai-ou-fou.png | (ancien vof.png ou équivalent) |
| Quest WTF! | quest.png | (ancien quest.png à remplacer) |
| Race | race.png | (ancien no-limit.png ou marathon.png) |
| Blitz | blitz.png | (ancien blitz.png à remplacer) |

Vérifie les noms exacts des fichiers dans /public/assets/modes/ et mets à jour les imports/références dans :
- HomeScreen.jsx (composant ModeIcon pour chaque mode)
- Tout fichier qui référence les anciens assets de modes

Supprime les anciens fichiers d'icônes qui ne sont plus utilisés (snack.png, no-limit.png, marathon.png, etc.)

═══════════════════════════════════════
ÉTAPE 3 — MISE À JOUR DES NOMS AFFICHÉS
═══════════════════════════════════════

Les labels sous les icônes sur la HomeScreen doivent afficher :
1. "Quickie" (violet pop #7F77DD)
2. "Vrai ou Fou" (vert/rouge)
3. "Quest WTF!" (or #FFD700)
4. "Race" (cyan glacial #00E5FF)
5. "Blitz" (rouge feu #FF1744)

Le 6ème mode (Drop) est positionné en haut de la HomeScreen à côté de la roulette, pas dans la grille des 5 modes.

═══════════════════════════════════════
ÉTAPE 4 — COULEURS DES CONTOURS/GLOW
═══════════════════════════════════════

Le composant ModeIcon utilise la prop `color` pour le contour et le glow. Vérifier que les couleurs sont correctes :
- Quickie : #7F77DD (violet pop)
- Vrai ou Fou : #6BCB77 (vert) — ou bicolore si possible
- Quest WTF! : #FFD700 (or shiny)
- Race : #00E5FF (cyan glacial)
- Blitz : #FF1744 (rouge feu)

═══════════════════════════════════════
VÉRIFICATION
═══════════════════════════════════════

- npm run build doit passer vert
- Aucune référence à "No Limit" / "noLimit" / "NO_LIMIT" dans le code (sauf commentaires d'historique)
- Les 5 icônes s'affichent correctement sur la HomeScreen avec le bon label et la bonne couleur de contour
- Le mode Race fonctionne comme l'ancien No Limit (même gameplay, juste renommé)
- Les anciens fichiers d'assets inutilisés sont supprimés

NE PAS POUSHER — Michael push manuellement après tests en local.