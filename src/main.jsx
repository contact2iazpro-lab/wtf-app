import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import AppRouter from './AppRouter.jsx'
import InvitePage from './pages/InvitePage.jsx'
import './index.css'

if (import.meta.env.DEV) {
  const style = document.createElement('style')
  style.textContent = `
    body {
      background: #111;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
    }
    #root {
      width: 375px !important;
      height: 100dvh !important;
      max-height: 100dvh !important;
      overflow: hidden !important;
      position: relative !important;
      box-shadow: 0 0 60px rgba(0,0,0,0.9) !important;
      border-radius: 0 !important;
      box-sizing: border-box !important;
    }
  `
  document.head.appendChild(style)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/invite/:code" element={<InvitePage />} />
          <Route path="/*" element={<AppRouter />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
