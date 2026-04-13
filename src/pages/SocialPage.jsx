import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import GameModal from '../components/GameModal'
import { useAuth } from '../context/AuthContext'
import { acceptFriendRequest, rejectFriendRequest, removeFriend } from '../data/friendService'
import { audio } from '../utils/audio'
import { markRoundSeen } from '../data/duelService'
import { getCategoryById } from '../data/factsService'
import { useDuelContext } from '../features/duels/context/DuelContext'

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
  const { user, isConnected, signInWithGoogle } = useAuth()

  // Source de vérité unique : DuelContext (Supabase direct + Realtime)
  const {
    friends, pendingReceived, friendsLoading,
    refreshFriends,
    byFriendId,
    getDuelStateFor,
    myCode,
    startCreateDefi,
  } = useDuelContext()

  const [showBlitzRecordsSection, setShowBlitzRecordsSection] = useState(false)
  const [toast, setToast] = useState(null)
  const [confirmRemove, setConfirmRemove] = useState(null)

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

  // Bouton dynamique par-ami — lit directement l'état du duel via context
  const handleFriendDuelAction = async (friend, state) => {
    audio.play('click')
    if (!state?.action) return
    if (state.action === 'create' || state.action === 'rematch') {
      // Demander catégorie: 'all' pour aléatoire ou catégorie spécifique
      const categoryId = prompt('Catégorie du défi:\n- all (aléatoire)\n- sports\n- sciences\n- etc.\n\nOu laisse vide pour aléatoire', 'all')
      if (!categoryId) return // Annulé
      // Nav state en mémoire (plus de localStorage) → App.jsx le consomme via DuelContext
      startCreateDefi(friend.userId, categoryId || 'all')
      navigate('/')
      return
    }
    if (state.action === 'accept' || state.action === 'view') {
      if (state.roundId && state.action === 'view') {
        try { await markRoundSeen(state.roundId, user.id) } catch {}
      }
      const entry = byFriendId.get(friend.userId)
      const code = entry?.lastRound?.code
      if (code) navigate(`/challenge/${code}`)
    }
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
            <button onClick={() => signInWithGoogle().catch(e => { console.error('[SocialPage] Google sign-in failed:', e?.message || e); showToast('Connexion échouée : ' + (e?.message || 'erreur')) })} className="active:scale-95 transition-all" style={{ padding: '12px 28px', borderRadius: 14, background: '#FF6B1A', color: 'white', border: 'none', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
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
              </div>
              {friendsLoading && friends.length === 0 ? (
                <p style={{ fontSize: S(12), color: '#9CA3AF', textAlign: 'center', padding: '12px 0' }}>Chargement...</p>
              ) : friends.length === 0 ? (
                <p style={{ fontSize: S(12), color: '#9CA3AF', textAlign: 'center', padding: '12px 0' }}>Pas encore d'amis. Invite quelqu'un !</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {friends.map(friend => {
                    const state = getDuelStateFor(friend.userId)
                    const isHot = state.action === 'accept' || state.action === 'view'
                    return (
                      <div key={friend.friendshipId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'rgba(0,0,0,0.03)' }}>
                        <Initial name={friend.displayName} size={36} />
                        <button
                          onClick={() => { audio.play('click'); navigate(`/duels/${friend.userId}`) }}
                          style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}
                        >
                          <span style={{ fontSize: 13, fontWeight: 800, color: '#1a1a2e', display: 'block' }}>{friend.displayName}</span>
                          <span style={{ fontSize: 10, color: '#9CA3AF' }}>Voir l'historique →</span>
                        </button>
                        <button
                          onClick={() => handleFriendDuelAction(friend, state)}
                          disabled={state.disabled}
                          className="active:scale-90"
                          style={{
                            padding: '6px 10px', borderRadius: 8,
                            background: state.disabled ? 'rgba(0,0,0,0.05)' : (isHot ? '#FF6B1A' : 'rgba(255,107,26,0.1)'),
                            border: state.disabled ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,107,26,0.3)',
                            color: state.disabled ? '#9CA3AF' : (isHot ? 'white' : '#FF6B1A'),
                            fontWeight: 800, fontSize: 11,
                            cursor: state.disabled ? 'default' : 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >{state.label}</button>
                        <button onClick={() => handleRemove(friend.friendshipId)} className="active:scale-90" style={{ padding: '4px 8px', borderRadius: 6, background: 'transparent', border: 'none', color: '#D1D5DB', fontSize: 14, cursor: 'pointer' }}>✕</button>
                      </div>
                    )
                  })}
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

            {/* D) Demandes reçues */}
            {pendingReceived.length > 0 && (
              <div className="rounded-2xl mb-3" style={{ background: 'white', padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <h2 style={{ fontSize: S(14), fontWeight: 900, color: '#1a1a2e', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  Demandes reçues
                  <span style={{ fontSize: 11, fontWeight: 900, background: 'rgba(255,107,26,0.15)', color: '#FF6B1A', padding: '2px 8px', borderRadius: 10 }}>{pendingReceived.length}</span>
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pendingReceived.map(req => (
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
