MISE À JOUR CLAUDE.md — Résumé des changements session 15/04/2026

Lis ce plan et exécute-le directement. Fichier cible : CLAUDE.md uniquement.

══════════════════════════════════════
1. RENOMMAGE MODES — Le plus critique
══════════════════════════════════════

Partout dans le fichier, remplacer :

- "Marathon" (nouveau mode survie) → **No Limit**
- Toute mention de "Marathon" comme mode de jeu → **No Limit**
- MARATHON_CONFIG → NO_LIMIT_CONFIG
- MarathonScreen → NoLimitScreen
- handleMarathon → handleNoLimit

Le mapping complet des 6 modes officiels :
1. Snack (ex Flash+Explorer)
2. Vrai ou Fou (nouveau)
3. Quest (ex Route WTF!)
4. No Limit (nouveau — ex "Marathon" dans cette session)
5. Blitz (Solo + Défi)
6. Flash (ex Hunt + Puzzle du Jour)

══════════════════════════════════════
2. MODE QUEST — Structure bloc mise à jour
══════════════════════════════════════

Remplacer "blocs de 10 (9 Funny + 1 boss VIP)" par :

- Blocs de **10 Funny + 1 boss VIP conditionnel**
- Seuil boss : ≥ 5/10 bonnes réponses Funny pour accéder au boss
- Joueur BLOQUÉ tant que boss pas réussi
- Pour retenter le boss : refaire 10 Funny et scorer ≥ 5/10
- Énergie consommée à chaque tentative (pas de refund)
- Funny des bonnes réponses débloqués même si bloc raté
- ~77 blocs total (770 Funny ÷ 10) au lieu de ~85 blocs

══════════════════════════════════════
3. MODE VRAI OU FOU — Pas de déblocage
══════════════════════════════════════

Remplacer "Déblocage f*cts : Oui (Funny)" par :

- Déblocage f*cts : **Non** — mode vitrine/viral
- Le joueur découvre les affirmations mais ne les collecte pas
- Pour posséder un f*ct il doit jouer Snack ou Quest
- Ajouter : Partage score X/20 (WhatsApp/story) — levier acquisition

══════════════════════════════════════
4. ROULETTE — Nouveaux segments calibrés
══════════════════════════════════════

Remplacer les segments de la roulette par :

| Segment | Lot | Probabilité |
|---|---|---|
| 1 | 20 coins | 28% |
| 2 | 50 coins | 24% |
| 3 | 1 indice (=50c) | 18% |
| 4 | 100 coins (remboursé) | 12% |
| 5 | 150 coins | 8% |
| 6 | 2 indices (=100c) | 5% |
| 7 | 300 coins | 3% |
| 8 | 750 coins (jackpot) | 2% |

Valeur espérée ~80 coins. Sink net ~20 coins/spin (20%).

══════════════════════════════════════
5. ÉCONOMIE — Reste ×10 (confirmé)
══════════════════════════════════════

Les valeurs ×10 sont confirmées et NE CHANGENT PAS :
- Nouveau joueur : 500 coins / 3 indices / 5 énergies
- Énergie extra : 75 coins
- Indice : 50 coins
- Catégorie : 1 500 coins
- Cosmétique : 500 coins
- Blitz Défi : 200 coins
- Roulette spin : 100 coins

Le ×20 a été étudié et rejeté (trop de friction).

══════════════════════════════════════
6. MONÉTISATION — Roadmap Y1-Y5
══════════════════════════════════════

Ajouter dans la section monétisation :

**Y1 (10K € cible)** : Starter Pack 2,99€ + Packs Gems + Abo optionnel
**Y2 (30-50K €)** : Achat direct VIP **0,99 €/VIP** + Remove Ads 3,99€ + Packs thématiques + Internationalisation EN
**Y3 (100-200K €)** : Battle Pass saisonnier 4,99€ + Leagues + Cosmétiques premium
**Y5 (500K+)** : Multijoueur live + Licensing + Sponsoring + Expansion langues

Le Starter Pack ne contient plus de tickets (supprimés) : 1 500 coins + 5 indices + cadre exclusif

══════════════════════════════════════
7. FICHIERS À CRÉER/RENOMMER
══════════════════════════════════════

Mettre à jour la section fichiers clés :
- MarathonScreen.jsx → **NoLimitScreen.jsx**
- MARATHON_CONFIG → **NO_LIMIT_CONFIG**
- getMarathonFacts() → **getNoLimitFacts()**
- Nouveau fichier : VraiOuFouScreen.jsx
- Nouveau fichier : FlashScreen.jsx (fusionne Hunt + Puzzle)
- RouteScreen.jsx → QuestScreen.jsx