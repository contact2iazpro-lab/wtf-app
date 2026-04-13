# DECISIONS.md — Historique des décisions et raisonnements WTF!

## AUTORUN = true — Claude Code doit lire ce fichier au démarrage

---

## Principes directeurs de Michael

### Méthode de travail
- **AUDIT SEUL d'abord** — Ne JAMAIS faire "audit + fix" dans le même prompt. On audite, on analyse ensemble, PUIS on décide du fix. C'est la règle #1.
- **Pas de patch sur patch** — Si un fix ne marche pas, on ne refixe pas par-dessus. On audite en profondeur pour comprendre la vraie cause.
- **Nettoyer avant d'ajouter** — Toujours supprimer l'ancien code avant d'ajouter du nouveau. Sinon les deux coexistent et créent des bugs.
- **Un prompt = un fichier = une modification** — Ne pas combiner sauf si explicitement demandé.
- **Proposer, ne pas coder** — Pour les questions techniques/architecturales, proposer des options et laisser Michael décider. Ne pas choisir à sa place.

### Philosophie produit
- **Business first** — Chaque décision technique sert un objectif business (monétisation, rétention, acquisition).
- **Benchmarker** — Toujours référencer Trivia Crack, QuizzLand, Duolingo, Clash Royale avant de recommander.
- **MVP first** — Toujours prioriser le minimum viable, polish ensuite.
- **WTF First** — Le joueur doit vivre un "WTF!" avant toute explication UI.

---

## Décisions architecturales

### D46 — VIP vs Funny (DÉFINITIF)
**Question** : Quelle est la différence entre VIP et Generated ?
**Réponse** : VIP et Generated sont des termes DIFFÉRENTS.
- **VIP** (is_vip=true) = classification GAMEPLAY. Un fact VIP ne peut être découvert qu'en Quest ou Hunt.
- **Funny** (is_vip=false) = classification GAMEPLAY. Un fact Funny est jouable en Explorer, Flash.
- **Generated** = ORIGINE du fact (généré par IA vs jeu physique). L'origine n'a AUCUN impact sur le gameplay.
- Un fact généré par IA peut être VIP. Un fact du jeu physique peut être Funny. C'est Michael qui décide dans l'Admin Tool.
**Renommage dans le code** : getGeneratedFacts() → getFunnyFacts()

### D48 — TutoTunnel isolé
**Question** : Comment gérer le tutoriel ?
**Réponse** : Le tuto est un composant 100% autonome (TutoTunnel.jsx) qui ne partage RIEN avec le jeu normal.
**Raison** : On a perdu des jours entiers à patcher l'onboarding dans App.jsx. Les conditions if/else du tuto interféraient avec le jeu normal. La seule solution pérenne est un tunnel isolé.
**Principe** : App.jsx fait un seul check : si onboardingCompleted=false → affiche TutoTunnel. Sinon → jeu normal. Les deux ne se touchent JAMAIS.

### D49 — 11 facts tuto centralisés
**Question** : D'où viennent les facts du tuto ?
**Réponse** : 11 facts hardcodés dans gameConfig.js : [189, 127, 61, 92, 350, 6, 10, 109, 301, 45, 174]. Tous VIP, tous dans les 5 catégories de départ. 1 pour Phase 0, 5 pour Flash, 5 pour Quest.
**Raison** : Élimine toute dépendance à Supabase ou au cache local pendant le tuto. Expérience identique pour tous.

### D50 — Templates UI
**Question** : Comment réutiliser le design du jeu dans le tuto sans importer les vrais composants ?
**Réponse** : Créer des templates purement visuels (QuestionTemplate.jsx, RevelationTemplate.jsx) qui sont des squelettes sans logique. Le tuto ET le jeu normal branchent dessus.
**Raison** : Les vrais QuestionScreen/RevelationScreen ont des overlays, z-index, lightbox etc. qui interféraient avec le TutoTunnel quand on les importait.

---

## Décisions gameplay

### D42 — Facts différents en Blitz défi = BY DESIGN
**Question** : Les 2 joueurs d'un défi Blitz jouent-ils les mêmes facts ?
**Réponse** : NON. Chaque joueur joue ses facts débloqués. Le défi compare la RAPIDITÉ, pas les mêmes questions.
**Raison** : Le Blitz se joue sur les facts que le joueur connaît déjà (débloqués). Chaque joueur a un pool différent.

### D44 — Skip tuto = 25 coins, 1 ticket, 3 indices
**Question** : Que reçoit un joueur qui skip le tuto ?
**Réponse** : 25 coins (assez pour 1 ticket), 1 ticket (1 Quest immédiate), 3 indices. Tous les modes accessibles.
**Raison** : Le joueur qui skip veut jouer tout de suite. 1 ticket = 1 Quest possible.

### Timer Explorer = 30 secondes
**Question** : Quel timer pour Explorer ?
**Réponse** : 30 secondes (pas 20). Explorer est un mode découverte, pas un mode speed.

### Déblocage Explorer
**Question** : Quand Explorer se débloque-t-il ?
**Réponse** : Après 1 parcours Quest (statsByMode.parcours.gamesPlayed >= 1). PAS après "5 parties jouées".

