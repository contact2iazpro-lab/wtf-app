# AUDIT COMPLET - Flow Défi Blitz (Amis)

## 🎯 FLOW COMPLET (Michael défie 2iaz)

### PHASE 1 : MICHAEL CRÉE LE DÉFI

#### 1.1 SocialPage - Voir amis + bouton "Défier"
**Fichier:** `src/pages/SocialPage.jsx`
**État affiché:**
- Liste des amis (useFriends hook)
- Bouton "⚔️ Défier" sur chaque ami accepté
- Realtime: notification si ami accepte demande

**Action:** Michael clique "Défier" sur 2iaz
```javascript
startCreateDefi(friend.userId)
// pendingDuel = { mode: 'create', opponentId: friendId }
```

#### 1.2 App.jsx - Détecte pendingDuel mode='create'
**Fichier:** `src/App.jsx`
**useEffect déclenché:**
- Vérifie tickets >= 1 ❌ (CRITIQUE: parait déjà couteux!)
- Débite 1 ticket
- Appelle applyCurrencyDelta RPC
- Set `isChallengeMode = true`
- Set `sessionType = 'blitz'`
- Navigue vers jeu Blitz

**⚠️ QUESTION:** À quel moment Michael choisit la catégorie?
- Pas vu dans le flow... faut chercher


#### 1.3 BlitzScreen - Jeu en mode Challenge
**Fichier:** `src/screens/BlitzScreen.jsx`
**État:**
- Blitz normal 60s timer
- isChallengeMode = true
- 5-10 questions aléatoires

**Action:** Michael fini le jeu (20s, 5/5 correct)
- Appelle handleBlitzFinish()


#### 1.4 useBlitzHandlers - handleBlitzFinish (mode='create')
**Fichier:** `src/hooks/useBlitzHandlers.js`

**Déclenche:**
1. Met à jour wtf_data (stats blitz)
2. Sauvegarde localStorage('wtf_data')
3. Appelle mergeFlags RPC (sync Supabase)
4. Détecte pendingDuel.mode === 'create'
5. Appelle getOrCreateDuel(michael.id, friendId=null)
   - ❌ PROBLÈME: friendId n'est pas passé! opponentId est null!
   - Donc crée duel avec opponentId=null
6. Appelle createDuelRound({ duelId, categoryId, ... })
   - Génère code (6 chars: ABC123)
   - DB INSERT challenges
   - Retourne round objet
7. Sauvegarde localStorage('wtf_auto_challenge', round)
8. Dispatch event 'wtf_challenge_created'
9. clearPendingDuel()
10. **Set screen = SCREENS.BLITZ_RESULTS**


#### 1.5 BlitzResultsScreen - Affiche code + Share
**Fichier:** `src/screens/BlitzResultsScreen.jsx`
**État affiché (isChallengeMode=true):**
- Emoji 🎯 + "Défi créé!"
- Time: 20.15s
- Correct: 5/5
- **Code en gros texte doré:** `ABC123`
- Bouton "📤 Partager le défi"
- Bouton "🏠 Revenir à l'accueil"

**Action:** Michael clique "Partager"
- navigator.share() OU copy clipboard
- URL: `https://wtf-app.../challenge/ABC123`
- Texte: "Défi WTF! Blitz! 5 questions en 20.15s. Tu fais mieux?"

**Michael envoie le lien à 2iaz par SMS/WhatsApp**

---

### PHASE 2 : 2IAZ ACCEPTE LE DÉFI

#### 2.1 2iaz clique lien → ChallengeScreen
**Fichier:** `src/screens/ChallengeScreen.jsx`
**Route:** `/challenge/ABC123`

**Chargement:**
1. useEffect: appelle getChallenge(code='ABC123')
   - DB SELECT challenges.* WHERE code='ABC123'
   - **Retourne:** { id: 'round-uuid', code, category_id, player1_name: 'Michael', player1_time: 20.15, status: 'pending', ... }

2. Parallèle: initFacts().finally(() => setFactsReady(true))
   - Charge all facts depuis Supabase

**État affiché:**
```
🎯 DÉFI WTF!

[Challenge Card]
Michael t'a défié!

Catégorie: Sciences (OU "Toutes catégories" si category='all')
Questions: 5

⏱️ Temps à battre: 20.15s

[Bouton] "Relever le défi! 🚀"
```

**Vérifications avant "Relever":**
- ✅ User connecté?
- ✅ 2iaz a min 5 facts en Sciences? (getBlitzFacts + filter)
  - ⚠️ ISSUE FIXÉE: await initFacts() avant

#### 2.2 2iaz clique "Relever"
**Action:** handleAcceptChallenge()
```javascript
startAcceptDefi(challenge, factsWithOptions)
// pendingDuel = {
//   mode: 'accept',
//   roundId: challenge.id,
//   code: challenge.code,
//   opponentId: challenge.player1_id,
//   facts: [prepared facts]
//   player1Time: challenge.player1_time,
//   player1Name: challenge.player1_name,
// }
navigate('/')  // Retour accueil
```

#### 2.3 2iaz retour accueil (HomeScreen) → Blitz
2iaz peut voir les modes. Clique "Blitz"

