Lis ce plan et exécute-le directement sans me demander de confirmation ni réexpliquer ce que tu vas faire.

CONTEXTE : Corrections v3 des écrans Quickie. Le violet dominant partout écrase l'identité de la catégorie jouée. On inverse la logique : la couleur de la catégorie redevient dominante, le violet Quickie devient un ACCENT POP (bordures, boutons CTA, barres).

PÉRIMÈTRE : Écrans du mode Quickie uniquement (Règles, Choix catégorie, QuestionScreen, RevelationScreen, ResultsScreen).

═══════════════════════════════════════
PRINCIPE MAÎTRE
═══════════════════════════════════════

RÈGLE INVERSÉE PAR RAPPORT À LA V2 :
- Page de règles Quickie : fond dégradé VIOLET (c'est l'intro, identifie le mode)
- Choix catégorie : fond dégradé VIOLET (on est encore dans le flow Quickie)
- QuestionScreen : fond dégradé COULEUR DE LA CATÉGORIE + accents violets POP
- RevelationScreen : fond dégradé COULEUR DE LA CATÉGORIE + accents violets POP
- ResultsScreen : fond dégradé VIOLET (fin de session Quickie, pas de catégorie spécifique)

VIOLET POP ACCENT : #7F77DD (utilisé pour bordures, boutons CTA, barres de progression, glow)

═══════════════════════════════════════
ÉCRAN 1 — PAGE DE RÈGLES
═══════════════════════════════════════

1. Icône Quickie en tête :
   - Agrandir à 100-120px
   - Centrer horizontalement au-dessus du titre "Quickie"
   - Actuellement trop petite et mal alignée (en haut à gauche)

2. Remonter la liste des règles :
   - Actuellement gros vide entre la tagline et les règles
   - Rapprocher les règles du titre pour un meilleur équilibre vertical

3. Bouton "C'EST PARTI !" :
   - Ajouter une ombre plus marquée : box-shadow 0 8px 30px rgba(127, 119, 221, 0.6)
   - Ou passer en violet plus clair #B5AFEB avec bordure violet foncé pour créer du contraste
   - Il se fond trop dans le fond actuellement

═══════════════════════════════════════
ÉCRAN 2 — CHOIX CATÉGORIE
═══════════════════════════════════════

1. Fond de l'écran : dégradé violet Quickie (linear-gradient(160deg, #4A3FA3, #7F77DD))
   - Actuellement cyan/turquoise au milieu, aucun sens

