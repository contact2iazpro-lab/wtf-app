import { useState } from 'react'
import WelcomeScreen from './WelcomeScreen'
import OnboardingFact from './OnboardingFact'

export default function OnboardingTunnel({ onComplete, complete }) {
  const [step, setStep] = useState('welcome') // welcome | fact

  if (step === 'welcome') {
    return (
      <WelcomeScreen
        onComplete={() => {
          complete('welcome')
          setStep('fact')
        }}
      />
    )
  }

  if (step === 'fact') {
    return (
      <OnboardingFact
        onComplete={({ factId, coinsEarned }) => {
          complete('firstFact')
          onComplete({ factId, coinsEarned })
        }}
        onSkip={() => {
          complete('welcome')
          complete('firstFact')
          onComplete({ factId: null, coinsEarned: 0 })
        }}
      />
    )
  }

  return null
}
