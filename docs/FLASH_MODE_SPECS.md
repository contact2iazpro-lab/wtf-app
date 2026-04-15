MODE FLASH — Spécifications complètes (15/04/2026)

CONCEPT : Le rendez-vous quotidien. 1 session gratuite par jour. Lundi-Samedi = thème du jour (Funny facts). Dimanche = Hunt VIP de la semaine. Un seul bouton sur la HomeScreen, le contenu change selon le jour.

⚠️ CHANGEMENTS CRITIQUES VS CODE ACTUEL :
- Fusionne Hunt (dimanche) + Puzzle du Jour (lun-sam) en un seul mode "Flash"
- Le Puzzle du Jour (3 tentatives, élimination d'options) est SUPPRIMÉ — remplacé par 5 questions QCM 2 choix
- Le Hunt n'est plus un mode séparé — c'est le Flash du dimanche
- QCM passe de 4 → **2 choix**
- Gains passent de 5/3/1 coins → **30 coins fixe**

═══════════════════════════════════════
LUNDI → SAMEDI : THÈME DU JOUR
═══════════════════════════════════════

RÈGLES :
- QCM **2 choix**, 5 questions
- Timer : **15 secondes** par question
- Indices : **0** (aucun bouton visible)
- Contenu : Funny facts d'un **thème transversal** (pas une catégorie — un thème)
- Coût : **Gratuit 1×/jour** (reset minuit)
- Gains : **30 coins fixe** (récompense de participation, quel que soit le score)
- Déblocage f*cts : **Non** (le joueur découvre mais ne collecte pas)
- Après la session : bouton grisé "Reviens demain" jusqu'à minuit

THÈMES — SYSTÈME :
- Chaque jour de la semaine a un thème différent
- Les thèmes tournent chaque semaine (rotation sur un calendrier éditorial)
- Le thème est affiché dans une bannière en haut de l'écran avant et pendant la session
- Les 5 Funny facts de la session sont sélectionnés par tag/catégorie correspondant au thème

EXEMPLES DE THÈMES (rotation hebdomadaire) :
- "Les chiffres fous" — f*cts avec des nombres incroyables
- "Ça existe vraiment ?" — f*cts improbables mais vrais
- "Le corps est bizarre" — f*cts corps humain + santé
- "Records absurdes" — f*cts records + exploits
- "Lois WTF!" — f*cts lois et règles étranges
- "Animaux fous" — f*cts animaux surprenants
- "Tech WTF!" — f*cts technologie surprenants
- "Histoire dingue" — f*cts historiques improbables
- "Science fiction réelle" — f*cts sciences qui semblent inventés
- "Food WTF!" — f*cts gastronomie étranges

IMPLÉMENTATION THÈMES V1 (simple) :
- Pas besoin d'un système éditorial complexe au lancement
- V1 : le thème du jour = une catégorie mappée sur le jour de la semaine
  - Lundi = Records, Mardi = Corps Humain, Mercredi = Animaux, Jeudi = Lois, Vendredi = Sciences, Samedi = Gastronomie
- La bannière affiche le nom fun du thème (pas le nom de la catégorie)
- V2 : vrai système de thèmes transversaux avec tags sur les f*cts

═══════════════════════════════════════
DIMANCHE : HUNT VIP
═══════════════════════════════════════

RÈGLES :
- QCM **2 choix**, 5 questions
- Timer : **15 secondes** par question
- Indices : **2** (consommés du stock personnel)
- Contenu : 1 VIP fact cible de la semaine + 4 Funny facts distracteurs
- Coût : **Gratuit 1×** (dimanche uniquement)
- Gains : **1 VIP débloqué** si le VIP est correctement répondu
- Sélection VIP : seed ISO-week — le même VIP toute la semaine, révélé le dimanche
- Si raté : le VIP n'est pas débloqué. Le joueur attend le dimanche suivant pour un nouveau VIP.

UX DIMANCHE :
- Mise en scène différente du lun-sam : ambiance "chasse au trésor"
- Bannière spéciale : "WTF! de la Semaine" au lieu du thème du jour
- Le VIP cible est présenté comme LE prix à gagner
- Après la session : révélation du VIP (image + explication) qu'il soit débloqué ou non

═══════════════════════════════════════
UX COMMUNE
═══════════════════════════════════════

- Bouton HomeScreen : 1 seul bouton "Flash" avec badge indiquant le thème du jour ou "Hunt VIP" le dimanche
- Avant la session : écran d'intro avec le thème/hunt + bouton "C'est parti"
- Après la session quotidienne : bouton grisé avec countdown "Reviens dans Xh Xmin"
- Flag reset : localStorage ou Supabase — dernière date de Flash jouée (format YYYY-MM-DD)
- Reset : minuit heure locale du joueur

═══════════════════════════════════════
FICHIERS
═══════════════════════════════════════

FICHIERS À SUPPRIMER OU FUSIONNER :
- PuzzleDuJourScreen.jsx → SUPPRIMER (remplacé par Flash lun-sam)
- HuntScreen / WTFDuJourTeaserScreen / WTFDuJourRevealScreen → FUSIONNER dans FlashScreen

FICHIER À CRÉER :
- src/screens/FlashScreen.jsx — gère les deux variantes (lun-sam thème / dimanche hunt)
- Ou adapter un écran existant si plus simple

FICHIERS À MODIFIER :
- App.jsx : routing vers FlashScreen, supprimer handlers Puzzle et Hunt séparés
- gameConfig.js : FLASH_CONFIG (2 QCM, 15s, gains 30c fixe lun-sam / 1 VIP dim)
- HomeScreen.jsx : un seul bouton Flash avec badge dynamique
- factsService.js : getFlashFacts(dayOfWeek) — retourne Funny par catégorie lun-sam ou VIP seed dimanche
