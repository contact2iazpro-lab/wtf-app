import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useScale } from '../hooks/useScale'
import { useAuth } from '../context/AuthContext'
import { getChallenge } from '../data/challengeService'
import { getBlitzFacts, initFacts } from '../data/factsService'
import { getAnswerOptions } from '../utils/answers'
import { shuffle } from '../utils/shuffle'
import { audio } from '../utils/audio'
import { useDuelContext } from '../features/duels/context/DuelContext'

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
  const { startAcceptDefi } = useDuelContext()

  const [challenge, setChallenge] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [factsReady, setFactsReady] = useState(false)

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
  useEffect(() => {
    if (!isCompleted || !user || !challenge) return
    const p1Won = challenge.player1_time <= challenge.player2_time
    const meIsP1 = challenge.player1_id === user.id
    const meWon = (meIsP1 && p1Won) || (!meIsP1 && !p1Won)
    audio.vibrate(meWon ? [80, 50, 80, 50, 150] : [40])
  }, [isCompleted, user, challenge])

  const handleAcceptChallenge = () => {
    // Gate minimum : il faut au moins 4 f*cts pour qu'un Blitz ait du sens.
    // Si playerFacts.length < question_count mais >= 4, on joue en mode
    // "adapté" (le défi tourne sur le nb de f*cts dispo). La gate ancienne
    // `!hasEnoughFacts` bloquait ce cas et laissait le bouton sans effet.
    if (!user || !challenge || playerFacts.length < 4) return
    audio.play('click')

    // Prepare facts for the Blitz
    const shuffled = shuffle(playerFacts)
      .slice(0, Math.min(challenge.question_count, playerFacts.length))
    const factsWithOptions = shuffled.map(f => ({ ...f, ...getAnswerOptions(f, { id: 'blitz', choices: 4 }) }))

    // Nouveau : passer par le DuelContext en mémoire. Plus de localStorage
    // pour transférer le state entre routes.
    startAcceptDefi(challenge, factsWithOptions)
    navigate('/')
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

  // Completed — show results
  if (isCompleted) {
    const p1Won = challenge.player1_time <= challenge.player2_time
    return (
      <div style={{ '--scale': scale, height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: S(16), background: 'linear-gradient(160deg, #1a0a2e, #0a0a3e)', fontFamily: 'Nunito, sans-serif', padding: 20 }}>
        <span style={{ fontSize: S(48) }}>🏆</span>
        <h1 style={{ color: 'white', fontSize: S(24), fontWeight: 900, margin: 0, textAlign: 'center' }}>Résultat du défi !</h1>
        <div style={{ width: '100%', maxWidth: 340, display: 'flex', gap: 12 }}>
          {/* Player 1 */}
          <div style={{
            flex: 1, borderRadius: 16, padding: '16px 12px', textAlign: 'center',
            background: p1Won ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.06)',
            border: p1Won ? '2px solid #FFD700' : '1px solid rgba(255,255,255,0.1)',
          }}>
            {p1Won && <div style={{ fontSize: 12, fontWeight: 900, color: '#FFD700', marginBottom: 4 }}>⭐ GAGNANT</div>}
            <div style={{ fontSize: 14, fontWeight: 800, color: 'white', marginBottom: 8 }}>{challenge.player1_name}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: p1Won ? '#FFD700' : '#FF6B1A' }}>{formatTime(challenge.player1_time)}</div>
          </div>
          {/* VS */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: 'rgba(255,255,255,0.4)' }}>VS</span>
          </div>
          {/* Player 2 */}
          <div style={{
            flex: 1, borderRadius: 16, padding: '16px 12px', textAlign: 'center',
            background: !p1Won ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.06)',
            border: !p1Won ? '2px solid #FFD700' : '1px solid rgba(255,255,255,0.1)',
          }}>
            {!p1Won && <div style={{ fontSize: 12, fontWeight: 900, color: '#FFD700', marginBottom: 4 }}>⭐ GAGNANT</div>}
            <div style={{ fontSize: 14, fontWeight: 800, color: 'white', marginBottom: 8 }}>{challenge.player2_name}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: !p1Won ? '#FFD700' : '#FF6B1A' }}>{formatTime(challenge.player2_time)}</div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
          {challenge.category_label} · {challenge.question_count} questions
        </div>
        <button
          onClick={() => {
            const opponentId = user && challenge.player1_id === user.id ? challenge.player2_id : challenge.player1_id
            navigate(opponentId ? `/duels/${opponentId}` : '/')
          }}
          style={{ marginTop: 8, padding: '14px 40px', borderRadius: 14, background: '#FF6B1A', color: 'white', border: 'none', fontWeight: 900, fontSize: 16, cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}
        >
          Historique
        </button>
      </div>
    )
  }

  // Pending — accept challenge
  const goExplorerCategory = () => {
    if (!challenge?.category_id || challenge.category_id === 'all') {
      navigate('/')
      return
    }
    sessionStorage.setItem('wtf_pending_explorer_cat', challenge.category_id)
    navigate('/')
  }

  return (
    <div style={{ '--scale': scale, height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: S(16), background: 'linear-gradient(160deg, #1a0a2e, #0a0a3e)', fontFamily: 'Nunito, sans-serif', padding: 20, paddingTop: 16 }}>
      {/* Header nav : retour SocialPage + home accueil */}
      <div style={{ width: '100%', maxWidth: 420, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="Retour"
          style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: 18, cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}
        >
          ←
        </button>
        <button
          onClick={() => navigate('/')}
          aria-label="Accueil"
          style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: 16, cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}
        >
          🏠
        </button>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: S(16), width: '100%' }}>
      <span style={{ fontSize: S(40) }}>🎯</span>
      <h1 style={{ color: 'white', fontSize: S(24), fontWeight: 900, margin: 0 }}>DÉFI WTF!</h1>

      {/* Challenge card */}
      <div style={{ width: '100%', maxWidth: 340, borderRadius: 20, padding: '20px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{challenge.player1_name} t'a défié !</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Catégorie</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'white' }}>{challenge.category_label}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Questions</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'white' }}>{challenge.question_count}</div>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '12px 0', borderRadius: 12, background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>⏱️ Temps à battre</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#FFD700' }}>{formatTime(challenge.player1_time)}</div>
        </div>
      </div>

      {/* Actions */}
      {!factsReady ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
          ⏳ Chargement de tes f*cts en cours...
        </div>
      ) : !isConnected ? (
        <button
          onClick={signInWithGoogle}
          style={{ width: '100%', maxWidth: 340, padding: '14px 0', borderRadius: 14, background: '#fff', color: '#374151', border: 'none', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'Nunito, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          Connecte-toi pour relever le défi
        </button>
      ) : isSelf ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
          C'est ton propre défi ! Partage le code à un ami.
        </div>
      ) : playerFacts.length < 4 ? (
        <div style={{ width: '100%', maxWidth: 340, borderRadius: 16, padding: '20px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', textAlign: 'center' }}>
          <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>😕</span>
          <p style={{ color: 'white', fontSize: 14, fontWeight: 800, margin: '0 0 8px', lineHeight: 1.4 }}>
            Tu n'as pas encore assez de f*cts {challenge.category_label} pour relever ce défi
          </p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '0 0 16px', lineHeight: 1.4 }}>
            Tu as {playerFacts.length} f*ct{playerFacts.length !== 1 ? 's' : ''} débloqué{playerFacts.length !== 1 ? 's' : ''} (minimum 4 requis).
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {challenge.category_id && challenge.category_id !== 'all' && (
              <button
                onClick={goExplorerCategory}
                style={{ padding: '12px 16px', borderRadius: 12, background: 'linear-gradient(135deg, #6BCB77, #4CAF50)', color: 'white', border: 'none', fontWeight: 900, fontSize: 13, cursor: 'pointer', fontFamily: 'Nunito, sans-serif', lineHeight: 1.3 }}
              >
                🧭 Explorer {challenge.category_label}
                <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.85, marginTop: 2 }}>Coûte 1 énergie</div>
              </button>
            )}
            <button
              onClick={() => navigate('/')}
              style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}
            >
              🏠 Retour à l'accueil
            </button>
          </div>
        </div>
      ) : playerFacts.length < (challenge?.question_count || 0) ? (
        <div style={{ width: '100%', maxWidth: 340 }}>
          <div style={{ borderRadius: 16, padding: '16px 14px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', textAlign: 'center', marginBottom: 12 }}>
            <p style={{ color: '#F59E0B', fontSize: 13, fontWeight: 700, margin: 0, lineHeight: 1.4 }}>
              ⚠️ Tu as {playerFacts.length} f*cts {challenge.category_label} débloqués (le défi en demande {challenge.question_count}).
              Le défi sera adapté à {playerFacts.length} questions.
            </p>
          </div>
          <button
            onClick={handleAcceptChallenge}
            style={{ width: '100%', padding: '16px 0', borderRadius: 14, background: 'linear-gradient(135deg, #FF6B1A, #D94A10)', color: 'white', border: 'none', fontWeight: 900, fontSize: 18, cursor: 'pointer', fontFamily: 'Nunito, sans-serif', boxShadow: '0 4px 20px rgba(255,107,26,0.4)' }}
          >
            Relever le défi ! 🚀
          </button>
        </div>
      ) : (
        <button
          onClick={handleAcceptChallenge}
          style={{ width: '100%', maxWidth: 340, padding: '16px 0', borderRadius: 14, background: 'linear-gradient(135deg, #FF6B1A, #D94A10)', color: 'white', border: 'none', fontWeight: 900, fontSize: 18, cursor: 'pointer', fontFamily: 'Nunito, sans-serif', boxShadow: '0 4px 20px rgba(255,107,26,0.4)' }}
        >
          Relever le défi ! 🚀
        </button>
      )}

      {isExpired && (
        <div style={{ textAlign: 'center', color: '#EF4444', fontSize: 13, fontWeight: 700 }}>
          Ce défi a expiré.
        </div>
      )}
      </div>
    </div>
  )
}
