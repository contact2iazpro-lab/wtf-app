import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import GameModal from '../components/GameModal'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getOrCreateFriendCode, acceptFriendRequest, rejectFriendRequest, getFriends, getPendingRequests, removeFriend } from '../data/friendService'
import { audio } from '../utils/audio'
import { getPlayerChallenges } from '../data/challengeService'
import { getCategoryById } from '../data/factsService'

const S = (px) => `calc(${px}px * var(--scale))`

const formatBlitzTime = (seconds) => {
  if (seconds < 60) return seconds.toFixed(1) + 's'
  const min = Math.floor(seconds / 60)
  const sec = (seconds % 60).toFixed(0)
  return min + ':' + sec.toString().padStart(2, '0')
}

function Initial({ name, size = 32 }) {
  const letter = (name || '?')[0].toUpperCase()
  const colors = ['#FF6B1A', '#3B82F6', '#22C55E', '#8B5CF6', '#EF4444', '#F59E0B']
  const color = colors[letter.charCodeAt(0) % colors.length]
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ color: 'white', fontWeight: 900, fontSize: size * 0.45 }}>{letter}</span>
    </div>
  )
}

function getProcessedBlitzRecords() {
  try {
    const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    const blitzRecords = wtfData.blitzRecords || {}
    const bestBlitzTime = wtfData.bestBlitzTime || null

    if (Object.keys(blitzRecords).length === 0) return { records: [], bestTime: null }

    const recordsArray = Object.entries(blitzRecords).map(([key, time]) => {
      const [catKey, palier] = key.split('_')
      const categoryData = catKey === 'all'
        ? { id: 'all', label: 'Toutes catégories', emoji: '🌍' }
        : (getCategoryById(catKey) || { id: catKey, label: catKey, emoji: '📚' })

      return {
        key,
        categoryLabel: categoryData.label,
        categoryEmoji: categoryData.emoji,
        palier: parseInt(palier) || 0,
        time,
        isBestTime: bestBlitzTime && Math.abs(time - bestBlitzTime) < 0.01,
      }
    })

    recordsArray.sort((a, b) => a.time - b.time)
    return { records: recordsArray, bestTime: bestBlitzTime }
  } catch {
    return { records: [], bestTime: null }
  }
}