### 5 catégories de départ
**Question** : Quelles catégories sont disponibles au lancement ?
**Réponse** : sport, records, animaux, kids, definition. Les autres se débloquent quand le joueur découvre un fact d'une nouvelle catégorie.

### Musique OFF par défaut
**Question** : La musique démarre-t-elle automatiquement ?
**Réponse** : NON. Musique off par défaut. Le joueur l'active dans les paramètres.

### CategoryScreen Explorer = catégories débloquées uniquement
**Question** : Quelles catégories apparaissent en Explorer ?
**Réponse** : Seulement les catégories débloquées (unlockedCategories) + Aléatoire. Les non-débloquées sont absentes (pas grisées, absentes).

### Mode Aléatoire = toutes les catégories
**Question** : Le mode Aléatoire en Explorer pioche dans quelles catégories ?
**Réponse** : TOUTES les catégories Funny. C'est comme ça qu'un joueur peut tomber sur un fact d'une catégorie non débloquée et la débloquer.

### Flash = mêmes catégories qu'Explorer
**Question** : Les catégories du mode Flash sont-elles différentes d'Explorer ?
**Réponse** : NON. Flash utilise les mêmes catégories que Explorer (unlockedCategories).

---

## Décisions techniques

### Contexte React pour données partagées
**Question** : Comment passer les données de progression (unlock, gamesPlayed, etc.) aux composants ?
**Réponse** : Option B — Contexte React (UnlockContext). Pas de props drilling, pas de duplication localStorage.

### Navbar unifiée
**Question** : Pourquoi la navbar des pages secondaires ne respecte-t-elle pas les mêmes conditions de verrouillage que la Home ?
**Réponse** : HomeScreen a sa propre navbar inline avec des conditions de verrouillage. Les pages secondaires utilisent BottomNav.jsx sans ces conditions. Il faut unifier via UnlockContext.

### Trophées débloqués à 2 parties
**Question** : gamesPlayed >= 2 ou >= 3 pour les Trophées ?
**Réponse** : gamesPlayed >= 2. Le message doit dire "Joue 2 parties" (pas 3).

### Collection débloquée par Quest
**Question** : Quelle source déverrouille Collection ?
**Réponse** : statsByMode.parcours.gamesPlayed >= 1 (au moins 1 Quest jouée).

### Notifications Amis dans navbar
**Question** : Comment gérer les badges de notification dans BottomNav ?
**Réponse** : Via le même UnlockContext. Passer socialNotifCount et pendingChallengesCount.

### Spotlight onboarding dans navbar
**Question** : BottomNav doit-elle gérer les spotlights du tuto ?
**Réponse** : NON. Simplifier. Le spotlight est géré par TutoTunnel uniquement. BottomNav n'a pas besoin de spotlights.

### DifficultyScreen et MODE_CONFIGS = dynamiques
**Question** : Les valeurs de QCM, timer, coins sont-elles hardcodées ?
**Réponse** : NON. Tout vient de gameConfig.js (DIFFICULTY_LEVELS). DifficultyScreen et MODE_CONFIGS lisent depuis cette source unique.

### Worktrees = INTERDITS
**Question** : Peut-on utiliser des worktrees git ?
**Réponse** : JAMAIS. Les worktrees créaient des merges fantômes. Tout se fait sur master directement.

### Deploy = Railway uniquement
**Question** : Vercel ou Railway ?
**Réponse** : Railway UNIQUEMENT. Push sur master → Railway rebuild automatiquement. Vercel est déconnecté.

---

## FAQ — Questions que Claude Code peut trancher seul

### "Quel modèle utiliser pour les nouveaux facts ?"
→ Tous les faits utilisent les mêmes composants. La distinction est is_vip dans la base, pas le composant.

### "Faut-il ajouter un console.log pour debug ?"
→ Oui pour diagnostiquer, mais TOUJOURS les supprimer avant de push.

### "Un fix ne marche pas, je refixe ?"
→ NON. Audit d'abord. Comprendre pourquoi le fix n'a pas marché. Puis proposer un nouveau fix basé sur l'audit.

### "Je modifie App.jsx et un autre fichier dans le même prompt ?"
→ NON sauf demande explicite de Michael. Un prompt = un fichier.

### "Le joueur est bloqué dans un état hybride tuto/jeu ?"
→ Si onboardingCompleted est false et le joueur n'est pas dans le TutoTunnel, forcer onboardingCompleted=true avec les devises de skip (25c/1t/3i).

### "Quelle fonction pour les facts Explorer ?"
→ getFunnyFacts() — les facts avec is_vip=false.

### "Quelle fonction pour les facts Quest ?"
→ getVipFacts() — les facts avec is_vip=true.

### "Quelle fonction pour les facts Blitz ?"
→ getBlitzFacts() — les facts débloqués du joueur (VIP + Funny confondus).

### "Le scoring doit afficher quoi sur RevelationScreen ?"
→ Le cumul de la SESSION (sessionScore), PAS le solde global du joueur (playerCoins).
