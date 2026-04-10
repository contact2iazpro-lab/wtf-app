import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { findPlayerByCode, sendFriendRequest, acceptFriendRequest } from '../data/friendService'

/**
 * usePendingInvite — Gère les invitations amis stockées par InvitePage (trampoline)
 *
 * Détecte `wtf_pending_invite` au montage ET quand l'onglet reprend le focus
 * (l'invite est stockée par un autre onglet qui se ferme ensuite).
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
    processInvite(code, user.id)
  }, [loading, isConnected, user])

  // Check au montage et quand l'auth change
  useEffect(() => {
    checkAndProcess()
  }, [checkAndProcess])

  // Check quand l'onglet reprend le focus (l'autre onglet a pu stocker un code)
  useEffect(() => {
    const onFocus = () => checkAndProcess()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) onFocus()
    })
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [checkAndProcess])

  async function processInvite(code, userId) {
    setInviteState('processing')
    localStorage.removeItem('wtf_pending_invite')

    try {
      const inviter = await findPlayerByCode(code)
      if (!inviter) {
        setInviteState('not_found')
        processingRef.current = false
        return
      }

      setInviterName(inviter.display_name || 'Un joueur')

      if (inviter.user_id === userId) {
        setInviteState('self')
        processingRef.current = false
        return
      }

      const result = await sendFriendRequest(userId, inviter.user_id)
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
      setInviteState('error')
    }
    processingRef.current = false
  }

  const dismiss = useCallback(() => {
    setInviteState(null)
    setInviterName('')
    processingRef.current = false
    localStorage.removeItem('wtf_pending_invite')
  }, [])

  return { inviteState, inviterName, dismiss }
}
