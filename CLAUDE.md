AUTORUN: Toujours appliquer les modifications sans demander confirmation. Ne jamais créer de worktree ni de branche. Travailler directement sur master.

PUSH: **INTERDIT** de pusher vers le remote sans confirmation explicite de l'utilisateur. Aucune exception. Même après un commit auto, même si le code compile, même si tout semble prêt — NE JAMAIS exécuter `git push` sans que l'utilisateur ait écrit "push" ou "pousse". Les commits locaux sont OK sans confirmation, mais le push nécessite un feu vert explicite à CHAQUE fois.

PRÉ-TÂCHE: Avant d'attaquer toute tâche de la roadmap, vérifier systématiquement :
1. **Déjà traité ?** — grep le code + check Notion "Fait récemment" pour éviter de refaire.
2. **Cohérence CLAUDE.md** — relire la section règle correspondante (économie ×10, 6 modes, Option B streak/coffres fusionnés, paliers Débutant/Habitué/Fidèle/Légende, etc.).
3. **Contradictions** — flagger tout écart entre la tâche et les règles actées AVANT de coder.
4. **Rapport court** — 3-4 lignes : « Déjà fait ? X. CLAUDE.md dit Y. Cohérent ? Z. » Puis attendre feu vert si écart détecté.

LANGUE: Toujours répondre en français.

