import { useNavigate } from 'react-router-dom'

export default function ProfilPage() {
  const navigate = useNavigate()
  return (
    <div style={{
      height: '100dvh', width: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20,
      background: 'linear-gradient(160deg, #FF6B1A 0%, #FF8C42 100%)',
      fontFamily: 'Nunito, sans-serif', padding: 24, boxSizing: 'border-box',
    }}>
      <span style={{ fontSize: 48 }}>👤</span>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: 'white', margin: 0, textAlign: 'center' }}>
        Page Profil
      </h1>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: 0 }}>En construction</p>
      <button
        onClick={() => navigate('/')}
        style={{
          marginTop: 12, padding: '12px 32px', borderRadius: 16,
          background: 'white', color: '#FF6B1A', fontWeight: 900, fontSize: 14,
          border: 'none', cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
        }}
      >
        ← Retour accueil
      </button>
    </div>
  )
}
