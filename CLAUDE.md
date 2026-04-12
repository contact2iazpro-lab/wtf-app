AUTORUN: Toujours appliquer les modifications sans demander confirmation. Ne jamais créer de worktree ni de branche. Travailler directement sur master.

# WTF! — What The F*ct

## Projet
- App mobile trivia basée sur un jeu physique validé (350 cartes)
- URL prod : https://wtf-app-production.up.railway.app/
- Admin Tool : ⚠️ À déployer séparément (ne plus mélanger au build principal — faille RLS)
- Stack : React + Vite + Supabase + Tailwind + Nunito
- Deploy : Railway auto sur push master

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

### Économie F2P — Source de vérité unique

| Paramètre | Valeur |
|-----------|--------|
| **Nouveau joueur** | **0 coins / 1 ticket / 3 indices / 3 énergies** (Notion officiel) |
| Énergie max (stock) | 10 (achat possible via boutique au-dessus de 3) |
| Régénération énergie | +1 toutes les 8h jusqu'au cap de 3 (pas de régén au-dessus) |
| 1 ticket (boutique) | 25 coins |
| 1 indice (boutique) | 10 coins |
| 3 indices (boutique) | 30 coins |
| 5 indices (boutique) | 45 coins |
| Streak J1 | 2 coins |
| Streak J3 | 2 indices |
| Streak J7 | 10 coins + 1 ticket |
| Streak J14 | 1 ticket + 3 indices |
| Gains journaliers cible | 30-50 coins/jour |
| TTF (sessions avant achat) | ~3 sessions Flash |

**Cette table est la SEULE source de vérité.** Toute divergence (trigger DB, code client, defaults de colonne, fallbacks, resets) doit être alignée ici. Points de convergence actuels :
- Trigger DB `handle_new_user` : 0/1/3/3 ✅
- `AuthContext.createProfile` : 0/1/3/3 ✅
- `App.jsx` init `wtf_data` : 0/1/3/— (energy géré séparément) ✅
- `App.jsx resetOnboarding` : 0/1/3/— ✅
- `storageHelper.js` fallback : 0/1/3/— ✅
- `ProfilPage.jsx executeReset` : 0/1/3/3 ✅

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
- **WTF VIP** (350) : f*cts originaux du jeu physique → Quête (source unique de déblocage VIP) + **Blitz** (une fois débloqués)
- **F*cts générés** (1000+) : générés par IA → Jouer, Explorer, Hunt, Puzzle, Route + **Blitz** (une fois débloqués)
- **Blitz** pioche dans TOUS les f*cts déjà débloqués (VIP + Funny confondus)
- Collection : 2 onglets (WTF! + Funny F*cts)

## Architecture Data — Règle d'or (décidée 2026-04-12)

**Principe** : Supabase = source de vérité pour tout ce qui "compte". localStorage = cache optimiste stale-while-revalidate. React state = UI éphémère.

### Répartition des entités

**Supabase (canonique)** — toute mutation passe par RPC ou Edge Function, jamais d'écriture localStorage directe :
- coins, tickets, indices, énergie
- unlockedFacts (set d'IDs)
- streak (jour courant + historique)
- badges / trophées
- blitzRecords (meilleurs temps par catégorie/palier)
- Route WTF! progress (level, stars)
- coffres réclamés (dimanche WTF + daily)
- stats par mode (gamesPlayed, totalCorrect, bestStreak…)
- duels / challenges / friendships (déjà fait)

**localStorage (UI state, non syncé)** :
- onboardingCompleted, tutoStep, skip_launch_*
- son on/off, thème, mode dev/test
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
