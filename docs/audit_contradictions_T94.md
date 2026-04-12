# T94 — Audit contradictions Code vs CLAUDE.md

Date : 2026-04-12
Portée : vérifier que tous les paramètres gameplay/F2P sont alignés entre le code et la spec officielle (CLAUDE.md).

Légende : ✅ aligné · ❌ contradiction · ⚠️ zone grise · 📏 non-spec

---

## 1. Niveaux Quest

| Paramètre | CLAUDE.md | Code (`gameConfig.js`) | Statut |
|---|---|---|---|
| Cool choices | 2 | 2 | ✅ |
| Cool duration | 20s | 20s | ✅ |
| Cool freeHints | 2 | 2 | ✅ |
| Cool paidHints | +1 (8 coins) | 1 (hintCost=8) | ✅ |
| Cool coins/correct | 2 | 2 | ✅ |
| Hot choices | 4 | 4 | ✅ |
| Hot duration | 30s | 30s | ✅ |
| Hot freeHints | 2 | 2 | ✅ |
| Hot paidHints | +1 (8 coins) | 1 (hintCost=8) | ✅ |
| Hot coins/correct | 2 | 2 | ✅ |

**Verdict** : parfaitement aligné.

---

## 2. Mode Flash

| Paramètre | CLAUDE.md | Code | Statut |
|---|---|---|---|
| Coût | 1 énergie | consumeFlashEnergy() | ✅ |
| Questions | 5 | QUESTIONS_PER_GAME=5 | ✅ |
| QCM | 4 | FLASH.choices=4 | ✅ |
| Timer | 20s | FLASH.duration=20 | ✅ |
| Catégorie | **Aléatoire uniquement** | `setSelectedCategory(null)` dans handleFlashSolo | ✅ |
| Coins/correct | 2 | FLASH.coinsPerCorrect=2 | ✅ |

**Verdict** : aligné.

---

## 3. Mode Explorer — ❌ CONTRADICTION MAJEURE

| Paramètre | CLAUDE.md | Code | Statut |
|---|---|---|---|
| Coût | 1 énergie | consumeFlashEnergy() | ✅ |
| Questions | 5 | sessionFacts.slice(0, 5) | ✅ |
| QCM | 4 | HOT.choices=4 (hérité) | ✅ |
| Timer | **20s** | **HOT.duration=30s** | ❌ |
| Catégorie | Choix obligatoire | `setSelectedCategory(categoryId)` | ✅ |
| Coins/correct | **1 coin** (cat choisie) | **2 coins** (HOT.coinsPerCorrect=2) | ❌ |

**Cause** : Explorer utilise `DIFFICULTY_LEVELS.HOT` qui est paramétré pour Quest Hot (30s / 2 coins). Le code de `calcPoints` dans `useGameHandlers.js:51` tente de forcer 1 coin mais seulement pour `sessionType === 'flash_solo' && selectedCategory !== null`. Or :
- Flash n'a jamais `selectedCategory !== null` (random only)
- Explorer a `sessionType === 'explorer'`, pas `'flash_solo'`

→ **Le override ne s'applique jamais**. Explorer donne 2 coins/correct dans 30s au lieu de 1 coin dans 20s.

**Fix proposé** :
1. Créer `DIFFICULTY_LEVELS.EXPLORER` dédié avec `duration: 20, coinsPerCorrect: 1`
2. Remplacer les 3 sites (`useModeStarters.js:152`, `:168`, `useSelectionHandlers.js:107`) qui assignent `HOT` à Explorer par `EXPLORER`
3. Supprimer le override bâtard dans `calcPoints`

---

## 4. Mode Blitz

| Paramètre | CLAUDE.md | Code | Statut |
|---|---|---|---|
| Coût | Gratuit illimité | pas de consommation | ✅ |
| Timer | 60s chrono descendant | BLITZ.duration=60 | ✅ |
| QCM | 4 | BLITZ.choices=4 | ✅ |
| Indices | Aucun | BLITZ.hintsAllowed=false | ✅ |
| Coins | 0 (prestige only) | BLITZ.coinsPerCorrect=0 | ✅ |
| Paliers | 5/10/20/30/40/50 | questionOptions dans BlitzLobby | ✅ |
| Contenu | Tous f*cts débloqués (VIP+Funny) | getValidFacts().filter(unlocked) | ✅ |

**Verdict** : aligné (après fix doc 710cde0).

---

## 5. Mode Hunt

| Paramètre | CLAUDE.md | Code | Statut |
|---|---|---|---|
| Coût | Gratuit, 1×/semaine | coffreClaimedDays[6] check | ✅ |
| Questions | 5 | slice(0, 5) | ✅ |
| QCM | 4 | HUNT.choices=4 | ✅ |
| Timer | 20s | HUNT.duration=20 | ✅ |
| Indices | 2 (stock gratuit) | HUNT.freeHints=2 | ✅ |
| Sélection fact | Seed ISO-week | getTodayDailyFact (ISO week-based) | ✅ |

