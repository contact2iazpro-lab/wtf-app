Lis ce plan et exécute-le directement sans me demander de confirmation ni réexpliquer ce que tu vas faire.

CONTEXTE : Identité visuelle complète du mode VRAI OU FOU.

Le mode est une vitrine virale : 20 affirmations à swiper Vrai/Faux, 0 timer, 0 indice, 0 coin, 0 déblocage de f*cts. Le but est de pousser au partage WhatsApp/story (levier d'acquisition principal). Pas de QCM classique — c'est l'écran le plus différent de tous les modes.

PÉRIMÈTRE : Écrans du mode Vrai ou Fou uniquement. Ne pas toucher aux autres modes.

═══════════════════════════════════════
PALETTE VRAI OU FOU
═══════════════════════════════════════

Couleurs dominantes : bicolore vert/rouge
- Vrai (côté droit) : #6BCB77 (vert)
- Faux (côté gauche) : #E84535 (rouge)

Fond écran : dégradé subtil bicolore qui suggère le rouge à gauche / vert à droite sans dominer
- linear-gradient(90deg, rgba(232, 69, 53, 0.13) 0%, #1A3A8A 50%, rgba(107, 203, 119, 0.13) 100%)

Carte (statement) : fond blanc #FFFFFF, texte noir #1A1A1A, bordure gris clair #E5E5E5

ICÔNE HOMESCREEN : asset existant conservé (point d'interrogation vert/rouge déjà en place)

═══════════════════════════════════════
PAGE DE RÈGLES
═══════════════════════════════════════

Layout :
- Icône mode en haut centré (asset Vrai ou Fou existant) — 100-120px
- Titre : "Vrai ou Fou ?"
- Tagline : "Swipe ou pas swipe ?"
- 3 picto SVG dynamiques (à créer en SVG inline, pas d'emoji) :

  PICTO 1 — Gratuit illimité
  Symbole infini ∞ centré dans un cercle vert #6BCB77
  Label : "Gratuit illimité"
  
  PICTO 2 — Le swipe
  Deux flèches opposées ← → centrées dans un cercle violet/neutre #6366B8
  Label : "Swipe Vrai ou Faux"
  
  PICTO 3 — Partage
  Icône share style iOS (carré avec flèche vers le haut) dans un cercle rouge #E84535
  Label : "Partage ton score"

Bouton CTA : "Vas-y, swipe !"
- Fond dégradé bicolore (linear-gradient(90deg, #E84535, #6BCB77)) ou couleur unie selon ce qui rend mieux à l'œil
- Texte blanc en Nunito 900
- Ombre marquée

═══════════════════════════════════════
SWIPESCREEN (l'écran principal du mode)
═══════════════════════════════════════

LAYOUT (à coordonner avec la refonte header en cours, je verrai avec toi pour les détails) :
- Header minimaliste : compteur "X/20" + bouton fermer (pas d'énergie, pas d'indice, pas de chrono)
- Zone centrale : pile de cartes (la carte du dessus est la statement actuelle, on devine la suivante en arrière)
- Carte affirmation : grande, blanche, fond uni, l'affirmation en gros texte centré
- Indications swipe semi-transparentes : "← FAUX" en rouge à gauche, "VRAI →" en vert à droite, qui apparaissent quand le joueur commence à drag
- En bas : 2 gros boutons côte à côte (le swipe ET les boutons fonctionnent tous les deux)
  - Bouton FAUX à gauche : fond rouge #E84535, texte blanc, gros et tappable
  - Bouton VRAI à droite : fond vert #6BCB77, texte blanc, gros et tappable

ANIMATIONS :
- Drag horizontal de la carte (suit le doigt)
- Quand le joueur swipe à droite (Vrai) : la carte vire au vert + check mark qui apparaît
- Quand le joueur swipe à gauche (Faux) : la carte vire au rouge + croix qui apparaît
- La carte sort de l'écran avec rotation (swipe vers la sortie)
- La carte suivante remonte dessous
- Après le swipe : flash vert "BIEN VU !" si correct, flash rouge "Raté !" si faux (300ms)
- Puis carte suivante (transition fluide)

DÉTAILS UX :
- PAS de feedback "bonne réponse révélée" entre chaque carte (sinon ça casse le rythme du swipe)
- L'historique des bonnes/mauvaises est gardé en mémoire pour le score final
- Le joueur enchaîne les 20 cartes en 1-2 minutes max
- Les cliques sur les boutons FAUX/VRAI déclenchent les mêmes animations qu'un swipe (carte qui sort à gauche ou à droite)
- 0 timer, 0 indice, 0 coin gagné, 0 déblocage f*ct

═══════════════════════════════════════
RESULTSSCREEN
═══════════════════════════════════════

Layout (les modifs détaillées viendront plus tard, on garde la base existante avec ces principes) :

- Score héros en gros : "X/20" centré
- Couleur du score selon résultat : vert si >15, jaune 10-15, rouge <10
- Statut WTF! (5 paliers) :
  - 0-5/20 : "Aïe, ton flair est en panne"
  - 6-10/20 : "Mouais, tu te laisses avoir"
  - 11-15/20 : "T'as l'œil"
  - 16-19/20 : "T'es trop fort"
  - 20/20 : "Légende ! Tu vois clair dans tout"
- Récap des 20 cartes : grille 4×5 avec mini-cartes vert (correct) ou rouge (faux)
- Cliquer sur une mini-carte révèle l'affirmation et la bonne réponse
- CTA HÉROS de partage (priorité visuelle #1) : "📤 Partager mon score"
- CTA secondaires : "Rejouer" (neutre) + "Accueil"

FORMAT DE PARTAGE WhatsApp/story (texte automatique avec score et palier) :
"🔥 J'ai eu [SCORE]/20 au Vrai ou Fou WTF!
Et toi, tu vois clair ? 👀
Joue ici : [lien app]"

═══════════════════════════════════════
VÉRIFICATION
═══════════════════════════════════════

- npm run build doit passer vert
- Tester le parcours complet : HomeScreen → Vrai ou Fou → Règles → Swipe → Results
- Vérifier que les 20 cartes s'enchaînent fluidement
- Vérifier que le swipe ET les boutons FAUX/VRAI fonctionnent identiquement
- Vérifier que le partage WhatsApp formate bien le score automatiquement
- Ne PAS toucher aux autres modes (Quickie, Quest WTF!, Endless, Blitz, Drop)

NE PAS POUSHER — Michael push manuellement après tests en local.