import { usePendingInvite } from '../hooks/usePendingInvite'
import { useAuth } from '../context/AuthContext'

/**
 * InviteOverlay — Rendu au niveau AppRouter, couvre TOUTES les pages.
 * Affiche la modale de résultat d'invitation ami.
 * Si pas connecté et invitation pendante → affiche le bouton Google.
 */
export default function InviteOverlay() {
  const { inviteState, inviterName, dismiss } = usePendingInvite()
  const { signInWithGoogle } = useAuth()

  // Rien à afficher
  if (!inviteState || inviteState === 'processing') return null

  // Pas connecté → modale avec bouton Google
  if (inviteState === 'needs_auth') {
    return (
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 1001,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}
        onClick={dismiss}
      >
        <div
          style={{
            background: 'white', borderRadius: 24, padding: '32px 24px',
            maxWidth: 340, width: '100%', textAlign: 'center',
            boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
            fontFamily: 'Nunito, sans-serif',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ fontSize: 48, marginBottom: 8 }}>👋</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#1a1a2e', marginBottom: 8 }}>
            Invitation reçue !
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#6B7280', marginBottom: 20, lineHeight: 1.4 }}>
            Connecte-toi pour accepter l'invitation et ajouter ton ami.
          </div>
          <button
            onClick={signInWithGoogle}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '12px 0', borderRadius: 14, border: '1.5px solid #E5E7EB',
              background: '#fff', color: '#374151', cursor: 'pointer',
              fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 14,
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            }}
          >
            Se connecter avec Google
          </button>
          <button
            onClick={dismiss}
            style={{
              width: '100%', marginTop: 10, padding: '10px 0',
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 13, color: '#9CA3AF',
            }}
          >
            Plus tard
          </button>
        </div>
      </div>
    )
  }

  // Résultat
  const STATES = {
    done: { emoji: '🎉', title: 'Ami ajouté !', text: `Tu es maintenant ami avec ${inviterName}. Vous pouvez vous défier en Blitz !`, btn: 'Jouer !' },
    already_friends: { emoji: '🤝', title: 'Déjà amis !', text: `Tu es déjà ami avec ${inviterName}.`, btn: 'OK' },
    self: { emoji: '😅', title: 'C\'est ton propre lien !', text: 'Partage-le à un ami pour qu\'il puisse t\'ajouter.', btn: 'OK' },
    not_found: { emoji: '😕', title: 'Lien invalide', text: 'Ce lien d\'invitation n\'existe pas ou a expiré.', btn: 'OK' },
    error: { emoji: '😕', title: 'Erreur', text: 'Impossible de traiter l\'invitation. Réessaie plus tard.', btn: 'OK' },
  }

  const state = STATES[inviteState]
  if (!state) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1001,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={dismiss}
    >
      <div
        style={{
          background: 'white', borderRadius: 24, padding: '32px 24px',
          maxWidth: 340, width: '100%', textAlign: 'center',
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
          fontFamily: 'Nunito, sans-serif',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 48, marginBottom: 8 }}>{state.emoji}</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#1a1a2e', marginBottom: 8 }}>
          {state.title}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#6B7280', marginBottom: 20, lineHeight: 1.4 }}>
          {state.text}
        </div>
        <button
          onClick={dismiss}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
            background: '#FF6B1A', color: 'white', fontSize: 15, fontWeight: 800,
            fontFamily: 'Nunito, sans-serif', cursor: 'pointer',
          }}
        >
          {state.btn}
        </button>
      </div>
    </div>
  )
}
