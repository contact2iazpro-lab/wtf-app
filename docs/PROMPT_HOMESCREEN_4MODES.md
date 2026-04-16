Lis ce plan et exécute-le directement sans me demander de confirmation ni réexpliquer ce que tu vas faire.

CONTEXTE : Réorganisation de la HomeScreen. Quickie est retiré de la grille des modes et absorbé par le bouton "Partie rapide" en bas. La grille passe de 5 modes à 4 modes en layout 2×2. Drop est positionné en haut à côté de la Roulette (déjà en place via "Flash du jour").

═══════════════════════════════════════
LAYOUT HOMESCREEN FINAL
═══════════════════════════════════════

De haut en bas :

1. HEADER
   - Avatar, coins, indices, batterie énergie ⚡X/5
   - Streak 🔥 Xj + jauge → Palier dans Xj

2. PALIERS STREAK
   - 4 cerveaux : Débutant (J3) / Habitué (J7) / Fidèle (J14) / Légende (J30)

3. RITUELS QUOTIDIENS (2 boutons côte à côte)
   - Gauche : Roulette GRATUIT (ou "100c" si déjà utilisé)
   - Droite : Drop du jour 1×/jour (ex "Flash du jour")
   - Note : renommer "Flash du jour" en "Drop" dans le label

4. LOGO VRAI OU FOU ?
   - Logo branding centré (garder tel quel)

5. GRILLE 2×2 DES MODES
   - Haut gauche : Quest WTF! (étoile WTF!, contour or #FFD700)
   - Haut droite : Vrai ou Fou (? rouge/vert, contour vert #6BCB77)
   - Bas gauche : Race (drapeau damier, contour cyan #00E5FF)
   - Bas droite : Blitz (éclairs croisés, contour rouge #FF1744)
   - Chaque icône dans son cercle ModeIcon avec label en dessous
   - Les 4 cercles doivent être de MÊME TAILLE et uniformément espacés

6. BOUTON "PARTIE RAPIDE"
   - Bouton blanc/crème en bas, bien visible
   - Icône Quickie (gélule violette) à gauche du texte
   - Texte : "Partie rapide" en orange #FF6B1A
   - Action : lance le mode Quickie en mode ALÉATOIRE (pas de choix de catégorie, direct dans le jeu)
   - Le joueur peut toujours accéder au choix de catégorie Quickie depuis un autre endroit (ex: long press ou settings)

7. NAVBAR
   - Boutique / Trophées / Accueil / Amis / Collection (inchangé)

═══════════════════════════════════════
MODIFICATIONS SPÉCIFIQUES
═══════════════════════════════════════

1. RETIRER Quickie de la grille des modes
   - Ne plus afficher le cercle ModeIcon Quickie dans la grille
   - Quickie est UNIQUEMENT accessible via le bouton "Partie rapide" en bas

2. RENOMMER dans la grille
   - "No Limit" → "Race" (le label sous l'icône)
   - "Quest" → "Quest WTF!" (le label sous l'icône)
   - Vérifier que "Flash du jour" en haut est renommé en "Drop"

3. GRILLE 2×2
   - Remplacer le layout 3+2 actuel par un layout 2×2 symétrique
   - Gap uniforme entre les 4 cercles
   - Centré horizontalement sous le logo VoF

4. BOUTON PARTIE RAPIDE
   - Le bouton doit lancer handleQuickie() en mode aléatoire
   - Pas de passage par le CategoryScreen — direct dans le jeu avec une catégorie aléatoire
   - Si le joueur veut choisir une catégorie spécifique, il pourra le faire depuis un autre accès (à définir plus tard)

═══════════════════════════════════════
ICÔNES ET COULEURS
═══════════════════════════════════════

Vérifier que les fichiers PNG suivants sont bien utilisés :
- Quest WTF! : /public/assets/modes/quest.png (contour #FFD700)
- Vrai ou Fou : /public/assets/modes/vrai-ou-fou.png (contour #6BCB77)
- Race : /public/assets/modes/race.png (contour #00E5FF)
- Blitz : /public/assets/modes/blitz.png (contour #FF1744)
- Quickie : /public/assets/modes/quickie.png (utilisé dans le bouton Partie rapide, PAS dans la grille)

═══════════════════════════════════════
VÉRIFICATION
═══════════════════════════════════════

- npm run build doit passer vert
- La grille affiche exactement 4 modes en 2×2 (pas 5, pas 3)
- Le bouton Partie rapide lance bien Quickie aléatoire
- "No Limit" n'apparaît nulle part sur la HomeScreen (remplacé par "Race")
- "Flash du jour" n'apparaît nulle part (remplacé par "Drop")
- Le logo Vrai ou Fou ? reste centré et visible au-dessus de la grille

NE PAS POUSHER — Michael push manuellement après tests en local.