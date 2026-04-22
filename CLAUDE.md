AUTORUN: Toujours appliquer les modifications sans demander confirmation. Ne jamais créer de worktree ni de branche. Travailler directement sur master.

PUSH: **INTERDIT** de pusher vers le remote sans confirmation explicite de l'utilisateur. Aucune exception. Même après un commit auto, même si le code compile, même si tout semble prêt — NE JAMAIS exécuter `git push` sans que l'utilisateur ait écrit "push" ou "pousse". Les commits locaux sont OK sans confirmation, mais le push nécessite un feu vert explicite à CHAQUE fois.

PRÉ-TÂCHE: Avant d'attaquer toute tâche de la roadmap, vérifier systématiquement :
1. **Déjà traité ?** — grep le code + check Notion "Fait récemment" pour éviter de refaire.
2. **Cohérence CLAUDE.md** — relire la section règle correspondante (économie ×10, 7 modes, Option B streak/coffres fusionnés, paliers Débutant/Habitué/Fidèle/Légende, etc.).
3. **Contradictions** — flagger tout écart entre la tâche et les règles actées AVANT de coder.
4. **Rapport court** — 3-4 lignes : « Déjà fait ? X. CLAUDE.md dit Y. Cohérent ? Z. » Puis attendre feu vert si écart détecté.

LANGUE: Toujours répondre en français.

