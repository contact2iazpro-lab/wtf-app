import { useState, useEffect, useRef } from 'react'
import SettingsModal from '../components/SettingsModal'
import CoinsIcon from '../components/CoinsIcon'
import { audio } from '../utils/audio'
import { getCategoryById, CATEGORIES } from '../data/facts'
import { useCurrency } from '../context/CurrencyContext'
import { updateCoins } from '../services/currencyService'
import { useAuth } from '../context/AuthContext'
import ConnectBanner from '../components/ConnectBanner'

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
  unlockedFactsThisSession = [],
  allSessionFacts = [],
  sessionsToday = 0,
  onSaveTempFacts = null,
  onCollection = null,
}) {
  const S = (px) => `calc(${px}px * var(--scale))`
  const { coins: _cCoins, tickets: _cTickets, hints: _cHints } = useCurrency()
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

  // Proposer la connexion Google après 2s si pas connecté (une seule fois par session)
  useEffect(() => {
    if (isConnected || googleDismissed >= 2) return
    const t = setTimeout(() => {
      if (unlockedFactsThisSession.length > 0) {
        localStorage.setItem('wtf_temp_facts', JSON.stringify(unlockedFactsThisSession.map(f => f.id)))
      }
      setShowConnectBanner(true)
    }, 2000)
    return () => clearTimeout(t)
  }, [isConnected, googleDismissed])

  const [coinAnimActive, setCoinAnimActive] = useState(false)
  const [audioDuration, setAudioDuration] = useState(2.5)
  const [rankVisible, setRankVisible] = useState(false)      // MOD 6
  const [visibleStars, setVisibleStars] = useState(0)        // MOD 6
  const [animatedScore, setAnimatedScore] = useState(0)      // MOD 6
  const [sharedCopied, setSharedCopied] = useState(false)    // MOD 10
  const [confettiActive, setConfettiActive] = useState(false) // COR 4
  const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')
  const gamesPlayed = wtfData.gamesPlayed || 0
  const [ticketPopVisible, setTicketPopVisible] = useState(false)

  // Category color (MOD 1)
  const cat = categoryId ? getCategoryById(categoryId) : null
  const catColor = cat?.color || '#FF5C1A'
  const textOnBg = '#ffffff' // Toujours blanc sur fond sombre (overlay garanti)

  // MOD 5 — Rank based on correct answers
  const currentRank = RANKINGS[Math.min(Math.max(correctCount, 0), 10)]
  const stars = getStars(correctCount, totalFacts)
  const isPerfect = totalFacts > 0 && correctCount >= totalFacts

  // Fond : même style pastel que la home
  const PASTEL_GRADIENTS = [
    'linear-gradient(160deg, #5a7fa5 0%, #7b9fc7 40%, #99b8d9 70%, #5a7fa5 100%)',
    'linear-gradient(160deg, #8b7b9a 0%, #ad9bbb 40%, #c5b5d2 70%, #8b7b9a 100%)',
    'linear-gradient(160deg, #5a9a8b 0%, #7bbbad 40%, #99d2c5 70%, #5a9a8b 100%)',
    'linear-gradient(160deg, #9a7b7b 0%, #bb9d9d 40%, #d2b5b5 70%, #9a7b7b 100%)',
    'linear-gradient(160deg, #7b8b9a 0%, #9dadbb 40%, #b5c5d2 70%, #7b8b9a 100%)',
  ]
  const bgRef = useRef(PASTEL_GRADIENTS[Math.floor(Math.random() * PASTEL_GRADIENTS.length)])
  const screenBg = bgRef.current

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
    const text = `J'ai fait ${correctCount}/10 en mode ${diffLabel} sur What The F*ct !\nTu peux faire mieux ? ${window.location.origin}`
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
    <div style={{
      position: 'fixed', inset: 0, zIndex: 0,
      display: 'flex', flexDirection: 'column',
      background: screenBg,
      overflow: 'hidden',
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

      {/* ═══ HEADER FIXE (~50px) ═══ */}
      <div style={{
        display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', flexShrink: 0, padding: `${S(8)} ${S(12)}`, position: 'relative', zIndex: 2,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
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
            <img src="/assets/ui/icon-coins.png" style={{ width: S(14), height: S(14) }} alt="" />
            <span style={{ fontWeight: 700, color: textOnBg, fontSize: S(11) }}>{_cCoins}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: S(3) }}>
            <img src="/assets/ui/icon-tickets.png" style={{ width: S(14), height: S(14) }} alt="" />
            <span style={{ fontWeight: 700, color: textOnBg, fontSize: S(11) }}>{_cTickets}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: S(3) }}>
            <img src="/assets/ui/icon-hint.png" style={{ width: S(14), height: S(14) }} alt="" />
            <span style={{ fontWeight: 700, color: textOnBg, fontSize: S(11) }}>{_cHints}</span>
          </div>
        </div>
        <button
          onClick={() => { audio.play('click'); setShowSettings(true) }}
          style={{ width: S(36), height: S(36), borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: S(6) }}
        >
          <img src="/assets/ui/icon-settings.png" alt="" style={{ width: S(20), height: S(20) }} />
        </button>
      </div>

      {/* ═══ CONTENT CENTRAL (flex-1, no scroll) ═══ */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        position: 'relative', zIndex: 2, padding: `${S(12)} ${S(16)}`, gap: S(8),
      }}>

        {/* Badge mode + difficulté */}
        {difficulty && (
          <div style={{ display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: S(6),
              background: 'rgba(255,255,255,0.15)', borderRadius: S(20),
              padding: `${S(4)} ${S(14)}`, border: '1px solid rgba(255,255,255,0.25)',
            }}>
              <span style={{ fontSize: S(12) }}>{DIFFICULTY_EMOJIS[difficulty.id] || '⭐'}</span>
              <span style={{ fontSize: S(11), fontWeight: 800, color: textOnBg }}>
                {sessionType === 'parcours' ? 'Quest' : sessionType === 'flash_solo' ? 'Jouer' : sessionType === 'marathon' ? 'Explorer' : 'Mode'} — {DIFFICULTY_LABELS[difficulty.id] || difficulty.label}
              </span>
            </div>
          </div>
        )}

        {/* Rang + Label compact */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, gap: S(2) }}>
          <div
            style={{
              fontSize: S(48), lineHeight: 1,
              transform: rankVisible ? 'scale(1)' : 'scale(0)',
              transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}>
            {currentRank.emoji}
          </div>
          <div
            style={{
              fontSize: S(14), fontWeight: 900, textAlign: 'center', color: textOnBg,
              transform: rankVisible ? 'scale(1)' : 'scale(0)',
              transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.08s',
            }}>
            {currentRank.label}
          </div>
        </div>

        {/* Étoiles — 24px chacune */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: S(8), flexShrink: 0 }}>
          {[1, 2, 3].map((s) => (
            <span
              key={s}
              style={{
                fontSize: S(24), lineHeight: 1,
                transform: s <= visibleStars ? 'scale(1)' : 'scale(0)',
                transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                filter: s <= stars ? `drop-shadow(0 0 12px ${catColor})` : 'none',
                opacity: s <= stars ? 1 : 0.2,
              }}>
              ⭐
            </span>
          ))}
        </div>

        {/* Badge Perfect — compact, fontSize 12 */}
        {isPerfect && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(6),
            background: 'linear-gradient(135deg, rgba(253,224,71,0.22), rgba(245,158,11,0.35))',
            border: '1.5px solid rgba(253,224,71,0.6)',
            borderRadius: S(14), padding: `${S(6)} ${S(16)}`, flexShrink: 0,
          }}>
            <span style={{ fontSize: S(16) }}>⭐</span>
            <span style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: S(12), color: '#FDE047', letterSpacing: '0.05em' }}>PERFECT !</span>
            {ticketEarned && <span style={{ fontSize: S(12) }}>🎟️ +1</span>}
            <span style={{ fontSize: S(16) }}>⭐</span>
          </div>
        )}

        {/* Score card — UNE ligne horizontale compact */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: S(8),
          background: 'rgba(0,0,0,0.3)', border: '1.5px solid rgba(255,255,255,0.15)',
          borderRadius: S(12), padding: S(8), flexShrink: 0,
          textShadow: '0 1px 4px rgba(0,0,0,0.7)',
        }}>
          <div style={{ textAlign: 'center', flex: 0.4 }}>
            <div style={{ fontSize: S(16), fontWeight: 900, color: textOnBg }}>+{animatedScore} 🪙</div>
          </div>
          <div style={{ width: 1, height: S(24), background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ display: 'flex', gap: S(8), flex: 0.6 }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: S(14), fontWeight: 900, color: textOnBg }}>{correctCount}</div>
              <div style={{ fontSize: S(9), fontWeight: 600, color: textOnBg, opacity: 0.5 }}>Trouvés</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: S(14), fontWeight: 900, color: textOnBg }}>{totalFacts - correctCount}</div>
              <div style={{ fontSize: S(9), fontWeight: 600, color: textOnBg, opacity: 0.5 }}>À découvrir</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: S(14), fontWeight: 900, color: catColor }}>{precision}%</div>
              <div style={{ fontSize: S(9), fontWeight: 600, color: textOnBg, opacity: 0.5 }}>Précision</div>
            </div>
          </div>
        </div>

        {/* Carrousel facts — max 80px height */}
        {allSessionFacts.length > 0 && (() => {
          const unlockedIds = new Set(unlockedFactsThisSession.map(f => f.id))
          const unlocked = allSessionFacts.filter(f => unlockedIds.has(f.id))
          const locked = allSessionFacts.filter(f => !unlockedIds.has(f.id))
          const sorted = [...unlocked, ...locked]
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: S(4), flexShrink: 0 }}>
              <span style={{ fontSize: S(10), fontWeight: 800, color: textOnBg, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {unlocked.length > 0 ? `🔓 ${unlocked.length} trouvé${unlocked.length > 1 ? 's' : ''}` : ''}
                {locked.length > 0 ? ` · 🔒 ${locked.length} à découvrir` : ''}
              </span>
              <div style={{ display: 'flex', gap: S(4), width: '100%' }}>
                {sorted.map((fact) => {
                  const isUnlocked = unlockedIds.has(fact.id)
                  const factCat = CATEGORIES.find(c => c.id === fact.category)
                  const factCatColor = factCat?.color || catColor
                  return (
                    <div key={fact.id} style={{ width: 0, flexGrow: 1, flexShrink: 0, display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
                      onClick={() => {
                        if (isUnlocked) {
                          // Stocker l'ID pour que CollectionPage ouvre le détail directement
                          localStorage.setItem('wtf_open_fact_id', String(fact.id))
                          onCollection?.()
                        } else {
                          setSelectedFact({ ...fact, _locked: true, _catColor: factCatColor, _catEmoji: factCat?.emoji, _catLabel: factCat?.label })
                        }
                      }}>
                      {/* Image */}
                      <div style={{
                        aspectRatio: '1', borderRadius: `${S(8)} ${S(8)} 0 0`, overflow: 'hidden', position: 'relative',
                        border: isUnlocked ? `2px solid ${factCatColor}` : '2px solid #6B7280',
                        borderBottom: 'none',
                        cursor: isUnlocked ? 'pointer' : 'default',
                        background: `linear-gradient(135deg, ${factCatColor}44, ${factCatColor})`,
                      }}>
                        {fact.imageUrl ? (
                          <img src={fact.imageUrl} alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: !isUnlocked ? 'blur(4px) brightness(0.4)' : 'none' }}
                            onError={e => { e.target.style.display = 'none' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', filter: !isUnlocked ? 'brightness(0.4)' : 'none' }}>
                            <span style={{ fontSize: S(20), opacity: 0.3 }}>?</span>
                          </div>
                        )}
                        {!isUnlocked && (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: S(16), opacity: 0.8 }}>🔒</span>
                          </div>
                        )}
                      </div>
                      {/* Bandeau catégorie */}
                      <div style={{
                        background: factCatColor, borderRadius: `0 0 ${S(6)} ${S(6)}`,
                        padding: `${S(2)} 0`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <img src={`/assets/categories/${fact.category}.png`} alt=""
                          style={{ width: S(14), height: S(14), borderRadius: S(3), objectFit: 'cover' }}
                          onError={e => { e.target.style.display = 'none' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}


        {/* Rewards — compact, fontSize 12 */}
        {completedCategoryLevels.length > 0 && (
          <div style={{
            background: 'rgba(255,215,0,0.12)', border: '1.5px solid rgba(255,215,0,0.4)',
            borderRadius: S(12), padding: S(8), flexShrink: 0,
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ fontSize: S(10), fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', marginBottom: S(6), color: textOnBg, opacity: 0.8 }}>
              🏆 Niveau complété !
            </div>
            {completedCategoryLevels.map(({ catId, difficulty: lvlDiff }) => {
              const lvlCat = CATEGORIES.find(c => c.id === catId)
              return (
                <div key={`${catId}_${lvlDiff}`} style={{
                  display: 'flex', alignItems: 'center', gap: S(6),
                  background: 'rgba(255,215,0,0.1)', borderRadius: S(8), padding: S(6),
                  marginBottom: S(4), fontSize: S(12),
                }}>
                  <div style={{ width: S(28), height: S(28), flexShrink: 0, borderRadius: S(6), display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', fontSize: S(16) }}>
                    {lvlCat?.emoji || '🌟'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 900, color: textOnBg, fontSize: S(11) }}>
                      {DIFFICULTY_EMOJIS[lvlDiff]} {lvlCat?.label || catId} — {DIFFICULTY_LABELS[lvlDiff]}
                    </div>
                  </div>
                  <span style={{ fontSize: S(14) }}>🥇</span>
                </div>
              )
            })}
          </div>
        )}

      </div>{/* end content central */}

      {/* ═══ FOOTER FIXE ═══ */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: S(8),
        padding: `${S(12)} ${S(16)} ${S(16)}`, flexShrink: 0,
        position: 'relative', zIndex: 2,
        borderTop: '1px solid rgba(255,255,255,0.1)',
      }}>

        {/* Ligne 1 : Rejouer + Monter en difficulté */}
        <div style={{ display: 'flex', gap: S(8) }}>
          <button
            onClick={onReplay}
            className="active:scale-95 transition-all"
            style={{
              flex: 1, padding: `${S(12)} ${S(12)}`, borderRadius: S(14),
              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
              border: 'none', color: '#1a1a2e', fontWeight: 900, fontSize: S(11),
              cursor: 'pointer', boxShadow: '0 4px 16px rgba(255,215,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(4),
            }}>
            🎫 Rejouer en {DIFFICULTY_LABELS[difficulty?.id] || 'Quest'}
          </button>
          {sessionType === 'parcours' && difficulty && CHALLENGE_LABELS[difficulty.id] && difficulty.id !== 'wtf' && (
            <button
              onClick={onReplay}
              className="active:scale-95 transition-all"
              style={{
                flex: 1, padding: `${S(12)} ${S(12)}`, borderRadius: S(14),
                background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                border: 'none', color: '#1a1a2e', fontWeight: 900, fontSize: S(11),
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(255,215,0,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              {CHALLENGE_LABELS[difficulty.id]}
            </button>
          )}
        </div>

        {/* Ligne 2 : Partager + Accueil */}
        <div style={{ display: 'flex', gap: S(8) }}>
          <button
            onClick={handleShare}
            className="active:scale-95 transition-all"
            style={{
              flex: 1, padding: `${S(10)} ${S(12)}`, borderRadius: S(14),
              background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.4)',
              color: '#fff', fontWeight: 800, fontSize: S(11),
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(4),
            }}>
            {sharedCopied ? '✅ Copié !' : '📤 Partager'}
          </button>
          <button
            onClick={handleGoHome}
            className="active:scale-95 transition-all"
            style={{
              flex: 1, padding: `${S(10)} ${S(12)}`, borderRadius: S(14),
              background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.4)',
              color: '#fff', fontWeight: 800, fontSize: S(11),
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(4),
            }}>
            ← Accueil
          </button>
        </div>
      </div>



      {/* Fact detail modal */}
      {/* Modal fact verrouillé — proposer de débloquer */}
      {selectedFact && selectedFact._locked && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', padding: 16 }}
          onClick={() => setSelectedFact(null)}
        >
          <div
            style={{ background: '#fff', borderRadius: 20, maxWidth: 320, width: '90%', textAlign: 'center', padding: '28px 24px', position: 'relative' }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setSelectedFact(null)} style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.1)', border: 'none', color: '#666', fontSize: 14, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

            {/* Icône catégorie */}
            <div style={{
              width: 64, height: 64, borderRadius: 16, margin: '0 auto 12px',
              background: selectedFact._catColor || '#FF6B1A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 16px ${selectedFact._catColor || '#FF6B1A'}40`,
            }}>
              <img src={`/assets/categories/${selectedFact.category}.png`} alt=""
                style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover' }}
                onError={e => { e.target.textContent = selectedFact._catEmoji || '❓' }} />
            </div>

            <div style={{ fontSize: 14, fontWeight: 900, color: '#1a1a2e', marginBottom: 4 }}>
              {selectedFact._catLabel || 'Catégorie'}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 16, lineHeight: 1.4 }}>
              Ce f*ct est encore verrouillé. Dépense 5 coins pour le découvrir !
            </div>

            <button
              onClick={() => {
                if (_cCoins < 5) return
                // Débiter 5 coins et débloquer le fact
                updateCoins(-5)
                // Ajouter aux unlockedFacts
                try {
                  const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
                  const unlocked = wd.unlockedFacts || []
                  if (!unlocked.includes(selectedFact.id)) unlocked.push(selectedFact.id)
                  wd.unlockedFacts = unlocked
                  wd.lastModified = Date.now()
                  localStorage.setItem('wtf_data', JSON.stringify(wd))
                  window.dispatchEvent(new Event('wtf_storage_sync'))
                } catch {}
                setSelectedFact(null)
              }}
              disabled={_cCoins < 5}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 14, border: 'none',
                background: _cCoins >= 5 ? 'linear-gradient(135deg, #FFD700, #FFA500)' : '#E5E7EB',
                color: _cCoins >= 5 ? '#1a1a2e' : '#9CA3AF', fontWeight: 900, fontSize: 14,
                cursor: _cCoins >= 5 ? 'pointer' : 'not-allowed',
                boxShadow: _cCoins >= 5 ? '0 4px 16px rgba(255,215,0,0.4)' : 'none',
              }}>
              🪙 Débloquer (5 coins)
            </button>
            {_cCoins < 5 && (
              <div style={{ fontSize: 11, color: '#EF4444', fontWeight: 700, marginTop: 8 }}>
                Pas assez de coins ({_cCoins} 🪙)
              </div>
            )}
          </div>
        </div>
      )}

      {showConnectBanner && <ConnectBanner onClose={() => setShowConnectBanner(false)} />}

      {/* Google banner supprimé — utilise ConnectBanner unique */}
    </div>
  )
}
