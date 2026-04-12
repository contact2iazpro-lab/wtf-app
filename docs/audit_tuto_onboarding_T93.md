# T93 — Audit Tutoriel & Onboarding — Plan chronologique

Date : 2026-04-12
Portée : analyser l'état actuel du tuto, identifier ce qui manque, et proposer un plan de découverte chronologique pour amener un nouveau joueur à maîtriser What The F*ct!.

---

## 1. État des lieux

### Ce qui existe aujourd'hui

| Élément | Fichier | État |
|---|---|---|
| **TutoTunnel** (flow tuto scripté) | `src/components/TutoTunnel.jsx` (1219 lignes) | 🟡 Existe mais **désactivé** (voir CLAUDE.md : "Réimplémenter TutoTunnel proprement dans le flow") |
| **HowToPlayModal** (guide livret) | `src/components/HowToPlayModal.jsx` | ✅ Actif, 17 chapitres — exhaustif mais passif |
| **Spotlight system** | `src/context/UnlockContext.jsx`, `src/constants/layoutConfig.js` | 🟡 Désactivé : `activeSpotlight = null` en dur (`HomeScreen.jsx:237`) |
| **Unlock messages** (features verrouillées) | `UNLOCK_MESSAGES` dans `layoutConfig.js` | 🟡 Défini mais **toutes les features sont `can*=true`** en dur dans `HomeScreen.jsx:218-227` |
| **Onboarding coins init** | `App.jsx:86` | ✅ Nouveau joueur = 0/1/3 |
| **Seen modes tracking** | `wtf_data.seenModes` | ✅ Utilisé dans HomeScreen pour `modeIsNew()` badge |

### Ce qui est cassé / désactivé

1. **TutoTunnel n'est pas dans le flow** — jamais déclenché. Le joueur arrive directement sur HomeScreen sans guidance.
2. **Spotlights désactivés** — le système existe (`activeSpotlight`, `setActiveSpotlight`) mais hardcodé à `null`.
3. **Unlock gates désactivées** — toutes les features sont ouvertes dès la 1re seconde. Aucune progressivité.
4. **Pas de splashscreen intro / welcome** — le joueur tombe sur la Home sans contexte.
5. **Pas de déclencheurs de moments** — aucun toast "Nouveau ! Tu as débloqué X" quand un palier est atteint.

### Ce qui marche bien

- **HowToPlayModal** est exhaustif et accessible via Settings. C'est le "manuel" de référence.
- **seenModes** permet de mettre un badge "NEW" sur les modes non testés.
- Le flow actuel est **simple et immédiat** — pas de friction forcée pour le joueur qui sait déjà ce qu'il fait.

---

## 2. Ce qu'un nouveau joueur doit apprendre

Inventaire de tout ce qu'il faut expliquer/introduire progressivement :

### Concepts fondamentaux (obligatoires)

1. **QCM + timer** — lire la question, choisir, temps limité
2. **Niveau difficulté** (Cool/Hot) — Cool = 2 choix, Hot = 4 choix, impact timer + coins
3. **Indices** — stock gratuit + achat coin, 3 types (lettre, élimination, rappel)
4. **Révélation** — affichage du fact + explication + "ça fait 2 coins"
5. **Gains** — coins pour acheter, tickets pour Quest, indices pour aider
6. **Streak** — jouer chaque jour pour bonus cumulé
7. **Collection** — les f*cts débloqués sont conservés, rangés par catégorie

### Modes de jeu (ordre de découverte suggéré)

1. **Quest WTF!** (1 ticket → premier vrai mode, découverte du flow)
2. **Flash** (gratuit via énergie, rapide, récurrent) → le mode "daily driver"
3. **Hunt / WTF de la Semaine** (dimanche, événement hebdomadaire)
4. **Explorer** (après 3-5 Flash, pour approfondir une catégorie)
5. **Blitz** (après avoir débloqué 5+ f*cts, pour jouer vite)
6. **Puzzle du Jour** (challenge quotidien)
7. **Route WTF!** (progression longue, niveaux infinis)
8. **Défi entre amis** (après avoir ajouté un ami + joué 1 Blitz)

