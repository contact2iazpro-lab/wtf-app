import { useState, useEffect } from 'react'
import { useScale } from '../hooks/useScale'
import { createChallenge } from '../data/challengeService'
import { audio } from '../utils/audio'

export default function BlitzResultsScreen({
  finalTime = 0,
  correctCount = 0,
  totalAnswered = 0,
  bestTime = null,        // en Défi : nb bonnes max (legacy name, contient un score)
  bestScore = 0,          // en Solo : nb bonnes max
  variant = 'defi',
  isNewRecord = false,
  categoryId = null,
  categoryLabel = '',
  questionCount = 0,
  user = null,
  isChallengeMode = false,
  onHome,
  onReplay,
  opponentId = null,
  // DuelContext — résultat création async (remplace localStorage wtf_auto_challenge)
  autoChallenge = null,
  challengeError = null,
  onClearAutoChallenge,
}) {
  const scale = useScale()
  const S = (px) => `calc(${px}px * var(--scale))`

  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0

  const [displayTime, setDisplayTime] = useState(0)
  const [challengeCreated, setChallengeCreated] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [copied, setCopied] = useState(false)

  // Cleanup du résultat créé au unmount (handler stable via useCallback dans ScreenRenderer).
  useEffect(() => {
    return () => { onClearAutoChallenge?.() }
  }, [onClearAutoChallenge])

  // Bloc 3.6 — Vibration aux résultats Blitz : pattern long si record, court sinon
  useEffect(() => {
    audio.vibrate(isNewRecord ? [80, 50, 80, 50, 150] : [50])
  }, [isNewRecord])

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

  const handleShareChallenge = () => {
    if (!autoChallenge) return
    const challengeUrl = `${window.location.origin}/challenge/${autoChallenge.code}`
    const text = `🎯 Défi WTF! Blitz !\n\nJ'ai fait ${correctCount} bonne${correctCount > 1 ? 's' : ''} réponse${correctCount > 1 ? 's' : ''} en 60s. Tu fais mieux ? 😏\n\nRelève le défi :`
    if (navigator.share) {
      navigator.share({ title: 'Défi WTF! Blitz ⚡', text, url: challengeUrl }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(`${text}\n${challengeUrl}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Rang basé sur le nb de bonnes réponses en 60s (spec best-score 19/04/2026)
  const rank = correctCount >= 30 ? { emoji: '🏆', label: 'Légende Blitz !' }
    : correctCount >= 20 ? { emoji: '⚡', label: 'Impressionnant !' }
    : correctCount >= 10 ? { emoji: '🔥', label: 'Bien joué !' }
    : correctCount >= 5  ? { emoji: '💪', label: 'Continue !' }
    : { emoji: '🎮', label: 'Entraîne-toi !' }

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
      setChallengeCreated({ error: true })
    } finally {
      setIsCreating(false)
    }
  }

  const handleShare = () => {
    if (!challengeCreated) return
    const challengeUrl = `${window.location.origin}/challenge/${challengeCreated.code}`
    const text = `🎯 Défi WTF! Blitz !\n\nJ'ai fait ${correctCount} bonne${correctCount > 1 ? 's' : ''} réponse${correctCount > 1 ? 's' : ''} en 60s. Tu fais mieux ? 😏\n\nRelève le défi :`
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

  // ─── Vue Blitz Rush (ex-Solo) : score = bonnes réponses en 60s + record ───
  if (variant === 'rush' || variant === 'solo') {
    const soloRank = correctCount >= 100 ? { emoji: '👑', label: 'Légende Blitz !' }
      : correctCount >= 50 ? { emoji: '🏆', label: 'Maître du Blitz' }
      : correctCount >= 30 ? { emoji: '🔥', label: 'Impressionnant !' }
      : correctCount >= 20 ? { emoji: '⚡', label: 'Sacré rythme !' }
      : correctCount >= 10 ? { emoji: '💪', label: 'Bien joué' }
      : correctCount >= 5  ? { emoji: '🎯', label: 'Bon début' }
      : { emoji: '🎮', label: 'Continue comme ça' }

    const handleShareSolo = () => {
      const text = `⚡ J'ai fait ${correctCount} bonnes réponses en 60s au Blitz Solo WTF! Tu fais mieux ?`
      const url = window.location.origin
      if (navigator.share) {
        navigator.share({ title: 'Blitz Solo WTF! ⚡', text, url }).catch(() => {})
      } else {
        navigator.clipboard?.writeText(`${text}\n${url}`)
      }
    }

    return (
      <div
        className="absolute inset-0 flex flex-col overflow-hidden"
        style={{ '--scale': scale, background: 'linear-gradient(160deg, #1a0a2e 0%, #3a0a4e 100%)', fontFamily: 'Nunito, sans-serif' }}
      >
        <div className="flex-1 flex flex-col items-center justify-center px-6 pt-4 pb-2 min-h-0" style={{ gap: S(14) }}>
          <div style={{ fontSize: S(56) }}>{soloRank.emoji}</div>
          <h1 style={{ fontSize: S(22), fontWeight: 900, color: 'white', textAlign: 'center' }}>{soloRank.label}</h1>

          {isNewRecord && (
            <div className="rounded-2xl w-full py-3 text-center" style={{
              background: 'linear-gradient(135deg, rgba(255,215,0,0.25), rgba(255,165,0,0.3))',
              border: '2px solid rgba(255,215,0,0.6)', animation: 'blitzRecordPulse 1.5s ease-in-out infinite',
              maxWidth: 340,
            }}>
              <span style={{ fontSize: S(16), fontWeight: 900, color: '#FFD700' }}>🎉 NOUVEAU RECORD !</span>
            </div>
          )}

          <div className="rounded-3xl w-full p-6" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', maxWidth: 340 }}>
            <div className="text-center" style={{ marginBottom: S(6) }}>
              <span style={{ fontSize: S(12), color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Bonnes réponses en 60s</span>
            </div>
            <div className="text-center">
              <span style={{ fontSize: S(96), fontWeight: 900, color: '#FFD700', lineHeight: 1, fontVariantNumeric: 'tabular-nums', textShadow: '0 4px 20px rgba(255,215,0,0.3)' }}>
                {correctCount}
              </span>
            </div>
          </div>

          <div className="rounded-2xl w-full p-4 flex items-center justify-between" style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)', maxWidth: 340 }}>
            <span style={{ fontSize: S(14), fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>🏆 Ton record</span>
            <span style={{ fontSize: S(20), fontWeight: 900, color: '#FFD700' }}>{Math.max(bestScore, correctCount)}</span>
          </div>
        </div>

        <div className="shrink-0 w-full px-6 pb-4 pt-2 flex flex-col gap-2">
          <button
            onClick={onReplay}
            className="w-full py-3 rounded-2xl font-black text-base active:scale-[0.97] transition-transform"
            style={{ background: 'linear-gradient(135deg, #FF6B1A, #D94A10)', color: 'white', fontSize: S(16) }}
          >
            ⚡ Rejouer
          </button>
          <button
            onClick={handleShareSolo}
            className="w-full py-2.5 rounded-2xl font-bold text-sm"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '2px solid rgba(255,255,255,0.3)', fontSize: S(14) }}
          >
            📤 Partager
          </button>
          <button
            onClick={onHome}
            className="w-full py-2 rounded-2xl font-bold text-sm"
            style={{ background: 'transparent', color: 'rgba(255,255,255,0.7)', border: 'none', fontSize: S(13) }}
          >
            🏠 Accueil
          </button>
        </div>

        <style>{`
          @keyframes blitzRecordPulse {
            0%, 100% { transform: scale(1) }
            50% { transform: scale(1.03) }
          }
        `}</style>
      </div>
    )
  }

  // ─── Vue Blitz Speedrun : record = temps final par palier ──────────────
  if (variant === 'speedrun') {
    const speedrunRank = finalTime < 30 ? { emoji: '👑', label: 'Vitesse lumière !' }
      : finalTime < 60 ? { emoji: '🏆', label: 'Ultra-rapide' }
      : finalTime < 120 ? { emoji: '⚡', label: 'Rapide' }
      : finalTime < 180 ? { emoji: '🔥', label: 'Bien joué' }
      : { emoji: '🎮', label: 'Continue à t\'entraîner' }

    const formatSpeedrunTime = (t) => {
      if (t < 60) return `${t.toFixed(2)}s`
      const m = Math.floor(t / 60)
      const s = (t % 60).toFixed(2)
      return `${m}:${s.padStart(5, '0')}`
    }

    return (
      <div
        className="absolute inset-0 flex flex-col overflow-hidden"
        style={{ '--scale': scale, background: 'linear-gradient(160deg, #0a2e3e 0%, #1a5060 50%, #0a2e3e 100%)', fontFamily: 'Nunito, sans-serif' }}
      >
        <div className="flex-1 flex flex-col items-center justify-center px-6 pt-4 pb-2 min-h-0" style={{ gap: S(14) }}>
          <div style={{ fontSize: S(56) }}>{speedrunRank.emoji}</div>
          <h1 style={{ fontSize: S(22), fontWeight: 900, color: 'white', textAlign: 'center' }}>{speedrunRank.label}</h1>

          {isNewRecord && (
            <div className="rounded-2xl w-full py-3 text-center" style={{
              background: 'linear-gradient(135deg, rgba(0,229,255,0.25), rgba(0,151,167,0.3))',
              border: '2px solid rgba(0,229,255,0.6)', animation: 'blitzRecordPulse 1.5s ease-in-out infinite',
              maxWidth: 340,
            }}>
              <span style={{ fontSize: S(16), fontWeight: 900, color: '#00E5FF' }}>🎉 NOUVEAU RECORD !</span>
            </div>
          )}

          <div className="rounded-3xl w-full p-6" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', maxWidth: 340 }}>
            <div className="text-center" style={{ marginBottom: S(6) }}>
              <span style={{ fontSize: S(12), color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
                Temps final · palier {totalAnswered}
              </span>
            </div>
            <div className="text-center">
              <span style={{ fontSize: S(72), fontWeight: 900, color: '#00E5FF', lineHeight: 1, fontVariantNumeric: 'tabular-nums', textShadow: '0 4px 20px rgba(0,229,255,0.3)' }}>
                {formatSpeedrunTime(finalTime)}
              </span>
            </div>
            <div className="text-center" style={{ marginTop: S(8) }}>
              <span style={{ fontSize: S(12), color: 'rgba(255,255,255,0.5)' }}>
                {correctCount} / {totalAnswered} bonnes · {categoryLabel || 'Catégorie'}
              </span>
            </div>
          </div>

          {bestTime !== null && bestTime !== undefined && (
            <div className="rounded-2xl w-full p-4 flex items-center justify-between" style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', maxWidth: 340 }}>
              <span style={{ fontSize: S(14), fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>🏆 Ton record</span>
              <span style={{ fontSize: S(20), fontWeight: 900, color: '#00E5FF' }}>{formatSpeedrunTime(bestTime)}</span>
            </div>
          )}
        </div>

        <div className="shrink-0 w-full px-6 pb-4 pt-2 flex flex-col gap-2">
          <button
            onClick={onReplay}
            className="w-full py-3 rounded-2xl font-black text-base active:scale-[0.97] transition-transform"
            style={{ background: 'linear-gradient(135deg, #00E5FF, #0097A7)', color: 'white', fontSize: S(16) }}
          >
            ⚡ Rejouer
          </button>
          <button
            onClick={onHome}
            className="w-full py-2 rounded-2xl font-bold text-sm"
            style={{ background: 'transparent', color: 'rgba(255,255,255,0.7)', border: 'none', fontSize: S(13) }}
          >
            🏠 Accueil
          </button>
        </div>

        <style>{`
          @keyframes blitzRecordPulse {
            0%, 100% { transform: scale(1) }
            50% { transform: scale(1.03) }
          }
        `}</style>
      </div>
    )
  }

  if (isChallengeMode) {
    return (
      <div
        className="absolute inset-0 flex flex-col overflow-hidden"
        style={{ '--scale': scale, background: 'linear-gradient(160deg, #7b6b8a 0%, #9d8bab 40%, #b5a5c2 70%, #7b6b8a 100%)', fontFamily: 'Nunito, sans-serif' }}
      >
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8" style={{ gap: S(20) }}>
          <div style={{ fontSize: S(56) }}>🎯</div>
          <h1 style={{ fontSize: S(26), fontWeight: 900, color: 'white', textAlign: 'center' }}>
            {autoChallenge ? 'Défi créé !' : 'Création du défi...'}
          </h1>

          {/* Résumé du score (Défi best-score 19/04/2026) */}
          <div className="rounded-3xl w-full p-5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', maxWidth: 340 }}>
            <div className="text-center mb-3">
              <span style={{ fontSize: S(48), fontWeight: 900, color: '#FFD700', fontVariantNumeric: 'tabular-nums' }}>{correctCount}</span>
              <span style={{ fontSize: S(14), color: 'rgba(255,255,255,0.5)', fontWeight: 700, display: 'block', marginTop: 4 }}>bonne{correctCount > 1 ? 's' : ''} en 60s</span>
            </div>
            <div className="flex justify-center gap-6">
              <div className="text-center">
                <span style={{ fontSize: S(16), fontWeight: 900, color: 'white' }}>{totalAnswered}</span>
                <span style={{ fontSize: S(10), color: 'rgba(255,255,255,0.4)', display: 'block' }}>Répondues</span>
              </div>
              <div className="text-center">
                <span style={{ fontSize: S(16), fontWeight: 900, color: 'white' }}>{accuracy}%</span>
                <span style={{ fontSize: S(10), color: 'rgba(255,255,255,0.4)', display: 'block' }}>Précision</span>
              </div>
            </div>
          </div>

          {/* Bouton partager / état — caché si défi lancé depuis ami (opponentId existe) */}
          {autoChallenge && opponentId ? (
            <div style={{
              color: '#22C55E', fontSize: S(14), textAlign: 'center', padding: '12px 16px',
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: 12, maxWidth: 340, fontWeight: 700,
            }}>
              ✅ Défi envoyé à ton ami !
            </div>
          ) : autoChallenge ? (
            <>
              <div style={{
                fontSize: S(13), fontWeight: 700, color: 'white',
                background: 'rgba(0,0,0,0.3)', padding: '10px 16px', borderRadius: 12,
                fontFamily: 'monospace', letterSpacing: 3, textAlign: 'center',
                maxWidth: 340, width: '100%',
              }}>
                Code : <span style={{ fontSize: S(18), color: '#FFD700' }}>{autoChallenge.code}</span>
              </div>
              <button
                onClick={handleShareChallenge}
                className="w-full py-4 rounded-2xl font-black text-base active:scale-[0.97] transition-transform"
                style={{ background: 'linear-gradient(135deg, #FF6B1A, #D94A10)', color: 'white', fontSize: S(16), maxWidth: 340 }}
              >
                {copied ? '✅ Lien copié !' : '📤 Partager le défi'}
              </button>
            </>
          ) : challengeError ? (
            <div style={{
              color: '#EF4444', fontSize: S(13), textAlign: 'center', padding: '12px 16px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 12, maxWidth: 340,
            }}>
              ❌ Erreur création défi<br />
              <span style={{ fontSize: S(11), opacity: 0.8 }}>{challengeError}</span>
            </div>
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: S(14) }}>⏳ Création en cours...</div>
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
      className="absolute inset-0 flex flex-col overflow-hidden"
      style={{ '--scale': scale, background: 'linear-gradient(160deg, #7b6b8a 0%, #9d8bab 40%, #b5a5c2 70%, #7b6b8a 100%)', fontFamily: 'Nunito, sans-serif' }}
    >
      {/* Bloc 3.4 — fullscreen sans scroll : header centré + actions pinées en bas */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-4 pb-2 min-h-0" style={{ gap: S(10) }}>

        <div style={{ fontSize: S(48) }}>{rank.emoji}</div>
        <h1 style={{ fontSize: S(22), fontWeight: 900, color: 'white', textAlign: 'center' }}>{rank.label}</h1>

        {isNewRecord && (
          <div className="rounded-2xl w-full py-3 text-center" style={{
            background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,165,0,0.25))',
            border: '2px solid rgba(255,215,0,0.5)', animation: 'blitzRecordPulse 1.5s ease-in-out infinite',
          }}>
            <span style={{ fontSize: S(16), fontWeight: 900, color: '#FFD700' }}>🎉 NOUVEAU RECORD !</span>
          </div>
        )}

        {/* Score (best-score 19/04/2026) */}
        <div className="rounded-3xl w-full p-5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="text-center mb-3">
            <span style={{ fontSize: S(14), color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>🎯 Score final</span>
          </div>
          <div className="text-center mb-3">
            <span style={{ fontSize: S(56), fontWeight: 900, color: '#FFD700', fontVariantNumeric: 'tabular-nums' }}>{correctCount}</span>
            <span style={{ fontSize: S(14), color: 'rgba(255,255,255,0.5)', fontWeight: 700, display: 'block', marginTop: 4 }}>bonne{correctCount > 1 ? 's' : ''} en 60s</span>
          </div>
          <div className="flex justify-center gap-6">
            <div className="text-center">
              <span style={{ fontSize: S(16), fontWeight: 900, color: 'white', display: 'block' }}>{totalAnswered}</span>
              <span style={{ fontSize: S(10), color: 'rgba(255,255,255,0.4)' }}>Répondues</span>
            </div>
            <div className="text-center">
              <span style={{ fontSize: S(16), fontWeight: 900, color: 'white', display: 'block' }}>{accuracy}%</span>
              <span style={{ fontSize: S(10), color: 'rgba(255,255,255,0.4)' }}>Précision</span>
            </div>
          </div>
        </div>

        {bestTime !== null && bestTime > 0 && (
          <div className="rounded-2xl w-full p-4 flex items-center justify-between" style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)' }}>
            <span style={{ fontSize: S(14), fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>🏆 Ton record</span>
            <span style={{ fontSize: S(20), fontWeight: 900, color: '#FFD700' }}>{bestTime} bonnes</span>
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

      </div>

      {/* Bloc 3.4 — Action buttons pinés en bas (toujours visibles) */}
      <div className="shrink-0 w-full px-6 pb-4 pt-2 flex flex-col gap-2">
        <button
          onClick={onReplay}
          className="w-full py-3 rounded-2xl font-black text-base active:scale-[0.97] transition-transform"
          style={{ background: 'linear-gradient(135deg, #FF6B1A, #D94A10)', color: 'white', fontSize: S(16) }}
        >
          ⚡ Rejouer en Blitz
        </button>
        {user && !challengeCreated && !opponentId && (
          <button
            onClick={handleCreateChallenge}
            disabled={isCreating}
            className="w-full py-2.5 rounded-2xl font-bold text-sm active:scale-[0.97] transition-transform"
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
          className="w-full py-2.5 rounded-2xl font-bold text-sm active:scale-[0.97] transition-transform"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)', fontSize: S(14) }}
        >
          🏠 Accueil
        </button>
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
