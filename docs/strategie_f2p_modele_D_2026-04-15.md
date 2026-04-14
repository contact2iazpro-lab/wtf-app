# 📊 Stratégie F2P & Gameplay — WTF! What The F*ct

**Document stratégique canonique — v1**
**Date** : 2026-04-15
**Auteur** : session Claude Code (audit + benchmarking + reco)
**Statut** : à valider par le producteur avant exécution

> Ce document est le **référentiel stratégique** du jeu. Il synthétise l'analyse de la concurrence, le diagnostic de l'économie actuelle, trois modèles F2P alternatifs, et la recommandation finale (**Modèle D — Modèle Hybride + Saisons Battle Pass**).
>
> Toutes les décisions de roadmap V3+ doivent être cohérentes avec ce document. Toute divergence doit être explicitement tracée et justifiée dans un addendum.

---

## Table des matières

1. [Contexte et valeur différenciante de WTF](#1-contexte-et-valeur-différenciante-de-wtf)
2. [Benchmarking compétitif](#2-benchmarking-compétitif)
3. [Diagnostic de l'économie F2P actuelle](#3-diagnostic-de-léconomie-f2p-actuelle)
4. [Les quatre modèles étudiés](#4-les-quatre-modèles-étudiés)
5. [Matrice de comparaison](#5-matrice-de-comparaison)
6. [Recommandation finale : Modèle D](#6-recommandation-finale--modèle-d)
7. [Roadmap d'exécution en phases](#7-roadmap-dexécution-en-phases)
8. [Questions ouvertes](#8-questions-ouvertes)
9. [Risques identifiés et mitigations](#9-risques-identifiés-et-mitigations)
10. [Annexes — calculs coût par f*ct](#10-annexes--calculs-coût-par-fct)

---

## 1. Contexte et valeur différenciante de WTF

### 1.1 Ce qui distingue WTF du marché trivia

**Actif n°1 — VIP facts avec images uniques**
- 350 facts VIP originaux, écrits et illustrés spécifiquement pour le jeu.
- Ton hunor visuel catchy, impossible à répliquer sans travail éditorial + illustration.
- **Stock extensible** : la production peut continuer à un rythme de 20-40 VIP/mois via pipeline éditorial assisté IA.
- **Équivalent gameplay** : ce sont les "cartes légendaires" dans Clash Royale, les "skins" dans Fortnite, la "collection Pokédex" dans Pokémon.

**Actif n°2 — Funny facts (commodity)**
- ~676 funny facts générés par IA, interchangeables avec d'autres trivia games.
- Rôle : matière première pour entraînement, gameplay quotidien, pas un actif rare.
- Fonction monétaire : équivalent au "gold" de Clash Royale ou "XP" de Duolingo.

**Actif n°3 — Gameplay multi-modes**
- 7 modes actifs : Quête WTF!, Flash, Explorer, Blitz, Hunt, Puzzle du Jour, Route WTF!, + Défi entre amis.
- Position sur le marché : croisement inédit de trois ADN :
  - **Clash Royale** : paliers, records, trophées, chrono
  - **Duolingo** : streak quotidien, progression linéaire, rétention long terme
  - **Kingdom Rush / Brawl Stars** : niveaux, boss, étoiles, complétion

**Aucun trivia game du marché ne combine ces trois mécaniques.** C'est une opportunité de positionnement unique.

### 1.2 Ton et public cible (à confirmer)

Hypothèse de travail : **adulte 18-35 ans**, humour un peu décalé, culture générale mainstream+, pas infantile. À valider dans les questions ouvertes.

---

## 2. Benchmarking compétitif

### 2.1 Trivia pur — le piège à éviter

| Jeu | Forces | Limites | LTV moyen |
|---|---|---|---|
| **Trivia Crack** | 500M+ DL, collection de characters rares, removal ads | Contenu interchangeable, plafond monétisation | 3-5 € / user |
| **QuizUp** | Communautés par sujet, 1v1 async | Échec commercial (pas de rareté, tout accessible) | — (mort) |
| **Quizduel** | Duels amis, propre | Plafond LTV bas | 2-5 € / user |
| **HQ Trivia** | Live events prize money | Modèle non viable (prize pool insoutenable) | — (mort) |

**Leçon** : sans rareté de contenu, un trivia plafonne à **3-5 € LTV**. WTF doit exploiter la rareté VIP pour dépasser ce plafond.

### 2.2 Clash Royale — gacha skill-based

**Mécaniques à retenir** :
- **Dual currency** : gold (soft) + gems (premium). Gems achetés en € ou gagnés rarement.
- **Coffres à timer** : 3h, 8h, 12h, 24h + rares (Magical, Legendary). Chaque coffre = Skinner box (attente + ouverture + RNG de rareté).
- **Rareté en 4 tiers** : Common / Rare / Epic / Legendary. Les Legendary sont le graal — à la fois collection, brag, et power.
- **Battle Pass** : Pass Royal 4,99 €/mois → coffres garantis, cosmétiques, boosters.
- **Social** : clans, donations, trophée ranking.

**LTV observée** : 30-80 € sur 6 mois pour "dolphins", 500 €+ pour "whales".

**Leçon pour WTF** :
- Les VIP facts peuvent suivre une rareté tiered (Common / Rare / Epic / Legendary).
- Les coffres à timer créent un rituel quotidien.
- Le dual currency est validé par la preuve du marché.

### 2.3 Duolingo — machine à rétention

**Mécaniques à retenir** :
- **Streak** = actif n°1. Le joueur ne joue plus pour apprendre, il joue pour ne pas casser sa série. Certains maintiennent 1000+ jours.
- **Hearts** : 5 vies, régen 6h, refill en gems. Friction artificielle qui pousse à l'achat.
- **Gems** (diamants) comme devise premium.
- **Leagues** : Bronze → Diamond → Obsidian. 30 joueurs par league, tournoi hebdomadaire avec promo/relégation. Renforce compétition et retour quotidien.
- **Super Duolingo** : 6,99 €/mois → pas de hearts, pas de pubs, boosters XP.

**LTV observée** : 15-40 € / user payant, taux de conversion 2-5%.

**Leçon pour WTF** :
- Le streak actuel est **sous-exploité** : affiché mais ne verrouille rien, ne punit pas la perte.
- **Hearts/lives** comme friction : WTF a "énergie" qui est ce concept mais mal exploité.
- **Leagues hebdomadaires** : potentiel inexploité. Les records Blitz et les duels asynchrones sont à 80% du chemin, il manque la promotion/relégation hebdo.

### 2.4 Kingdom Rush / Brawl Stars — progression + héros

**Mécaniques à retenir** :
- **Progression linéaire** avec étoiles (1/2/3 par niveau). Complétionnisme fort.
- **Boss fights** tous les N niveaux.
- **Héros/Brawlers** = différenciation loadout.

**Leçon pour WTF** :
- **Route WTF! est déjà structurée comme Kingdom Rush** (niveaux + boss tous les 10). À renforcer.
- Le concept "héros" pourrait devenir des **avatars / boosters** qui débloquent + de facts par session, ou modifient les drops rates de coffres.

---

## 3. Diagnostic de l'économie F2P actuelle

### 3.1 Ce qui fonctionne

- Sessions courtes (5 questions) → facile à jouer 1 min dans le métro
- Blitz = mécanique de skill avec records partageables → potentiel viral
- Puzzle du Jour = daily driver gratuit, rétention sans friction
- Défi asynchrone entre amis = déjà à 80% de la mécanique Clash Royale duels

### 3.2 Ce qui ne fonctionne pas (audit T95 + vue stratégique)

1. **Gains vs sinks déséquilibrés** : ~84 coins/jour en heavy play vs 30-50 coins/jour cible. Plafond atteint en 3 jours → **pas de pression d'achat**.

2. **VIP facts mal monétisés** : 25 coins par ticket Quest = 5 c/VIP si perfect. Le joueur peut farmer TOUS les 350 VIP en ~2 mois sans jamais dépenser un euro. **La rareté n'existe pas côté drop rate.**

3. **Packs Mystery incohérents** : Pack Premium 80c à 5% VIP RNG → prix psychologique cassé. Le joueur rationnel achète Standard (35c, meilleur ratio) et rien d'autre. Audit T95 a proposé une correction.

4. **Streak sous-valorisé** : linéaire, aucun risque de perte, récompenses paliers J1/J3/J7/J14/J30 seulement.

5. **Pas de dual currency** : tout se joue sur les coins. Aucun outil pour bypass le soft cap → personne ne convertit en €.

6. **Aucun mécanisme anti-fatigue contenu** : 350 VIP = 3-6 mois de jeu. Après, pourquoi revenir ? La roadmap générative IA aide mais ne crée pas de rareté perçue.

### 3.3 Coût actuel par f*ct (annexe détaillée en §10)

**Funny fact** : 0 à 12,5 c (0-13 centimes €) selon la source. Valeur médiane payante : **7-10 c** (Pack Standard). Valeur minimale farming : **0 c** (Flash gratuit avec énergie régen).

**VIP fact** : 0 à 228 c (0-2,30 €) selon la source. Valeur médiane payante : **25 c** via Quest (1 ticket). Valeur minimale farming : **0 c** (Hunt hebdomadaire).

**Observation clé** : le ratio VIP/Funny payant est actuellement 3-5× (Quest vs Pack Standard). C'est trop faible pour un contenu rare. Dans Clash Royale, une Legendary vaut 40-100× une Common.

---

## 4. Les quatre modèles étudiés

### 4.1 🅰️ Modèle A — Préservation gameplay + F2P rééquilibré

**Principe** : corrige les prix, ajoute ce qui manque (dual currency, battle pass), garde le gameplay existant.

**Actions clés** :
- Rééquilibrage packs Mystery (T95 : Standard 35→40c, Premium 80→65c, Mega 150→130c)
- Introduction gems comme devise premium
- Rareté VIP en 4 tiers (drop rates différenciés)
- Battle Pass 4,99 €/mois
- Streak renforcé (rachats gems, récompenses paliers enrichies)

**Forces** :
- ✅ Modification minimale du gameplay
- ✅ Implémentation rapide (4-6 semaines)
- ✅ Risque de churn minimal

**Faiblesses** :
- ❌ Rétention reste passive
- ❌ LTV plafonné à 20-30 € par dolphin
- ❌ Pas de vrai end-game
- ❌ Concurrence directe avec Trivia Crack (même mécanique)

**LTV estimée** : 12-25 € / payant, conversion 2-3%.

### 4.2 🅱️ Modèle B — Refonte gameplay gacha (Clash Royale-style)

**Principe** : les VIP facts deviennent des cartes Pokédex collectionnables. Les modes deviennent des sources de coffres. Le joueur joue pour compléter sa collection.

**Core loop** :
1. Jouer (Quest/Blitz/Route/Défi) → gagner un coffre
2. Ouvrir le coffre (timer ou instantané) → révéler des cartes
3. Cartes ajoutées au Pokédex OU donnent poussière si doublon
4. Poussière → craft ciblé

**Modifications gameplay** :
- Quest devient source principale de coffres
- Flash devient mode entraînement XP
- Blitz devient arène avec trophées et rang
- Route devient world map avec étoiles et boss
- Défi devient duel avec coffre Arena
- Nouveaux modes : Raid collaboratif, Tournament mensuel

**Forces** :
- ✅ Exploite pleinement la valeur des 350 VIP
- ✅ LTV élevée (40-100 € dolphins, 500 €+ whales)
- ✅ Rétention collectionnisme à long terme
- ✅ Différenciation forte vs trivia concurrents

**Faiblesses** :
- ❌ Refonte majeure (10-16 semaines)
- ❌ Risque de complexité UX
- ❌ Dépendance forte à la production de contenu
- ❌ Risque de pay-to-win perçu si mal balancé

**LTV estimée** : 25-80 € / payant, conversion 4-7%.

### 4.3 🅲 Modèle C — Hybride (Duolingo retention + Gacha VIP)

**Principe** : Prendre la rétention Duolingo (streak + leagues + hearts), la monétisation Clash Royale (VIP cards + chests), et garder les modes skill (Blitz, Défi, Route) qui font l'ADN actuel.

**Piliers** :

**A. Core loop quotidien — Duolingo**
- Objectif : X XP par jour
- Streak sacré + streak freeze + streak rescue (20 gems dans les 24h)
- League hebdomadaire Bronze → Obsidian avec promo/relégation

**B. Collection VIP — Clash Royale**
- 4 raretés (Common / Rare / Epic / Legendary)
- Coffres obtenus via jeu (chaque mode contribue différemment)
- Essence VIP pour craft ciblé des doublons

**C. Hearts = Énergie renommée**
- 5 hearts, regen 4h
- Perte sur sous-perfect en Quest/Flash
- Refill : 10 gems
- Modes skill (Blitz, Route, Puzzle, Défi) restent illimités (refuges sans hearts)

**D. Triple currency**
- **Coins** (soft) — jouer
- **Gems** (premium) — €
- **Essence VIP** (craft) — doublons

**E. Battle Pass**
- WTF Pass 4,99 €/mois, 40 tiers, gratuit + premium

**F. Retention layer**
- Daily quests (3/jour)
- Weekly quests (5/semaine)
- Leagues Blitz hebdo
- Notifications push

**Forces** :
- ✅ Rétention maximale (meilleur du F2P mobile)
- ✅ Monétisation puissante (triple currency + gacha + BP + abo)
- ✅ VIP pleinement valorisés
- ✅ Modes existants gardés et renforcés
- ✅ Scalable
- ✅ LTV élevée (30-100 €, whales 500 €+)

**Faiblesses** :
- ❌ Complexité UX (onboarding plus long)
- ❌ Dépendance à l'exécution (playtests intensifs requis)
- ❌ Temps de dev 12-20 semaines
- ❌ Risque paywall perçu si hearts trop punitifs

**LTV estimée** : 30-100 € / payant, conversion 4-6%.

### 4.4 🅳 Modèle D — Modèle C + Saisons Battle Pass (recommandé)

**Principe** : même architecture que Modèle C, mais avec un engagement ferme sur un **contenu saisonnier VIP** pour créer une rétention sans fin.

**Pilier additionnel — Saisons**

- **1 saison toutes les 8 semaines** avec **20-40 nouveaux VIP exclusifs**
- Chaque saison a un thème (Halloween, Sciences bizarres, Célébrités oubliées, Histoire sombre, etc.)
- Les VIP de la saison sont garantis via le Battle Pass premium (4,99 €)
- Après la saison, ces VIP restent accessibles mais plus rares (craft via essence augmentée)
- Les VIP de saison passée restent dans le Pokédex — rien n'est perdu

**Pourquoi Modèle D bat Modèle C sur le long terme** :

Modèle C sans saisons → le joueur complète le Pokédex en 3-4 mois → churn.
Modèle D avec saisons → le joueur revient chaque 8 semaines pour la nouvelle collection.

**Pattern confirmé** : Fortnite, Clash Royale, Brawl Stars, Genshin Impact — tous saisonniers, tous à LTV ~100 € et plus.

**Forces** :
- ✅ Tout ce que Modèle C offre
- ✅ Rétention sans fin (pas de "fin de jeu")
- ✅ Moat concurrentiel imbattable en trivia
- ✅ LTV long terme 50-200 €

**Faiblesses** :
- ❌ **Engagement éditorial lourd** : 20-40 VIP/mois minimum pendant 2-3 ans
- ❌ Nécessite un pipeline de production industrialisé
- ❌ Risque si la cadence ralentit (perte de confiance des joueurs)

**LTV estimée** : 50-200 € / payant, conversion 5-8%.

**Prérequis** : production VIP scalable (confirmée par le producteur, 2026-04-15).

---

## 5. Matrice de comparaison

| Critère | Modèle A | Modèle B | Modèle C | **Modèle D** |
|---|---|---|---|---|
| **Temps dev v1** | 4-6 sem | 10-16 sem | 12-20 sem | **14-22 sem** |
| **Risque churn** | Faible | Élevé | Moyen | Moyen |
| **Risque d'échec** | Faible | Élevé | Moyen | Moyen |
| **LTV payant** | 12-25 € | 25-80 € | 30-100 € | **50-200 €** |
| **Taux conversion** | 2-3% | 4-7% | 4-6% | **5-8%** |
| **Rétention D1/D7/D30** | 30/15/5 | 35/18/8 | 45/25/12 | **50/30/18** |
| **Complexité UX** | Faible | Élevée | Élevée | Élevée |
| **Exploitation VIP** | Moyenne | Maximale | Forte | **Maximale** |
| **Différenciation** | Faible | Forte | Maximale | **Maximale** |
| **Dépendance contenu** | Existante | Forte | Moyenne | **Critique** |
| **Potentiel long terme** | 1-2 ans | 3-5 ans | 5+ ans | **Sans limite** |
| **Moat concurrentiel** | Aucun | Contenu | Rétention | **Rétention + Contenu** |

---

## 6. Recommandation finale : Modèle D

### 6.1 Justification

1. **Le contexte de WTF favorise Modèle D** :
   - Pas de joueurs actifs à protéger → refonte libre
   - Production VIP scalable confirmée → prérequis validé
   - Actif unique (350 VIP illustrés) → mérite d'être exploité à 100%

2. **Modèle D est le meilleur pari long terme** :
   - LTV plafond 5-10× supérieur au Modèle A
   - Rétention soutenue par les saisons (jamais de fin de jeu)
   - Moat concurrentiel impossible à copier (contenu + mécaniques combinées)

3. **Le risque principal est maîtrisable** :
   - Engagement contenu 20-40 VIP/mois = ~1-2 jours/semaine avec IA assistée
   - Exécution phasée (possibilité d'arrêt à chaque phase si problème)

### 6.2 Pourquoi ni A, ni B, ni C isolé ?

- **Modèle A** : sous-exploite les VIP, plafond LTV trop bas, différenciation faible.
- **Modèle B** : manque la rétention quotidienne Duolingo-style, dépend uniquement du collectionnisme pour retenir.
- **Modèle C seul** : excellent mais plafonne à 3-4 mois d'engagement par joueur (complétion Pokédex).

**Modèle D = Modèle C + pipeline saisonnier** combine tous les avantages et élimine les plafonds.

---

## 7. Roadmap d'exécution en phases

Toutes les phases sont livrables indépendamment. Chaque phase peut être playtested avec amis avant de passer à la suivante. Aucun lancement public avant la Phase 3 minimum.

### Phase 1 — Fondations économiques (6-8 semaines)

- V3.2 rééquilibrage packs Mystery (prix T95)
- V3.4 seconde chance (5 coins)
- V3.5 cadres profil → persistence Supabase
- V3.6 accélérer coffre — brancher le modal + RPC
- **Nouveau** : introduction **Gems** comme devise premium (colonne `profiles.gems`)
- **Nouveau** : classification des 350 VIP en 4 raretés (audit éditorial + métadonnées DB)
- **Nouveau** : colonne `players.vip_rarity_seen[]` pour tracker Pokédex par rareté

**Livrable** : économie plus saine, gems inutilisables encore mais base prête. Pokédex classifié.

### Phase 2 — Système de coffres unifié (4-6 semaines)

- Nouvelle table `chests` et `chest_templates`
- 5 types : Wooden / Silver / Gold / Magical / Legendary
- Timer par coffre (3h, 8h, 12h, 24h, instant)
- Drop rates par rareté VIP + funny + coins + gems
- Migration des sources de reward : Quest, Blitz palier, Route boss, Défi, Hunt, Puzzle
- UI Pokédex visuel avec raretés et progression
- Essence VIP + craft ciblé (doublons)

**Livrable** : core loop gacha fonctionnel, jouable en interne.

### Phase 3 — Monétisation réelle (6-8 semaines)

- V3.1 intégration Stripe (web) + Expo IAP (mobile) — backend complet
- Table `purchases` active avec webhook validation
- Gems packs € (4 tiers : 1,99 / 4,99 / 9,99 / 19,99 €)
- Starter Pack 1-time (2,99 €)
- V3.7 Battle Pass WTF! Pass 4,99 €/mois (40 tiers, saison 1)
- V3.8 Gems comme devise premium utilisable (refill hearts, skip coffre, craft premium)
- WTF Premium abo 9,99 €/mois

**Livrable** : monétisation réelle, premier soft launch possible à ce stade.

### Phase 4 — Retention layer (4-6 semaines)

- Hearts system (rename énergie + vraie mécanique vies)
- Streak renforcé : freeze, rescue, récompenses paliers
- Daily quests (3/jour avec rotation)
- Weekly quests (5/semaine + coffre bonus)
- Leagues Blitz hebdomadaires avec promo/relégation
- Notifications push (V2.6)
- Leaderboard social

**Livrable** : rétention Duolingo-style complète.

### Phase 5 — Saisons et nouveaux modes (6-8 semaines et cycles récurrents)

- Saison 1 Battle Pass (thème à définir, 20-40 VIP exclusifs)
- Calendrier éditorial des saisons (12 mois roadmap)
- Mode Tournament mensuel entre amis
- Mode Raid collaboratif (optionnel selon base joueurs)
- Événements saisonniers (Halloween, Noël, été)

**Livrable** : moteur de rétention infinie, lancement public envisageable.

### Phase 6 — Migration mobile (V3.15-V3.18, en parallèle phases 3-5)

- Expo migration + push notifications natives
- IAP Apple/Google intégré
- Soumission App Store + Play Store

**Total estimé** : 26-36 semaines (6-9 mois) pour v1 complète. Soft launch possible à partir de la Phase 3 (4-5 mois de dev).

---

## 8. Questions ouvertes

Toutes ces questions doivent trouver une réponse avant ou pendant la Phase 1. Certaines conditionnent les autres.

### 8.1 Public cible et ton
- WTF s'adresse-t-il à **adultes 18-35** (humour trash, culture mainstream+) ou à **tous âges** (familial, kids mode) ?
- Le pricing et les mécaniques F2P dépendent de la cible.

### 8.2 Engagement éditorial
- Confirmer la cadence de production VIP : **20-40 par mois minimum pendant 2-3 ans** ?
- Pipeline IA assisté ou rédaction manuelle ?
- Qui valide le ton, la qualité, l'humour de chaque nouveau VIP ?

### 8.3 Production visuelle
- Qui génère les images (toi, IA, freelance) ?
- Quel style garder pour préserver l'identité visuelle ?
- Budget moyen par image illustrée ?

### 8.4 Complexité onboarding
- Un tuto Clash Royale / Duolingo prend 5-10 min. Acceptable ou on vise une entrée plus rapide ?
- (lié à la tâche 5.3 Onboarding, déjà en cours)

### 8.5 Monétisation aggressive vs douce
- **Aggressive** : hearts obligatoires, coffres à timer longs, VIP Legendary uniquement via paiement ?
- **Douce** : hearts régen rapides, tout accessible en gratuit (lentement), paiement pour confort uniquement ?

### 8.6 Contenu réservé premium
- Est-ce qu'on verrouille certains Legendary VIP derrière l'abonnement Premium ou le Battle Pass uniquement ?
- Acceptable ou pay-to-win perçu ?

### 8.7 Mobile vs Web first
- Le Battle Pass + IAP sont plus rentables sur mobile natif (Expo/Apple/Google).
- Prioriser la migration mobile (V3.15-V3.18) avant la refonte économique complète ?

### 8.8 Ton vs gameplay : pari éditorial
- Le succès dépend de la **qualité du contenu**. Si les nouveaux VIP ne sont pas aussi drôles / catchy que les 350 originaux, le pattern s'effondre.
- Tu as une vision claire de la cohérence qualitative sur 1000+ cartes ?

---

## 9. Risques identifiés et mitigations

### 9.1 Risque éditorial
**Risque** : baisse de qualité des nouveaux VIP au fil des saisons → perte de confiance joueurs.
**Mitigation** : pipeline éditorial strict + revue qualité à chaque saison + feedback loop utilisateurs.

### 9.2 Risque de sur-complexification
**Risque** : trop de systèmes (coins + gems + essence + coffres + hearts + streak + leagues + battle pass) → joueur perdu.
**Mitigation** : onboarding progressif (tâche 5.3), révélation graduelle des systèmes, UI épurée.

### 9.3 Risque pay-to-win perçu
**Risque** : joueurs payants ont accès à des VIP Legendary introuvables en free → frustration community.
**Mitigation** : tous les VIP gagnables en free après X semaines ou via craft essence. Aucun contenu 100% verrouillé paiement.

### 9.4 Risque de rétention courte
**Risque** : si le joueur churn à D7, Modèle D ne rentabilise pas.
**Mitigation** : Phase 4 (retention) prioritaire. Playtests réguliers. Telemetry détaillée sur drop-off.

### 9.5 Risque d'exécution technique
**Risque** : 26-36 semaines de dev pour un solo/petit team = long. Risque de burn-out ou perte de motivation.
**Mitigation** : phasage strict. Livraisons tous les 4-6 semaines. Playtests amis à chaque phase. Célébrations et pauses.

### 9.6 Risque financier
**Risque** : pas de revenus avant Phase 3 (4-5 mois). Pas de validation LTV avant Phase 5.
**Mitigation** : soft launch à Phase 3, mesurer LTV sur 30 jours avant d'investir Phase 4-5.

### 9.7 Risque concurrentiel
**Risque** : un concurrent copie le modèle pendant que tu développes.
**Mitigation** : le moat est le contenu (350+ VIP uniques, impossible à répliquer sans travail éditorial équivalent). Le code est reproductible, le contenu non.

---

## 10. Annexes — calculs coût par f*ct

### 10.1 Table de conversion (T95)

- 1 coin ≈ 10,7 secondes de jeu actif
- 1 minute de jeu ≈ 5,6 coins
- 1000 coins ≈ 3 heures
- Hypothèse € (à confirmer V3.1) : **1 coin ≈ 1 cent €** (soit 100 coins ≈ 0,99 € pour Starter Pack)

### 10.2 Funny fact — coût par source

| Source | Coins/fact | Temps joueur | ~€ |
|---|---|---|---|
| Flash/Explorer (énergie gratuite) | 0 c | 0 min | 0 € |
| Flash/Explorer (énergie achetée 10c/5 facts) | 2 c | 21s | 0,02 € |
| Pack Standard 35c → 5 funny | **7 c** (best pack) | 1 min 15 | 0,07 € |
| Pack Découverte 15c → 2 funny | 7,5 c | 1 min 20 | 0,08 € |
| Pack Catégorie 40c → 4 funny | 10 c | 1 min 47 | 0,10 € |
| Pack Premium 80c → 6,65 funny + 0,35 VIP | 12 c (funny seul) | 2 min 08 | 0,12 € |
| Pack Mega 150c → 12 funny + 1 VIP | 12,5 c (funny seul) | 2 min 13 | 0,13 € |
| Unlock catégorie 100c (accès seul, amorti sur 30 facts) | 3,3 c | 35s | 0,03 € |

**Valeur médiane funny fact payant** : **7-10 c** (0,07-0,10 €)
**Valeur minimale farming** : **0 c** (gratuit)

### 10.3 VIP fact — coût par source

| Source | Coins/fact | Temps joueur | ~€ |
|---|---|---|---|
| Hunt weekly (gratuit) | 0 c | 0 min | 0 € |
| Quête WTF! perfect (ticket 25c → 5 VIP max) | **5 c** (best payant) | 53s | 0,05 € |
| Quête moyen (3-4 VIP sur 5) | 6-8 c | 1 min 20 | 0,07 € |
| Pack Mega 150c → 1 VIP garanti (+12 funny valorisés 7c) | **66 c** (net) | 11 min 45 | **0,66 €** |
| Pack Premium 80c → 5% VIP par fact (0,35 avg) | **228 c** | 40 min | **2,28 €** |

**Valeur médiane VIP fact payant actuel** : **25 c** via Quest (0,25 €)
**Valeur minimale farming** : **0 c** (Hunt ou Quest perfect)

### 10.4 Cibles Modèle D (à valider)

Pour un fonctionnement cohérent, Modèle D devrait viser :

**Funny fact** : reste une commodity peu chère
- Farming : 0 c (illimité via Flash/Explorer)
- Pack : 5-10 c / fact
- **Ratio unchanged** vs actuel

**VIP fact** : doit monter en valeur perçue
- Farming : accessible mais limité (Quest 1-2/jour, Hunt 1/sem, coffres)
- Coffre Wooden : 1 Common VIP ~5% drop
- Coffre Silver : 1 Rare VIP ~15% drop
- Coffre Gold : 1 Epic VIP ~30% drop
- Coffre Magical : 1 Epic+ garanti
- Coffre Legendary : 1 Legendary garanti
- Craft essence : 50-500 essence selon rareté
- Battle Pass premium : VIP exclusifs saison garantis

**Ratios cibles** :
- Common VIP ≈ 3× Funny (15-30 c)
- Rare VIP ≈ 10× Funny (70-100 c)
- Epic VIP ≈ 30× Funny (300 c ≈ 3 €)
- Legendary VIP ≈ 100× Funny (1000 c ≈ 10 € équivalent, accessible uniquement via gems/IAP/battle pass/long grind)

Cette hiérarchie est cohérente avec Clash Royale et crée la pression commerciale attendue.

---

## 11. Prochaines étapes

1. **Valider le document** (toi, tranquillement au bureau demain)
2. **Répondre aux questions ouvertes** (§8) — certaines sont bloquantes pour Phase 1
3. **Décider** : Modèle D validé, Modèle C en fallback, ou autre direction
4. **Commencer Phase 1** : ~6-8 semaines de fondations économiques
5. **Playtest à chaque étape** avec tes amis
6. **Soft launch envisageable à Phase 3** (~4-5 mois)

---

**Fin du document stratégique v1**
*Document vivant : à mettre à jour à chaque décision majeure ou pivot.*
