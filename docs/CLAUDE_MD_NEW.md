# WTF! What The F*ct — CLAUDE.md
# Ce fichier est lu automatiquement par Claude Code à chaque session.
# Dernière MAJ : 15/04/2026 — Refonte complète modes + économie F2P

## RÈGLES ABSOLUES
- Branche : TOUJOURS master, jamais de worktrees ni de branches
- Push : JAMAIS automatique — Michael push manuellement
- Un prompt = un fichier cible = une modification
- Périmètre STRICT — ne toucher aucun autre fichier sauf demandé
- Tester en local avant de pusher (npm run dev → localhost)

## STACK
- React + Vite + Supabase + Tailwind + Nunito (+ Fredoka One labels)
- Deploy : Railway auto sur push master → https://wtf-app-production.up.railway.app/
- Auth : Supabase anonyme + Google OAuth
- Images : WebP sur Supabase Storage CDN

## ⚠️ MAPPING DE RENOMMAGE (15/04/2026) — À RESPECTER PARTOUT
> Tout l'ancien vocabulaire doit être remplacé dans le code, les commentaires, les variables, les noms de fichiers.

| Ancien nom (code actuel) | Nouveau nom officiel | Notes |
|---|---|---|
| Flash + Explorer (fusionnés "Jouer") | **Snack** | Mode QCM 2 choix, farming quotidien |
| Route WTF! | **Quest** | Progression linéaire, boss VIP /10 niveaux |
| Blitz (chrono 60s) | **Blitz Solo** | Sous-mode de Blitz |
| Défi Blitz (async amis) | **Blitz Défi** | Sous-mode de Blitz |
| Hunt + Puzzle du Jour | **Flash** | Événement quotidien + Hunt dimanche |
| *(nouveau)* | **Vrai ou Fou** | Swipe Vrai/Faux, 20 affirmations |
| *(nouveau)* | **Marathon** | Survie jusqu'à erreur, 4 QCM, pas de timer |
| Quest (ancien avec tickets + Cool/Hot) | **SUPPRIMÉ** | Remplacé par Quest (Route) |
| Mode Série | **SUPPRIMÉ** | Absorbé dans le streak |
| Multi | **SUPPRIMÉ** | Non prévu V1 |
| Cool / Hot / WTF! (niveaux difficulté) | **SUPPRIMÉ** | Difficulté = nombre de QCM par mode |
| Tickets (devise) | **SUPPRIMÉ** | Remplacé par coût coins direct |

## LES 6 MODES DE JEU

### 1. SNACK — "Le quotidien sans prise de tête"
- QCM **2 choix**, 5 questions, timer **15s**
- Indices : 1 max (stock perso, coût 50 coins en boutique)
- Contenu : Funny facts
- Coût : 1 énergie (cap 5, régén +1/8h, extra = 75 coins)
- Gains : 10 coins/bonne (aléa et catég) · Perfect +50 coins
- Déblocage f*cts : Oui (Funny)
- Catégories : 5 gratuites + débloquables à 1 500 coins

### 2. VRAI OU FOU — "Swipe si t'oses"
- **Swipe cards Vrai/Faux** (PAS de QCM), 20 affirmations
- Timer : Aucun · Indices : Aucun
- Contenu : Funny facts (champ `statement` + `statement_is_true`)
- Coût : Gratuit illimité
- Gains : **0 coins** (mode viralité, pas farming)
- Déblocage f*cts : Oui (Funny)

### 3. QUEST — "Le chemin des WTF!"
- QCM **4 choix**, blocs de 10 (9 Funny + 1 boss VIP)
- Timer : **20s** · Indices : 2 (stock perso)
- Contenu : Funny (niveaux) + VIP (boss /10)
- Coût : 1 énergie par bloc
- Gains : 20 coins/bonne niveau · 100 coins/boss VIP
- Déblocage f*cts : Oui (Funny + VIP boss)
- Anti-déduction : fausses réponses tirées parmi 7, indices tirés 2/4 à chaque tentative
- UX : Map de progression (Niveau X/850), boss = mise en scène spéciale

### 4. MARATHON — "Zéro droit à l'erreur"
- QCM **4 choix**, illimité jusqu'à 1ère erreur
- Timer : **Aucun** · Indices : **Aucun**
- Contenu : Funny + VIP débloqués (mélangés)
- Coût : Gratuit illimité
- Gains : **0 coins** (prestige/record)
- UX : Compteur série en gros, fond change de couleur, game over dramatique

