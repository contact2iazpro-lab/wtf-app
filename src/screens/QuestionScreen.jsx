import { useState } from 'react'
import CircularTimer from '../components/CircularTimer'
import { getCategoryById } from '../data/facts'

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
  playerName,
  playerColor,
}) {
  const [answerMode, setAnswerMode] = useState(null) // null | 'open' | 'qcm'
  const [showHint1, setShowHint1] = useState(false)
  const [showHint2, setShowHint2] = useState(false)
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const cat = getCategoryById(fact.category)

  const handleShowHint = (hintNum) => {
    if (hintNum === 1 && !showHint1) { setShowHint1(true); onUseHint(1) }
    else if (hintNum === 2 && !showHint2) { setShowHint2(true); onUseHint(2) }
  }

  // ── Quit confirmation modal ─────────────────────────────────────────────────
  const quitModal = showQuitConfirm && (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full rounded-3xl p-6 border" style={{ background: '#1A1A2E', borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="text-2xl text-center mb-3">🏃</div>
        <h2 className="text-white font-black text-lg text-center mb-2">Quitter la partie ?</h2>
        <p className="text-white/50 text-sm text-center mb-6 leading-relaxed">
          {gameMode === 'marathon'
            ? 'Tes points accumulés ne seront pas comptabilisés au classement.'
            : 'Ta progression sera perdue.'
          }
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowQuitConfirm(false)}
            className="flex-1 py-4 rounded-2xl font-black text-base border"
            style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>
            Annuler
          </button>
          <button
            onClick={onQuit}
            className="flex-1 py-4 rounded-2xl font-black text-base border"
            style={{ background: 'rgba(244,67,54,0.15)', borderColor: '#F44336', color: '#F44336' }}>
            Quitter
          </button>
        </div>
      </div>
    </div>
  )

  // ── Shared header ──────────────────────────────────────────────────────────
  const header = (
    <div className="flex items-center justify-between px-5 pt-8 pb-4 shrink-0">
      <div className="flex gap-1.5">
        {Array.from({ length: totalFacts }).map((_, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === factIndex ? '24px' : '8px',
              background: i < factIndex ? cat?.color : i === factIndex ? cat?.color : '#2E2E2E',
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        {playerName && (
          <div
            className="px-2.5 py-1 rounded-full text-xs font-black"
            style={{ background: playerColor + '20', color: playerColor }}>
            {playerNumber === 1 ? '⚡' : '🔥'} {playerName}
          </div>
        )}
        <div className="text-xs font-bold text-white/50 uppercase tracking-wide">
          {factIndex + 1} / {totalFacts}
        </div>
        <button
          onClick={() => setShowQuitConfirm(true)}
          className="ml-1 w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
          style={{ background: 'rgba(255,255,255,0.08)' }}>
          ✕
        </button>
      </div>
    </div>
  )

  const categoryBadge = cat && (
    <div className="mx-5 mb-4 rounded-2xl px-5 py-3 flex items-center gap-3 shrink-0"
      style={{ background: 'rgba(0,0,0,0.35)', border: `1.5px solid ${cat.color}80`, backdropFilter: 'blur(8px)' }}>
      <span className="text-2xl">{cat.emoji}</span>
      <span className="font-black text-base tracking-wide" style={{ color: cat.color }}>{cat.label}</span>
    </div>
  )

  const factImage = (compact = false) => fact.imageUrl && gameMode === 'duel' && (
    <div
      className={`mx-auto mb-4 rounded-2xl overflow-hidden border shrink-0 ${compact ? 'h-36 w-36' : 'aspect-square w-full mx-5'}`}
      style={{ borderColor: cat?.color + '40', maxWidth: compact ? '144px' : undefined }}>
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
      className="mx-5 mb-4 rounded-3xl p-5 border shrink-0"
      style={{
        background: 'rgba(0,0,0,0.4)',
        borderColor: cat?.color + '60',
        backdropFilter: 'blur(12px)',
        boxShadow: `0 4px 24px rgba(0,0,0,0.3)`,
      }}>
      <h2 className="text-white text-lg font-bold leading-snug">{fact.question}</h2>
    </div>
  )

  // ── Phase 0 : Mode selection ───────────────────────────────────────────────
  if (!answerMode) {
    return (
      <div className="relative flex flex-col h-full w-full screen-enter overflow-y-auto scrollbar-hide" style={{ background: 'linear-gradient(170deg, #06304A 0%, #0A4870 20%, #C45A00 65%, #7A2E00 85%, #3A1200 100%)' }}>
        {quitModal}
        {header}
        {categoryBadge}
        {factImage()}
        {questionCard}

        <div className="px-5 pb-8 flex flex-col gap-3 mt-auto shrink-0">
          <div className="text-white/30 text-xs font-bold uppercase tracking-widest text-center mb-1">
            Choisissez votre mode
          </div>

          {/* Open question */}
          <button
            onClick={() => setAnswerMode('open')}
            className="btn-press w-full py-5 rounded-2xl active:scale-95 transition-all text-left px-5 border-2"
            style={{ background: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.5)', boxShadow: '0 4px 20px rgba(34,197,94,0.1)' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-black text-base">🧠 Question ouverte</div>
                <div className="text-white/40 text-xs font-semibold mt-0.5">N°1 · N°2 · 60 secondes</div>
              </div>
              <div className="text-right">
                <div className="font-black text-2xl" style={{ color: '#22C55E' }}>5</div>
                <div className="text-xs font-bold text-white/40">pts max</div>
              </div>
            </div>
          </button>

          {/* QCM */}
          <button
            onClick={() => setAnswerMode('qcm')}
            className="btn-press w-full py-5 rounded-2xl active:scale-95 transition-all text-left px-5 border-2"
            style={{ background: 'rgba(255,92,26,0.06)', borderColor: 'rgba(255,92,26,0.5)', boxShadow: '0 4px 20px rgba(255,92,26,0.1)' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-black text-base">🎯 Choix multiple</div>
                <div className="text-white/40 text-xs font-semibold mt-0.5">4 réponses · 20 secondes</div>
              </div>
              <div className="text-right">
                <div className="font-black text-2xl text-wtf-orange">1</div>
                <div className="text-xs font-bold text-white/40">pt</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    )
  }

  // ── Phase 1 : Open question ────────────────────────────────────────────────
  if (answerMode === 'open') {
    return (
      <div className="relative flex flex-col h-full w-full screen-enter" style={{ background: 'linear-gradient(170deg, #06304A 0%, #0A4870 20%, #C45A00 65%, #7A2E00 85%, #3A1200 100%)' }}>
        {quitModal}
        {header}
        {categoryBadge}
        {factImage(true)}
        {questionCard}

        {/* Hints display */}
        <div className="flex-1 px-5 flex flex-col gap-3 mb-4 overflow-y-auto scrollbar-hide">
          {showHint1 && (
            <div className="rounded-2xl p-4 border animate-fade-up" style={{ background: 'rgba(251,191,36,0.08)', borderColor: 'rgba(251,191,36,0.4)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-full text-xs font-black border" style={{ color: '#FBBF24', borderColor: '#FBBF24', background: 'rgba(251,191,36,0.15)' }}>N°1</span>
                <span className="text-xs font-bold uppercase tracking-wide text-white/50">Indice</span>
              </div>
              <p className="text-white font-bold text-lg">{fact.hint1}</p>
            </div>
          )}
          {showHint2 && (
            <div className="rounded-2xl p-4 border animate-fade-up" style={{ background: 'rgba(249,115,22,0.08)', borderColor: 'rgba(249,115,22,0.4)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-full text-xs font-black border" style={{ color: '#F97316', borderColor: '#F97316', background: 'rgba(249,115,22,0.15)' }}>N°2</span>
                <span className="text-xs font-bold uppercase tracking-wide text-white/50">Indice</span>
              </div>
              <p className="text-white font-bold text-lg">{fact.hint2}</p>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="px-5 pb-4 flex flex-col gap-3 shrink-0">
          {/* Hint buttons — N°1 / N°2 badge style */}
          <div className="grid grid-cols-2 gap-3">
            <button
              disabled={showHint1}
              onClick={() => handleShowHint(1)}
              className={`btn-press py-3 rounded-full border-2 font-black text-sm transition-all ${showHint1 ? 'opacity-40 cursor-not-allowed' : ''}`}
              style={showHint1
                ? { borderColor: '#2C2A50', color: 'rgba(255,255,255,0.3)', background: 'transparent' }
                : { borderColor: '#FBBF24', color: '#FBBF24', background: 'rgba(251,191,36,0.1)' }}>
              N°1 — Indice
            </button>
            <button
              disabled={showHint2}
              onClick={() => handleShowHint(2)}
              className={`btn-press py-3 rounded-full border-2 font-black text-sm transition-all ${showHint2 ? 'opacity-40 cursor-not-allowed' : ''}`}
              style={showHint2
                ? { borderColor: '#2C2A50', color: 'rgba(255,255,255,0.3)', background: 'transparent' }
                : { borderColor: '#F97316', color: '#F97316', background: 'rgba(249,115,22,0.1)' }}>
              N°2 — Indice
            </button>
          </div>

          {/* Validation buttons (pressed by questioner) */}
          <div className="text-white/30 text-xs font-bold uppercase tracking-widest text-center">
            Le questionneur valide la réponse
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onOpenValidate(false)}
              className="btn-press py-4 rounded-2xl border-2 font-black text-base active:scale-95 transition-all"
              style={{ background: 'rgba(244,67,54,0.1)', borderColor: '#F44336', color: '#F44336' }}>
              ✗ Incorrect
            </button>
            <button
              onClick={() => onOpenValidate(true)}
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

  // ── Phase 2 : QCM ─────────────────────────────────────────────────────────
  return (
    <div className="relative flex flex-col h-full w-full screen-enter" style={{ background: 'linear-gradient(170deg, #06304A 0%, #0A4870 20%, #C45A00 65%, #7A2E00 85%, #3A1200 100%)' }}>
      {quitModal}
      {header}
      {categoryBadge}
      {factImage(true)}
      {questionCard}

      <div className="flex-1" />

      <div className="px-5 pb-4 flex flex-col gap-3 shrink-0">
        <div className="grid grid-cols-2 gap-3">
          {fact.options.map((option, index) => (
            <button
              key={index}
              onClick={() => onSelectAnswer(index)}
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

      <CircularTimer duration={20} onTimeout={onTimeout} />
    </div>
  )
}
