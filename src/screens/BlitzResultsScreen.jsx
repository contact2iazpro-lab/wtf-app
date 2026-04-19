import { useState, useEffect, useMemo } from 'react'
import { useScale } from '../hooks/useScale'
import { createChallenge } from '../data/challengeService'
import { audio } from '../utils/audio'
import { CATEGORIES } from '../data/facts'
import FallbackImage from '../components/FallbackImage'
import FactDetailView from '../components/FactDetailView'
import FeaturedFactCard from '../components/results/FeaturedFactCard'

// ─── Miniatures facts session Blitz (format Quickie/VoF, 10 max par ligne) ─────
function BlitzSessionMiniatures({ sessionAnswers, globalUnlocked, setViewingFact, S }) {
  const answered = sessionAnswers.map((entry, i) => ({
    fact: entry.fact || entry,
    wasCorrect: entry.wasCorrect ?? false,
    idx: i,
  })).filter(a => a.fact)
  const right = answered.filter(a => a.wasCorrect)
  const wrong = answered.filter(a => !a.wasCorrect)

  const renderRow = (items, label, color) => items.length > 0 && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: S(4) }}>
      <span style={{ fontSize: S(10), fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: S(3), width: '100%' }}>
        {items.map(({ fact, wasCorrect, idx }) => {
          const fc = CATEGORIES.find(c => c.id === fact.category)
          const fcColor = fc?.color || '#FF4444'
          const isUnlocked = globalUnlocked.has(fact.id)
          const isDiscovered = wasCorrect === true
          const handleClick = () => {
            audio.play?.('click')
            setViewingFact({ ...fact, _isLocked: !isUnlocked })
          }
          return (
            <div key={`${idx}-${fact.id}`} style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
              onClick={handleClick}>
              <div style={{
                aspectRatio: '1', borderRadius: `${S(8)} ${S(8)} 0 0`, overflow: 'hidden', position: 'relative',
                border: `2px solid ${fcColor}`, borderBottom: 'none',
                background: `linear-gradient(135deg, ${fcColor}44, ${fcColor})`,
              }}>
                {fact.imageUrl ? (
                  <img src={fact.imageUrl} alt="" style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    filter: isDiscovered ? 'none' : 'blur(4px) brightness(0.45)',
                  }} onError={e => { e.target.style.display = 'none' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', filter: isDiscovered ? 'none' : 'blur(4px) brightness(0.45)' }}>
                    <FallbackImage categoryColor={fcColor} />
                  </div>
                )}
                {!isDiscovered && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: S(16), filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }}>🔒</span>
                  </div>
                )}
                {isDiscovered && !isUnlocked && (
                  <div style={{ position: 'absolute', top: 2, left: 2, background: 'rgba(0,0,0,0.55)', borderRadius: '50%', width: S(14), height: S(14), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: S(9), opacity: 0.9 }}>🔒</span>
                  </div>
                )}
                <div style={{ position: 'absolute', top: 2, right: 2, width: S(12), height: S(12), borderRadius: '50%', background: wasCorrect ? '#6BCB77' : '#E84535', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: S(9), fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                  {wasCorrect ? '✓' : '✗'}
                </div>
              </div>
              <div style={{
                background: fcColor, borderRadius: `0 0 ${S(6)} ${S(6)}`,
                padding: `${S(2)} 0`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <img src={`/assets/categories/${fact.category}.png`} alt=""
                  style={{ width: S(12), height: S(12), borderRadius: S(3), objectFit: 'cover' }}
                  onError={e => { e.target.style.display = 'none' }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: S(8), width: '100%', maxWidth: 340 }}>
      {renderRow(right, `✅ ${right.length} Trouvé${right.length > 1 ? 's' : ''}`, '#6BCB77')}
      {renderRow(wrong, `❌ ${wrong.length} Manqué${wrong.length > 1 ? 's' : ''}`, '#E84535')}
    </div>
  )
}

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
  sessionAnswers = [],    // [{ fact, wasCorrect }, ...]
  palier = null,
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
  const [viewingFact, setViewingFact] = useState(null)
  const [extraUnlockedIds, setExtraUnlockedIds] = useState(() => new Set())

  // Set des f*cts déjà dans la collection (lu depuis localStorage)
  const globalUnlocked = useMemo(() => {
    try {
      const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      return new Set([...(wd.unlockedFacts || []), ...extraUnlockedIds])
    } catch { return new Set(extraUnlockedIds) }
  }, [extraUnlockedIds])

  // Fact le plus WTF : priorité VIP parmi les bien répondus, sinon dernier correct
  const featuredFact = useMemo(() => {
    const correct = sessionAnswers.filter(a => a.wasCorrect).map(a => a.fact).filter(Boolean)
    if (correct.length === 0) return null
    return correct.find(f => f.isVip) || correct[correct.length - 1]
  }, [sessionAnswers])

  const handleUnlockFact = (fact) => {
    if (!fact) return
    const cost = fact.isVip ? 250 : 50
    try {
      const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      const currentCoins = wd.wtfCoins || 0
      if (currentCoins < cost) {
        alert(`Il te faut ${cost} coins pour débloquer ce fact.`)
        return
      }
      wd.wtfCoins = currentCoins - cost
      const unlocked = wd.unlockedFacts || []
      if (!unlocked.includes(fact.id)) unlocked.push(fact.id)
      wd.unlockedFacts = unlocked
      wd.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(wd))
      window.dispatchEvent(new Event('wtf_storage_sync'))
      setExtraUnlockedIds(prev => { const n = new Set(prev); n.add(fact.id); return n })
      audio.play?.('correct')
    } catch { /* ignore */ }
  }

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
        {/* Header : icône Blitz + titre */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S(8), flexShrink: 0, paddingTop: S(12) }}>
          <img src="/assets/modes/icon-blitz.png" alt="Blitz" style={{ width: S(28), height: S(28), objectFit: 'contain' }} />
          <span style={{ fontSize: S(13), fontWeight: 900, color: '#FF4444' }}>Résultats — Blitz Rush</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-2 pt-2" style={{ display: 'flex', flexDirection: 'column', gap: S(10), alignItems: 'center' }}>
          <div style={{ fontSize: S(48) }}>{soloRank.emoji}</div>
          <h1 style={{ fontSize: S(20), fontWeight: 900, color: 'white', textAlign: 'center', margin: 0 }}>{soloRank.label}</h1>

          {isNewRecord && (
            <div className="rounded-2xl w-full py-2 text-center" style={{
              background: 'linear-gradient(135deg, rgba(255,215,0,0.25), rgba(255,165,0,0.3))',
              border: '2px solid rgba(255,215,0,0.6)', animation: 'blitzRecordPulse 1.5s ease-in-out infinite',
              maxWidth: 340,
            }}>
              <span style={{ fontSize: S(14), fontWeight: 900, color: '#FFD700' }}>🎉 NOUVEAU RECORD !</span>
            </div>
          )}

          <div className="rounded-3xl w-full p-4" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', maxWidth: 340 }}>
            <div className="text-center" style={{ marginBottom: S(2) }}>
              <span style={{ fontSize: S(11), color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Bonnes réponses en 60s</span>
            </div>
            <div className="text-center">
              <span style={{ fontSize: S(64), fontWeight: 900, color: '#FFD700', lineHeight: 1, fontVariantNumeric: 'tabular-nums', textShadow: '0 4px 20px rgba(255,215,0,0.3)' }}>
                {correctCount}
              </span>
            </div>
          </div>

          <div className="rounded-2xl w-full p-3 flex items-center justify-between" style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)', maxWidth: 340 }}>
            <span style={{ fontSize: S(12), fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>🏆 Ton record</span>
            <span style={{ fontSize: S(16), fontWeight: 900, color: '#FFD700' }}>{Math.max(bestScore, correctCount)}</span>
          </div>

          {/* Fact le plus WTF (parmi bien répondus) */}
          {featuredFact && (
            <div style={{ width: '100%', maxWidth: 340 }}>
              <FeaturedFactCard
                fact={featuredFact}
                fallbackColor="#FF4444"
                textColor="#ffffff"
                isQuickie={false}
                onClick={() => { audio.play?.('click'); setViewingFact({ ...featuredFact, _isLocked: !globalUnlocked.has(featuredFact.id) }) }}
              />
            </div>
          )}

          {/* Miniatures des facts répondus (format VoF/Quickie) */}
          {sessionAnswers.length > 0 && (
            <BlitzSessionMiniatures
              sessionAnswers={sessionAnswers}
              globalUnlocked={globalUnlocked}
              setViewingFact={setViewingFact}
              onUnlockRequest={handleUnlockFact}
              S={S}
            />
          )}
        </div>

        <div className="shrink-0 w-full px-6 pb-4 pt-2 flex flex-col gap-2">
          <button
            onClick={onReplay}
            className="w-full py-3 rounded-2xl font-black text-base active:scale-[0.97] transition-transform"
            style={{ background: 'linear-gradient(135deg, #FF4444, #CC0000)', color: 'white', fontSize: S(16), border: '3px solid #ffffff' }}
          >
            ⚡ Rejouer
          </button>
          <button
            onClick={handleShareSolo}
            className="w-full py-2.5 rounded-2xl font-bold text-sm"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '3px solid #ffffff', fontSize: S(14) }}
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

        {viewingFact && (
          <FactDetailView
            fact={viewingFact}
            onClose={() => setViewingFact(null)}
            onUnlockRequest={handleUnlockFact}
          />
        )}
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

    const handleShareSpeedrun = () => {
      const text = `⚡ J'ai bouclé ${totalAnswered} palier${totalAnswered > 1 ? 's' : ''} en ${formatSpeedrunTime(finalTime)} au Blitz Speedrun WTF! Tu fais mieux ?`
      const url = window.location.origin
      if (navigator.share) {
        navigator.share({ title: 'Blitz Speedrun WTF! ⚡', text, url }).catch(() => {})
      } else {
        navigator.clipboard?.writeText(`${text}\n${url}`)
      }
    }

    return (
      <div
        className="absolute inset-0 flex flex-col overflow-hidden"
        style={{ '--scale': scale, background: 'linear-gradient(160deg, #0a2e3e 0%, #1a5060 50%, #0a2e3e 100%)', fontFamily: 'Nunito, sans-serif' }}
      >
        {/* Header : icône Blitz + titre */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S(8), flexShrink: 0, paddingTop: S(12) }}>
          <img src="/assets/modes/icon-blitz.png" alt="Blitz" style={{ width: S(28), height: S(28), objectFit: 'contain' }} />
          <span style={{ fontSize: S(13), fontWeight: 900, color: '#00E5FF' }}>Résultats — Blitz Speedrun</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-2 pt-2" style={{ display: 'flex', flexDirection: 'column', gap: S(10), alignItems: 'center' }}>
          <div style={{ fontSize: S(48) }}>{speedrunRank.emoji}</div>
          <h1 style={{ fontSize: S(20), fontWeight: 900, color: 'white', textAlign: 'center', margin: 0 }}>{speedrunRank.label}</h1>

          {isNewRecord && (
            <div className="rounded-2xl w-full py-2 text-center" style={{
              background: 'linear-gradient(135deg, rgba(0,229,255,0.25), rgba(0,151,167,0.3))',
              border: '2px solid rgba(0,229,255,0.6)', animation: 'blitzRecordPulse 1.5s ease-in-out infinite',
              maxWidth: 340,
            }}>
              <span style={{ fontSize: S(14), fontWeight: 900, color: '#00E5FF' }}>🎉 NOUVEAU RECORD !</span>
            </div>
          )}

          <div className="rounded-3xl w-full p-4" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', maxWidth: 340 }}>
            <div className="text-center" style={{ marginBottom: S(2) }}>
              <span style={{ fontSize: S(11), color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
                Temps final · palier {totalAnswered}
              </span>
            </div>
            <div className="text-center">
              <span style={{ fontSize: S(56), fontWeight: 900, color: '#00E5FF', lineHeight: 1, fontVariantNumeric: 'tabular-nums', textShadow: '0 4px 20px rgba(0,229,255,0.3)' }}>
                {formatSpeedrunTime(finalTime)}
              </span>
            </div>
            <div className="text-center" style={{ marginTop: S(6) }}>
              <span style={{ fontSize: S(11), color: 'rgba(255,255,255,0.5)' }}>
                {correctCount} / {totalAnswered} bonnes · {categoryLabel || 'Catégorie'}
              </span>
            </div>
          </div>

          {bestTime !== null && bestTime !== undefined && (
            <div className="rounded-2xl w-full p-3 flex items-center justify-between" style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', maxWidth: 340 }}>
              <span style={{ fontSize: S(12), fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>🏆 Ton record</span>
              <span style={{ fontSize: S(16), fontWeight: 900, color: '#00E5FF' }}>{formatSpeedrunTime(bestTime)}</span>
            </div>
          )}

          {/* Fact le plus WTF (parmi bien répondus) */}
          {featuredFact && (
            <div style={{ width: '100%', maxWidth: 340 }}>
              <FeaturedFactCard
                fact={featuredFact}
                fallbackColor="#00E5FF"
                textColor="#ffffff"
                isQuickie={false}
                onClick={() => { audio.play?.('click'); setViewingFact({ ...featuredFact, _isLocked: !globalUnlocked.has(featuredFact.id) }) }}
              />
            </div>
          )}

          {/* Miniatures des facts répondus */}
          {sessionAnswers.length > 0 && (
            <BlitzSessionMiniatures
              sessionAnswers={sessionAnswers}
              globalUnlocked={globalUnlocked}
              setViewingFact={setViewingFact}
              onUnlockRequest={handleUnlockFact}
              S={S}
            />
          )}
        </div>

        <div className="shrink-0 w-full px-6 pb-4 pt-2 flex flex-col gap-2">
          <button
            onClick={onReplay}
            className="w-full py-3 rounded-2xl font-black text-base active:scale-[0.97] transition-transform"
            style={{ background: 'linear-gradient(135deg, #00E5FF, #0097A7)', color: 'white', fontSize: S(16), border: '3px solid #ffffff' }}
          >
            ⚡ Rejouer
          </button>
          <button
            onClick={handleShareSpeedrun}
            className="w-full py-2.5 rounded-2xl font-bold text-sm"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '3px solid #ffffff', fontSize: S(14) }}
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

        {viewingFact && (
          <FactDetailView
            fact={viewingFact}
            onClose={() => setViewingFact(null)}
            onUnlockRequest={handleUnlockFact}
          />
        )}
      </div>
    )
  }

  if (isChallengeMode) {
    const MULTI_VIOLET = '#6B2D8E'
    const MULTI_GOLD = '#FFD700'
    const isSpeedrunMulti = variant === 'speedrun'
    const scoreLabel = isSpeedrunMulti ? formatTime(finalTime) : `${correctCount}`
    const scoreUnit = isSpeedrunMulti
      ? `${correctCount} / ${totalAnswered} bonnes`
      : `bonne${correctCount > 1 ? 's' : ''} en 60s`

    return (
      <div
        className="absolute inset-0 flex flex-col overflow-hidden"
        style={{ '--scale': scale, background: `linear-gradient(160deg, #2a1050 0%, ${MULTI_VIOLET} 50%, #1a0a2e 100%)`, fontFamily: 'Nunito, sans-serif' }}
      >
        {/* Header : icône Multi + titre */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S(8), flexShrink: 0, paddingTop: S(12) }}>
          <img src="/assets/modes/icon-multi.png" alt="Multi" style={{ width: S(28), height: S(28), objectFit: 'contain' }}
            onError={e => { e.target.style.display = 'none' }} />
          <span style={{ fontSize: S(13), fontWeight: 900, color: MULTI_GOLD, letterSpacing: '0.06em' }}>
            Défi Multi · {isSpeedrunMulti ? 'Speedrun' : 'Rush'}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-2 pt-2" style={{ display: 'flex', flexDirection: 'column', gap: S(10), alignItems: 'center' }}>
          {/* État du défi */}
          <div style={{ fontSize: S(40) }}>
            {challengeError ? '❌' : autoChallenge ? '⚔️' : '⏳'}
          </div>
          <h1 style={{ fontSize: S(20), fontWeight: 900, color: 'white', textAlign: 'center', margin: 0 }}>
            {challengeError ? 'Erreur' : autoChallenge ? 'Défi envoyé !' : 'Création du défi...'}
          </h1>

          {/* Badge statut */}
          {autoChallenge && opponentId && !challengeError && (
            <div style={{
              fontSize: S(12), fontWeight: 800, color: '#22C55E',
              background: 'rgba(34,197,94,0.12)', border: '1.5px solid rgba(34,197,94,0.5)',
              padding: `${S(6)} ${S(14)}`, borderRadius: S(999),
              maxWidth: 340,
            }}>
              ✅ Ton ami a 48 h pour relever
            </div>
          )}
          {challengeError && (
            <div style={{
              fontSize: S(12), color: '#FCA5A5', textAlign: 'center', padding: `${S(8)} ${S(12)}`,
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: S(12), maxWidth: 340,
            }}>
              {challengeError}
            </div>
          )}

          {/* Ton score (grosse card) */}
          <div className="rounded-3xl w-full p-4" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', maxWidth: 340 }}>
            <div className="text-center" style={{ marginBottom: S(2) }}>
              <span style={{ fontSize: S(11), color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
                Ton score
              </span>
            </div>
            <div className="text-center">
              <span style={{ fontSize: S(56), fontWeight: 900, color: MULTI_GOLD, lineHeight: 1, fontVariantNumeric: 'tabular-nums', textShadow: `0 4px 20px ${MULTI_GOLD}4D` }}>
                {scoreLabel}
              </span>
            </div>
            <div className="text-center" style={{ marginTop: S(4) }}>
              <span style={{ fontSize: S(11), color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>
                {scoreUnit}
              </span>
            </div>
            {!isSpeedrunMulti && (
              <div className="flex justify-center gap-6" style={{ marginTop: S(8) }}>
                <div className="text-center">
                  <span style={{ fontSize: S(14), fontWeight: 900, color: 'white', display: 'block' }}>{totalAnswered}</span>
                  <span style={{ fontSize: S(9), color: 'rgba(255,255,255,0.5)' }}>Répondues</span>
                </div>
                <div className="text-center">
                  <span style={{ fontSize: S(14), fontWeight: 900, color: 'white', display: 'block' }}>{accuracy}%</span>
                  <span style={{ fontSize: S(9), color: 'rgba(255,255,255,0.5)' }}>Précision</span>
                </div>
              </div>
            )}
          </div>

          {/* Économie : -100c / +150c gagnant */}
          <div className="rounded-2xl w-full p-3" style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.25)', maxWidth: 340 }}>
            <div style={{ fontSize: S(11), color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontWeight: 700 }}>
              💰 <span style={{ color: '#FCA5A5' }}>−100 coins</span> misés · <span style={{ color: '#22C55E' }}>+150 au gagnant</span>
              <div style={{ fontSize: S(10), opacity: 0.65, marginTop: 2 }}>Égalité parfaite = chacun récupère ses 100c</div>
            </div>
          </div>

          {/* FeaturedFact si bien répondu */}
          {featuredFact && (
            <div style={{ width: '100%', maxWidth: 340 }}>
              <FeaturedFactCard
                fact={featuredFact}
                fallbackColor={MULTI_VIOLET}
                textColor="#ffffff"
                isQuickie={false}
                onClick={() => { audio.play?.('click'); setViewingFact({ ...featuredFact, _isLocked: !globalUnlocked.has(featuredFact.id) }) }}
              />
            </div>
          )}

          {/* Miniatures facts */}
          {sessionAnswers.length > 0 && (
            <BlitzSessionMiniatures
              sessionAnswers={sessionAnswers}
              globalUnlocked={globalUnlocked}
              setViewingFact={setViewingFact}
              onUnlockRequest={handleUnlockFact}
              S={S}
            />
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0 w-full px-6 pb-4 pt-2 flex flex-col gap-2">
          {autoChallenge && !opponentId && (
            <button
              onClick={handleShareChallenge}
              className="w-full py-3 rounded-2xl font-black text-base active:scale-[0.97] transition-transform"
              style={{ background: `linear-gradient(135deg, ${MULTI_VIOLET}, #4A1E63)`, color: 'white', fontSize: S(16), border: '3px solid #ffffff' }}
            >
              {copied ? '✅ Lien copié !' : '📤 Partager le défi'}
            </button>
          )}
          <button
            onClick={onHome}
            className="w-full py-2.5 rounded-2xl font-bold text-sm"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '3px solid #ffffff', fontSize: S(14) }}
          >
            🏠 Accueil
          </button>
        </div>

        {viewingFact && (
          <FactDetailView
            fact={viewingFact}
            onClose={() => setViewingFact(null)}
            onUnlockRequest={handleUnlockFact}
          />
        )}
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
