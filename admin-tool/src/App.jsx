import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useToast } from './hooks/useToast'
import ToastContainer from './components/Toast'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import FactsListPage from './pages/FactsListPage'
import FactEditorPage from './pages/FactEditorPage'
import ArchivedFactsPage from './pages/ArchivedFactsPage'

export default function App() {
  const { toasts, toast, dismiss } = useToast()

  return (
    <BrowserRouter>
      <ToastContainer toasts={toasts} dismiss={dismiss} />
      <Routes>
        <Route path="/login" element={<LoginPage toast={toast} />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout toast={toast} />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage toast={toast} />} />
          <Route path="facts" element={<FactsListPage toast={toast} />} />
          <Route path="facts/:id" element={<FactEditorPage toast={toast} />} />
          <Route path="archived" element={<ArchivedFactsPage toast={toast} />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
