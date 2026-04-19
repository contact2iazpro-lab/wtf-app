import { useState, useEffect, useRef } from 'react'
import GameHeader from '../components/GameHeader'
import { audio } from '../utils/audio'
import { getCategoryById, CATEGORIES } from '../data/facts'
import { usePlayerProfile } from '../hooks/usePlayerProfile'
import { useAuth } from '../context/AuthContext'
import ConnectBanner from '../components/ConnectBanner'
import FactDetailView from '../components/FactDetailView'
// Phase 5.2 A — composants results extraits
import ResultsRankHeader from '../components/results/ResultsRankHeader'
import GainsBreakdown from '../components/results/GainsBreakdown'
import FeaturedFactCard from '../components/results/FeaturedFactCard'
import ResultsActionButtons from '../components/results/ResultsActionButtons'

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
  { score: 10, emoji: 'wtf-star', label: 'PARFAIT WTF!',  message: 'Parfait ! Tu es officiellement WTF! certifié 🏆' },
]

// Quickie — 6 niveaux (0-5)
const QUICKIE_RANKINGS = [
  { score: 0, label: 'Allez, tu peux que faire mieux !' },
  { score: 1, label: 'Mouais...' },
  { score: 2, label: 'Pas maaaaal...' },
  { score: 3, label: 'On passe un cap là !' },
  { score: 4, label: "T'es un crack !" },
  { score: 5, label: 'Yes ! Perfect !' },
]

// Vrai ET Fou — 6 paliers sur /10 (mode viralité, pas de coins)
// Migré 20→10 le 18/04/2026
const VOF_RANKINGS = [
  { max: 2,  emoji: '😅', label: 'Aïe… retente ta chance !' },
  { max: 4,  emoji: '🤔', label: 'Tu chauffes, continue !' },
  { max: 6,  emoji: '👍', label: 'Pas mal, tu peux mieux.' },
  { max: 7,  emoji: '😎', label: 'Bon flair !' },
  { max: 9,  emoji: '🎯', label: 'Excellent score !' },
  { max: 10, emoji: '🔥', label: 'Perfect ! Tu es une machine.' },
]
function getVofRank(correct) {
  return VOF_RANKINGS.find(r => correct <= r.max) || VOF_RANKINGS[0]
}

function getStars(correct, total) {
  const ratio = correct / total
  if (ratio >= 1) return 3
  if (ratio >= 0.6) return 2
  if (ratio > 0) return 1
  return 0
}

const DIFFICULTY_LABELS = { quickie: 'Quickie', quest: 'Quest', flash: 'Flash', blitz: 'Blitz', race: 'Race', vrai_ou_fou: 'Vrai ET Fou' }
const DIFFICULTY_EMOJIS = { quickie: '🍿', quest: '🗺️', flash: '⚡', blitz: '⏱️', race: '🏎️', vrai_ou_fou: '🤔' }
const CHALLENGE_LABELS = {}

// COR 4 — Confetti colors
const CONFETTI_COLORS = ['#FF5C1A', '#FFD700', '#FF4081', '#00BCD4', '#7C4DFF', '#4CAF50', '#FF9800', '#E91E63']
const DAILY_LIMIT = 3

