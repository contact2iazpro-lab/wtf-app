# WTF! — Journal des sessions

> Historique des livraisons, décisions et refactors. Extrait de CLAUDE.md le 20/04/2026 pour alléger le contexte chargé à chaque prompt.
> Les règles vivantes restent dans CLAUDE.md. Ce fichier est un journal, pas une source de vérité.

## Phase A — Architecture Data (2026-04-12)

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

## Sessions

### 15/04/2026 — HomeScreen + ResultsScreen + décision Modèle A+
- HomeScreen cleanup + refonte visuelle
- ResultsScreen Phase A+B
- **Modèle D étudié puis abandonné au profit du Modèle A+** (décision 15/04/2026)

### 16/04/2026 matin — Admin-tool + Marathon + Blitz + Flash
- Fix JSON admin-tool (`generateStatements` balanced-brace extractor)
- MarathonScreen refonte complète (gate 20 unlocked, tiered bg, record `marathonBestScore`, animations shake/gold/extreme, share/replay)
- Blitz refactor Solo/Défi (variant prop, soloDuration 60s descendant, defiWrongPenalty 5s, `blitzSoloBestScore`, BlitzLobbyScreen toggle Solo/Défi, BlitzResultsScreen vue solo dédiée)
- FlashScreen refonte (WEEKDAY_THEMES fixe lun-sam, dimanche 1 VIP cible + 4 Funny distracteurs seed ISO-week, unlock conditionnel `fact.id === vipTargetId`, reveal VIP dans done screen)

