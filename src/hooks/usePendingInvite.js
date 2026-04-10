import { useState, useEffect, useCallback } from 'react'
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
 *
 * Retourne : { inviteState, inviterName, dismiss }
 *   inviteState: null | 'needs_auth' | 'processing' | 'done' | 'already_friends' | 'self' | 'not_found' | 'error'
 *   inviterName: string
 *   dismiss: () => void — fermer la modale
 */
export function usePendingInvite() {
  const { user, isConnected, loading } = useAuth()

  const [inviteState, setInviteState] = useState(null)
  const [inviterName, setInviterName] = useState('')
  const [pendingCode, setPendingCode] = useState(null)

  // Lire le code pending au montage et quand l'auth change
  useEffect(() => {
    if (loading) return
    const code = localStorage.getItem('wtf_pending_invite')
    if (!code) return

    setPendingCode(code)

    if (!isConnected) {
      setInviteState('needs_auth')
      return
    }

    // Connecté → traiter l'invitation
    processInvite(code, user.id)
  }, [loading, isConnected, user])

  // Aussi traiter quand l'utilisateur se connecte après avoir vu needs_auth
  useEffect(() => {
    if (inviteState === 'needs_auth' && isConnected && pendingCode && user) {
      processInvite(pendingCode, user.id)
    }
  }, [isConnected, inviteState, pendingCode, user])

  async function processInvite(code, userId) {
    setInviteState('processing')

    try {
      // Lookup du code (utilise supabaseAnon, pas de lock)
      const inviter = await findPlayerByCode(code)
      if (!inviter) {
        setInviteState('not_found')
        cleanup()
        return
      }

      setInviterName(inviter.display_name || 'Un joueur')

      // Self-invite ?
      if (inviter.user_id === userId) {
        setInviteState('self')
        cleanup()
        return
      }

      // Envoyer/accepter la friend request
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
      cleanup()
    } catch (err) {
      console.error('[usePendingInvite] Error:', err)
      setInviteState('error')
      cleanup()
    }
  }

  function cleanup() {
    localStorage.removeItem('wtf_pending_invite')
  }

  const dismiss = useCallback(() => {
    setInviteState(null)
    setInviterName('')
    setPendingCode(null)
    localStorage.removeItem('wtf_pending_invite')
  }, [])

  return { inviteState, inviterName, dismiss }
}
