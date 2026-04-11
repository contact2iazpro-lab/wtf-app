import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, supabaseLight, initLightClientFromStorage } from '../lib/supabase'

/**
 * InvitePage — Page standalone HORS AuthProvider.
 *
 * Utilise supabaseLight pour le lookup (pas besoin d'auth).
 * Utilise supabase (client principal) pour l'INSERT friendship
 * afin que la session RLS soit correcte et que la SocialPage
 * puisse lire la friendship avec le même client.
 */
export default function InvitePage() {
  const { code } = useParams()
  const navigate = useNavigate()

  // 'loading' | 'not_found' | 'needs_auth' | 'processing' | 'done' | 'already_friends' | 'self' | 'error'
  const [status, setStatus] = useState('loading')
  const [inviter, setInviter] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!code) { setStatus('not_found'); return }
    processInvite(code.toUpperCase())
  }, [code])

  async function processInvite(inviteCode) {
    // 1. Lookup le code (requête publique via light client)
    const { data: inviterData, error: lookupErr } = await supabaseLight
      .from('friend_codes')
      .select('*')
      .eq('code', inviteCode)
      .maybeSingle()

    if (lookupErr || !inviterData) {
      console.warn('[InvitePage] Code lookup failed:', inviteCode, lookupErr?.message)
      setStatus('not_found')
      return
    }
    setInviter(inviterData)

    // 2. Essayer de récupérer la session principale
    let user = null

    // D'abord essayer le client principal (supabase)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        user = session.user
      }
    } catch {
      // getSession peut échouer à cause du lock multi-tab — fallback au light client
    }

    // Fallback : injecter le token dans le light client
    if (!user) {
      user = await initLightClientFromStorage()
    }

    if (!user) {
      setStatus('needs_auth')
      return
    }

    // Self-invite ?
    if (user.id === inviterData.user_id) {
      setStatus('self')
      return
    }

    // 3. Créer/vérifier la friendship
    setStatus('processing')
    try {
      // Déterminer quel client utiliser pour l'écriture
      // Préférer le client principal (session complète) si disponible
      let writeClient = supabase
      const { data: { session: mainSession } } = await supabase.auth.getSession()
      if (!mainSession) {
        // Fallback : utiliser le light client (token injecté)
        writeClient = supabaseLight
      }

      // Check si déjà amis
      const { data: existing } = await writeClient
        .from('friendships')
        .select('*')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${inviterData.user_id}),and(user1_id.eq.${inviterData.user_id},user2_id.eq.${user.id})`)
        .maybeSingle()

      if (existing) {
        if (existing.status === 'accepted') {
          setStatus('already_friends')
          return
        }
        // Accepter la demande pendante
        const { error: updateErr } = await writeClient
          .from('friendships')
          .update({ status: 'accepted', accepted_at: new Date().toISOString() })
          .eq('id', existing.id)
        if (updateErr) throw updateErr
        setStatus('done')
        return
      }

      // Créer directement en accepted
      const { error: insertErr } = await writeClient
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
      console.error('[InvitePage] Friendship error:', err)
      setError(err.message || 'Erreur lors de l\'ajout')
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
        {status === 'loading' && (
          <p style={{ color: '#94A3B8', fontSize: 14, fontWeight: 600 }}>Chargement...</p>
        )}

        {status === 'not_found' && (<>
          <p style={{ fontSize: 28, marginBottom: 8 }}>😕</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a', marginBottom: 16 }}>
            Ce lien d'invitation n'est pas valide
          </p>
          <Btn onClick={() => navigate('/')}>Aller jouer</Btn>
        </>)}

        {status === 'needs_auth' && (<>
          <Avatar />
          <p style={{ fontSize: 16, fontWeight: 800, color: '#1a1a1a', marginBottom: 4, lineHeight: 1.4 }}>
            {displayName}
          </p>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#64748B', marginBottom: 24, lineHeight: 1.4 }}>
            t'invite à jouer sur What The F*ct !
          </p>
          <Btn onClick={async () => {
            await supabaseLight.auth.signInWithOAuth({
              provider: 'google',
              options: {
                redirectTo: window.location.href.split('#')[0],
                queryParams: { prompt: 'select_account' },
              }
            })
          }}>Se connecter avec Google</Btn>
        </>)}

        {status === 'processing' && (<>
          <Avatar />
          <p style={{ color: '#94A3B8', fontSize: 14, fontWeight: 600 }}>Ajout en cours...</p>
        </>)}

        {status === 'done' && (<>
          <p style={{ fontSize: 28, marginBottom: 8 }}>🎉</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a', marginBottom: 16 }}>
            Tu es maintenant ami avec {displayName} !
          </p>
          <Btn onClick={() => navigate('/')}>Jouer maintenant</Btn>
        </>)}

        {status === 'already_friends' && (<>
          <p style={{ fontSize: 28, marginBottom: 8 }}>🤝</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a', marginBottom: 16 }}>
            Vous êtes déjà amis !
          </p>
          <Btn onClick={() => navigate('/')}>Aller jouer</Btn>
        </>)}

        {status === 'self' && (<>
          <p style={{ fontSize: 28, marginBottom: 8 }}>😅</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a', marginBottom: 16 }}>
            C'est ton propre lien !
          </p>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', marginBottom: 16 }}>
            Partage-le à un ami pour qu'il t'ajoute.
          </p>
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
