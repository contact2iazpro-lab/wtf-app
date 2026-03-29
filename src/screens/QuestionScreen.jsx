import { useState, useEffect } from 'react'
import CircularTimer from '../components/CircularTimer'
import SettingsModal from '../components/SettingsModal'
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

  // MOD 1 — Dynamic luminous gradient per category
  const screenBg = cat
    ? `linear-gradient(160deg, ${cat.color}22 0%, ${cat.color} 100%)`
    : 'linear-gradient(160deg, #1a3a5c22 0%, #1a3a5c 100%)'

  const cardBg = 'rgba(0, 0, 0, 0.28)'

  // Potential coins for this question
  const baseCoins = answerMode === 'open' ? 5 : answerMode === 'qcm' ? 1 : (gameMode !== 'solo' ? 5 : 1)
  const potentialCoins = Math.max(0, baseCoins - (hintsUsed || 0))

  // Timer duration
  const timerDuration = answerMode === 'open' ? 60 : (difficulty?.duration || 20)

  // ── Quit confirmation modal ──────────────────────────────────────────────
  const quitModal = showQuitConfirm && (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full rounded-3xl p-6 mx-4" style={{ background: '#FAFAF8', border: '1px solid #E5E7EB', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>
        <div className="text-2xl text-center mb-3">🏃</div>
        <h2 className="font-black text-lg text-center mb-2" style={{ color: '#1a1a2e' }}>Quitter la partie ?</h2>
        <p className="text-sm text-center mb-6 leading-relaxed" style={{ color: '#6B7280' }}>
          {gameMode === 'marathon'
            ? 'Tes points accumulés ne seront pas comptabilisés au classement.'
            : 'Ta progression sera perdue.'
          }
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowQuitConfirm(false)}
            className="flex-1 py-4 rounded-2xl font-black text-base"
            style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151' }}>
            Annuler
          </button>
          <button
            onClick={onQuit}
            className="flex-1 py-4 rounded-2xl font-black text-base"
            style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid #F44336', color: '#DC2626' }}>
            Quitter
          </button>
        </div>
      </div>
    </div>
  )

  // MOD 3 — Header: 3 zones égales (w-1/3 chacune) pour un centrage absolu
  const header = (
    <div className="px-4 pt-4 pb-2 shrink-0 flex items-center">
      {/* Left (w-1/3): fact id + progress — tappable to quit */}
      <button
        onClick={() => setShowQuitConfirm(true)}
        className="w-1/3 text-left"
        title="Quitter">
        <span className="font-black text-sm" style={{ color: cat?.color || 'rgba(255,255,255,0.7)' }}>
          #{fact.id} · {factIndex + 1}/{totalFacts}
        </span>
      </button>

      {/* Center (w-1/3): category emoji + name — toujours centré */}
      <div className="w-1/3 flex items-center gap-2 justify-center min-w-0">
        {cat && <span className="text-lg shrink-0">{cat.emoji}</span>}
        <span
          className="font-black text-sm tracking-wide truncate"
          style={{ color: cat?.color || 'rgba(255,255,255,0.7)' }}>
          {cat?.label || 'Question'}
        </span>
      </div>

      {/* Right (w-1/3): coins balance */}
      <div className="w-1/3 flex justify-end">
        <span className="font-black text-sm" style={{ color: cat?.color || '#FFD700' }}>
          ⭐ {playerCoins}
        </span>
      </div>
    </div>
  )

  // MOD 4 — Segmented progress bar: 10 distinct segments
  const progressBar = (
    <div className="px-4 pb-2 shrink-0">
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

  // MOD 5 — Footer: timer centered + settings button on right (no overlap)
  const footer = (showTimer) => (
    <div className="px-4 pb-4 pt-1 shrink-0 flex items-center">
      {/* Left spacer balances the settings button width */}
      <div style={{ width: 40 }} />

      {/* Timer centered */}
      <div className="flex-1 flex justify-center">
        {showTimer ? (
          // MOD 7 — size=96 triggers fontSize=22 in CircularTimer (vs 17 at size=72)
          <CircularTimer
            key={`${fact.id}-${answerMode}`}
            size={96}
            duration={timerDuration}
            onTimeout={onTimeout}
          />
        ) : (
          <div style={{ width: 96, height: 96 }} />
        )}
      </div>

      {/* Settings button — bottom right, clears timer */}
      <button
        onClick={() => { audio.play('click'); setShowSettings(true) }}
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
        ⚙️
      </button>
    </div>
  )

  // ── Question card ─────────────────────────────────────────────────────────
  const questionCard = (
    <div
      className="rounded-3xl p-4 border shrink-0 mb-2"
      style={{
        background: cardBg,
        borderColor: cat?.color + '70',
        backdropFilter: 'blur(12px)',
        boxShadow: `0 4px 32px ${cat?.color || '#000'}30`,
      }}>
      <h2 className="text-white text-base font-bold leading-snug">{fact.question}</h2>
    </div>
  )

  // MOD 6 — Hints only when difficulty.hintsAllowed is truthy (Easy mode only)
  const hintButtons = (
    <div className="grid grid-cols-2 gap-2 shrink-0 mb-2">
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

  // ── Phase 0 : Mode selection ──────────────────────────────────────────────
  if (!answerMode) {
    return (
      <div className="relative flex flex-col h-full w-full screen-enter overflow-hidden" style={{ background: screenBg }}>
        {quitModal}
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        {header}
        {progressBar}

        {/* MOD 2 — No spacer, compact layout top-to-bottom */}
        <div className="flex flex-col px-4">
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
                style={{ background: `${cat?.color || '#22C55E'}12`, borderColor: `${cat?.color || '#22C55E'}60`, boxShadow: `0 4px 20px ${cat?.color || '#22C55E'}18` }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-black text-base">🧠 Question ouverte</div>
                    <div className="text-white/40 text-xs font-semibold mt-0.5">N°1 · N°2 · 60 secondes</div>
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
              style={{ background: `${cat?.color || '#FF5C1A'}08`, borderColor: `${cat?.color || '#FF5C1A'}40`, boxShadow: `0 4px 20px ${cat?.color || '#FF5C1A'}15` }}>
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

  // ── Phase 1 : Open question ───────────────────────────────────────────────
  if (answerMode === 'open') {
    return (
      <div className="relative flex flex-col h-full w-full screen-enter overflow-hidden" style={{ background: screenBg }}>
        {quitModal}
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        {header}
        {progressBar}

        {/* MOD 2 — No spacer, compact layout top-to-bottom */}
        <div className="flex flex-col px-4">
          {questionCard}

          <div className="flex flex-col gap-2 shrink-0">
            {/* MOD 6 — Hints only in Easy mode */}
            {difficulty?.hintsAllowed && hintButtons}
            <div className="text-white/30 text-xs font-bold uppercase tracking-widest text-center">
              Le questionneur valide la réponse
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { audio.play('wrong'); audio.vibrate([120]); onOpenValidate(false) }}
                className="btn-press py-4 rounded-2xl border-2 font-black text-base active:scale-95 transition-all"
                style={{ background: 'rgba(244,67,54,0.1)', borderColor: '#F44336', color: '#F44336' }}>
                ✗ Incorrect
              </button>
              <button
                onClick={() => { audio.play('correct'); audio.vibrate([40,20,40]); onOpenValidate(true) }}
                className="btn-press py-4 rounded-2xl border-2 font-black text-base active:scale-95 transition-all"
                style={{ background: 'rgba(76,175,80,0.1)', borderColor: '#4CAF50', color: '#4CAF50' }}>
                ✓ Correct !
              </button>
            </div>
          </div>
        </div>

        {footer(true)}
      </div>
    )
  }

  // ── Phase 2 : QCM ─────────────────────────────────────────────────────────
  // Order: header → progress → question → [hints if Easy] → QCM answers → timer
  return (
    <div className="relative flex flex-col h-full w-full screen-enter overflow-hidden" style={{ background: screenBg }}>
      {quitModal}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {header}
      {progressBar}

      {/* MOD 2 — No spacer, compact layout top-to-bottom */}
      <div className="flex flex-col px-4">
        {questionCard}

        <div className="flex flex-col gap-2 shrink-0">
          {/* MOD 6 — Hints only in Easy mode (difficulty.hintsAllowed === true) */}
          {difficulty?.hintsAllowed && hintButtons}

          <div className={`grid ${difficulty?.choices === 6 ? 'grid-cols-3' : 'grid-cols-2'} gap-2 shrink-0`}>
            {fact.options.map((option, index) => (
              <button
                key={index}
                onClick={() => {
                  const correct = index === fact.correctIndex
                  audio.play(correct ? 'correct' : 'wrong')
                  audio.vibrate(correct ? [40, 20, 40] : [120])
                  onSelectAnswer(index)
                }}
                className="btn-press py-4 rounded-2xl text-white font-bold text-sm transition-all active:scale-95 border"
                style={{
                  background: `linear-gradient(135deg, ${cat?.color}20 0%, ${cat?.color}10 100%)`,
                  borderColor: cat?.color + '40',
                  boxShadow: `0 4px 16px ${cat?.color}15`,
                }}>
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
