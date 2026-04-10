import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

/**
 * InvitePage — Trampoline
 *
 * 1. Stocke le code dans localStorage
 * 2. Tente de fermer l'onglet
 * 3. Si impossible → affiche un message "Retourne sur l'app"
 *
 * JAMAIS de redirect vers / (ça crée un 2e onglet avec lock contention)
 * L'onglet principal détecte le code au focus via usePendingInvite.
 */
export default function InvitePage() {
  const { code } = useParams()
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (code) {
      localStorage.setItem('wtf_pending_invite', code.toUpperCase())
      setSaved(true)
    }

    // Tenter de fermer l'onglet
    window.close()
  }, [code])

  return (
    <div style={{
      height: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      background: '#FAFAF8', fontFamily: 'Nunito, sans-serif', padding: 24,
      textAlign: 'center',
    }}>
      <img src="/assets/ui/wtf-logo.png?v=4" alt="WTF!" style={{ width: 60, marginBottom: 8 }} />

      {saved ? (
        <>
          <div style={{ fontSize: 40 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#1a1a2e' }}>
            Invitation enregistrée !
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#6B7280', lineHeight: 1.5 }}>
            Retourne sur l'app What The F*ct pour accepter l'invitation.
          </div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>
            Tu peux fermer cet onglet.
          </div>
        </>
      ) : (
        <div style={{ fontSize: 14, color: '#9CA3AF', fontWeight: 600 }}>Chargement...</div>
      )}
    </div>
  )
}
