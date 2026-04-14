AUTORUN: Toujours appliquer les modifications sans demander confirmation. Ne jamais créer de worktree ni de branche. Travailler directement sur master.

# WTF! — What The F*ct

## Projet
- App mobile trivia basée sur un jeu physique validé (350 cartes)
- URL prod : https://wtf-app-production.up.railway.app/
- Stack : React + Vite + Supabase + Tailwind + Nunito
- Deploy : Railway auto sur push master

## 🛠️ Déploiements & Environnements

### ⚠️ Admin-Tool ≠ Game
L'**admin-tool** (gestion Supabase, création facts, audit) est un **système complètement séparé** du jeu principal.

| Aspect | Game (wtf-app) | Admin-Tool |
|--------|-------|---------|
| **Codebase** | Ce repo (src/) | Repo séparé (ne pas mélanger) |
| **Clé Supabase** | `VITE_SUPABASE_ANON_KEY` (RLS) | `VITE_SUPABASE_SERVICE_KEY` (bypass RLS) |
| **Deploy** | Railway auto (push master) | Déploiement manuel, sous-domaine privé |
| **Visibility** | Public (production.up.railway.app) | Privée (accès dev/admin uniquement) |
| **Bundle** | Jamais exposer service_key | Jamais inclure dans client principal |

**Règle d'or** : Ne JAMAIS mélanger les clés ou les déploiements. Admin-tool = séparation totale d'infra.

**En cas de doute** : Vérifier que `.env.local` contient UNIQUEMENT `VITE_SUPABASE_ANON_KEY`, jamais `SERVICE_KEY`.

### Phase A — Architecture Data (2026-04-12)

**État actuel** : Partiellement implémentée
- ✅ Realtime subscriptions (friendships, challenges, duels)
- ✅ RLS policies simplifiées (4 policies au lieu de 12)
- ✅ Console warnings fixés (React setState, Supabase 406, favicon)
- ✅ Race condition fix (ChallengeScreen waits for facts init)
- ✅ **Mode Défi Blitz** : 3 bloquants fermés (2026-04-13)
  - ✅ Catégorie choisie avant créer défi
  - ✅ Ticket débité APRÈS createDuelRound() (pas avant jeu)
  - ✅ TRIGGER SQL pour calculer winner_id
- ✅ **Bloc 1 — Mode Défi finalisé (2026-04-14)** : 5 bugs fermés
  - ✅ Auto-relever sur son propre défi : bug `isMe1` corrigé (dérivé du round, plus du duel normalisé alphabétiquement)
  - ✅ Refus revanche persistant Supabase : colonne `challenges.declined_by uuid[]` + RPC `decline_round` (migration `add_declined_by_to_challenges.sql`)
  - ✅ Revanche mêmes conditions : `startCreateDefi(friendId, categoryId, questionCount)` skip BlitzLobby et relance directement
  - ✅ Pénalité erreur défi : +5s (aligné mode Blitz solo, décision C9)
  - ✅ Pré-check créateur : amitié `accepted` + opposant ≥5 facts dans la catégorie avant création (BlitzLobbyScreen filtre cross-collections)
- ✅ **Bloc 2 — Fix logique critiques (2026-04-14)** : 5 bugs fermés
  - ✅ **2.6** Énergie cap 5/5 : `INITIAL_STOCK 3→5`, label HomeScreen `/3→/5`, 5 barres d'énergie au lieu de 3
  - ✅ **2.7** Pulse "NEW" persistant Supabase : `flags.seenModes` push via `mergeFlags()` + dépoté au `pullFromServer()` (cross-device)
  - ✅ **2.8** Trophées replay corrigé : `flags.badgesEarned` push via `mergeFlags()` après `checkBadges()` (Blitz + Quest), dépoté au pull
  - ✅ **2.9** Nouveau joueur 50 coins (C10) : aligné trigger DB + AuthContext.createProfile + storageHelper fallback + ProfilPage reset + App init/resetOnboarding
  - ✅ **2.10** Modal ami SocialPage : croix ✕ remplacée par bouton ⋯ ouvrant bottom-sheet 4 actions (Lancer défi · Historique · Records · Supprimer)
