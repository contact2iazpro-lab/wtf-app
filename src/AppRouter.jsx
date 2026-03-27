import { Routes, Route, useLocation } from 'react-router-dom'
import App from './App'
import CollectionPage from './pages/CollectionPage'
import BottomNav from './components/BottomNav'

// Pages that show the bottom navigation
const PAGES_WITH_NAV = ['/collection', '/trophees', '/classement', '/profil']

export default function AppRouter() {
  const location = useLocation()
  const showNav = PAGES_WITH_NAV.includes(location.pathname)

  return (
    <>
      <Routes>
        <Route path="/*" element={<App />} />
        <Route path="/collection" element={<CollectionPage />} />
      </Routes>
      {showNav && <BottomNav />}
    </>
  )
}
