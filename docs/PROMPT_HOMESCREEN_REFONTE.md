Lis ce plan et exécute-le directement sans me demander de confirmation.

FICHIER CIBLE : src/screens/HomeScreen.jsx (+ index.html si nécessaire pour viewport)

CONTEXTE : Refonte layout HomeScreen basée sur retours visuels. Le fullscreen est en cours de migration séparément.

═══════════════════════════════════════
MODIFICATIONS À FAIRE
═══════════════════════════════════════

1. STREAK "1 jour" en haut à gauche
- Garder mais transformer : afficher le PALIER actuel (Débutant/Habitué/Fidèle/Légende) au lieu de "X jours"
- Ajouter une jauge de progression horizontale vers le prochain palier (barre fine sous le label)
- Couleur de la jauge = couleur du palier actuel

2. COFFRES → CERVEAUX
- Remplacer les icônes de coffres par des cerveaux qui évoluent :
  - Débutant (J3) = petit cerveau terne/gris
  - Habitué (J7) = cerveau lumineux rose
  - Fidèle (J14) = cerveau en feu orange
  - Légende (J30) = cerveau doré avec couronne
- Garder la même row horizontale avec les 4 paliers

3. BANDEAU QUOTIDIEN — Roulette + Flash côte à côte
- Sous les cerveaux/streak : un bandeau avec 2 boutons côte à côte
  - Gauche : "🎰 Roulette GRATUIT" (ou "🎰 Roulette 100c" si déjà utilisé)
  - Droite : "⚡ Flash du jour" (lun-sam) ou "🏆 Hunt VIP" (dimanche)
- Les deux sont des rituels quotidiens 1×/jour, même niveau d'importance

4. ÉNERGIE → HEADER style batterie
- Déplacer l'énergie dans le header, à côté des coins et indices
- Format batterie de téléphone : icône batterie qui se vide
- 5 niveaux de couleur :
  - 5/5 = vert vif
  - 4/5 = vert clair
  - 3/5 = jaune
  - 2/5 = orange
  - 1/5 = rouge
  - 0/5 = rouge clignotant / vide
- Afficher "X/5" à côté de la batterie

5. ICÔNES MODES — cercles cliquables + noms
- Chaque icône de mode dans un cercle (fond légèrement plus clair, contour subtle lumineux ou ombre portée)
- Le cercle doit clairement indiquer que c'est un bouton tappable
- NOM DU MODE en dessous de chaque cercle en Nunito 700
- Les 6 cercles doivent être de MÊME TAILLE (uniformiser)
- Layout grille 3×2 autour du logo WTF! central

6. LOGO WTF! CENTRAL
- Réduire la taille de ~30% par rapport à actuellement
- Garder centré avec le starburst
- Logo "Vrai ou Fou?" repositionné centré au-dessus du logo WTF! (pas comme un mode séparé flottant)

7. STARBURST
- Réduire l'opacité des rayons à 15-20% (actuellement trop fort, distrait des icônes)

8. BOUTON "PARTIE RAPIDE" en bas
- Garder le bouton blanc en bas
- Texte : "Partie rapide" avec un emoji vert 🟢 ou l'icône Snack (cerveau) devant
- Action : lance le mode Snack (aléatoire)

9. CLEANUP
- Supprimer le bouton "Jouer" s'il existe encore séparément
- Supprimer les commentaires v7/v8/useDailyCoffre obsolètes
- Supprimer layoutConfig.js presets morts (vertical, twoColumn)

NE PAS TOUCHER : la navbar en bas (Boutique/Trophées/Accueil/Amis/Collection), les handlers de navigation vers les modes, le header coins/indices.