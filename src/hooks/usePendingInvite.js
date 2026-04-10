import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { findPlayerByCode, sendFriendRequest, acceptFriendRequest } from '../data/friendService'

/**
 * usePendingInvite — Traite les invitations stockées par le trampoline InvitePage
 *
 * L'invitation est traitée UNIQUEMENT quand :
 * 1. Il y a un code dans localStorage (wtf_pending_invite)
 * 2. L'auth est chargée (loading = false)
 * 3. L'utilisateur est connecté
 *
 * Détection : au montage + sur focus/visibilitychange (pour quand l'user
 * revient de l'onglet trampoline vers l'onglet principal)
 */
export function usePendingInvite() {
  const { user, isConnected, loading } = useAuth()

  const [inviteState, setInviteState] = useState(null)
  const [inviterName, setInviterName] = useState('')
  const processingRef = useRef(false)

  const checkAndProcess = useCallback(() => {
    if (loading || processingRef.current) return

    const code = localStorage.getItem('wtf_pending_invite')
    if (!code) return

    if (!isConnected) {
      setInviteState('needs_auth')
      return
    }

    processingRef.current = true
    localStorage.removeItem('wtf_pending_invite')
    setInviteState('processing')

    ;(async () => {
      try {
        // Lookup via supabaseAnon (pas de lock)
        const inviter = await findPlayerByCode(code)
        if (!inviter) {
          setInviteState('not_found')
          processingRef.current = false
          return
        }

        setInviterName(inviter.display_name || 'Un joueur')

        if (inviter.user_id === user.id) {
          setInviteState('self')
          processingRef.current = false
          return
        }

        // Friend request via supabase authentifié (cet onglet a la session)
        const result = await sendFriendRequest(user.id, inviter.user_id)
        if (result.alreadyExists) {
          if (result.friendship.status === 'accepted') {
            setInviteState('already_friends')
          } else {
            await acceptFriendRequest(result.friendship.id)
            setInviteState('done')
          }
        } else {
          await acceptFriendRequest(result.friendship.id)
          setInviteState('done')
        }
      } catch (err) {
        console.error('[usePendingInvite] Error:', err)
        // Remettre le code pour retry au prochain focus
        setInviteState('error')
      }
      processingRef.current = false
    })()
  }, [loading, isConnected, user])

  // Au montage et quand auth change
  useEffect(() => { checkAndProcess() }, [checkAndProcess])

  // Quand l'onglet reprend le focus (retour depuis le trampoline)
  useEffect(() => {
    const onFocus = () => checkAndProcess()
    window.addEventListener('focus', onFocus)
    const onVisible = () => { if (!document.hidden) checkAndProcess() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [checkAndProcess])

  const dismiss = useCallback(() => {
    setInviteState(null)
    setInviterName('')
    processingRef.current = false
    localStorage.removeItem('wtf_pending_invite')
  }, [])

  return { inviteState, inviterName, dismiss }
}
