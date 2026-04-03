# Plan : Connexion Google via Supabase

## Context
L'app WTF utilise actuellement localStorage pour toute la progression (coins, streak, tickets, f*cts debloquees). L'infrastructure Supabase est deja en place : client configure, AuthContext avec `signInWithGoogle()`, table `profiles` et `collections`. Le SettingsModal a deja un bouton Google via SaveProgressModal. Mais la ProfilPage est un placeholder et la synchronisation localStorage <-> Supabase n'existe pas encore.

## Fichiers a modifier

### 1. `src/pages/ProfilPage.jsx` — Refonte complete
**Etat actuel** : Placeholder "En construction"
**Cible** :
- Si non connecte : bouton "Se connecter avec Google" (meme style orange que SaveProgressModal)
- Si connecte : avatar Google (user.user_metadata.avatar_url), nom (user.user_metadata.full_name), email, stats (coins, streak, f*cts)
- Bouton deconnexion si connecte
- Lire coins/streak/tickets depuis localStorage (`wtf_data`) + enrichir avec `profile` Supabase si connecte
- Garder le gradient orange et le style existant

### 2. `src/components/SettingsModal.jsx` — Ajout bouton connexion directe
**Etat actuel** : Le bouton "Enregistrer votre progression" ouvre SaveProgressModal (qui a deja Google)
**Cible** : Pas de changement necessaire — le flow existe deja via SaveProgressModal. On garde tel quel.

### 3. `src/context/AuthContext.jsx` — Sync localStorage <-> Supabase
**Etat actuel** : createProfile met coins=50, mais ne sync pas localStorage
**Modifications** :
- Sur SIGNED_IN : lire localStorage, merger avec profil Supabase (le plus eleve gagne pour coins/streak), ecrire le merge dans Supabase ET localStorage
- Sur chaque `saveStorage()` : si user connecte, aussi update le profile Supabase (coins, streak, tickets)
- Ajouter `syncProgressToSupabase(localData)` et `loadProgressFromSupabase()` au context

### 4. `src/App.jsx` — Hook de sync
**Modifications minimales** :
- Apres `saveStorage()`, si user connecte, appeler `updateProfile({ coins, streak_current, tickets })` pour sync vers Supabase
- Au chargement initial, si user connecte, charger le profil Supabase et merger avec localStorage (max de chaque valeur)

### 5. `src/services/progressService.js` — NOUVEAU fichier
Service de synchronisation progression :
- `syncToSupabase(userId, localData)` : push coins, streak, tickets, unlockedFacts vers Supabase
- `loadFromSupabase(userId)` : charge profil + collections depuis Supabase
- `mergeProgress(local, remote)` : prend le max de chaque valeur numerique, union des sets

## Flow detaille

### Connexion Google (depuis ProfilPage ou SettingsModal)
1. User clique "Se connecter avec Google"
2. `signInWithGoogle()` → OAuth redirect → retour sur l'app
3. `onAuthStateChange` SIGNED_IN se declenche
4. AuthContext : charge le profil Supabase
5. Si profil existe : merge localStorage + Supabase (max de chaque)
6. Si profil nouveau : cree profil avec les donnees localStorage actuelles (pas 50 coins par defaut, mais les coins du localStorage)
7. Sauvegarde le merge dans les deux sens

### Joueur connecte joue une partie
1. Partie se termine → `saveStorage()` met a jour localStorage
2. Juste apres, `updateProfile()` sync coins/streak/tickets vers Supabase
3. `updateCollection()` sync les f*cts (deja en place)

### Joueur revient connecte
1. App charge → `loadStorage()` depuis localStorage
2. AuthContext detecte session existante → charge profil Supabase
3. Merge : max(localStorage, Supabase) pour chaque valeur
4. Met a jour les deux

### Joueur non connecte
Zero changement — tout reste en localStorage comme actuellement.

## Verification
- `npm run dev` → localhost:5176
- Tester ProfilPage non connecte : bouton Google visible
- Tester connexion Google → redirect → retour avec avatar/nom
- Verifier que coins/streak se synchronisent
- Tester deconnexion → retour au bouton Google
- Verifier que les autres ecrans ne changent pas visuellement
