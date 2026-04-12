# T95 — Analyse F2P : coût unitaire du coin et cohérence des prix

Date : 2026-04-12
Objectif : déterminer combien vaut "1 coin" en temps joueur, puis vérifier que tous les prix et gains de l'économie sont cohérents avec cette valeur.

---

## 1. Calcul du coût unitaire du coin (gains-based)

### Sources de gains principales

| Source | Coins | Temps estimé | Coins/minute |
|---|---|---|---|
| Flash (5 Q × 2 coins) | 10 | ~60s (12s/Q) | 10/min |
| Flash perfect bonus | +10 | - | +10/run |
| Quest Hot (5 Q × 2 coins) | 10 | ~90s (18s/Q) | 6,7/min |
| Quest perfect bonus | +10 | - | +10/run |
| Explorer (5 Q × 1 coin) | 5 | ~60s | 5/min |
| Explorer perfect bonus | +10 | - | +10/run |
| Hunt / WTF de la Semaine (5 Q × 2) | 10 + 10 bonus = 20 | ~60s, 1×/semaine | 20/sem |
| Puzzle du Jour | 6/4/2 (selon tentatives) | ~30s, 1×/jour | ~42/sem (moy 6) |
| Route niveau standard (3 Q) | 6 | ~45s | 8/min |
| Route boss (1 Q VIP) | 20 | ~20s, 1×/10 niveaux | - |
| Blitz | 0 | - | prestige only |
| Coffre quotidien (7 jours) | 5-15/jour + bonus dimanche | - | ~60 coins/sem |
| Streak J7 | 10 + 1 ticket | - | bonus |
| Roulette quotidienne (spin gratuit) | avg 9 coins (moyenne pondérée) | - | ~63 coins/sem |

### Revenu quotidien théorique (joueur actif 15 min/jour)

**Hypothèse** : joueur actif joue ~15min/jour, soit ~3 sessions Flash + 1 Quest + 1 Puzzle du Jour + coffre + roulette.

| Source | Gain journalier moyen |
|---|---|
| 3 × Flash (perfect 50% du temps) | 3×10 + 1,5×10 = 45 coins |
| 1 × Quest (perfect 50%) | 10 + 5 = 15 coins |
| Puzzle du Jour | 6 coins (moy) |
| Coffre quotidien | 5-15 coins (moy 9) |
| Roulette gratuit | 9 coins (moy) |
| **Total estimé** | **~84 coins/jour** |

**CLAUDE.md dit** : "Gains journaliers cible | 30-50 coins/jour"

**Écart** : le code réel génère **~84 coins/jour**, soit **~70% de plus** que la cible. Deux hypothèses :
1. La cible CLAUDE.md est obsolète (avant l'ajout des coffres + roulette + puzzle)
2. Les gains actuels sont trop généreux → le F2P pousse moins à l'achat (TTF allongé)

**Décision à prendre** : soit mettre à jour la cible dans CLAUDE.md à 70-90 coins/jour, soit diminuer les gains (baisser Flash bonus, Puzzle, etc.).

### Coût unitaire d'un coin

Avec ~84 coins/jour pour 15min de jeu :
- **1 coin = ~10,7 secondes de jeu joueur actif**
- **1 coin ≈ 0,18 min de gameplay**
- **100 coins ≈ 18 minutes**
- **1000 coins ≈ 3 heures**

---

## 2. Analyse des prix actuels

### Essentiels boutique

| Item | Prix (coins) | Temps équivalent | Verdict |
|---|---|---|---|
| 1 ticket | 25 | 4,5 min | ✅ Cohérent : 1 ticket = 1 Quest, et 1 Quest rapporte ~15 coins → ROI = 60% |
| 1 indice | 10 | 1,8 min | ✅ Cohérent : indice situationnel, prix abordable |
| 3 indices | 30 | 5,4 min | ✅ 0% discount vs achat unitaire |
| 5 indices | 45 | 8 min | ✅ -10% discount = 9 coins/indice |

**Remarque** : 3 indices au même prix unitaire que 1 indice n'incite pas à acheter en pack. Suggérer 3×10 → **28 coins** (-7%) pour créer un vrai incentive bulk.

### Mystery Packs (code)

| Pack | Prix | Contenu | Valeur/coin | Verdict |
|---|---|---|---|---|
| Découverte | 15 | 2 funny | 7,5 coins/f*ct | ✅ Entrée de gamme accessible |
| Standard | 35 | 5 funny | 7 coins/f*ct | ✅ Discount vs Découverte |
| Catégorie | 40 | 4 funny (cat choisie) | 10 coins/f*ct | ⚠️ **Plus cher que Standard** alors qu'on achète moins → le discount est sur le "choix de catégorie", pas sur le volume. Acceptable si c'est un pricing "premium placement". |
| Premium | 80 | 7 f*cts, 5% VIP chacun | 11,4 coins/f*ct | ⚠️ Plus cher que Catégorie mais **aléatoire** sur le choix VIP → valeur perçue dépend du RNG. Risque de frustration. |
| Mega | 150 | 12 f*cts + 1 VIP garanti | 12,5 coins/f*ct | ✅ VIP garanti justifie le prix |

**Problème détecté** : la progression de prix/f*ct est **inversée** par rapport à une pyramide F2P classique :
- Découverte : 7,5/f*ct
- Standard : 7/f*ct ← **meilleur ratio**
- Catégorie : 10/f*ct
- Premium : 11,4/f*ct
- Mega : 12,5/f*ct

Normalement les gros packs doivent avoir le **meilleur ratio**. Ici Standard est optimal → un joueur rationnel achètera toujours Standard, jamais Catégorie ni Premium.

**Fix proposé** :
- Standard à 40 coins (au lieu de 35) → 8 coins/f*ct
- Catégorie à 35 coins (au lieu de 40) → 8,75 coins/f*ct (justifié par le choix catégorie)
- Premium à 65 coins (au lieu de 80) → 9,3 coins/f*ct (reste raisonnable vu le RNG VIP)
- Mega à 130 coins (au lieu de 150) → 10,8 coins/f*ct (meilleur ratio + VIP garanti = top-tier)

Après ajustement : **10,8 < 9,3 < 8,75 < 8 < 7,5** (inversé = le plus gros pack = meilleur ratio).

### Énergie (FLASH_ENERGY)

| Item | Prix | Temps équivalent | Verdict |
|---|---|---|---|
| 1 session extra (FLASH_ENERGY.EXTRA_SESSION_COST) | 10 coins | 1,8 min | ✅ 1 session = 1 Flash = 10 coins potentiel → ROI neutre |
| 1 énergie boutique | 10 coins | 1,8 min | ✅ même prix |

**Note** : avec T91 (stock persistant max 5, régén 8h), il faudra repenser le pricing. Si un joueur achète de l'énergie pour jouer PLUS, le prix doit être sous le gain généré (sinon pas d'intérêt économique). 10 coins pour une session Flash qui en rapporte 10 = break-even → pas d'incentive. Suggérer **7 coins/énergie** pour créer une vraie économie (achat = +3 coins/session).

