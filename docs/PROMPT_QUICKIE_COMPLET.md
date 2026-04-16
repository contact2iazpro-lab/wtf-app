Lis ce plan et exécute-le directement sans me demander de confirmation ni réexpliquer ce que tu vas faire.

CONTEXTE : Identité visuelle complète du mode QUICKIE (ex-Snack). Décisions actées en session 16/04/2026.

═══════════════════════════════════════
ÉTAPE 1 — RENOMMAGE COMPLET SNACK → QUICKIE
═══════════════════════════════════════

Renommage dans tout le codebase :

CODE (variables, fonctions, configs, constantes) :
- snack → quickie
- Snack → Quickie
- SNACK → QUICKIE
- snack_* → quickie_*
- SnackScreen → QuickieScreen (si existe)
- SNACK_CONFIG → QUICKIE_CONFIG
- DIFFICULTY_LEVELS.SNACK → DIFFICULTY_LEVELS.QUICKIE
- SCREENS.SNACK → SCREENS.QUICKIE
- handleSnack → handleQuickie
- handleSnackStart → handleQuickieStart
- getSnackEnergy → getQuickieEnergy
- TUTO_SNACK → TUTO_QUICKIE
- snackBestScore → quickieBestScore (clé localStorage)
- statsByMode.snack → statsByMode.quickie

STRINGS UI VISIBLES :
- "Snack" → "Quickie" partout dans l'UI
- "Mode Snack" → "Mode Quickie"
- Livret de règles : section Snack → section Quickie

ASSETS :
- /public/assets/modes/snack.png → /public/assets/modes/quickie.png (git mv)
- Toute autre référence "snack" dans noms de fichiers

CLAUDE.md :
- Section MAPPING DE RENOMMAGE : ajouter "Snack → Quickie (16/04/2026)"
- Section vocabulaire : remplacer "Snack" par "Quickie" partout
- Section modes officiels : "Snack" → "Quickie"

MIGRATION LOCALSTORAGE one-shot :
Si une clé localStorage utilise "snack" (snackBestScore, statsByMode.snack), prévoir migration vers "quickie" au premier mount post-déploiement.

═══════════════════════════════════════
ÉTAPE 2 — IDENTITÉ VISUELLE QUICKIE
═══════════════════════════════════════

COULEUR DOMINANTE : Violet pop #7F77DD

PALETTE COMPLÈTE :
- Dominante : #7F77DD (violet pop)
- Accent clair : #B5AFEB (lavande)
- Accent foncé : #4A3FA3 (violet profond)
- Fond écran de jeu : linear-gradient(160deg, #4A3FA3, #7F77DD)
- Texte sur dominante : #FFFFFF
- Boutons réponse : #FFFFFF avec bordure 2px #7F77DD

À APPLIQUER SUR :
1. QuestionScreen (mode Quickie uniquement)
   - Background : dégradé violet
   - Boutons réponse : 2 boutons larges blancs avec bordure violette
   - Indice utilisé : flash de particules violettes
   - Bonne réponse : flash vert + pulse
   - Mauvaise réponse : shake + flash rouge léger
   - Transition entre questions : slide latéral fluide

2. RevelationScreen (mode Quickie uniquement)
   - Background : dégradé violet identique
   - Carte du f*ct : fond blanc/lavande, bordure violette néon (glow)
   - Sparkles violets flottants en arrière-plan (CSS, pas d'emoji cerveau)
   - Bouton "Suivant" violet pop avec ombre

3. ResultsScreen (mode Quickie uniquement)
   - Background : violet
   - "Bien joué !" en gros
   - Score 5/5 avec étoiles violettes
   - Détail des gains : "+X coins" + bonus perfect si 5/5
   - Boutons : "Rejouer" (violet pop) et "Accueil" (transparent bordure violette)

4. Page de règles Quickie (intro avant lancement)
   - Titre : "Quickie"
   - Tagline : "Court. Bon. Sans engagement." 😏
   - Pictogrammes : 5 questions / 15s / 10 coins / 1 énergie
   - Bouton "C'est parti !" violet pop

═══════════════════════════════════════
ÉTAPE 3 — ANIMATIONS (CSS / Framer Motion natif)
═══════════════════════════════════════

- Background dégradé violet animé (slow shift hypnotique)
- Sparkles flottants violets en CSS pur (5-8 particules, performance mobile)
- Pulse sur le bouton "C'est parti !"
- Slide latéral entre les questions (fade out → slide in)
- Flash vert (300ms) sur bonne réponse
- Shake + flash rouge (300ms) sur mauvaise réponse
- Bounce sur l'arrivée du score final
- Pas de Lottie ni de vidéo — tout en natif

═══════════════════════════════════════
ÉTAPE 4 — ICÔNE HOMESCREEN
═══════════════════════════════════════

L'icône (langue violette) sera générée séparément sur Recraft.
Quand elle est prête :
- Fichier : /public/assets/modes/quickie.png
- Sur la HomeScreen, l'icône doit être placée dans un cercle (composant ModeIcon réutilisable)
- Le cercle a un fond légèrement plus clair que le navy, contour subtle violet, ombre douce
- Le nom "Quickie" en Nunito 700 14px en dessous du cercle, couleur blanche

ATTENTION : le composant ModeIcon doit être réutilisable pour les 6 modes (Quickie, Vrai ou Fou, Quest WTF!, Endless, Blitz, Drop). Donc accepter en props :
- icon (path image)
- name (string)
- color (couleur dominante du mode pour le glow/contour)
- onClick

═══════════════════════════════════════
VÉRIFICATION
═══════════════════════════════════════

- npm run build doit passer vert
- Aucune référence à "snack"/"Snack"/"SNACK" dans le code (sauf commentaires d'historique)
- L'identité visuelle Quickie ne doit pas affecter les autres modes (Vrai ou Fou, Quest WTF!, Endless, Blitz, Drop) qui gardent leur thème actuel

NE PAS POUSHER — Michael push manuellement après tests en local.