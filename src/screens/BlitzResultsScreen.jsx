import { useState, useEffect } from 'react'
import { useScale } from '../hooks/useScale'
import { createChallenge } from '../data/challengeService'

export default function BlitzResultsScreen({
  finalTime = 0,
  correctCount = 0,
  totalAnswered = 0,
  penalties = 0,
  bestTime = null,
  isNewRecord = false,
  categoryId = null,
  categoryLabel = '',
  questionCount = 0,
  user = null,
  isChallengeMode = false,
  onHome,
  onReplay,
}) {
  const scale = useScale()
  const S = (px) => `calc(${px}px * var(--scale))`

  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0

  const [displayTime, setDisplayTime] = useState(0)
  const [challengeCreated, setChallengeCreated] = useState(null)
  const [autoChallenge, setAutoChallenge] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [copied, setCopied] = useState(false)

  // T+29 : Masquer "Défier un ami" si on vient d'un défi reçu
  const isFromChallenge = !!localStorage.getItem('wtf_active_challenge') || !!localStorage.getItem('wtf_auto_challenge')

  useEffect(() => {
    if (finalTime <= 0) return
    const duration = 1200, interval = 16, steps = duration / interval, increment = finalTime / steps
    let current = 0
    const timer = setInterval(() => {
      current = Math.min(current + increment, finalTime)
      setDisplayTime(current)
      if (current >= finalTime) clearInterval(timer)
    }, interval)
    return () => clearInterval(timer)
  }, [finalTime])

  const formatTime = (t) => {
    if (t < 60) return t.toFixed(2) + 's'
    const m = Math.floor(t / 60)
    const s = (t % 60).toFixed(2)
    return `${m}:${s.padStart(5, '0')}`
  }

  useEffect(() => {
    if (!isChallengeMode) return
    const handleCreated = () => {
      try {
        const challenge = JSON.parse(localStorage.getItem('wtf_auto_challenge') || 'null')
        if (challenge) {
          setAutoChallenge(challenge)
          localStorage.removeItem('wtf_auto_challenge')
        }
      } catch { /* ignore */ }
    }
    // Vérifier immédiatement (si déjà créé avant le mount)
    handleCreated()
    window.addEventListener('wtf_challenge_created', handleCreated)
    return () => window.removeEventListener('wtf_challenge_created', handleCreated)
  }, [isChallengeMode])

  const handleShareChallenge = () => {
    if (!autoChallenge) return
    const challengeUrl = `${window.location.origin}/challenge/${autoChallenge.code}`
    const text = `🎯 Défi WTF! Blitz !\n\n${questionCount} questions en ${finalTime.toFixed(2)}s. Tu fais mieux ? 😏\n\nRelève le défi :`
    if (navigator.share) {
      navigator.share({ title: 'Défi WTF! Blitz ⚡', text, url: challengeUrl }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(`${text}\n${challengeUrl}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const rank = accuracy === 100 && finalTime < 30 ? { emoji: '🏆', label: 'Légende Blitz !' }
    : accuracy === 100 ? { emoji: '⚡', label: 'Sans faute !' }
    : accuracy >= 80 ? { emoji: '🔥', label: 'Impressionnant !' }
    : accuracy >= 60 ? { emoji: '💪', label: 'Bien joué !' }
    : { emoji: '🎮', label: 'Continue comme ça !' }

  const handleCreateChallenge = async () => {
    if (!user || isCreating) return
    setIsCreating(true)
    try {
      const challenge = await createChallenge({
        categoryId: categoryId || 'all',
        categoryLabel: categoryLabel || 'Toutes catégories',
        questionCount,
        playerTime: finalTime,
        playerId: user.id,
        playerName: user.user_metadata?.name || 'Joueur WTF!',
      })
      setChallengeCreated(challenge)
      // Track challengesSent pour les trophées
      try {
        const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')
        wtfData.challengesSent = (wtfData.challengesSent || 0) + 1
        wtfData.lastModified = Date.now()
        localStorage.setItem('wtf_data', JSON.stringify(wtfData))
      } catch { /* ignore */ }
    } catch (e) {
      console.error('Challenge creation error:', e)
      alert('Erreur lors de la création du défi. Réessaie !')
    } finally {
      setIsCreating(false)
    }
  }

  const handleShare = () => {
    if (!challengeCreated) return
    const challengeUrl = `${window.location.origin}/challenge/${challengeCreated.code}`
    const text = `🎯 Défi WTF! Blitz !\n\n${questionCount} questions en ${finalTime.toFixed(2)}s. Tu fais mieux ? 😏\n\nRelève le défi :`
    if (navigator.share) {
      navigator.share({ title: 'Défi WTF! Blitz ⚡', text, url: challengeUrl }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(`${text}\n${challengeUrl}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCopyCode = () => {
    if (!challengeCreated) return
    navigator.clipboard?.writeText(challengeCreated.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isChallengeMode) {
    return (
      <div
        className="absolute inset-0 flex flex-col overflow-hidden"
        style={{ '--scale': scale, background: 'linear-gradient(160deg, #0A0F1E 0%, #1a0a35 100%)', fontFamily: 'Nunito, sans-serif' }}
      >
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8" style={{ gap: S(20) }}>
          <div style={{ fontSize: S(56) }}>🎯</div>
          <h1 style={{ fontSize: S(26), fontWeight: 900, color: 'white', textAlign: 'center' }}>
            {autoChallenge ? 'Défi créé !' : 'Création du défi...'}
          </h1>

          {/* Résumé du score */}
          <div className="rounded-3xl w-full p-5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', maxWidth: 340 }}>
            <div className="text-center mb-3">
              <span style={{ fontSize: S(40), fontWeight: 900, color: '#FF6B1A', fontVariantNumeric: 'tabular-nums' }}>{formatTime(finalTime)}</span>
            </div>
            <div className="flex justify-center gap-6">
              <div className="text-center">
                <span style={{ fontSize: S(16), fontWeight: 900, color: 'white' }}>{correctCount}/{totalAnswered}</span>
                <span style={{ fontSize: S(10), color: 'rgba(255,255,255,0.4)', display: 'block' }}>Bonnes réponses</span>
              </div>
              <div className="text-center">
                <span style={{ fontSize: S(16), fontWeight: 900, color: 'white' }}>{accuracy}%</span>
                <span style={{ fontSize: S(10), color: 'rgba(255,255,255,0.4)', display: 'block' }}>Précision</span>
              </div>
            </div>
          </div>

          {/* Bouton partager */}
          {autoChallenge ? (
            <button
              onClick={handleShareChallenge}
              className="w-full py-4 rounded-2xl font-black text-base active:scale-[0.97] transition-transform"
              style={{ background: 'linear-gradient(135deg, #FF6B1A, #D94A10)', color: 'white', fontSize: S(16), maxWidth: 340 }}
            >
              {copied ? '✅ Lien copié !' : '📤 Partager le défi'}
            </button>
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: S(14) }}>⏳ Envoi en cours...</div>
          )}

          {/* Bouton accueil */}
          <button
            onClick={onHome}
            className="w-full py-3 rounded-2xl font-bold text-sm active:scale-[0.97] transition-transform"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)', fontSize: S(14), maxWidth: 340 }}
          >
            🏠 Revenir à l'accueil
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-auto"
      style={{ '--scale': scale, background: 'linear-gradient(160deg, #0A0F1E 0%, #1a0a35 100%)', fontFamily: 'Nunito, sans-serif' }}
    >
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8" style={{ gap: S(16) }}>

        <div style={{ fontSize: S(56) }}>{rank.emoji}</div>
        <h1 style={{ fontSize: S(26), fontWeight: 900, color: 'white', textAlign: 'center' }}>{rank.label}</h1>

        {isNewRecord && (
          <div className="rounded-2xl w-full py-3 text-center" style={{
            background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,165,0,0.25))',
            border: '2px solid rgba(255,215,0,0.5)', animation: 'blitzRecordPulse 1.5s ease-in-out infinite',
          }}>
            <span style={{ fontSize: S(16), fontWeight: 900, color: '#FFD700' }}>🎉 NOUVEAU RECORD !</span>
          </div>
        )}

        {/* Time */}
        <div className="rounded-3xl w-full p-5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="text-center mb-3">
            <span style={{ fontSize: S(14), color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>⏱️ Temps final</span>
          </div>
          <div className="text-center mb-3">
            <span style={{ fontSize: S(48), fontWeight: 900, color: '#FF6B1A', fontVariantNumeric: 'tabular-nums' }}>{formatTime(displayTime)}</span>
          </div>
          <div className="flex justify-center gap-6">
            <div className="text-center">
              <span style={{ fontSize: S(16), fontWeight: 900, color: 'white', display: 'block' }}>{correctCount}/{totalAnswered}</span>
              <span style={{ fontSize: S(10), color: 'rgba(255,255,255,0.4)' }}>Bonnes réponses</span>
            </div>
            <div className="text-center">
              <span style={{ fontSize: S(16), fontWeight: 900, color: 'white', display: 'block' }}>{accuracy}%</span>
              <span style={{ fontSize: S(10), color: 'rgba(255,255,255,0.4)' }}>Précision</span>
            </div>
            {penalties > 0 && (
              <div className="text-center">
                <span style={{ fontSize: S(16), fontWeight: 900, color: '#EF4444', display: 'block' }}>+{penalties}s</span>
                <span style={{ fontSize: S(10), color: 'rgba(255,255,255,0.4)' }}>Pénalités</span>
              </div>
            )}
          </div>
        </div>

        {bestTime !== null && (
          <div className="rounded-2xl w-full p-4 flex items-center justify-between" style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)' }}>
            <span style={{ fontSize: S(14), fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>🏆 Ton record</span>
            <span style={{ fontSize: S(20), fontWeight: 900, color: '#FFD700' }}>{formatTime(bestTime)}</span>
          </div>
        )}

        {/* Challenge created — share screen */}
        {challengeCreated ? (
          <div className="w-full rounded-2xl p-5" style={{ background: 'rgba(255,107,26,0.1)', border: '1px solid rgba(255,107,26,0.3)' }}>
            <div className="text-center mb-3">
              <span style={{ fontSize: S(18), fontWeight: 900, color: '#FF6B1A' }}>🎯 Défi créé !</span>
            </div>
            <div className="text-center mb-3">
              <span style={{
                fontSize: S(28), fontWeight: 900, color: 'white',
                background: 'rgba(0,0,0,0.3)', padding: '12px 20px', borderRadius: 12,
                display: 'inline-block', fontFamily: 'monospace', letterSpacing: 4,
              }}>
                {challengeCreated.code}
              </span>
            </div>
            <p className="text-center mb-4" style={{ fontSize: S(13), color: 'rgba(255,255,255,0.6)' }}>
              Partage ce code à ton ami !
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleShare}
                className="w-full py-3 rounded-2xl font-black text-sm active:scale-[0.97] transition-transform"
                style={{ background: '#FF6B1A', color: 'white', border: 'none', fontSize: S(14) }}
              >
                {copied ? '✅ Copié !' : '📤 Partager le défi'}
              </button>
              <button
                onClick={handleCopyCode}
                className="w-full py-3 rounded-2xl font-bold text-sm active:scale-[0.97] transition-transform"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)', fontSize: S(13) }}
              >
                📋 Copier le code
              </button>
            </div>
          </div>
        ) : null}

        {/* Action buttons */}
        <div className="w-full flex flex-col gap-3 mt-2">
          <button
            onClick={onReplay}
            className="w-full py-4 rounded-2xl font-black text-base active:scale-[0.97] transition-transform"
            style={{ background: 'linear-gradient(135deg, #FF6B1A, #D94A10)', color: 'white', fontSize: S(16) }}
          >
            ⚡ Rejouer en Blitz
          </button>
          {user && !challengeCreated && !isFromChallenge && (
            <button
              onClick={handleCreateChallenge}
              disabled={isCreating}
              className="w-full py-3 rounded-2xl font-bold text-sm active:scale-[0.97] transition-transform"
              style={{
                background: 'transparent', color: 'white',
                border: '2px solid rgba(255,255,255,0.4)', borderRadius: S(14),
                fontSize: S(14), opacity: isCreating ? 0.5 : 1,
              }}
            >
              {isCreating ? '⏳ Création...' : '🎯 Défier un ami'}
            </button>
          )}
          <button
            onClick={onHome}
            className="w-full py-3 rounded-2xl font-bold text-sm active:scale-[0.97] transition-transform"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)', fontSize: S(14) }}
          >
            Accueil
          </button>
        </div>
      </div>

      <style>{`
        @keyframes blitzRecordPulse {
          0%, 100% { box-shadow: 0 0 10px rgba(255,215,0,0.2); }
          50% { box-shadow: 0 0 25px rgba(255,215,0,0.4), 0 0 50px rgba(255,215,0,0.15); }
        }
      `}</style>
    </div>
  )
}
