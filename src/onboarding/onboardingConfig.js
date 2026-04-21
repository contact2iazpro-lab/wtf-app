// Fact pré-sélectionné pour le hook (1 seul, accrocheur et facile)
// Fallback : on pioche dans les TUTO_FACT_IDS existants si celui-ci n'est pas trouvé
export const HOOK_FACT_ID = 174

// Textes des séquences
export const TEXTS = {
  welcome: {
    title: 'What The F*ct !',
    subtitle: 'Des f*cts 100% vrais.\nDes réactions 100% fun !',
    cta: 'Découvrir !',
  },
  hookFact: {
    hintSpotlight: 'Besoin d\'aide ?',
    transitionTitle: 'Ton premier f*ct !',
    transitionSubtitle: 'Continue à jouer pour en découvrir d\'autres',
    coinsLabel: '+10 WTFCoins',
  },
  homeSpotlights: [
    {
      id: 'quick_play',
      text: 'Joue gratuitement — swipe Vrai ou Faux pour découvrir des f*cts !',
    },
    {
      id: 'coins_counter',
      text: 'Tes WTFCoins — gagne-en pour débloquer des modes et des f*cts',
    },
  ],
  toasts: {
    postVof: {
      icon: '🔓',
      message: 'Envie de débloquer des f*cts ? Joue en Quickie pour les ajouter à ta collection !',
      cta: 'Essayer Quickie',
    },
    postQuickie: {
      icon: '📚',
      message: 'Tes f*cts débloqués t\'attendent dans ta collection !',
      cta: 'Voir ma collection',
    },
  },
}

// Config QCM pour le fact hook (4 choix, généreux)
export const HOOK_FACT_CONFIG = {
  id: 'onboarding_hook',
  label: 'Découverte',
  emoji: '🤯',
  choices: 2,
  duration: 20,
  hintsAllowed: true,
  freeHints: 2,
  paidHints: 0,
  hintCost: 0,
  coinsPerCorrect: 10,
  questionsCount: 1,
}
