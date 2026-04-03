# WTF! — What The F*ct

## Projet
- App mobile trivia basée sur un jeu physique validé (350 cartes)
- URL prod : https://wtf-app-production.up.railway.app/
- Admin Tool : https://wtf-app-production.up.railway.app/admin
- Stack : React + Vite + Supabase + Tailwind + Nunito
- Deploy : Railway auto sur push master

## Règles absolues
1. Ne JAMAIS pusher automatiquement — commit local uniquement
2. Attendre confirmation explicite avant tout git push
3. Un prompt = un fichier cible = une modification
4. Toujours travailler sur master directement
5. Si une branche de preview est créée → merger sur master immédiatement
6. Branche unique : ne jamais créer de nouvelle branche. Si Claude Code crée une branche automatiquement → merger immédiatement sur master et supprimer la branche.

## Vocabulaire officiel
- fact/fait → f*ct | facts → f*cts
- WTF toujours avec ! (sauf "What The F*ct")
- Facile → Curieux | Normal → À fond | Expert → WTF! Addict
- Streak → Série | Mode Parcours → Quête WTF!
- Ratées → À découvrir

## Règles de jeu — Version finale

| Mode | QCM | Indice gratuit | Indice payant | Prix | Coins/bonne réponse |
|------|-----|----------------|---------------|------|---------------------|
| Curieux | 4 | 1 | 2e indice | 3 coins | 3 |
| À fond | 4 | 0 | 1er + 2e | 5 coins chacun | 3 |
| WTF! Addict | 6 | 0 | 1 disponible | 8 coins | 5 |

- Timer : 30 secondes (tous modes)
- Questions par Quête : 5 (TEMP TEST — remettre à 10 au lancement)
- Badge Perfect : attribué si 100% de bonnes réponses → +1 ticket
- Indice non disponible si pas assez de coins : bouton grisé, JAMAIS de pause du timer

## Modes de jeu
- Session Flash : gratuit illimité, sans récompense
- Quête WTF! : 1 ticket, coins + f*cts + trophées
- Marathon : 1 ticket, 20 questions, catégorie au choix, coins + trophées
- WTF de la Semaine : gratuit 1×/semaine, 1 f*ct non débloqué
- Blitz : 3/jour gratuits, affirmations Vrai/Faux sur f*cts débloqués

## Design system
- Police : Nunito (400/700/900) via Google Fonts
- Couleur principale : #FF6B1A (orange WTF!)
- Fond écrans jeu : linear-gradient(160deg, {couleurCatégorie}22, {couleurCatégorie})
- CoinsIcon : src/components/CoinsIcon.jsx
- Scaling responsive : useScale hook — base iPhone SE 375×667px
- Formule : Math.min(window.innerHeight/667, window.innerWidth/375)
- Toutes les tailles : calc(Xpx * var(--scale))
- Règle isLightColor : texte #1a1a1a sur fond clair, #ffffff sur fond sombre

## Toggle Mode Dev
- Clé localStorage : wtf_dev_mode
- Visible uniquement en import.meta.env.DEV (localhost)
- Mode Dev : coins = 9999, tickets = 99, indices = 99
- Jamais visible en production (Railway)

## Workflow
- Preview local : npm run dev → localhost:5176
- Push : manuel uniquement — jamais automatique
- Git : pull en premier, push en dernier
- node_modules : npm install sur chaque nouveau poste

## URLs Notion
- QG : https://www.notion.so/332b94ed8cb180298efadff6b66d54af
- Paramètres : https://www.notion.so/332b94ed8cb181869176fd6266e78915

⚠️ RAILWAY : Ne jamais pusher automatiquement. Commit local uniquement.

## ⚡ Choix du modèle — Règle officielle

### Utiliser SONNET pour :
- Corrections CSS/style ciblées (1-3 modifications)
- Changements de textes, labels, valeurs
- Ajout d'un élément simple (image, bouton, filtre)
- Fix de bug visuel identifié précisément

### Utiliser OPUS pour :
- Refonte complète d'un écran
- Nouvelle logique (état, hooks, props)
- Architecture multi-fichiers
- Impact sur plusieurs composants simultanément

### Règle simple :
> Sonnet = je sais exactement quoi changer et où
> Opus = je dois comprendre la structure pour décider

## Preview local
- Preview : npm run dev → localhost:5176
- Claude peut utiliser les outils mcp__Claude_Preview__* pour vérifier le rendu
- Ne jamais pusher uniquement pour tester — tester en local d'abord
