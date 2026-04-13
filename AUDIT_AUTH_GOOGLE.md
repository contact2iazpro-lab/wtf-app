# 🔍 AUDIT COMPLET — Google Auth + Connexion Joueur

**Date:** 10 avril 2026  
**Status:** En cours de révision pour P0-2 et P3  
**Objectif:** Identifier contradictions, erreurs, simplifications, hardcoding

---

## 📋 Fichiers Audités

1. ✅ `src/context/AuthContext.jsx` (212 lignes)
2. ✅ `src/services/playerSyncService.js` (97 lignes)
3. ✅ `src/components/Auth/UserMenu.jsx` (97 lignes)
4. ✅ `src/components/Auth/LoginModal.jsx` (172 lignes)
5. ⏳ `src/App.jsx` (push/pull calls — lignes 1431, 1599, 1793, 1825)
6. ⏳ `src/pages/ProfilPage.jsx` (connexion UI)

---

## 🔴 PROBLÈMES CRITIQUES

### 1. **HARDCODING TOKEN SUPABASE** ⚠️ SÉCURITÉ
**Fichier:** `src/context/AuthContext.jsx:143`

```javascript
localStorage.removeItem('sb-znoceotakhynqcqhpwgz-auth-token')
```

**Problème:** 
- Token Supabase hardcodé (`sb-znoceotakhynqcqhpwgz-auth-token`)
- Dépend de l'ID du projet Supabase
- Pas générique, cassera si Supabase reconfigure

**Solution:**
- Laisser Supabase gérer directement (il le fait déjà)
- Remplacer par: `supabase.auth.signOut()` (qui nettoie automatiquement)
- Simplifier la logique

---

### 2. **PAS DE GESTION DE CONFLIT DATA** ⚠️ PERTE DE DONNÉES
**Fichier:** `src/services/playerSyncService.js:31-79` (pullFromServer)

**Problème:**
```javascript
// Si joueur a données locales + récentes que cloud → ÉCRASÉES!
const saved = JSON.parse(localStorage.getItem('wtf_data') || '{}')
saved.wtfCoins = remote.coins || 0  // ← écrase sans vérifier timestamp
```

**Scénario de bug:**
1. Joueur joue en local → 100 coins (local timestamp T)
2. Connexion Google → cloud a 50 coins (timestamp T-1)
3. `pullFromServer()` appelé → écrase par 50 coins ❌ **PERTE DE 50 COINS**

**Solution:**
```javascript
// Comparer timestamps AVANT d'écraser
if (remote.last_modified > saved.lastModified) {
  saved.wtfCoins = remote.coins || 0
} else {
  // Local est plus récent → push local vers cloud
  pushToServer(userId)
}
```

---

### 3. **DUPLICATED EXPORT FUNCTIONS** 
**Fichier:** `src/services/playerSyncService.js:96-97`

```javascript
export async function syncPlayerData(userId) { return pullFromServer(userId) }
export function syncPlayerDataAsync(userId) { if (userId) pullFromServer(userId).catch(() => {}) }
```

**Problème:**
- 2 fonctions qui font essentiellement la même chose
- Confusing pour les appels (lequel utiliser?)
- Peut avoir des utilisations incohérentes

**Solution:**
- Garder que `pullFromServer()` public
- Supprimer ces 2 wrappers (jamais utilisés?)

---

### 4. **MAGIC NUMBER THROTTLE**
**Fichier:** `src/services/playerSyncService.js:87`

```javascript
const THROTTLE_MS = 5000  // Pourquoi 5s? Trop rapide pour Blitz?
```

**Questions:**
- Pendant un Blitz de 30s, `syncAfterAction()` throttle à 5s = 6 appels possibles
- C'est peut-être correct, mais pas documenté
- Pour Realtime multi-joueur, c'est peut-être trop lent

---

### 5. **WTFPLAYER_NAME ET WTFPLAYER_AVATAR NON DOCUMENTÉS**
**Fichier:** `src/context/AuthContext.jsx:89-97`

```javascript
const localName = localStorage.getItem('wtf_player_name')
const localAvatar = localStorage.getItem('wtf_player_avatar')
```

**Problème:**
- Où sont-ils écrits? Cherche dans ProfilPage → oui, écrit ligne 57
- Mais c'est pas centralisé
- Pas clair s'il y a synchronisation bidirectionnelle

**Solution:**
- Créer un helper `getPlayerMetadata()` qui agrège tout ça

---

### 6. **COLLECTIONS SYNC ASSUME TABLE EXISTE**
**Fichier:** `src/services/playerSyncService.js:60-77`

```javascript
const { data: collections } = await supabase
  .from('collections')  // ← assume la table existe!
  .select('facts_completed')
  .eq('user_id', userId)
```

**Problème:**
- Si `collections` table n'existe pas ou schema change → erreur silencieuse
- Pas de vérification de structure

---

### 7. **SIGNOUT KEEPS CERTAINES DONNÉES ARBITRAIREMENT**
**Fichier:** `src/context/AuthContext.jsx:159-163`

```javascript
const cleanData = {
  coffreClaimedDays: wtfData.coffreClaimedDays,
  coffreWeekStart: wtfData.coffreWeekStart,
  seenModes: wtfData.seenModes,
}
```

**Question:**
- Pourquoi garder ces 3 clés spécifiquement?
- Devrait-on garder `anonymousId` aussi? (ID unique du joueur)
- Pas de commentaire expliquant la logique

---

### 8. **USERMENU AFFICHE DATA POTENTIELLEMENT OUT-OF-DATE**
**Fichier:** `src/components/Auth/UserMenu.jsx:12-13`

