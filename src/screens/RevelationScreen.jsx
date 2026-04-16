import { useState, useEffect, useRef } from 'react'
import SettingsModal from '../components/SettingsModal'
import CoinsIcon from '../components/CoinsIcon'
import { getCategoryById } from '../data/facts'
import { audio } from '../utils/audio'
import renderFormattedText from '../utils/renderFormattedText'
import { usePlayerProfile } from '../hooks/usePlayerProfile'
import FallbackImage from '../components/FallbackImage'
import BatteryIcon from '../components/home/BatteryIcon'

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
    @keyframes confettiBurst {
      0% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 1; }
      100% { transform: translate(var(--cx), var(--cy)) scale(0) rotate(var(--cr)); opacity: 0; }
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
  const { coins: _currencyCoins, hints: _currencyHints, energy: _currencyEnergy, applyCurrencyDelta } = usePlayerProfile()

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

  // Auto-size explanation text to fill container
  useEffect(() => {
    const container = explanationContainerRef.current
    const textEl = explanationRef.current
    if (!container || !textEl) return
    // Reset to max size and shrink until it fits
    let size = 16
    const min = 9
    textEl.style.fontSize = size + 'px'
    const availableH = container.clientHeight
    while (textEl.scrollHeight > availableH && size > min) {
      size -= 0.5
      textEl.style.fontSize = size + 'px'
    }
    setExplanationFontSize(size)
  }, [fact.id, unlockedByCoins])

  const handleNativeShare = () => {
    const shareMessages = [
      `Mate ce f*ct !\n\n"${fact.question}"\n\n${window.location.origin}`,
      `Tu savais ça ?!\n\n"${fact.question}"\n\n${window.location.origin}`,
      `Incroyable !\n\n"${fact.question}"\n\n${window.location.origin}`,
    ]
    const shareMessage = shareMessages[Math.floor(Math.random() * shareMessages.length)]
    if (navigator.share) {
      navigator.share({ text: shareMessage }).catch(() => {})
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
  const correctAnswerText = fact.options[fact.correctIndex]

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
        ...(isQuickieMode ? { background: catGradient } : {
          backgroundImage: 'url(/assets/backgrounds/question-default.webp)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          backgroundColor: cat?.color || '#1a1a2e',
        }),
      }}>
        {!isQuickieMode && <div style={{ position: 'absolute', inset: 0, background: `${cat?.color || '#1a1a2e'}cc`, zIndex: 0 }} />}

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
            border: isQuickieMode ? '3px solid #7F77DD' : '1px solid rgba(255,255,255,0.15)',
            borderRadius: S(16), padding: S(12),
            boxShadow: isQuickieMode ? '0 0 20px rgba(127,119,221,0.3)' : 'none',
          }}>
            <div style={{ fontSize: 'calc(1.1rem * var(--scale))', fontWeight: 700, color: '#ffffff', lineHeight: 1.4 }}>{renderFormattedText(fact.question)}</div>
          </div>

          {/* Image floutée + stamp bienveillant — carrée */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div
              className="overflow-hidden relative"
              style={{
                background: catGradient, width: '100%', aspectRatio: '1 / 1', borderRadius: S(16), padding: 4,
                border: isQuickieMode ? '3px solid #7F77DD' : `3px solid ${cat?.color || '#1a3a5c'}`,
                boxShadow: isQuickieMode ? '0 0 20px rgba(127,119,221,0.3)' : 'none',
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
                        border: isQuickieMode ? '2px solid #7F77DD' : '2px solid rgba(255,255,255,0.5)',
                        borderRadius: S(12), padding: `${S(8)} ${S(16)}`,
                        color: _currencyCoins >= 25 ? '#ffffff' : '#9CA3AF',
                        fontWeight: 800, fontSize: S(13),
                        cursor: _currencyCoins >= 25 ? 'pointer' : 'not-allowed',
                        opacity: _currencyCoins >= 25 ? 1 : 0.6,
                        display: 'flex', alignItems: 'center', gap: S(6),
                      }}
                    >
                      🔓 Débloquer — 25 <img src="/assets/ui/icon-coins.png" alt="" style={{ width: S(14), height: S(14) }} />
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
              <div style={{ fontSize: S(40), marginBottom: S(8) }}>🔓</div>
              <h3 style={{ fontSize: S(16), fontWeight: 900, color: '#1a1a2e', margin: `0 0 ${S(6)}` }}>
                Débloquer ce f*ct ?
              </h3>
              <p style={{ fontSize: S(13), fontWeight: 600, color: '#6B7280', margin: `0 0 ${S(20)}`, lineHeight: 1.4 }}>
                Tu pourras voir l'image et l'explication pour <span style={{ fontWeight: 900, color: '#1a1a2e' }}>25</span> <img src="/assets/ui/icon-coins.png" alt="" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} />
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
                    if (_currencyCoins < 25) return
                    applyCurrencyDelta?.({ coins: -25 }, 'unlock_fact_wrong_answer')
                    audio.play('correct')
                    setShowUnlockConfirm(false)
                    setUnlockedByCoins(true)
                  }}
                  style={{
                    flex: 1, padding: `${S(12)} 0`, borderRadius: S(12),
                    fontWeight: 900, fontSize: S(13), fontFamily: 'Nunito, sans-serif',
                    background: isQuickieMode ? 'linear-gradient(135deg, #7F77DD, #4A3FA3)' : '#FF6B1A',
                    border: 'none', color: 'white', cursor: 'pointer',
                    boxShadow: isQuickieMode ? '0 4px 16px rgba(127,119,221,0.4)' : '0 4px 16px rgba(255,107,26,0.4)',
                  }}
                >
                  Débloquer
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
                border: isQuickieMode ? '3px solid #ffffff' : '2px solid rgba(255,255,255,0.4)',
                background: isQuickieMode
                  ? 'linear-gradient(135deg, #7F77DD, #4A3FA3)'
                  : `linear-gradient(135deg, ${cat?.color || '#FF6B1A'}dd 0%, ${cat?.color || '#FF6B1A'}99 100%)`,
                boxShadow: isQuickieMode ? '0 4px 16px rgba(127,119,221,0.5)' : 'none',
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
                border: isQuickieMode ? '3px solid #ffffff' : '2px solid rgba(255,255,255,0.4)',
                background: isQuickieMode
                  ? 'linear-gradient(135deg, #7F77DD, #4A3FA3)'
                  : `linear-gradient(135deg, ${cat?.color || '#FF6B1A'}dd 0%, ${cat?.color || '#FF6B1A'}99 100%)`,
                boxShadow: isQuickieMode ? '0 4px 16px rgba(127,119,221,0.5)' : 'none',
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
      ...(showVipGlow ? {
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
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: `${cat?.color || '#1a1a2e'}cc`, zIndex: 0 }} />
      )}

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {quitModal}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {coinsAnimation}

      {/* Header */}
      {renderHeader()}

      {/* Encadré question — format explorer */}
      <div style={{ flexShrink: 0, padding: `0 ${S(12)} ${S(6)}` }}>
        <div style={{
          background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(12px)',
          borderRadius: S(12), padding: `${S(10)} ${S(14)}`,
          border: '2.5px solid #7F77DD',
        }}>
          <span style={{ fontWeight: 900, fontSize: S(14), color: '#ffffff', lineHeight: 1.3, display: 'block', textAlign: 'center' }}>
            {renderFormattedText(fact.question)}
          </span>
        </div>
      </div>

      {/* Image carrée — format explorer avec loupe */}
      {showVipGlow && (
        <style>{`
          @keyframes vipCardGlow {
            0%, 100% {
              box-shadow: inset 0 0 15px ${cat?.color}4D, 0 0 15px ${cat?.color}80, 0 0 30px ${cat?.color}4D, 0 0 45px ${cat?.color}26;
            }
            50% {
              box-shadow: inset 0 0 20px ${cat?.color}66, 0 0 20px ${cat?.color}B3, 0 0 40px ${cat?.color}66, 0 0 60px ${cat?.color}33;
            }
          }
        `}</style>
      )}
      <div style={{ flexShrink: 0, padding: `0 ${S(10)}`, maxHeight: '35vh' }}>
        <div
          onClick={() => fact.imageUrl && !imgFailed && setShowLightbox(true)}
          className="overflow-hidden relative"
          style={{
            width: '100%', maxHeight: '35vh', borderRadius: S(16),
            border: showVipGlow ? `2px solid ${cat?.color}AA` : '3px solid #7F77DD',
            background: catGradient, cursor: fact.imageUrl && !imgFailed ? 'pointer' : 'default',
            ...(showVipGlow ? { animation: 'vipCardGlow 2s ease-in-out infinite' } : {}),
          }}
        >
          {fact.imageUrl && !imgFailed ? (
            <>
              <img
                src={fact.imageUrl}
                alt={fact.question}
                style={{ objectFit: 'cover', width: '100%', maxHeight: 'calc(35vh - 6px)', display: 'block' }}
                onError={() => setImgFailed(true)}
              />
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
              {/* Confettis F*ct débloqué */}
              {(() => {
                const particles = Array.from({ length: 20 }, (_, i) => {
                  const angle = (i / 20) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
                  const dist = 60 + Math.random() * 80
                  const cx = Math.cos(angle) * dist
                  const cy = Math.sin(angle) * dist
                  const cr = (Math.random() - 0.5) * 720
                  const size = 6 + Math.random() * 8
                  const shapes = ['✦', '✧', '★', '●', '◆']
                  const colors = ['#FFD700', '#FF6B1A', '#7F77DD', '#4CAF50', '#FF4081', '#00BCD4']
                  return (
                    <div key={i} style={{
                      position: 'absolute', top: '50%', left: '50%',
                      fontSize: size, lineHeight: 1, pointerEvents: 'none',
                      color: colors[i % colors.length],
                      '--cx': `${cx}px`, '--cy': `${cy}px`, '--cr': `${cr}deg`,
                      animation: `confettiBurst ${0.8 + Math.random() * 0.4}s ${Math.random() * 0.2}s ease-out forwards`,
                      zIndex: 12,
                    }}>
                      {shapes[i % shapes.length]}
                    </div>
                  )
                })
                return <>{particles}</>
              })()}
            </>
          ) : (
            <div style={{ width: '100%', height: 'calc(35vh - 6px)', borderRadius: S(12), overflow: 'hidden' }}>
              <FallbackImage categoryColor={cat?.color || '#1a3a5c'} />
            </div>
          )}
        </div>
      </div>

      {/* Réponse + Explication — format explorer */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: `${S(4)} ${S(12)} 0`, display: 'flex', flexDirection: 'column', gap: S(4) }}>
        {/* Encadré réponse */}
        <div style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)', border: '2.5px solid #7F77DD', borderRadius: S(12), padding: `${S(8)} ${S(10)}`, flexShrink: 0 }}>
          <div style={{ fontSize: S(9), fontWeight: 900, color: '#4CAF50', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: S(2) }}>✓ Réponse :</div>
          <div style={{ fontSize: S(15), fontWeight: 900, color: '#ffffff' }}>{correctAnswerText}</div>
        </div>

        {/* Encadré Le saviez-vous */}
        <div style={{
          background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)',
          border: '2.5px solid #7F77DD', borderRadius: S(12), padding: `${S(8)} ${S(10)}`,
          flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: S(4), marginBottom: S(3), flexShrink: 0 }}>
            <span style={{ fontSize: S(12) }}>🧠</span>
            <span style={{ color: '#ffffff', fontWeight: 900, fontSize: S(9), textTransform: 'uppercase', letterSpacing: '0.05em' }}>Le saviez-vous ?</span>
          </div>
          <div ref={explanationContainerRef} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <p ref={explanationRef} style={{ color: 'rgba(255,255,255,0.85)', fontSize: explanationFontSize, lineHeight: 1.45, fontWeight: 500, margin: 0 }}>{fact.explanation}</p>
          </div>
        </div>
      </div>

      {/* Boutons — violet Quickie contour blanc */}
      <div style={{ flexShrink: 0, padding: `${S(4)} ${S(12)} ${S(8)}` }}>
        <div style={{ display: 'flex', gap: S(8), height: S(44) }}>
          <button
            onClick={handleNativeShare}
            className="btn-press active:scale-95 transition-all"
            style={{
              flex: 1, height: '100%', borderRadius: S(14), fontWeight: 900, fontSize: S(12),
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(4),
              background: 'linear-gradient(135deg, #7F77DD, #4A3FA3)',
              color: 'white',
              border: '3px solid #ffffff',
              boxShadow: '0 4px 16px rgba(127,119,221,0.5)',
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
              background: 'linear-gradient(135deg, #7F77DD, #4A3FA3)',
              boxShadow: '0 4px 16px rgba(127,119,221,0.5)',
            }}
          >
            {isLast ? '🏁 RÉSULTATS' : 'SUIVANT →'}
          </button>
        </div>
      </div>


      {/* Lightbox image — bonne réponse uniquement */}
      {showLightbox && fact.imageUrl && (
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