### Cadres Avatar

Non vérifié en profondeur (cosmétique pur, prix libre).

### Achat de f*cts dans Collection (CategoryFactsView)

| Type | Prix | Valeur |
|---|---|---|
| Funny f*ct | 5 coins | 1 min jeu |
| VIP f*ct | 25 coins | 4,5 min jeu |

**Verdict** : prix bas vs mystery packs. Un joueur qui veut un f*ct précis paiera 5 coins vs 7-12 coins en pack mystery. Cohérent car le choix est ciblé et les funny sont abondants.

---

## 3. Dépenses vs Gains — TTF (Time To First Purchase)

**TTF actuel estimé** : ~3 sessions Flash = 3 minutes pour le premier achat 1 indice (10 coins).
Mais le joueur **démarre à 0 coins** avec 1 ticket + 3 indices gratuits. Donc :

- **Jour 1 nouveau joueur** : joue Quest gratuit (1 ticket) → gagne ~15 coins + 3 indices → 15 coins dispo
- **Jour 1 achat possible** : 1 indice (10 coins) ou commencer à épargner pour Pack Découverte (15 coins)

**TTF réel** : achat possible dès le 1er Flash/Quest. Très accessible.

**Problème F2P** : avec ~84 coins/jour, en **3 jours** le joueur a ~250 coins, de quoi acheter un Pack Mega (150 coins) + 10 indices. Le plafond de progression est atteint rapidement → pas de pression d'achat réel.

**Recommandation** : soit abaisser les gains journaliers (supprimer Puzzle du Jour = -6, baisser roulette = -4), soit augmenter les prix pour étaler la progression.

---

## 4. Synthèse

### Valeur d'un coin (verdict)

**1 coin ≈ 10 secondes de gameplay actif.** Référence à garder en tête pour tout nouveau prix/gain ajouté.

### Priorités d'ajustement

**🔴 Urgent (économie cassée)** :
1. **Rééquilibrer mystery packs** pour que les gros aient meilleur ratio (table ci-dessus)
2. **Arbitrer cible gains journaliers** : soit update CLAUDE.md à 70-90, soit diminuer les sources

**🟡 Moyen** :
3. **Discount 3 indices** : passer 30→28 pour créer un vrai incentive bulk
4. **Énergie pricing post-T91** : baisser à 7 coins pour créer incentive d'achat

**🟢 Faible** :
5. Cadres avatar — pricing cosmétique libre, non critique
6. Pack Catégorie : ratio inversé documenté, à fixer avec le reste

### Question pour le designer (toi)

**Quel est l'objectif F2P que tu veux ?**

- **A — F2P généreux** : le joueur progresse vite, beaucoup de contenu débloqué, achats cosmétiques ou raccourcis. Modèle "vitrine", monétisation faible mais rétention élevée.
- **B — F2P équilibré** : progression mesurée, 1 achat stratégique par semaine attendu (pack de facts, tickets). Modèle "casual mobile".
- **C — F2P agressif** : pression d'achat régulière, coffres chers, limits journalières strictes. Modèle "hardcore mobile", ARPU élevé mais friction.

Selon ton choix, on calibre tous les prix et gains à partir du coût unitaire (~10s/coin).

**Ma reco** : **B — équilibré**. WTF! est un jeu casual, 1 pack de facts/semaine + quelques indices est le sweet spot. Actions concrètes :
- Gains journaliers cible : 50-70 (entre CLAUDE.md 30-50 et réel 84)
- Packs mystery alignés sur pyramide inversée (ratio améliore avec le volume)
- Prix fixés pour qu'un joueur actif 15min/jour puisse acheter 1 pack mystery/semaine sans effort + quelques indices
