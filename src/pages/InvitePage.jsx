import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

/**
 * InvitePage — Trampoline
 *
 * Le lien d'invitation ne fait qu'une chose :
 * 1. Stocker le code dans localStorage
 * 2. Rediriger vers la home (qui a déjà la session auth)
 *
 * Tout le traitement se fait dans App.jsx via usePendingInvite.
 * Zéro auth, zéro requête Supabase, zéro problème multi-onglet.
 */
export default function InvitePage() {
  const { code } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    if (code) {
      localStorage.setItem('wtf_pending_invite', code.toUpperCase())
    }
    // Redirect vers la home — replace pour ne pas garder l'invite dans l'historique
    navigate('/', { replace: true })
  }, [code, navigate])

  // Écran de transition minimal (visible <100ms)
  return (
    <div style={{
      height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#FAFAF8', fontFamily: 'Nunito, sans-serif',
    }}>
      <img src="/assets/ui/wtf-logo.png?v=4" alt="WTF!" style={{ width: 60, opacity: 0.5 }} />
    </div>
  )
}
