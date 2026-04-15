Lis ce plan et exécute les étapes 1 et 3. L'étape 2 = tu proposes sans exécuter, j'approuve avant.

**CONTEXTE** : Session stratégique du 15/04/2026. Refonte majeure des modes de jeu et de l'économie F2P. CLAUDE.md a été mis à jour avec toutes les nouvelles décisions. Lis-le intégralement avant de commencer — il contient le mapping de renommage, les 6 nouveaux modes, l'économie ×10, et les modes/concepts supprimés.

---

**ÉTAPE 1 — Renommage en 3 passes (à exécuter dans cet ordre)**

**Passe A — Suppression d'abord.** Supprime ou commente tout le code lié aux modes et concepts SUPPRIMÉS :
- L'ancien mode Quest (celui avec tickets + DifficultyScreen Cool/Hot) — handlers, configs, références
- Mode Série — handlers, configs, références
- Mode Multi — handlers, configs, références
- Les niveaux Cool/Hot/WTF! — constantes, DifficultyScreen, sélection niveau
- Les tickets comme devise — partout (storageHelper, gameConfig, handlers, UI)

**Passe B — Renommage ensuite.** Une fois que l'ancien Quest n'existe plus dans le code :
- flash/explorer/jouer → snack
- route/routeWtf → quest (sans risque de collision puisque l'ancien Quest est supprimé)
- hunt/puzzleDuJour → flash
- défiBlitz → blitzDefi

Renomme dans tout le codebase : variables, fonctions, commentaires, noms de fichiers, constantes, imports, routes.

**Passe C — Vérification.** Lance npm run build et corrige toute erreur. Ne push pas.

---

**ÉTAPE 2 — Audit complet + plan de migration (à proposer, NE PAS exécuter)**

Une fois le renommage fait, fais un audit complet du codebase et propose un plan de migration ordonné pour implémenter les 6 nouveaux modes avec l'économie ×10. Ton audit doit couvrir :

- Code mort restant à supprimer (fonctions orphelines, composants inutilisés, imports morts)
- Contradictions entre le code actuel et CLAUDE.md (valeurs économie, configs modes, gains, timers, QCM)
- Fichiers à créer (VraiOuFouScreen, MarathonScreen, nouveau QuestScreen, etc.)
- Fichiers à modifier (gameConfig, storageHelper, App.jsx, HomeScreen, factsService, answers.js, etc.)
- Migrations DB nécessaires (trigger nouveau joueur ×10, champs statement/statement_is_true, suppression tickets)
- Dépendances entre les tâches (ordre d'exécution)
- Estimation de complexité par tâche

Présente le plan sous forme de prompts numérotés (1 prompt = 1 fichier ou 1 sujet cohérent) que je pourrai t'envoyer un par un. Ne combine jamais plusieurs fichiers dans un même prompt.

---

**ÉTAPE 3 — Mise à jour Notion Tâches (à exécuter après l'étape 2)**

Lis la page Notion Tâches & Roadmap LIVE (https://www.notion.so/342b94ed8cb181a58710f3899cb4fb42). Puis mets-la à jour :

- **Supprimer** les tâches liées aux modes/concepts supprimés (ancien Quest avec tickets, Cool/Hot/WTF!, Série, Multi, Puzzle du Jour séparé, Hunt séparé)
- **Modifier** les tâches existantes qui référencent les anciens noms (flash→snack, route→quest, hunt→flash, etc.)
- **Ajouter** les nouvelles tâches issues de ton audit étape 2 (création VraiOuFouScreen, MarathonScreen, économie ×10, migration DB, champs statement, roulette, HomeScreen 6 modes, etc.)
- **Numéroter** et **prioriser** les tâches dans l'ordre d'exécution que tu as proposé à l'étape 2

Cette page est la source de vérité unique de ce qu'il reste à faire. Elle doit être cohérente avec CLAUDE.md et le plan de migration.