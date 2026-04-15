MODE QUEST — Mise à jour structure bloc (15/04/2026)

CHANGEMENT : Le bloc Quest passe de 9 Funny + 1 boss à 10 Funny + 1 boss conditionnel.

STRUCTURE D'UN BLOC QUEST :
1. Le joueur joue 10 questions Funny (4 QCM, 20s, 2 indices)
2. À la fin des 10 questions, on compte le score
3. Si ≥ 5/10 → la question boss VIP apparaît (question 11, mise en scène spéciale)
4. Si < 5/10 → pas de boss, bloc raté, joueur reste au même niveau

RÉSULTATS POSSIBLES :

| Résultat | Boss ? | VIP débloqué ? | Progression ? | Coins |
|---|---|---|---|---|
| 0-4/10 | Non | Non | BLOQUÉ — refaire le bloc | 20c × bonnes réponses |
| 5-10/10 + boss réussi | Oui | Oui | PASSE au niveau suivant | 20c × bonnes + 100c boss |
| 5-10/10 + boss raté | Oui | Non | BLOQUÉ — refaire le bloc | 20c × bonnes |

RÈGLES IMPORTANTES :
- Le joueur est BLOQUÉ tant qu'il n'a pas réussi le boss
- Pour retenter le boss, il DOIT refaire une série de 10 Funny et scorer ≥ 5/10
- L'énergie (1) est consommée à CHAQUE tentative (pas de refund)
- Les coins des bonnes réponses sont gagnés même si le bloc est raté
- Les Funny facts des bonnes réponses sont débloqués même si le bloc est raté
- Anti-déduction : les fausses réponses ET les indices du boss changent à chaque retry (tirage parmi 7 fausses, 2 indices parmi 4)
- Nouveau tirage de 10 Funny à chaque retry (pas les mêmes questions)

QUEST = ~850 NIVEAUX :
- ~770 Funny ÷ 10 par bloc = ~77 blocs
- ~77 boss VIP (sur ~483 VIP disponibles)
- Map de progression visible : Niveau X/77 (ou X/850 si on compte les questions individuelles)

FICHIERS À MODIFIER :
- gameConfig.js : QUEST_CONFIG.questionsPerBlock = 10 (pas 9), bossThreshold = 5
- RouteScreen.jsx (renommé QuestScreen.jsx) : ajouter logique seuil 5/10 + boss conditionnel
- ResultsScreen : message différent selon raté (<5), passé sans boss (5+ mais boss raté), complet (boss réussi)
