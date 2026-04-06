import { useState, useEffect } from 'react'
import SettingsModal from '../components/SettingsModal'
import CoinsIcon from '../components/CoinsIcon'
import { audio } from '../utils/audio'
import { getCategoryById, CATEGORIES } from '../data/facts'
import { useAuth } from '../context/AuthContext'
import ConnectBanner from '../components/ConnectBanner'
import { getTutorialState, advanceTutorial, TUTORIAL_STATES } from '../utils/tutorialManager'

// ── isLightColor ────────────────────────────────────────────────────────────
const isLightColor = (hex) => {
  if (!hex) return false
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 160
}

// MOD 5 — 11 niveaux de ranking basés sur le nombre de bonnes réponses (0-10)
const RANKINGS = [
  { score: 0,  emoji: '😵', label: 'Zéro pointé',   message: "Tu as encore beaucoup à découvrir... et c'est tant mieux !" },
  { score: 1,  emoji: '🐣', label: 'Novice WTF!',   message: "Tu as encore beaucoup à découvrir... et c'est tant mieux !" },
  { score: 2,  emoji: '🤔', label: 'Curieux',        message: "Tu as encore beaucoup à découvrir... et c'est tant mieux !" },
  { score: 3,  emoji: '😅', label: 'En route',       message: "Tu as encore beaucoup à découvrir... et c'est tant mieux !" },
  { score: 4,  emoji: '🧐', label: 'Apprenti',       message: 'Pas mal ! Ces facts commencent à te connaître...' },
  { score: 5,  emoji: '🙂', label: 'Moyen WTF!',    message: 'Pas mal ! Ces facts commencent à te connaître...' },
  { score: 6,  emoji: '😎', label: 'Bon joueur',     message: 'Pas mal ! Ces facts commencent à te connaître...' },
  { score: 7,  emoji: '🧠', label: 'Expert',         message: "Impressionnant ! Tu maîtrises l'art du WTF!" },
  { score: 8,  emoji: '🔥', label: 'WTF! Addict',   message: "Impressionnant ! Tu maîtrises l'art du WTF!" },
  { score: 9,  emoji: '👑', label: 'Génie WTF!',    message: "Impressionnant ! Tu maîtrises l'art du WTF!" },
  { score: 10, emoji: '🌟', label: 'PARFAIT WTF!',  message: 'Parfait ! Tu es officiellement WTF! certifié 🏆' },
]

function getStars(correct, total) {
  const ratio = correct / total
  if (ratio >= 1) return 3
  if (ratio >= 0.6) return 2
  if (ratio > 0) return 1
  return 0
}

const DIFFICULTY_LABELS = { cool: 'Cool', hot: 'Hot', wtf: 'WTF!' }
const DIFFICULTY_EMOJIS = { cool: '❄️', hot: '🔥', wtf: '⚡' }
const CHALLENGE_LABELS = {
  cool: 'Tenter le niveau Hot ? 🔥',
  hot:  'Oser le WTF! ? ⚡',
  wtf:  'Rejouer en WTF! 🏆',
}

// COR 4 — Confetti colors
const CONFETTI_COLORS = ['#FF5C1A', '#FFD700', '#FF4081', '#00BCD4', '#7C4DFF', '#4CAF50', '#FF9800', '#E91E63']
const DAILY_LIMIT = 3