### 16/04/2026 soir — VraiOuFou + RevelationScreen unifiée
- VraiOuFouScreen refonte complète (layout calqué 1:1 sur QuestionScreen Quickie, timer 15s variant "vof" vert→orange→rouge, CircularTimer fond blanc)
- RevelationScreen unifiée (VOF utilise le même composant que Quickie via système d'accent : violet Quickie / vert VOF, `accentColor`/`accentGradient`/`accentShadow`)
- Encadrés hauteur fixe (question 3 lignes, réponse 2 lignes, explication flex:1, texte auto-size)
- FallbackImage SVG inline dynamique (couleur catégorie, viewBox carré 680×680)
- Effets holo/shiny sur toutes les images revelation (y compris fallback)
- Fix bug achat énergie Quickie (route directe vers CATEGORY)
- HomeScreen cercle VOF vert (#6BCB77)
- Suppression emoji 🧠 des encadrés "Le saviez-vous" (4 fichiers)

### 18/04/2026 — Génération images individuelles admin-tool
- **Edge Functions** `generate-fact-directions-single` (Opus 4.5 → 3 idées de scène + mode refine) et `generate-fact-image-single` (gpt-image-1 low / Gemini Flash / Gemini 3 Pro, 1 à 4 variantes × styles cochés Réaliste/WTF/Cinéma, upload storage `facts/{id}/variants/{ts}-{style}-{rand}`)
- **Table DB** `fact_image_variants` (historique par fact, flag `is_active` unique par fact via index partiel, RLS service_role)
- **Composant** `FactImageGenerator` injecté sous l'image de `FactMobileEditorPage` : 3 directions Opus + slot perso + checkboxes styles + toggle modèle + sélecteur variantes/style + historique 10 dernières + modal zoom + bouton Activer (sync `facts.image_url` via 3 UPDATE client) + Supprimer
- **Config Supabase** `supabase/config.toml` créé avec `verify_jwt = false` pour les Edge Functions admin
- **Upload manuel d'images** (FactEditorPage + FactsListPage) : nom de fichier stable `facts/{id}.{ext}` avec upsert, URL absolue Supabase (conversion depuis proxy `/supabase-proxy/` via helper `optimizeSupabaseImageUrl` dans `imageUrl.js`), renommage post-création. Image Transformations commenté car feature **Supabase Pro**
- **Edge Function `complete-hints`** : mode chirurgical qui regénère UNIQUEMENT les indices vides OU > 20 chars
- **Catégories** : `animaux-terrestres` renommé en `animaux-sauvages` + 2 nouvelles catégories `animaux-ciel` (#B8A5E8 lilas) et `bestioles` (#7A9F35 vert mousse)

### 19/04/2026 — Outils admin-tool (génération images + refonte UI + nettoyage)
- **Nouvel onglet "Images"** dans /generate → **batch auto** Opus auto_pick (choisit la + WTF parmi 3) + Gemini 3 Pro style WTF + activation auto. Les 3 directions stockées dans `facts.image_directions` (JSONB) avec `was_used:true` sur la pickée
- **Edge Function `generate-fact-directions-single`** étendue avec mode `auto_pick` (retourne `{ directions, picked_id }`)
- **Edge Function `complete-urls`** (gpt-4o-search-preview + validation HTTP HEAD + retry 3×) remplace `fill-missing-urls`
- **Intégration URLs dans Enrichir** : case à cocher `urls`, routage auto, ancien onglet "URLs sources" retiré
- **Refonte FactEditorPage** : layout 1 colonne max-w-3xl, ordre priorité ID/Cat/Mode+Statut/Question/Réponse/Explication/8 réponses/4 indices/3 VoF, `InputCompact` avec compteur N/Y en bas-droite DANS l'encadré, bouton Sauvegarder doublé en haut, scroll top après save
- **Champs retirés** : Pack, Usage Quête, bouton Aperçu en jeu, bouton Enrichir ce fact, bouton Générer 3 affirmations VoF
- **Terminologie** : "Quête WTF!" → "WTF!" · "Quickie / Flash" → "Fun Facts" · compteur `8/7` → `8/8` fausses réponses
- **Ancien Pipeline Images supprimé** (route /images + ImagePipelinePage.jsx + lien menu)
- **Fusion onglets Standard + VIP** en un seul "Générer" avec toggle
- **Prompt `generate-facts` refactoré** : pipeline 4 étapes (web_search Claude + 7 archétypes + sélection meilleur + enrichissements), règle indices **1 mot privilégié**
- **Règle indices "1 mot privilégié"** appliquée dans 3 prompts : generate-facts, complete-hints, enrich-fact
- **Tri facts par défaut** : ID croissant (asc)
- **Navigation facts filtrée** : helper `buildFactUrl` injecte filtres actifs dans URL → prev/next corrects
- **89 emojis supprimés** du champ `explanation` via script Node one-shot (`admin-tool/scripts/strip-emojis-explanation.mjs`)
- **Edge Function `deep-research-url` abandonnée** (trop lent/cher)

### 19/04/2026 nuit — Mode Multi end-to-end + VIP Quickie UX + cleanup dev mode
- **Mode Multi — fix bloquants + UX complète** :
  - Bug #1 `handleBlitzFinish` : ordre des checks cassé (branches solo return avant Multi) → RPC create/complete jamais appelées. Réordonné : Multi prioritaire.
  - Bug #2 double-débit 100c créateur (RPC débite déjà côté serveur) → suppression applyCurrencyDelta client.
  - Bug #3 MultiPage `f.id` undefined → utilise `f.userId`.
  - `usePlayerProfile` : listener `wtf_currency_updated` ajouté pour users auth (refresh solde après RPC).
  - Option **"Aléatoire"** 🎲 en Rush Multi + solo (pool ≥10 f*cts globaux).
  - handleBlitzStart Rush : filtre par categoryId si cat spécifique + boucle pool à 150 pour cat limitée.
  - handleBlitzReplay conserve variant + cat précédente.
  - Gate Rush/Speedrun unifiée **≥10 f*cts**.
- **ChallengeScreen refonte complète** :
  - Pending : header `DÉFI · RUSH/SPEEDRUN`, variant explicite, rappel économie 100/150, boutons Refuser (rouge, gauche) + Accepter (vert, droite).
  - Modal GameModal : `confirmIcon` prop ajouté.
  - **Débit immédiat 100c** à l'acceptation via nouvelle RPC `accept_duel_challenge` (colonne `player2_accepted_at`). `complete_duel_round` skip le débit si déjà accepté.
  - Bouton **Refuser** câblé avec RPC `decline_round` v2 (refund 100c créateur + status='expired' si non accepté).
  - Completed : header icône Multi + solde, badge delta **+150 / −100 / 0**, 3 actions (Rematch · Historique · Accueil).
- **BlitzResultsScreen Multi** : header icône + "Défi envoyé" + message "En cas de refus ou expiration 48h, 100c remboursés".
- **SocialPage realtime** : toast "X a relevé ton défi" + "X a refusé · +100c remboursés" + refresh solde.
- **DuelHistoryScreen onglets** : `?tab=records` via useSearchParams → bascule Historique défis / Records Blitz.
- **BlitzScreen UX** : timer dans rectangle blanc contour rouge BLITZ_RED · chrono centième partout · défloutage image + retrait cadenas sur bonne réponse.
- **VIP Quickie surprise — visuels finalisés** :
  - Rate **100% temporaire** (test grandeur nature, à repasser à 3%).
  - Injection propagée à `handleSelectCategory` (Quickie via CategoryScreen).
  - Badge "**Bonus f*ct WTF!**" + étoile asset `wtf-star.png`.
  - Overlay fullscreen 2.2s : étoile WTF + glow gold double-couche.
  - Contours **gold brillant** sur carte question + image + 2 QCM.
- **Règles modes refondues (MODE_CONFIGS)** :
  - Blitz : `spacer` entre règles communes et variants · Rush "−5s / mauvaise" · Speedrun "+5s / mauvaise" avec retour ligne `\n`.
  - Quest : Coût "1 énergie" · Bloc "5 fun facts + 1 WTF!" · Boss via `picto:target` questionMark · Gains "+20c / q. · +100c / WTF!".
  - Flash : Indices "Aucun · 2 / WTF!" · Gains "+30c / jour · 1 WTF! débloqué / sem.".
  - Multi : Social "48 h pour relever le défi".
  - Support `\n` + `rule.spacer` dans ModeLaunchScreen ET HowToPlayModal.
- **Icônes refactor** :
  - SwordsIcon : nouveau prop `accent2` (Multi : épée bleue + épée rouge).
  - TargetIcon : nouveau prop `questionMark` + `questionColor`.
  - Multi : QCM violet, timer violet, penalty violet, share violet.
  - Quest : QCM/timer/target Quest + gold, energy vert.
  - Flash : QCM/timer/set Flash + gold, "?" gold sur cercle pink.
- **Blitz Rush gate min 10 f*cts** (solo + Multi).
- **Prix déblocage catégorie** : 1 500 → **200 coins**.
- **HomeScreen** : dégradé inversé.
- **Mode dev nettoyé (~180 lignes retirées)** :
  - Bypass unlock retirés : CollectionPage, useSelectionHandlers, useNavigationHandlers, useModeStarters, AppRouter, useAppEffects.
  - UI debug QuestionScreen retirée : plus de 4 types VRAIE/DRÔLE/PROCHE/PLAUSIBLE, plus de badge devType, plus de boutons indices pré-révélés.
  - Restent actifs : crédits 9 999 coins / 100 indices au mount + toggle Settings Normal/Dev/Test.
- **Assets catégories** : ajout `animaux-ciel.png`, `transports.png`, `meteo.png`, `bestioles.png` + renommage `bugs.png` → `bestioles.png` et `animaux-terrestres.png` → `animaux-sauvages.png`.
- **VoF batch 1-350** : 309 facts avec 3 affirmations générées (OK 309 / SKIP 0 / FAIL 0) via `admin-tool/scripts/generate-vof-batch.mjs` + Claude Opus 4.6 (~$6, 17 min).
- **DB Supabase** :
  - Rebalance 50/50 VIP/Funny sur `status='published'` (57 flips, 308 VIP / 301 Funny final).
  - Colonne `player2_accepted_at` + RPC `accept_duel_challenge`.
  - RPC `decline_round` v2.
  - Policies RLS sur `blitz_records` + ajout à publication realtime.
- **Audit collection fantômes** : diagnostic user `cb649e9f` → 24 facts dépubliés après unlock restent dans `collections.facts_completed[]`. Pas de fix. Impact fonctionnel UI = 0.

### 19/04/2026 soir — Refonte VIP drops + SocialPage Blitz dynamique + Flash harmonisée
- **Quickie — Bonus VIP 3%** : chaque question a 3% chance d'être un VIP non-débloqué aléatoire (pool global). Injection dans `useModeStarters.handleQuickie`. Flag `_isVipSurprise:true` → overlay doré 2.2s (`vipSurprisePop` + `vipSurpriseFade`) + jingle `roulette_jackpot` + vibration + badge ⭐ "Bonus VIP" pulsant. Règle ajoutée dans `MODE_CONFIGS.quickie`.
- **Quest — Blocs courts** : `QUEST_BLOCK_SIZE` 10 → **5**, `BOSS_THRESHOLD` 5 → **3**. Nombre de blocs passe de 77 à 154. Gains/bloc 300c → 200c mais 2× plus de blocs = volume identique, consommation énergie ×2.
- **Rythme VIP estimé** (500 VIP à découvrir) : Grinder Quest = 5 mois · Mix équilibré = 9 mois · Casual = 1.5 an · Fun-only Quickie = 2 ans. Monétisation Y2 (0.99€/VIP) non cannibalisée.
- **Blitz records Supabase** (Phase 1+2) : table `blitz_records` (variant, category_id, palier, score, time_seconds) + service `blitzRecordService` (save / getMy / leaderboard / history). Chaque run Rush/Speedrun historisée. `blitzSoloBestScore` pushé dans `profiles.flags` (cross-device). SocialPage lit via fetch + realtime subscription INSERT → auto-refresh. Rush/Speedrun séparés (gold / cyan).
- **BlitzLobbyScreen** : panneau "🏆 Mes records" (best Rush + top 3 Speedrun centième) au-dessus du toggle. Tri cats Speedrun : 100% > ratio desc > alphabétique. Contour blanc 2px (3px si sélectionnée).
- **BlitzResultsScreen** : Rush + Speedrun partagent le même pattern (header icône Blitz, FeaturedFactCard, `BlitzSessionMiniatures` 10/ligne, click → `FactDetailView`).
- **BlitzScreen** : layout aligné sur RaceScreen (icône+nom · score · barre progression · card question blanche contour rouge · QCM 2×2 · image 55% · gros timer dégradé).
- **Flash — règles harmonisées** : remplace 3 emojis bruts (💡🎯🪙) par `icon:hint` / `picto:target` / `icon:coins`. Flash ajouté à `STYLED_MODES` (textColor pink `#E91E63`, btnBg dark pink `#AD1457`).

## Inventaire Émojis — Audit 13/04/2026

**Total : 85+ émojis regroupés par contexte** (voir page Notion pour l'inventaire complet)

### À retravailler avec Recraft.ai (Priorité)
1. **P1** — Modes de jeu : icônes pour les 7 modes
2. **P2** — Trophées : 👑 🏆 💎 (symbolique fort)
3. **P3** — Social : ⚔️ 👥 🤝 (engagement multiplayer)

**Page Notion** : https://www.notion.so/341b94ed8cb18186a910f6bd719b247f