export default function SocialPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isConnected, signInWithGoogle } = useAuth()

  const [myCode, setMyCode] = useState(() => {
    try { return localStorage.getItem('wtf_my_friend_code') || null } catch { return null }
  })
  // Cache friends dans localStorage pour éviter le flash "Pas encore d'amis"
  // à chaque remount de SocialPage (navigation interne).
  const [friends, setFriends] = useState(() => {
    try {
      const cached = localStorage.getItem('wtf_cached_friends')
      if (cached) return JSON.parse(cached) || []
    } catch { /* ignore */ }
    return []
  })
  const [pendingRequests, setPendingRequests] = useState([])
  const [pendingChallenges, setPendingChallenges] = useState([])
  const [hasSentPending, setHasSentPending] = useState(false)
  const [showChallengeSection, setShowChallengeSection] = useState(false)
  const [showBlitzRecordsSection, setShowBlitzRecordsSection] = useState(false)
  const [toast, setToast] = useState(null)
  const [confirmRemove, setConfirmRemove] = useState(null)
  const [socialLoading, setSocialLoading] = useState(false)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2000) }

  // Déduplique les appels simultanés de loadData (Realtime + useEffect peuvent les lancer en parallèle)
  const loadingRef = useRef(false)

  const loadData = useCallback(async () => {
    if (!user) return
    if (loadingRef.current) {
      console.log('[SocialPage] loadData skipped (already in progress)')
      return
    }
    loadingRef.current = true
    setSocialLoading(true)
    try {
      console.log('[SocialPage] loadData start — user.id =', user.id)
      // Appels séparés pour voir lequel échoue (au lieu d'un Promise.all qui
      // fait tout crasher si un seul fail)
      let codeResult = null
      try {
        codeResult = await getOrCreateFriendCode(
          user.id,
          user.user_metadata?.name || 'Joueur WTF!',
          user.user_metadata?.avatar_url
        )
        console.log('[SocialPage] getOrCreateFriendCode →', codeResult)
      } catch (e) {
        console.error('[SocialPage] getOrCreateFriendCode FAILED:', e)
      }
      let friendsList = []
      try {
        friendsList = await getFriends(user.id)
        console.log('[SocialPage] getFriends →', friendsList?.length, 'friends')
      } catch (e) {
        console.error('[SocialPage] getFriends FAILED:', e)
      }
      let pendingList = []
      try {
        pendingList = await getPendingRequests(user.id)
        console.log('[SocialPage] getPendingRequests →', pendingList?.length, 'pending')
      } catch (e) {
        console.error('[SocialPage] getPendingRequests FAILED:', e)
      }
      let challengesList = []
      try {
        challengesList = await getPlayerChallenges(user.id)
        console.log('[SocialPage] getPlayerChallenges →', challengesList?.length, 'challenges')
      } catch (e) {
        console.error('[SocialPage] getPlayerChallenges FAILED:', e)
      }

      if (codeResult?.code) {
        setMyCode(codeResult.code)
        try { localStorage.setItem('wtf_my_friend_code', codeResult.code) } catch {}
      }
      setFriends(friendsList || [])
      // Persiste la liste pour le prochain mount (évite flash "Pas encore d'amis")
      try {
        localStorage.setItem('wtf_cached_friends', JSON.stringify(friendsList || []))
      } catch { /* ignore */ }
      try {
        const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')
        wtfData.friendCount = (friendsList || []).length
        wtfData.lastModified = Date.now()
        localStorage.setItem('wtf_data', JSON.stringify(wtfData))
      } catch { /* ignore */ }
      setPendingRequests(pendingList || [])
      const received = (challengesList || []).filter(c => c.status === 'pending' && c.player1_id !== user.id)
      setPendingChallenges(received)
      const sent = (challengesList || []).filter(c => c.status === 'pending' && c.player1_id === user.id)
      setHasSentPending(sent.length > 0)
    } catch (e) {
      console.error('[SocialPage] loadData UNEXPECTED error:', e)
    }
    finally {
      setSocialLoading(false)
      loadingRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Refresh à chaque navigation vers cette page (pas seulement au mount).
  // Dep sur user?.id (stable) au lieu de loadData (référence qui changeait à chaque
  // re-fetch de user dans AuthContext et cascadait en multiples appels).
  useEffect(() => {
    if (isConnected && user?.id) loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, user?.id, location.key])

  // Supabase Realtime pour les invitations et défis
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel('social-updates-' + user.id)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friendships',
        filter: 'user2_id=eq.' + user.id,
      }, () => loadData())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'challenges',
        filter: 'player2_id=eq.' + user.id,
      }, () => loadData())
      .subscribe()

    return () => supabase.removeChannel(channel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const handleAccept = async (id) => {
    try {
      await acceptFriendRequest(id)
      showToast('Ami ajouté !')
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
    setConfirmRemove(id)
  }

  const confirmRemoveFriend = async () => {
    if (!confirmRemove) return
    try {
      await removeFriend(confirmRemove)
      showToast('Ami supprimé')
      loadData()
    } catch (e) { console.warn('Remove error:', e) }
    setConfirmRemove(null)
  }

  const handleChallenge = () => {
    audio.play('click')
    localStorage.setItem('wtf_pending_action', 'challenge')
    navigate('/')
  }

  const { records: blitzRecords } = getProcessedBlitzRecords()

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: '#FAFAF8', paddingBottom: S(80), fontFamily: 'Nunito, sans-serif' }}>
      {/* Toast */}
      {confirmRemove && (
        <GameModal
          emoji="👋"
          title="Supprimer cet ami ?"
          message="Tu pourras toujours le re-ajouter plus tard."
          confirmLabel="Supprimer"
          cancelLabel="Annuler"
          danger
          onConfirm={confirmRemoveFriend}
          onCancel={() => setConfirmRemove(null)}
        />
      )}
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

      {/* Carte identité joueur (visible uniquement si connecté) */}
      {isConnected && (
        <div className="px-4 pb-2 shrink-0">
          <div className="rounded-2xl flex items-center gap-3" style={{
            background: 'linear-gradient(135deg, rgba(255,107,26,0.08), rgba(255,215,0,0.08))',
            border: '1.5px solid rgba(255,107,26,0.25)',
            padding: 12,
          }}>
            {/* Avatar */}
            {(() => {
              const avatarUrl = user?.user_metadata?.avatar_url
                || user?.user_metadata?.picture
                || user?.identities?.[0]?.identity_data?.avatar_url
                || user?.identities?.[0]?.identity_data?.picture
              if (avatarUrl) {
                return (
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: '2px solid #FF6B1A', flexShrink: 0 }}
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                )
              }
              return <Initial name={user?.user_metadata?.name || '?'} size={42} />
            })()}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#1a1a2e', lineHeight: 1.2 }}>
                {user?.user_metadata?.name || user?.user_metadata?.full_name || 'Joueur WTF!'}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', marginTop: 2 }}>
                Code ami :
                <span style={{
                  fontFamily: 'monospace', fontSize: 12, fontWeight: 900, color: '#FF6B1A',
                  marginLeft: 4, letterSpacing: '0.05em',
                }}>
                  {myCode || '...'}
                </span>
              </div>
            </div>
            {myCode && (
              <button
                onClick={() => {
                  audio.play('click')
                  navigator.clipboard?.writeText(myCode).catch(() => {})
                  showToast('Code copié !')
                }}
                style={{
                  padding: '6px 10px', borderRadius: 8,
                  background: 'rgba(255,107,26,0.12)', border: '1px solid rgba(255,107,26,0.3)',
                  color: '#FF6B1A', fontWeight: 900, fontSize: 10, cursor: 'pointer',
                  fontFamily: 'Nunito, sans-serif', flexShrink: 0,
                }}
              >
                Copier
              </button>
            )}
          </div>
        </div>
      )}

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
            {/* A) Inviter un ami */}
            <div className="rounded-2xl mb-3" style={{ background: 'white', padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: S(14), fontWeight: 900, color: '#1a1a2e', margin: '0 0 10px' }}>Inviter un ami</h2>
              <button
                onClick={() => {
                  if (!myCode) {
                    showToast('Chargement en cours, réessaie...')
                    return
                  }
                  audio.play('click')
                  const inviteUrl = `${window.location.origin}/invite/${myCode}`
                  if (navigator.share) {
                    navigator.share({ title: 'What The F*ct!', text: 'Rejoins-moi sur What The F*ct ! Des faits 100% vrais, des réactions 100% fun !', url: inviteUrl }).catch(() => {})
                  } else {
                    navigator.clipboard?.writeText(inviteUrl)
                    showToast('Lien copié !')
                  }
                }}
                className="active:scale-95 transition-all"
                style={{ width: '100%', padding: '14px 0', borderRadius: 12, background: '#FF6B1A', color: 'white', border: 'none', fontWeight: 900, fontSize: 14, cursor: 'pointer', opacity: myCode ? 1 : 0.5 }}
              >
                Inviter un ami
              </button>
              <p style={{ fontSize: S(10), color: '#9CA3AF', margin: '8px 0 0', textAlign: 'center' }}>Envoie ton lien par WhatsApp, SMS ou autre</p>
            </div>

            {/* B) Mes amis */}
            <div className="rounded-2xl mb-3" style={{ background: 'white', padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 10px' }}>
                <h2 style={{ fontSize: S(14), fontWeight: 900, color: '#1a1a2e', margin: 0 }}>Mes amis ({friends.length})</h2>
                <button
                  onClick={() => loadData()}
                  disabled={socialLoading}
                  className="active:scale-90 transition-all"
                  style={{ background: '#EF4444', border: 'none', fontSize: 12, cursor: 'pointer', color: 'white', borderRadius: 8, padding: '4px 10px', fontWeight: 900 }}
                >
                  {socialLoading ? '...' : 'Refresh'}
                </button>
              </div>
              {socialLoading && friends.length === 0 ? (
                <p style={{ fontSize: S(12), color: '#9CA3AF', textAlign: 'center', padding: '12px 0' }}>Chargement...</p>
              ) : friends.length === 0 ? (
                <p style={{ fontSize: S(12), color: '#9CA3AF', textAlign: 'center', padding: '12px 0' }}>Pas encore d'amis. Invite quelqu'un !</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {friends.map(friend => (
                    <div key={friend.friendshipId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'rgba(0,0,0,0.03)' }}>
                      <Initial name={friend.displayName} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#1a1a2e', display: 'block' }}>{friend.displayName}</span>
                      </div>
                      {!hasSentPending && pendingChallenges.length === 0 && (
                        <button
                          onClick={handleChallenge}
                          className="active:scale-90"
                          style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,107,26,0.1)', border: '1px solid rgba(255,107,26,0.3)', color: '#FF6B1A', fontWeight: 800, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >Défier</button>
                      )}
                      <button onClick={() => handleRemove(friend.friendshipId)} className="active:scale-90" style={{ padding: '4px 8px', borderRadius: 6, background: 'transparent', border: 'none', color: '#D1D5DB', fontSize: 14, cursor: 'pointer' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* C) Records Blitz (accordéon) */}
            <div className="rounded-2xl mb-3" style={{ background: 'white', padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <button
                onClick={() => setShowBlitzRecordsSection(!showBlitzRecordsSection)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <h2 style={{ fontSize: S(14), fontWeight: 900, color: '#1a1a2e', margin: 0 }}>Mes Records Blitz</h2>
                <span style={{ fontSize: 18, color: '#9CA3AF', transition: 'transform 0.2s', transform: showBlitzRecordsSection ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
              </button>

              {showBlitzRecordsSection && (
                blitzRecords.length === 0 ? (
                  <p style={{ fontSize: S(12), color: '#9CA3AF', textAlign: 'center', padding: '12px 0', margin: 0, marginTop: 12 }}>Joue en Blitz pour établir tes premiers records !</p>
                ) : (
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {blitzRecords.map(record => (
                      <div
                        key={record.key}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: 10,
                          borderRadius: 12, background: record.isBestTime ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.05)',
                          border: record.isBestTime ? '1px solid #FFD700' : 'none',
                        }}
                      >
                        <span style={{ fontSize: 18 }}>{record.categoryEmoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#1a1a2e', display: 'block' }}>{record.categoryLabel}</span>
                          <span style={{ fontSize: 10, color: '#9CA3AF', display: 'block' }}>{record.palier} question{record.palier !== 1 ? 's' : ''}</span>
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 900, color: record.isBestTime ? '#FFD700' : '#FF6B1A' }}>
                          {formatBlitzTime(record.time)}
                        </span>
                        {record.isBestTime && <span style={{ fontSize: 12, fontWeight: 900, color: '#FFD700' }}>👑</span>}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            {/* D) Défier (accordéon) */}
            <div className="rounded-2xl mb-3" style={{ background: 'white', padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <button
                onClick={() => setShowChallengeSection(!showChallengeSection)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <h2 style={{ fontSize: S(14), fontWeight: 900, color: '#1a1a2e', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  Défier
                  {pendingChallenges.length > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 900, background: 'rgba(255,107,26,0.15)', color: '#FF6B1A', padding: '2px 8px', borderRadius: 10 }}>{pendingChallenges.length}</span>
                  )}
                </h2>
                <span style={{ fontSize: 18, color: '#9CA3AF', transition: 'transform 0.2s', transform: showChallengeSection ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
              </button>

              {showChallengeSection && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {!hasSentPending && pendingChallenges.length === 0 ? (
                    <>
                      <button
                        onClick={handleChallenge}
                        className="active:scale-95 transition-all"
                        style={{ width: '100%', padding: '12px 0', borderRadius: 12, background: '#FF6B1A', color: 'white', border: 'none', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}
                      >
                        Défier un ami
                      </button>
                      <p style={{ fontSize: S(10), color: '#9CA3AF', margin: 0, textAlign: 'center' }}>Lance un Blitz, puis partage le lien du défi</p>
                    </>
                  ) : (
                    <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,107,26,0.08)', border: '1px dashed rgba(255,107,26,0.35)' }}>
                      <p style={{ fontSize: S(11), color: '#FF6B1A', margin: 0, fontWeight: 800, textAlign: 'center' }}>
                        {hasSentPending
                          ? '⏳ Défi en cours — attends que ton ami joue'
                          : '👇 Termine d\'abord les défis que tu as reçus'}
                      </p>
                    </div>
                  )}

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
                                {formatBlitzTime(challenge.player1_time)}
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

            {/* E) Demandes reçues */}
            {pendingRequests.length > 0 && (
              <div className="rounded-2xl mb-3" style={{ background: 'white', padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <h2 style={{ fontSize: S(14), fontWeight: 900, color: '#1a1a2e', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  Demandes reçues
                  <span style={{ fontSize: 11, fontWeight: 900, background: 'rgba(255,107,26,0.15)', color: '#FF6B1A', padding: '2px 8px', borderRadius: 10 }}>{pendingRequests.length}</span>
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pendingRequests.map(req => (
                    <div key={req.friendshipId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'rgba(0,0,0,0.03)' }}>
                      <Initial name={req.displayName} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#1a1a2e', display: 'block' }}>{req.displayName}</span>
                      </div>
                      <button onClick={() => handleAccept(req.friendshipId)} className="active:scale-90" style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22C55E', fontWeight: 800, fontSize: 11, cursor: 'pointer' }}>Accepter</button>
                      <button onClick={() => handleReject(req.friendshipId)} className="active:scale-90" style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontWeight: 800, fontSize: 11, cursor: 'pointer' }}>Refuser</button>
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
