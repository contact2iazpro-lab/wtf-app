import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import GameModal from '../components/GameModal'
import { useAuth } from '../context/AuthContext'
import { acceptFriendRequest, rejectFriendRequest, removeFriend } from '../data/friendService'
import { audio } from '../utils/audio'
import { markRoundSeen, declineRound, expirePendingChallenges } from '../data/duelService'
import { getCategoryById } from '../data/factsService'
import { useDuelContext } from '../features/duels/context/DuelContext'
import { getMyBlitzRecords } from '../data/blitzRecordService'
import { supabase } from '../lib/supabase'

const S = (px) => `calc(${px}px * var(--scale))`

const formatBlitzTime = (seconds) => {
  if (seconds < 60) return seconds.toFixed(2) + 's'
  const min = Math.floor(seconds / 60)
  const sec = (seconds % 60).toFixed(2)
  return min + ':' + sec.padStart(5, '0')
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

// Enrichit une ligne blitz_records (Supabase) avec cat label/emoji/color.
function decorateRecord(r) {
  const catKey = r.category_id || 'all'
  const catData = catKey === 'all'
    ? { id: 'all', label: 'Toutes catégories', emoji: '🌍', color: '#9CA3AF' }
    : (getCategoryById(catKey) || { id: catKey, label: catKey, emoji: '📚', color: '#9CA3AF' })
  return {
    id: r.id,
    variant: r.variant,
    categoryId: r.category_id,
    categoryLabel: catData.label,
    categoryEmoji: catData.emoji,
    categoryColor: catData.color,
    palier: r.palier,
    score: r.score,
    time: r.time_seconds,
    createdAt: r.created_at,
  }
}

const formatSecHundredths = (t) => {
  if (t == null) return '—'
  if (t < 60) return t.toFixed(2) + 's'
  const m = Math.floor(t / 60)
  const s = (t % 60).toFixed(2)
  return `${m}:${s.padStart(5, '0')}`
}

export default function SocialPage() {
  const navigate = useNavigate()
  const { user, isConnected, signInWithGoogle } = useAuth()

  // Source de vérité unique : DuelContext (Supabase direct + Realtime)
  const {
    friends, pendingReceived, friendsLoading,
    refreshFriends,
    byFriendId,
    getDuelStateFor,
    getDuelStatesFor,
    myCode,
    startCreateDefi,
    refreshDuels,
  } = useDuelContext()

  const [showBlitzRecordsSection, setShowBlitzRecordsSection] = useState(false)
  const [myBlitzRecords, setMyBlitzRecords] = useState([])
  const [toast, setToast] = useState(null)
  const [confirmRemove, setConfirmRemove] = useState(null)
  const [expandedFriend, setExpandedFriend] = useState(null) // friendId du ami dont on voit les défis
  const [friendsListCollapsed, setFriendsListCollapsed] = useState(false) // accordéon "Mes amis"
  const [friendModal, setFriendModal] = useState(null) // { friendshipId, userId, displayName }

  // Au mount : expire les défis > 48h et rembourse 100c créateur (idempotent)
  useEffect(() => { expirePendingChallenges().then(n => { if (n > 0) refreshDuels?.() }).catch(() => {}) }, [refreshDuels])

  // Notifications realtime : ami a relevé / refusé un défi (créateur notifié)
  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel(`social-notif-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'challenges',
        filter: `player1_id=eq.${user.id}`,
      }, (payload) => {
        const newRow = payload.new
        const oldRow = payload.old || {}
        // Relevé : status pending → completed
        if (oldRow.status === 'pending' && newRow.status === 'completed') {
          const name = newRow.player2_name || 'Ton ami'
          showToast(`🎯 ${name} a relevé ton défi !`)
          audio.play?.('reveal')
        }
        // Refusé : declined_by a été ajouté (size passe de 0 à >0)
        const oldLen = Array.isArray(oldRow.declined_by) ? oldRow.declined_by.length : 0
        const newLen = Array.isArray(newRow.declined_by) ? newRow.declined_by.length : 0
        // Refusé (via decline_round qui passe aussi status → expired + refund 100c créateur)
        if (newLen > oldLen) {
          const name = newRow.player2_name || 'Ton ami'
          showToast(`✗ ${name} a refusé ton défi · +100 coins remboursés`)
          window.dispatchEvent(new CustomEvent('wtf_currency_updated'))
        }
        // Expiration 48h sans refus explicite : même toast refund
        if (oldRow.status === 'pending' && newRow.status === 'expired'
            && Array.isArray(newRow.declined_by) && newRow.declined_by.length === (Array.isArray(oldRow.declined_by) ? oldRow.declined_by.length : 0)) {
          showToast(`⏰ Défi expiré · +100 coins remboursés`)
          window.dispatchEvent(new CustomEvent('wtf_currency_updated'))
        }
      })
      .subscribe()
    return () => { try { supabase.removeChannel(channel) } catch {} }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Fetch records Blitz depuis Supabase + subscribe realtime (auto-refresh
  // quand une nouvelle run est insérée par moi sur un autre device, ou par
  // le save post-game courant).
  useEffect(() => {
    if (!user?.id) { setMyBlitzRecords([]); return }
    let cancelled = false
    const load = async () => {
      const rows = await getMyBlitzRecords(user.id)
      if (!cancelled) setMyBlitzRecords(rows.map(decorateRecord))
    }
    load()
    const channel = supabase
      .channel(`blitz-records-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'blitz_records',
        filter: `user_id=eq.${user.id}`,
      }, () => load())
      .subscribe()
    return () => {
      cancelled = true
      try { supabase.removeChannel(channel) } catch {}
    }
  }, [user?.id])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2000) }

  const handleAccept = async (id) => {
    try {
      await acceptFriendRequest(id)
      showToast('Ami ajouté !')
      refreshFriends()
    } catch (e) { console.warn('Accept error:', e) }
  }

  const handleReject = async (id) => {
    try {
      await rejectFriendRequest(id)
      refreshFriends()
    } catch (e) { console.warn('Reject error:', e) }
  }

  const handleRemove = (id) => setConfirmRemove(id)

  const confirmRemoveFriend = async () => {
    if (!confirmRemove) return
    try {
      await removeFriend(confirmRemove)
      showToast('Ami supprimé')
      refreshFriends()
    } catch (e) { console.warn('Remove error:', e) }
    setConfirmRemove(null)
  }

  // Action sur un défi spécifique (avec roundId et action)
  const handleDuelAction = async (friend, duelState) => {
    audio.play('click')
    if (!duelState?.action) return
    if (duelState.action === 'create') {
      startCreateDefi(friend.userId, 'all')
      navigate('/')
      return
    }
    if (duelState.action === 'rematch') {
      // Revanche dans les mêmes conditions : même catégorie, même nb de questions.
      // Skip le BlitzLobby (questionCount défini → bypass dans App.jsx).
      startCreateDefi(friend.userId, duelState.categoryId || 'all', duelState.questionCount || null)
      navigate('/')
      return
    }
    if (duelState.action === 'accept' || duelState.action === 'view') {
      if (duelState.roundId && duelState.action === 'view') {
        try {
          await markRoundSeen(duelState.roundId, user.id)
          // Refetch immédiatement pour afficher "Revanche" au lieu de "Résultat"
          await refreshDuels()
        } catch {}
      }
      const code = duelState.code
      if (code) navigate(`/challenge/${code}`)
    }
  }

  // Split rush / speedrun — speedrun trié par temps asc, rush par score desc
  const blitzRushRecords = myBlitzRecords
    .filter(r => r.variant === 'rush')
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  const blitzSpeedrunRecords = myBlitzRecords
    .filter(r => r.variant === 'speedrun')
    .sort((a, b) => (a.time ?? Infinity) - (b.time ?? Infinity))
  const bestRushScore = blitzRushRecords[0]?.score || 0
  const bestSpeedrunTime = blitzSpeedrunRecords[0]?.time ?? null
  const blitzRecords = [...blitzRushRecords, ...blitzSpeedrunRecords]

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: 'transparent', paddingBottom: S(80), fontFamily: 'Nunito, sans-serif' }}>
      {/* Friend modal — Bloc 2.10 */}
      {friendModal && (
        <div
          onClick={() => setFriendModal(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 420, background: 'rgba(255,255,255,0.08)',
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              padding: '20px 16px 24px', display: 'flex', flexDirection: 'column', gap: 8,
              fontFamily: 'Nunito, sans-serif',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
              <Initial name={friendModal.displayName} size={42} />
              <div style={{ flex: 1, fontSize: 16, fontWeight: 900, color: '#ffffff' }}>{friendModal.displayName}</div>
            </div>
            {[
              { icon: '⚔️', label: 'Lancer un défi', onClick: () => { startCreateDefi(friendModal.userId, 'all'); setFriendModal(null); navigate('/') } },
              { icon: '📜', label: 'Historique des défis', onClick: () => { setFriendModal(null); navigate(`/duels/${friendModal.userId}`) } },
              { icon: '⚡', label: 'Records Blitz', onClick: () => { setFriendModal(null); navigate(`/duels/${friendModal.userId}?tab=records`) } },
              { icon: '🗑️', label: 'Supprimer cet ami', danger: true, onClick: () => { const id = friendModal.friendshipId; setFriendModal(null); handleRemove(id) } },
            ].map((opt, i) => (
              <button
                key={i}
                onClick={() => { audio.play('click'); opt.onClick() }}
                className="active:scale-95"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 12px', borderRadius: 12, border: 'none',
                  background: opt.danger ? 'rgba(239,68,68,0.08)' : '#F9FAFB',
                  color: opt.danger ? '#EF4444' : '#1a1a2e',
                  fontWeight: 800, fontSize: 14, cursor: 'pointer', textAlign: 'left',
                  fontFamily: 'Nunito, sans-serif',
                }}
              >
                <span style={{ fontSize: 18 }}>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
            <button
              onClick={() => setFriendModal(null)}
              style={{
                marginTop: 8, padding: '12px', borderRadius: 12, border: 'none',
                background: 'transparent', color: '#9CA3AF', fontWeight: 800, fontSize: 13,
                cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

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
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff' }}>←</button>
          <h1 className="flex-1 text-lg font-black" style={{ color: '#ffffff' }}>Amis</h1>
          {pendingReceived.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-black" style={{ background: 'rgba(255,107,26,0.15)', color: '#FF6B1A' }}>{pendingReceived.length}</span>
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
              <div style={{ fontSize: 13, fontWeight: 900, color: '#ffffff', lineHeight: 1.2 }}>
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
          <div className="rounded-2xl p-6 text-center" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <span className="text-3xl block mb-3">👥</span>
            <p style={{ fontSize: S(14), fontWeight: 700, color: '#ffffff', margin: '0 0 12px' }}>Connecte-toi pour ajouter des amis et relever des défis</p>
            <button onClick={() => signInWithGoogle().catch(e => { console.error('[SocialPage] Google sign-in failed:', e?.message || e); showToast('Connexion échouée : ' + (e?.message || 'erreur')) })} className="active:scale-95 transition-all" style={{ padding: '12px 28px', borderRadius: 14, background: '#FF6B1A', color: 'white', border: 'none', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
              Se connecter avec Google
            </button>
          </div>
        ) : (
          <>
            {/* A) Inviter un ami */}
            <div className="rounded-2xl mb-3" style={{ background: 'rgba(255,255,255,0.08)', padding: 16, border: '1px solid rgba(255,255,255,0.12)' }}>
              <h2 style={{ fontSize: S(14), fontWeight: 900, color: '#ffffff', margin: '0 0 10px' }}>Inviter un ami</h2>
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

            {/* B) Mes amis — accordéon */}
            <div className="rounded-2xl mb-3" style={{ background: 'rgba(255,255,255,0.08)', padding: 16, border: '1px solid rgba(255,255,255,0.12)' }}>
              <button
                onClick={() => { audio.play('click'); setFriendsListCollapsed(c => !c) }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  margin: '0 0 10px', padding: 0, background: 'transparent', border: 'none',
                  cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
                }}
              >
                {(() => {
                  // Compte les défis à relever (action='accept') sur tous les amis.
                  // Affiché dans le titre quand l'accordéon est fermé pour signaler qu'il y en a.
                  const pendingToAccept = friends.reduce((n, f) =>
                    n + getDuelStatesFor(f.userId).filter(s => s.action === 'accept').length, 0)
                  return (
                    <h2 style={{ fontSize: S(14), fontWeight: 900, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      Mes amis ({friends.length})
                      {friendsListCollapsed && pendingToAccept > 0 && (
                        <span style={{
                          fontSize: 11, fontWeight: 900, color: 'white',
                          background: '#FF6B1A', borderRadius: 10, padding: '2px 8px',
                          lineHeight: 1.2,
                        }}>
                          {pendingToAccept} défi{pendingToAccept > 1 ? 's' : ''} à relever
                        </span>
                      )}
                    </h2>
                  )
                })()}
                <span style={{
                  fontSize: 16, color: '#9CA3AF',
                  transition: 'transform 0.2s',
                  transform: friendsListCollapsed ? 'rotate(-90deg)' : 'rotate(0)',
                }}>▼</span>
              </button>
              {friendsListCollapsed ? null : friendsLoading && friends.length === 0 ? (
                <p style={{ fontSize: S(12), color: '#9CA3AF', textAlign: 'center', padding: '12px 0' }}>Chargement...</p>
              ) : friends.length === 0 ? (
                <p style={{ fontSize: S(12), color: '#9CA3AF', textAlign: 'center', padding: '12px 0' }}>Pas encore d'amis. Invite quelqu'un !</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {friends.map(friend => {
                    const isExpanded = expandedFriend === friend.userId
                    // Masquer les boutons "Résultat" (action='view') — les résultats
                    // sont consultables dans l'historique entre amis (DuelHistoryScreen).
                    const allStates = getDuelStatesFor(friend.userId).filter(s => s.action !== 'view')
                    const hasDefis = allStates.length > 0
                    return (
                      <div key={friend.friendshipId}>
                        {/* Ligne ami : header expandable */}
                        <button
                          onClick={() => setExpandedFriend(isExpanded ? null : friend.userId)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                            borderRadius: 10, background: 'rgba(0,0,0,0.03)', border: 'none',
                            cursor: 'pointer', transition: 'all 0.2s'
                          }}
                          onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                          onMouseOut={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                        >
                          <Initial name={friend.displayName} size={36} />
                          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#ffffff', display: 'block' }}>{friend.displayName}</span>
                            <span style={{ fontSize: 10, color: '#9CA3AF' }}>
                              {hasDefis ? `${allStates.length} défi${allStates.length > 1 ? 's' : ''}` : 'Aucun défi'}
                            </span>
                          </div>
                          <span style={{
                            fontSize: 16, color: '#9CA3AF', transition: 'transform 0.2s',
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                            flexShrink: 0
                          }}>▼</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              audio.play('click')
                              setFriendModal({ friendshipId: friend.friendshipId, userId: friend.userId, displayName: friend.displayName })
                            }}
                            className="active:scale-90"
                            style={{
                              padding: '4px 10px', borderRadius: 6, background: 'transparent',
                              border: '1px solid rgba(0,0,0,0.1)', color: '#6B7280', fontSize: 16,
                              fontWeight: 900, cursor: 'pointer', flexShrink: 0, lineHeight: 1
                            }}
                          >
                            ⋯
                          </button>
                        </button>

                        {/* Liste des défis si expanded */}
                        {isExpanded && (
                          <div style={{ marginTop: 8, paddingLeft: 10, display: 'flex', flexDirection: 'column', gap: 6, borderLeft: '2px solid rgba(255,107,26,0.2)' }}>
                            {allStates.length === 0 ? (
                              <button
                                onClick={() => {
                                  audio.play('click')
                                  navigate(`/multi?opponentId=${friend.userId}`)
                                }}
                                style={{
                                  padding: '8px 12px', borderRadius: 8,
                                  background: 'rgba(255,107,26,0.1)', border: '1px solid rgba(255,107,26,0.3)',
                                  color: '#FF6B1A', fontWeight: 800, fontSize: 11,
                                  cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
                                  textAlign: 'left'
                                }}
                              >
                                ⚔️ Créer un défi
                              </button>
                            ) : (
                              <>
                                {allStates.map((duelState, idx) => {
                                  const isHot = duelState.action === 'accept' || duelState.action === 'view'
                                  const isBad = duelState.action === null && duelState.pending
                                  const isRematch = duelState.action === 'rematch' && duelState.canDecline
                                  return (
                                    <div key={duelState.roundId} style={{ display: 'flex', gap: 6 }}>
                                      <button
                                        onClick={() => handleDuelAction(friend, duelState)}
                                        disabled={duelState.disabled}
                                        style={{
                                          flex: 1, padding: '8px 12px', borderRadius: 8,
                                          background: duelState.disabled ? 'rgba(0,0,0,0.03)' : (isHot ? '#FF6B1A' : 'rgba(255,107,26,0.1)'),
                                          border: duelState.disabled ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,107,26,0.3)',
                                          color: duelState.disabled ? '#9CA3AF' : (isHot ? 'white' : '#FF6B1A'),
                                          fontWeight: 800, fontSize: 11,
                                          cursor: duelState.disabled ? 'default' : 'pointer',
                                          fontFamily: 'Nunito, sans-serif',
                                          textAlign: 'left',
                                          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                        }}
                                        className={duelState.disabled ? '' : 'active:scale-95'}
                                      >
                                        <span>{duelState.label}</span>
                                        <span style={{ fontSize: 9, opacity: 0.7, marginLeft: 8 }}>
                                          {duelState.categoryLabel}
                                        </span>
                                      </button>
                                      {/* Bouton refuser pour les revanches */}
                                      {isRematch && (
                                        <button
                                          onClick={async () => {
                                            audio.play('click')
                                            try {
                                              // Persisté Supabase (multi-device) via RPC decline_round
                                              const res = await declineRound(duelState.roundId)
                                              if (res?.error) throw new Error(res.error)
                                              await refreshDuels()
                                              showToast('Revanche refusée')
                                            } catch (e) {
                                              console.warn('[SocialPage] Decline error:', e)
                                              showToast('Erreur lors du refus')
                                            }
                                          }}
                                          style={{
                                            padding: '8px 10px', borderRadius: 8,
                                            background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.1)',
                                            color: '#6B7280', fontWeight: 800, fontSize: 11,
                                            cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
                                            whiteSpace: 'nowrap'
                                          }}
                                          className="active:scale-95"
                                        >
                                          ✕ Refuser
                                        </button>
                                      )}
                                    </div>
                                  )
                                })}
                                {/* Bouton créer un nouveau défi */}
                                <button
                                  onClick={() => {
                                    audio.play('click')
                                    navigate(`/multi?opponentId=${friend.userId}`)
                                  }}
                                  style={{
                                    padding: '8px 12px', borderRadius: 8,
                                    background: 'transparent', border: '2px dashed rgba(255,107,26,0.3)',
                                    color: '#FF6B1A', fontWeight: 800, fontSize: 11,
                                    cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
                                    marginTop: 4
                                  }}
                                >
                                  ➕ Nouveau défi
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* C) Records Blitz (accordéon) */}
            <div className="rounded-2xl mb-3" style={{ background: 'rgba(255,255,255,0.08)', padding: 16, border: '1px solid rgba(255,255,255,0.12)' }}>
              <button
                onClick={() => setShowBlitzRecordsSection(!showBlitzRecordsSection)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <h2 style={{ fontSize: S(14), fontWeight: 900, color: '#ffffff', margin: 0 }}>Mes Records Blitz</h2>
                <span style={{ fontSize: 18, color: '#9CA3AF', transition: 'transform 0.2s', transform: showBlitzRecordsSection ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
              </button>

              {showBlitzRecordsSection && (
                blitzRecords.length === 0 ? (
                  <p style={{ fontSize: S(12), color: '#9CA3AF', textAlign: 'center', padding: '12px 0', margin: 0, marginTop: 12 }}>Joue en Blitz pour établir tes premiers records !</p>
                ) : (
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* ── Rush (score = nb bonnes) ───────────────────────── */}
                    {blitzRushRecords.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 900, color: '#CC0000', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                          ⚡ Rush · 60s
                        </div>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: 10,
                          borderRadius: 12,
                          background: 'rgba(255,215,0,0.1)',
                          border: '1px solid #FFD700',
                        }}>
                          <span style={{ fontSize: 18 }}>🏆</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: '#ffffff', display: 'block' }}>Meilleur score</span>
                            <span style={{ fontSize: 10, color: '#9CA3AF', display: 'block' }}>bonnes réponses en 60s</span>
                          </div>
                          <span style={{ fontSize: 18, fontWeight: 900, color: '#FFD700', fontVariantNumeric: 'tabular-nums' }}>
                            {bestRushScore}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 900, color: '#FFD700' }}>👑</span>
                        </div>
                      </div>
                    )}

                    {/* ── Speedrun (records au centième par cat + palier) ── */}
                    {blitzSpeedrunRecords.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 900, color: '#0097A7', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                          🚀 Speedrun · records au centième
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {blitzSpeedrunRecords.map(record => {
                            const isBest = bestSpeedrunTime != null && record.time === bestSpeedrunTime
                            return (
                              <div
                                key={record.id}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 10, padding: 10,
                                  borderRadius: 12,
                                  background: isBest ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.05)',
                                  border: isBest ? '1px solid #00E5FF' : '1px solid rgba(0,0,0,0.05)',
                                }}
                              >
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: record.categoryColor, flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <span style={{ fontSize: 12, fontWeight: 800, color: '#ffffff', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {record.categoryLabel}
                                  </span>
                                  <span style={{ fontSize: 10, color: '#9CA3AF', display: 'block' }}>
                                    {record.palier} question{record.palier !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                <span style={{ fontSize: 16, fontWeight: 900, color: isBest ? '#00E5FF' : '#0097A7', fontVariantNumeric: 'tabular-nums' }}>
                                  {formatSecHundredths(record.time)}
                                </span>
                                {isBest && <span style={{ fontSize: 12, fontWeight: 900, color: '#00E5FF' }}>👑</span>}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>

            {/* D) Demandes reçues */}
            {pendingReceived.length > 0 && (
              <div className="rounded-2xl mb-3" style={{ background: 'rgba(255,255,255,0.08)', padding: 16, border: '1px solid rgba(255,255,255,0.12)' }}>
                <h2 style={{ fontSize: S(14), fontWeight: 900, color: '#ffffff', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  Demandes reçues
                  <span style={{ fontSize: 11, fontWeight: 900, background: 'rgba(255,107,26,0.15)', color: '#FF6B1A', padding: '2px 8px', borderRadius: 10 }}>{pendingReceived.length}</span>
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pendingReceived.map(req => (
                    <div key={req.friendshipId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'rgba(0,0,0,0.03)' }}>
                      <Initial name={req.displayName} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#ffffff', display: 'block' }}>{req.displayName}</span>
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
