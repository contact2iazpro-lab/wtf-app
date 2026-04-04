import { useState, useEffect } from 'react'
import SettingsModal from '../components/SettingsModal'
import CoinsIcon from '../components/CoinsIcon'
import { audio } from '../utils/audio'
import { getCategoryById, CATEGORIES } from '../data/facts'
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
  onShare = null,
  onFactDetail = null,
  onChallengeUp = null,
  unlockedFactsThisSession = [],
  sessionsToday = 0,
  playerCoins = 0,
  playerTickets = 0,
  playerHints = 0,
}) {
  const S = (px) => `calc(${px}px * var(--scale))`
  const { isConnected, signInWithGoogle } = useAuth()
  const [showSettings, setShowSettings] = useState(false)
  const [showConnectBanner, setShowConnectBanner] = useState(false)
  const [coinAnimActive, setCoinAnimActive] = useState(false)
  const [audioDuration, setAudioDuration] = useState(2.5)
  const [rankVisible, setRankVisible] = useState(false)      // MOD 6
  const [visibleStars, setVisibleStars] = useState(0)        // MOD 6
  const [animatedScore, setAnimatedScore] = useState(0)      // MOD 6
  const [sharedCopied, setSharedCopied] = useState(false)    // MOD 10
  const [confettiActive, setConfettiActive] = useState(false) // COR 4
  const [ticketPopVisible, setTicketPopVisible] = useState(false)

  // Category color (MOD 1)
  const cat = categoryId ? getCategoryById(categoryId) : null
  const catColor = cat?.color || '#FF5C1A'
  const textOnBg = isLightColor(catColor) ? '#1a1a1a' : '#ffffff'

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
      backgroundColor: catColor,
    }}>

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
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexShrink: 0, padding: `${S(8)} ${S(12)}` }}>
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

      {/* scrollable zone */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">

      {/* MOD 6 — Rang avec effet tampon scale 0→1 */}
      <div className="flex flex-col items-center pt-4 pb-1 px-6 shrink-0">
        <div
          className="text-5xl mb-1"
          style={{
            transform: rankVisible ? 'scale(1)' : 'scale(0)',
            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}>
          {currentRank.emoji}
        </div>
        <div
          className="text-lg font-black mb-0.5 text-center"
          style={{
            color: textOnBg,
            transform: rankVisible ? 'scale(1)' : 'scale(0)',
            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.08s',
          }}>
          {currentRank.label}
        </div>
        <div className="text-xs font-semibold text-center px-6 leading-relaxed" style={{ color: textOnBg, opacity: 0.75 }}>
          {currentRank.message}
        </div>
      </div>

      {/* MOD 6 — Étoiles qui poppent une par une (délai 200ms) */}
      <div className="flex justify-center gap-3 pb-2 shrink-0">
        {[1, 2, 3].map((s) => (
          <span
            key={s}
            className="text-3xl"
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

      {/* ── Badge Perfect ───────────────────────────────────────────────── */}
      {isPerfect && (
        <div
          className="mx-5 mb-3 rounded-3xl p-4 shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(253,224,71,0.22) 0%, rgba(245,158,11,0.35) 100%)',
            border: '2px solid rgba(253,224,71,0.6)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 24px rgba(245,158,11,0.35)',
          }}
        >
          {/* Titre badge */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <span style={{ fontSize: 28 }}>⭐</span>
            <span
              className="font-black uppercase tracking-widest"
              style={{ fontSize: 22, color: '#FDE047', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
            >
              PERFECT !
            </span>
            <span style={{ fontSize: 28 }}>⭐</span>
          </div>

          {/* Message */}
          <p
            className="text-center font-bold leading-relaxed mb-3"
            style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)' }}
          >
            Incroyable ! Tu as répondu correctement à toutes les questions !
          </p>

          {/* Récompense ticket */}
          {ticketEarned && (
            <div
              className="flex items-center justify-center gap-2 rounded-2xl py-2 px-4"
              style={{
                background: 'rgba(253,224,71,0.18)',
                border: '1px solid rgba(253,224,71,0.4)',
                transform: ticketPopVisible ? 'scale(1)' : 'scale(0)',
                transition: 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <span style={{ fontSize: 20 }}>🎟️</span>
              <span className="font-black" style={{ fontSize: 15, color: '#FDE047' }}>
                +1 ticket bonus !
              </span>
            </div>
          )}
        </div>
      )}

      {/* Score card */}
      <div className="mx-5 mb-2 rounded-3xl border p-3 shrink-0" style={{ background: 'rgba(0,0,0,0.25)', borderColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(12px)' }}>
        {/* MOD 6 — Score animé count-up */}
        <div className="text-center mb-2">
          <div className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: textOnBg, opacity: 0.6 }}>Coins gagnés</div>
          <div className="text-4xl font-black" style={{ color: textOnBg }}>{animatedScore}</div>
        </div>

        {/* Progress bar couleur catégorie */}
        <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,0.15)' }}>
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${precision}%`, background: `linear-gradient(90deg, ${catColor}cc, ${catColor})` }}
          />
        </div>

        {/* Stats — renommés */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xl font-black" style={{ color: textOnBg }}>{correctCount}</div>
            <div className="text-xs font-semibold" style={{ color: textOnBg, opacity: 0.6 }}>F*cts débloqués</div>
          </div>
          <div>
            <div className="text-xl font-black" style={{ color: textOnBg }}>{totalFacts - correctCount}</div>
            <div className="text-xs font-semibold" style={{ color: textOnBg, opacity: 0.6 }}>F*cts à découvrir</div>
          </div>
          <div>
            {/* MOD 3 — Précision basée sur correctCount / totalFacts */}
            <div className="text-xl font-black" style={{ color: catColor }}>{precision}%</div>
            <div className="text-xs font-semibold" style={{ color: textOnBg, opacity: 0.6 }}>Précision</div>
          </div>
        </div>
      </div>

      {/* COR 6 — Stats joueurs sous le score */}
      <div className="text-center px-5 mb-1 shrink-0">
        <span className="text-xs font-semibold" style={{ color: textOnBg, opacity: 0.55 }}>
          👥 En moyenne, les joueurs réussissent {avgSuccessRate}% des f*cts de cette catégorie
        </span>
      </div>

      {/* COR 2 — Carrousel horizontal des facts débloqués + non débloqués */}
      {unlockedFactsThisSession.length > 0 && (
        <div className="mb-3 shrink-0">
          <div className="px-5 mb-2">
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: textOnBg, opacity: 0.8 }}>
              🔓 F*cts débloqués ({unlockedFactsThisSession.length})
            </span>
          </div>
          <div
            className="flex gap-2.5 overflow-x-auto scrollbar-hide"
            style={{ paddingLeft: 20, paddingRight: 20 }}>
            {unlockedFactsThisSession.map((fact) => {
              const factCat = CATEGORIES.find(c => c.id === fact.category)
              const factCatColor = factCat?.color || catColor
              const isUnlocked = fact._unlocked !== false
              return (
                <div
                  key={fact.id}
                  className="shrink-0 rounded-2xl overflow-hidden flex flex-col active:scale-95 transition-all"
                  style={{
                    width: 110,
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    backdropFilter: 'blur(8px)',
                    cursor: onFactDetail ? 'pointer' : 'default',
                  }}
                  onClick={() => onFactDetail && onFactDetail(fact)}>
                  {/* Image — floutée si non débloqué */}
                  <div
                    className="w-full flex items-center justify-center overflow-hidden relative"
                    style={{ height: 70, background: `linear-gradient(135deg, ${factCatColor}44, ${factCatColor})` }}>
                    {fact.imageUrl ? (
                      <img
                        src={fact.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        style={!isUnlocked ? { filter: 'blur(8px) brightness(0.6)' } : undefined}
                        onError={e => {
                          e.target.style.display = 'none'
                          e.target.nextSibling.style.display = 'flex'
                        }}
                      />
                    ) : null}
                    {/* Fallback flouté — gradient catégorie */}
                    <div
                      className="w-full h-full items-center justify-center absolute inset-0"
                      style={{
                        display: fact.imageUrl ? 'none' : 'flex',
                        background: `linear-gradient(135deg, ${factCatColor}66, ${factCatColor})`,
                        filter: !isUnlocked ? 'blur(4px) brightness(0.6)' : 'none',
                      }}>
                      <span style={{ fontSize: 28, color: 'white', fontWeight: 900, opacity: 0.3 }}>?</span>
                    </div>
                  </div>
                  {/* Numéro du f*ct en couleur catégorie */}
                  <div className="px-2 py-1.5 flex-1 flex items-center justify-center">
                    <span className="font-black text-sm" style={{ color: factCatColor }}>
                      #{fact.id}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* MOD 7 — Coins gagnés (avec bonus parfait si 10/10) */}
      {totalCoins > 0 && (
        <div className="mx-5 mb-3 rounded-2xl border p-3 shrink-0" style={{ background: 'rgba(255,215,0,0.12)', borderColor: 'rgba(255,215,0,0.4)', backdropFilter: 'blur(8px)' }}>
          <div className="flex items-center gap-3">
            <CoinsIcon size={32} />
            <div className="flex-1">
              <div className="text-yellow-200 font-black text-base">+{totalCoins} WTF! Coins</div>
              {isPerfect && perfectBonus > 0 ? (
                <div className="text-yellow-300/80 text-xs font-semibold">
                  {coinsEarned} coins + {perfectBonus} bonus score parfait 🌟
                </div>
              ) : (
                <div className="text-xs font-semibold" style={{ color: textOnBg, opacity: 0.5 }}>Ajoutés à ton solde</div>
              )}
            </div>
            {isPerfect && <span className="text-2xl">🏆</span>}
          </div>
        </div>
      )}

      {/* MOD 8 — Bandeau prochain micro-objectif */}
      <div className="mx-5 mb-2 rounded-2xl border p-3 shrink-0" style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)' }}>
        {cat ? (
          <div className="text-xs font-semibold text-center leading-relaxed" style={{ color: textOnBg, opacity: 0.8 }}>
            🏅 <span style={{ color: catColor }}>{cat.label}</span> — continue les quêtes pour débloquer ton prochain badge !
          </div>
        ) : (
          <div className="text-xs font-semibold text-center leading-relaxed" style={{ color: textOnBg, opacity: 0.7 }}>
            Lance une nouvelle quête pour débloquer ton premier badge !
          </div>
        )}
      </div>

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
      <div className="px-5 pb-4 flex flex-col gap-2 shrink-0">

        {/* COR 5 — Message tickets restants */}
        <div className="text-center text-xs font-bold mb-1" style={{ color: textOnBg, opacity: 0.75 }}>
          {remainingQuests > 0
            ? `🎯 Tu as encore ${remainingQuests} quête${remainingQuests > 1 ? 's' : ''} disponible${remainingQuests > 1 ? 's' : ''} aujourd'hui !`
            : "✅ Tu as utilisé toutes tes quêtes du jour — reviens demain !"}
        </div>

        {/* COR 3 — Principal : Rejouer même catégorie + difficulté */}
        <button
          onClick={onReplay}
          className="btn-press w-full py-4 rounded-2xl font-black text-base uppercase tracking-wide active:scale-95 transition-all"
          style={{
            background: `linear-gradient(135deg, ${catColor} 0%, ${catColor}cc 100%)`,
            boxShadow: `0 8px 32px ${catColor}50`,
            color: isLightColor(catColor) ? '#1a1a1a' : 'white',
          }}>
          🔄 Rejouer
        </button>

        {/* COR 4 — Défier sur difficulté supérieure */}
        {difficulty && (
          <button
            onClick={() => onChallengeUp && onChallengeUp()}
            className="btn-press w-full py-3.5 rounded-2xl font-black text-sm active:scale-95 transition-all border-2"
            style={{
              background: 'rgba(255,255,255,0.08)',
              borderColor: `${textOnBg}40`,
              color: textOnBg,
            }}>
            {CHALLENGE_LABELS[difficulty.id || difficulty] || 'Changer de mode ⚡'}
          </button>
        )}

        {/* COR 5 — Partager + Défier */}
        <button
          onClick={handleShare}
          className="btn-press w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all border"
          style={{ background: 'rgba(255,255,255,0.1)', borderColor: `${textOnBg}30`, color: textOnBg }}>
          <span>{sharedCopied ? '✅' : '📤'}</span>
          {sharedCopied ? 'Copié !' : 'Partager mon score & défier mes amis'}
        </button>

        {/* Bannière connexion pour joueurs non connectés après Flash */}
        {sessionType === 'flash_solo' && !isConnected && (
          <div style={{
            background: 'rgba(255,255,255,0.15)', borderRadius: 16,
            padding: '14px 16px', textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: textOnBg, margin: '0 0 10px', lineHeight: 1.4 }}>
              Tu as aimé ? Connecte-toi pour débloquer tous les modes et sauvegarder ta progression !
            </p>
            <button
              onClick={() => setShowConnectBanner(true)}
              style={{
                width: '100%', padding: '10px 0', borderRadius: 12,
                background: '#fff', border: 'none', cursor: 'pointer',
                fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 13,
                color: '#FF6B1A',
              }}
            >
              Se connecter avec Google
            </button>
          </div>
        )}

        {/* Secondaire — Revenir, discret */}
        <button
          onClick={handleGoHome}
          className="btn-press w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
          style={{ background: 'transparent', color: textOnBg, opacity: 0.55 }}>
          ← Revenir
        </button>
      </div>

      {showConnectBanner && <ConnectBanner onClose={() => setShowConnectBanner(false)} />}
    </div>
  )
}
