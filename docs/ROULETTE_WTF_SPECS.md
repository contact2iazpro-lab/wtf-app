ROULETTE WTF! — Spécifications complètes (15/04/2026)

Contexte : Économie ×10. Coût spin = 100 coins. Valeur espérée = ~80 coins. Sink net = ~20 coins/spin.

RÈGLES :
- 1 spin GRATUIT par jour (récompense connexion quotidienne, même sans jouer)
- Spins supplémentaires = 100 coins chacun
- Accessible depuis la HomeScreen (bouton visible)
- Animation roue qui tourne avec ralentissement progressif
- Le lot gagné s'affiche avec une animation de célébration

SEGMENTS DE LA ROUE (8 segments) :

| # | Lot | Probabilité | Valeur coins | Couleur segment suggérée |
|---|-----|-------------|-------------|--------------------------|
| 1 | 20 coins | 28% | 20 | Gris |
| 2 | 50 coins | 24% | 50 | Bronze |
| 3 | 1 indice | 18% | 50 (équiv.) | Violet |
| 4 | 100 coins (remboursé) | 12% | 100 | Argent |
| 5 | 150 coins | 8% | 150 | Bleu |
| 6 | 2 indices | 5% | 100 (équiv.) | Violet foncé |
| 7 | 300 coins | 3% | 300 | Or |
| 8 | 750 coins (jackpot) | 2% | 750 | Or brillant / arc-en-ciel |

CALCUL ESPÉRANCE :
- 28% × 20 = 5.6
- 24% × 50 = 12.0
- 18% × 50 = 9.0
- 12% × 100 = 12.0
- 8% × 150 = 12.0
- 5% × 100 = 5.0
- 3% × 300 = 9.0
- 2% × 750 = 15.0
- TOTAL = 79.6 coins → sink net ~20.4 coins/spin (20%)

PROBABILITÉS RÉSUMÉES :
- 52% chance de perdre (lot < mise de 100)
- 12% chance d'être remboursé (lot = 100)
- 36% chance de gagner (lot > 100)
- 2% jackpot (1 chance sur 50)

IMPLÉMENTATION :
- Le spin gratuit se reset à minuit (même logique que les coffres quotidiens)
- Flag localStorage ou Supabase : dernière date de spin gratuit
- L'indice gagné s'ajoute directement au stock du joueur via applyCurrencyDelta
- Les coins gagnés s'ajoutent via applyCurrencyDelta
- Si le joueur n'a pas 100 coins et que le spin gratuit est utilisé → bouton grisé "100 coins" avec indication du manque

FICHIER EXISTANT À MODIFIER : src/components/RouletteModal.jsx (ou équivalent)
- Mettre à jour les segments, probabilités et gains avec les valeurs ci-dessus
- Mettre à jour le coût du spin payant : 100 coins (×10)