```javascript
const coins = profile?.coins ?? 0  // ← depuis Supabase
const streak = profile?.streak_current ?? 0  // ← depuis Supabase
```

**Problème:**
- `profile` vient de Supabase (chargé une fois au login)
- Mais le joueur gagne des coins pendant le jeu (dans `wtf_data` local)
- **Le menu affiche les anciens coins!**

**Solution:**
```javascript
// Lire depuis localStorage wtf_data (plus à jour)
const playerData = readWtfData()
const coins = playerData.wtfCoins || profile?.coins || 0
```

---

### 9. **USERMENU BUTTONS NON FONCTIONNELS**
**Fichier:** `src/components/Auth/UserMenu.jsx:59-80`

```javascript
<button onClick={() => setOpen(false)}>
  👤 Mon profil  {/* ← JUSTE FERME LE MENU, NE NAVIGUE PAS! */}
</button>
```

**Problème:**
- Buttons "Mon profil", "Mes trophées", "Boutique" ne font rien
- Utilisateur clique → menu ferme. Point.

**Solution:**
- `useNavigate()` et rediriger: `navigate('/profil')`, etc.

---

### 10. **EMAIL/PASSWORD AUTH PAS UTILISÉ?**
**Fichier:** `src/context/AuthContext.jsx:110-120`

```javascript
const signUpWithEmail = useCallback(async (email, password) => { ... }, [])
const signInWithEmail = useCallback(async (email, password) => { ... }, [])
```

**Question:**
- Ces fonctions sont dans le LoginModal mais jamais utilisées en prod?
- Si inutile → supprimer pour simplifier

---

### 11. **SIGNINFACEBOOK JAMAIS UTILISÉ**
**Fichier:** `src/context/AuthContext.jsx:133-139`

```javascript
const signInWithFacebook = useCallback(async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: { redirectTo: window.location.origin }
  })
  if (error) throw error
}, [])
```

**Question:**
- Exporté dans le contexte mais jamais appelé
- À supprimer si pas prévu pour MVP

---

### 12. **PAS DE RETRY/ERROR RECOVERY**
**Fichier:** `src/services/playerSyncService.js:4-29`

```javascript
export async function pushToServer(userId) {
  // Si la requête échoue → just log et return null
  // Pas de retry!
}
```

**Problème:**
- Réseau instable? Une sync rate-limitée échoue silencieusement
- Joueur ne sait pas que ses données ne sont pas synchronisées

**Solution:**
- Ajouter une queue de sync avec retry automatique
- Ou au minimum: warning toast si sync échoue 2+ fois

---

## 🟡 SIMPLIFICATIONS RECOMMANDÉES

### A. **Supprimer hardcoding token**
```diff
- localStorage.removeItem('sb-znoceotakhynqcqhpwgz-auth-token')
+ // Supabase gère déjà via signOut()
```

### B. **Unifier les sync functions**
```diff
- export async function syncPlayerData(userId) { return pullFromServer(userId) }
- export function syncPlayerDataAsync(userId) { if (userId) pullFromServer(userId).catch(() => {}) }
+ Garder que pullFromServer et les appeler directement
```

### C. **Centraliser metadata player**
```javascript
// Nouveau helper: src/utils/playerMetadata.js
export function getPlayerMetadata() {
  return {
    name: localStorage.getItem('wtf_player_name'),
    avatar: localStorage.getItem('wtf_player_avatar'),
    anonymousId: readWtfData().anonymousId,
  }
}
```

### D. **Mettre à jour UserMenu coins**
```javascript
// Lire depuis localStorage (source of truth)
const playerData = readWtfData()
const coins = playerData.wtfCoins || 0
```

### E. **Supprimer providers inutilisés**
- `signUpWithEmail`, `signInWithEmail`, `signInWithFacebook` si pas utilisés

---

## 🟢 ÉTAT DE QUALITÉ

| Aspect | Score | Notes |
|--------|-------|-------|
| Sécurité | 🟠 6/10 | Hardcoding token, pas de retry |
| Gestion erreurs | 🟡 5/10 | Pas de conflit resolution, erreurs silencieuses |
| Cohérence | 🟡 6/10 | Data out-of-date, duplicated functions |
| Simplicité | 🟠 6/10 | Trop de wrappers, trop de logique |
| Documentation | 🔴 3/10 | Pas de commentaires expliquant les choix |

**Score global:** 5/10 — Fonctionnel mais fragile

---

## ✅ CHECKLIST AVANT TESTS GOOGLE

- [ ] Supprimer hardcoding token Supabase (ligne 143)
- [ ] Ajouter conflict resolution (comparer timestamps)
- [ ] Unifier sync functions
- [ ] Fixer UserMenu pour afficher coins à jour
- [ ] Ajouter navigation sur UserMenu buttons
- [ ] Documenter logique signOut (pourquoi garder ces 3 clés?)
- [ ] Supprimer providers inutilisés (email/password/facebook)
- [ ] Ajouter error toast si sync échoue
- [ ] Tester Google login avec conflict scenario

---

## 📅 PLAN FIXES

**Session 1 (aujourd'hui):**
1. Supprimer hardcoding token
2. Ajouter conflict resolution
3. Unifier sync functions
4. Fixer UserMenu coins

**Session 2:**
5. Documenter et nettoyer providers
6. Ajouter error handling et retry
7. Tester en local (sans Google)

**Session 3 (après Notion update):**
8. Push Railway
9. Tester Google login en prod
10. Valider P0-2 complet

---

**Fin de l'audit**