RÈGLES DES MODES (homogénéité) :
- Devise écrite **WTFCoins** (C majuscule) — jamais "WTFcoins" ni "coins".
- Format slash AVEC espaces : `2 / question`, `15s / question`, `5 questions / set` (mis à jour 17/04/2026).
- Structure des lignes : `Label : valeur` (deux-points entouré d'espaces).
- Appliquer ces règles sur toutes les pages de règles (livret HowToPlayModal + ModeLaunchScreen).

# WTF! — What The F*ct

## Projet
- App mobile trivia basée sur un jeu physique validé (350 cartes)
- URL prod : https://wtf-app-production.up.railway.app/
- Stack : React + Vite + Supabase + Tailwind + Nunito
- Deploy : Railway auto sur push master

## Documentation liée
- **Journal sessions** : `docs/CLAUDE_HISTORY.md` (historique livraisons, décisions, refactors)
- **Architecture détaillée** : `docs/CLAUDE_ARCHITECTURE.md` (admin-tool, data, Mode Multi flow, amis, monétisation Y2+)
- **Specs par mode** : `docs/QUEST_MODE_UPDATE.md`, `docs/ROULETTE_WTF_SPECS.md`, etc.

## ⚠️ MAPPING DE RENOMMAGE (15/04/2026) — CRITIQUE
> Tout l'ancien vocabulaire doit être nettoyé dans le code, les commentaires, les variables.

| Ancien (code actuel) | Nouveau officiel | Notes |
|---|---|---|
| Flash + Explorer ("Jouer") | ~~Snack~~ → **Quickie** (16/04/2026) | QCM 2 choix, farming quotidien |
| Route WTF! | **Quest** | Progression linéaire, boss VIP /5 |
| Blitz chrono 60s | **Blitz Solo** | Sous-mode de Blitz |
| Défi Blitz async | **Multi** (19/04/2026) | Mode dédié, Rush + Speedrun |
| Hunt + Puzzle du Jour | ~~Flash~~ → **Drop** (20/04/2026) | Événement quotidien + Hunt dimanche |
| *(nouveau)* | **Vrai ou Fou** | Swipe Vrai/Faux, 10 affirmations |
| *(nouveau)* | ~~No Limit~~ → **Race** (17/04/2026) | Survie jusqu'à erreur, 6 QCM, pas de timer |
| Quest ancien (ticket+Cool/Hot) | **SUPPRIMÉ** | Remplacé par Quest (Route) |
| Mode Série | **SUPPRIMÉ** | Absorbé dans le streak |
| Cool / Hot / WTF! (niveaux) | **SUPPRIMÉS** | Difficulté = nb QCM par mode |
| Tickets (devise) | **SUPPRIMÉS** | Coût coins direct |

## ⚠️ Sécurité — ne jamais exposer dans le bundle client
Toute variable préfixée `VITE_` est inlinée dans le JS public et lisible via DevTools.
**Interdit dans le build principal** : `VITE_SUPABASE_SERVICE_KEY`, `VITE_ADMIN_PASSWORD`,
`VITE_ANTHROPIC_KEY`, ou toute clé qui bypasse RLS / coûte de l'argent API.
Le client principal utilise uniquement `VITE_SUPABASE_ANON_KEY` + RLS Supabase.
L'admin-tool (clé service_role) doit être déployé **en isolation** (voir `docs/CLAUDE_ARCHITECTURE.md`).

## Règles absolues
1. Un prompt = un fichier cible = une modification
2. Toujours travailler sur master directement
3. Si une branche de preview est créée → merger sur master immédiatement
4. Branche unique : ne jamais créer de nouvelle branche. Si Claude Code crée une branche automatiquement → merger immédiatement sur master et supprimer la branche.

## Vocabulaire officiel
- fact/fait → f*ct | facts → f*cts
- WTF toujours avec ! (sauf "What The F*ct")
- Les 7 modes (depuis 20/04/2026) : **Quickie · Vrai ou Fou · Quest · Race · Blitz · Multi · Drop**
- Flash → **Drop** (renommé 20/04/2026)
- Snack → **Quickie** (renommé 16/04/2026)
- No Limit → **Race** (renommé 17/04/2026)
- Cool/Hot/WTF! → **SUPPRIMÉS** (difficulté = nb QCM par mode)
- Tickets → **SUPPRIMÉS** (coût en coins direct)
- Streak → Série

## Règles de jeu — Source de vérité (15/04/2026)

### 1. QUICKIE — "Court. Bon. Sans engagement."
- QCM **4 choix**, 5 questions, timer **15s** (passé de 2 à 4 choix le 20/04/2026)
- Indices : 2 max (stock perso, coût 50 coins en boutique)
- Contenu : Funny facts **+ 3% chance / question d'un VIP surprise** (19/04/2026)
- Coût : 1 énergie (cap 5, régén +1/8h, extra = 200 coins)
- Gains : 10 coins/bonne réponse · Perfect (5/5) : +50 coins
- Déblocage f*cts : Oui (Funny + VIP si bien répondu)
- Catégories : 5 gratuites (sport, records, animaux, kids, définition) + débloquables 200 coins (baissé de 1 500 le 19/04/2026)
- **Mini-parcours catégorie presque terminée (< 5 f*cts restants)** : 1 fact = 50c · 2 = 100c · 3 = 150c · 4 = 200c
- **VIP Surprise (19/04/2026)** : chaque question a 3% chance d'être un VIP non-débloqué. Overlay doré 2.2s + jingle `roulette_jackpot` + badge ⭐ "Bonus VIP". Implémentation : `useModeStarters.handleQuickie` · `QuestionScreen`.

### 2. VRAI OU FOU — "Swipe si t'oses"
- **Swipe cards Vrai/Faux** (PAS de QCM), 10 affirmations par session (passé de 20 le 18/04/2026)
- Timer : **15s**/question · Indices : Aucun
- Contenu : Funny facts (champs `statement_true` + `statement_false_funny` + `statement_false_plausible` en base)
- **Tirage fausse (18/04/2026)** : 75% plausible / 25% drôle (pondéré)
- Coût : Gratuit illimité
- Gains : **0 coins** (mode viralité/acquisition, pas farming)
- Déblocage f*cts : **Non** — mode vitrine/viral. Pour posséder un f*ct, jouer Quickie ou Quest.
- Partage score X/10 (WhatsApp/story) — levier acquisition

### 3. QUEST — "Le chemin des WTF!" (ex-Route WTF!)
- QCM **4 choix**, blocs de **5 Funny + 1 boss VIP conditionnel** (refonte 19/04/2026, ex-10+1)
- Timer : **30s** · Indices : 2/question (stock perso, achat 50 coins si vide) · **Indice boss : 100 coins**
- Coût : 1 énergie par tentative de bloc (extra = 200 coins)
- **Seuil boss : ≥3/5 bonnes réponses** sur les Funny pour affronter le boss VIP
- `<3/5` → proposition d'**achat accès boss** (100c × réponses manquantes : 0/5=300c, 1/5=200c, 2/5=100c). Refus = bloc raté.
- `≥3/5 + boss réussi` → niveau suivant, VIP débloqué
- `≥3/5 + boss raté` → bloqué, VIP verrouillé, retry boss depuis la carte
- Gains : **10 coins/bonne Funny** · **+0 coins/boss vaincu** (22/04/2026, anciennement 20c + 100c boss)
- Déblocage f*cts : Funny correctes (toujours) + VIP (si boss réussi)
- Anti-déduction boss : fausses tirées parmi 7 à chaque retry, 2 indices parmi 4 (seed par retry)
- Map progression : ~154 blocs × 6 niveaux (770 Funny ÷ 5)
- Spec source : `docs/QUEST_MODE_UPDATE.md`

### 4. RACE — "Zéro droit à l'erreur" (ex-No Limit)
- QCM **6 choix**, questions illimitées jusqu'à la première erreur
- Timer : **Aucun** · Indices : **Aucun**
- Contenu : Funny + VIP facts déjà débloqués (mélangés)
- Coût : Gratuit illimité
- Gains : **0 coins** (prestige/record uniquement)
- Déblocage f*cts : Non (facts déjà connus)
- UX : Compteur de série en gros, fond qui change de couleur, 1ère erreur = game over dramatique

### 5. BLITZ — "Défonce le chrono" (solo, 2 sous-modes — refonte 19/04/2026)

**Blitz est désormais un mode SOLO uniquement**. Le format asynchrone migre vers le mode **Multi** (§7).

#### 5a. Blitz Rush
- QCM **4 choix**, chrono **60s DESCENDANT**, erreur = **−5s**
- Score = **nombre de bonnes réponses** en 60s (plus = mieux)
- Pas de choix de catégorie — pool = tous les f*cts débloqués (Funny + VIP)
- Seuil minimum : 10 f*cts unlocked (19/04/2026)
- Paliers visuels : 5 / 10 / 20 / 30 / 50 / 100 bonnes
- Record : `wtfData.blitzSoloBestScore` + table `blitz_records` Supabase

#### 5b. Blitz Speedrun
- **Gate (19/04/2026) : ≥10 f*cts débloqués** dans la catégorie
- QCM **4 choix**, chrono **MONTANT** depuis 0s, erreur = **+5s**
- Score = **temps final** (plus bas = mieux)
- Palier (nb questions) : **5 / 10 / 20 / 30 / 50 / 100**
- Record : `wtfData.speedrunRecords[${catId}_${palier}]` + `blitz_records` Supabase
- Persistance cross-device via `mergeFlags({ speedrunRecords })`

### 6. DROP — "Le rendez-vous quotidien" (ex-Flash, ex-Hunt + Puzzle du Jour)
- QCM **2 choix**, 5 questions, timer **15s**
- Lun-Sam : Funny thème du jour, 0 indices, **30 coins fixe**
- Dimanche : VIP Hunt de la semaine, 2 indices, **1 VIP débloqué**
- Coût : Gratuit 1×/jour
- UX : Bannière thème du jour. Dimanche = mise en scène Hunt.
- **Règles ModeLaunchScreen (harmonisées 18/04/2026)** : 7 règles format `**Label** : valeur`, avec split Lun-Sam / Dim sur Indices et Gains

### 7. MULTI — "Défie tes amis" (nouveau mode 19/04/2026)

**Mode dédié au défi asynchrone** — remplace l'ancien Blitz Défi. Variantes Rush et Speedrun.

- **Flow** : MultiPage (lobby) → choix variant → ami → catégorie → (palier si Speedrun) → lancement
- **Économie** : **100 coins misés par joueur** (pot 200c). **Gagnant reçoit 150c** (profit +50c, perdant −100c, house +50c).
- **Égalité parfaite** (même score + même temps au centième) : `winner_id = NULL`, chacun récupère ses 100c.
- **Expiration 48h** : créateur remboursé 100c, défi passe en `status='expired'`. RPC `expire_pending_challenges()` idempotente.
- **Speedrun Multi** : ≥10 f*cts dans la cat requis (créateur ET accepteur).
- **RPC atomique `complete_duel_round`** : débit/crédit/trigger en 1 transaction.
- **Stats / historique** : onglet Amis de la navbar.
- Détails DB + flow complet : `docs/CLAUDE_ARCHITECTURE.md`

### Roulette WTF!
- 1 spin gratuit/jour + spins payants **100 coins**
- **12 segments** (refonte 18/04/2026, avant 8) — 8 classiques + 4 nouvelles récompenses
  - **Coins/Hints** : 20c(22%) / 50c(18%) / 1indice(14%) / 100c(10%) / 150c(7%) / 2indices(4%) / 300c(3%) / 750c jackpot(2%)
  - **Nouveaux** : +1 énergie(8%) / 1 f*ct débloqué(4%) / relance gratuite(5%) / Streak Freeze(3%)
- **Valeur espérée : 85,4 coins · Sink net : 14,6 coins/spin (14,6%)**
- 12 couleurs distinctes · Sons : `roulette_spin` / `roulette_tick` / `roulette_win` ou `roulette_jackpot`
- Spec source : `docs/ROULETTE_WTF_SPECS.md`

### Règles communes
- QCM facile (2 choix) : Drop
- QCM intermédiaire (4 choix) : Quickie
- QCM difficile (4 choix) : Quest, Blitz, Multi
- QCM hardcore (6 choix) : Race
- Swipe (0 QCM) : Vrai ou Fou
- Indices = stock perso, coût 50 coins boutique. Bouton grisé si stock vide, JAMAIS de pause timer.
- Énergie : cap 5, régén +1/8h, extra = 75 coins

### Tirage des fausses réponses — Source de vérité (19/04/2026)
Implémentation : `src/constants/gameConfig.js` (field `wrongDistribution`) + `src/utils/answers.js` (branche `weighted` / `counts`).

| Mode | QCM | Nb fausses | Tirage |
|------|-----|-----------|--------|
| Quickie | 4 | 3 | **Sur l'ensemble** : 80% plausible / 10% proche / 10% drôle (poids question 40/30/30 → jamais 2 drôles ou 2 proches sur la même question) |
| Drop | 2 | 1 | **Pondéré** : 70% plausible / 20% drôle / 10% proche (idem Quickie) |
| Quest (niveaux Funny) | 4 | 3 | **1 drôle + 2 plausible** (jamais proche) |
| Quest (boss VIP) | 4 | 3 | **3 plausible** — hardcore (fallback close puis funny si pool plausible < 3) |
| Blitz (Solo & Multi) | 4 | 3 | **1 drôle + 1 proche + 1 plausible** |
| Race | 6 | 5 | **2 drôles + 3 plausible** (jamais proche) |
| Vrai ou Fou | swipe | — | `statement_false` : 75% plausible / 25% drôle (pondéré) |

- Un fact "complet" a 3 funny + 2 close + 3 plausible (8 fausses réponses au total).
- Si un type est insuffisant : fallback sur les types déjà spécifiés dans la distribution (jamais de contamination par un type absent de la spec).
- Anti-déduction : localStorage `wtf_last_wrong_{factId}` persiste 1 fausse entre sessions.

## Streak & Coffres — Décision 20/04/2026 (évolution quotidienne)
- **Streak et coffres sont FUSIONNÉS** : le coffre quotidien = matérialisation visuelle du streak (plus de double rail).
- **Récompense CHAQUE jour** — plus de gap vide entre paliers :
  - **Quotidien J1-J30** : micro-récompense (15c→75c progressive, reset entre paliers)
  - **Débutant** (J3) = 75c (cerveau)
  - **Habitué** (J7) = 200c + 2 indices (cerveau)
  - **Fidèle** (J14) = 500c (cerveau)
  - **Semaine 3** (J21) = 50c + 1 indice (quotidien bonus)
  - **Légende** (J30) = 1 000c + cadre exclusif (cerveau)
  - **Post-Légende** (J31+) = 25c/jour fixe
- **Drop** reste le gameplay quotidien. Drop = actif, Coffres/Streak = passif.
- **Implémentation** : `src/hooks/useStreakRewards.js` + `STREAK_DAILY_REWARDS` dans gameConfig. Popup auto au chargement Home.

## Économie F2P — Source de vérité (15/04/2026) — VALEURS ×10

> 10 nouveau = 1 ancien. Permet les remises (-20%, -30%) et une sensation d'abondance.

| Paramètre | Valeur |
|-----------|--------|
| **Nouveau joueur** | **500 coins / 3 indices / 5 énergies** (plus de tickets) |
| Énergie max (stock) | 5 (régén +1/8h) |
| Énergie extra | 200 coins (22/04/2026, anciennement 75) |
| Indice (boutique) | 50 coins |
| Débloquer catégorie | 200 coins |
| Cosmétique profil (moyen) | 500 coins |
| Mise Multi (créateur) | 100 coins |
| Spin roulette (payant) | 100 coins |
| Gains journaliers cible | 250-400 coins/jour (22/04/2026 : Quickie reste dominant, Quest nerfé à ~50c/bloc) |
| Sinks journaliers cible | ~200 coins/jour (22/04/2026, énergie extra 200c, boss buy 100-300c) |
| Surplus net cible | 50-200 coins/jour |
| TTF (pression achat) | 4-7 jours (22/04/2026, resserré par nerf Quest + coût énergie) |
| **Devises** | **Coins + Gems uniquement** (plus de tickets) |
| **Modèle F2P** | **Modèle A+** — Starter Pack 2,99€ + Packs Gems + Abo optionnel |

**Monétisation Y1** : Starter Pack 2,99€ (1 500 coins + 5 indices + cadre exclusif) + Packs Gems + Abo optionnel. Roadmap Y2→Y5 dans `docs/CLAUDE_ARCHITECTURE.md`.

### Règles communes économie
- Indices : chaque utilisation débite 1 du stock (coût 50 coins en boutique)
- Indice non disponible si stock vide : bouton grisé, JAMAIS de pause du timer
- Bonus session parfaite : Quickie perfect = +50 coins. Quest pas de perfect bonus.

## Architecture contenu (15/04/2026, maj 19/04/2026)
- **WTF VIP** (~483) : Quest boss /5, Drop dimanche, Race/Blitz
- **Funny F*cts** (~770+) : Quickie, Vrai ou Fou, Quest niveaux, Drop lun-sam
- **Blitz** pioche dans TOUS les f*cts débloqués (VIP + Funny confondus)
- Collection : 2 onglets (WTF! + Funny F*cts)
- **Champs DB VOF** : `statement_true` + `statement_false_funny` + `statement_false_plausible` ✅
- Quest = ~924 niveaux (770 Funny ÷ 5 par bloc = ~154 blocs × 6 niveaux)

## Architecture Data (résumé)
- **Supabase** = source de vérité (coins, unlockedFacts, blitz_records, duels, friendships)
- **localStorage** = cache stale-while-revalidate (unlockedFacts, préférences UI)
- **React state** = UI éphémère
- Aucune écriture directe client → toutes les mutations via RPC / Edge Function
- Détails complets (répartition entités, conflits multi-device, offline, auth anonyme, migration) : `docs/CLAUDE_ARCHITECTURE.md`

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
| Catégorie (label) | ID | Couleur |
|---|---|---|
| What the Zoo | animaux | #6BCB77 |
| Ca plane ! | animaux-ciel | #B8A5E8 |
| Sous les vagues | animaux-marins | #40B4D8 |
| Griffes et Crocs | animaux-sauvages | #E8712A |
| Bestioles | bestioles | #7A9F35 |
| Bati dingue | architecture | #A0826D |
| Chef-d'oeuvre ? | art | #A07CD8 |
| Crazy Stars | celebrites | #FFD700 |
| Ecran noir | cinema | #D4AF37 |
| Corps et Ame | corps-humain | #F07070 |
| Casier judiciaire | crimes | #8B4789 |
| Dico WTF | definition | #4A9BD9 |
| On dit que... | dictons | #4CAF50 |
| Houston... | espace | #2E1A47 |
| A table ! | gastronomie | #FFA500 |
| Terre inconnue | geographie | #40D9C8 |
| Passe compose | histoire | #E8A030 |
| WTF 2.0 | internet | #5B8DBE |
| Idee de genie ? | inventions | #5BC0DE |
| Game On | jeux-jouets | #9B59B6 |
| Kids | kids | #E8C000 |
| Article 22 | lois | #6366B8 |
| Quel temps... | meteo | #6FC0D8 |
| Volume a fond | musique | #E84B8A |
| Mythes et Monstres | mythologie | #C8A84B |
| Phobies | phobies | #7B5EA7 |
| Coulisses du pouvoir | politique | #B24B4B |
| Tete a l'envers | psychologie | #8E44AD |
| Sans limites | records | #E8B84B |
| Quoi de neuf, Doc ? | sante | #90F090 |
| E = WTF² | sciences | #80C8E8 |
| Sport | sport | #E84535 |
| Geek zone | technologie | #7B8FA0 |
| On the road again | transports | #3A6FA0 |

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
- `src/utils/storageHelper.js` — centralise lectures localStorage
- `src/services/playerSyncService.js` — sync Supabase push/pull
- `src/constants/gameConfig.js` — config modes de jeu (7 modes configurés ✅)
- `src/data/factsService.js` — chargement facts Supabase
- `src/utils/answers.js` — tirage réponses QCM
- `src/hooks/usePlayerProfile.js` — source de vérité devises (applyCurrencyDelta)
- `src/screens/RevelationScreen.jsx` — revelation partagée Quickie/VOF (système accent violet/vert)
- `src/screens/VraiOuFouScreen.jsx` — mode Vrai ou Fou (swipe, timer 15s)
- `src/components/FallbackImage.jsx` — SVG inline dynamique (couleur catégorie)
- `src/components/CircularTimer.jsx` — timer avec variants default/quickie/vof
