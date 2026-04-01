import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import AppRouter from './AppRouter.jsx'
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
      width: 375px;
      height: 667px;
      overflow: hidden;
      position: relative;
      box-shadow: 0 0 40px rgba(0,0,0,0.8);
      border-radius: 12px;
    }
  `
  document.head.appendChild(style)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
