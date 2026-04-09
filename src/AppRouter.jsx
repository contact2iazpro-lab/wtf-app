import { Routes, Route, useLocation } from 'react-router-dom'
import App from './App'
import CollectionPage from './pages/CollectionPage'
import ProfilPage from './pages/ProfilPage'
import BoutiquePage from './pages/BoutiquePage'
import RecompensesPage from './pages/RecompensesPage'
import SocialPage from './pages/SocialPage'
import BottomNav from './components/BottomNav'
import ChallengeScreen from './screens/ChallengeScreen'
import InvitePage from './pages/InvitePage'
import { useScale } from './hooks/useScale'

// Pages that show the bottom navigation
const PAGES_WITH_NAV = ['/collection', '/profil', '/boutique', '/recompenses', '/social']

function PageWrapper({ children }) {
  const scale = useScale()
  const showNav = PAGES_WITH_NAV.includes(useLocation().pathname)
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
    <>
      <Routes>
        <Route path="/*" element={<App />} />
        <Route path="/collection" element={<PageWrapper><CollectionPage /></PageWrapper>} />
        <Route path="/profil" element={<PageWrapper><ProfilPage /></PageWrapper>} />
        <Route path="/boutique" element={<PageWrapper><BoutiquePage /></PageWrapper>} />
        <Route path="/recompenses" element={<PageWrapper><RecompensesPage /></PageWrapper>} />
        <Route path="/social" element={<PageWrapper><SocialPage /></PageWrapper>} />
        <Route path="/challenge/:code" element={<PageWrapper><ChallengeScreen /></PageWrapper>} />
        <Route path="/invite/:code" element={<PageWrapper><InvitePage /></PageWrapper>} />
      </Routes>
    </>
  )
}