### 5. BLITZ — "Défie tes potes" (2 sous-modes)
#### 5a. Blitz Solo
- QCM **2 choix**, chrono global **60s** descendant
- Indices : Aucun · Contenu : Funny + VIP débloqués
- Gains : 0 coins · Paliers : 5/10/20/30/50/100

#### 5b. Blitz Défi
- QCM **2 choix**, même set 5-10 questions, chrono montant (+5s/erreur)
- Contenu : Funny (catégorie choisie par créateur)
- Coût : **200 coins** pour créer · Gratuit pour relever · 48h expiration
- Gains : 0 coins · Partage résultat WhatsApp

### 6. FLASH — "Le rendez-vous quotidien"
- QCM **2 choix**, 5 questions, timer **15s**
- Lun-Sam : Funny thème du jour, 0 indices, 30 coins fixe
- Dimanche : VIP Hunt de la semaine, 2 indices, 1 VIP débloqué
- Coût : Gratuit 1×/jour
- UX : Bannière thème du jour, dimanche = mise en scène Hunt

## ROULETTE WTF!
- 1 spin gratuit/jour + spins payants 100 coins
- 8 segments : 25c (30%) / 50c (25%) / 1 indice (15%) / 100c (12%) / 150c (8%) / 2 indices (5%) / 300c (3%) / 500c (2%)
- Valeur espérée ~76 coins = sink net ~24 coins/spin

## ÉCONOMIE F2P (×10)
> Toutes les valeurs coins sont ×10 vs l'ancien système.

### Devises
- **Coins** : monnaie soft (farming + achats en jeu)
- **Gems** : monnaie premium (achat IAP en € uniquement)
- PAS de tickets, PAS de troisième devise

### Devises départ nouveau joueur
**500 coins / 3 indices / 5 énergies**

### Coûts
| Item | Coût |
|---|---|
| Énergie extra | 75 coins |
| Indice (boutique) | 50 coins |
| Débloquer catégorie | 1 500 coins |
| Cosmétique profil | 500 coins (moyen) |
| Ticket Blitz Défi | 200 coins |
| Spin roulette | 100 coins |

### Équilibre cible
- Gains/jour : 250-400 coins
- Sinks/jour : ~125 coins
- Surplus net : 80-250 coins/jour
- TTF : 5-10 jours

## CONTENU
- **VIP facts** (~483) : Quest boss /10 + Flash dimanche + Marathon/Blitz (débloqués)
- **Funny facts** (~770+) : Snack, Vrai ou Fou, Quest niveaux, Flash lun-sam
- Nouveau champ requis : `statement` (text) + `statement_is_true` (boolean)
- Quest = ~850 niveaux (770 Funny ÷ 9 par bloc × 10)

## ARCHITECTURE CONTENU
- `is_vip=true` → VIP facts
- `is_vip=false` → Funny facts
- 4 indices (hint1-4), 7 fausses réponses (funny_wrong_1/2, close_wrong_1/2, plausible_wrong_1/2/3)
- Champ `teaser` pour les teasers

## DESIGN SYSTEM
- Police : Nunito (400/700/900) + Fredoka One (labels/tagline)
- Couleur principale : #FF6B1A (orange WTF!)
- Fond écrans jeu : linear-gradient(160deg, {catColor}22, {catColor})
- Scaling responsive : useScale hook — base iPhone SE 375×667px
- Formule : Math.min(window.innerHeight/667, window.innerWidth/375)

## FICHIERS CLÉS
- `src/App.jsx` — machine à états centrale
- `src/services/currencyService.js` — SEUL point d'écriture devises
- `src/utils/storageHelper.js` — centralise lectures localStorage
- `src/services/playerSyncService.js` — sync Supabase push/pull
- `src/constants/gameConfig.js` — config modes de jeu
- `src/data/factsService.js` — chargement facts Supabase
- `src/utils/answers.js` — tirage réponses QCM

## VOCABULAIRE
- fact/fait → f*ct | facts → f*cts
- WTF toujours avec ! (sauf "What The F*ct")
- Niveaux Cool/Hot/WTF! → SUPPRIMÉS
- Les 6 modes : Snack, Vrai ou Fou, Quest, Marathon, Blitz, Flash