export default function ResultsScreen({
  score,
  correctCount,
  totalFacts,
  onReplay,
  onReplayHarder,
  onHome,
  completedCategoryLevels = [],
  coinsEarned = 0,
  sessionType = 'parcours',
  difficulty = null,
  categoryId = null,
  unlockedFactsThisSession = [],
  allSessionFacts = [],
  sessionsToday = 0,
  onSaveTempFacts = null,
  onCollection = null,
}) {
  const S = (px) => `calc(${px}px * var(--scale))`
  const { isConnected, signInWithGoogle } = useAuth()
  const { coins: _cCoins, hints: _cHints, applyCurrencyDelta, unlockFact } = usePlayerProfile()
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
  const [showConnectBanner, setShowConnectBanner] = useState(false)
  const [savedAfterConnect, setSavedAfterConnect] = useState(false)
  const [selectedFact, setSelectedFact] = useState(null)
  // F*ct en cours de visualisation (détail overlay — pour les f*cts déjà débloqués)
  const [viewingFact, setViewingFact] = useState(null)
  // F*cts débloqués par achat depuis ce ResultsScreen (pour refresh immédiat du carrousel)
  const [extraUnlockedIds, setExtraUnlockedIds] = useState(() => new Set())

  // Back physique : si un overlay est ouvert (FactDetailView / modal unlock), fermer au lieu de quitter
  useEffect(() => {
    const prev = window.__wtfBackHandler
    window.__wtfBackHandler = () => {
      if (viewingFact) { setViewingFact(null); return true }
      if (selectedFact) { setSelectedFact(null); return true }
      return false
    }
    return () => { window.__wtfBackHandler = prev || null }
  }, [viewingFact, selectedFact])

  // Persister les facts temporaires quand le joueur se connecte depuis ResultsScreen
  useEffect(() => {
    if (isConnected && !savedAfterConnect && onSaveTempFacts && sessionType === 'quickie') {
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

  // Category color (MOD 1)
  const cat = categoryId ? getCategoryById(categoryId) : null
  const catColor = cat?.color || '#FF5C1A'
  const textOnBg = '#ffffff' // Toujours blanc sur fond sombre (overlay garanti)

  // MOD 5 — Rank based on correct answers
  const isQuickie = sessionType === 'quickie'
  const isVof = sessionType === 'vrai_ou_fou'
  const currentRank = isVof
    ? getVofRank(correctCount)
    : isQuickie
      ? QUICKIE_RANKINGS[Math.min(Math.max(correctCount, 0), 5)]
      : RANKINGS[Math.min(Math.max(correctCount, 0), 10)]
  const stars = correctCount
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
  const screenBg = isQuickie
    ? 'linear-gradient(160deg, #FF7518, #FFA500)'
    : isVof
      ? 'linear-gradient(160deg, #3A8A4A, #6BCB77)'
      : bgRef.current

  // COR 6 — Taux moyen pseudo-aléatoire stable par catégorie
  const avgSuccessRate = 15 + ((categoryId ? categoryId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) : 50) % 40)
  // Récap gains structuré
  const coinsPerCorrect = difficulty?.coinsPerCorrect ?? 0
  const baseCoins = correctCount * coinsPerCorrect
  const bonusCoins = Math.max(0, coinsEarned - baseCoins)

  // Fact le plus WTF de la session : priorité VIP, sinon dernier débloqué
  const featuredFact = (() => {
    if (!unlockedFactsThisSession || unlockedFactsThisSession.length === 0) return null
    const vip = unlockedFactsThisSession.find(f => f.isVip)
    if (vip) return vip
    return unlockedFactsThisSession[unlockedFactsThisSession.length - 1]
  })()

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

  // Bloc 3.6 — Vibration aux résultats : pattern long si perfect, court sinon
  useEffect(() => {
    audio.vibrate(isPerfect ? [60, 40, 60, 40, 120] : [40])
  }, [isPerfect])

  // MOD 6 — Sequential animations on mount
  useEffect(() => {
    const t1 = setTimeout(() => setRankVisible(true), 250)
    const starTimers = [1, 2, 3, 4, 5].map((s, i) =>
      setTimeout(() => { if (s <= stars) setVisibleStars(s) }, 500 + i * 150)
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


  // Share handler natif avec message défi
  const handleShare = () => {
    const diffLabel = difficulty ? (DIFFICULTY_LABELS[difficulty.id] || DIFFICULTY_LABELS[difficulty] || difficulty.label || sessionType) : sessionType
    const text = isVof
      ? `J'ai eu ${correctCount}/${totalFacts} au Vrai ET Fou WTF! 🤯 Tu peux faire mieux ? ${window.location.origin}`
      : `J'ai fait ${correctCount}/${totalFacts} en mode ${diffLabel} sur What The F*ct !\nTu peux faire mieux ? ${window.location.origin}`
    if (navigator.share) {
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
      position: 'absolute', inset: 0, zIndex: 0,
      display: 'flex', flexDirection: 'column',
      background: screenBg,
      overflow: 'hidden',
    }}>
      <style>{`.results-content::-webkit-scrollbar { display: none; }`}</style>
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
                }}><img src="/assets/ui/icon-coins.png" alt="coins" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} /></span>
              )
            })}
          </div>
        )
      })()}

      {/* ═══ HEADER — GameHeader unifié ═══ */}
      <div style={{ position: 'relative', zIndex: 2, flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <GameHeader
          categoryLabel={!isQuickie ? 'Résultats' : null}
          categoryIcon={cat ? `/assets/categories/${categoryId}.png` : null}
          onQuit={handleGoHome}
        />
      </div>

      {/* ═══ CONTENT CENTRAL (flex-1, no scroll prioritaire, fallback auto) ═══ */}
      <div className="results-content" style={{
        flex: 1, minHeight: 0,
        display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden',
        position: 'relative', zIndex: 2, padding: `${S(6)} ${S(14)}`, gap: S(8),
        scrollbarWidth: 'none',
      }}>

        {/* Badge mode + difficulté */}
        {isQuickie ? (
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S(8), flexShrink: 0 }}>
            <img src="/assets/modes/quickie.png?v=2" alt="Quickie" style={{ width: S(28), height: S(28), objectFit: 'contain' }} />
            <span style={{ fontSize: S(13), fontWeight: 900, color: textOnBg }}>Résultats — Mode Quickie</span>
          </div>
        ) : isVof ? (
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S(8), flexShrink: 0 }}>
            <img src="/assets/modes/icon-vrai-et-fou.png" alt="Vrai ET Fou" style={{ width: S(28), height: S(28), objectFit: 'contain' }} />
            <span style={{ fontSize: S(13), fontWeight: 900, color: textOnBg }}>Résultats — Mode Vrai ET Fou</span>
          </div>
        ) : difficulty && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: S(6), flexShrink: 0 }}>
            <span style={{ fontSize: S(14) }}>{DIFFICULTY_EMOJIS[difficulty.id] || '❓'}</span>
            <span style={{ fontSize: S(13), fontWeight: 900, color: textOnBg }}>
              {sessionType === 'parcours' ? `Quest — ${DIFFICULTY_LABELS[difficulty.id] || difficulty.label}` : 'Mode'}
            </span>
          </div>
        )}

        {/* Rang + Étoiles + Badge Perfect — composant extrait (Phase 5.2 A) */}
        <ResultsRankHeader
          emoji={currentRank.emoji}
          customIcon={null}
          label={currentRank.label}
          stars={stars}
          visibleStars={visibleStars}
          rankVisible={rankVisible}
          catColor={isVof ? '#6BCB77' : catColor}
          textOnBg={textOnBg}
          isPerfect={isPerfect}
          hideEmoji={isQuickie}
          hideStars={isVof}
          largeLabelFont={isQuickie}
        />

        {/* Récap gains structuré (Quickie/Quest/...) ou bloc Score X/20 (VOF) */}
        {isVof ? (
          <div style={{
            background: 'rgba(0,0,0,0.35)', border: '2.5px solid #6BCB77',
            borderRadius: S(12), padding: `${S(10)} ${S(14)}`, flexShrink: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: S(4),
            textShadow: '0 1px 4px rgba(0,0,0,0.7)',
          }}>
            <span style={{ fontSize: S(10), fontWeight: 800, color: textOnBg, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Score final
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: S(2) }}>
              <span style={{ fontSize: S(36), fontWeight: 900, color: correctCount >= totalFacts * 0.5 ? '#6BCB77' : '#E84535', lineHeight: 1 }}>
                {correctCount}
              </span>
              <span style={{ fontSize: S(20), fontWeight: 900, color: '#6BCB77', opacity: 0.8 }}>
                /{totalFacts}
              </span>
            </div>
            <span style={{ fontSize: S(11), fontWeight: 700, color: textOnBg, opacity: 0.85 }}>
              {precision}% de bonnes réponses
            </span>
          </div>
        ) : (
          <GainsBreakdown
            correctCount={correctCount}
            coinsPerCorrect={coinsPerCorrect}
            baseCoins={baseCoins}
            bonusCoins={bonusCoins}
            isPerfect={isPerfect}
            total={animatedScore}
            totalColor={catColor}
            textColor={textOnBg}
            borderColor={isQuickie ? '#FFA500' : null}
            footerStats={[
              { label: `${correctCount}/${totalFacts} trouvés`, color: textOnBg },
              { label: `${precision}% précision`, color: catColor },
            ]}
          />
        )}

        {/* Fact le plus WTF — pour VOF, limité aux facts déjà débloqués (globalement) */}
        {(() => {
          let shownFact = featuredFact
          if (isVof) {
            const globalUnlocked = new Set([
              ...((wtfData.unlockedFacts) || []),
              ...extraUnlockedIds,
            ])
            const sessionUnlocked = allSessionFacts
              .map(e => e.fact || e)
              .filter(f => globalUnlocked.has(f.id))
            // Priorise VIP parmi débloqués, sinon dernier débloqué, sinon null
            shownFact = sessionUnlocked.find(f => f.isVip) || sessionUnlocked[sessionUnlocked.length - 1] || null
          }
          return (
            <FeaturedFactCard
              fact={shownFact}
              fallbackColor={catColor}
              textColor={textOnBg}
              isQuickie={isQuickie || isVof}
              onClick={() => {
                if (!shownFact) return
                audio.play?.('click')
                setViewingFact(shownFact)
              }}
            />
          )
        })()}

        {/* Carrousel facts VOF : ✓/✗ + facts lockés achetables (comme Quickie) */}
        {allSessionFacts.length > 0 && isVof && (() => {
          const globalUnlocked = new Set([
            ...((wtfData.unlockedFacts) || []),
            ...extraUnlockedIds,
          ])
          const answered = allSessionFacts.map((entry, i) => ({
            fact: entry.fact || entry,
            wasCorrect: entry.wasCorrect ?? false,
            idx: i,
          }))
          const right = answered.filter(a => a.wasCorrect)
          const wrong = answered.filter(a => !a.wasCorrect)
          const renderRow = (items, label, color) => items.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: S(4) }}>
              <span style={{ fontSize: S(10), fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {label}
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, 1fr)`, gap: S(3), width: '100%' }}>
                {items.map(({ fact, wasCorrect, idx }) => {
                  const fc = CATEGORIES.find(c => c.id === fact.category)
                  const fcColor = fc?.color || catColor
                  const isUnlocked = globalUnlocked.has(fact.id)
                  const handleClick = () => {
                    audio.play?.('click')
                    if (isUnlocked) setViewingFact(fact)
                    else setSelectedFact({ ...fact, _locked: true, _catColor: fcColor, _catEmoji: fc?.emoji, _catLabel: fc?.label })
                  }
                  return (
                    <div key={`${idx}-${fact.id}`} style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
                      onClick={handleClick}>
                      <div style={{
                        aspectRatio: '1', borderRadius: S(6), overflow: 'hidden', position: 'relative',
                        border: `2px solid ${wasCorrect ? '#6BCB77' : '#E84535'}`,
                        background: `linear-gradient(135deg, ${fcColor}44, ${fcColor})`,
                      }}>
                        {fact.imageUrl ? (
                          <img src={fact.imageUrl} alt="" style={{
                            width: '100%', height: '100%', objectFit: 'cover',
                            filter: isUnlocked ? 'none' : 'blur(4px) brightness(0.4)',
                          }} onError={e => { e.target.style.display = 'none' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', filter: isUnlocked ? 'none' : 'brightness(0.4)' }}>
                            <img src={`/assets/categories/${fact.category}.png`} alt="" style={{ width: '55%', height: '55%', objectFit: 'contain', opacity: 0.7 }} onError={e => { e.target.style.display = 'none' }} />
                          </div>
                        )}
                        {!isUnlocked && (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: S(14), opacity: 0.85 }}>🔒</span>
                          </div>
                        )}
                        <div style={{ position: 'absolute', top: 2, right: 2, width: S(14), height: S(14), borderRadius: '50%', background: wasCorrect ? '#6BCB77' : '#E84535', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: S(10), fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                          {wasCorrect ? '✓' : '✗'}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: S(8), flexShrink: 0 }}>
              {renderRow(right, `✅ ${right.length} Trouvé${right.length > 1 ? 's' : ''}`, '#6BCB77')}
              {renderRow(wrong, `❌ ${wrong.length} Raté${wrong.length > 1 ? 's' : ''}`, '#E84535')}
              <span style={{ fontSize: S(10), color: textOnBg, opacity: 0.7, textAlign: 'center', fontStyle: 'italic', marginTop: S(2) }}>
                🔒 Clique un f*ct verrouillé pour le débloquer (25 <img src="/assets/ui/icon-coins.png" alt="" style={{ width: '1em', height: '1em', verticalAlign: 'middle' }} />)
              </span>
            </div>
          )
        })()}

        {/* Carrousel facts Quickie/autres — max 80px height */}
        {allSessionFacts.length > 0 && !isVof && (() => {
          const unlockedIds = new Set([
            ...unlockedFactsThisSession.map(f => f.id),
            ...extraUnlockedIds,
          ])
          const unlocked = allSessionFacts.filter(f => unlockedIds.has(f.id))
          const locked = allSessionFacts.filter(f => !unlockedIds.has(f.id))
          const sorted = [...unlocked, ...locked]
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: S(8), flexShrink: 0 }}>
              {/* Ligne Débloqués */}
              {unlocked.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: S(4) }}>
                  <span style={{ fontSize: S(10), fontWeight: 800, color: '#4CAF50', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    🔓 {unlocked.length} Débloqué{unlocked.length > 1 ? 's' : ''}
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${allSessionFacts.length}, 1fr)`, gap: S(4), width: '100%' }}>
                    {unlocked.map((fact) => {
                      const factCat = CATEGORIES.find(c => c.id === fact.category)
                      const factCatColor = factCat?.color || catColor
                      return (
                        <div key={fact.id} style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
                          onClick={() => { audio.play?.('click'); setViewingFact(fact) }}>
                          <div style={{
                            aspectRatio: '1', borderRadius: `${S(8)} ${S(8)} 0 0`, overflow: 'hidden', position: 'relative',
                            border: `2px solid ${factCatColor}`, borderBottom: 'none',
                            background: `linear-gradient(135deg, ${factCatColor}44, ${factCatColor})`,
                          }}>
                            {fact.imageUrl ? (
                              <img src={fact.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={e => { e.target.style.display = 'none' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: S(20), opacity: 0.3 }}>?</span>
                              </div>
                            )}
                          </div>
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
              )}
              {/* Ligne À découvrir */}
              {locked.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: S(4) }}>
                  <span style={{ fontSize: S(10), fontWeight: 800, color: textOnBg, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    🔒 {locked.length} À découvrir
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${allSessionFacts.length}, 1fr)`, gap: S(4), width: '100%' }}>
                    {locked.map((fact) => {
                      const factCat = CATEGORIES.find(c => c.id === fact.category)
                      const factCatColor = factCat?.color || catColor
                      return (
                        <div key={fact.id} style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
                          onClick={() => { setSelectedFact({ ...fact, _locked: true, _catColor: factCatColor, _catEmoji: factCat?.emoji, _catLabel: factCat?.label }) }}>
                          <div style={{
                            aspectRatio: '1', borderRadius: `${S(8)} ${S(8)} 0 0`, overflow: 'hidden', position: 'relative',
                            border: `2px solid ${factCatColor}`, borderBottom: 'none',
                            background: `linear-gradient(135deg, ${factCatColor}44, ${factCatColor})`,
                          }}>
                            {fact.imageUrl ? (
                              <img src={fact.imageUrl} alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(4px) brightness(0.4)' }}
                                onError={e => { e.target.style.display = 'none' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', filter: 'brightness(0.4)' }}>
                                <span style={{ fontSize: S(20), opacity: 0.3 }}>?</span>
                              </div>
                            )}
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: S(16), opacity: 0.8 }}>🔒</span>
                            </div>
                          </div>
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
              )}
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
                    {lvlCat?.emoji || '❓'}
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

      {/* Footer — composant extrait (Phase 5.2 A) */}
      <ResultsActionButtons
        sessionType={sessionType}
        difficulty={difficulty}
        challengeLabel={sessionType === 'parcours' && difficulty && CHALLENGE_LABELS[difficulty.id] ? CHALLENGE_LABELS[difficulty.id] : null}
        categoryLabel={cat?.label || null}
        categoryId={categoryId}
        onReplay={onReplay}
        onReplayHarder={onReplayHarder}
        onShare={handleShare}
        onHome={handleGoHome}
        sharedCopied={sharedCopied}
      />



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
            {(() => {
              // Option A (19/04/2026) : 50c Funny / 250c VIP — aligné avec
              // CategoryFactsView (Collection) et CLAUDE.md mini-parcours.
              const unlockCost = selectedFact.isVip ? 250 : 50
              const canUnlock = _cCoins >= unlockCost
              return (
                <>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 16, lineHeight: 1.4 }}>
                    {selectedFact.isVip
                      ? `Ce f*ct VIP est encore verrouillé. Dépense ${unlockCost} coins pour le découvrir !`
                      : `Ce f*ct est encore verrouillé. Dépense ${unlockCost} coins pour le découvrir !`}
                  </div>

                  <button
                    onClick={() => {
                      if (!canUnlock) return
                      applyCurrencyDelta?.({ coins: -unlockCost }, 'unlock_fact_post_session')?.catch?.(e =>
                        console.warn('[ResultsScreen] unlock fact RPC failed:', e?.message || e)
                      )
                      unlockFact?.(selectedFact.id, selectedFact.category, 'unlock_fact_post_session').catch(e =>
                        console.warn('[ResultsScreen] unlockFact RPC failed:', e?.message || e)
                      )
                      try {
                        const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
                        const unlocked = wd.unlockedFacts || []
                        if (!unlocked.includes(selectedFact.id)) unlocked.push(selectedFact.id)
                        wd.unlockedFacts = unlocked
                        wd.lastModified = Date.now()
                        localStorage.setItem('wtf_data', JSON.stringify(wd))
                        window.dispatchEvent(new Event('wtf_storage_sync'))
                      } catch { /* ignore */ }
                      setExtraUnlockedIds(prev => {
                        const next = new Set(prev)
                        next.add(selectedFact.id)
                        return next
                      })
                      audio.play?.('correct')
                      setSelectedFact(null)
                    }}
                    disabled={!canUnlock}
                    style={{
                      width: '100%', padding: '12px 0', borderRadius: 14, border: 'none',
                      background: canUnlock ? 'linear-gradient(135deg, #FFD700, #FFA500)' : '#E5E7EB',
                      color: canUnlock ? '#1a1a2e' : '#9CA3AF', fontWeight: 900, fontSize: 14,
                      cursor: canUnlock ? 'pointer' : 'not-allowed',
                      boxShadow: canUnlock ? '0 4px 16px rgba(255,215,0,0.4)' : 'none',
                    }}>
                    <img src="/assets/ui/icon-coins.png" alt="coins" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} /> Débloquer ({unlockCost} coins)
                  </button>
                  {!canUnlock && (
                    <div style={{ fontSize: 11, color: '#EF4444', fontWeight: 700, marginTop: 8 }}>
                      Pas assez de coins ({_cCoins} <img src="/assets/ui/icon-coins.png" alt="coins" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} />)
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      )}

      {showConnectBanner && <ConnectBanner onClose={() => setShowConnectBanner(false)} />}

      {/* Google banner supprimé — utilise ConnectBanner unique */}

      {/* Détail d'un f*ct débloqué (overlay, reste sur ResultsScreen) */}
      {viewingFact && (
        <FactDetailView fact={viewingFact} onClose={() => setViewingFact(null)} />
      )}
    </div>
  )
}