- ✅ **Bloc 3 — Économie & UX (2026-04-14)** : 7 items fermés
  - ✅ **3.1** CategoryScreen Explorer/Flash : `unlockedPerCategory` itère `factsPool` (Funny only) — ratio plafonné à 100%
  - ✅ **3.2** CollectionPage : `Complété !` → `Complété ! X/X f*cts`
  - ✅ **3.3** Paliers Blitz : 5/10/20/30/**50/100** (40 retiré) — gameConfig + HowToPlayModal alignés
  - ✅ **3.4** BlitzResultsScreen : layout fullscreen flex (content + footer pinned, plus de scroll)
  - ✅ **3.5** RouletteModal T95 : avg coins/spin 7,1→5,44 (segments 10→8, 20→15, 50→30, weights ajustés)
  - ✅ **3.6** Vibreur moments clés : `audio.vibrate()` sur ResultsScreen (perfect long), BlitzResultsScreen (record long), ChallengeScreen (victoire défi long)
  - ✅ **3.7** Déblocage catégorie payante : tuile lockée Flash/Explorer ouvre modal confirm 100 coins → unlock 1 funny random + applyCurrencyDelta + sélection auto
- 🔧 **unlockedFacts infra** : Colonne Supabase préparée, code reste en localStorage (migration non-commencée, voir Architecture Data)

## ⚠️ Sécurité — ne jamais exposer dans le bundle client
Toute variable préfixée `VITE_` est inlinée dans le JS public et lisible via DevTools.
**Interdit dans le build principal** : `VITE_SUPABASE_SERVICE_KEY`, `VITE_ADMIN_PASSWORD`,
`VITE_ANTHROPIC_KEY`, ou toute clé qui bypasse RLS / coûte de l'argent API.
Le client principal utilise uniquement `VITE_SUPABASE_ANON_KEY` + RLS Supabase.
L'admin-tool (clé service_role) doit être déployé **en isolation** (service Railway
séparé, sous-domaine privé, ou en local uniquement).

## Règles absolues
1. Ne JAMAIS pusher automatiquement — commit local uniquement
2. Attendre confirmation explicite avant tout git push
3. Un prompt = un fichier cible = une modification
4. Toujours travailler sur master directement
5. Si une branche de preview est créée → merger sur master immédiatement
6. Branche unique : ne jamais créer de nouvelle branche. Si Claude Code crée une branche automatiquement → merger immédiatement sur master et supprimer la branche.

## Vocabulaire officiel
- fact/fait → f*ct | facts → f*cts
- WTF toujours avec ! (sauf "What The F*ct")
- Niveaux : Cool | Hot | WTF!
- Streak → Série | Mode Parcours → Quête WTF!
- Ratées → À découvrir
- Ratées → À découvrir

## Règles de jeu — Source de vérité (11/04/2026)

### Niveaux Quest (2 niveaux — WTF! retiré le 12/04/2026)

| Niveau | QCM | Timer | Indices gratuits | Indice payant | Coins/bonne réponse |
|--------|-----|-------|------------------|---------------|---------------------|
| Cool   | 2   | 20s   | 2                | +1 (8 coins)  | 2                   |
| Hot    | 4   | 30s   | 2                | +1 (8 coins)  | 2                   |

**Note** : Cool a 20s (court) car 2 QCM uniquement, Hot a 30s (plus long) car 4 QCM à lire.

### Mode Flash (Jouer)

| Paramètre | Valeur |
|-----------|--------|
| Coût | 1 énergie (3 gratuites/jour, +10 coins/extra) |
| Questions | 5 |
| QCM | 4 choix |
| Timer | 20s |
| Catégorie | **Aléatoire uniquement** (pas de CategoryScreen) |
| Coins | 2 coins/bonne réponse |
| Contenu | Funny facts uniquement (catégories débloquées) |
| Sauvegarde | F*cts débloqués immédiatement |

### Mode Explorer

| Paramètre | Valeur |
|-----------|--------|
| Coût | 1 énergie (3 gratuites/jour, +10 coins/extra) |
| Questions | 5 |
| QCM | 4 choix |
| Timer | 20s |
| Catégorie | **Choix obligatoire** (pas d'aléatoire) |
| Coins | 1 coin/bonne réponse (catégorie choisie) |
| Contenu | Funny facts uniquement (catégories débloquées) |
| Sauvegarde | F*cts débloqués immédiatement |

### Mode Blitz

| Paramètre | Valeur |
|-----------|--------|
| Coût | Gratuit illimité |
| Timer | 60s chrono descendant |
| QCM | 4 choix |
| Indices | Aucun |
| Coins | 0 (prestige uniquement) |
| Paliers | 5, 10, 20, 30, 40, 50 questions |
| Contenu | **Tous** les f*cts débloqués du joueur (VIP + Funny) |

### Mode Hunt (WTF de la Semaine)

| Paramètre | Valeur |
|-----------|--------|
| Coût | Gratuit, 1×/semaine (dimanche) |
| Questions | 5 |
| QCM | 4 choix |
| Timer | 20s |
| Indices | 2 (stock gratuit) |
| Sélection fact | Seed ISO-week : fact stable lundi→dimanche |
| Objectif | Débloquer le WTF! VIP de la semaine |

### Mode Puzzle du Jour

| Paramètre | Valeur |
|-----------|--------|
| Coût | Gratuit, 1×/jour |
| Questions | 1 funny fact (4 QCM) |
| Tentatives | 3 (erreur = élimine une option) |
| Coins | 6 / 4 / 2 selon tentatives restantes |
| Contenu | Funny fact seed sur la date |
| Partage | Format Wordle (🟩🟥) |

### Mode Route WTF!

| Paramètre | Valeur |
|-----------|--------|
| Coût | Gratuit illimité |
| Structure | Niveaux infinis (3 Q funny) |
| Boss | Tous les 10 niveaux (1 Q VIP HOT) |
| Coins | 6 / niveau · 20 / boss |
| Persistance | wtf_data.route = { level, stars } |
| Avancement | Niveau parfait requis |

### Mode Amis & Défis Blitz (Option A — Asynchrone)

| Paramètre | Valeur |
|-----------|--------|
| **Concept** | Joueur A lance un Blitz, défie un ami B. B joue à son rythme, meilleur temps gagne. |
| Coût A | 1 ticket pour créer le défi |
| Coût B | Gratuit pour relever |
| Questions | Même nombre, **affirmations différentes** (seed aléatoire) |
| Catégorie | Choisie par A, B doit en avoir min 5 facts |
| Timer | 10s par affirmation |
| Pénalité erreur | **+5 secondes** (décision C9 — 2026-04-14, aligné avec mode Blitz solo) |
| Gagnant | Meilleur temps (le plus bas) |
| Expiration | 48h (expires_at vérifié client-side) |
| Notifications | Realtime Supabase sur `friendships`, `challenges`, `duels` |

**Flow exact :**
1. A joue Blitz classique (catégorie choisie) → `handleBlitzFinish` → `createDuelRound()`
2. DB : `challenges` INSERT (status='pending', code='ABC123', player1_time=X)
3. A reçoit lien : `/challenge/ABC123` → share via SMS/WhatsApp
4. B ouvre lien → ChallengeScreen : "A t'a défié ! Temps : Xs" → clique "Relever"
5. B joue même catégorie, même nb questions → `handleBlitzFinish` avec mode='accept'
6. DB : `challenges` UPDATE (player2_time=Y, status='completed') + TRIGGER winner_id
7. ChallengeScreen : affichage résultats côte à côte (temps + gagnant)

### Système Amis — Règles Complètes

**Tables Supabase :**
- `friend_codes` : { user_id, code (8 chars unique), display_name, avatar_url }
- `friendships` : { id, user1_id, user2_id, status ('pending'|'accepted'|'blocked'), created_at, accepted_at }

**Flow d'ajout d'ami (Michael → 2iaz) :**
1. Michael ouvre SocialPage → voit son Friend Code (ex: `A2B3C4D5`)
2. Michael clique "Inviter un ami" → partage lien `/invite/A2B3C4D5`
3. Michael envoie lien à 2iaz
4. 2iaz clique lien → InvitePage traite : lookup friend_codes, crée friendship(status='accepted')
5. ✅ Ils sont amis (Realtime update sur les deux clients)

**Statuts d'amitié :**
- `pending` : invitation en attente (2iaz doit accepter)
- `accepted` : amis confirmés, peuvent se défier
- `blocked` : impossible de défier

**Vérifications avant défi :**
- Statut amitié = `accepted`
- Player 2 a min 5 facts dans la catégorie
- Player 1 a 1 ticket
- Défi pas expiré (expires_at < now)

### Architecture DuelContext & Realtime

**Files clés :**
- `src/features/duels/context/DuelContext.jsx` : provider, pendingDuel state
- `src/features/duels/hooks/useFriends.js` : friends + pendingRequests + Realtime
- `src/features/duels/hooks/useDuels.js` : duels/challenges + Realtime
- `src/data/friendService.js` : CRUD amis (sendFriendRequest, acceptFriendRequest, etc.)
- `src/data/duelService.js` : CRUD défis (createDuelRound, completeDuelRound, etc.)

**pendingDuel mémoire :**
```javascript
{
  mode: 'create' | 'accept',        // Créateur ou accepteur
  opponentId: uuid,                 // Ami défié/défiant
  roundId: uuid,                    // challenges.id
  code: '6char',                    // Code défi partageé
  facts: [...]                      // Facts prépréparés (mode='accept' only)
}
```

**Realtime subscriptions (auto via hooks) :**
- `friendships` → change → refresh useFriends
- `challenges` → change → refresh useDuels → refresh UI

### Économie F2P — Source de vérité unique

| Paramètre | Valeur |
|-----------|--------|
| **Nouveau joueur** | **50 coins / 1 ticket / 3 indices / 5 énergies** (décision C10 — 2026-04-14) |
| Énergie max (stock) | 5 (achat boutique peut dépasser, pas de régén au-dessus) |
| Régénération énergie | +1 toutes les 8h jusqu'au cap de 5 (modèle stock persistant) |
| 1 ticket (boutique) | 25 coins |
| 1 indice (boutique) | 10 coins |
| 3 indices (boutique) | 30 coins |
| 5 indices (boutique) | 45 coins (-10%) |
| Pack Découverte (mystery) | 15 coins → 2 funny f*cts |
| Pack Standard (mystery) | 35 coins → 5 funny f*cts |
| Pack Catégorie (mystery) | 40 coins → 4 funny d'une catégorie au choix |
| Pack Premium (mystery) | 80 coins → 7 f*cts avec 5% chance VIP chacun |
| Pack Mega (mystery) | 150 coins → 12 f*cts + 1 VIP garanti |
| Streak J1 | 2 coins |
| Streak J3 | 2 indices |
| Streak J7 | 10 coins + 1 ticket + badge |
| Streak J14 | 1 ticket + 3 indices |
| Streak J30 | Pack WTF Premium (unlock 10 f*cts random) |
| Gains journaliers cible | 30-50 coins/jour |
| TTF (sessions avant achat) | ~3 sessions Flash |
| **Profil F2P choisi** | **Équilibré** — 1 achat stratégique/semaine (pack facts ou tickets), casual mobile (décidé 2026-04-12) |

**Cette table est la SEULE source de vérité.** Toute divergence (trigger DB, code client, defaults de colonne, fallbacks, resets) doit être alignée ici. Points de convergence actuels :
- Trigger DB `handle_new_user` : 50/1/3/5 ✅ (migration `update_handle_new_user_F2P.sql`)
- `AuthContext.createProfile` : 50/1/3/5 ✅
- `App.jsx` init `wtf_data` : 50/1/3/— (energy géré séparément) ✅
- `App.jsx resetOnboarding` : 50/1/3/— ✅
- `storageHelper.js` fallback : 50/1/3/— ✅
- `ProfilPage.jsx executeReset` : 50/1/3/5 ✅

### Règles communes
- Indices = chaque utilisation débite 1 du stock (pas d'indices gratuits)
- Indice non disponible si stock vide : bouton grisé, JAMAIS de pause du timer
- Questions par Quête : 5 (valeur officielle)
- Pas de bonus perfect (ni Quest ni Jouer)

## Modes de jeu — Résumé

| Mode | Contenu | Coût | Gains | Statut |
|------|---------|------|-------|--------|
| Quête WTF! | WTF VIP | 1 ticket | Coins + f*cts VIP | Actif |
| Jouer (Flash) | F*cts générés | Gratuit (3/j partagé Explorer) | Coins + f*cts générés | Actif |
| Explorer | F*cts générés | Gratuit (3/j partagé Flash) | Coins + f*cts générés | Actif |
| Blitz | F*cts débloqués | Gratuit | Prestige (records) | Actif |
| Hunt | WTF VIP | Gratuit 1×/semaine | 1 f*ct VIP | Actif |
| Puzzle du Jour | F*ct funny daily | Gratuit 1×/jour | 6/4/2 coins | Actif |
| Route WTF! | F*cts funny + VIP boss | Gratuit illimité | 6/niveau + 20/boss | Actif |
| Série | F*cts générés | Gratuit | Multiplicateur coins | V2 |
| Multi | À définir | À définir | À définir | V2 |

## Architecture contenu
- **WTF VIP** (~483) : f*cts originaux du jeu physique → Quête (source unique de déblocage VIP) + **Blitz** (une fois débloqués)
- **F*cts générés** (~676 et croissant) : générés par IA → Jouer, Explorer, Hunt, Puzzle, Route + **Blitz** (une fois débloqués)
- *Comptes au 2026-04-14 (décision C12). Évoluent au fil de la génération admin-tool — chiffres indicatifs, pas une source de vérité.*
- **Blitz** pioche dans TOUS les f*cts déjà débloqués (VIP + Funny confondus)
- Collection : 2 onglets (WTF! + Funny F*cts)

## Architecture Data — Règle d'or (décidée 2026-04-12)

**Principe** : Supabase = source de vérité pour tout ce qui "compte". localStorage = cache optimiste stale-while-revalidate. React state = UI éphémère.

### Répartition des entités

**Supabase (canonique)** — toute mutation passe par RPC ou Edge Function, jamais d'écriture localStorage directe :
- coins, tickets, indices, énergie ✅
- **unlockedFacts (set d'IDs)** 🔧 *Colonne infra préparée, code reste en localStorage — migration non-commencée*
- streak (jour courant + historique) ⏳
- badges / trophées ⏳
- blitzRecords (meilleurs temps par catégorie/palier) ⏳
- Route WTF! progress (level, stars) ⏳
- coffres réclamés (dimanche WTF + daily) ⏳
- stats par mode (gamesPlayed, totalCorrect, bestStreak…) ⏳
- duels / challenges / friendships ✅ (Realtime subscriptions opérationnelles)

**localStorage (source de vérité jusqu'à Phase A complet)** :
- onboardingCompleted, tutoStep, skip_launch_*
- son on/off, thème, mode dev/test
- **unlockedFacts** ✅ *Source actuelle de vérité pour les f*cts débloqués. Sera migrée vers Supabase quand Phase A unlockedFacts sera complète*
- wtf_cached_friends (pur cache de l'entité Supabase)

**React state (éphémère)** :
- écran courant, modals ouverts
- session de jeu en cours (questions, score)

### Règles de lecture (cache stale-while-revalidate)

- Tout hook `useSupabaseResource` lit le cache localStorage en premier (affichage immédiat, pas de flash)
- Fetch silencieux en arrière-plan sur mount + reconnexion réseau
- Mise à jour du cache + re-render quand le serveur répond
- Si pas de cache (nouveau device) → skeleton `—` sur la valeur, pas de blocage global de la page

### Règles de mutation

- **Aucune écriture directe** à `players.coins`, `wtf_data.unlockedFacts`, etc. depuis le client
- Toutes les mutations passent par :
  - **RPC Supabase** pour les mutations triviales (markSeen, setTutoStep)
  - **Edge Function** pour les mutations à valeur (apply_currency_delta, unlock_fact) avec validation anti-triche
- Optimistic update local immédiat, réconciliation au retour serveur
- En cas d'erreur : retry automatique 3× avec backoff exponentiel, puis toast + rollback
- Si erreur = validation refusée (triche détectée) : rollback immédiat, pas de retry, log serveur

### Résolution des conflits multi-device

- **Entités additives** (coins, tickets, unlockedFacts) : deltas envoyés au serveur, addition atomique côté SQL. Aucune perte possible.
- **Entités scalaires** (préférences UI) : last-write-wins, stockées uniquement en localStorage de toute façon.
- **Jamais** de version vector ou CRDT — trop complexe pour le gain.

### Offline

- Modes solo (Flash, Quest, Blitz, Explorer, Puzzle, Route) : jouables offline. Les mutations sont **mises en queue** (`wtf_mutation_queue` localStorage) et rejouées au retour en ligne.
- Edge Function valide les deltas avec timestamp — un burst de 10 mutations "gagner 2 coins" dans la même seconde est refusé (anti-triche offline).
- Modes nécessitant réseau (Défi, Hunt si fact non pré-fetché) : écran "connexion requise".

### Auth anonyme

- Premier mount : création automatique d'un user anonyme via `supabase.auth.signInAnonymously()`.
- Toutes les features (économie, collection, records) fonctionnent dès la première seconde, attachées à ce user_id anonyme.
- Upgrade vers Google/Apple : `supabase.auth.linkIdentity()` — préserve user_id et toutes les données.
- Plus jamais de "non connecté = 100% local, sync ignoré".

### Mode dev / test

- Mode dev = **local-only bypass** : ne sync rien vers Supabase, permet de tester l'UI sans polluer la base.
- Mode test = **compte dédié** pour QA (même flow que joueur normal, données persistées, user réservé).
- Jamais de header "dev" qui bypasse l'Edge Function en prod — porte ouverte trop dangereuse.

### Migration des joueurs existants

- Au premier mount après déploiement Phase B : RPC `seed_from_local(payload)` one-shot.
- Edge Function plafonne : coins ≤ 500, unlockedFacts ≤ 50 (max réaliste early-game).
- Flag `wtf_data.seeded = true` pour ne jamais reseeder.
- Après seed : localStorage écomomie devient pur cache, plus source.

## Design system
- Police : Nunito (400/700/900) via Google Fonts
- Couleur principale : #FF6B1A (orange WTF!)
- Fond écrans jeu : linear-gradient(160deg, {couleurCatégorie}22, {couleurCatégorie})
- CoinsIcon : src/components/CoinsIcon.jsx
- Scaling responsive : useScale hook — base iPhone SE 375×667px
- Formule : Math.min(window.innerHeight/667, window.innerWidth/375)
- Toutes les tailles : calc(Xpx * var(--scale))
- Règle isLightColor : texte #1a1a1a sur fond clair, #ffffff sur fond sombre

### Couleurs des catégories (source unique : src/data/facts.js)
| Catégorie | Couleur | Catégorie | Couleur |
|-----------|---------|-----------|---------|
| Animaux | #6BCB77 | Lois | #6366B8 |
| Animaux Marins | #40B4D8 | Musique | #E84B8A |
| Animaux Terrestres | #E8712A | Mythologie | #C8A84B |
| Architecture | #A0826D | Phobies | #7B5EA7 |
| Art | #A07CD8 | Politique | #B24B4B |
| Célébrités | #FFD700 | Psychologie | #8E44AD |
| Cinéma | #D4AF37 | Records | #E8B84B |
| Corps Humain | #F07070 | Santé | #90F090 |
| Crimes | #8B4789 | Sciences | #80C8E8 |
| Définition | #4A9BD9 | Sport | #E84535 |
| Dictons | #4CAF50 | Technologie | #7B8FA0 |
| Espace | #2E1A47 | Internet | #5B8DBE |
| Gastronomie | #FFA500 | Inventions | #5BC0DE |
| Géographie | #40D9C8 | Jeux & Jouets | #9B59B6 |
| Histoire | #E8A030 | Kids | #FFEF60 |

## Toggle Mode Dev
- Clé localStorage : wtf_dev_mode
- Visible uniquement en import.meta.env.DEV (localhost)
- Mode Dev : coins = 9999, tickets = 99, indices = 99
- Jamais visible en production (Railway)

## Workflow
- Preview local : npm run dev → localhost:5176
- Push : manuel uniquement — jamais automatique
- Git : pull en premier, push en dernier
- node_modules : npm install sur chaque nouveau poste

## URLs Notion
- QG : https://www.notion.so/332b94ed8cb180298efadff6b66d54af
- Paramètres : https://www.notion.so/332b94ed8cb181869176fd6266e78915
- **Tâches restantes (base de travail LIVE)** : https://www.notion.so/342b94ed8cb181b7a03cc4c6c4d49ab6 — source unique de vérité de ce qu'il reste à faire. À actualiser à chaque tâche fermée (retirer + renuméroter), concordance avec § Phase A ci-dessus.

⚠️ RAILWAY : Ne jamais pusher automatiquement. Commit local uniquement.

## Choix du modèle — Règle officielle

### Utiliser SONNET pour :
- Corrections CSS/style ciblées (1-3 modifications)
- Changements de textes, labels, valeurs
- Ajout d'un élément simple (image, bouton, filtre)
- Fix de bug visuel identifié précisément

### Utiliser OPUS pour :
- Refonte complète d'un écran
- Nouvelle logique (état, hooks, props)
- Architecture multi-fichiers
- Impact sur plusieurs composants simultanément

### Règle simple :
> Sonnet = je sais exactement quoi changer et où
> Opus = je dois comprendre la structure pour décider

## Preview local
- Preview : npm run dev → localhost:5176
- Ne jamais pusher uniquement pour tester — tester en local d'abord

## 🎨 Inventaire Émojis — Audit 13/04/2026

**Total : 85+ émojis regroupés par contexte** (voir page Notion pour l'inventaire complet)

### Catégories principales
1. **Boutons & Contrôle** (8) : ⚔️ ← > ✕ ⚙️ ➕ ✓ ▼
2. **Modes de jeu** (7) : ⚡ 🎯 🔥 ❄️ 🧭 🎲 🎮
3. **Récompenses & Devises** (8) : 🪙 🎟️ 💰 👑 ✨ 🔋 💎
4. **Statuts & Résultats** (11) : 😵 🐣 🤔 😅 🧐 🙂 😎 🧠 💪 🌟 👑
5. **Trophées & Achievements** (45+) : Regroupés par section (Global, Type, Catégories, Streak, Blitz, Parties, Social, Perfect)
6. **Catégories & Collections** (4) : 📚 📂 🌍 🎪
7. **Social & Multijoueur** (4) : 🤝 👥 👋 👤
8. **Autres** (10) : 📡 🎭 😂 🤣 👏 🔰 🥉 🥈 🥇 💡

### À retravailler avec Recraft.ai (Priorité)
1. **P1** - Modes de jeu : ⚡ 🎯 🔥 (très utilisés)
2. **P2** - Trophées : 👑 🏆 💎 (symbolique fort)
3. **P3** - Social : ⚔️ 👥 🤝 (engagement multiplayer)

**Page Notion** : https://www.notion.so/341b94ed8cb18186a910f6bd719b247f