2. Tuile "Aléatoire" en haut :
   - Dégradé violet : linear-gradient(90deg, #4A3FA3, #7F77DD)
   - Garder le dé blanc comme icône

3. Cards catégories (Animaux vert, Définition bleu, etc.) :
   - Garder leurs couleurs propres (c'est leur identité)

4. Bouton "Sélectionne une catégorie" en bas :
   - Actuellement grisé tout le temps
   - Quand une catégorie est cliquée : passer en violet pop #7F77DD actif avec texte blanc
   - État disabled : gris translucide

═══════════════════════════════════════
ÉCRAN 3 — QUESTIONSCREEN
═══════════════════════════════════════

1. FOND : dégradé de la COULEUR DE LA CATÉGORIE jouée
   - Formule existante : linear-gradient(160deg, {categoryColor}22, {categoryColor})
   - Exemple Records = ambre/jaune
   - NE PAS mettre violet sur cet écran

2. Accents violets POP #7F77DD à appliquer :
   - Bordure de la carte image (contour 3px violet pop avec glow subtil)
   - Bouton "Indice" : fond violet pop #7F77DD, texte blanc (pas orange/jaune)
   - Barre de progression 1/5 : barres actives en violet pop, barres inactives en blanc à 20% opacité
   - Cercle compteur "14" en bas : contour violet pop (pas vert)

3. Ajouter le TIMER 15s :
   - Actuellement invisible
   - Placement : en haut à droite du header OU au-dessus de la question
   - Format cercle avec countdown visible
   - Change de couleur selon restant : vert >10s, orange 5-10s, rouge <5s avec pulse

4. Boutons de réponse (2 QCM) :
   - Fond blanc #FFFFFF
   - Bordure 3px violet #7F77DD
   - Texte violet foncé en Nunito 700
   - Hauteur harmonisée entre les 2 boutons (même taille même si texte varie)
   - Au tap correct : flash vert + bordure verte (300ms)
   - Au tap incorrect : shake + flash rouge + bordure rouge (300ms)

5. Clarifier le compteur "14" :
   - Ajouter un label au-dessus : "Coins gagnés"
   - Ou icône coin devant le nombre

═══════════════════════════════════════
ÉCRAN 4 — REVELATIONSCREEN
═══════════════════════════════════════

1. FOND : dégradé de la COULEUR DE LA CATÉGORIE
   - Actuellement violet, à changer
   - Même formule que QuestionScreen

2. Accents violets POP #7F77DD :
   - Bordure du cadre image (3px violet avec glow)
   - Bouton "Suivant →" : fond violet pop plein
   - Bouton "Partager ce WTF!" : transparent avec bordure violet (hiérarchie secondaire)

3. SUPPRIMER le gros logo "WTF! + ?" placeholder :
   - Actuellement occupe toute la carte image quand pas d'image réelle
   - Remplacer par : un "?" violet stylisé centré, plus sobre
   - Quand l'image existe (Gemini générée), elle s'affiche normalement sans logo WTF! par-dessus
   - Texte "CE FAIT EST SI INCROYABLE qu'on n'a pas encore trouvé une image..." à supprimer OU remplacer par un simple "Image bientôt disponible"

4. Cards "LA QUESTION" / "BONNE RÉPONSE" / "LE SAVIEZ-VOUS" :
   - Fond blanc ou teinte très claire de la couleur catégorie
   - Bordure fine de la couleur catégorie
   - Texte noir ou très foncé pour lisibilité

═══════════════════════════════════════
ÉCRAN 5 — RESULTSSCREEN
═══════════════════════════════════════

1. FOND : dégradé VIOLET Quickie (garder identité mode)

2. Réaménager la verticalité (actuellement compacté en haut, vide en bas) :
   - Espacer les éléments verticalement
   - Padding vertical entre chaque bloc : ~24px minimum
   - Le screen doit respirer

3. Remplacer le gros smiley 😄 jaune "En route" :
   - Utiliser l'icône Quickie (verre violet) à la place
   - Ou un set de 3 images Quickie selon le score : 1/5 verre vide, 3/5 verre à moitié, 5/5 verre plein
   - Actuellement : smiley générique qui casse l'identité

4. Rang "Curieux" + étoile :
   - Ajouter 5 étoiles (x sur 5 remplies selon score)
   - Plutôt qu'une seule étoile isolée
   - Label plus clair : "Rang : Curieux (2/5 étoiles)"

5. SECTION HÉRO "Le plus WTF" :
   - Actuellement dans une card jaune au milieu, presque noyée
   - La rendre BEAUCOUP plus visible :
     - Card plus grande
     - Glow violet marqué autour
     - Image du f*ct visible (pas juste texte)
     - Label "⭐ LE PLUS WTF DE TA SESSION"
   - C'est le moment "waouh" de la session, doit ressortir

6. Cartes f*cts débloqués :
   - Agrandir un peu les cards (actuellement petites en ligne de 5)
   - Images réelles des f*cts quand elles existent (pas juste "?")
   - Cadenas jaune pour les non-débloqués : OK (convention)

7. Bouton "Rejouer" :
   - Violet pop #7F77DD : OK
   - Ajouter ombre marquée : box-shadow 0 8px 30px rgba(127, 119, 221, 0.5)

8. Boutons "Partager" et "Accueil" :
   - Transparents avec bordure violette : OK
   - Textes en blanc ou violet clair

9. Header du ResultsScreen :
   - À côté des coins (9995), ajouter un petit indicateur de palier streak ("Débutant 1j" ou icône cerveau palier)
   - Renforce la sensation de progression constante

═══════════════════════════════════════
MICRO-INTERACTIONS (tous écrans Quickie)
═══════════════════════════════════════

- Bouton "Indice" disponible : pulse léger toutes les 3 secondes
- Compteur coins header : scale/pop quand +X coins gagnés
- Barre de progression : animation fluide slide quand on passe à la question suivante
- Transition QuestionScreen → RevelationScreen : fade + slide vertical
- Transition RevelationScreen → QuestionScreen (suivant) : slide latéral

═══════════════════════════════════════
VÉRIFICATION
═══════════════════════════════════════

- npm run build doit passer vert
- Jouer une partie complète Quickie pour valider les 5 écrans
- Vérifier que la couleur de catégorie est dominante en Question/Revelation
- Vérifier que le violet Quickie est un accent (pas un fond) en Question/Revelation
- Ne PAS toucher aux autres modes (Vrai ou Fou, Quest WTF!, Endless, Blitz, Drop)

NE PAS POUSHER — Michael push manuellement après tests en local.