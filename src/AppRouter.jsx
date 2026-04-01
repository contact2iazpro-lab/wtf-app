import { Routes, Route, useLocation } from 'react-router-dom'
import App from './App'
import CollectionPage from './pages/CollectionPage'
import ProfilPage from './pages/ProfilPage'
import BoutiquePage from './pages/BoutiquePage'
import RecompensesPage from './pages/RecompensesPage'
import SocialPage from './pages/SocialPage'
import BottomNav from './components/BottomNav'

// Pages that show the bottom navigation
const PAGES_WITH_NAV = ['/collection', '/profil', '/boutique', '/recompenses', '/social']

export default function AppRouter() {
  const location = useLocation()
  const showNav = PAGES_WITH_NAV.includes(location.pathname)

  return (
    <>
      <Routes>
        <Route path="/*" element={<App />} />
        <Route path="/collection" element={<CollectionPage />} />
        <Route path="/profil" element={<ProfilPage />} />
        <Route path="/boutique" element={<BoutiquePage />} />
        <Route path="/recompenses" element={<RecompensesPage />} />
        <Route path="/social" element={<SocialPage />} />
      </Routes>
      {showNav && <BottomNav />}
    </>
  )
}
