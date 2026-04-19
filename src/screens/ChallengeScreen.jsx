import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useScale } from '../hooks/useScale'
import { useAuth } from '../context/AuthContext'
import { getChallenge } from '../data/challengeService'
import { declineRound, acceptDuelChallenge } from '../data/duelService'
import { getBlitzFacts, initFacts } from '../data/factsService'
import { getAnswerOptions } from '../utils/answers'
import { shuffle } from '../utils/shuffle'
import { audio } from '../utils/audio'
import { useDuelContext } from '../features/duels/context/DuelContext'
import { DIFFICULTY_LEVELS } from '../constants/gameConfig'
import { usePlayerProfile } from '../hooks/usePlayerProfile'
import GameModal from '../components/GameModal'

const ACCEPT_COST = 100 // mise accepteur (créateur a déjà misé 100 à la création)
const WIN_REWARD = 150
const MULTI_VIOLET = '#6B2D8E'
const MULTI_GOLD = '#FFD700'

const S = (px) => `calc(${px}px * var(--scale))`

const formatTime = (t) => {
  if (!t && t !== 0) return '—'
  if (t < 60) return t.toFixed(2) + 's'
  const m = Math.floor(t / 60)
  const s = (t % 60).toFixed(2)
  return `${m}:${s.padStart(5, '0')}`
}

