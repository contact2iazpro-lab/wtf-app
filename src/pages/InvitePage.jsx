import { useEffect } from 'react'
import { useParams } from 'react-router-dom'

/**
 * InvitePage — Trampoline
 *
 * 1. Stocker le code dans localStorage
 * 2. Fermer l'onglet (le lien vient de WhatsApp/SMS → nouvel onglet)
 * 3. L'onglet principal détecte le pending invite au prochain focus
 *
 * Si window.close() est bloqué par le navigateur → redirect vers /
 */
export default function InvitePage() {
  const { code } = useParams()

  useEffect(() => {
    if (code) {
      localStorage.setItem('wtf_pending_invite', code.toUpperCase())
    }

    // Tenter de fermer l'onglet (fonctionne si ouvert par un lien externe)
    window.close()

    // Fallback si le navigateur bloque window.close() :
    // attendre 500ms puis rediriger vers la home
    const fallback = setTimeout(() => {
      window.location.replace('/')
    }, 500)

    return () => clearTimeout(fallback)
  }, [code])

  return (
    <div style={{
      height: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 12,
      background: '#FAFAF8', fontFamily: 'Nunito, sans-serif',
    }}>
      <img src="/assets/ui/wtf-logo.png?v=4" alt="WTF!" style={{ width: 60, opacity: 0.5 }} />
      <p style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 600 }}>Invitation enregistrée...</p>
    </div>
  )
}
