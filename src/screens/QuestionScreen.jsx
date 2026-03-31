import { useState, useEffect, useRef, useCallback } from 'react'
import CircularTimer from '../components/CircularTimer'
import SettingsModal from '../components/SettingsModal'
import CoinsIcon from '../components/CoinsIcon'
import { getCategoryById } from '../data/facts'
import { audio } from '../utils/audio'

// ── Hint flip card button ────────────────────────────────────────────────────
// isFree    : indice gratuit (pas de coût)
// cost      : coût en coins si payant
// canAfford : le joueur a assez de coins pour cet indice payant
function HintFlipButton({ num, hint, catColor, isFree, cost, canAfford, onReveal }) {
  const [phase, setPhase] = useState('front') // 'front' | 'flip' | 'back'

  const disabled = !isFree && !canAfford

  const handleClick = () => {
    if (phase !== 'front' || disabled) return
    setPhase('flip')
    onReveal()
    setTimeout(() => setPhase('back'), 160)
  }

  const color = catColor || '#FF6B1A'

  // Texte adaptatif selon luminosité de la couleur catégorie
  const isLight = color.length >= 7
    ? (parseInt(color.slice(1,3),16)*299 + parseInt(color.slice(3,5),16)*587 + parseInt(color.slice(5,7),16)*114) / 1000 > 128
    : false
  const labelColor = isLight ? '#1a1a1a' : '#ffffff'

  return (
    <button
      onClick={handleClick}
      style={{
        height: 48,
        width: '100%',
        borderRadius: 24,
        border: disabled ? '2px solid #6B7280' : `2px solid ${color}`,
        background: disabled
          ? 'rgba(107,114,128,0.15)'
          : phase === 'back' ? 'rgba(255,255,255,0.88)' : `${color}28`,
        transform: phase === 'flip' ? 'scaleY(0.08)' : 'scaleY(1)',
        transition: 'transform 0.15s ease, background 0.3s, border-color 0.3s',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        pointerEvents: phase !== 'front' ? 'none' : 'auto',
        flexShrink: 0,
        opacity: disabled ? 0.55 : 1,
        gap: 1,
      }}
    >
      {phase !== 'back' ? (
        disabled ? (
          // Payant + solde insuffisant
          <>
            <span style={{ fontWeight: 900, fontSize: 12, color: '#9CA3AF', textDecoration: 'line-through', whiteSpace: 'nowrap' }}>
              Indice — {cost} 🪙
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
              Pas assez de coins
            </span>
          </>
        ) : isFree ? (
          // Gratuit
          <span style={{ fontWeight: 900, fontSize: 13, color: labelColor, whiteSpace: 'nowrap' }}>
            N°{num} — Indice offert
          </span>
        ) : (
          // Payant + solde suffisant
          <span style={{ fontWeight: 900, fontSize: 13, color: labelColor, whiteSpace: 'nowrap' }}>
            Indice — {cost} 🪙
          </span>
        )
      ) : (
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: color,
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
  // Solo et marathon → QCM direct, duel → sélection du mode
  const [answerMode, setAnswerMode] = useState(
    (gameMode === 'solo' || gameMode === 'marathon') ? 'qcm' : null
  )

  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const [showSettings, setShowSettings]       = useState(false)
  const cat = getCategoryById(fact.category)

  // ── Lisibilité sur fond coloré ─────────────────────────────────────────────
  const isLightColor = (hex) => {
    if (!hex || hex.length < 7) return false
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return (r * 299 + g * 587 + b * 114) / 1000 > 128
  }
  const catTextColor = cat?.color ? (isLightColor(cat.color) ? '#1a1a1a' : '#ffffff') : '#ffffff'

  // Timer duration
  const timerDuration = answerMode === 'open' ? 60 : (difficulty?.duration || 20)

  // Pause ref — synced to quit modal state (no re-render of CircularTimer)
  const pausedRef = useRef(false)
  useEffect(() => { pausedRef.current = showQuitConfirm }, [showQuitConfirm])

  // Wrapped timeout — no-op while quit modal is open
  const handleTimeout = useCallback(() => {
    if (!pausedRef.current) onTimeout?.()
  }, [onTimeout])

  // ── Style injection: compact screen media query only ───────────────────────
  useEffect(() => {
    const styleId = '__qs-compact'
    if (document.getElementById(styleId)) return
    const s = document.createElement('style')
    s.id = styleId
    s.textContent = `@media (max-height: 700px) {
      .qs-root .qs-h  { padding-top: 0.5rem !important; padding-bottom: 0.25rem !important; }
      .qs-root .qs-pb { padding-bottom: 0.25rem !important; }
      .qs-root .qs-m  { padding-left: 0.75rem !important; padding-right: 0.75rem !important; gap: 0.5rem !important; }
      .qs-root .qs-m .rounded-3xl { padding: 0.75rem !important; }
    }
    .qs-timer-wrap svg text { font-size: 32px !important; font-weight: 900 !important; }`
    document.head.appendChild(s)
    return () => { const el = document.getElementById(styleId); if (el) el.remove() }
  }, [])

  const screenBg = cat
    ? `linear-gradient(160deg, ${cat.color}22 0%, ${cat.color} 100%)`
    : 'linear-gradient(160deg, #1a3a5c22 0%, #1a3a5c 100%)'

  const cardBg = 'rgba(0, 0, 0, 0.28)'

  // ── Quit confirmation modal ────────────────────────────────────────────────
  const quitModal = showQuitConfirm && (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-full rounded-3xl p-6 mx-4"
        style={{ background: '#FAFAF8', border: '1px solid #E5E7EB', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}
      >
        <div className="text-2xl text-center mb-3">🏃</div>
        <h2 className="font-black text-lg text-center mb-2" style={{ color: '#1a1a2e' }}>
          Quitter le parcours ?
        </h2>
        <p className="text-sm text-center mb-6 leading-relaxed" style={{ color: '#6B7280' }}>
          Tu as exploré{' '}
          <strong style={{ color: '#1a1a2e' }}>{factIndex}</strong>{' '}
          f*ct{factIndex !== 1 ? 's' : ''} jusqu'ici.<br />
          Si tu quittes, ils ne seront pas sauvegardés.
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

  // ── Header: ✕ | catégorie | WTF$ coins | ⚙️ ──────────────────────────────
  // MOD 1 — 4 éléments horizontaux. Nom catégorie sans emoji, se réduit si long.
  const header = (
    <div className="qs-h px-4 pt-4 pb-2 shrink-0 flex items-center gap-2">

      {/* 1 — Bouton ✕ quitter */}
      <button
        onClick={() => setShowQuitConfirm(true)}
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
        title="Quitter"
        style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)' }}
      >
        <span style={{ fontSize: 11, color: 'white', fontWeight: 900, lineHeight: 1 }}>✕</span>
      </button>

      {/* 2 — Nom de la catégorie (flex-1, réduction font si trop long) */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontWeight: 900,
            fontSize: 13,
            color: cat?.color || 'rgba(255,255,255,0.7)',
            lineHeight: 1.2,
            wordBreak: 'break-word',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {cat?.label || 'Question'}
        </span>
      </div>

      {/* 3 — WTF$ + icône + solde (non cliquable) */}
      <div
        className="flex items-center gap-1 shrink-0"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, color: '#FF6B1A', lineHeight: 1 }}>WTF$</span>
        <CoinsIcon size={16} />
        <span style={{ fontWeight: 700, color: 'white', fontSize: 13 }}>{playerCoins}</span>
      </div>

      {/* 4 — Bouton ⚙️ paramètres */}
      <button
        onClick={() => { audio.play('click'); setShowSettings(true) }}
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
      >
        ⚙️
      </button>
    </div>
  )

  // ── Barre de progression — COR 1 : inactifs 12px, actif 18px, label 14px ────
  const progressBar = (
    <div className="qs-pb px-4 pb-2 shrink-0">
      <div className="flex w-full items-center" style={{ gap: 2 }}>
        {Array.from({ length: totalFacts }).map((_, i) => {
          const isActive = i === factIndex
          const isFilled = i <= factIndex
          const showLabel = i === 2
          return (
            <div
              key={i}
              className="flex-1 transition-all duration-300 flex items-center justify-center"
              style={{
                height: isActive ? 18 : 12,
                borderRadius: isActive ? 4 : 999,
                background: isFilled
                  ? cat?.color || '#FF6B1A'
                  : (cat?.color || '#FF6B1A') + '40',
              }}
            >
              {showLabel && totalFacts > 0 && (
                <span style={{ fontSize: 14, fontWeight: 900, color: catTextColor, lineHeight: 1, fontFamily: 'Arial' }}>
                  {factIndex + 1}/{totalFacts}
                </span>
              )}
            </div>
          )
        })}
      </div>
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
      <h2 className="text-white font-bold leading-snug" style={{ fontSize: 'calc(1.1rem * var(--scale))' }}>{fact.question}</h2>
    </div>
  )

  // ── Hints ──────────────────────────────────────────────────────────────────
  // Nombre total d'indices = gratuits + payants (selon le niveau)
  const freeHints  = difficulty?.freeHints  ?? 0
  const paidHints  = difficulty?.paidHints  ?? 0
  const hintCost   = difficulty?.hintCost   ?? 0
  const totalHints = freeHints + paidHints

  const hintButtons = totalHints > 0 && (
    <div
      className="shrink-0"
      style={{ display: 'grid', gridTemplateColumns: totalHints === 1 ? '1fr' : '1fr 1fr', gap: 8 }}
    >
      {Array.from({ length: totalHints }, (_, i) => {
        const hintNum = i + 1
        const isFree  = hintNum <= freeHints
        const hintText = hintNum === 1 ? fact.hint1 : fact.hint2
        return (
          <HintFlipButton
            key={hintNum}
            num={hintNum}
            hint={hintText}
            catColor={cat?.color || '#FF6B1A'}
            isFree={isFree}
            cost={hintCost}
            canAfford={playerCoins >= hintCost}
            onReveal={() => { onUseHint(hintNum); audio.play('click') }}
          />
        )
      })}
    </div>
  )

  // ── Numéro du f*ct — COR 2/5 : 22px/900, début de distribution ──────────────
  const factIdLabel = (
    <div
      className="text-center shrink-0"
      style={{
        fontSize: 22,
        fontWeight: 900,
        color: cat?.color || 'rgba(255,255,255,0.4)',
      }}
    >
      #{fact.id}
    </div>
  )

  // ── Zone timer — COR 4 : flex:1 flottant entre QCM et bas ──────────────────
  const timerZone = (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 8, paddingBottom: 16, minHeight: 80 }}>
      <div className="qs-timer-wrap" style={{ transform: 'scale(var(--scale))', transformOrigin: 'center' }}>
        <CircularTimer
          key={`${fact.id}-${answerMode}`}
          size={110}
          duration={timerDuration}
          onTimeout={handleTimeout}
        />
      </div>
    </div>
  )

  // ── Phase 0 : Sélection du mode (hors solo) ────────────────────────────────
  if (!answerMode) {
    return (
      <div
        className="qs-root relative flex flex-col h-full w-full screen-enter overflow-hidden"
        style={{ background: screenBg }}
      >
        {quitModal}
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        {header}
        {progressBar}
        {factIdLabel}

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

          </div>
        </div>
      </div>
    )
  }

  // ── Phase 1 : Question ouverte ─────────────────────────────────────────────
  if (answerMode === 'open') {
    return (
      <div
        className="qs-root relative flex flex-col h-full w-full screen-enter overflow-hidden"
        style={{ background: screenBg }}
      >
        {quitModal}
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        {header}
        {progressBar}

        {/* COR 5 — distribution depuis le numéro : factIdLabel est le premier élément */}
        <div className="qs-m flex-1 px-4 pb-4 flex flex-col" style={{ gap: 'clamp(8px, 2vh, 24px)' }}>
          {factIdLabel}
          {questionCard}
          {difficulty?.hintsAllowed && hintButtons}
          <div className="text-white/30 text-xs font-bold uppercase tracking-widest text-center shrink-0">
            Le questionneur valide la réponse
          </div>
          <div className="grid grid-cols-2 gap-3 shrink-0">
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
          {timerZone}
        </div>
      </div>
    )
  }

  // ── Phase 2 : QCM ──────────────────────────────────────────────────────────
  // MOD 3 — ordre : question → indices → boutons → #id → timer (flex-1)
  return (
    <div
      className="qs-root relative flex flex-col h-full w-full screen-enter overflow-hidden"
      style={{ background: screenBg }}
    >
      {quitModal}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {header}
      {progressBar}

      {/* COR 5 — distribution depuis le numéro : factIdLabel est le premier élément */}
      <div className="qs-m flex-1 px-4 pb-4 flex flex-col" style={{ gap: 'clamp(8px, 2vh, 24px)' }}>
        {factIdLabel}
        {questionCard}

        {/* Indices */}
        {difficulty?.hintsAllowed && hintButtons}

        {/* Boutons QCM */}
        <div className="grid gap-3 shrink-0" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {fact.options.map((option, index) => (
            <button
              key={index}
              onClick={() => {
                const correct = index === fact.correctIndex
                audio.play(correct ? 'correct' : 'wrong')
                audio.vibrate(correct ? [40, 20, 40] : [120])
                onSelectAnswer(index)
              }}
              className="btn-press rounded-2xl font-bold transition-all active:scale-95 border"
              style={{
                fontSize: 'clamp(13px, 1.8vw, 16px)',
                minHeight: 72,
                height: 72,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                color: 'white',
                background: `linear-gradient(135deg, ${cat?.color}20 0%, ${cat?.color}10 100%)`,
                borderColor: cat?.color + '40',
                boxShadow: `0 4px 16px ${cat?.color}15`,
              }}
            >
              {option}
            </button>
          ))}
        </div>

        {timerZone}
      </div>
    </div>
  )
}
