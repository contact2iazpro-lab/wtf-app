import { useState, useEffect, useRef, useCallback } from 'react'
import CircularTimer from '../components/CircularTimer'
import SettingsModal from '../components/SettingsModal'
import CoinsIcon from '../components/CoinsIcon'
import { getCategoryById } from '../data/facts'
import { audio } from '../utils/audio'

// ── Hint flip card button ────────────────────────────────────────────────────
function HintFlipButton({ num, hint, color, onReveal }) {
  const [phase, setPhase] = useState('front') // 'front' | 'flip' | 'back'

  const handleClick = () => {
    if (phase !== 'front') return
    setPhase('flip')
    onReveal()
    setTimeout(() => setPhase('back'), 160)
  }

  const hintLen = hint?.length || 0
  const hintFs = hintLen > 55 ? 9 : hintLen > 38 ? 11 : 12

  return (
    <button
      onClick={handleClick}
      style={{
        height: 48,
        width: '100%',
        borderRadius: 24,
        border: `2px solid ${phase === 'back' ? color + '80' : color}`,
        background: phase === 'back' ? `${color}18` : `${color}1a`,
        transform: phase === 'flip' ? 'scaleY(0.08)' : 'scaleY(1)',
        transition: 'transform 0.15s ease, background 0.3s, border-color 0.3s',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 12px',
        cursor: phase !== 'front' ? 'default' : 'pointer',
        pointerEvents: phase !== 'front' ? 'none' : 'auto',
        flexShrink: 0,
      }}
    >
      {phase !== 'back' ? (
        <span style={{ fontWeight: 900, fontSize: 13, color, whiteSpace: 'nowrap' }}>
          N°{num} — Indice
        </span>
      ) : (
        <span
          style={{
            fontSize: hintFs,
            fontWeight: 700,
            color: 'white',
            textAlign: 'center',
            lineHeight: 1.35,
            wordBreak: 'break-word',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {hint || '—'}
        </span>
      )}
    </button>
  )
}

// ── Main QuestionScreen ──────────────────────────────────────────────────────
export default function QuestionScreen({
  fact,
  factIndex,
  totalFacts,
  hintsUsed,
  onSelectAnswer,
  onOpenValidate,
  onUseHint,
  onTimeout,
  onQuit,
  category,
  gameMode,
  difficulty,
  playerName,
  playerColor,
  playerEmoji,
  playerCoins = 0,
}) {
  const [answerMode, setAnswerMode] = useState(null) // null | 'open' | 'qcm'

  // En mode solo, aller directement au QCM
  useEffect(() => {
    if (gameMode === 'solo') {
      setAnswerMode('qcm')
    }
  }, [gameMode])

  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const cat = getCategoryById(fact.category)

  // Timer duration
  const timerDuration = answerMode === 'open' ? 60 : (difficulty?.duration || 20)

  // ── Halo: parallel countdown (pauses when modal is open) ──────────────────
  const [timerLeft, setTimerLeft] = useState(timerDuration)
  const pausedRef = useRef(false)
  useEffect(() => { pausedRef.current = showQuitConfirm }, [showQuitConfirm])

  useEffect(() => {
    if (!answerMode) return
    setTimerLeft(timerDuration)
    const iv = setInterval(() => {
      if (pausedRef.current) return
      setTimerLeft(t => Math.max(0, t - 1))
    }, 1000)
    return () => clearInterval(iv)
  }, [fact.id, answerMode, timerDuration])

  // Wrapped timeout — no-op while modal is open
  const handleTimeout = useCallback(() => {
    if (!pausedRef.current) onTimeout?.()
  }, [onTimeout])

  // ── Style injection: compact + animation keyframes ─────────────────────────
  useEffect(() => {
    const styleId = '__qs-compact'
    if (document.getElementById(styleId)) return
    const s = document.createElement('style')
    s.id = styleId
    s.textContent = `
      @media (max-height: 700px) {
        .qs-root .qs-h { padding-top: 0.5rem !important; padding-bottom: 0.25rem !important; }
        .qs-root .qs-pb { padding-bottom: 0.25rem !important; }
        .qs-root .qs-m { padding-left: 0.75rem !important; padding-right: 0.75rem !important; gap: 0.5rem !important; }
        .qs-root .qs-f { padding-top: 0.25rem !important; padding-bottom: 0.5rem !important; }
        .qs-root .qs-m .rounded-3xl { padding: 0.75rem !important; }
      }
      @keyframes halo-calm    { from { transform: scale(1);    } to { transform: scale(1.08); } }
      @keyframes halo-warn    { from { transform: scale(1);    } to { transform: scale(1.15); } }
      @keyframes halo-danger  { from { transform: scale(1);    } to { transform: scale(1.2);  } }
      @keyframes float-particle { from { transform: translateY(-10px); } to { transform: translateY(10px); } }
    `
    document.head.appendChild(s)
    return () => { const el = document.getElementById(styleId); if (el) el.remove() }
  }, [])

  // MOD 1 — Dynamic luminous gradient per category
  const screenBg = cat
    ? `linear-gradient(160deg, ${cat.color}22 0%, ${cat.color} 100%)`
    : 'linear-gradient(160deg, #1a3a5c22 0%, #1a3a5c 100%)'

  const cardBg = 'rgba(0, 0, 0, 0.28)'

  // Potential coins for this question
  const baseCoins = answerMode === 'open' ? 5 : answerMode === 'qcm' ? 1 : (gameMode !== 'solo' ? 5 : 1)
  const potentialCoins = Math.max(0, baseCoins - (hintsUsed || 0))

  // ── Halo config ───────────────────────────────────────────────────────────
  const haloConfig = timerLeft > 15
    ? { background: cat?.color || '#22C55E', opacity: 0.3, animation: 'halo-calm 2s ease-in-out infinite alternate' }
    : timerLeft > 5
    ? { background: cat?.color || '#F97316', opacity: 0.5, animation: 'halo-warn 0.8s ease-in-out infinite alternate' }
    : { background: '#EF4444',              opacity: 0.5, animation: 'halo-danger 0.4s ease-in-out infinite alternate' }

  // ── Decorative background particles ───────────────────────────────────────
  const PARTICLES = [
    { size: 8,  top: '12%', left: '7%',  dur: '4s',   delay: '0s'   },
    { size: 12, top: '22%', left: '88%', dur: '5s',   delay: '1s'   },
    { size: 10, top: '55%', left: '4%',  dur: '3.5s', delay: '0.5s' },
    { size: 16, top: '68%', left: '91%', dur: '6s',   delay: '2s'   },
    { size: 9,  top: '38%', left: '93%', dur: '4.5s', delay: '1.5s' },
    { size: 14, top: '82%', left: '12%', dur: '5.5s', delay: '0.8s' },
  ]

  const particles = PARTICLES.map((p, i) => (
    <div
      key={i}
      style={{
        position: 'absolute',
        top: p.top,
        left: p.left,
        width: p.size,
        height: p.size,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.15)',
        animation: `float-particle ${p.dur} ease-in-out ${p.delay} infinite alternate`,
        pointerEvents: 'none',
        zIndex: -1,
      }}
    />
  ))

  // ── Quit confirmation modal — updated text + buttons ──────────────────────
  const quitModal = showQuitConfirm && (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-full rounded-3xl p-6 mx-4"
        style={{
          background: '#FAFAF8',
          border: '1px solid #E5E7EB',
          boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        }}
      >
        <div className="text-2xl text-center mb-3">🏃</div>
        <h2
          className="font-black text-lg text-center mb-2"
          style={{ color: '#1a1a2e' }}
        >
          Quitter le parcours ?
        </h2>
        <p
          className="text-sm text-center mb-6 leading-relaxed"
          style={{ color: '#6B7280' }}
        >
          Tu as exploré <strong style={{ color: '#1a1a2e' }}>{factIndex}</strong>{' '}
          f*ct{factIndex !== 1 ? 's' : ''} jusqu'ici.<br />
          Si tu quittes maintenant, ils ne seront pas sauvegardés.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setShowQuitConfirm(false)}
            className="w-full py-4 rounded-2xl font-black text-base"
            style={{ background: cat?.color || '#FF6B1A', color: 'white' }}
          >
            Continuer le parcours
          </button>
          <button
            onClick={onQuit}
            className="w-full py-3 rounded-2xl font-bold text-sm"
            style={{ background: 'transparent', color: '#9CA3AF' }}
          >
            Quitter quand même
          </button>
        </div>
      </div>
    </div>
  )

  // ── Header: X button + fact id | category | coins ─────────────────────────
  const header = (
    <div className="qs-h px-4 pt-4 pb-2 shrink-0 flex items-center">
      {/* Left (w-1/3): X quit button + fact id/progress */}
      <div className="w-1/3 flex items-center gap-2">
        <button
          onClick={() => setShowQuitConfirm(true)}
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          title="Quitter"
          style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)' }}
        >
          <span style={{ fontSize: 11, color: 'white', fontWeight: 900, lineHeight: 1 }}>✕</span>
        </button>
        <span className="font-black text-sm" style={{ color: cat?.color || 'rgba(255,255,255,0.7)' }}>
          #{fact.id} · {factIndex + 1}/{totalFacts}
        </span>
      </div>

      {/* Center (w-1/3): category emoji + name */}
      <div className="w-1/3 flex items-center gap-2 justify-center min-w-0">
        {cat && <span className="text-lg shrink-0">{cat.emoji}</span>}
        <span
          className="font-black text-sm tracking-wide truncate"
          style={{ color: cat?.color || 'rgba(255,255,255,0.7)' }}
        >
          {cat?.label || 'Question'}
        </span>
      </div>

      {/* Right (w-1/3): coins balance */}
      <div className="w-1/3 flex justify-end">
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <CoinsIcon size={18} />
          <span style={{ fontWeight: 700, color: 'white' }}>{playerCoins}</span>
        </div>
      </div>
    </div>
  )

  // ── Segmented progress bar ─────────────────────────────────────────────────
  const progressBar = (
    <div className="qs-pb px-4 pb-2 shrink-0">
      <div className="flex w-full" style={{ gap: 2 }}>
        {Array.from({ length: totalFacts }).map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-full transition-all duration-300"
            style={{
              height: 6,
              background: i < factIndex + 1
                ? cat?.color || '#FF6B1A'
                : (cat?.color || '#FF6B1A') + '40',
            }}
          />
        ))}
      </div>
    </div>
  )

  // ── Footer: timer (size 120) + halo + settings ─────────────────────────────
  const footer = (showTimer) => (
    <div className="qs-f px-4 pb-4 pt-1 shrink-0 flex items-center">
      {/* Left spacer balances the settings button */}
      <div style={{ width: 40 }} />

      {/* Timer centered */}
      <div className="flex-1 flex justify-center">
        {showTimer ? (
          <div style={{ position: 'relative' }}>
            {/* Halo */}
            <div
              style={{
                position: 'absolute',
                top: -10,
                left: -10,
                width: 140,
                height: 140,
                borderRadius: '50%',
                pointerEvents: 'none',
                ...haloConfig,
              }}
            />
            {/* Timer */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <CircularTimer
                key={`${fact.id}-${answerMode}`}
                size={120}
                duration={timerDuration}
                onTimeout={handleTimeout}
              />
            </div>
          </div>
        ) : (
          <div style={{ width: 120, height: 120 }} />
        )}
      </div>

      {/* Settings button */}
      <button
        onClick={() => { audio.play('click'); setShowSettings(true) }}
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
      >
        ⚙️
      </button>
    </div>
  )

  // ── Question card ──────────────────────────────────────────────────────────
  const questionCard = (
    <div
      className="rounded-3xl p-4 border shrink-0"
      style={{
        background: cardBg,
        borderColor: cat?.color + '70',
        backdropFilter: 'blur(12px)',
        boxShadow: `0 4px 32px ${cat?.color || '#000'}30`,
      }}
    >
      <h2 className="text-white text-base font-bold leading-snug">{fact.question}</h2>
    </div>
  )

  // ── Hints ──────────────────────────────────────────────────────────────────
  const hintButtons = (
    <div className="grid grid-cols-2 gap-2 shrink-0">
      <HintFlipButton
        num={1}
        hint={fact.hint1}
        color="#FBBF24"
        onReveal={() => { onUseHint(1); audio.play('click') }}
      />
      <HintFlipButton
        num={2}
        hint={fact.hint2}
        color="#F97316"
        onReveal={() => { onUseHint(2); audio.play('click') }}
      />
    </div>
  )

  // ── Phase 0 : Mode selection ───────────────────────────────────────────────
  if (!answerMode) {
    return (
      <div
        className="qs-root relative flex flex-col h-full w-full screen-enter overflow-hidden"
        style={{ background: screenBg }}
      >
        {particles}
        {quitModal}
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        {header}
        {progressBar}

        <div className="qs-m flex-1 flex flex-col px-4 justify-center" style={{ gap: 16 }}>
          {questionCard}

          <div className="flex flex-col gap-3 shrink-0">
            {playerName && (
              <div className="text-white/30 text-xs font-bold uppercase tracking-widest text-center">
                Choisissez votre mode
              </div>
            )}

            {playerName && (
              <button
                onClick={() => setAnswerMode('open')}
                className="btn-press w-full py-4 rounded-2xl active:scale-95 transition-all text-left px-5 border-2"
                style={{
                  background: `${cat?.color || '#22C55E'}12`,
                  borderColor: `${cat?.color || '#22C55E'}60`,
                  boxShadow: `0 4px 20px ${cat?.color || '#22C55E'}18`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-black text-base">🧠 Question ouverte</div>
                    <div className="text-white/40 text-xs font-semibold mt-0.5">N°1 · N°2 · 30 secondes</div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-2xl" style={{ color: cat?.color || '#22C55E' }}>5</div>
                    <div className="text-xs font-bold text-white/40">pts max</div>
                  </div>
                </div>
              </button>
            )}

            <button
              onClick={() => setAnswerMode('qcm')}
              className="btn-press w-full py-4 rounded-2xl active:scale-95 transition-all text-left px-5 border-2"
              style={{
                background: `${cat?.color || '#FF5C1A'}08`,
                borderColor: `${cat?.color || '#FF5C1A'}40`,
                boxShadow: `0 4px 20px ${cat?.color || '#FF5C1A'}15`,
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-black text-base">🎯 Choix multiple</div>
                  <div className="text-white/40 text-xs font-semibold mt-0.5">4 réponses · 20 secondes</div>
                </div>
                <div className="text-right">
                  <div className="font-black text-2xl" style={{ color: cat?.color || '#FF5C1A' }}>1</div>
                  <div className="text-xs font-bold text-white/40">pt</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {footer(false)}
      </div>
    )
  }

  // ── Phase 1 : Open question ────────────────────────────────────────────────
  if (answerMode === 'open') {
    return (
      <div
        className="qs-root relative flex flex-col h-full w-full screen-enter overflow-hidden"
        style={{ background: screenBg }}
      >
        {particles}
        {quitModal}
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        {header}
        {progressBar}

        <div className="qs-m flex-1 flex flex-col px-4 justify-center" style={{ gap: 16 }}>
          {questionCard}

          <div className="flex flex-col gap-2 shrink-0">
            {difficulty?.hintsAllowed && hintButtons}
            <div className="text-white/30 text-xs font-bold uppercase tracking-widest text-center">
              Le questionneur valide la réponse
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { audio.play('wrong'); audio.vibrate([120]); onOpenValidate(false) }}
                className="btn-press py-4 rounded-2xl border-2 font-black text-base active:scale-95 transition-all"
                style={{ background: 'rgba(244,67,54,0.1)', borderColor: '#F44336', color: '#F44336' }}
              >
                ✗ Incorrect
              </button>
              <button
                onClick={() => { audio.play('correct'); audio.vibrate([40, 20, 40]); onOpenValidate(true) }}
                className="btn-press py-4 rounded-2xl border-2 font-black text-base active:scale-95 transition-all"
                style={{ background: 'rgba(76,175,80,0.1)', borderColor: '#4CAF50', color: '#4CAF50' }}
              >
                ✓ Correct !
              </button>
            </div>
          </div>
        </div>

        {footer(true)}
      </div>
    )
  }

  // ── Phase 2 : QCM ──────────────────────────────────────────────────────────
  return (
    <div
      className="qs-root relative flex flex-col h-full w-full screen-enter overflow-hidden"
      style={{ background: screenBg }}
    >
      {particles}
      {quitModal}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {header}
      {progressBar}

      <div className="qs-m flex-1 flex flex-col px-4 justify-center" style={{ gap: 16 }}>
        {questionCard}

        <div className="flex flex-col gap-3 shrink-0">
          {difficulty?.hintsAllowed && hintButtons}

          <div
            className={`grid ${difficulty?.choices === 6 ? 'grid-cols-3' : 'grid-cols-2'} gap-3 shrink-0`}
          >
            {fact.options.map((option, index) => (
              <button
                key={index}
                onClick={() => {
                  const correct = index === fact.correctIndex
                  audio.play(correct ? 'correct' : 'wrong')
                  audio.vibrate(correct ? [40, 20, 40] : [120])
                  onSelectAnswer(index)
                }}
                className="btn-press py-5 text-lg rounded-2xl text-white font-bold transition-all active:scale-95 border"
                style={{
                  background: `linear-gradient(135deg, ${cat?.color}20 0%, ${cat?.color}10 100%)`,
                  borderColor: cat?.color + '40',
                  boxShadow: `0 4px 16px ${cat?.color}15`,
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      {footer(true)}
    </div>
  )
}
