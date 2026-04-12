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
- Ratées → À découvrir

## Règles de jeu — Source de vérité (11/04/2026)

### Niveaux Quest

| Niveau | QCM | Timer | Indices gratuits | Indice payant | Coins/bonne réponse |
|--------|-----|-------|------------------|---------------|---------------------|
| Cool   | 2   | 30s   | 2                | +1 (8 coins)  | 2                   |
| Hot    | 4   | 20s   | 2                | +1 (8 coins)  | 2                   |
| WTF!   | 6   | 20s   | 1                | +1 (8 coins)  | 1                   |

### Mode Flash (Jouer)

| Paramètre | Valeur |
|-----------|--------|
| Coût | 1 énergie (3 gratuites/jour, +10 coins/extra) |
| Questions | 5 |
| QCM | 4 choix |
| Timer | 20s |
| Catégorie | **Aléatoire uniquement** (pas de CategoryScreen) |
| Coins | 2 coins/bonne réponse |
| Contenu | Funny facts uniquement (catégories débloquées) |
| Sauvegarde | F*cts débloqués immédiatement |

### Mode Explorer

| Paramètre | Valeur |
|-----------|--------|
| Coût | 1 énergie (3 gratuites/jour, +10 coins/extra) |
| Questions | 5 |
| QCM | 4 choix |
| Timer | 20s |
| Catégorie | **Choix obligatoire** (pas d'aléatoire) |
| Coins | 1 coin/bonne réponse (catégorie choisie) |
| Contenu | Funny facts uniquement (catégories débloquées) |
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

### Mode Hunt (WTF de la Semaine)

| Paramètre | Valeur |
|-----------|--------|
| Coût | Gratuit, 1×/semaine (dimanche) |
| Questions | 5 |
| QCM | 4 choix |
| Timer | 20s |
| Indices | 2 (stock gratuit) |
| Sélection fact | Seed ISO-week : fact stable lundi→dimanche |
| Objectif | Débloquer le WTF! VIP de la semaine |

### Mode Puzzle du Jour

| Paramètre | Valeur |
|-----------|--------|
| Coût | Gratuit, 1×/jour |
| Questions | 1 funny fact (4 QCM) |
| Tentatives | 3 (erreur = élimine une option) |
| Coins | 6 / 4 / 2 selon tentatives restantes |
| Contenu | Funny fact seed sur la date |
| Partage | Format Wordle (🟩🟥) |

### Mode Route WTF!

| Paramètre | Valeur |
|-----------|--------|
| Coût | Gratuit illimité |
| Structure | Niveaux infinis (3 Q funny) |
| Boss | Tous les 10 niveaux (1 Q VIP HOT) |
| Coins | 6 / niveau · 20 / boss |
| Persistance | wtf_data.route = { level, stars } |
| Avancement | Niveau parfait requis |

### Économie F2P

| Paramètre | Valeur |
|-----------|--------|
| Nouveau joueur | 0 coins / 1 ticket / 3 indices (valeurs officielles Notion) |
| 1 ticket (boutique) | 25 coins |
| 1 indice (boutique) | 10 coins |
| 3 indices (boutique) | 30 coins |
| 5 indices (boutique) | 45 coins |
| Streak J1 | 2 coins |
| Streak J3 | 2 indices |
| Streak J7 | 10 coins + 1 ticket |
| Streak J14 | 1 ticket + 3 indices |
| Gains journaliers cible | 30-50 coins/jour |
| TTF (sessions avant achat) | ~3 sessions Flash |

### Règles communes
- Indices = chaque utilisation débite 1 du stock (pas d'indices gratuits)
- Indice non disponible si stock vide : bouton grisé, JAMAIS de pause du timer
- Questions par Quête : 5 (valeur officielle)
- Pas de bonus perfect (ni Quest ni Jouer)

## Modes de jeu — Résumé

| Mode | Contenu | Coût | Gains | Statut |
|------|---------|------|-------|--------|
| Quête WTF! | WTF VIP | 1 ticket | Coins + f*cts VIP | Actif |
| Jouer (Flash) | F*cts générés | Gratuit (3/j partagé Explorer) | Coins + f*cts générés | Actif |
| Explorer | F*cts générés | Gratuit (3/j partagé Flash) | Coins + f*cts générés | Actif |
| Blitz | F*cts débloqués | Gratuit | Prestige (records) | Actif |
| Hunt | WTF VIP | Gratuit 1×/semaine | 1 f*ct VIP | Actif |
| Puzzle du Jour | F*ct funny daily | Gratuit 1×/jour | 6/4/2 coins | Actif |
| Route WTF! | F*cts funny + VIP boss | Gratuit illimité | 6/niveau + 20/boss | Actif |
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

### Couleurs des catégories (source unique : src/data/facts.js)
| Catégorie | Couleur | Catégorie | Couleur |
|-----------|---------|-----------|---------|
| Animaux | #6BCB77 | Lois | #6366B8 |
| Animaux Marins | #40B4D8 | Musique | #E84B8A |
| Animaux Terrestres | #E8712A | Mythologie | #C8A84B |
| Architecture | #A0826D | Phobies | #7B5EA7 |
| Art | #A07CD8 | Politique | #B24B4B |
| Célébrités | #FFD700 | Psychologie | #8E44AD |
| Cinéma | #D4AF37 | Records | #E8B84B |
| Corps Humain | #F07070 | Santé | #90F090 |
| Crimes | #8B4789 | Sciences | #80C8E8 |
| Définition | #4A9BD9 | Sport | #E84535 |
| Dictons | #4CAF50 | Technologie | #7B8FA0 |
| Espace | #2E1A47 | Internet | #5B8DBE |
| Gastronomie | #FFA500 | Inventions | #5BC0DE |
| Géographie | #40D9C8 | Jeux & Jouets | #9B59B6 |
| Histoire | #E8A030 | Kids | #FFEF60 |

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
