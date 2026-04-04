import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function ConnectBanner({ onClose }) {
  const { signInWithGoogle, isSupabaseConfigured } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleGoogle = async () => {
    setError(null)
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err.message || 'Erreur de connexion')
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: 24, padding: '28px 24px',
          maxWidth: 360, width: '100%',
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ textAlign: 'center', fontSize: 36, marginBottom: 8 }}>🔓</div>
        <h2 style={{
          fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 18,
          color: '#1a1a2e', textAlign: 'center', margin: '0 0 8px',
        }}>
          Connecte-toi pour débloquer !
        </h2>
        <p style={{
          fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 600,
          color: '#6B7280', textAlign: 'center', margin: '0 0 16px', lineHeight: 1.4,
        }}>
          Crée un compte gratuit pour accéder à tous les modes et sauvegarder ta progression.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {[
            'Tous les modes de jeu',
            'Toutes les catégories',
            'Sauvegarde ta progression',
            'Collection de f*cts WTF',
            'Coffres quotidiens',
          ].map(text => (
            <div key={text} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 12px', borderRadius: 10,
              background: '#F0FDF4',
            }}>
              <span style={{ fontSize: 14 }}>✅</span>
              <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 700, color: '#1a1a2e' }}>{text}</span>
            </div>
          ))}
        </div>

        {error && (
          <p style={{ fontSize: 12, color: '#EF4444', textAlign: 'center', marginBottom: 8 }}>{error}</p>
        )}

        <button
          onClick={handleGoogle}
          disabled={!isSupabaseConfigured || loading}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '12px 0', borderRadius: 14, border: '1.5px solid #E5E7EB',
            background: '#fff', color: '#374151', cursor: 'pointer',
            fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 14,
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            opacity: loading ? 0.6 : 1,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          {loading ? 'Connexion...' : 'Se connecter avec Google'}
        </button>

        <button
          onClick={onClose}
          style={{
            width: '100%', marginTop: 10, padding: '10px 0',
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 13,
            color: '#9CA3AF',
          }}
        >
          Plus tard
        </button>
      </div>
    </div>
  )
}