**Verdict** : aligné. (Nommage "WTF du Jour" partiellement corrigé en T92.)

---

## 6. Mode Puzzle du Jour

| Paramètre | CLAUDE.md | Code | Statut |
|---|---|---|---|
| Coût | Gratuit 1×/jour | storageKey daily check | ✅ |
| Questions | 1 funny fact | 1 fact | ✅ |
| QCM | 4 | 4 choices | ✅ |
| Tentatives | 3 | attemptsLeft=3 | ✅ |
| Coins | 6/4/2 | `attemptsLeft === 3 ? 6 : attemptsLeft === 2 ? 4 : 2` | ✅ |

**Verdict** : aligné.

---

## 7. Mode Route WTF!

| Paramètre | CLAUDE.md | Code (`RouteScreen.jsx`) | Statut |
|---|---|---|---|
| Coût | Gratuit illimité | pas de consommation | ✅ |
| Structure | Niveaux infinis (3Q funny) | session.facts.length=3 (non-boss) | ✅ |
| Boss | Tous les 10 niveaux (1Q VIP HOT) | `level % 10 === 0 → boss` | ✅ |
| Coins | 6/niveau · 20/boss | `session.boss ? 20 : 6` | ✅ |
| Avancement | Niveau parfait requis | `perfect = finalCorrect === total` | ✅ |

**Verdict** : aligné.

---

## 8. Économie F2P — Nouveau joueur

| Paramètre | CLAUDE.md | Code | Statut |
|---|---|---|---|
| Coins départ | 0 | 0 (trigger DB + createProfile + reset) | ✅ (après fix 710cde0) |
| Tickets départ | 1 | 1 | ✅ |
| Indices départ | 3 | 3 | ✅ |
| Énergie départ | 3 | 3 | ✅ |

**Verdict** : aligné (après fix 710cde0).

---

## 9. Prix Boutique

| Item | CLAUDE.md | Code (`BoutiquePage.jsx` + `HowToPlayModal.jsx`) | Statut |
|---|---|---|---|
| 1 ticket | 25 coins | HINT_PACKS `{quantity:1, price:25}` | ✅ |
| 1 indice | 10 coins | HINT_PACKS `{quantity:1, price:10}` | ✅ |
| 3 indices | 30 coins | HINT_PACKS `{quantity:3, price:30}` | ✅ |
| 5 indices | 45 coins (-10%) | HINT_PACKS `{quantity:5, price:45}` | ✅ |
| Pack Découverte | non-spec | 15 coins / 2 funny | 📏 |
| Pack Standard | non-spec | 35 coins / 5 funny | 📏 |
| Pack Catégorie | non-spec | 40 coins / 4 funny | 📏 |
| Pack Premium | non-spec | 80 coins / 7 facts 5% VIP | 📏 |
| Pack Mega | non-spec | 150 coins / 12 facts 1 VIP | 📏 |

**Verdict** : aligné mais **5 Mystery Packs non documentés dans CLAUDE.md**. À ajouter dans §Économie F2P pour devenir source de vérité.

---

## 10. Streak rewards

| Jour | CLAUDE.md | Code (`gameConfig.js:131`) | Statut |
|---|---|---|---|
| J1 | 2 coins | `{coins:2, tickets:0, hints:0}` | ✅ |
| J3 | 2 indices | `{coins:0, tickets:0, hints:2}` | ✅ |
| J7 | 10 coins + 1 ticket | `{coins:10, tickets:1, hints:0, badge:true}` | ✅ (+badge non-spec) |
| J14 | 1 ticket + 3 indices | `{coins:0, tickets:1, hints:3}` | ✅ |
| J30 | non-spec | `{special:'wtf_premium'}` | 📏 |

**Verdict** : aligné (J7 badge et J30 WTF Premium non documentés CLAUDE.md).

---

## 11. Énergie — ⚠️ CONFLICT AVEC T91

| Paramètre | CLAUDE.md | Code | T91 demande |
|---|---|---|---|
| Stock initial | 3 | 3 (profiles.energy DEFAULT 3) | 3 |
| Max stock | 10 | CHECK `energy <= 10` | **5** |
| Régén | +1/8h jusqu'à 3 | **pas de régén** (`flashEnergyUsed` reset journalier) | +1/8h jusqu'à 5 |
| Modèle | stock + régén | **compteur journalier** (`flashEnergyDate`) | stock + régén |

