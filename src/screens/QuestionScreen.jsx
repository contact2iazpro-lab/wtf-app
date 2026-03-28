import { useState, useEffect } from 'react'
import CircularTimer from '../components/CircularTimer'
import SettingsModal from '../components/SettingsModal'
import { getCategoryById } from '../data/facts'
import { audio } from '../utils/audio'

// ── Hint flip card button ────────────────────────────────────────────────────
// Fixed size pill button that flips (scaleY squish) to reveal the hint text.
// Cannot be re-clicked after flipping. Text auto-sizes to fit.
function HintFlipButton({ num, hint, color, onReveal }) {
  const [phase, setPhase] = useState('front') // 'front' | 'flip' | 'back'

  const handleClick = () => {
    if (phase !== 'front') return
    setPhase('flip')
    onReveal()
    // Switch to back content once squished flat, then expand
    setTimeout(() => setPhase('back'), 160)
  }

  // Adaptive font size based on hint length
  const hintLen = hint?.length || 0
  const hintFs = hintLen > 55 ? 9 : hintLen > 38 ? 11 : 12

  return (
    <button
      onClick={handleClick}
      style={{
        height: 52,
        width: '100%',
        borderRadius: 26,
        border: `2px solid ${phase === 'back' ? color + '80' : color}`,
        background: phase === 'back' ? `${color}18` : `${color}1a`,
        transform: phase === 'flip' ? 'scaleY(0.08)' : 'scaleY(1)',
        transition: 'transform 0.15s ease, background 0.3s, border-color 0.3s',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 14px',
        cursor: phase !== 'front' ? 'default' : 'pointer',
        pointerEvents: phase !== 'front' ? 'none' : 'auto',
      }}
    >
      {phase !== 'back' ? (
        <span style={{ fontWeight: 900, fontSize: 14, color, whiteSpace: 'nowrap' }}>
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
}) {
  const [answerMode, setAnswerMode] = useState(null) // null | 'open' | 'qcm'

  // En mode solo, aller directement au QCM (pas de choix de mode)
  useEffect(() => {
    if (gameMode === 'solo') {
      setAnswerMode('qcm')
    }
  }, [gameMode])

  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const cat = getCategoryById(fact.category)

  // Dynamic background per category — vivid & bright
  const screenBg = cat
    ? `linear-gradient(135deg, ${cat.color}45 0%, ${cat.color}30 50%, ${cat.color}15 100%)`
    : 'linear-gradient(170deg, #06304A 0%, #0A4870 20%, #C45A00 65%, #7A2E00 85%, #3A1200 100%)'

  // Dynamic card background — flashy & bright
  const cardBg = cat
    ? `linear-gradient(135deg, ${cat.color}35 0%, ${cat.color}18 100%)`
    : 'rgba(0,0,0,0.4)'

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

  // ── Shared header ────────────────────────────────────────────────────────
  const header = (
    <div className="px-5 pt-4 pb-3 shrink-0">
      {/* Top row: back + counter + player badge | settings */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Back button — left side, same style as Settings */}
          <button
            onClick={() => setShowQuitConfirm(true)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
            style={{ background: 'rgba(255,255,255,0.08)' }}
            title="Retour">
            ←
          </button>
          {playerName && (
            <div
              className="px-2.5 py-1 rounded-full text-xs font-black"
              style={{ background: playerColor + '20', color: playerColor }}>
              {playerEmoji ?? '⚡'} {playerName}
            </div>
          )}
          <div className="text-xs font-bold uppercase tracking-wide" style={{ color: cat?.color || 'rgba(255,255,255,0.5)' }}>
            #{fact.id} · {factIndex + 1} / {totalFacts}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Settings button — right side */}
          <button
            onClick={() => { audio.play('click'); setShowSettings(true) }}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            ⚙️
          </button>
        </div>
      </div>
      {/* Progress bar */}
      <div className="h-1 rounded-full w-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div
          className="h-1 rounded-full transition-all duration-300"
          style={{ width: `${((factIndex + 1) / totalFacts) * 100}%`, background: cat?.color || '#FF6B1A' }}
        />
      </div>
    </div>
  )

  const categoryBadge = cat && (
    <div className="mx-5 mb-2 rounded-2xl px-5 py-2 flex items-center gap-3 shrink-0"
      style={{ background: 'rgba(0,0,0,0.35)', border: `1.5px solid ${cat.color}80`, backdropFilter: 'blur(8px)' }}>
      <span className="text-2xl">{cat.emoji}</span>
      <span className="font-black text-base tracking-wide" style={{ color: cat.color }}>{cat.label}</span>
    </div>
  )

  const factImage = (compact = false) => fact.imageUrl && gameMode === 'duel' && (
    <div
      className={`mx-auto mb-2 rounded-2xl overflow-hidden border shrink-0 ${compact ? 'h-32 w-32' : 'h-48 w-full mx-5'}`}
      style={{ borderColor: cat?.color + '40', maxWidth: compact ? '128px' : undefined }}>
      <img
        src={fact.imageUrl}
        alt={fact.question}
        className="w-full h-full object-contain"
        style={{ background: '#111' }}
        onError={e => { e.target.style.display = 'none' }}
      />
    </div>
  )

  const questionCard = (
    <div
      className="mx-5 mb-2 rounded-3xl p-4 border shrink-0"
      style={{
        background: cardBg,
        borderColor: cat?.color + '70',
        backdropFilter: 'blur(12px)',
        boxShadow: `0 4px 32px ${cat?.color || '#000'}30`,
      }}>
      <h2 className="text-white text-base font-bold leading-snug">{fact.question}</h2>
    </div>
  )

  // ── Phase 0 : Mode selection ──────────────────────────────────────────────
  if (!answerMode) {
    return (
      <div className="relative flex flex-col h-full w-full screen-enter overflow-hidden" style={{ background: screenBg }}>
        {quitModal}
        {header}
        {categoryBadge}
        {factImage()}
        {questionCard}

        <div className="px-5 pb-3 flex flex-col gap-3 mt-auto shrink-0">
          {playerName && (
            <div className="text-white/30 text-xs font-bold uppercase tracking-widest text-center mb-1">
              Choisissez votre mode
            </div>
          )}

          {/* Open question — duel only */}
          {playerName && (
            <button
              onClick={() => setAnswerMode('open')}
              className="btn-press w-full py-5 rounded-2xl active:scale-95 transition-all text-left px-5 border-2"
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

          {/* QCM */}
          <button
            onClick={() => setAnswerMode('qcm')}
            className="btn-press w-full py-5 rounded-2xl active:scale-95 transition-all text-left px-5 border-2"
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
    )
  }

  // ── Phase 1 : Open question ───────────────────────────────────────────────
  if (answerMode === 'open') {
    return (
      <div className="relative flex flex-col h-full w-full screen-enter" style={{ background: screenBg }}>
        {quitModal}
        {header}
        {categoryBadge}
        {factImage(true)}
        {questionCard}

        {/* Spacer pushes buttons to bottom */}
        <div className="flex-1" />

        {/* Buttons */}
        <div className="px-5 pb-3 flex flex-col gap-3 shrink-0">
          {/* Hint flip cards */}
          <div className="grid grid-cols-2 gap-3">
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

          {/* Validation buttons (pressed by questioner) */}
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

        <CircularTimer duration={60} onTimeout={onTimeout} />
      </div>
    )
  }

  // ── Phase 2 : QCM ────────────────────────────────────────────────────────
  return (
    <div className="relative flex flex-col h-full w-full screen-enter" style={{ background: screenBg }}>
      {quitModal}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {header}
      {categoryBadge}
      {factImage(true)}
      {questionCard}

      {/* Spacer pushes buttons to bottom */}
      <div className="flex-1" />

      <div className="px-5 pb-3 flex flex-col gap-3 shrink-0">
        {/* Hint flip cards — only shown if hints are allowed for this difficulty */}
        {(difficulty?.hintsAllowed !== false) && (
          <div className="grid grid-cols-2 gap-3">
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
        )}

        {/* Answer buttons */}
        <div className={`grid ${difficulty?.choices === 6 ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
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

      <CircularTimer duration={difficulty?.duration || 20} onTimeout={onTimeout} />
    </div>
  )
}
