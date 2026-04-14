import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useScale } from '../hooks/useScale'
import { getDuelHistory, computeDuelStatsByCategory, computeDuelStatsByQuestionCount } from '../data/duelService'
import { supabase } from '../lib/supabase'

const S = (px) => `calc(${px}px * var(--scale))`

const formatTime = (t) => {
  if (t == null) return '—'
  if (t < 60) return t.toFixed(2) + 's'
  const m = Math.floor(t / 60)
  const s = (t % 60).toFixed(2)
  return `${m}:${s.padStart(5, '0')}`
}

export default function DuelHistoryScreen() {
  const { opponentId } = useParams()
  const navigate = useNavigate()
  const scale = useScale()
  const { user, isConnected } = useAuth()

  const [loading, setLoading] = useState(true)
  const [duel, setDuel] = useState(null)
  const [rounds, setRounds] = useState([])
  const [opponentName, setOpponentName] = useState('Adversaire')
  const [statsTab, setStatsTab] = useState('category') // 'category' | 'parcours'

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user?.id || !opponentId) { setLoading(false); return }
      try {
        const { duel, rounds } = await getDuelHistory(user.id, opponentId, 100)
        if (cancelled) return
        setDuel(duel)
        setRounds(rounds || [])
        // Fetch opponent display name
        const { data: info } = await supabase
          .from('friend_codes').select('display_name').eq('user_id', opponentId).maybeSingle()
        if (!cancelled && info?.display_name) setOpponentName(info.display_name)
      } catch (e) {
        console.warn('[DuelHistoryScreen] load error:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user?.id, opponentId])

  if (!isConnected) {
    return (
      <div style={{ '--scale': scale, height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAF8', fontFamily: 'Nunito, sans-serif' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#6B7280' }}>Connecte-toi pour voir l'historique</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ '--scale': scale, height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAF8', fontFamily: 'Nunito, sans-serif' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#6B7280' }}>Chargement...</span>
      </div>
    )
  }

  const completed = rounds.filter(r => r.status === 'completed')
  const meWins = completed.filter(r => r.winner_id === user.id).length
  const oppWins = completed.filter(r => r.winner_id === opponentId).length
  const ties = completed.length - meWins - oppWins
  const perCat = computeDuelStatsByCategory(completed, user.id, opponentId)
  const perParcours = computeDuelStatsByQuestionCount(completed, user.id, opponentId)

  return (
    <div style={{ '--scale': scale, height: '100dvh', display: 'flex', flexDirection: 'column', background: '#FAFAF8', fontFamily: 'Nunito, sans-serif', paddingBottom: S(20) }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={() => navigate('/social')} style={{ width: 36, height: 36, borderRadius: 12, background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151', fontSize: 16, cursor: 'pointer' }}>←</button>
        <h1 style={{ flex: 1, fontSize: 18, fontWeight: 900, color: '#1a1a2e', margin: 0 }}>Duel vs {opponentName}</h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
        {/* Score global */}
        <div style={{
          display: 'flex', gap: 10, marginBottom: 16, padding: 16, borderRadius: 16,
          background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase' }}>Toi</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: meWins >= oppWins ? '#FFD700' : '#FF6B1A' }}>{meWins}</div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'rgba(0,0,0,0.2)', alignSelf: 'center' }}>VS</div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase' }}>{opponentName}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: oppWins > meWins ? '#FFD700' : '#FF6B1A' }}>{oppWins}</div>
          </div>
          {ties > 0 && (
            <div style={{ flex: 0.6, textAlign: 'center', borderLeft: '1px solid #E5E7EB', paddingLeft: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase' }}>Nul</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#9CA3AF' }}>{ties}</div>
            </div>
          )}
        </div>

        {/* Stats — 2 onglets : par catégorie / par parcours */}
        {completed.length > 0 && (
          <div style={{ marginBottom: 16, padding: 16, borderRadius: 16, background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <button
                onClick={() => setStatsTab('category')}
                style={{
                  flex: 1, padding: '8px 10px', borderRadius: 10, border: 'none',
                  fontSize: 12, fontWeight: 900, cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
                  background: statsTab === 'category' ? '#FF6B1A' : '#F3F4F6',
                  color: statsTab === 'category' ? 'white' : '#6B7280',
                }}
              >Par catégorie</button>
              <button
                onClick={() => setStatsTab('parcours')}
                style={{
                  flex: 1, padding: '8px 10px', borderRadius: 10, border: 'none',
                  fontSize: 12, fontWeight: 900, cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
                  background: statsTab === 'parcours' ? '#FF6B1A' : '#F3F4F6',
                  color: statsTab === 'parcours' ? 'white' : '#6B7280',
                }}
              >Par parcours</button>
            </div>

            {statsTab === 'category' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {perCat.map(c => (
                  <div key={c.category} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <div style={{ flex: 1, fontWeight: 800, color: '#1a1a2e' }}>{c.categoryLabel || c.category}</div>
                    <div style={{ fontWeight: 900, color: c.meWins > c.opponentWins ? '#22C55E' : c.meWins < c.opponentWins ? '#EF4444' : '#9CA3AF' }}>
                      {c.meWins} – {c.opponentWins}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {perParcours.map(p => (
                  <div key={p.questionCount} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <div style={{ flex: 1, fontWeight: 800, color: '#1a1a2e' }}>Parcours {p.questionCount} Q</div>
                    <div style={{ fontWeight: 900, color: p.meWins > p.opponentWins ? '#22C55E' : p.meWins < p.opponentWins ? '#EF4444' : '#9CA3AF' }}>
                      {p.meWins} – {p.opponentWins}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Liste des rounds */}
        <div style={{ padding: 16, borderRadius: 16, background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: 13, fontWeight: 900, color: '#1a1a2e', margin: '0 0 10px' }}>Historique ({rounds.length})</h2>
          {rounds.length === 0 ? (
            <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', padding: '12px 0', margin: 0 }}>Pas encore de duel joué.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rounds.map(r => {
                const isMe1 = r.player1_id === user.id
                const myTime = isMe1 ? r.player1_time : r.player2_time
                const theirTime = isMe1 ? r.player2_time : r.player1_time
                const iWon = r.winner_id === user.id
                const theyWon = r.winner_id === opponentId
                return (
                  <button
                    key={r.id}
                    onClick={() => r.code && navigate(`/challenge/${r.code}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      borderRadius: 12, background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)',
                      cursor: 'pointer', textAlign: 'left', width: '100%',
                    }}
                  >
                    <span style={{ fontSize: 16 }}>
                      {r.status === 'pending' ? '⏳' : r.status === 'expired' ? '💀' : iWon ? '🏆' : theyWon ? '💔' : '🤝'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#1a1a2e' }}>{r.category_label} · {r.question_count} Q</div>
                      <div style={{ fontSize: 10, color: '#6B7280' }}>{new Date(r.created_at).toLocaleDateString('fr-FR')}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: iWon ? '#22C55E' : '#1a1a2e' }}>{formatTime(myTime)}</div>
                      <div style={{ fontSize: 10, color: theyWon ? '#EF4444' : '#6B7280' }}>{formatTime(theirTime)}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
