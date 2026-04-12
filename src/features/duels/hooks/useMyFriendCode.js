/**
 * useMyFriendCode — Code ami de l'user courant (format 000 000 000).
 *
 * Upsert dans friend_codes si inexistant. Utilisé par SocialPage pour
 * afficher le code dans la carte d'identité et permettre le partage.
 */

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { getOrCreateFriendCode } from '../../../data/friendService'

export function useMyFriendCode() {
  const { user, isConnected } = useAuth()
  const [code, setCode] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isConnected || !user?.id) {
      setCode(null); setLoading(false); return
    }
    let cancelled = false
    ;(async () => {
      try {
        const result = await getOrCreateFriendCode(
          user.id,
          user.user_metadata?.name || user.user_metadata?.full_name || 'Joueur WTF!',
          user.user_metadata?.avatar_url
        )
        if (!cancelled && result?.code) setCode(result.code)
      } catch (e) {
        console.warn('[useMyFriendCode] error:', e?.message || e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [isConnected, user?.id])

  return { code, loading }
}