RÈGLES DES MODES (homogénéité) :
- Devise écrite **WTFCoins** (C majuscule) — jamais "WTFcoins" ni "coins".
- Format slash AVEC espaces : `2 / question`, `15s / question`, `5 questions / set` (mis à jour 17/04/2026, avant c'était sans espace).
- Structure des lignes : `Label : valeur` (deux-points entouré d'espaces).
- Appliquer ces règles sur toutes les pages de règles (livret HowToPlayModal + ModeLaunchScreen).

# WTF! — What The F*ct

## Projet
- App mobile trivia basée sur un jeu physique validé (350 cartes)
- URL prod : https://wtf-app-production.up.railway.app/
- Stack : React + Vite + Supabase + Tailwind + Nunito
- Deploy : Railway auto sur push master

## ⚠️ MAPPING DE RENOMMAGE (15/04/2026) — CRITIQUE
> Session stratégique 15/04/2026. Refonte complète des modes et de l'économie.
> Tout l'ancien vocabulaire doit être nettoyé dans le code, les commentaires, les variables.

| Ancien (code actuel) | Nouveau officiel | Notes |
|---|---|---|
| Flash + Explorer ("Jouer") | ~~Snack~~ → **Quickie** (16/04/2026) | QCM 2 choix, farming quotidien |
| Route WTF! | **Quest** | Progression linéaire, boss VIP /10 |
| Blitz chrono 60s | **Blitz Solo** | Sous-mode de Blitz |
| Défi Blitz async | **Blitz Défi** | Sous-mode de Blitz |
| Hunt + Puzzle du Jour | **Flash** | Événement quotidien + Hunt dimanche |
| *(nouveau)* | **Vrai ou Fou** | Swipe Vrai/Faux, 10 affirmations |
| *(nouveau)* | ~~No Limit~~ → **Race** (17/04/2026) | Survie jusqu'à erreur, 4 QCM, pas de timer |
| Quest ancien (ticket+Cool/Hot) | **SUPPRIMÉ** | Remplacé par Quest (Route) |
| Mode Série | **SUPPRIMÉ** | Absorbé dans le streak |
| Multi | **SUPPRIMÉ** | Non prévu V1 |
| Cool / Hot / WTF! (niveaux) | **SUPPRIMÉS** | Difficulté = nb QCM par mode |
| Tickets (devise) | **SUPPRIMÉS** | Coût coins direct |

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
- ✅ **Bloc 1 — Mode Défi finalisé (2026-04-14)** : 5 bugs + 10 items UX/logique fermés
- ✅ **Bloc 2 — Fix logique critiques (2026-04-14)** : 5 bugs fermés
- ✅ **Bloc 3 — Économie & UX (2026-04-14)** : 7 items fermés
- ✅ **Bloc 4 — Infra & économie (2026-04-14)** : 4 items fermés
- ✅ **Bloc 6 — Petits T+ (2026-04-14)** : 4 items audités
- ✅ **Phase A slice A — Audit RPC unlockFact (2026-04-14)**
- ✅ **Hotfix Défi post-Bloc 4.2 (2026-04-14 soir)** : 3 bugs fermés
- ✅ **Refactor Défi 3 Paliers (2026-04-14 nuit)** : RPC atomique `create_duel_challenge`
- ✅ **Session 15/04/2026** : HomeScreen cleanup + refonte visuelle + ResultsScreen Phase A+B + **Modèle D étudié puis abandonné au profit du Modèle A+ (décision 15/04/2026)**
- ✅ **Session 16/04/2026 matin** : Fix JSON admin-tool (`generateStatements` balanced-brace extractor) + MarathonScreen refonte complète (gate 20 unlocked, tiered bg, record `marathonBestScore`, animations shake/gold/extreme, share/replay) + Blitz refactor Solo/Défi (variant prop, soloDuration 60s descendant, defiWrongPenalty 5s, `blitzSoloBestScore`, BlitzLobbyScreen toggle Solo/Défi, BlitzResultsScreen vue solo dédiée) + FlashScreen refonte (WEEKDAY_THEMES fixe lun-sam, dimanche 1 VIP cible + 4 Funny distracteurs seed ISO-week, unlock conditionnel `fact.id === vipTargetId`, reveal VIP dans done screen)
- ✅ **Session 16/04/2026 soir** : VraiOuFouScreen refonte complète (layout calqué 1:1 sur QuestionScreen Quickie, timer 15s variant "vof" vert→orange→rouge, CircularTimer fond blanc) + RevelationScreen unifiée (VOF utilise le même composant que Quickie via système d'accent : violet Quickie / vert VOF, `accentColor`/`accentGradient`/`accentShadow`) + Encadrés hauteur fixe (question 3 lignes, réponse 2 lignes, explication flex:1, texte auto-size) + FallbackImage SVG inline dynamique (couleur catégorie, viewBox carré 680×680) + Effets holo/shiny sur toutes les images revelation (y compris fallback) + Fix bug achat énergie Quickie (route directe vers CATEGORY) + HomeScreen cercle VOF vert (#6BCB77) + Suppression emoji 🧠 des encadrés "Le saviez-vous" (4 fichiers)
- ✅ **Session 19/04/2026 — Outils admin-tool (génération masse images + refonte UI + nettoyage)** :
  - **Nouvel onglet "Images"** dans /generate → **batch auto** Opus auto_pick (choisit la + WTF parmi 3) + Gemini 3 Pro style WTF + activation auto. Les 3 directions stockées dans `facts.image_directions` (JSONB nouveau champ) avec `was_used:true` sur la pickée — pré-affichées dans FactMobileEditorPage avec badge "✅ utilisée"
  - **Edge Function `generate-fact-directions-single`** étendue avec mode `auto_pick` (retourne `{ directions, picked_id }`)
  - **Edge Function `complete-urls`** (gpt-4o-search-preview + validation HTTP HEAD + retry 3× anti-404) remplace `fill-missing-urls`
  - **Intégration URLs dans Enrichir** : case à cocher `urls`, routage auto quand seule cette case cochée, ancien onglet "URLs sources" retiré
  - **Refonte FactEditorPage** : layout 1 colonne max-w-3xl (mobile-friendly), ordre priorité ID/Cat/Mode+Statut/Question/Réponse/Explication/8 réponses/4 indices/3 VoF, labels Drôle/Proche/Plausible/Indice retirés (juste titres), `InputCompact` avec compteur N/Y en bas-droite DANS l'encadré, bouton Sauvegarder doublé en haut de page, scroll top après save
  - **Champs retirés de FactEditorPage** : Pack, Usage Quête (vip_usage inutile), bouton Aperçu en jeu, bouton Enrichir ce fact, bouton Générer 3 affirmations VoF (redirigé vers onglet Générer)
  - **Terminologie** : "Quête WTF!" → "WTF!" · "Quickie / Flash" → "Fun Facts" · compteur `8/7` → `8/8` fausses réponses
  - **Ancien Pipeline Images supprimé** (route /images + ImagePipelinePage.jsx + lien menu)
  - **Fusion onglets Standard + VIP** en un seul "Générer" avec toggle (VIP reste avec 3 formulations au choix)
  - **Prompt `generate-facts` refactoré** : pipeline 4 étapes (web_search Claude + 7 archétypes + sélection meilleur + enrichissements), wtf_score indicatif, règle indices **1 mot privilégié**
  - **Règle indices "1 mot privilégié"** appliquée dans 3 prompts : generate-facts, complete-hints, enrich-fact
  - **Tri facts par défaut** : ID croissant (asc) au lieu de desc
  - **Navigation facts filtrée** : helper `buildFactUrl` injecte filtres actifs dans URL → prev/next corrects au sein de la liste filtrée
  - **89 emojis supprimés** du champ `explanation` via script Node one-shot (`admin-tool/scripts/strip-emojis-explanation.mjs`)
  - **Edge Function `deep-research-url` abandonnée** (o4-mini Deep Research, trop lent/cher pour un gain marginal sur les URLs)
- ✅ **Session 18/04/2026 — Génération images individuelles admin-tool** :
  - **Edge Functions** `generate-fact-directions-single` (Opus 4.5 → 3 idées de scène + mode refine pour retravailler une idée brute de l'utilisateur) et `generate-fact-image-single` (gpt-image-1 low / Gemini Flash / Gemini 3 Pro, 1 à 4 variantes × styles cochés Réaliste/WTF/Cinéma, upload storage `facts/{id}/variants/{ts}-{style}-{rand}`)
  - **Table DB** `fact_image_variants` (historique par fact, flag `is_active` unique par fact via index partiel, RLS service_role)
  - **Composant** `FactImageGenerator` injecté sous l'image de `FactMobileEditorPage` : 3 directions Opus + slot perso (avec bouton "Retravailler avec Opus" qui refine l'idée brute) + checkboxes styles + toggle modèle + sélecteur variantes/style + historique 10 dernières + modal zoom + bouton Activer (sync `facts.image_url` via 3 UPDATE client, pas de RPC car parser Supabase SQL Editor buggué sur dollar-quote) + Supprimer
  - **Config Supabase** `supabase/config.toml` créé avec `verify_jwt = false` pour les Edge Functions admin (sinon 401 du gateway avant le check password custom)
  - **Upload manuel d'images** (FactEditorPage + FactsListPage) : nom de fichier stable `facts/{id}.{ext}` avec upsert (plus de timestamps), URL absolue Supabase (conversion depuis proxy `/supabase-proxy/` via helper `optimizeSupabaseImageUrl` dans `imageUrl.js`), renommage post-création pour les nouveaux facts (move `facts/new-{ts}.{ext}` → `facts/{id}.{ext}`). Image Transformations (WebP `render/image/public/`) commenté car feature **Supabase Pro** — à activer en basculant `transform: true` si upgrade plan
  - **Edge Function `complete-hints`** : mode chirurgical qui regénère UNIQUEMENT les indices vides OU > 20 chars, préserve les valides à 100%. Intégrée dans `GenerateFactsPage` → onglet "Enrichir les incomplets" : si seul le groupe `hints` est coché, route vers `complete-hints` (sinon `enrich-fact` comme avant). Le compteur "Indices" utilise maintenant un fetch+filter client pour inclure les trop longs (Supabase `.or()` ne supporte pas `char_length > 20`)
  - **Catégories** : `animaux-terrestres` renommé en `animaux-sauvages` (id ET label, migration DB `UPDATE facts SET category`) + 2 nouvelles catégories sans emoji (à créer demain) : `animaux-ciel` (#B8A5E8 lilas) et `bestioles` (#7A9F35 vert mousse)

## ⚠️ Sécurité — ne jamais exposer dans le bundle client
Toute variable préfixée `VITE_` est inlinée dans le JS public et lisible via DevTools.
**Interdit dans le build principal** : `VITE_SUPABASE_SERVICE_KEY`, `VITE_ADMIN_PASSWORD`,
`VITE_ANTHROPIC_KEY`, ou toute clé qui bypasse RLS / coûte de l'argent API.
Le client principal utilise uniquement `VITE_SUPABASE_ANON_KEY` + RLS Supabase.
L'admin-tool (clé service_role) doit être déployé **en isolation** (service Railway
séparé, sous-domaine privé, ou en local uniquement).

## Règles absolues
1. Un prompt = un fichier cible = une modification
2. Toujours travailler sur master directement
3. Si une branche de preview est créée → merger sur master immédiatement
4. Branche unique : ne jamais créer de nouvelle branche. Si Claude Code crée une branche automatiquement → merger immédiatement sur master et supprimer la branche.

## Vocabulaire officiel
- fact/fait → f*ct | facts → f*cts
- WTF toujours avec ! (sauf "What The F*ct")
- Les 6 modes : **Quickie · Vrai ou Fou · Quest · Race · Blitz · Flash**
- Snack → **Quickie** (renommé 16/04/2026)
- No Limit → **Race** (renommé 17/04/2026)
- Cool/Hot/WTF! → **SUPPRIMÉS** (difficulté = nb QCM par mode)
- Tickets → **SUPPRIMÉS** (coût en coins direct)
- Streak → Série

## Règles de jeu — Source de vérité (15/04/2026)

### 1. QUICKIE — "Court. Bon. Sans engagement."
- QCM **2 choix**, 5 questions, timer **15s**
- Indices : 1 max (stock perso, coût 50 coins en boutique)
- Contenu : Funny facts uniquement
- Coût : 1 énergie (cap 5, régén +1/8h, extra = 75 coins)
- Gains : 10 coins/bonne réponse · Perfect (5/5) : +50 coins
- Déblocage f*cts : Oui (Funny)
- Catégories : 5 gratuites (sport, records, animaux, kids, définition) + débloquables 1 500 coins
- **Mini-parcours catégorie presque terminée (< 5 f*cts restants, éco ×10 17/04/2026)** :
  - 1 fact = 50 coins · 2 facts = 100c · 3 facts = 150c · 4 facts = 200c

### 2. VRAI OU FOU — "Swipe si t'oses"
- **Swipe cards Vrai/Faux** (PAS de QCM), 10 affirmations par session (passé de 20 le 18/04/2026)
- Timer : **15s**/question · Indices : Aucun
- Contenu : Funny facts (champs `statement_true` + `statement_false_funny` + `statement_false_plausible` en base)
- **Tirage fausse (18/04/2026)** : 75% plausible / 25% drôle (pondéré)
- Coût : Gratuit illimité
- Gains : **0 coins** (mode viralité/acquisition, pas farming)
- Déblocage f*cts : **Non** — mode vitrine/viral. Le joueur découvre les affirmations mais ne les collecte pas. Pour posséder un f*ct, jouer Quickie ou Quest.
- Partage score X/10 (WhatsApp/story) — levier acquisition

### 3. QUEST — "Le chemin des WTF!" (ex-Route WTF!)
- QCM **4 choix**, blocs de **10 Funny + 1 boss VIP conditionnel**
- Timer : **20s** · Indices : 2/question (stock perso, achat 50 coins si vide)
- Coût : 1 énergie par tentative de bloc (extra = 75 coins)
- **Seuil boss : ≥5/10 bonnes réponses** sur les Funny pour affronter le boss VIP
- `<5/10` → bloc raté, pas de boss, joueur bloqué au même niveau (refaire)
- `≥5/10 + boss réussi` → passe au niveau suivant, VIP débloqué
- `≥5/10 + boss raté` → reste bloqué, VIP verrouillé, retry boss depuis la carte
- Gains : 20 coins/bonne Funny · +100 coins/boss vaincu (coins versés même si bloc raté)
- Déblocage f*cts : Funny correctes (toujours) + VIP (si boss réussi)
- Anti-déduction boss : fausses tirées parmi 7 à chaque retry, 2 indices parmi 4 (seed par retry)
- Diversité : 10 Funny tirées avec catégories variées, exclut les facts déjà débloqués
- UX : Header complet (retour/cat/coins/indices/paramètres), image floutée + 🔒, barre progression, timer visible, révélation inline après bonne réponse, modal achat énergie/indice
- Map de progression : Niveau X/~847, Bloc X/~77
- ~770 Funny ÷ 10 par bloc = **~77 blocs × 11 niveaux** (10 Funny + 1 boss)
- Spec source : `docs/QUEST_MODE_UPDATE.md`

### 4. NO LIMIT — "Zéro droit à l'erreur"
- QCM **4 choix**, questions illimitées jusqu'à la première erreur
- Timer : **Aucun** · Indices : **Aucun**
- Contenu : Funny + VIP facts déjà débloqués (mélangés)
- Coût : Gratuit illimité
- Gains : **0 coins** (prestige/record uniquement)
- Déblocage f*cts : Non (facts déjà connus)
- UX : Compteur de série en gros, fond qui change de couleur, 1ère erreur = game over dramatique

### 5. BLITZ — "Défie tes potes" (2 sous-modes)

#### 5a. Blitz Solo
- QCM **4 choix** (1 vraie + 1 drôle + 2 plausibles), chrono global **60s** descendant
- Indices : Aucun · Contenu : Funny + VIP débloqués
- Gains : 0 coins · Paliers : 5/10/20/30/50/100

#### 5b. Blitz Défi
- QCM **4 choix**, même set 5-10 questions pour les 2 joueurs
- Chrono montant global (+5s par erreur)
- Contenu : Funny facts (catégorie choisie par créateur)
- Coût : **200 coins** pour créer · Gratuit pour relever · 48h expiration
- Gains : 0 coins · Partage résultat WhatsApp

### 6. FLASH — "Le rendez-vous quotidien" (ex-Hunt + Puzzle du Jour)
- QCM **2 choix**, 5 questions, timer **15s**
- Lun-Sam : Funny thème du jour, 0 indices, **30 coins fixe**
- Dimanche : VIP Hunt de la semaine, 2 indices, **1 VIP débloqué**
- Coût : Gratuit 1×/jour
- UX : Bannière thème du jour. Dimanche = mise en scène Hunt.
- **Règles ModeLaunchScreen (harmonisées 18/04/2026)** : 7 règles format `**Label** : valeur` comme les autres modes, avec split Lun-Sam / Dim sur Indices et Gains

### Roulette WTF!
- 1 spin gratuit/jour + spins payants **100 coins** (économie ×10)
- **12 segments** (refonte 18/04/2026, avant 8) — 8 classiques + 4 nouvelles récompenses
  - **Coins/Hints** : 20c(22%) / 50c(18%) / 1indice(14%) / 100c(10%) / 150c(7%) / 2indices(4%) / 300c(3%) / 750c jackpot(2%)
  - **Nouveaux** : +1 énergie(8%) / 1 f*ct débloqué(4%) / relance gratuite(5%) / Streak Freeze(3%)
- **Valeur espérée : 85,4 coins · Sink net : 14,6 coins/spin (14,6%)**
- 12 couleurs distinctes (gris, orange, violet, bleu, cyan, vert, turquoise, fuchsia, rose, jaune, indigo, rouge)
- Sons : `roulette_spin` au lancement, `roulette_tick` pendant le ralentissement, `roulette_win` (gains courants) ou `roulette_jackpot` (300c/750c)
- Icônes PNG (icon-coins, icon-hint)
- Spec source : `docs/ROULETTE_WTF_SPECS.md`

### Règles communes
- QCM facile (2 choix) : Quickie, Flash
- QCM difficile (4 choix) : Quest, Race, Blitz
- Swipe (0 QCM) : Vrai ou Fou
- Indices = stock perso, coût 50 coins boutique. Bouton grisé si stock vide, JAMAIS de pause timer.
- Énergie : cap 5, régén +1/8h, extra = 75 coins

## Modes de jeu — Résumé (15/04/2026)

| Mode | Contenu | QCM | Coût | Gains | Statut |
|------|---------|-----|------|-------|--------|
| Quickie | Funny | 2 | 1 énergie | 10c/bonne, +50 perfect | ✅ Implémenté (ex-Snack) |
| Vrai ou Fou | Funny (statements) | Swipe | Gratuit | 0 coins | NOUVEAU |
| Quest | Funny + VIP boss | 4 | 1 énergie/bloc | 20c/niv + 100c/boss | Renommé (ex-Route) |
| Race | Funny+VIP débloqués | 4 | Gratuit | 0 coins (record) | Renommé (ex-No Limit) |
| Blitz Solo | Funny+VIP débloqués | 4 | Gratuit | 0 coins (paliers) | Modifié (QCM 2→4, 17/04/2026) |
| Blitz Défi | Funny (catég ami) | 4 | 200 coins (créer) | 0 coins | Modifié (QCM 2→4, 17/04/2026) |
| Flash (lun-sam) | Funny thème | 2 | Gratuit 1×/j | 30 coins fixe | Renommé (ex-Hunt+Puzzle) |
| Flash (dimanche) | VIP Hunt | 2 | Gratuit 1×/j | 1 VIP | Renommé |

**Modes SUPPRIMÉS :** Quest ancien (tickets+Cool/Hot), Série, Multi, Puzzle du Jour séparé, Hunt séparé, Explorer séparé

## Streak & Coffres — Décision 16/04/2026 (Option B)
- **Streak et coffres sont FUSIONNÉS** : le coffre quotidien est la matérialisation visuelle du streak (plus de double rail de récompenses).
- **Paliers** (pas de J1 — redondant avec Flash quotidien) :
  - **Débutant** (J3) = 75c
  - **Habitué** (J7) = 200c + 2 indices
  - **Fidèle** (J14) = 500c
  - **Légende** (J30) = 1 000c + cadre exclusif
- **Flash** reste le gameplay quotidien (lun-sam 30c fixe, dimanche Hunt VIP). Aucune interférence : Flash = actif, Coffres/Streak = passif.
- **Implémentation** : `src/hooks/useStreakRewards.js`. Un seul popup au lancement si récompense disponible.

## Monétisation — Roadmap Y1 → Y5

- **Y1 (10K € cible)** : Starter Pack 2,99€ (1 500 coins + 5 indices + cadre exclusif, plus de tickets) + Packs Gems + Abo optionnel
- **Y2 (30–50K €)** : Achat direct VIP **0,99 €/VIP** + Remove Ads 3,99€ + Packs thématiques + Internationalisation EN
- **Y3 (100–200K €)** : Battle Pass saisonnier 4,99€ + Leagues + Cosmétiques premium
- **Y5 (500K+ €)** : Multijoueur live + Licensing + Sponsoring + Expansion langues

### Mode Amis & Défis Blitz (architecture inchangée)

**Flow exact :**
1. A ouvre Blitz → choisit Solo ou Défi
2. Si Défi : A choisit catégorie + ami → 200 coins débités → `create_duel_challenge` RPC
3. B reçoit notification → ChallengeScreen → "Relever"
4. B joue même catégorie, même nb questions → chrono montant (+5s/erreur)
5. DB : `challenges` UPDATE (player2_time=Y, status='completed') + TRIGGER winner_id
6. Résultats côte à côte

### Système Amis — Règles Complètes

**Tables Supabase :**
- `friend_codes` : { user_id, code (8 chars unique), display_name, avatar_url }
- `friendships` : { id, user1_id, user2_id, status ('pending'|'accepted'|'blocked'), created_at, accepted_at }

**Vérifications avant défi :**
- Statut amitié = `accepted`
- Player 2 a min 5 facts dans la catégorie
- Player 1 a 200 coins (plus de tickets)

### Architecture DuelContext & Realtime

**Files clés :**
- `src/features/duels/context/DuelContext.jsx` : provider, pendingDuel state
- `src/features/duels/hooks/useFriends.js` : friends + pendingRequests + Realtime
- `src/features/duels/hooks/useDuels.js` : duels/challenges + Realtime
- `src/data/friendService.js` : CRUD amis
- `src/data/duelService.js` : CRUD défis (createDuelChallenge RPC atomique)

**Realtime subscriptions (auto via hooks) :**
- `friendships` → change → refresh useFriends
- `challenges` → change → refresh useDuels → refresh UI

### Économie F2P — Source de vérité (15/04/2026) — VALEURS ×10

> Toutes les valeurs coins sont ×10 vs l'ancien système (10 nouveau = 1 ancien).
> Permet les remises (-20%, -30%) et donne une sensation d'abondance.

| Paramètre | Valeur |
|-----------|--------|
| **Nouveau joueur** | **500 coins / 3 indices / 5 énergies** (plus de tickets) |
| Énergie max (stock) | 5 (régén +1/8h) |
| Énergie extra | 75 coins |
| Indice (boutique) | 50 coins |
| Débloquer catégorie | 1 500 coins |
| Cosmétique profil (moyen) | 500 coins |
| Ticket Blitz Défi (créer) | 200 coins |
| Spin roulette (payant) | 100 coins |
| Gains journaliers cible | 250-400 coins/jour |
| Sinks journaliers cible | ~125 coins/jour |
| Surplus net cible | 80-250 coins/jour |
| TTF (pression achat) | 5-10 jours |
| **Devises** | **Coins + Gems uniquement** (plus de tickets) |
| **Modèle F2P** | **Modèle A+** — Starter Pack 2,99€ + Packs Gems + Abo optionnel |

**Points de convergence à migrer (×10) :**
- Trigger DB `handle_new_user` : 500/0/3/5 (à mettre à jour — actuellement 50/1/3/5)
- `AuthContext.createProfile` : 500/0/3/5 (à mettre à jour)
- `App.jsx` init `wtf_data` : 500/0/3/— (à mettre à jour)
- `storageHelper.js` fallback : 500/0/3/— (à mettre à jour)
- **Supprimer toute référence aux tickets** dans le code

### Règles communes économie
- Indices = chaque utilisation débite 1 du stock (coût 50 coins en boutique)
- Indice non disponible si stock vide : bouton grisé, JAMAIS de pause du timer
- Bonus session parfaite : Quickie perfect = +50 coins. Quest pas de perfect bonus (les gains par niveau suffisent).

## Architecture contenu (15/04/2026)
- **WTF VIP** (~483) : Quest boss /10, Flash dimanche, Race/Blitz (une fois débloqués)
- **Funny F*cts** (~770+ et croissant) : Quickie, Vrai ou Fou, Quest niveaux, Flash lun-sam
- **Blitz** pioche dans TOUS les f*cts débloqués (VIP + Funny confondus)
- Collection : 2 onglets (WTF! + Funny F*cts)
- **Champs DB VOF** : `statement_true` (text) + `statement_false_funny` (text) + `statement_false_plausible` (text) sur table facts ✅
- Quest = ~847 niveaux (770 Funny ÷ 10 par bloc = ~77 blocs × 11 niveaux — 10 Funny + 1 boss)

## Architecture Data — Règle d'or (décidée 2026-04-12)

**Principe** : Supabase = source de vérité pour tout ce qui "compte". localStorage = cache optimiste stale-while-revalidate. React state = UI éphémère.

### Répartition des entités

**Supabase (canonique)** — toute mutation passe par RPC ou Edge Function :
- coins, indices, énergie ✅ (plus de tickets)
- **unlockedFacts (set d'IDs)** ✅ via RPC `unlock_fact`
- streak (jour courant + historique) ⏳
- badges / trophées ⏳
- blitzRecords (meilleurs temps par catégorie/palier) ⏳
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

## Design system
- Police : Nunito (400/700/900) via Google Fonts
- Couleur principale : #FF6B1A (orange WTF!)
- Fond écrans jeu : linear-gradient(160deg, {couleurCatégorie}22, {couleurCatégorie})
- CoinsIcon : src/components/CoinsIcon.jsx
- Scaling responsive : raisonner en full screen (100vh × 100vw), pas de base fixe type iPhone SE
- Utiliser des unités relatives (%, vh, vw, clamp) et flexbox/grid pour s'adapter à tous les écrans
- S(x) helper reste disponible mais privilégier les layouts fluides
- Règle isLightColor : texte #1a1a1a sur fond clair, #ffffff sur fond sombre

### Couleurs des catégories (source unique : src/data/facts.js)
| Catégorie | Couleur | Catégorie | Couleur |
|-----------|---------|-----------|---------|
| Animaux | #6BCB77 | Lois | #6366B8 |
| Animaux du ciel | #B8A5E8 | Musique | #E84B8A |
| Animaux Marins | #40B4D8 | Mythologie | #C8A84B |
| Animaux sauvages | #E8712A | Bestioles | #7A9F35 |
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
- Mode Dev : coins = 9999, indices = 99 (plus de tickets)
- Jamais visible en production (Railway)

## Workflow
- Preview local : npm run dev → localhost:5176
- Push : manuel uniquement — jamais automatique
- Git : pull en premier, push en dernier
- node_modules : npm install sur chaque nouveau poste

## URLs Notion
- QG : https://www.notion.so/332b94ed8cb180298efadff6b66d54af
- Paramètres : https://www.notion.so/332b94ed8cb181869176fd6266e78915
- **Tâches restantes (base de travail LIVE)** : https://www.notion.so/342b94ed8cb181a58710f3899cb4fb42

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

## Fichiers clés
- `src/App.jsx` — machine à états centrale
- `src/services/currencyService.js` — SUPPRIMÉ (remplacé par usePlayerProfile.applyCurrencyDelta)
- `src/utils/storageHelper.js` — centralise lectures localStorage
- `src/services/playerSyncService.js` — sync Supabase push/pull
- `src/constants/gameConfig.js` — config modes de jeu (6 modes configurés ✅)
- `src/data/factsService.js` — chargement facts Supabase
- `src/utils/answers.js` — tirage réponses QCM
- `src/hooks/usePlayerProfile.js` — source de vérité devises (applyCurrencyDelta)
- `src/screens/RevelationScreen.jsx` — revelation partagée Quickie/VOF (système accent violet/vert, encadrés hauteur fixe, auto-size texte)
- `src/screens/VraiOuFouScreen.jsx` — mode Vrai ou Fou (swipe, timer 15s, utilise RevelationScreen)
- `src/components/FallbackImage.jsx` — SVG inline dynamique (couleur catégorie)
- `src/components/CircularTimer.jsx` — timer avec variants default/quickie/vof

## 🎨 Inventaire Émojis — Audit 13/04/2026

**Total : 85+ émojis regroupés par contexte** (voir page Notion pour l'inventaire complet)

### À retravailler avec Recraft.ai (Priorité)
1. **P1** - Modes de jeu : icônes pour les 6 nouveaux modes
2. **P2** - Trophées : 👑 🏆 💎 (symbolique fort)
3. **P3** - Social : ⚔️ 👥 🤝 (engagement multiplayer)

**Page Notion** : https://www.notion.so/341b94ed8cb18186a910f6bd719b247f