### Features annexes (débloquer progressivement)

- **Boutique** — après avoir gagné 25+ coins
- **Collection** — après avoir débloqué 1 fact
- **Trophées** — après avoir joué 3 parties
- **Amis** — après avoir complété 1 Blitz
- **Coffre quotidien** — visible dès le jour 1
- **Roulette** — visible dès le jour 1
- **Streak Freeze** — après J3 de streak
- **Profil (avatar, cadres)** — après premier login Google

---

## 3. Plan chronologique proposé

### Phase 0 — Premier lancement (0-30s)

**Moment** : dès le 1er mount, avant HomeScreen.
**Forme** : splash animé 3 écrans swipeables OU cinématique courte.

Écrans :
1. **"🤯 Bienvenue sur What The F*ct!"** — sous-titre "Des f*cts 100% vrais, tellement WTF que tu refuseras d'y croire."
2. **"Teste tes amis. Surprends-toi. Apprends sans t'en rendre compte."**
3. **"Prêt à commencer ?"** — bouton "C'est parti !" → passe à Phase 1

**Implémentation** : nouveau screen `SCREENS.WELCOME` ou simple modal plein écran. Déclenché par flag localStorage `wtf_welcomed !== 'true'`, une fois seulement.

### Phase 1 — Premier Quest guidé (30s-3min)

**Moment** : juste après l'accueil, on force une Quête WTF! de démo.
**Forme** : TutoTunnel allégé avec 3-4 interruptions spotlights.

Séquence :
1. Flèche 👆 sur "🗡️ Quête" sur HomeScreen → "Joue ta première partie gratuite !"
2. Click → lancement forcé Cool niveau (pas de CategoryScreen)
3. **1re question** : pause, spotlight sur le timer → "Tu as 20 secondes pour répondre"
4. Joueur répond (correct ou pas, on accepte tout)
5. **Révélation** : spotlight sur "+2 coins" → "Chaque bonne réponse te rapporte des coins"
6. **2e question** : spotlight sur l'icône indice → "Besoin d'aide ? Utilise un indice gratuit"
7. Réponse → Révélation → continuer
8. 3-4-5 questions en mode normal
9. **ResultsScreen** : spotlight sur le score + "Tu as gagné X coins ! Continue pour en gagner plus"

