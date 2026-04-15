MODE MARATHON — Spécifications complètes (15/04/2026)

CONCEPT : Mode survie — le joueur répond à des questions jusqu'à sa première erreur. Pas de timer, pas d'indices, pas de coins. Prestige pur et record personnel.

⚠️ ATTENTION : L'ancien "Marathon" dans le code (20 questions avec scoring) est un mode COMPLÈTEMENT DIFFÉRENT et doit être SUPPRIMÉ avant d'implémenter celui-ci.

RÈGLES :
- QCM **4 choix**
- Questions illimitées jusqu'à la PREMIÈRE erreur
- **Aucun timer** (le joueur prend son temps)
- **Aucun indice** (aucun bouton indice visible)
- **0 coins** gagnés (prestige/record uniquement)
- **Gratuit illimité** (pas d'énergie, pas de limite par jour)
- Contenu : Funny + VIP facts **déjà débloqués** (mélangés)
- Pas de déblocage de f*cts (le joueur connaît déjà ces facts)
- Première erreur = **game over immédiat** (pas de seconde chance, pas de "continuer pour X coins")

CONDITION D'ACCÈS :
- Le joueur doit avoir au moins 20 f*cts débloqués dans sa collection
- Si moins de 20 : bouton grisé avec message "Débloque encore X f*cts pour jouer"
- Le pool grandit avec la collection du joueur → incitation à jouer Snack/Quest pour agrandir le pool Marathon

RECORD :
- Meilleur score = nombre de bonnes réponses consécutives
- Sauvegardé localStorage + Supabase (wtf_data.marathonBestScore)
- Affiché sur l'écran résultat : "Ta série : 23 — Ton record : 31"
- Nouveau record = animation spéciale de célébration

UX — COMPTEUR :
- Gros chiffre central visible en permanence qui monte : 1... 2... 3...
- Le chiffre grossit/pulse légèrement à chaque bonne réponse
- Animation de satisfaction à chaque bonne réponse (flash vert rapide)

UX — FOND DYNAMIQUE :
- Le fond change de couleur progressivement selon la série :
  - 0-5 : vert (tranquille)
  - 6-10 : jaune (ça commence)
  - 11-20 : orange (tension)
  - 21-30 : rouge (danger)
  - 31+ : rouge foncé/noir pulsant (zone extrême)

UX — GAME OVER :
- Animation dramatique : écran qui tremble/explose/se brise
- Son d'impact
- Affichage immédiat : score final + record personnel + nouveau record si battu
- Boutons : "Rejouer" + "Partager" + "Accueil"

UX — ÉCRAN RÉSULTAT :
- Score de la session vs record personnel
- Si nouveau record : animation dorée spéciale + message "NOUVEAU RECORD !"
- Bouton partager : "J'ai fait une série de 23 au Marathon WTF! Et toi ?" + lien app
- Bouton rejouer (direct, pas de retour HomeScreen)
- Bouton accueil

FICHIER À CRÉER : src/screens/MarathonScreen.jsx
- Nouveau composant complet
- Ne réutilise PAS QuestionScreen (l'UX est trop différente : pas de timer, pas d'indices, compteur central, fond dynamique, game over dramatique)
- Peut réutiliser les composants de base (boutons QCM, chargement facts)

FICHIERS À MODIFIER :
- App.jsx : ajouter routing vers MarathonScreen, handler handleMarathon
- gameConfig.js : ajouter MARATHON_CONFIG (4 QCM, 0 timer, 0 indices, 0 coins, pool = débloqués)
- HomeScreen.jsx : brancher le bouton Marathon
- factsService.js : fonction getMarathonFacts() qui retourne les f*cts débloqués du joueur (VIP + Funny mélangés, ordre aléatoire)
