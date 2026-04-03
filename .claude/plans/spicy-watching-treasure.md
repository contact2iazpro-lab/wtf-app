# Plan: ProfilPage + BoutiquePage

## Context
ProfilPage et BoutiquePage sont des placeholders "En construction". Il faut les transformer en vraies pages. Ce sont des routes React Router standalone (`/profil`, `/boutique`) qui lisent les donnees depuis `localStorage.wtf_data`. Le BottomNav est deja affiche par AppRouter pour ces deux routes.

## Fichiers a modifier
- `src/pages/ProfilPage.jsx` — refonte complete
- `src/pages/BoutiquePage.jsx` — refonte complete

Aucun autre fichier modifie.

## ProfilPage.jsx

**Layout** : fond degrade orange (`linear-gradient(160deg, #FF6B1A22, #FF6B1A)`), scroll vertical, padding-bottom pour BottomNav (80px).

**Structure** :
1. **Header** : bouton retour `← Accueil` en haut a gauche → `navigate('/')`
2. **Section profil** : avatar cercle (emoji 👤 dans un cercle gris, image par defaut) + pseudo "Joueur WTF!" en blanc bold
3. **Grille stats 2x2** (cartes semi-transparentes blanches) :
   - F*cts debloques : `saved.unlockedFacts?.length || 0`
   - Coins gagnes : `saved.wtfCoins || 0`
   - Serie en cours : `saved.streak || 0` jours
   - Quetes completees : `saved.sessionsToday || 0` (pas de compteur cumule en localStorage, on affiche ce qui est dispo)
4. **Bouton "Se connecter"** : blanc sur fond orange, non fonctionnel (juste visuel pour l'instant)

**Donnees** : `useState(() => JSON.parse(localStorage.getItem('wtf_data') || '{}'))` — meme pattern que `CollectionPage.jsx:322`.

**Retour telephone** : `useEffect` avec listener `popstate` → `navigate('/')`.

## BoutiquePage.jsx

**Layout** : meme fond degrade orange, centre vertical.

**Structure** :
1. **Header** : bouton retour `← Accueil` → `navigate('/')`
2. **Icone** : emoji 🛒 grand
3. **Titre** : "Boutique WTF!" (24px, white, bold)
4. **Message** : "Bientot disponible — Les packs de coins, tickets et indices arrivent tres vite !"
5. **Solde actuel** (3 badges horizontaux, fond semi-transparent) :
   - Coins : `saved.wtfCoins || 0` avec emoji piece
   - Tickets : `saved.tickets || 0` avec 🎟️
   - Indices : `localStorage.getItem('wtf_hints_available') || 0` avec 💡

**Retour telephone** : meme pattern popstate.

## Verification
1. `preview_start` le serveur
2. Naviguer vers `/profil` — verifier avatar, pseudo, stats, bouton connexion, BottomNav
3. Naviguer vers `/boutique` — verifier titre, message, solde, BottomNav
4. Tester bouton retour sur les deux pages
5. Verifier que HomeScreen et autres pages ne sont pas impactees
