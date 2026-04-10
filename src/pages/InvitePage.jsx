import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { findPlayerByCode, sendFriendRequest, acceptFriendRequest } from '../data/friendService'
import { audio } from '../utils/audio'

export default function InvitePage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user, isConnected, signInWithGoogle, loading } = useAuth()

  // Disable music on this page to avoid audio context spam
  useEffect(() => {
    audio.stopMusic()
    return () => {} // Don't restart on unmount
  }, [])

  const [inviter, setInviter] = useState(null)
  // 'loading' | 'not_found' | 'not_connected' | 'processing' | 'done' | 'already_friends' | 'error'
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const processedRef = useRef(false)

  // Step 1: resolve invite code — wait for auth to settle first (RLS needs session)
  useEffect(() => {
    if (loading) return // Auth not ready yet, wait
    if (!code) { setStatus('not_found'); return }
    console.log('[InvitePage] Looking up code:', code, '(auth ready, user=', !!user, ')')
    findPlayerByCode(code)
      .then(data => {
        console.log('[InvitePage] Code lookup result:', data)
        if (!data) {
          console.log('[InvitePage] Code not found')
          setStatus('not_found')
          return
        }
        console.log('[InvitePage] Found inviter:', data)
        setInviter(data)
        if (!isConnected) setStatus('not_connected')
      })
      .catch(err => {
        console.error('[InvitePage] Code lookup error:', err)
        setStatus('not_found')
      })
  }, [code, loading])

  // Step 2: auto-accept when user is connected and inviter is found
  useEffect(() => {
    console.log('[InvitePage] Step 2 check: user=', !!user, 'inviter=', !!inviter, 'processed=', processedRef.current, 'status=', status, 'loading=', loading)
    if (loading) {
      console.log('[InvitePage] Step 2 skipped: still loading auth')
      return
    }
    if (!user || !inviter || processedRef.current) {
      console.log('[InvitePage] Step 2 skipped: user=', !!user, 'inviter=', !!inviter, 'processed=', processedRef.current)
      return
    }
    if (status === 'not_found' || status === 'done' || status === 'already_friends') {
      console.log('[InvitePage] Step 2 skipped: status=', status)
      return
    }
    processedRef.current = true

    if (user.id === inviter.user_id) {
      console.log('[InvitePage] User trying to add themselves')
      setError('Tu ne peux pas t\'ajouter toi-même !')
      setStatus('error')
      return
    }

    console.log('[InvitePage] Step 2 executing: sending friend request from', user.id, 'to', inviter.user_id)
    setStatus('processing')
    ;(async () => {
      try {
        const result = await sendFriendRequest(user.id, inviter.user_id)
        console.log('[InvitePage] sendFriendRequest result:', result)
        if (result.alreadyExists) {
          if (result.friendship.status === 'accepted') {
            console.log('[InvitePage] Already friends')
            setStatus('already_friends')
          } else {
            console.log('[InvitePage] Accepting existing pending friendship:', result.friendship.id)
            await acceptFriendRequest(result.friendship.id)
            setStatus('done')
          }
        } else {
          console.log('[InvitePage] Accepting new friendship:', result.friendship.id)
          await acceptFriendRequest(result.friendship.id)
          setStatus('done')
        }
      } catch (err) {
        console.error('[InvitePage] Error in Step 2:', err)
        setError(err.message || 'Erreur lors de l\'ajout')
        setStatus('error')
      }
    })()
  }, [user, inviter, loading])

  const initial = inviter?.display_name?.charAt(0)?.toUpperCase() || '?'
  const displayName = inviter?.display_name || 'Un joueur'

  const Avatar = () => (
    <div style={{
      width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      background: inviter?.avatar_url ? 'none' : 'linear-gradient(135deg, #FF6B1A, #FF8C42)',
    }}>
      {inviter?.avatar_url ? (
        <img src={inviter.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ color: 'white', fontSize: 28, fontWeight: 900, fontFamily: 'Nunito, sans-serif' }}>{initial}</span>
      )}
    </div>
  )

  const OrangeButton = ({ children, onClick }) => (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
        background: '#FF6B1A', color: 'white', fontSize: 15, fontWeight: 800,
        fontFamily: 'Nunito, sans-serif', cursor: 'pointer',
      }}
    >{children}</button>
  )

  return (
    <div style={{
      minHeight: '100vh', background: '#FAFAF8',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: 'Nunito, sans-serif',
    }}>
      <img src="/assets/ui/wtf-logo.png?v=4" alt="WTF!" style={{ width: 80, height: 'auto', marginBottom: 24 }} />

      <div style={{
        background: 'white', borderRadius: 20, padding: '32px 28px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: 360, width: '100%',
        textAlign: 'center',
      }}>
        {status === 'loading' && (
          <p style={{ color: '#94A3B8', fontSize: 14, fontWeight: 600 }}>Chargement...</p>
        )}

        {status === 'not_found' && (
          <>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a', marginBottom: 8 }}>
              Ce lien d'invitation n'est pas valide
            </p>
            <p style={{ fontSize: 28, marginBottom: 16 }}>😕</p>
            <OrangeButton onClick={() => navigate('/')}>Aller jouer</OrangeButton>
          </>
        )}

        {status === 'not_connected' && (
          <>
            <Avatar />
            <p style={{ fontSize: 16, fontWeight: 800, color: '#1a1a1a', marginBottom: 4, lineHeight: 1.4 }}>
              {displayName}
            </p>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#64748B', marginBottom: 24, lineHeight: 1.4 }}>
              t'invite à jouer sur What The F*ct!
            </p>
            <button
              onClick={signInWithGoogle}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
                background: '#FF6B1A', color: 'white', fontSize: 15, fontWeight: 800,
                fontFamily: 'Nunito, sans-serif', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >Se connecter avec Google</button>
          </>
        )}

        {status === 'processing' && (
          <>
            <Avatar />
            <p style={{ color: '#94A3B8', fontSize: 14, fontWeight: 600 }}>Ajout en cours...</p>
          </>
        )}

        {status === 'done' && (
          <>
            <p style={{ fontSize: 28, marginBottom: 8 }}>🎉</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a', marginBottom: 16 }}>
              Tu es maintenant ami avec {displayName} !
            </p>
            <OrangeButton onClick={() => navigate('/')}>Jouer maintenant 🚀</OrangeButton>
          </>
        )}

        {status === 'already_friends' && (
          <>
            <p style={{ fontSize: 28, marginBottom: 8 }}>🤝</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a', marginBottom: 16 }}>
              Vous êtes déjà amis !
            </p>
            <OrangeButton onClick={() => navigate('/')}>Aller jouer</OrangeButton>
          </>
        )}

        {status === 'error' && (
          <>
            <p style={{ fontSize: 28, marginBottom: 8 }}>😕</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#EF4444', marginBottom: 16 }}>{error}</p>
            <OrangeButton onClick={() => navigate('/')}>Aller jouer</OrangeButton>
          </>
        )}
      </div>
    </div>
  )
}
