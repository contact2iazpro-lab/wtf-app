import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function InvitePage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user, isConnected, loading: authLoading, signInWithGoogle } = useAuth()

  const [status, setStatus] = useState('loading')
  const [inviter, setInviter] = useState(null)
  const [error, setError] = useState(null)

  // Lookup inviter dès que le code est dispo et l'auth résolue
  useEffect(() => {
    if (!code) { setStatus('not_found'); return }
    if (authLoading) return
    lookupAndProcess(code.toUpperCase())
  }, [code, authLoading, isConnected])

  async function lookupAndProcess(inviteCode) {
    // 1. Lookup le code
    const { data: inviterData, error: lookupErr } = await supabase
      .from('friend_codes')
      .select('*')
      .eq('code', inviteCode)
      .maybeSingle()

    if (lookupErr || !inviterData) {
      setStatus('not_found')
      return
    }
    setInviter(inviterData)

    // 2. Pas connecté → demander login
    if (!isConnected || !user) {
      setStatus('needs_auth')
      return
    }

    // 3. Self-invite
    if (user.id === inviterData.user_id) {
      setStatus('self')
      return
    }

    // 4. Créer/vérifier la friendship
    setStatus('processing')
    try {
      const { data: existing } = await supabase
        .from('friendships')
        .select('*')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${inviterData.user_id}),and(user1_id.eq.${inviterData.user_id},user2_id.eq.${user.id})`)
        .maybeSingle()

      if (existing) {
        if (existing.status === 'accepted') {
          setStatus('already_friends')
          return
        }
        await supabase
          .from('friendships')
          .update({ status: 'accepted', accepted_at: new Date().toISOString() })
          .eq('id', existing.id)
        setStatus('done')
        return
      }

      const { error: insertErr } = await supabase
        .from('friendships')
        .insert({
          user1_id: user.id,
          user2_id: inviterData.user_id,
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })

      if (insertErr) throw insertErr
      setStatus('done')
    } catch (err) {
      console.error('[InvitePage] Error:', err)
      setError(err.message || 'Erreur')
      setStatus('error')
    }
  }

  const displayName = inviter?.display_name || 'Un joueur'
  const initial = displayName.charAt(0).toUpperCase()

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

  const Btn = ({ children, onClick, secondary }) => (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
        background: secondary ? 'transparent' : '#FF6B1A',
        color: secondary ? '#9CA3AF' : 'white',
        fontSize: secondary ? 13 : 15, fontWeight: secondary ? 700 : 800,
        fontFamily: 'Nunito, sans-serif', cursor: 'pointer',
        marginTop: secondary ? 8 : 0,
      }}
    >{children}</button>
  )

  return (
    <div style={{
      minHeight: '100dvh', background: '#FAFAF8',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: 'Nunito, sans-serif',
    }}>
      <img src="/assets/ui/wtf-logo.png?v=4" alt="WTF!" style={{ width: 80, height: 'auto', marginBottom: 24 }} />
      <div style={{
        background: 'white', borderRadius: 20, padding: '32px 28px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: 360, width: '100%',
        textAlign: 'center',
      }}>
        {(status === 'loading' || authLoading) && (
          <p style={{ color: '#94A3B8', fontSize: 14, fontWeight: 600 }}>Chargement...</p>
        )}
        {status === 'not_found' && (<>
          <p style={{ fontSize: 28, marginBottom: 8 }}>😕</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a', marginBottom: 16 }}>Ce lien d'invitation n'est pas valide</p>
          <Btn onClick={() => navigate('/')}>Aller jouer</Btn>
        </>)}
        {status === 'needs_auth' && (<>
          <Avatar />
          <p style={{ fontSize: 16, fontWeight: 800, color: '#1a1a1a', marginBottom: 4, lineHeight: 1.4 }}>{displayName}</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#64748B', marginBottom: 24, lineHeight: 1.4 }}>t'invite à jouer sur What The F*ct !</p>
          <Btn onClick={() => signInWithGoogle()}>Se connecter avec Google</Btn>
        </>)}
        {status === 'processing' && (<>
          <Avatar />
          <p style={{ color: '#94A3B8', fontSize: 14, fontWeight: 600 }}>Ajout en cours...</p>
        </>)}
        {status === 'done' && (<>
          <p style={{ fontSize: 28, marginBottom: 8 }}>🎉</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a', marginBottom: 16 }}>Tu es maintenant ami avec {displayName} !</p>
          <Btn onClick={() => navigate('/')}>Jouer maintenant</Btn>
        </>)}
        {status === 'already_friends' && (<>
          <p style={{ fontSize: 28, marginBottom: 8 }}>🤝</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a', marginBottom: 16 }}>Vous êtes déjà amis !</p>
          <Btn onClick={() => navigate('/')}>Aller jouer</Btn>
        </>)}
        {status === 'self' && (<>
          <p style={{ fontSize: 28, marginBottom: 8 }}>😅</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a', marginBottom: 16 }}>C'est ton propre lien !</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', marginBottom: 16 }}>Partage-le à un ami pour qu'il t'ajoute.</p>
          <Btn onClick={() => navigate('/')}>Retour</Btn>
        </>)}
        {status === 'error' && (<>
          <p style={{ fontSize: 28, marginBottom: 8 }}>😕</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#EF4444', marginBottom: 16 }}>{error}</p>
          <Btn onClick={() => navigate('/')}>Aller jouer</Btn>
        </>)}
      </div>
    </div>
  )
}