**App.jsx useEffect:**
- Voit pendingDuel.mode === 'accept'
- ✅ Pas de coût (accepter c'est gratuit)
- Set isChallengeMode = true
- Set blitzFacts = pendingDuel.facts
- Set screen = SCREENS.BLITZ

#### 2.4 BlitzScreen - Jeu en mode 'accept'
**État:**
- 60s timer
- Même catégorie que Michael (Sciences)
- Même nb questions (5)
- **Mais DIFFERENT set de facts** (seed aléatoire)

**Action:** 2iaz finit le jeu (25s, 4/5 correct)
- Appelle handleBlitzFinish()

#### 2.5 useBlitzHandlers - handleBlitzFinish (mode='accept')
**Détecte:** pendingDuel.mode === 'accept' && pendingDuel.roundId

**Déclenche:**
1. Même mise à jour stats locale
2. Appelle completeDuelRound({
     roundId: pendingDuel.roundId,  // challenge.id
     playerTime: 25.32,
     playerId: 2iaz.id,
     playerName: '2iaz',
   })

3. **DB UPDATE challenges:**
   ```sql
   UPDATE challenges 
   SET player2_id='2iaz.id', 
       player2_name='2iaz',
       player2_time=25.32,
       status='completed'
   WHERE id='round-uuid'
   ```

4. **TRIGGER SQL déclenché:**
   - Calcule winner: player1_time (20.15) < player2_time (25.32)
   - UPDATE challenges SET winner_id=michael.id
   - UPDATE duels SET rounds_count += 1, updated_at=now()

5. clearPendingDuel()

6. **REDIRECT:** navigate(`/challenge/${code}`)
   - Redirection React Router vers `/challenge/ABC123`
   - ✅ FIXÉ: utilisait window.location.href

#### 2.6 ChallengeScreen - Affiche résultats côte à côte
**Route:** `/challenge/ABC123`
**Re-fetch challenge:** getChallenge('ABC123')
- Status = 'completed' ✅
- player1_time, player2_time, winner_id EXISTS

**État affiché (isCompleted=true):**
```
🏆 Résultat du défi!

┌─────────────────┬────┬─────────────────┐
│ Michael (⭐ P1) │ VS │ 2iaz            │
│  20.15s         │    │  25.32s         │
│ GAGNANT         │    │                 │
└─────────────────┴────┴─────────────────┘

Sciences · 5 questions

[Bouton] "Accueil"
```

---

### PHASE 3 : APRÈS - NOTIFICATIONS & SUITE

#### 3.1 Michael voir résultat (Realtime)
**Fichier:** `src/features/duels/hooks/useDuels.js`
**Realtime subscription on challenges:**
```javascript
.on('postgres_changes', 
  { event: 'UPDATE', schema: 'public', table: 'challenges' },
  ...
)
```

**Quand 2iaz finit:**
- UPDATE challenges (player2_time, status='completed')
- Trigger Realtime → Michael reçoit notification
- SocialPage / DuelsHook refresh challenges
- ⚠️ **QUESTION:** Michael voit-il une notification popup? Badge?

#### 3.2 Michael peut voir résultats sur SocialPage?
- Faut vérifier si useDuels affiche les challenges complétés
- Probablement faut cliquer sur la relation avec 2iaz pour voir

#### 3.3 Intégration au jeu global
- Stats comptabilisées (gamesPlayed, bestTime, etc.)
- Trophées?: challengesSent, challengesWon, etc.
- Collection: facts débloqués en cours de jeu comptent

---

## ⚠️ GAPS DÉTECTÉS

### 1. **Catégorie du défi (CRITIQUE)**
- Michael choisit une catégorie avant de défier?
- OU c'est toujours 'all' (aléatoire)?
- CODE: on voit `categoryId=pendingDuel?.categoryId` JAMAIS DÉFINI
- **PROBLÈME:** startCreateDefi(friendId) ne passe pas categoryId!

### 2. **Ticket déboîté avant le jeu**
- App.jsx débite 1 ticket AVANT que Michael joue
- Si Michael quitte sans jouer → ticket perdu
- **BOGUE:** Faut débiter APRÈS createDuelRound()

### 3. **Affichage du code post-défaite**
- Si 2iaz refuse le défi ou ne joue pas → le code reste valide 48h
- Faut afficher quelque part (notifications?) que quelqu'un a accepté

### 4. **Notifications manquantes**
- 2iaz reçoit notification quand Michael crée le défi?
- Michael reçoit notification quand 2iaz accepte?
- Michael reçoit notification quand 2iaz finit?

### 5. **Intégration SocialPage**
- useDuels retourne les duels + last challenge
- Faut afficher sur SocialPage: "Dernier défi avec 2iaz: Michael a gagné 20.15 vs 25.32"
- Faut afficher: "Défi en attente" si status='pending'

### 6. **Stats globales**
- challengesSent, challengesWon, challengesTies?
- Faut tracker ça en wtf_data + Supabase
- **MANQUE:** pas de RPC pour incrémenter ces stats

---

## 📋 CHECKLIST IMPLÉMENTATION

- [ ] **Choisir catégorie avant défi** (startCreateDefi doit prendre categoryId)
- [ ] **Débiter ticket APRÈS createDuelRound()** (pas avant)
- [ ] **Notifications Realtime** (2iaz averti dès que Michael crée, Michael averti quand 2iaz finit)
- [ ] **SocialPage affiche duels + last challenge** (useDuels hook + UI)
- [ ] **Stats globales** (challengesSent, challengesWon, etc. sync Supabase)
- [ ] **Code défi affichage pour Michael après creation** (✅ déjà fait)
- [ ] **Résultats côte à côte affichés correctement** (faut tester)
- [ ] **Expiration 48h vérifiée** (client-side + server-side?)
- [ ] **Trigger SQL pour winner_id** (faut vérifier existe)
