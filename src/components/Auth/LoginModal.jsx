import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function LoginModal({ onClose, message }) {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, isSupabaseConfigured } = useAuth()
  const [tab, setTab] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (tab === 'login') {
        await signInWithEmail(email, password)
        onClose()
      } else {
        await signUpWithEmail(email, password)
        setSuccess(true)
      }
    } catch (err) {
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err.message || 'Erreur Google')
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-5"
      style={{ zIndex: 200, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-3xl p-6 border"
        style={{ maxWidth: 420, background: '#fff', borderColor: 'rgba(0,0,0,0.1)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">🔥</div>
          <h2 className="text-xl font-black" style={{ color: '#1a1a2e' }}>
            {tab === 'login' ? 'Connexion' : 'Créer un compte'}
          </h2>
          {message && (
            <p className="text-sm mt-1" style={{ color: '#666' }}>{message}</p>
          )}
        </div>

        {!isSupabaseConfigured && (
          <div className="rounded-2xl p-3 mb-4 text-center text-sm" style={{ background: '#FEF3C7', color: '#92400E' }}>
            ⚠️ Backend non configuré — configurez Supabase pour activer l'auth
          </div>
        )}

        {success ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">📧</div>
            <p className="font-bold" style={{ color: '#1a1a2e' }}>Vérifie ton email !</p>
            <p className="text-sm mt-1" style={{ color: '#666' }}>Un lien de confirmation t'a été envoyé.</p>
            <button
              onClick={onClose}
              className="mt-4 w-full py-3 rounded-2xl font-black text-sm"
              style={{ background: '#FF6B1A', color: 'white' }}
            >
              Fermer
            </button>
          </div>
        ) : (
          <>
            {/* Google */}
            <button
              onClick={handleGoogle}
              disabled={!isSupabaseConfigured || loading}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl font-bold text-sm mb-4 active:scale-95 transition-all"
              style={{ background: '#fff', border: '1.5px solid #E5E7EB', color: '#374151', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuer avec Google
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px" style={{ background: '#E5E7EB' }} />
              <span className="text-xs" style={{ color: '#9CA3AF' }}>ou</span>
              <div className="flex-1 h-px" style={{ background: '#E5E7EB' }} />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 p-1 rounded-2xl" style={{ background: '#F3F4F6' }}>
              {['login', 'signup'].map(t => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(null) }}
                  className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: tab === t ? '#fff' : 'transparent',
                    color: tab === t ? '#1a1a2e' : '#9CA3AF',
                    boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  {t === 'login' ? 'Connexion' : 'Inscription'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
                style={{ background: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#1a1a2e' }}
              />
              <input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
                style={{ background: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#1a1a2e' }}
              />

              {error && (
                <p className="text-xs text-center" style={{ color: '#EF4444' }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={!isSupabaseConfigured || loading}
                className="w-full py-3 rounded-2xl font-black text-sm active:scale-95 transition-all"
                style={{ background: loading ? '#F3F4F6' : '#FF6B1A', color: loading ? '#9CA3AF' : 'white' }}
              >
                {loading ? '...' : tab === 'login' ? 'Se connecter' : 'Créer mon compte'}
              </button>
            </form>

            <button
              onClick={onClose}
              className="w-full mt-3 py-2 text-sm font-medium"
              style={{ color: '#9CA3AF' }}
            >
              Annuler
            </button>
          </>
        )}
      </div>
    </div>
  )
}