**Post-tuto** : flag `wtf_tuto_quest_done = true`. Unlock : Flash, Collection (visible mais encore grisés jusqu'à déblocage par événement).

### Phase 2 — Post-Quest (3min-5min)

**Retour Home** : toast "🎉 Ta première Quête ! Collection débloquée" → spotlight sur l'icône Collection dans BottomNav.

Éléments spotlightés dans l'ordre :
1. **Bouton Collection** (NavBar) → "Tes f*cts débloqués vivent ici"
2. **Coffre du jour** → "Ouvre-le pour des bonus gratuits !"
3. **Bouton Flash** → "Mode rapide, 5 questions, 3 énergies gratuites par jour"

Joueur libre d'explorer. Aucune obligation.

### Phase 3 — Premier Flash (5-10min, déclenché par clic)

**Moment** : première fois que le joueur clique sur Flash.
**Forme** : ModeLaunchScreen avec 1 écran explicatif (déjà existant, à enrichir).

Pas de TutoTunnel lourd — 1 écran :
- "⚡ Flash : 5 questions, catégorie aléatoire, timer 20s. Gratuit avec énergie."
- Bouton "J'y vais !"

Pendant la session, **pas** de pause — le joueur applique ce qu'il a appris en Quest. Si première erreur : petit toast "Pas de panique, les indices sont là 💡".

À la fin : **unlock Boutique** (si coins ≥ 25) avec toast "🛍️ Boutique débloquée !".

### Phase 4 — Moments de déblocage progressif

**Déclencheurs observables dans `wtf_data`** :

| Condition | Feature débloquée | Toast / Spotlight |
|---|---|---|
| `unlockedFacts.length >= 1` | Collection visible | "📚 Collection débloquée" |
| `coins >= 25` | Boutique visible (+ spotlight) | "🛍️ Tu peux acheter des f*cts !" |
| `gamesPlayed >= 2` | Trophées visibles | "🏆 Trophées débloqués" |
| `gamesPlayed >= 3` | Streak display | "🔥 Streak activée" |
| `blitzGamesPlayed >= 1` | Amis visibles | "👥 Amis débloqués — défie-les !" |
| `streak >= 3` | Streak Freeze (info) | Toast explicatif |
| `streak >= 7` | WTF Premium preview | Modal bonus |
| `unlockedCategories.size >= 5` | Blitz lobby full catégories | Spotlight sur Blitz |

**Implémentation** : réactiver `UnlockContext` avec la vraie logique, plus le hardcode `can*=true`. Ajouter un hook `useProgressionUnlocks()` qui écoute `wtf_storage_sync` et déclenche les toasts automatiquement.

### Phase 5 — Introduction des modes avancés (déclenchés par palier)

| Mode | Introduction | Quand |
|---|---|---|
| **Hunt** | Badge rouge sur le bouton dimanche + modal "C'est Dimanche ! Le WTF de la Semaine t'attend 🔥" | Chaque dimanche |
| **Puzzle du Jour** | Toast "🧩 Puzzle du Jour dispo — 1 chance par jour" | J+1 |
| **Route WTF!** | Spotlight sur le bouton Route après 5 modes essayés | `seenModes.length >= 5` |
| **Blitz** | "⚡ Tu as 5+ f*cts ! Défie le chrono en Blitz" | `unlockedFacts.length >= 5` |
| **Explorer** | "🧭 Explore une catégorie à fond" | Après 3 Flash |
| **Défi ami** | "Défie ton premier ami — clique sur son nom !" | Après ajout ami + 1 Blitz |

### Phase 6 — Maintien long terme (J2-J30+)

Une fois tous les modes découverts, focus sur la **rétention** :

- **Streak danger** (J7, J14) : modal "🔥 Ne perds pas ta série ! Joue aujourd'hui"
- **Coffres manqués** : "Tu n'as pas ouvert ton coffre du jour hier 😢"
- **Nouveaux f*cts** : "🆕 50 nouveaux f*cts ajoutés dans Espace !"
- **Défis reçus** : notif push + badge SocialPage
- **Événements spéciaux** : packs Halloween, Noël, etc.

---

## 4. Forme des éléments d'onboarding

### Composants à créer / réactiver

| Composant | Rôle | État |
|---|---|---|
| `WelcomeScreen` | 3 écrans splash initial | **à créer** |
| `TutoTunnelV2` | Flow guidé première Quest | **à réécrire** (l'ancien est trop lourd) |
| `Spotlight` | Surbrillance d'un élément UI + texte bulle | **à créer** (le système existe mais vide) |
| `UnlockToast` | Toast "Feature débloquée" avec animation | **à créer** |
| `useProgressionUnlocks` | Hook qui écoute les événements et déclenche toasts/spotlights | **à créer** |
| `HowToPlayModal` | Référence passive dans Settings | ✅ existe, à garder |

### Design des spotlights

- **Overlay sombre** (rgba(0,0,0,0.7)) sur tout l'écran
- **Trou transparent** autour de l'élément ciblé (clip-path ou radial gradient)
- **Bulle de texte** pointant vers l'élément avec message court
- **Bouton "Compris !"** ou tap pour continuer
- **Pulsation** douce sur l'élément ciblé pour attirer l'attention
- **Skip possible** : bouton "x" en haut pour tout skipper (une fois)

### Design des unlock toasts

- **Slide down** depuis le haut (comme une notification iOS)
- **Icône + message + bouton action**
- **Exemple** : `🏆 Trophées débloqués ! [Voir →]`
- **Auto-dismiss** après 4s si ignoré
- **Stack** si plusieurs arrivent en même temps

### Design du tutoriel principal (Phase 1)

- **Non-intrusif** : le joueur joue vraiment, pas une fausse démo
- **Interruptions minimales** : 3-4 spotlights max
- **Pas de questions piégeuses** : on accepte même les mauvaises réponses
- **Skippable après 1 écran** : bouton "Je connais déjà" avant de commencer

---

## 5. Flags localStorage à ajouter

Pour tracker l'état de l'onboarding :

| Flag | Description | Set quand |
|---|---|---|
| `wtf_welcomed` | Vu le splash d'accueil | Après Phase 0 |
| `wtf_tuto_quest_done` | A fini la Quest tuto | Phase 1 terminée |
| `wtf_tuto_flash_done` | A fini un Flash | Phase 3 terminée |
| `wtf_tuto_collection_seen` | A ouvert Collection | Clic sur l'icône |
| `wtf_tuto_boutique_seen` | A ouvert Boutique | Clic sur l'icône |
| `wtf_tuto_hunt_seen` | A joué 1 Hunt | Première session Hunt |
| `wtf_unlock_toasts_shown` | Set des features déjà notifiées | À chaque toast |

**Migration Phase A** : ces flags peuvent vivre dans `profiles.flags` JSONB côté Supabase, syncé via `useSupabaseResource`. Pour l'instant localStorage suffit.

---

## 6. Priorisation d'implémentation

### Sprint 1 — Fondations (1 session)

- `WelcomeScreen` (3 écrans splash) ← 30min
- `Spotlight` component réutilisable ← 1h
- `UnlockToast` component ← 30min
- Réactiver `UnlockContext` avec vraie logique (retirer les `can*=true` hardcoded) ← 30min
- Hook `useProgressionUnlocks` ← 1h

**Livrable** : nouveau joueur voit le splash + reçoit des toasts de déblocage selon ses progrès.

### Sprint 2 — Tuto guidé Phase 1 (1 session)

- `TutoTunnelV2` allégé (3-4 spotlights pendant 1 Quête)
- Wiring dans le flow (`App.jsx` : si `!wtf_tuto_quest_done` au 1er click sur Quest → forcer tuto)

**Livrable** : nouveau joueur apprend à jouer via 1 vraie Quest avec guidance minimale.

### Sprint 3 — Spotlights modes avancés (0,5 session)

- Spotlights pour Blitz, Hunt, Puzzle, Route, Défis
- Toasts "Mode X débloqué !"

### Sprint 4 — Rétention (0,5 session)

- Modals J7/J14 streak danger
- Badge dimanche pour Hunt
- Toast coffres manqués

---

## 7. Recommandations finales

1. **Prioriser Sprint 1** : sans splash ni toasts, le joueur n'a AUCUNE feedback sur ses progrès → sentiment de jeu mort.
2. **Ne pas tout guider** : un tuto trop long fait fuir. 3-4 spotlights par flow max.
3. **Toujours skippable** : bouton "je connais déjà" visible dès le 2e écran tuto.
4. **Coexistence avec le livret** : `HowToPlayModal` reste accessible pour ceux qui veulent les règles complètes.
5. **Télémétrie** : logger `wtf_tuto_*` dans `mutation_ledger` pour mesurer le drop-off entre chaque phase.
6. **A/B test possible** : TutoTunnelV2 vs no-tuto → voir si la rétention J1/J7 augmente.

---

## 8. Estimation totale

| Sprint | Contenu | Durée | Priorité |
|---|---|---|---|
| 1 | Fondations (splash, spotlight, toasts, UnlockContext) | 1 session (4h) | 🔴 Haute |
| 2 | TutoTunnelV2 Phase 1 | 1 session (3h) | 🔴 Haute |
| 3 | Spotlights modes avancés | 0,5 session (2h) | 🟡 Moyenne |
| 4 | Rétention long terme | 0,5 session (2h) | 🟡 Moyenne |

**Total** : ~3 sessions de 4h chacune pour un onboarding complet et testable.