export default function ChallengeScreen() {
  const { code } = useParams()
  const navigate = useNavigate()
  const scale = useScale()
  const { user, isConnected, signInWithGoogle } = useAuth()
  const { startAcceptDefi, startCreateDefi } = useDuelContext()
  const { coins: playerCoins } = usePlayerProfile()

  const [challenge, setChallenge] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [factsReady, setFactsReady] = useState(false)
  const [showAcceptModal, setShowAcceptModal] = useState(false)
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [declining, setDeclining] = useState(false)

  // Initialize facts and load challenge on mount
  useEffect(() => {
    // Ensure facts are loaded before calculating playerFacts
    initFacts().finally(() => setFactsReady(true))

    if (!code) { setError('Code manquant'); setLoading(false); return }

    let cancelled = false
    // Timeout 10s au cas où la requête Supabase ne résout jamais (RLS, lock, etc.)
    const timeoutId = setTimeout(() => {
      if (cancelled) return
      console.warn('[ChallengeScreen] getChallenge timeout after 10s')
      setError('Le défi met trop de temps à charger — réessaie.')
      setLoading(false)
    }, 10000)

    getChallenge(code)
      .then(data => {
        if (cancelled) return
        clearTimeout(timeoutId)
        setChallenge(data)
        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        clearTimeout(timeoutId)
        console.error('[ChallengeScreen] getChallenge error:', err?.message || err)
        setError('Défi introuvable ou expiré')
        setLoading(false)
      })
    return () => { cancelled = true; clearTimeout(timeoutId) }
  }, [code])

  // Check if player has enough facts (only calculate after facts are ready)
  const playerFacts = (() => {
    if (!challenge || !factsReady) return []
    const allBlitz = getBlitzFacts()
    if (challenge.category_id === 'all') return allBlitz
    return allBlitz.filter(f => f.category === challenge.category_id)
  })()

  const hasEnoughFacts = playerFacts.length >= (challenge?.question_count || 0)
  const isExpired = challenge?.status === 'expired' || (challenge?.expires_at && new Date(challenge.expires_at) < new Date())
  const isCompleted = challenge?.status === 'completed'
  const isPending = challenge?.status === 'pending' && !isExpired
  const isSelf = user && challenge?.player1_id === user.id

  // Bloc 3.6 — Vibration à la révélation du résultat (pattern long si victoire)
  // Rush : plus de bonnes gagne (tie-break time bas).
  // Speedrun : temps le plus bas gagne.
  useEffect(() => {
    if (!isCompleted || !user || !challenge) return
    const isSpeedrun = challenge.variant === 'speedrun'
    let p1Won
    if (isSpeedrun) {
      p1Won = (challenge.player1_time ?? 0) <= (challenge.player2_time ?? 0)
    } else {
      const p1Correct = challenge.player1_correct ?? 0
      const p2Correct = challenge.player2_correct ?? 0
      p1Won = p1Correct > p2Correct
        || (p1Correct === p2Correct && (challenge.player1_time ?? 0) <= (challenge.player2_time ?? 0))
    }
    const meIsP1 = challenge.player1_id === user.id
    const meWon = (meIsP1 && p1Won) || (!meIsP1 && !p1Won)
    audio.vibrate(meWon ? [80, 50, 80, 50, 150] : [40])
  }, [isCompleted, user, challenge])

  // Étape 1 : ouvre le modal de confirmation (avec le coût −100c visible)
  const handleAcceptChallenge = () => {
    if (!user || !challenge || playerFacts.length < 5) return
    if ((playerCoins ?? 0) < ACCEPT_COST) {
      alert(`Il te faut ${ACCEPT_COST} coins pour relever ce défi.`)
      return
    }
    audio.play('click')
    setShowAcceptModal(true)
  }

  // Étape 2 : confirmation → RPC accept (débit immédiat 100c) + lancement Blitz
  const handleAcceptConfirm = async () => {
    if (!user || !challenge) return
    setShowAcceptModal(false)
    audio.play('click')
    try {
      const result = await acceptDuelChallenge(challenge.id)
      if (!result?.ok) throw new Error('accept failed')
      // Notifier le miroir coins (RPC a débité 100c)
      window.dispatchEvent(new CustomEvent('wtf_currency_updated'))
    } catch (e) {
      console.error('Accept duel error:', e)
      const msg = e?.message?.includes('insufficient')
        ? 'Pas assez de coins pour relever.'
        : e?.message?.includes('already_completed_or_expired')
        ? 'Ce défi n\'est plus disponible.'
        : 'Impossible de relever le défi : ' + (e?.message || 'erreur')
      alert(msg)
      return
    }
    const shuffled = shuffle(playerFacts)
      .slice(0, Math.min(challenge.question_count, playerFacts.length))
    const factsWithOptions = shuffled.map(f => ({ ...f, ...getAnswerOptions(f, DIFFICULTY_LEVELS.BLITZ) }))
    startAcceptDefi(challenge, factsWithOptions)
    navigate('/')
  }

  const handleDeclineOpen = () => {
    if (!user || !challenge) return
    audio.play('click')
    setShowDeclineModal(true)
  }

  const handleDeclineConfirm = async () => {
    if (!user || !challenge || declining) return
    setDeclining(true)
    try {
      await declineRound(challenge.id, user.id)
      setShowDeclineModal(false)
      navigate('/social')
    } catch (e) {
      console.error('Decline error:', e)
      alert('Impossible de refuser le défi : ' + (e?.message || 'erreur'))
      setDeclining(false)
    }
  }

  // Loading
  if (loading) {
    return (
      <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg, #1a0a2e, #0a0a3e)', fontFamily: 'Nunito, sans-serif' }}>
        <span style={{ color: 'white', fontSize: 16, fontWeight: 700 }}>Chargement du défi...</span>
      </div>
    )
  }

  // Error
  if (error || !challenge) {
    return (
      <div style={{ '--scale': scale, height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'linear-gradient(160deg, #1a0a2e, #0a0a3e)', fontFamily: 'Nunito, sans-serif', padding: 20 }}>
        <span style={{ fontSize: 48 }}>😕</span>
        <span style={{ color: 'white', fontSize: 18, fontWeight: 900, textAlign: 'center' }}>{error || 'Défi introuvable'}</span>
        <button onClick={() => navigate('/')} style={{ marginTop: 16, padding: '12px 32px', borderRadius: 14, background: '#FF6B1A', color: 'white', border: 'none', fontWeight: 900, fontSize: 14, cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}>
          Accueil
        </button>
      </div>
    )
  }

  // Completed — show results (rush = best-score, speedrun = best-time)
  if (isCompleted) {
    const isSpeedrun = challenge.variant === 'speedrun'
    const p1Correct = challenge.player1_correct ?? 0
    const p2Correct = challenge.player2_correct ?? 0
    const p1Time = challenge.player1_time ?? 0
    const p2Time = challenge.player2_time ?? 0
    let p1Won, isTie
    if (isSpeedrun) {
      p1Won = p1Time <= p2Time
      isTie = p1Time === p2Time
    } else {
      p1Won = p1Correct > p2Correct
        || (p1Correct === p2Correct && p1Time <= p2Time)
      isTie = p1Correct === p2Correct && p1Time === p2Time
    }
    const meIsP1 = user && challenge.player1_id === user.id
    const opponentId = meIsP1 ? challenge.player2_id : challenge.player1_id
    const opponentName = meIsP1 ? (challenge.player2_name || 'Adversaire') : (challenge.player1_name || 'Adversaire')
    const meWon = (meIsP1 && p1Won && !isTie) || (!meIsP1 && !p1Won && !isTie)
    // Delta coins réel : ancien trigger attribuait au créateur en tie (bug).
    // Backend post-19/04 : tie → refund 100c × 2 (winner_id = NULL en DB).
    const myDelta = isTie ? 0 : (meWon ? WIN_REWARD - ACCEPT_COST : -ACCEPT_COST)
    const deltaColor = myDelta > 0 ? '#22C55E' : myDelta < 0 ? '#EF4444' : '#FFD700'
    const deltaEmoji = myDelta > 0 ? '🎉' : myDelta < 0 ? '💸' : '🤝'

    return (
      <div style={{ '--scale': scale, height: '100dvh', display: 'flex', flexDirection: 'column', background: `linear-gradient(160deg, #2a1050 0%, ${MULTI_VIOLET} 50%, #1a0a2e 100%)`, fontFamily: 'Nunito, sans-serif', overflow: 'hidden' }}>
        {/* Header : icône Multi + solde coins */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${S(12)} ${S(16)}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: S(8) }}>
            <img src="/assets/modes/icon-multi.png" alt="Multi" style={{ width: S(26), height: S(26), objectFit: 'contain' }}
              onError={e => { e.target.style.display = 'none' }} />
            <span style={{ fontSize: S(12), fontWeight: 900, color: MULTI_GOLD, letterSpacing: '0.06em' }}>
              Résultat · {isSpeedrun ? 'Speedrun' : 'Rush'}
            </span>
          </div>
          <div style={{ fontSize: S(13), fontWeight: 900, color: MULTI_GOLD, display: 'flex', alignItems: 'center', gap: S(4) }}>
            {playerCoins ?? 0}
            <img src="/assets/ui/icon-coins.png" alt="" style={{ width: S(16), height: S(16) }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: `${S(8)} ${S(16)} ${S(8)}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: S(14) }}>
          {/* Emoji état + titre */}
          <div style={{ fontSize: S(48) }}>{deltaEmoji}</div>
          <h1 style={{ color: 'white', fontSize: S(22), fontWeight: 900, margin: 0, textAlign: 'center' }}>
            {isTie ? 'Égalité parfaite !' : meWon ? 'Victoire !' : 'Défaite'}
          </h1>

          {/* Badge delta coins */}
          <div style={{
            fontSize: S(16), fontWeight: 900, color: deltaColor,
            background: `${deltaColor}20`, border: `1.5px solid ${deltaColor}80`,
            padding: `${S(8)} ${S(18)}`, borderRadius: S(999),
            display: 'flex', alignItems: 'center', gap: S(6),
          }}>
            <span>{myDelta > 0 ? '+' : ''}{myDelta}</span>
            <img src="/assets/ui/icon-coins.png" alt="" style={{ width: S(18), height: S(18) }} />
            <span style={{ fontSize: S(11), opacity: 0.8, marginLeft: S(4) }}>
              {isTie ? 'mise remboursée' : meWon ? `(${WIN_REWARD} reçus − ${ACCEPT_COST} misés)` : 'mise perdue'}
            </span>
          </div>

          {/* Comparaison scores */}
          <div style={{ width: '100%', maxWidth: 340, display: 'flex', gap: 10 }}>
            {/* Player 1 */}
            <div style={{
              flex: 1, borderRadius: 14, padding: `${S(12)} ${S(8)}`, textAlign: 'center',
              background: p1Won && !isTie ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.06)',
              border: p1Won && !isTie ? `2px solid ${MULTI_GOLD}` : '1px solid rgba(255,255,255,0.1)',
            }}>
              {p1Won && !isTie && <div style={{ fontSize: S(10), fontWeight: 900, color: MULTI_GOLD, marginBottom: 4 }}>👑 GAGNANT</div>}
              <div style={{ fontSize: S(12), fontWeight: 800, color: 'white', marginBottom: 6 }}>{challenge.player1_name}</div>
              {isSpeedrun ? (
                <>
                  <div style={{ fontSize: S(20), fontWeight: 900, color: p1Won && !isTie ? MULTI_GOLD : '#FF6B1A' }}>{formatTime(p1Time)}</div>
                  <div style={{ fontSize: S(10), color: 'rgba(255,255,255,0.5)' }}>{p1Correct} bonne{p1Correct > 1 ? 's' : ''}</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: S(26), fontWeight: 900, color: p1Won && !isTie ? MULTI_GOLD : '#FF6B1A' }}>{p1Correct}</div>
                  <div style={{ fontSize: S(10), color: 'rgba(255,255,255,0.5)' }}>bonne{p1Correct > 1 ? 's' : ''}</div>
                  <div style={{ fontSize: S(10), color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{formatTime(p1Time)}</div>
                </>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: S(14), fontWeight: 900, color: 'rgba(255,255,255,0.4)' }}>VS</span>
            </div>
            {/* Player 2 */}
            <div style={{
              flex: 1, borderRadius: 14, padding: `${S(12)} ${S(8)}`, textAlign: 'center',
              background: !p1Won && !isTie ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.06)',
              border: !p1Won && !isTie ? `2px solid ${MULTI_GOLD}` : '1px solid rgba(255,255,255,0.1)',
            }}>
              {!p1Won && !isTie && <div style={{ fontSize: S(10), fontWeight: 900, color: MULTI_GOLD, marginBottom: 4 }}>👑 GAGNANT</div>}
              <div style={{ fontSize: S(12), fontWeight: 800, color: 'white', marginBottom: 6 }}>{challenge.player2_name}</div>
              {isSpeedrun ? (
                <>
                  <div style={{ fontSize: S(20), fontWeight: 900, color: !p1Won && !isTie ? MULTI_GOLD : '#FF6B1A' }}>{formatTime(p2Time)}</div>
                  <div style={{ fontSize: S(10), color: 'rgba(255,255,255,0.5)' }}>{p2Correct} bonne{p2Correct > 1 ? 's' : ''}</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: S(26), fontWeight: 900, color: !p1Won && !isTie ? MULTI_GOLD : '#FF6B1A' }}>{p2Correct}</div>
                  <div style={{ fontSize: S(10), color: 'rgba(255,255,255,0.5)' }}>bonne{p2Correct > 1 ? 's' : ''}</div>
                  <div style={{ fontSize: S(10), color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{formatTime(p2Time)}</div>
                </>
              )}
            </div>
          </div>

          <div style={{ fontSize: S(12), color: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>
            {challenge.category_label} · {isSpeedrun ? `Speedrun · palier ${challenge.question_count}` : '60s chrono'}
          </div>
        </div>

        {/* Actions */}
        <div style={{ flexShrink: 0, padding: `${S(8)} ${S(16)} ${S(14)}`, display: 'flex', flexDirection: 'column', gap: S(8) }}>
          <button
            onClick={() => {
              if (!opponentId) { navigate('/'); return }
              // Rematch avec le même variant/catégorie/palier
              startCreateDefi(opponentId, challenge.category_id || 'all', challenge.question_count || null, challenge.variant || 'rush')
              navigate('/')
            }}
            style={{ padding: `${S(14)} 0`, borderRadius: S(14), background: `linear-gradient(135deg, ${MULTI_VIOLET}, #4A1E63)`, color: 'white', border: '3px solid #ffffff', fontWeight: 900, fontSize: S(16), cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}
          >
            ⚔️ Défier {opponentName} à nouveau
          </button>
          <div style={{ display: 'flex', gap: S(8) }}>
            <button
              onClick={() => navigate(opponentId ? `/duels/${opponentId}` : '/')}
              style={{ flex: 1, padding: `${S(11)} 0`, borderRadius: S(12), background: 'rgba(255,255,255,0.08)', color: 'white', border: '3px solid #ffffff', fontWeight: 800, fontSize: S(13), cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}
            >
              📜 Historique
            </button>
            <button
              onClick={() => navigate('/')}
              style={{ flex: 1, padding: `${S(11)} 0`, borderRadius: S(12), background: 'transparent', color: 'rgba(255,255,255,0.7)', border: 'none', fontWeight: 700, fontSize: S(13), cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}
            >
              🏠 Accueil
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Pending — accept challenge
  const goQuickieCategory = () => {
    if (!challenge?.category_id || challenge.category_id === 'all') {
      navigate('/')
      return
    }
    sessionStorage.setItem('wtf_pending_quickie_cat', challenge.category_id)
    navigate('/')
  }

  const canAfford = (playerCoins ?? 0) >= ACCEPT_COST
  const hasEnoughFactsForAccept = playerFacts.length >= 5

  return (
    <div style={{ '--scale': scale, height: '100dvh', display: 'flex', flexDirection: 'column', background: `linear-gradient(160deg, #2a1050 0%, ${MULTI_VIOLET} 50%, #1a0a2e 100%)`, fontFamily: 'Nunito, sans-serif', padding: `${S(12)} ${S(16)} ${S(14)}`, overflow: 'hidden' }}>
      {/* Header nav : retour + icône Multi + solde */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: S(4) }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="Retour"
          style={{ width: S(36), height: S(36), borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none', color: 'white', fontSize: S(18), cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}
        >←</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: S(8) }}>
          <img src="/assets/modes/icon-multi.png" alt="Multi" style={{ width: S(24), height: S(24), objectFit: 'contain' }}
            onError={e => { e.target.style.display = 'none' }} />
          <span style={{ fontSize: S(12), fontWeight: 900, color: MULTI_GOLD, letterSpacing: '0.06em' }}>
            DÉFI · {challenge.variant === 'speedrun' ? 'SPEEDRUN' : 'RUSH'}
          </span>
        </div>
        <div style={{ fontSize: S(13), fontWeight: 900, color: MULTI_GOLD, display: 'flex', alignItems: 'center', gap: S(4) }}>
          {playerCoins ?? 0}
          <img src="/assets/ui/icon-coins.png" alt="" style={{ width: S(16), height: S(16) }} />
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: S(12), width: '100%', minHeight: 0 }}>
      <span style={{ fontSize: S(36) }}>⚔️</span>
      <h1 style={{ color: 'white', fontSize: S(22), fontWeight: 900, margin: 0, textAlign: 'center' }}>
        {challenge.player1_name} t'a défié !
      </h1>

      {/* Challenge card */}
      <div style={{ width: '100%', maxWidth: 340, borderRadius: S(16), padding: `${S(14)} ${S(14)}`, background: 'rgba(255,255,255,0.06)', border: `1px solid ${MULTI_VIOLET}80` }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: S(12) }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: S(10), color: 'rgba(255,255,255,0.5)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Catégorie</div>
            <div style={{ fontSize: S(13), fontWeight: 800, color: 'white' }}>{challenge.category_label}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: S(10), color: 'rgba(255,255,255,0.5)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Mode</div>
            <div style={{ fontSize: S(13), fontWeight: 800, color: 'white' }}>
              {challenge.variant === 'speedrun' ? 'Speedrun' : 'Rush 60s'}
            </div>
          </div>
        </div>
        {challenge.variant === 'speedrun' ? (
          <div style={{ textAlign: 'center', padding: `${S(10)} 0`, borderRadius: S(10), background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.3)' }}>
            <div style={{ fontSize: S(11), color: 'rgba(255,255,255,0.55)', marginBottom: 2 }}>⏱️ Temps à battre</div>
            <div style={{ fontSize: S(26), fontWeight: 900, color: '#00E5FF' }}>{formatTime(challenge.player1_time)}</div>
            <div style={{ fontSize: S(10), color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>palier {challenge.question_count}</div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: `${S(10)} 0`, borderRadius: S(10), background: 'rgba(255,215,0,0.1)', border: `1px solid ${MULTI_GOLD}4D` }}>
            <div style={{ fontSize: S(11), color: 'rgba(255,255,255,0.55)', marginBottom: 2 }}>🎯 Score à battre</div>
            <div style={{ fontSize: S(26), fontWeight: 900, color: MULTI_GOLD }}>
              {challenge.player1_correct ?? 0} bonne{(challenge.player1_correct ?? 0) > 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: S(10), color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>en 60s</div>
          </div>
        )}
      </div>

      {/* Rappel économie : mise 100c, gagnant +150c */}
      <div style={{ width: '100%', maxWidth: 340, borderRadius: S(10), padding: `${S(8)} ${S(12)}`, background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.25)', textAlign: 'center' }}>
        <div style={{ fontSize: S(11), color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>
          💰 Mise <span style={{ color: '#FCA5A5' }}>−{ACCEPT_COST}c</span> · Gagnant <span style={{ color: '#22C55E' }}>+{WIN_REWARD}c</span>
          <div style={{ fontSize: S(9), opacity: 0.65, marginTop: 2 }}>Égalité parfaite = chacun récupère sa mise</div>
        </div>
      </div>

      {/* Actions */}
      {!factsReady ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: S(13) }}>
          ⏳ Chargement de tes f*cts...
        </div>
      ) : !isConnected ? (
        <button
          onClick={signInWithGoogle}
          style={{ width: '100%', maxWidth: 340, padding: `${S(13)} 0`, borderRadius: S(12), background: '#fff', color: '#374151', border: 'none', fontWeight: 800, fontSize: S(14), cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}
        >
          Connecte-toi pour relever
        </button>
      ) : isSelf ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: S(13) }}>
          C'est ton propre défi ! Partage le code à un ami.
        </div>
      ) : playerFacts.length < 5 ? (
        <div style={{ width: '100%', maxWidth: 340, borderRadius: S(12), padding: `${S(14)} ${S(12)}`, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', textAlign: 'center' }}>
          <p style={{ color: 'white', fontSize: S(12), fontWeight: 800, margin: `0 0 ${S(8)}`, lineHeight: 1.4 }}>
            Tu n'as pas assez de f*cts {challenge.category_label} ({playerFacts.length}/5 requis)
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: S(6) }}>
            {challenge.category_id && challenge.category_id !== 'all' && (
              <button
                onClick={goQuickieCategory}
                style={{ padding: `${S(10)} ${S(12)}`, borderRadius: S(10), background: 'linear-gradient(135deg, #6BCB77, #4CAF50)', color: 'white', border: 'none', fontWeight: 900, fontSize: S(12), cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}
              >
                🧭 Débloquer via Quickie
              </button>
            )}
            <button
              onClick={handleDeclineOpen}
              style={{ padding: `${S(10)} ${S(12)}`, borderRadius: S(10), background: 'rgba(239,68,68,0.15)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.4)', fontWeight: 800, fontSize: S(12), cursor: 'pointer' }}
            >
              ✗ Refuser le défi
            </button>
          </div>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: S(8) }}>
          {playerFacts.length < (challenge?.question_count || 0) && (
            <div style={{ borderRadius: S(10), padding: `${S(8)} ${S(10)}`, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', textAlign: 'center' }}>
              <p style={{ color: '#F59E0B', fontSize: S(11), fontWeight: 700, margin: 0, lineHeight: 1.35 }}>
                ⚠️ Adapté à {playerFacts.length} questions ({challenge.question_count} demandées)
              </p>
            </div>
          )}
          {/* Boutons côte à côte : Refuser (rouge) à gauche · Accepter (vert) à droite */}
          <div style={{ display: 'flex', gap: S(8) }}>
            <button
              onClick={handleDeclineOpen}
              style={{
                flex: 1, padding: `${S(12)} 0`, borderRadius: S(14),
                background: 'rgba(239,68,68,0.12)', color: '#FCA5A5',
                border: '2px solid rgba(239,68,68,0.5)',
                fontWeight: 800, fontSize: S(13), cursor: 'pointer',
                fontFamily: 'Nunito, sans-serif',
              }}
            >
              ✗ Refuser
            </button>
            <button
              onClick={handleAcceptChallenge}
              disabled={!canAfford}
              style={{
                flex: 1.5, padding: `${S(12)} ${S(8)}`, borderRadius: S(14),
                background: canAfford ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.06)',
                color: canAfford ? '#86EFAC' : 'rgba(255,255,255,0.35)',
                border: canAfford ? '2px solid rgba(34,197,94,0.65)' : '2px solid rgba(255,255,255,0.15)',
                fontWeight: 900, fontSize: S(13), cursor: canAfford ? 'pointer' : 'not-allowed',
                fontFamily: 'Nunito, sans-serif',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(4),
              }}
            >
              <span>{canAfford ? `Accepter le défi : ${ACCEPT_COST}` : `${ACCEPT_COST} requis`}</span>
              {canAfford && <img src="/assets/ui/icon-coins.png" alt="" style={{ width: S(16), height: S(16) }} />}
            </button>
          </div>
        </div>
      )}

      {isExpired && (
        <div style={{ textAlign: 'center', color: '#EF4444', fontSize: S(12), fontWeight: 700 }}>
          Ce défi a expiré.
        </div>
      )}
      </div>

      {/* Modal confirmation acceptation (−100c débité immédiatement) */}
      {showAcceptModal && (
        <GameModal
          emoji="⚔️"
          title="Relever le défi ?"
          message={`Relève le défi pour ${ACCEPT_COST} coins. Remporte le défi et empoche les ${WIN_REWARD} coins de victoire`}
          confirmLabel={`Accepter : ${ACCEPT_COST}`}
          confirmIcon="/assets/ui/icon-coins.png"
          cancelLabel="Annuler"
          confirmColor="#22C55E"
          onConfirm={handleAcceptConfirm}
          onCancel={() => setShowAcceptModal(false)}
        />
      )}

      {/* Modal confirmation refus */}
      {showDeclineModal && (
        <GameModal
          emoji="✗"
          title="Refuser ce défi ?"
          message={`Le défi sera marqué comme refusé. ${challenge.player1_name} sera notifié. Tu peux toujours lui en lancer un autre plus tard.`}
          confirmLabel={declining ? 'Refus…' : 'Refuser'}
          cancelLabel="Annuler"
          danger
          onConfirm={handleDeclineConfirm}
          onCancel={() => setShowDeclineModal(false)}
        />
      )}
    </div>
  )
}
