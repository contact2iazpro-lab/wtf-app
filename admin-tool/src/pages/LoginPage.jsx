import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../lib/auth'

export default function LoginPage({ toast }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    setTimeout(() => {
      const ok = login(password)
      setLoading(false)
      if (ok) {
        navigate('/', { replace: true })
      } else {
        setError('Mot de passe incorrect.')
        setPassword('')
      }
    }, 300)
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🤯</div>
          <h1 className="text-2xl font-black text-white">WTF! Admin</h1>
          <p className="text-slate-400 text-sm mt-1">Facts Manager — Accès restreint</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Mot de passe
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            autoFocus
            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-DEFAULT focus:ring-1 mb-4 text-sm"
            style={{ '--tw-ring-color': '#FF6B1A' }}
          />

          {error && (
            <p className="text-red-400 text-sm mb-3 font-semibold">{error}</p>
          )}

          <button
            type="submit"
            disabled={!password || loading}
            className="w-full py-3 rounded-xl font-black text-white text-sm transition-all active:scale-95 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #FF6B1A, #D94A10)' }}
          >
            {loading ? '...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
