# WTF! — Architecture détaillée

> Détails d'architecture extraits de CLAUDE.md le 20/04/2026. CLAUDE.md ne garde que les règles de haut niveau ; ici on garde les détails d'implémentation (flow, tables, Realtime, migration).

## ⚠️ Admin-Tool ≠ Game

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

## Architecture Data — Règle d'or (décidée 2026-04-12)

**Principe** : Supabase = source de vérité pour tout ce qui "compte". localStorage = cache optimiste stale-while-revalidate. React state = UI éphémère.

### Répartition des entités

**Supabase (canonique)** — toute mutation passe par RPC ou Edge Function :
- coins, indices, énergie ✅ (plus de tickets)
- **unlockedFacts (set d'IDs)** ✅ via RPC `unlock_fact`
- streak (jour courant + historique) ⏳
- badges / trophées ⏳
- blitzRecords (meilleurs temps par catégorie/palier) ✅
- Quest progress (level, stars) ⏳ (ex-Route)
- coffres réclamés ⏳
- stats par mode ⏳
- duels / challenges / friendships ✅

**localStorage (cache)** :
- onboardingCompleted, tutoStep, skip_launch_*
- son on/off, thème, mode dev/test
- **unlockedFacts** (cache stale-while-revalidate)
- wtf_cached_friends

**React state (éphémère)** :
- écran courant, modals ouverts
- session de jeu en cours

### Règles de mutation
- **Aucune écriture directe** depuis le client
- Toutes les mutations passent par RPC Supabase ou Edge Function
- Optimistic update local immédiat, réconciliation au retour serveur
- En cas d'erreur : retry 3× avec backoff, puis toast + rollback

### Résolution des conflits multi-device
- **Entités additives** (coins, unlockedFacts) : deltas atomiques SQL
- **Entités scalaires** (préférences UI) : last-write-wins localStorage

### Offline
- Modes solo jouables offline, mutations en queue (`wtf_mutation_queue`)
- Modes réseau (Défi, Hunt) : écran "connexion requise"

### Auth anonyme
- Premier mount : `supabase.auth.signInAnonymously()`
- Upgrade vers Google/Apple : `supabase.auth.linkIdentity()`
- Plus jamais de "non connecté = local only"

### Mode dev / test
- Mode dev = local-only bypass, ne sync rien vers Supabase
- Mode test = compte dédié QA
- Jamais de header dev qui bypasse l'Edge Function en prod

### Migration des joueurs existants
- RPC `seed_from_local(payload)` one-shot au premier mount post-déploiement
- Plafonds : coins ≤ 5000 (×10), unlockedFacts ≤ 50
- Flag `wtf_data.seeded = true`

### Points de convergence à migrer (×10)
- Trigger DB `handle_new_user` : 500/0/3/5 (à mettre à jour — actuellement 50/1/3/5)
- `AuthContext.createProfile` : 500/0/3/5 (à mettre à jour)
- `App.jsx` init `wtf_data` : 500/0/3/— (à mettre à jour)
- `storageHelper.js` fallback : 500/0/3/— (à mettre à jour)
- **Supprimer toute référence aux tickets** dans le code

## Mode Multi / Défis Blitz — Flow

**Flow exact** (refonte 19/04/2026, Mode Multi) :
1. A ouvre Multi → choisit variant (Rush ou Speedrun) → ami → cat → (palier si Speedrun)
2. `create_duel_challenge` RPC → 100 coins débités (créateur)
3. B reçoit notification → ChallengeScreen → "Relever" → RPC `accept_duel_challenge` → 100 coins débités (accepteur)
4. B joue même cat, même variant → RPC `complete_duel_round`
5. Trigger `calculate_challenge_winner` :
   - **Rush** : plus de `correct` gagne · tie-break `time` (plus bas = plus rapide)
   - **Speedrun** : `time` plus bas gagne
   - Égalité parfaite sur score ET temps → `winner_id = NULL` + refund 100c × 2
6. Gagnant reçoit 150c (profit net +50c, perdant −100c, house +50c)
7. Expiration 48h → créateur remboursé 100c, status='expired'
8. Résultats côte à côte sur ChallengeScreen

**RPC atomique `complete_duel_round`** : débit 100c accepteur + UPDATE challenge (trigger calcule winner) + credit 150c gagnant (ou refund 100c × 2 si égalité), tout en 1 transaction.

## Système Amis — Règles Complètes

**Tables Supabase :**
- `friend_codes` : { user_id, code (8 chars unique), display_name, avatar_url }
- `friendships` : { id, user1_id, user2_id, status ('pending'|'accepted'|'blocked'), created_at, accepted_at }

**Vérifications avant défi Multi :**
- Statut amitié = `accepted`
- Player 1 et Player 2 ont ≥10 f*cts dans la catégorie (Rush et Speedrun, maj 19/04/2026)
- Player 1 a 100 coins (mise Multi, ex-ticket 200c)

## Architecture DuelContext & Realtime

**Fichiers clés :**
- `src/features/duels/context/DuelContext.jsx` : provider, pendingDuel state
- `src/features/duels/hooks/useFriends.js` : friends + pendingRequests + Realtime
- `src/features/duels/hooks/useDuels.js` : duels/challenges + Realtime
- `src/data/friendService.js` : CRUD amis
- `src/data/duelService.js` : CRUD défis (createDuelChallenge RPC atomique)

**Realtime subscriptions (auto via hooks) :**
- `friendships` → change → refresh useFriends
- `challenges` → change → refresh useDuels → refresh UI
- `blitz_records` → INSERT → refresh SocialPage historique

## Monétisation — Roadmap Y1 → Y5

- **Y1 (10K € cible)** : Starter Pack 2,99€ (1 500 coins + 5 indices + cadre exclusif, plus de tickets) + Packs Gems + Abo optionnel
- **Y2 (30–50K €)** : Achat direct VIP **0,99 €/VIP** + Remove Ads 3,99€ + Packs thématiques + Internationalisation EN
- **Y3 (100–200K €)** : Battle Pass saisonnier 4,99€ + Leagues + Cosmétiques premium
- **Y5 (500K+ €)** : Multijoueur live + Licensing + Sponsoring + Expansion langues

## Architecture contenu (15/04/2026)
- **WTF VIP** (~483) : Quest boss /5 (refonte 19/04/2026), Flash dimanche, Race/Blitz (une fois débloqués)
- **Funny F*cts** (~770+ et croissant) : Quickie, Vrai ou Fou, Quest niveaux, Flash lun-sam
- **Blitz** pioche dans TOUS les f*cts débloqués (VIP + Funny confondus)
- Collection : 2 onglets (WTF! + Funny F*cts)
- **Champs DB VOF** : `statement_true` (text) + `statement_false_funny` (text) + `statement_false_plausible` (text) sur table facts ✅
- Quest = ~924 niveaux (770 Funny ÷ 5 par bloc = ~154 blocs × 6 niveaux — 5 Funny + 1 boss)