**Cause** : deux mécanismes coexistent :
- `energyService.js` utilise `wtf_data.flashEnergyUsed` / `flashEnergyDate` → compteur journalier, reset à minuit
- `profiles.energy` (bloc 1 SQL Phase A) → stock persistant, mais pas lu/écrit par le gameplay

**Verdict** : T91 tranchera. La bonne direction est le modèle **stock persistant régénérable** (cohérent avec F2P mobile standard). Il faut :
1. Changer `CHECK energy <= 10` en `<= 5`
2. Réécrire `energyService.js` pour utiliser `profiles.energy` + `energy_reset_at`
3. Supprimer `flashEnergyUsed` / `flashEnergyDate` du `wtf_data`
4. Ajouter un job de régen (client-side : recalcule au mount en fonction de `energy_reset_at`)

---

## 12. Vocabulaire (CLAUDE.md §Vocabulaire officiel)

| Terme officiel | Occurrences non conformes |
|---|---|
| f*ct / f*cts | (aucune occurrence "fact" problématique — le code utilise `fact` comme variable, `f*ct` seulement en UI) ✅ |
| WTF! (avec !) | (aucune occurrence "WTF" sans point dans les strings UI) ✅ |
| Niveaux : Cool / Hot / WTF! | WTF! retiré de Quest mais toujours dans `gameConfig.js:19-24` comme legacy. Documenté par commentaire. ⚠️ |
| Streak → Série | Code utilise `streak` partout (var names), UI mélange "Série" et "streak" : SocialPage, HomeScreen, RecompensesPage. ⚠️ |
| Mode Parcours → Quête WTF! | Code utilise `sessionType === 'parcours'` partout. Legacy accepté dans useHandleNext (comment). ⚠️ |
| Ratées → À découvrir | Pas vérifié en profondeur. |

**Verdict** : terminologie interne ≠ UI, mais cohérent dans chaque zone. Ratio migration interne vs risque de casse = défavorable.

---

## 13. Architecture contenu

| Règle CLAUDE.md | Implémentation | Statut |
|---|---|---|
| WTF VIP → Quête (source unique déblocage) | `getQuestFacts()` filtre `isVip:true` | ✅ |
| F*cts générés → Jouer/Explorer/Hunt/Puzzle/Route | Chaque mode utilise `getFunnyFacts()` ou équivalent | ✅ |
| Blitz = tous les f*cts débloqués (VIP+Funny) | `getBlitzFacts()` = `getValidFacts().filter(unlocked)` | ✅ (après fix d1ac537) |

**Verdict** : aligné.

---

# Synthèse

## Contradictions **à corriger** (ordre de priorité)

1. **🔴 Explorer → 30s/2coins au lieu de 20s/1coin** — bug économie direct, impact F2P (item #3).
2. **⚠️ T91 énergie** — décisions à trancher (item #11), déjà priorisé.
3. **📏 Mystery Packs non documentés** — ajouter les 5 tiers dans CLAUDE.md §Économie F2P pour qu'elle reste source de vérité (item #9).
4. **📏 Streak J7 badge + J30 WTF Premium** — ajouter dans CLAUDE.md §Économie F2P (item #10).

## Non-contradictions (tout va bien)

- Niveaux Quest (Cool, Hot) ✅
- Mode Flash ✅
- Mode Blitz ✅
- Mode Hunt ✅
- Puzzle du Jour ✅
- Route WTF! ✅
- Économie F2P nouveau joueur ✅ (depuis 710cde0)
- Architecture contenu ✅ (depuis d1ac537)
- Prix boutique standard ✅
- Streak rewards (J1/J3/J7/J14) ✅

## Zones grises (dette documentaire)

- DIFFICULTY_LEVELS.WTF legacy conservé dans le code — justifié par compat facts existants, commenté.
- Terminologie "parcours" vs "Quête WTF!" — interne vs UI, acceptable tel quel.
- Terminologie "streak" vs "Série" — idem.
- Nommage `wtfDuJour*` dans localStorage — T92 partiel, migration complète = T+ futur.

---

## Plan de correction immédiat

**T94.a — Explorer difficulty** (20min, priorité haute) :
- Créer `DIFFICULTY_LEVELS.EXPLORER` (choices:4, duration:20, coinsPerCorrect:1)
- Remplacer les 3 assignations HOT→EXPLORER dans useModeStarters + useSelectionHandlers
- Supprimer l'override `if (sessionType === 'flash_solo' && selectedCategory !== null)` dans calcPoints

**T94.b — Documentation** (10min, priorité basse) :
- Ajouter section "Packs Boutique" dans CLAUDE.md §Économie F2P avec les 5 tiers mystery
- Ajouter J7 badge et J30 WTF Premium dans la table streak rewards

**T91 — Énergie** (à traiter séparément selon priorité user).
