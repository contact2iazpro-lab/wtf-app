AUTORUN: Toujours appliquer les modifications sans demander confirmation. Ne jamais créer de worktree ni de branche. Travailler directement sur master.

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
- Niveaux : Cool | Hot | WTF!
- Streak → Série | Mode Parcours → Quête WTF!
- Ratées → À découvrir
- Flash + Explorer fusionnés → mode "Jouer"

## Règles de jeu — Source de vérité (11/04/2026)

### Niveaux Quest

| Niveau | QCM | Timer | Indice gratuit | Indice payant | Prix indice | Coins/bonne réponse |
|--------|-----|-------|----------------|---------------|-------------|---------------------|
| Cool   | 2   | 30s   | 1              | 1 (2e)        | 3 coins     | 3                   |
| Hot    | 4   | 30s   | 0              | 2 (1er + 2e)  | 5 coins     | 3                   |
| WTF!   | 6   | 30s   | 0              | 1             | 8 coins     | 5                   |

### Mode Jouer (ex-Flash + Explorer)

| Paramètre | Valeur |
|-----------|--------|
| Coût | Gratuit illimité |
| Questions | 5 |
| QCM | 4 choix |
| Timer | 30s |
| Indices | 2 (payants, même prix que Hot) |
| Coins (aléatoire) | 2 coins/bonne réponse |
| Coins (catégorie choisie) | 1 coin/bonne réponse |
| Contenu | F*cts générés uniquement |
| Sauvegarde | F*cts débloqués immédiatement |

### Mode Blitz

| Paramètre | Valeur |
|-----------|--------|
| Coût | Gratuit illimité |
| Timer | 60s chrono descendant |
| QCM | 4 choix |
| Indices | Aucun |
| Coins | 0 (prestige uniquement) |
| Paliers | 5, 10, 20, 30, 40, 50 questions |
| Contenu | F*cts débloqués du joueur |

### Mode Hunt (WTF du Jour)

| Paramètre | Valeur |
|-----------|--------|
| Coût | Gratuit, 1×/jour |
| Questions | 5 |
| QCM | 4 choix |
| Timer | 30s |
| Indices | 2 |
| Objectif | Débloquer le WTF! VIP du jour |

### Règles communes
- Indice non disponible si pas assez de coins : bouton grisé, JAMAIS de pause du timer
- Questions par Quête : 5 (TEMP TEST — remettre à 10 au lancement)
- Pas de bonus perfect (ni Quest ni Jouer)
- Nouveau joueur : 25 coins / 1 ticket / 3 indices

## Modes de jeu — Résumé

| Mode | Contenu | Coût | Gains | Statut |
|------|---------|------|-------|--------|
| Quête WTF! | WTF VIP | 1 ticket | Coins + f*cts VIP | Actif |
| Jouer | F*cts générés | Gratuit | Coins + f*cts générés | Actif |
| Blitz | F*cts débloqués | Gratuit | Prestige (records) | Actif |
| Hunt | WTF VIP | Gratuit 1×/jour | 1 f*ct VIP | Actif |
| Série | F*cts générés | Gratuit | Multiplicateur coins | V2 |
| Multi | À définir | À définir | À définir | V2 |

## Architecture contenu
- **WTF VIP** (350) : f*cts originaux du jeu physique → Quête uniquement
- **F*cts générés** (1000+) : générés par IA → Jouer, Blitz, Hunt
- Collection : 2 onglets (WTF! + Funny F*cts)

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

## Choix du modèle — Règle officielle

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
- Ne jamais pusher uniquement pour tester — tester en local d'abord
