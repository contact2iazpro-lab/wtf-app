# WTF! — What The F*ct

## Projet
- App mobile de trivia basée sur un jeu physique validé
- URL prod : https://wtf-app-livid.vercel.app/
- Admin Tool : https://wtffactchecking.vercel.app/

## Stack
- React + Vite + Supabase + Tailwind + Nunito (Google Fonts)
- Deploy : Vercel auto sur push master

## Règles absolues
1. Ne JAMAIS pusher automatiquement — commit local uniquement
2. Attendre confirmation explicite avant tout git push
3. Un prompt = un fichier cible = une modification
4. Toujours travailler sur master directement

## Vocabulaire officiel
- fact/fait → f*ct | facts → f*cts
- WTF toujours avec ! (sauf "What The F*ct")
- Facile → Curieux | Normal → À fond | Expert → WTF! Addict
- Streak → Série | Mode Parcours → Quête WTF!
- Ratées → À découvrir | FAUX → PAS CETTE FOIS

## Règles de jeu actuelles
- Timer : 30 secondes (tous modes)
- Questions par Quête : 5 (TEMP TEST — remettre à 10 au lancement)
- Curieux : 4 QCM, indices, 3/2/1 coins
- À fond : 4 QCM, pas d'indices, 3 coins
- WTF! Addict : 6 QCM, pas d'indices, 5 coins

## Design system
- Police : Nunito (400/700/900)
- Couleur principale : #FF6B1A (orange WTF!)
- Fond écrans jeu : linear-gradient(160deg, {couleurCatégorie}22, {couleurCatégorie})
- CoinsIcon : src/components/CoinsIcon.jsx
- FallbackImage : composant inline dans RevelationScreen.jsx

## URLs Notion
- QG : https://www.notion.so/332b94ed8cb180298efadff6b66d54af
- Paramètres : https://www.notion.so/332b94ed8cb181869176fd6266e78915

⚠️ VERCEL LIMITS : Ne jamais pusher automatiquement. Commit local uniquement.
