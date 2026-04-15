MODE BLITZ — Spécifications complètes (15/04/2026)

CONCEPT : 2 sous-modes accessibles depuis un même bouton sur la HomeScreen. Le joueur choisit Solo ou Défi dans un écran intermédiaire (BlitzLobbyScreen existant à adapter).

⚠️ CHANGEMENTS CRITIQUES VS CODE ACTUEL :
- QCM passe de 4 choix → **2 choix** (Solo ET Défi)
- Coût Défi passe de 1 ticket → **200 coins**
- Blitz Solo : plus de pénalité +5s sur erreur (erreur = passe à la suivante sans pénalité)
- Blitz Défi : garde la pénalité +5s sur erreur (différenciateur)
- Supprimer toute référence aux tickets dans le flow Blitz

═══════════════════════════════════════
5a. BLITZ SOLO
═══════════════════════════════════════

RÈGLES :
- QCM **2 choix**
- Chrono global **60 secondes descendant** (pas de timer par question)
- **Aucun indice** (aucun bouton visible)
- Contenu : Funny + VIP facts **déjà débloqués** (même pool que No Limit)
- Coût : **Gratuit illimité**
- Gains : **0 coins** (prestige uniquement)
- Paliers : 5 / 10 / 20 / 30 / 50 / 100 (animation spéciale à chaque palier atteint)
- Mauvaise réponse : **continue sans pénalité** — le chrono continue, question suivante
- Fin de partie : quand le chrono atteint 0
- Record : nombre de bonnes réponses en 60s, sauvegardé (wtf_data.blitzBestScore)

UX :
- Enchaînement ultra-rapide entre les questions (pas de transition, flux continu)
- Chrono bien visible en haut, décompte en temps réel
- Compteur de bonnes réponses en gros au centre
- Flash vert rapide sur bonne réponse, flash rouge sur mauvaise (mais continue)
- Fin de session : score + record + bouton rejouer + bouton partager

CONDITION D'ACCÈS :
- Même que No Limit : minimum 20 f*cts débloqués
- Si moins : bouton grisé avec message

═══════════════════════════════════════
5b. BLITZ DÉFI
═══════════════════════════════════════

RÈGLES :
- QCM **2 choix**
- **Même set de 5-10 questions** pour les 2 joueurs (seed identique)
- Chrono **montant global** (commence à 0, monte)
- Pénalité erreur : **+5 secondes** ajoutées au chrono
- **Aucun indice**
- Contenu : Funny facts (catégorie choisie par le créateur)
- Coût : **200 coins pour créer** · **Gratuit pour relever** · Expiration **48h**
- Gains : **0 coins**
- Gagnant : meilleur temps (le plus bas gagne)

FLOW CRÉATION :
1. Joueur A clique Blitz → choisit "Défi"
2. BlitzLobbyScreen : choix catégorie + choix ami
3. Vérification : A a ≥ 200 coins + ami a statut 'accepted' + ami a ≥ 5 f*cts dans la catégorie
4. 200 coins débités via RPC atomique `create_duel_challenge`
5. A joue le Blitz (2 QCM, chrono montant, +5s/erreur)
6. Code défi généré → partage WhatsApp/SMS

FLOW ACCEPTATION :
1. Joueur B reçoit le lien ou voit le défi dans SocialPage
2. ChallengeScreen : "A t'a défié ! Catégorie : Animaux · 8 questions"
3. B clique "Relever" (gratuit)
4. B joue les MÊMES questions (même seed, même ordre)
5. Résultat : comparaison temps côte à côte

UX RÉSULTAT :
- Écran split : temps A vs temps B
- Gagnant mis en évidence (animation victoire)
- Bouton "Revanche" (200 coins) + "Partager" + "Accueil"

═══════════════════════════════════════
ÉCRAN INTERMÉDIAIRE (BlitzLobbyScreen)
═══════════════════════════════════════

Quand le joueur clique sur Blitz depuis la HomeScreen :
- 2 gros boutons : "Solo" et "Défi"
- Solo : description "60 secondes, max de bonnes réponses, bats ton record"
- Défi : description "Défie un ami, même questions, meilleur temps gagne · 200 coins"
- Si le joueur n'a pas 200 coins : bouton Défi affiche "200 coins" grisé

FICHIERS À MODIFIER :
- BlitzScreen.jsx : QCM 4→2, retirer pénalité erreur en mode solo
- BlitzLobbyScreen.jsx : adapter choix Solo/Défi, coût ticket→200 coins
- BlitzResultsScreen.jsx : adapter affichage
- gameConfig.js : BLITZ_SOLO_CONFIG (2 QCM, 60s, 0 indice, 0 pénalité) + BLITZ_DEFI_CONFIG (2 QCM, chrono montant, +5s pénalité)
- useBlitzHandlers.js : applyCurrencyDelta({coins: -200}) au lieu de tickets
- duelService.js / create_duel_challenge RPC : adapter si nécessaire pour coût en coins au lieu de tickets