export default function ResultsScreen({
  score,
  correctCount,
  totalFacts,
  onReplay,
  onHome,
  completedCategoryLevels = [],
  coinsEarned = 0,
  sessionType = 'parcours',
  difficulty = null,
  ticketEarned = false,
  categoryId = null,
  onShare = null,
  onFactDetail = null,
  onChallengeUp = null,
  unlockedFactsThisSession = [],
  allSessionFacts = [],
  sessionsToday = 0,
  playerCoins = 0,
  playerTickets = 0,
  playerHints = 0,
  onSaveTempFacts = null,
  onCollection = null,
}) {
  const S = (px) => `calc(${px}px * var(--scale))`
  const { isConnected, signInWithGoogle } = useAuth()
  const googleDismissed = (() => { try { return JSON.parse(localStorage.getItem('wtf_data') || '{}').googlePromptDismissed || 0 } catch { return 0 } })()
  const [showGoogleBanner, setShowGoogleBanner] = useState(!isConnected && googleDismissed < 2)
  const dismissGoogle = () => {
    try {
      const d = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      d.googlePromptDismissed = (d.googlePromptDismissed || 0) + 1
      d.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(d))
    } catch {}
    setShowGoogleBanner(false)
  }
  const [showSettings, setShowSettings] = useState(false)
  const [showConnectBanner, setShowConnectBanner] = useState(false)
  const [savedAfterConnect, setSavedAfterConnect] = useState(false)
  const [selectedFact, setSelectedFact] = useState(null)

  // Persister les facts temporaires quand le joueur se connecte depuis ResultsScreen
  useEffect(() => {
    if (isConnected && !savedAfterConnect && onSaveTempFacts && sessionType === 'flash_solo') {
      onSaveTempFacts()
      setSavedAfterConnect(true)
    }
  }, [isConnected, savedAfterConnect, onSaveTempFacts, sessionType])
  const [coinAnimActive, setCoinAnimActive] = useState(false)
  const [audioDuration, setAudioDuration] = useState(2.5)
  const [rankVisible, setRankVisible] = useState(false)      // MOD 6
  const [visibleStars, setVisibleStars] = useState(0)        // MOD 6
  const [animatedScore, setAnimatedScore] = useState(0)      // MOD 6
  const [sharedCopied, setSharedCopied] = useState(false)    // MOD 10
  const [confettiActive, setConfettiActive] = useState(false) // COR 4
  const [isTutoQuestDone, setIsTutoQuestDone] = useState(false)

  useEffect(() => {
    getTutorialState().then(state => {
      if (state === TUTORIAL_STATES.QUEST_DONE) {
        setIsTutoQuestDone(true)
      }
    })
  }, [])
  const [ticketPopVisible, setTicketPopVisible] = useState(false)

  // Category color (MOD 1)
  const cat = categoryId ? getCategoryById(categoryId) : null
  const catColor = cat?.color || '#FF5C1A'
  const textOnBg = '#ffffff' // Toujours blanc sur fond sombre (overlay garanti)

  // MOD 5 — Rank based on correct answers
  const currentRank = RANKINGS[Math.min(Math.max(correctCount, 0), 10)]
  const stars = getStars(correctCount, totalFacts)
  const isPerfect = totalFacts > 0 && correctCount >= totalFacts

  // COR 1 — Fond variable selon le score
  const screenBg = isPerfect
    ? 'linear-gradient(160deg, #FEF3C722 0%, #F59E0B 100%)'
    : correctCount >= 7
    ? 'linear-gradient(160deg, #ECFDF522 0%, #10B981 100%)'
    : correctCount >= 4
    ? 'linear-gradient(160deg, #EFF6FF22 0%, #3B82F6 100%)'
    : 'linear-gradient(160deg, #F5F3FF22 0%, #6366F1 100%)'

  // COR 6 — Taux moyen pseudo-aléatoire stable par catégorie
  const avgSuccessRate = 15 + ((categoryId ? categoryId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) : 50) % 40)
  const perfectBonus = isPerfect ? 25 : 0
  const totalCoins = coinsEarned + perfectBonus

  // MOD 3 — Precision based on correct answers
  const precision = totalFacts > 0 ? Math.round((correctCount / totalFacts) * 100) : 0

  // COR 5 — Remaining daily quests
  const remainingQuests = Math.max(0, DAILY_LIMIT - sessionsToday)

  // COR 4 — Confetti on mount (2s)
  useEffect(() => {
    const styleId = '__confetti-style'
    if (!document.getElementById(styleId)) {
      const s = document.createElement('style')
      s.id = styleId
      s.textContent = `
        @keyframes confettiFall {
          0%   { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        @keyframes confettiFallPerfect {
          0%   { transform: translateY(-10px) rotate(0deg) scale(1); opacity: 1; }
          60%  { opacity: 1; }
          100% { transform: translateY(110vh) rotate(1080deg) scale(0.5); opacity: 0; }
        }
      `
      document.head.appendChild(s)
    }

    setConfettiActive(true)
    const t = setTimeout(() => setConfettiActive(false), isPerfect ? 3000 : 2000)
    return () => {
      clearTimeout(t)
      const el = document.getElementById(styleId)
      if (el) el.remove()
    }
  }, [isPerfect])

  // MOD 6 — Sequential animations on mount
  useEffect(() => {
    const t1 = setTimeout(() => setRankVisible(true), 250)
    const starTimers = [1, 2, 3].map((s, i) =>
      setTimeout(() => { if (s <= stars) setVisibleStars(s) }, 500 + i * 200)
    )
    return () => { clearTimeout(t1); starTimers.forEach(clearTimeout) }
  }, [stars])

  // MOD 6 — Score count-up animation
  useEffect(() => {
    if (score <= 0) { setAnimatedScore(0); return }
    const duration = 800
    const interval = 16
    const steps = duration / interval
    const increment = score / steps
    let current = 0
    const timer = setInterval(() => {
      current = Math.min(current + increment, score)
      setAnimatedScore(Math.round(current))
      if (current >= score) clearInterval(timer)
    }, interval)
    return () => clearInterval(timer)
  }, [score])

  // Badge Perfect — animation ticket avec délai (après les étoiles)
  useEffect(() => {
    if (!ticketEarned) return
    const t = setTimeout(() => setTicketPopVisible(true), 900)
    return () => clearTimeout(t)
  }, [ticketEarned])

  // MOD 7 — Coin fly animation (synced with audio)
  useEffect(() => {
    if (coinsEarned <= 0) return

    const styleId = '__coin-fly-style'
    if (!document.getElementById(styleId)) {
      const s = document.createElement('style')
      s.id = styleId
      s.textContent = `
        @keyframes coinFlyUp {
          0%   { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          8%   { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
          16%  { transform: translate(-50%, -50%) scale(1);   opacity: 1; }
          100% { transform: translate(-50%, calc(-50% - 52vh)) scale(0.1); opacity: 0; }
        }
      `
      document.head.appendChild(s)
    }

    let cleanT
    const startAnim = (dur) => {
      setAudioDuration(dur)
      setCoinAnimActive(true)
      audio.playFile('Stamp Approval.mp3')
      const lastCoinEnd = dur * 1000 + 1800
      cleanT = setTimeout(() => setCoinAnimActive(false), lastCoinEnd)
    }

    let metaLoaded = false
    const a = new Audio('/Stamp Approval.mp3')
    a.addEventListener('loadedmetadata', () => {
      if (metaLoaded) return
      metaLoaded = true
      clearTimeout(fallbackT)
      startAnim(a.duration && !isNaN(a.duration) ? a.duration : 2.5)
    })
    a.load()

    const fallbackT = setTimeout(() => {
      if (!metaLoaded) { metaLoaded = true; startAnim(2.5) }
    }, 700)

    return () => {
      clearTimeout(fallbackT)
      clearTimeout(cleanT)
      const el = document.getElementById(styleId)
      if (el) el.remove()
    }
  }, [coinsEarned])

  // COR 5 — Share handler natif avec message défi
  const handleShare = () => {
    const diffLabel = difficulty ? (DIFFICULTY_LABELS[difficulty.id] || DIFFICULTY_LABELS[difficulty] || 'Cool') : 'Cool'
    const text = `J'ai fait ${correctCount}/10 en mode ${diffLabel} sur What The F*ct! 🎯\nTu peux faire mieux ? Rejoins-moi sur wtf-app.vercel.app`
    if (onShare) {
      onShare(text)
    } else if (navigator.share) {
      navigator.share({ title: 'What The F*ct!', text }).catch(() => {})
    } else if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
      setSharedCopied(true)
      setTimeout(() => setSharedCopied(false), 2000)
    }
  }

  // Direct home — stop all audio and go home immediately
  const handleGoHome = () => {
    audio.stopAll()
    audio.play('click')
    onHome()
  }

  // COR 4 — Confetti particles (seeded layout)
  const confettiParticles = Array.from({ length: isPerfect ? 40 : 25 }, (_, i) => ({
    id: i,
    left: `${((i * 37 + 11) % 97)}%`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: `${((i * 0.07) % 1.2).toFixed(2)}s`,
    duration: isPerfect ? `${(1.8 + (i % 5) * 0.25).toFixed(2)}s` : `${(1.4 + (i % 4) * 0.2).toFixed(2)}s`,
    size: i % 3 === 0 ? 8 : i % 3 === 1 ? 6 : 5,
    shape: i % 2 === 0 ? '50%' : '2px',
  }))

  return (
    <div className="relative flex flex-col h-full w-full screen-enter overflow-hidden" style={{
      backgroundImage: 'url(/assets/backgrounds/results-victory.webp)',
      backgroundSize: 'cover', backgroundPosition: 'center',
      backgroundColor: '#0a0f1e',
    }}>
      {/* Overlay léger */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.35) 100%)',
        pointerEvents: 'none',
      }} />

      {/* COR 4 — Confetti overlay */}
      {confettiActive && (
        <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 200, overflow: 'hidden' }}>
          {confettiParticles.map(p => (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                top: '-12px',
                left: p.left,
                width: p.size,
                height: p.size,
                borderRadius: p.shape,
                background: p.color,
                animation: `${isPerfect ? 'confettiFallPerfect' : 'confettiFall'} ${p.duration} ${p.delay} ease-in both`,
              }}
            />
          ))}
        </div>
      )}

      {/* MOD 7 — Coin fly animation overlay */}
      {coinAnimActive && coinsEarned > 0 && (() => {
        const totalMs = audioDuration * 1000
        const spreadMs = totalMs * 0.55
        const durMs = Math.min(Math.max(Math.round(totalMs * 0.45), 700), 1200)
        return (
          <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 300, overflow: 'hidden' }}>
            {Array.from({ length: Math.min(coinsEarned, 15) }, (_, i) => {
              const delayMs = coinsEarned > 1 ? Math.round((i / (Math.min(coinsEarned, 15) - 1)) * spreadMs) : 0
              return (
                <span key={i} style={{
                  position: 'absolute', left: '50%', top: '50%',
                  fontSize: 32, lineHeight: 1, userSelect: 'none',
                  animation: `coinFlyUp ${durMs}ms cubic-bezier(0.4, 0, 0.2, 1) ${delayMs}ms both`,
                  willChange: 'transform, opacity', zIndex: 300 + i,
                }}>🪙</span>
              )
            })}
          </div>
        )
      })()}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Header — pas de catégorie, on n'est plus en jeu */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexShrink: 0, padding: `${S(8)} ${S(12)}`, position: 'relative', zIndex: 2 }}>
        <button
          onClick={handleGoHome}
          style={{ width: S(36), height: S(36), borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <span style={{ fontSize: S(16), color: textOnBg, fontWeight: 900, lineHeight: 1 }}>✕</span>
        </button>
        <div style={{ flex: 1, minWidth: 0, padding: `0 ${S(8)}` }}>
          <span style={{ fontWeight: 900, fontSize: S(13), color: textOnBg, lineHeight: 1.2, display: 'block', textAlign: 'center' }}>
            Résultats
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: S(8), flexShrink: 0, userSelect: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: S(3) }}>
            <img src="/assets/ui/icon-coins.png" style={{ width: S(16), height: S(16) }} alt="" />
            <span style={{ fontWeight: 700, color: textOnBg, fontSize: S(12) }}>{playerCoins}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: S(3) }}>
            <img src="/assets/ui/icon-tickets.png" style={{ width: S(16), height: S(16) }} alt="" />
            <span style={{ fontWeight: 700, color: textOnBg, fontSize: S(12) }}>{playerTickets}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: S(3) }}>
            <img src="/assets/ui/icon-hint.png" style={{ width: S(16), height: S(16) }} alt="" />
            <span style={{ fontWeight: 700, color: textOnBg, fontSize: S(12) }}>{playerHints}</span>
          </div>
        </div>
        <button
          onClick={() => { audio.play('click'); setShowSettings(true) }}
          style={{ width: S(36), height: S(36), borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: S(6) }}
        >
          <img src="/assets/ui/icon-settings.png" alt="" style={{ width: S(20), height: S(20) }} />
        </button>
      </div>

      {/* Content zone — fullscreen, no scroll */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ position: 'relative', zIndex: 2 }}>

      {/* MOD 6 — Rang compact */}
      <div className="flex flex-col items-center pt-1 pb-0 px-6 shrink-0">
        <div
          className="text-4xl mb-0"
          style={{
            transform: rankVisible ? 'scale(1)' : 'scale(0)',
            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}>
          {currentRank.emoji}
        </div>
        <div
          className="text-sm font-black text-center"
          style={{
            color: textOnBg,
            transform: rankVisible ? 'scale(1)' : 'scale(0)',
            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.08s',
          }}>
          {currentRank.label}
        </div>
      </div>

      {/* Étoiles */}
      <div className="flex justify-center gap-2 pb-1 shrink-0">
        {[1, 2, 3].map((s) => (
          <span
            key={s}
            className="text-2xl"
            style={{
              transform: s <= visibleStars ? 'scale(1)' : 'scale(0)',
              transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              filter: s <= stars ? `drop-shadow(0 0 12px ${catColor})` : 'none',
              opacity: s <= stars ? 1 : 0.2,
            }}>
            ⭐
          </span>
        ))}
      </div>

      {/* Badge Perfect — compact */}
      {isPerfect && (
        <div className="mx-4 mb-1 rounded-2xl p-2 shrink-0 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, rgba(253,224,71,0.22), rgba(245,158,11,0.35))', border: '1.5px solid rgba(253,224,71,0.6)' }}>
          <span style={{ fontSize: 18 }}>⭐</span>
          <span className="font-black uppercase tracking-wider" style={{ fontSize: 14, color: '#FDE047' }}>PERFECT !</span>
          {ticketEarned && <span style={{ fontSize: 14 }}>🎟️ +1</span>}
          <span style={{ fontSize: 18 }}>⭐</span>
        </div>
      )}

      {/* Score card — compact */}
      <div className="mx-4 mb-1 rounded-2xl border p-2 shrink-0" style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.15)', textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <div className="text-2xl font-black" style={{ color: textOnBg }}>+{animatedScore} 🪙</div>
          </div>
          <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.15)' }} />
          <div className="grid grid-cols-3 gap-1 flex-1 text-center">
            <div>
              <div className="text-lg font-black" style={{ color: textOnBg }}>{correctCount}</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: textOnBg, opacity: 0.5 }}>Trouvés</div>
            </div>
            <div>
              <div className="text-lg font-black" style={{ color: textOnBg }}>{totalFacts - correctCount}</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: textOnBg, opacity: 0.5 }}>Ratés</div>
            </div>
            <div>
              <div className="text-lg font-black" style={{ color: catColor }}>{precision}%</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: textOnBg, opacity: 0.5 }}>Précision</div>
            </div>
          </div>
        </div>
      </div>

      {/* Carrousel compact — 100x140px cards */}
      {allSessionFacts.length > 0 && (() => {
        const unlockedIds = new Set(unlockedFactsThisSession.map(f => f.id))
        const unlocked = allSessionFacts.filter(f => unlockedIds.has(f.id))
        const locked = allSessionFacts.filter(f => !unlockedIds.has(f.id))
        const sorted = [...unlocked, ...locked]
        return (
          <div className="mb-1 shrink-0">
            <div className="px-4 mb-1">
              <span style={{ fontSize: 10, fontWeight: 800, color: textOnBg, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {unlocked.length > 0 ? `🔓 ${unlocked.length} trouvé${unlocked.length > 1 ? 's' : ''}` : ''}
                {locked.length > 0 ? ` · 🔒 ${locked.length} raté${locked.length > 1 ? 's' : ''}` : ''}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingLeft: 16, paddingRight: 16, paddingBottom: 4 }} className="scrollbar-hide">
              {sorted.map((fact) => {
                const isUnlocked = unlockedIds.has(fact.id)
                const factCat = CATEGORIES.find(c => c.id === fact.category)
                const factCatColor = factCat?.color || catColor
                return (
                  <div
                    key={fact.id}
                    onClick={() => isUnlocked && setSelectedFact(fact)}
                    style={{
                      width: 100, height: 100, flexShrink: 0,
                      borderRadius: 12, overflow: 'hidden', position: 'relative',
                      border: isUnlocked ? `3px solid ${factCatColor}` : '3px solid #6B7280',
                      cursor: isUnlocked ? 'pointer' : 'default',
                      background: `linear-gradient(135deg, ${factCatColor}44, ${factCatColor})`,
                    }}>
                    {fact.imageUrl ? (
                      <img src={fact.imageUrl} alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', filter: !isUnlocked ? 'blur(6px) brightness(0.4)' : 'none' }}
                        onError={e => { e.target.style.display = 'none' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', filter: !isUnlocked ? 'brightness(0.4)' : 'none' }}>
                        <span style={{ fontSize: 28, opacity: 0.3 }}>?</span>
                      </div>
                    )}
                    {!isUnlocked && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 24, opacity: 0.8 }}>🔒</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}


      {/* Completion rewards */}
      {completedCategoryLevels.length > 0 && (
        <div className="mx-5 mb-3 rounded-2xl border p-4 shrink-0" style={{ background: 'rgba(255,215,0,0.12)', borderColor: 'rgba(255,215,0,0.4)', backdropFilter: 'blur(8px)' }}>
          <div className="text-xs font-bold uppercase tracking-widest mb-3 text-center" style={{ color: textOnBg, opacity: 0.8 }}>🏆 Niveau complété !</div>
          {completedCategoryLevels.map(({ catId, difficulty: lvlDiff }) => {
            const lvlCat = CATEGORIES.find(c => c.id === catId)
            return (
              <div key={`${catId}_${lvlDiff}`} className="flex items-center gap-3 mb-2 last:mb-0 p-2 rounded-xl" style={{ background: 'rgba(255,215,0,0.1)' }}>
                {lvlCat?.image ? (
                  <img src={lvlCat.image} alt={lvlCat.label} className="w-10 h-10 rounded-lg object-contain" style={{ background: 'rgba(255,255,255,0.1)' }} />
                ) : (
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    {lvlCat?.emoji || '🌟'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-black text-xs" style={{ color: textOnBg }}>
                    {DIFFICULTY_EMOJIS[lvlDiff]} {lvlCat?.label || catId} — {DIFFICULTY_LABELS[lvlDiff]}
                  </div>
                  <div className="text-yellow-200 text-xs font-semibold mt-0.5">De nouveaux facts arrivent bientôt !</div>
                </div>
                <div className="text-2xl">🥇</div>
              </div>
            )
          })}
        </div>
      )}

      </div>{/* end scrollable zone */}

      {/* COR 5 + COR 6 — CTA avec ticket count, pb-4 */}
      <div className="px-5 pb-4 flex flex-col gap-2 shrink-0" style={{ position: 'relative', zIndex: 2 }}>

        {/* COR 5 — Message tickets restants */}
        <div className="text-center text-xs font-bold mb-1" style={{ color: textOnBg, opacity: 0.75 }}>
          {remainingQuests > 0
            ? `🎯 Tu as encore ${remainingQuests} quête${remainingQuests > 1 ? 's' : ''} disponible${remainingQuests > 1 ? 's' : ''} aujourd'hui !`
            : "✅ Tu as utilisé toutes tes quêtes du jour — reviens demain !"}
        </div>

        {/* COR 3 — Principal : Rejouer même catégorie + difficulté */}
        {/* 1. Bouton Google — si non connecté */}
        {!isConnected && (
          <button
            onClick={() => {
              if (unlockedFactsThisSession.length > 0) {
                localStorage.setItem('wtf_temp_facts', JSON.stringify(unlockedFactsThisSession.map(f => f.id)))
              }
              setShowConnectBanner(true)
            }}
            className="btn-press w-full py-3 rounded-2xl font-bold text-sm active:scale-95 transition-all"
            style={{
              background: '#fff', border: 'none', color: '#374151',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Sauvegarder ma progression
          </button>
        )}

        {/* 2. Partager */}
        <button
          onClick={handleShare}
          className="btn-press w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all border"
          style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)', color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
          <span>{sharedCopied ? '✅' : '📤'}</span>
          {sharedCopied ? 'Copié !' : 'Partager mon score'}
        </button>

        {/* 3. Rejouer */}
        <button
          onClick={onReplay}
          className="btn-press w-full py-4 rounded-2xl font-black text-base uppercase tracking-wide active:scale-95 transition-all"
          style={isTutoQuestDone ? {
            background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)',
            color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.3)',
          } : {
            background: '#FF6B1A',
            boxShadow: '0 4px 16px rgba(255,107,26,0.4)',
            color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }}>
          🔄 Rejouer
        </button>

        {/* 4. Collection (tuto QUEST_DONE) ou Revenir */}
        {isTutoQuestDone && onCollection ? (
          <button
            onClick={() => {
              advanceTutorial() // QUEST_DONE → COMPLETED
              audio.stopAll()
              audio.play('click')
              onCollection()
            }}
            className="btn-press w-full py-4 rounded-2xl font-black text-sm active:scale-95 transition-all"
            style={{
              background: '#FF6B1A',
              boxShadow: '0 4px 16px rgba(255,107,26,0.4)',
              color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }}>
            Voir ma collection 📚
          </button>
        ) : (
          <button
            onClick={handleGoHome}
            className="btn-press w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1.5px solid rgba(255,255,255,0.3)',
              color: '#ffffff',
              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
            }}>
            🏠 Revenir à l'accueil
          </button>
        )}
      </div>

      {/* Fact detail modal */}
      {selectedFact && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', padding: 16 }}
          onClick={() => setSelectedFact(null)}
        >
          <div
            style={{ background: '#fff', borderRadius: 20, maxWidth: 360, width: '90%', maxHeight: '85vh', overflow: 'auto', position: 'relative' }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setSelectedFact(null)} style={{ position: 'absolute', top: 10, right: 10, zIndex: 10, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

            {/* Image */}
            {selectedFact.imageUrl ? (
              <img src={selectedFact.imageUrl} alt="" style={{ width: '100%', maxHeight: '35vh', objectFit: 'cover', borderRadius: '20px 20px 0 0' }} onError={e => { e.target.style.display = 'none' }} />
            ) : (
              <div style={{ height: 120, background: `linear-gradient(135deg, ${catColor}44, ${catColor})`, borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 40, opacity: 0.3 }}>?</span>
              </div>
            )}

            <div style={{ padding: '16px 20px 20px' }}>
              {/* Question */}
              <p style={{ fontSize: 14, fontWeight: 800, color: '#1a1a2e', lineHeight: 1.4, margin: '0 0 12px' }}>{selectedFact.question}</p>

              {/* Bonne réponse */}
              <div style={{ background: 'rgba(34,197,94,0.1)', border: '1.5px solid rgba(34,197,94,0.3)', borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#22C55E', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Bonne réponse</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a2e' }}>{selectedFact.shortAnswer || selectedFact.options?.[selectedFact.correctIndex]}</div>
              </div>

              {/* Explication */}
              {selectedFact.explanation && (
                <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#FF6B1A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>🧠 Le saviez-vous ?</div>
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#374151', lineHeight: 1.5, margin: 0 }}>{selectedFact.explanation}</p>
                </div>
              )}

              {/* Source */}
              {selectedFact.sourceUrl && (
                <a href={selectedFact.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: '#9CA3AF', textDecoration: 'underline' }}>Source</a>
              )}
            </div>
          </div>
        </div>
      )}

      {showConnectBanner && <ConnectBanner onClose={() => setShowConnectBanner(false)} />}

      {showGoogleBanner && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'rgba(255,255,255,0.95)',
          borderTop: '1px solid rgba(0,0,0,0.1)',
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 10,
          zIndex: 50,
          fontFamily: 'Nunito, sans-serif',
        }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#1a1a2e' }}>Sauvegarde ta progression</span>
            <span style={{ fontSize: 11, color: '#6B7280', display: 'block', marginTop: 2 }}>Connecte-toi pour ne rien perdre</span>
          </div>
          <button
            onClick={() => { dismissGoogle(); signInWithGoogle() }}
            style={{
              padding: '8px 16px', borderRadius: 10,
              background: '#FF6B1A', color: 'white', border: 'none',
              fontWeight: 800, fontSize: 12, cursor: 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            Google
          </button>
          <button
            onClick={dismissGoogle}
            style={{
              background: 'none', border: 'none', color: '#9CA3AF',
              fontSize: 18, cursor: 'pointer', padding: '4px 8px', flexShrink: 0,
            }}
          >✕</button>
        </div>
      )}
    </div>
  )
}
