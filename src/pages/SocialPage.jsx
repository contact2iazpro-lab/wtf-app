import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getOrCreateFriendCode, acceptFriendRequest, rejectFriendRequest, getFriends, getPendingRequests, removeFriend } from '../data/friendService'
import { audio } from '../utils/audio'
import { getPlayerChallenges } from '../data/challengeService'

const S = (px) => `calc(${px}px * var(--scale))`

export default function SocialPage() {
  const navigate = useNavigate()
  const { user, isConnected, signInWithGoogle } = useAuth()

  const [myCode, setMyCode] = useState(null)
  const [friends, setFriends] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [pendingChallenges, setPendingChallenges] = useState([])
  const [showChallengeSection, setShowChallengeSection] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2000) }

  const loadData = useCallback(async () => {
    if (!user) return
    try {
      const [codeResult, friendsList, pendingList, challengesList] = await Promise.all([
        getOrCreateFriendCode(user.id, user.user_metadata?.name || 'Joueur WTF!', user.user_metadata?.avatar_url),
        getFriends(user.id),
        getPendingRequests(user.id),
        getPlayerChallenges(user.id),
      ])
      if (codeResult?.code) setMyCode(codeResult.code)
      setFriends(friendsList || [])
      setPendingRequests(pendingList || [])
      const received = (challengesList || []).filter(c => c.status === 'pending' && c.player1_id !== user.id)
      setPendingChallenges(received)
    } catch (e) { console.warn('Social load error:', e) }
  }, [user])

  useEffect(() => { if (isConnected) loadData() }, [isConnected, loadData])

  const handleAccept = async (id) => {
    try {
      await acceptFriendRequest(id)
      showToast('✅ Ami ajouté !')
      loadData()
    } catch (e) { console.warn('Accept error:', e) }
  }

  const handleReject = async (id) => {
    try {
      await rejectFriendRequest(id)
      loadData()
    } catch (e) { console.warn('Reject error:', e) }
  }

  const handleRemove = async (id) => {
    if (!window.confirm('Supprimer cet ami ?')) return
    try {
      await removeFriend(id)
      showToast('Ami supprimé')
      loadData()
    } catch (e) { console.warn('Remove error:', e) }
  }

  const Initial = ({ name, size = 32 }) => {
    const letter = (name || '?')[0].toUpperCase()
    const colors = ['#FF6B1A', '#3B82F6', '#22C55E', '#8B5CF6', '#EF4444', '#F59E0B']
    const color = colors[letter.charCodeAt(0) % colors.length]
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ color: 'white', fontWeight: 900, fontSize: size * 0.45 }}>{letter}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: '#FAFAF8', paddingBottom: S(80), fontFamily: 'Nunito, sans-serif' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: '#22C55E', color: 'white', borderRadius: 12, padding: '10px 20px', fontWeight: 800, fontSize: 14, boxShadow: '0 4px 20px rgba(34,197,94,0.4)' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform" style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151' }}>←</button>
          <h1 className="flex-1 text-lg font-black" style={{ color: '#1a1a2e' }}>Amis</h1>
          {pendingRequests.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-black" style={{ background: 'rgba(255,107,26,0.15)', color: '#FF6B1A' }}>{pendingRequests.length}</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4">

        {/* Non connecté */}
        {!isConnected ? (
          <div className="rounded-2xl p-6 text-center" style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <span className="text-3xl block mb-3">👥</span>
            <p style={{ fontSize: S(14), fontWeight: 700, color: '#1a1a2e', margin: '0 0 12px' }}>Connecte-toi pour ajouter des amis et relever des défis</p>
            <button onClick={signInWithGoogle} className="active:scale-95 transition-all" style={{ padding: '12px 28px', borderRadius: 14, background: '#FF6B1A', color: 'white', border: 'none', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
              Se connecter avec Google
            </button>
          </div>
        ) : (
          <>
            {/* A) 📩 Inviter un ami */}
            <div className="rounded-2xl mb-3" style={{ background: 'white', padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: S(14), fontWeight: 900, color: '#1a1a2e', margin: '0 0 10px' }}>📩 Inviter un ami</h2>
              <button
                onClick={() => {
                  if (!myCode) {
                    showToast('⏳ Chargement en cours, réessaie dans quelques secondes...')
                    return
                  }
                  audio.play('click')
                  const inviteUrl = `https://wtf-app-production.up.railway.app/invite/${myCode}`
                  if (navigator.share) {
                    navigator.share({ title: 'What The F*ct!', text: 'Rejoins-moi sur What The F*ct! 🤯 Des faits 100% vrais, des réactions 100% fun !', url: inviteUrl }).catch(() => {})
                  } else {
                    navigator.clipboard?.writeText(inviteUrl)
                    showToast('Lien copié ! 📋')
                  }
                }}
                className="active:scale-95 transition-all"
                style={{ width: '100%', padding: '14px 0', borderRadius: 12, background: '#FF6B1A', color: 'white', border: 'none', fontWeight: 900, fontSize: 14, cursor: 'pointer', opacity: myCode ? 1 : 0.5 }}
              >
                📩 Inviter un ami
              </button>
              <p style={{ fontSize: S(10), color: '#9CA3AF', margin: '8px 0 0', textAlign: 'center' }}>Envoie ton lien par WhatsApp, SMS ou autre</p>
            </div>

            {/* B) 👥 Mes amis */}
            <div className="rounded-2xl mb-3" style={{ background: 'white', padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: S(14), fontWeight: 900, color: '#1a1a2e', margin: '0 0 10px' }}>👥 Mes amis ({friends.length})</h2>
              {friends.length === 0 ? (
                <p style={{ fontSize: S(12), color: '#9CA3AF', textAlign: 'center', padding: '12px 0' }}>Pas encore d'amis. Invite quelqu'un ! 🤝</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {friends.map(friend => (
                    <div key={friend.friendshipId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'rgba(0,0,0,0.03)' }}>
                      <Initial name={friend.displayName} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#1a1a2e', display: 'block' }}>{friend.displayName}</span>
                      </div>
                      <button
                        onClick={() => {
                          audio.play('click')
                          localStorage.setItem('wtf_pending_action', 'blitz')
                          navigate('/')
                        }}
                        className="active:scale-90"
                        style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,107,26,0.1)', border: '1px solid rgba(255,107,26,0.3)', color: '#FF6B1A', fontWeight: 800, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >⚡ Défier</button>
                      <button onClick={() => handleRemove(friend.friendshipId)} className="active:scale-90" style={{ padding: '4px 8px', borderRadius: 6, background: 'transparent', border: 'none', color: '#D1D5DB', fontSize: 14, cursor: 'pointer' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* C) 🎯 Défier (accordéon) */}
            <div className="rounded-2xl mb-3" style={{ background: 'white', padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <button
                onClick={() => setShowChallengeSection(!showChallengeSection)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <h2 style={{ fontSize: S(14), fontWeight: 900, color: '#1a1a2e', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  🎯 Défier
                  {pendingChallenges.length > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 900, background: 'rgba(255,107,26,0.15)', color: '#FF6B1A', padding: '2px 8px', borderRadius: 10 }}>{pendingChallenges.length}</span>
                  )}
                </h2>
                <span style={{ fontSize: 18, color: '#9CA3AF', transition: 'transform 0.2s', transform: showChallengeSection ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
              </button>

              {showChallengeSection && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    onClick={() => {
                      audio.play('click')
                      localStorage.setItem('wtf_pending_action', 'blitz')
                      navigate('/')
                    }}
                    className="active:scale-95 transition-all"
                    style={{ width: '100%', padding: '12px 0', borderRadius: 12, background: '#FF6B1A', color: 'white', border: 'none', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}
                  >
                    ⚡ Défier un ami
                  </button>

                  <button
                    onClick={() => {
                      audio.play('click')
                      localStorage.setItem('wtf_pending_action', 'blitz')
                      navigate('/')
                    }}
                    className="active:scale-95 transition-all"
                    style={{ width: '100%', padding: '12px 0', borderRadius: 12, background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
                  >
                    🔗 Défier quelqu'un (même sans être ami)
                  </button>
                  <p style={{ fontSize: S(10), color: '#9CA3AF', margin: 0, textAlign: 'center' }}>Lance un Blitz, puis partage le lien du défi</p>

                  {pendingChallenges.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <p style={{ fontSize: S(12), fontWeight: 800, color: '#1a1a2e', margin: '0 0 8px' }}>Défis à relever :</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {pendingChallenges.map(challenge => (
                          <button
                            key={challenge.id}
                            onClick={() => { audio.play('click'); navigate(`/challenge/${challenge.code}`) }}
                            className="active:scale-95 transition-all"
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,107,26,0.06)', border: '1px solid rgba(255,107,26,0.2)', width: '100%', cursor: 'pointer', textAlign: 'left' }}
                          >
                            <Initial name={challenge.player1_name} size={36} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: 13, fontWeight: 800, color: '#1a1a2e', display: 'block' }}>{challenge.player1_name}</span>
                              <span style={{ fontSize: 11, color: '#6B7280' }}>{challenge.category_label} · {challenge.question_count} questions</span>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <span style={{ fontSize: 16, fontWeight: 900, color: '#FF6B1A', display: 'block' }}>
                                {challenge.player1_time < 60 ? challenge.player1_time.toFixed(1) + 's' : Math.floor(challenge.player1_time / 60) + ':' + (challenge.player1_time % 60).toFixed(0).padStart(2, '0')}
                              </span>
                              <span style={{ fontSize: 9, color: '#9CA3AF' }}>à battre</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* D) Demandes reçues */}
            {pendingRequests.length > 0 && (
              <div className="rounded-2xl mb-3" style={{ background: 'white', padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <h2 style={{ fontSize: S(14), fontWeight: 900, color: '#1a1a2e', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  📩 Demandes reçues
                  <span style={{ fontSize: 11, fontWeight: 900, background: 'rgba(255,107,26,0.15)', color: '#FF6B1A', padding: '2px 8px', borderRadius: 10 }}>{pendingRequests.length}</span>
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pendingRequests.map(req => (
                    <div key={req.friendshipId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'rgba(0,0,0,0.03)' }}>
                      <Initial name={req.displayName} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#1a1a2e', display: 'block' }}>{req.displayName}</span>
                      </div>
                      <button onClick={() => handleAccept(req.friendshipId)} className="active:scale-90" style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22C55E', fontWeight: 800, fontSize: 11, cursor: 'pointer' }}>✅</button>
                      <button onClick={() => handleReject(req.friendshipId)} className="active:scale-90" style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontWeight: 800, fontSize: 11, cursor: 'pointer' }}>❌</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
