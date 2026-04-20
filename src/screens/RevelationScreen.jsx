import { useState, useEffect, useRef } from 'react'
import SettingsModal from '../components/SettingsModal'
import CoinsIcon from '../components/CoinsIcon'
import { getCategoryById } from '../data/facts'
import { audio } from '../utils/audio'
import renderFormattedText from '../utils/renderFormattedText'
import { stripEmojis } from '../utils/stripEmojis'
import { usePlayerProfile } from '../hooks/usePlayerProfile'
import FallbackImage from '../components/FallbackImage'
import BatteryIcon from '../components/home/BatteryIcon'
import { getQuickieEnergy } from '../services/energyService'

// ── isLightColor ────────────────────────────────────────────────────────────
const isLightColor = (hex) => {
  if (!hex) return false
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 160
}

// ── Messages bienveillants ─────────────────────────────────────────────────────
const WRONG_MESSAGES = [
  "Pas grave, maintenant tu sais... que tu ne sais pas ! 😅",
  "Même les experts se trompent sur celui-là 🧠",
  "Tu l'auras la prochaine fois ! 💪",
  "Ce f*ct est tellement WTF! qu'on comprend que tu aies raté ! 😂",
  "Même Elon Musk aurait séché sur celui-là ! 🧠",
  "Retente ta chance... ce f*ct mérite d'être connu !",
  "Un de perdu...un de perdu ! 🎯",
  "What the... Ah bah non ! 🤯",
  "Ton cerveau a bugué 🧠💥",
  "Même ChatGPT aurait hésité 🤖",
  "C'est un f*ct, pas une fiction ! 📖",
  "Presque... dans un univers parallèle 🌀",
  "Le f*ct a gagné cette manche 💪",
  "Ton doigt a glissé, avoue 👆",
  "WTF! Tu y étais presque ! 🎯",
  "Le savoir, ça se cultive 🌱",
  "Erreur 404 : bonne réponse non trouvée 🔍",
]

const CORRECT_MESSAGES = [
  "Parfait ! Ce f*ct est gravé dans ta mémoire 🔥",
  "Impressionnant ! Tu connaissais vraiment ça ? 🧠",
  "Exactement ! Tu es officiellement WTF! certifié 🏆",
  "Bravo ! Peu de gens savent ça 👏",
  "Bien joué ! Ce f*ct ne te quittera plus 💡",
  "Yes ! Tu as l'œil pour les f*cts incroyables 👁️",
  "Correct ! On t'a vu venir 😎",
  "Chapeau ! Ce f*ct est dans ta collection 🎩",
  "Magnifique ! Tu aurais fait un excellent joueur WTF! 🌟",
  "Incroyable mais vrai... comme toi ! ✨",
]

// ── Stamp animation CSS (injected once) ─────────────────────────────────────
const STAMP_STYLE_ID = 'revelation-stamp-style'
if (typeof document !== 'undefined' && !document.getElementById(STAMP_STYLE_ID)) {
  const style = document.createElement('style')
  style.id = STAMP_STYLE_ID
  style.textContent = `
    @keyframes stampImpact {
      0% { transform: translate(-50%, -50%) scale(2.5) rotate(-12deg); opacity: 0; }
      40% { transform: translate(-50%, -50%) scale(0.9) rotate(-12deg); opacity: 1; }
      60% { transform: translate(-50%, -50%) scale(1.05) rotate(-12deg); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(1) rotate(-12deg); opacity: 1; }
    }
    @keyframes coinFly {
      0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      80% { opacity: 1; }
      100% { opacity: 0; transform: translate(var(--coin-dx), var(--coin-dy)) scale(0.3); }
    }
    @keyframes goldShimmer {
      0%   { transform: translateX(-100%) translateY(-100%) rotate(25deg); }
      100% { transform: translateX(100%) translateY(100%) rotate(25deg); }
    }
    @keyframes goldSparkle {
      0%, 100% { opacity: 0; transform: scale(0.5); }
      50%      { opacity: 1; transform: scale(1.2); }
    }
    @keyframes goldBorderPulse {
      0%, 100% { box-shadow: 0 0 15px rgba(255,215,0,0.4), 0 0 30px rgba(255,215,0,0.2); }
      50%      { box-shadow: 0 0 25px rgba(255,215,0,0.6), 0 0 45px rgba(255,215,0,0.3), 0 0 70px rgba(255,215,0,0.1); }
    }
    .gold-card {
      border: 3px solid transparent !important;
      border-image: linear-gradient(135deg, #FFD700, #FFA500, #FFD700, #FFEC8B, #FFD700) 1 !important;
      border-radius: 0 !important;
      animation: goldBorderPulse 2s ease-in-out infinite;
    }
    .gold-card-rounded {
      border: 3px solid #FFD700 !important;
      box-shadow: 0 0 15px rgba(255,215,0,0.4), 0 0 30px rgba(255,215,0,0.2);
      animation: goldBorderPulse 2s ease-in-out infinite;
    }
    @keyframes holoRotate {
      from { --holo-angle: 0deg; }
      to   { --holo-angle: 360deg; }
    }
    @keyframes holoPrism {
      0%   { transform: translateX(-100%); }
      100% { transform: translateX(200%); }
    }
    @keyframes vipParticlePulse {
      0%, 100% { opacity: 0.1; transform: scale(0.8); }
      50%      { opacity: 0.35; transform: scale(1.2); }
    }
    @keyframes holoSweep {
      0%   { transform: translateX(-100%) skewX(-15deg); }
      100% { transform: translateX(200%) skewX(-15deg); }
    }
    @keyframes holoShimmer {
      0%   { background-position: 0% 50%; }
      100% { background-position: 200% 50%; }
    }
  `
  document.head.appendChild(style)
}


