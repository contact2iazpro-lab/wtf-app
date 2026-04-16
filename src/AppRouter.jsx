import { Routes, Route, useLocation } from 'react-router-dom'
import { useMemo, useEffect } from 'react'
import App from './App'
import CollectionPage from './pages/CollectionPage'
import ProfilPage from './pages/ProfilPage'
import BoutiquePage from './pages/BoutiquePage'
import RecompensesPage from './pages/RecompensesPage'
import SocialPage from './pages/SocialPage'
import BottomNav from './components/BottomNav'
import ChallengeScreen from './screens/ChallengeScreen'
import DuelHistoryScreen from './screens/DuelHistoryScreen'
import { DuelProvider } from './features/duels/context/DuelContext'
import { useScale } from './hooks/useScale'
import { UnlockContext } from './context/UnlockContext'
import { UNLOCK_MESSAGES, UNLOCK_THRESHOLDS, SPOTLIGHT_MESSAGES } from './constants/layoutConfig'

// Pages that show the bottom navigation
const PAGES_WITH_NAV = ['/collection', '/profil', '/boutique', '/recompenses', '/social']

function UnlockProvider({ children }) {
  // T+35 : Calculer les conditions de verrouillage depuis localStorage
  const unlockValue = useMemo(() => {
    try {
      const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      const isDevOrTest = localStorage.getItem('wtf_dev_mode') === 'true' || localStorage.getItem('wtf_test_mode') === 'true'

      // Données brutes
      const gamesPlayed = wtfData.gamesPlayed || 0
      const unlockedFacts = (wtfData.unlockedFacts || []).length
      const onboardingCompleted = wtfData.onboardingCompleted || false
      const blitzPlayed = wtfData.statsByMode?.blitz?.gamesPlayed || 0
      const questsPlayed = wtfData.statsByMode?.parcours?.gamesPlayed || 0

      // Conditions unlock — navbar déverrouillée complètement dès le départ
      const canBoutique = true
      const canTrophees = true
      const canCollection = true
      const canAmis = true

      // Mode unlock conditions
      const canQuest = true
      const canBlitz = true
      const canHunt = true
      const canQuickie = true

      // UI feature display conditions (from layoutConfig UNLOCK_THRESHOLDS)
      const showStreakDisplay = gamesPlayed >= 3
      const showBadgeDisplay = gamesPlayed >= 3
      const showCoffresDisplay = questsPlayed >= 1

      // Notifications (lire depuis localStorage s'il y a un système ou Supabase)
      // Pour maintenant, on initialise à 0 — à passer depuis App.jsx plus tard si nécessaire
      const socialNotifCount = 0
      const pendingChallengesCount = 0

      return {
        // Navbar
        canBoutique,
        canTrophees,
        canCollection,
        canAmis,

        // Modes
        canQuest,
        canBlitz,
        canHunt,
        canQuickie,

        // UI features
        showStreakDisplay,
        showBadgeDisplay,
        showCoffresDisplay,

        unlockMessages: UNLOCK_MESSAGES,
        spotlightMessages: SPOTLIGHT_MESSAGES,
        unlockThresholds: UNLOCK_THRESHOLDS,
        socialNotifCount,
        pendingChallengesCount,
      }
    } catch (e) {
      console.error('[UnlockProvider] Error calculating unlock conditions:', e)
      return {
        // Navbar
        canBoutique: false,
        canTrophees: false,
        canCollection: false,
        canAmis: false,

        // Modes
        canQuest: false,
        canBlitz: false,
        canHunt: false,
        canQuickie: false,

        // UI features
        showStreakDisplay: false,
        showBadgeDisplay: false,
        showCoffresDisplay: false,

        unlockMessages: {
          boutique: 'Joue 2 parties pour débloquer la Boutique ! 🛍️',
          trophees: 'Joue 2 parties pour voir tes Trophées ! 🏆',
          collection: 'Termine une Quest pour voir ta Collection ! 📚',
          amis: 'Termine un Blitz pour débloquer les Amis ! 👥',
        },
        socialNotifCount: 0,
        pendingChallengesCount: 0,
      }
    }
  }, [])

  return (
    <UnlockContext.Provider value={unlockValue}>
      {children}
    </UnlockContext.Provider>
  )
}

function PageWrapper({ children }) {
  const scale = useScale()
  const showNav = PAGES_WITH_NAV.includes(useLocation().pathname)
  // Si l'user visite une page interne (Profil, Boutique, etc.), on considère
  // qu'il est déjà dans l'app et a passé le splash. Évite le bug où cliquer
  // "Home" depuis /profil après un login OAuth re-déclenchait FalkonIntro+Splash.
  useEffect(() => {
    try { sessionStorage.setItem('wtf_splash_done', 'true') } catch { /* ignore */ }
  }, [])
  return (
    <div className="w-full h-full max-w-md mx-auto relative overflow-hidden" style={{ '--scale': scale, height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </div>
      {showNav && <BottomNav />}
    </div>
  )
}

export default function AppRouter() {
  return (
    <UnlockProvider>
      <DuelProvider>
        <Routes>
          <Route path="/*" element={<App />} />
          <Route path="/collection" element={<PageWrapper><CollectionPage /></PageWrapper>} />
          <Route path="/profil" element={<PageWrapper><ProfilPage /></PageWrapper>} />
          <Route path="/boutique" element={<PageWrapper><BoutiquePage /></PageWrapper>} />
          <Route path="/recompenses" element={<PageWrapper><RecompensesPage /></PageWrapper>} />
          <Route path="/social" element={<PageWrapper><SocialPage /></PageWrapper>} />
          <Route path="/challenge/:code" element={<PageWrapper><ChallengeScreen /></PageWrapper>} />
          <Route path="/duels/:opponentId" element={<PageWrapper><DuelHistoryScreen /></PageWrapper>} />
        </Routes>
      </DuelProvider>
    </UnlockProvider>
  )
}
