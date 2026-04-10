import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { findPlayerByCode, sendFriendRequest, acceptFriendRequest } from '../data/friendService'

/**
 * usePendingInvite — Gère les invitations amis stockées par InvitePage (trampoline)
 *
 * Flow :
 * 1. Détecte `wtf_pending_invite` dans localStorage
 * 2. Si connecté → lookup code, send/accept friend request, affiche résultat
 * 3. Si pas connecté → signale qu'il faut se connecter (needsAuth)
 * 4. Après traitement → nettoie localStorage
 */
export function usePendingInvite() {
  const { user, isConnected, loading } = useAuth()

  const [inviteState, setInviteState] = useState(null)
  const [inviterName, setInviterName] = useState('')
  const processingRef = useRef(false)

  useEffect(() => {
    if (loading) return

    const code = localStorage.getItem('wtf_pending_invite')
    if (!code) return

    // Pas connecté → demander auth
    if (!isConnected) {
      setInviteState('needs_auth')
      return
    }

    // Déjà en cours de traitement → skip
    if (processingRef.current) return
    processingRef.current = true

    // Connecté → traiter l'invitation
    processInvite(code, user.id)
  }, [loading, isConnected, user])

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