export default function RevelationScreen({
  fact,
  isCorrect,
  selectedAnswer,
  pointsEarned,
  hintsUsed,
  onNext,
  onShare,
  onQuit,
  factIndex,
  totalFacts,
  gameMode,
  sessionScore,
  sessionType = 'parcours',
  wrongAnswer,
  correctAnswer,
}) {
  const S = (px) => `calc(${px}px * var(--scale))`
  const { coins: _currencyCoins, hints: _currencyHints, applyCurrencyDelta } = usePlayerProfile()
  const [_currencyEnergy, setLocalEnergy] = useState(() => getQuickieEnergy().remaining)
  useEffect(() => {
    const refresh = () => setLocalEnergy(getQuickieEnergy().remaining)
    window.addEventListener('wtf_energy_updated', refresh)
    return () => window.removeEventListener('wtf_energy_updated', refresh)
  }, [])

  const [flipped, setFlipped] = useState(true)
  const [unlockedByCoins, setUnlockedByCoins] = useState(false)
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false)
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const [showLightbox, setShowLightbox] = useState(false)
  // sessionScore includes current points already — start display BEFORE this question's points
  const [displayedScore, setDisplayedScore] = useState(isCorrect ? sessionScore - pointsEarned : sessionScore)
  const [showScorePulse, setShowScorePulse] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  const [showCoins, setShowCoins] = useState(false)

  const [wrongMsg]   = useState(() => WRONG_MESSAGES[Math.floor(Math.random() * WRONG_MESSAGES.length)])
  const [correctMsg] = useState(() => CORRECT_MESSAGES[Math.floor(Math.random() * CORRECT_MESSAGES.length)])

  const scoreRefTarget = useRef(null)
  const nextButtonRef = useRef(null)
  const questionRef = useRef(null)
  const questionContainerRef = useRef(null)
  const [questionFontSize, setQuestionFontSize] = useState(14)
  const answerRef = useRef(null)
  const answerContainerRef = useRef(null)
  const [answerFontSize, setAnswerFontSize] = useState(15)
  const explanationRef = useRef(null)
  const explanationContainerRef = useRef(null)
  const [explanationFontSize, setExplanationFontSize] = useState(14)

  const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')
  const gamesPlayed = wtfData.gamesPlayed || 0

  const cat = getCategoryById(fact.category)
  const isLast = factIndex + 1 >= totalFacts
  const successRate = 15 + (fact.id % 40)
  const catTextColor = cat?.color ? (isLightColor(cat.color) ? '#1a1a1a' : '#ffffff') : 'rgba(255,255,255,0.8)'

  // COR 7 — Gradient catégorie identique dans les deux cas
  const isQuickieMode = sessionType === 'quickie'
  const isVofMode = sessionType === 'vrai_ou_fou'
  const isQuestMode = sessionType === 'parcours' || sessionType === 'quest'
  const isBrandedMode = isQuickieMode || isVofMode || isQuestMode
  const accentColor = isVofMode ? '#6BCB77' : isQuestMode ? '#FF6B1A' : '#E91E90'
  const MODE_HIGHLIGHT = { quickie: '#FF69B4', vrai_ou_fou: '#6BCB77', race: '#23D5D5', quest: '#FF6B1A', blitz: '#FF4444', drop: '#E91E63' }
  const questionHighlight = MODE_HIGHLIGHT[sessionType]
  const accentGradient = isVofMode
    ? 'linear-gradient(135deg, #6BCB77, #3A8A4A)'
    : isQuestMode
      ? 'linear-gradient(135deg, #FF6B1A, #D94A10)'
      : 'linear-gradient(135deg, #E91E90, #C2185B)'
  const accentShadow = isVofMode
    ? '0 4px 16px rgba(107,203,119,0.5)'
    : isQuestMode
      ? '0 4px 16px rgba(255,107,26,0.5)'
      : '0 4px 16px rgba(127,119,221,0.5)'
  const catGradient = cat
    ? `linear-gradient(160deg, ${cat.color}22 0%, ${cat.color} 100%)`
    : 'linear-gradient(160deg, #1a3a5c22 0%, #1a3a5c 100%)'

  // ── Coins animation (replaces floating +5 pts badge) ──────────────────────
  // Reset + re-trigger à chaque nouvelle question (fact.id dans les deps)
  useEffect(() => {
    setShowCoins(false)
    setShowScorePulse(false)
    setDisplayedScore(isCorrect ? sessionScore - pointsEarned : sessionScore)
    if (isCorrect) {
      const soundTimer1 = setTimeout(() => audio.playFile('What the fact.mp3'), 350)
      const soundTimer2 = setTimeout(() => audio.playFile('Coins points.mp3'), 600)
      const coinsTimer = setTimeout(() => setShowCoins(true), 400)
      const scoreTimer = setTimeout(() => {
        setDisplayedScore(prev => prev + pointsEarned)
        setShowScorePulse(true)
        setTimeout(() => setShowScorePulse(false), 600)
      }, 1800)
      return () => {
        clearTimeout(soundTimer1)
        clearTimeout(soundTimer2)
        clearTimeout(coinsTimer)
        clearTimeout(scoreTimer)
      }
    }
  }, [fact.id, isCorrect, pointsEarned, sessionScore])

  // Auto-size text in fixed-height encadrés (question 3 lignes, réponse 2 lignes, explication flex:1)
  useEffect(() => {
    const autoSize = (cRef, tRef, setter, max, min) => {
      const c = cRef.current, t = tRef.current
      if (!c || !t) return
      let s = max
      t.style.fontSize = s + 'px'
      while (t.scrollHeight > c.clientHeight && s > min) {
        s -= 0.5
        t.style.fontSize = s + 'px'
      }
      setter(s)
    }
    autoSize(questionContainerRef, questionRef, setQuestionFontSize, 14, 8)
    autoSize(answerContainerRef, answerRef, setAnswerFontSize, 15, isVofMode ? 9 : 15)
    autoSize(explanationContainerRef, explanationRef, setExplanationFontSize, 16, 9)
  }, [fact.id, unlockedByCoins])

  const handleNativeShare = () => {
    const shareMessages = [
      `Mate ce f*ct !\n\n"${fact.question}"\n\n${window.location.origin}`,
      `Tu connais ça ?!\n\n"${fact.question}"\n\n${window.location.origin}`,
      `Incroyable !\n\n"${fact.question}"\n\n${window.location.origin}`,
    ]
    const shareMessage = shareMessages[Math.floor(Math.random() * shareMessages.length)]
    if (navigator.share) {
      navigator.share({ text: shareMessage }).catch(() => {})
    } else if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(shareMessage)
    }
  }

  const handleNext = () => {
    audio.stopAll()
    audio.play('click')
    onNext()
  }

  const isOpenMode = selectedAnswer === 100 || selectedAnswer === -2
  const isTimeout = selectedAnswer === -1

  const selectedAnswerText = selectedAnswer >= 0 ? fact.options[selectedAnswer] : 'Pas de réponse'
  const correctAnswerText = correctAnswer || fact.shortAnswer || fact.options?.[fact.correctIndex] || ''

  // ── Coins flying animation ────────────────────────────────────────────────
  const coinsAnimation = showCoins && isCorrect && scoreRefTarget.current && (
    (() => {
      const scoreRect = scoreRefTarget.current.getBoundingClientRect()
      const targetX = scoreRect.left + scoreRect.width / 2
      const targetY = scoreRect.top + scoreRect.height / 2
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      return Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2
        const spread = 30
        const startX = centerX + Math.cos(angle) * spread
        const startY = centerY + Math.sin(angle) * spread
        const dx = targetX - startX
        const dy = targetY - startY
        return (
          <div key={i} className="fixed pointer-events-none" style={{
            left: startX, top: startY, zIndex: 60,
            '--coin-dx': `${dx}px`, '--coin-dy': `${dy}px`,
            animation: `coinFly 1.2s ${0.05 * i}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
          }}>
            <CoinsIcon size={22} />
          </div>
        )
      })
    })()
  )

  // ── Quit confirmation modal ───────────────────────────────────────────────
  const quitModal = showQuitConfirm && (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full rounded-3xl p-6 mx-4" style={{ background: '#FAFAF8', border: '1px solid #E5E7EB', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>
        <div className="text-2xl text-center mb-3">🏃</div>
        <h2 className="font-black text-lg text-center mb-2" style={{ color: '#1a1a2e' }}>Quitter la partie ?</h2>
        <p className="text-sm text-center mb-6 leading-relaxed" style={{ color: '#6B7280' }}>
          Tes f*cts et tes coins gagnés ne seront pas sauvegardés.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setShowQuitConfirm(false)} className="flex-1 py-4 rounded-2xl font-black text-base"
            style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151' }}>
            Annuler
          </button>
          <button onClick={() => { audio.stopAll(); onQuit() }} className="flex-1 py-4 rounded-2xl font-black text-base"
            style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid #F44336', color: '#DC2626' }}>
            Quitter
          </button>
        </div>
      </div>
    </div>
  )

  // ── Header commun ─────────────────────────────────────────────────────────
  const renderHeader = () => (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexShrink: 0, padding: `${S(8)} ${S(12)}` }}>
      <button
        onClick={() => setShowQuitConfirm(true)}
        style={{ width: S(36), height: S(36), borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
      >
        <span style={{ fontSize: S(16), color: 'white', fontWeight: 900, lineHeight: 1, cursor: 'pointer' }}>✕</span>
      </button>
      <div style={{ flex: 1, minWidth: 0, padding: `0 ${S(8)}` }}>
        <img
          src={`/assets/categories/${cat?.id || 'kids'}.png`}
          alt={cat?.label || ''}
          style={{ width: S(24), height: S(24), borderRadius: 4, objectFit: 'cover' }}
          onError={e => { e.target.style.display = 'none' }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: S(8), flexShrink: 0, userSelect: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: S(3) }}>
          <img src="/assets/ui/icon-coins.png" style={{ width: S(16), height: S(16) }} alt="" />
          <span ref={scoreRefTarget} className={showScorePulse ? 'score-pulse' : ''} style={{ fontWeight: 700, color: 'white', fontSize: S(12) }}>{_currencyCoins}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: S(3) }}>
          <img src="/assets/ui/icon-hint.png?v=2" style={{ width: S(16), height: S(16) }} alt="" />
          <span style={{ fontWeight: 700, color: 'white', fontSize: S(12) }}>{_currencyHints}</span>
        </div>
        <BatteryIcon level={_currencyEnergy ?? 0} />
      </div>
      <button
        onClick={() => { audio.play('click'); setShowSettings(true) }}
        style={{ width: S(36), height: S(36), borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: S(6) }}
      >
        <img src="/assets/ui/icon-settings.png" style={{ width: S(20), height: S(20) }} alt="" />
      </button>
    </div>
  )

  // ── CAS MAUVAISE RÉPONSE (solo) — sauf si débloqué par coins ──────────────
  if (!isCorrect && !unlockedByCoins) {
    return (
      <div className="relative screen-enter" style={{
        height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxSizing: 'border-box', width: '100%',
        ...(isBrandedMode ? { background: catGradient } : {
          backgroundImage: 'url(/assets/backgrounds/question-default.webp)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          backgroundColor: cat?.color || '#1a1a2e',
        }),
      }}>
        {!isBrandedMode && <div style={{ position: 'absolute', inset: 0, background: `${cat?.color || '#1a1a2e'}cc`, zIndex: 0 }} />}

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {quitModal}
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

        {/* Header */}
        {renderHeader()}

        {/* Question + Image + Social — gap uniforme 3vh */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '3vh', padding: `${S(10)} ${S(16)} 0` }}>

          {/* Encadré question — même style que QuestionScreen */}
          <div style={{
            background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)',
            border: isBrandedMode ? `3px solid ${accentColor}` : '1px solid rgba(255,255,255,0.15)',
            borderRadius: S(16), padding: S(12),
            boxShadow: isBrandedMode ? `0 0 20px ${isVofMode ? 'rgba(107,203,119,0.3)' : 'rgba(127,119,221,0.3)'}` : 'none',
          }}>
            <div style={{ fontSize: 'calc(1.1rem * var(--scale))', fontWeight: 700, color: '#ffffff', lineHeight: 1.4 }}>{renderFormattedText(fact.question, questionHighlight)}</div>
          </div>

          {/* Image floutée + stamp bienveillant — carrée, limitée en hauteur */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div
              className="overflow-hidden relative"
              style={{
                background: catGradient, width: '100%', aspectRatio: '1 / 1', maxHeight: '30vh', borderRadius: S(16), padding: 4,
                border: isBrandedMode ? `3px solid ${accentColor}` : `3px solid ${cat?.color || '#1a3a5c'}`,
                boxShadow: isBrandedMode ? `0 0 20px ${isVofMode ? 'rgba(107,203,119,0.3)' : 'rgba(127,119,221,0.3)'}` : 'none',
              }}
            >
              {fact.imageUrl && !imgFailed ? (
                <img
                  src={fact.imageUrl}
                  alt={fact.question}
                  style={{ objectFit: 'cover', width: '100%', height: '100%', display: 'block', borderRadius: S(12), filter: 'blur(12px) brightness(0.5)' }}
                  onError={() => setImgFailed(true)}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', background: catGradient, filter: 'blur(8px) brightness(0.5)', borderRadius: S(12) }}>
                  <FallbackImage categoryColor={cat?.color || '#1a3a5c'} />
                </div>
              )}
              <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.35)', zIndex: 1 }} />
              {/* Cadenas + débloquer sur l'image */}
              {flipped && (
                <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ zIndex: 5, gap: S(10) }}>
                  <span style={{ fontSize: S(48), filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}>🔒</span>
                  <button
                      onClick={() => {
                        if (_currencyCoins < 25) return
                        setShowUnlockConfirm(true)
                      }}
                      className="btn-press active:scale-95"
                      style={{
                        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                        border: isBrandedMode ? `2px solid ${accentColor}` : '2px solid rgba(255,255,255,0.5)',
                        borderRadius: S(12), padding: `${S(8)} ${S(16)}`,
                        color: _currencyCoins >= (fact.isVip ? 250 : 50) ? '#ffffff' : '#9CA3AF',
                        fontWeight: 800, fontSize: S(13),
                        cursor: _currencyCoins >= (fact.isVip ? 250 : 50) ? 'pointer' : 'not-allowed',
                        opacity: _currencyCoins >= (fact.isVip ? 250 : 50) ? 1 : 0.6,
                        display: 'flex', alignItems: 'center', gap: S(6),
                      }}
                    >
                      ✨ Ajouter à ta collection — {fact.isVip ? 250 : 50} <img src="/assets/ui/icon-coins.png" alt="" style={{ width: S(14), height: S(14) }} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Social proof — une seule ligne */}
          {flipped && (
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: S(13), fontWeight: 800, color: '#ffffff', opacity: 0.8, textShadow: '0 1px 3px rgba(0,0,0,0.3)', whiteSpace: 'nowrap' }}>
                👥 {100 - successRate}% des joueurs ont trouvé ce f*ct
              </span>
            </div>
          )}
        </div>

        {/* Stamp centré H sur la page, centré V entre social phrase et boutons */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `0 ${S(16)}` }}>
          <div style={{
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
            border: '3px solid #EF4444',
            borderRadius: S(14), padding: `${S(14)} ${S(20)}`,
            textAlign: 'center',
          }}>
            <span style={{ fontSize: S(18), fontWeight: 900, color: '#EF4444', lineHeight: 1.4 }}>
              {isTimeout ? '⏱️ Temps écoulé' : wrongMsg}
            </span>
          </div>
        </div>

        {/* Modal confirmation déblocage */}
        {showUnlockConfirm && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: S(24),
          }}>
            <div style={{
              background: '#FAFAF8', borderRadius: S(20), padding: S(24),
              width: '100%', maxWidth: 320, textAlign: 'center',
              boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
            }}>
              <div style={{ fontSize: S(40), marginBottom: S(8) }}>✨</div>
              <h3 style={{ fontSize: S(16), fontWeight: 900, color: '#1a1a2e', margin: `0 0 ${S(6)}` }}>
                Ajouter à ta collection ?
              </h3>
              <p style={{ fontSize: S(13), fontWeight: 600, color: '#6B7280', margin: `0 0 ${S(20)}`, lineHeight: 1.4 }}>
                Tu pourras voir l'image et l'explication pour <span style={{ fontWeight: 900, color: '#1a1a2e' }}>{fact.isVip ? 250 : 50}</span> <img src="/assets/ui/icon-coins.png" alt="" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} />
              </p>
              <div style={{ display: 'flex', gap: S(10) }}>
                <button
                  onClick={() => setShowUnlockConfirm(false)}
                  style={{
                    flex: 1, padding: `${S(12)} 0`, borderRadius: S(12),
                    fontWeight: 800, fontSize: S(13), fontFamily: 'Nunito, sans-serif',
                    background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#6B7280', cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    const cost = fact.isVip ? 250 : 50
                    if (_currencyCoins < cost) return
                    applyCurrencyDelta?.({ coins: -cost }, 'unlock_fact_wrong_answer')
                    audio.play('correct')
                    setShowUnlockConfirm(false)
                    setUnlockedByCoins(true)
                  }}
                  style={{
                    flex: 1, padding: `${S(12)} 0`, borderRadius: S(12),
                    fontWeight: 900, fontSize: S(13), fontFamily: 'Nunito, sans-serif',
                    background: isBrandedMode ? accentGradient : '#FF6B1A',
                    border: 'none', color: 'white', cursor: 'pointer',
                    boxShadow: isBrandedMode ? accentShadow : '0 4px 16px rgba(255,107,26,0.4)',
                  }}
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Boutons — demander aide + suivant côte à côte */}
        <div style={{ flexShrink: 0, padding: `${S(4)} ${S(16)} ${S(8)}` }}>
          <div style={{ display: 'flex', gap: S(8), height: S(44) }}>
            <button
              onClick={() => { audio.play('click'); handleNativeShare() }}
              className="btn-press active:scale-95 transition-all"
              style={{
                flex: 1, height: '100%', borderRadius: S(14), fontWeight: 900, fontSize: S(11),
                color: 'white', letterSpacing: '0.03em',
                border: isBrandedMode ? '3px solid #ffffff' : '2px solid rgba(255,255,255,0.4)',
                background: isBrandedMode
                  ? accentGradient
                  : `linear-gradient(135deg, ${cat?.color || '#FF6B1A'}dd 0%, ${cat?.color || '#FF6B1A'}99 100%)`,
                boxShadow: isBrandedMode ? accentShadow : 'none',
              }}
            >
              Demander à un ami
            </button>
            <button
              onClick={handleNext}
              className="btn-press active:scale-95 transition-all"
              style={{
                flex: 1, height: '100%', borderRadius: S(14), fontWeight: 900, fontSize: S(12),
                color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em',
                border: isBrandedMode ? '3px solid #ffffff' : '2px solid rgba(255,255,255,0.4)',
                background: isBrandedMode
                  ? accentGradient
                  : `linear-gradient(135deg, ${cat?.color || '#FF6B1A'}dd 0%, ${cat?.color || '#FF6B1A'}99 100%)`,
                boxShadow: isBrandedMode ? accentShadow : 'none',
              }}
            >
              {isLast ? '🏁 RÉSULTATS' : 'SUIVANT →'}
            </button>
          </div>
        </div>
        </div>
      </div>
    )
  }

  // ── CAS BONNE RÉPONSE (ou débloqué par coins) ─────────────────────────────
  const showAsCorrect = isCorrect || unlockedByCoins
  const isVipReveal = isCorrect && fact.isVip
  const showVipGlow = isVipReveal
  return (
    <div className="relative screen-enter" style={{
      height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      boxSizing: 'border-box', width: '100%',
      ...(showVipGlow || isBrandedMode ? {
        background: catGradient,
      } : {
        backgroundImage: 'url(/assets/backgrounds/question-default.webp)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        backgroundColor: cat?.color || '#1a1a2e',
      }),
    }}>
      {/* Overlay couleur catégorie (non-VIP) ou particules VIP */}
      {showVipGlow ? (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} style={{
              position: 'absolute',
              top: `${(i * 31 + 7) % 90}%`,
              left: `${(i * 43 + 13) % 95}%`,
              width: i % 3 === 0 ? 6 : 4,
              height: i % 3 === 0 ? 6 : 4,
              borderRadius: '50%',
              background: `rgba(255,255,255,${0.1 + (i % 4) * 0.07})`,
              animation: `vipParticlePulse ${2 + (i % 3) * 0.5}s ${(i * 0.3).toFixed(1)}s ease-in-out infinite`,
            }} />
          ))}
        </div>
      ) : !isBrandedMode ? (
        <div style={{ position: 'absolute', inset: 0, background: `${cat?.color || '#1a1a2e'}cc`, zIndex: 0 }} />
      ) : null}

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {quitModal}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {coinsAnimation}

      {/* Header */}
      {renderHeader()}

      {/* Encadré question — hauteur fixe 3 lignes, texte auto-size */}
      <div style={{ flexShrink: 0, padding: `0 ${S(12)} ${S(6)}` }}>
        <div style={{
          background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(12px)',
          borderRadius: S(12), padding: `${S(10)} ${S(14)}`,
          border: isVipReveal ? `3px solid #FFD700` : `2.5px solid ${accentColor}`,
          height: S(75), overflow: 'hidden',
        }}>
          <div ref={questionContainerRef} style={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span ref={questionRef} style={{ fontWeight: 900, fontSize: questionFontSize + 'px', color: '#ffffff', lineHeight: 1.3, textAlign: 'center' }}>
              {renderFormattedText(fact.question, questionHighlight)}
            </span>
          </div>
        </div>
      </div>

      {/* Image carrée — format explorer avec loupe */}
      {showVipGlow && (
        <style>{`
          @keyframes vipCardGlow {
            0%, 100% {
              box-shadow: inset 0 0 15px #FFD7004D, 0 0 15px #FFD70080, 0 0 30px #FFD7004D, 0 0 45px #FFD70026;
            }
            50% {
              box-shadow: inset 0 0 20px #FFD70066, 0 0 20px #FFD700B3, 0 0 40px #FFD70066, 0 0 60px #FFD70033;
            }
          }
        `}</style>
      )}
      <div style={{ flexShrink: 0, padding: `0 ${S(10)}`, maxHeight: '35vh' }}>
        <div
          onClick={() => setShowLightbox(true)}
          className="relative overflow-hidden"
          style={{
            width: '100%', maxHeight: '35vh', borderRadius: S(16),
            border: showVipGlow ? `3px solid #FFD700` : `3px solid ${accentColor}`,
            background: catGradient, cursor: 'pointer',
            ...(showVipGlow ? { animation: 'vipCardGlow 2s ease-in-out infinite' } : {}),
          }}
        >
          {fact.imageUrl && !imgFailed ? (
            <img
              src={fact.imageUrl}
              alt={fact.question}
              style={{ objectFit: 'cover', width: '100%', maxHeight: 'calc(35vh - 6px)', display: 'block' }}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div style={{ width: '100%', height: 'calc(35vh - 6px)', overflow: 'hidden' }}>
              <FallbackImage categoryColor={cat?.color || '#1a3a5c'} />
            </div>
          )}
          {/* Loupe masquée en VoF (mode vitrine — pas de zoom) */}
          {!isVofMode && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowLightbox(true) }}
              style={{
                position: 'absolute', top: S(8), right: S(8), zIndex: 10,
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(0,0,0,0.5)', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 18,
              }}
            >🔍</button>
          )}
          {/* Holo shimmer — toujours visible (pokemon glow) */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
            background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.15) 30%, rgba(127,119,221,0.2) 38%, rgba(255,215,0,0.15) 44%, rgba(0,188,212,0.15) 50%, rgba(255,64,129,0.15) 56%, rgba(127,119,221,0.2) 62%, rgba(255,255,255,0.15) 70%, transparent 80%)',
            backgroundSize: '200% 100%',
            animation: 'holoShimmer 3s linear infinite',
            mixBlendMode: 'screen',
          }} />
          {/* Lame de lumière blanche qui balaie */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: '-20%', bottom: '-20%',
              width: '45%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
              animation: 'holoSweep 2.5s 0.5s ease-in-out infinite',
            }} />
          </div>
          {/* Stamp Unlocked — gold + étoile WTF pour les VIP (étoile dans l'angle haut-droit intérieur), vert pour les Funny. Masqué en VoF. */}
          {!isVofMode && (
            <div style={{
              position: 'absolute', bottom: S(8), right: S(8), zIndex: 5,
              background: 'transparent',
              border: `2px solid ${isVipReveal ? '#FFD700' : '#4CAF50'}`,
              borderRadius: S(6),
              padding: isVipReveal ? `${S(3)} ${S(14)} ${S(3)} ${S(8)}` : `${S(3)} ${S(8)}`,
              pointerEvents: 'none',
            }}>
              {isVipReveal && (
                <img
                  src="/assets/ui/wtf-star.png"
                  alt=""
                  style={{
                    position: 'absolute', top: S(1), right: S(1),
                    width: S(10), height: S(10),
                    pointerEvents: 'none',
                    filter: 'drop-shadow(0 0 3px rgba(255,215,0,0.9))',
                  }}
                />
              )}
              <span style={{
                fontSize: S(10), fontWeight: 900,
                color: isVipReveal ? '#FFD700' : '#4CAF50',
                letterSpacing: '0.04em',
              }}>Unlocked !</span>
            </div>
          )}
        </div>
      </div>

      {/* Réponse + Explication — format explorer */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: `${S(4)} ${S(12)} 0`, display: 'flex', flexDirection: 'column', gap: S(4) }}>
        {/* Encadré réponse — hauteur fixe 2 lignes, texte auto-size */}
        <div style={{
          background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)',
          border: isVipReveal ? `3px solid #FFD700` : `2.5px solid ${accentColor}`,
          borderRadius: S(12), padding: `${S(8)} ${S(10)}`,
          height: S(68), overflow: 'hidden', flexShrink: 0,
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ fontSize: S(9), fontWeight: 900, color: isVipReveal ? '#FFD700' : '#4CAF50', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: S(2), flexShrink: 0 }}>✓ Réponse :</div>
          <div ref={answerContainerRef} style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
            <div ref={answerRef} style={{ fontSize: answerFontSize + 'px', fontWeight: 900, color: '#ffffff' }}>{correctAnswerText}</div>
          </div>
        </div>

        {/* Encadré Le saviez-vous */}
        <div style={{
          background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)',
          border: isVipReveal ? `3px solid #FFD700` : `2.5px solid ${accentColor}`,
          borderRadius: S(12), padding: `${S(8)} ${S(10)}`,
          flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: S(4), marginBottom: S(3), flexShrink: 0 }}>
            <span style={{ color: isVipReveal ? '#FFD700' : accentColor, fontWeight: 900, fontSize: S(9), textTransform: 'uppercase', letterSpacing: '0.05em' }}>Le saviez-vous ?</span>
          </div>
          <div ref={explanationContainerRef} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <p ref={explanationRef} style={{ color: 'rgba(255,255,255,0.85)', fontSize: explanationFontSize, lineHeight: 1.45, fontWeight: 500, margin: 0 }}>{stripEmojis(fact.explanation)}</p>
          </div>
        </div>
      </div>

      {/* Boutons — gradient gold pour fact WTF (VIP), sinon accent du mode */}
      <div style={{ flexShrink: 0, padding: `${S(4)} ${S(12)} ${S(8)}` }}>
        <div style={{ display: 'flex', gap: S(8), height: S(44) }}>
          <button
            onClick={handleNativeShare}
            className="btn-press active:scale-95 transition-all"
            style={{
              flex: 1, height: '100%', borderRadius: S(14), fontWeight: 900, fontSize: S(12),
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(4),
              background: isVipReveal ? 'linear-gradient(135deg, #FFD700, #FFA500)' : accentGradient,
              color: 'white',
              border: '3px solid #ffffff',
              boxShadow: isVipReveal ? '0 4px 16px rgba(255,215,0,0.55)' : accentShadow,
            }}
          >
            Partager ce f*ct
          </button>
          <button
            ref={nextButtonRef}
            onClick={handleNext}
            className="btn-press active:scale-95 transition-all"
            style={{
              flex: 1, height: '100%', borderRadius: S(14), fontWeight: 900, fontSize: S(12),
              color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em',
              border: '3px solid #ffffff',
              background: isVipReveal ? 'linear-gradient(135deg, #FFD700, #FFA500)' : accentGradient,
              boxShadow: isVipReveal ? '0 4px 16px rgba(255,215,0,0.55)' : accentShadow,
            }}
          >
            {isLast ? '🏁 RÉSULTATS' : 'SUIVANT →'}
          </button>
        </div>
      </div>


      {/* Lightbox image — bonne réponse uniquement */}
      {showLightbox && (
        <div
          onClick={() => setShowLightbox(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <button
            onClick={() => setShowLightbox(false)}
            style={{
              position: 'absolute', top: 16, right: 16, zIndex: 10,
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)', border: 'none',
              color: 'white', fontSize: 18, fontWeight: 900,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >✕</button>
          {fact.imageUrl && !imgFailed ? (
            <img
              src={fact.imageUrl}
              alt={fact.question}
              onClick={e => e.stopPropagation()}
              style={{
                width: '95%', maxHeight: '80vh', objectFit: 'contain',
                borderRadius: 12,
                animation: 'lightboxZoom 0.2s ease-out',
              }}
            />
          ) : (
            <div
              onClick={e => e.stopPropagation()}
              style={{
                width: 'min(95%, 80vh)', aspectRatio: '1 / 1',
                borderRadius: 12, overflow: 'hidden',
                animation: 'lightboxZoom 0.2s ease-out',
              }}
            >
              <FallbackImage categoryColor={cat?.color || '#1a3a5c'} />
            </div>
          )}
          <style>{`
            @keyframes lightboxZoom {
              from { transform: scale(0.8); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      )}
      </div>
    </div>
  )
}
