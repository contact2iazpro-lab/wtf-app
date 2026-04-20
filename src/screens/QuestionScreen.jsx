import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import CircularTimer from '../components/CircularTimer'
import GameHeader from '../components/GameHeader'
import CoinsIcon from '../components/CoinsIcon'
import HintFlipButton from '../components/HintFlipButton'
import { getCategoryById } from '../data/facts'
import { audio } from '../utils/audio'
import { usePlayerProfile } from '../hooks/usePlayerProfile'
import renderFormattedText from '../utils/renderFormattedText'
import FallbackImage from '../components/FallbackImage'

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
  playerHints = 0,
  sessionType = 'parcours',
}) {
  // Solo et explorer → QCM direct, duel → sélection du mode
  const [answerMode, setAnswerMode] = useState(
    (gameMode === 'solo' || gameMode === 'quickie') ? 'qcm' : null
  )

  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const [coinFlash, setCoinFlash] = useState(null)
  const [imgFailed, setImgFailed] = useState(false)
  const [showVipSurprise, setShowVipSurprise] = useState(false)
  useEffect(() => { setImgFailed(false) }, [fact.id])

  // Bonus VIP surprise en Quickie (19/04/2026) — overlay + jingle jackpot
  const isVipSurprise = !!fact._isVipSurprise
  useEffect(() => {
    if (!isVipSurprise) return
    setShowVipSurprise(true)
    audio.play('roulette_jackpot')
    audio.vibrate?.([40, 30, 80])
    const t = setTimeout(() => setShowVipSurprise(false), 2200)
    return () => clearTimeout(t)
  }, [fact.id, isVipSurprise])
  // Phase A.6 — miroir Supabase pour achat indice en session
  const { coins: _cCoins, hints: _cHints, applyCurrencyDelta } = usePlayerProfile()
  const prevCoinsRef = useRef(_cCoins)

  useEffect(() => {
    const prev = prevCoinsRef.current
    prevCoinsRef.current = _cCoins
    const diff = _cCoins - prev
    if (diff > 0) {
      setCoinFlash(`+${diff}`)
      const t = setTimeout(() => setCoinFlash(null), 1200)
      return () => clearTimeout(t)
    }
  }, [_cCoins])

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
  const S = (px) => `calc(${px}px * var(--scale))`

  // Timer duration — source unique : difficulty.duration (gameConfig.js)
  const timerDuration = answerMode === 'open' ? 60 : (difficulty?.duration || 20)

  // Progress display — Quickie shows X/10
  const displayTotalFacts = totalFacts

  // Le timer continue même quand la modal quitter est ouverte (décision 17/04/2026)
  const handleTimeout = useCallback(() => {
    onTimeout?.()
  }, [onTimeout])

  // Back button physique : ouvre la modal quitter (timer continue)
  useEffect(() => {
    const prev = window.__wtfBackHandler
    window.__wtfBackHandler = () => {
      if (showQuitConfirm) { setShowQuitConfirm(false); return true }
      setShowQuitConfirm(true)
      return true
    }
    return () => { window.__wtfBackHandler = prev || null }
  }, [showQuitConfirm])


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
    .qs-timer-wrap svg text { font-size: clamp(48px, 8vh, 64px) !important; font-weight: 900 !important; }`
    document.head.appendChild(s)
    return () => { const el = document.getElementById(styleId); if (el) el.remove() }
  }, [])

  const isQuickieMode = sessionType === 'quickie' || gameMode === 'quickie'
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
          Tu as répondu à{' '}
          <strong style={{ color: '#1a1a2e' }}>{factIndex}</strong>{' '}
          question{factIndex !== 1 ? 's' : ''} jusqu'ici.<br />
          Si tu quittes, tes f*cts et tes coins ne seront pas sauvegardés.
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
            onClick={() => { audio.stopAll(); onQuit() }}
            className="w-full py-3 rounded-2xl font-bold text-sm"
            style={{ background: 'transparent', color: '#9CA3AF' }}
          >
            Quitter quand même
          </button>
        </div>
      </div>
    </div>
  )

  // ── Header: ✕ | catégorie | coins | hints | ⚙️ ─────────────────
  const header = (
    <GameHeader
      playerCoins={playerCoins}
      playerHints={playerHints}
      categoryLabel={cat?.label || 'Question'}
      categoryColor={cat?.color}
      categoryIcon={fact.category ? `/assets/categories/${fact.category}.png` : null}
      onQuit={() => setShowQuitConfirm(true)}
      coinFlash={coinFlash}
    />
  )

  // ── Question card ──────────────────────────────────────────────────────────
  // Couleur cadre question/image : gold brillant si VIP surprise, sinon couleur cat/mode
  const vipGold = '#FFD700'
  const vipGoldGlow = '0 0 20px rgba(255,215,0,0.65), 0 0 8px rgba(255,215,0,0.9)'
  const cardBorderColor = isVipSurprise ? vipGold : (isQuickieMode ? '#FFD700' : (cat?.color + '70'))
  const cardBoxShadow = isVipSurprise ? vipGoldGlow
    : (isQuickieMode ? '0 0 20px rgba(127,119,221,0.3)' : `0 4px 32px ${cat?.color || '#000'}30`)

  const questionCard = (
    <div
      style={{
        padding: `${S(12)} ${S(16)}`,
        borderRadius: S(16),
        background: cardBg,
        border: `${isQuickieMode ? 3 : 1}px solid ${cardBorderColor}`,
        backdropFilter: 'blur(12px)',
        boxShadow: cardBoxShadow,
        height: S(72), flexShrink: 0, overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <p style={{ color: '#ffffff', fontSize: S(15), fontWeight: 800, textAlign: 'center', lineHeight: 1.4, margin: 0 }}>{renderFormattedText(fact.question, isQuickieMode ? '#FFD4A3' : undefined)}</p>
    </div>
  )

  // ── Image Quickie (élément séparé) ──────────────────────────────────────
  const quickieImage = isQuickieMode && (
    <div style={{
      position: 'relative',
      width: '55%',
      aspectRatio: '1 / 1',
      borderRadius: S(12),
      overflow: 'hidden',
      margin: '0 auto',
      background: 'rgba(0,0,0,0.3)',
      border: `3px solid ${isVipSurprise ? vipGold : '#FFD700'}`,
      boxShadow: isVipSurprise ? vipGoldGlow : undefined,
      flexShrink: 0,
    }}>
      {fact.imageUrl && !imgFailed ? (
        <img
          src={fact.imageUrl}
          alt=""
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            filter: 'blur(18px) brightness(0.6)',
            transform: 'scale(1.15)',
          }}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', filter: 'blur(14px) brightness(0.6)' }}>
          <FallbackImage categoryColor={cat?.color || '#1a3a5c'} />
        </div>
      )}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isVipSurprise ? (
          <img
            src="/assets/ui/wtf-star.png"
            alt=""
            style={{
              width: '52%', height: '52%', objectFit: 'contain',
              filter: 'drop-shadow(0 0 16px rgba(255,215,0,0.8)) drop-shadow(0 0 30px rgba(255,215,0,0.4))',
              animation: 'quickie-pulse-btn 2s ease-in-out infinite',
            }}
          />
        ) : (
          <span style={{
            fontSize: S(48), fontWeight: 900, color: '#FFD4A3',
            textShadow: '0 0 30px rgba(127,119,221,0.6), 0 0 60px rgba(127,119,221,0.3)',
            animation: 'quickie-pulse-btn 2s ease-in-out infinite',
            lineHeight: 1,
          }}>?</span>
        )}
      </div>
    </div>
  )

  // ── Tirage aléatoire de 2 indices parmi 4 (stable par question) ────────────
  const selectedHints = useMemo(() => {
    const pool = [fact.hint1, fact.hint2, fact.hint3, fact.hint4]
      .filter(h => h && h.trim() !== '')
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 2)
  }, [fact.id])

  // ── Hints ──────────────────────────────────────────────────────────────────
  // Nombre d'indices disponibles selon la difficulté (max boutons affichés)
  const freeHints  = difficulty?.freeHints  ?? 0
  const paidHints  = difficulty?.paidHints  ?? 0
  const totalHints = Math.min(freeHints + paidHints, selectedHints.length)
  // Stock restant = hints du context (applyCurrencyDelta a déjà débité à chaque clic)
  const stockRemaining = Math.max(0, _cHints)

  const hintCost = difficulty?.hintCost || 0
  const hintButtons = totalHints > 0 && (
    <div
      className="shrink-0"
      style={{ display: 'grid', gridTemplateColumns: totalHints === 1 ? '1fr' : '1fr 1fr', gap: 8 }}
    >
      {Array.from({ length: totalHints }, (_, i) => {
        const hintNum = i + 1
        const hintText = selectedHints[hintNum - 1] ?? null
        // Distinguish free hints from paid hints
        const isFree = hintNum <= freeHints
        const cost = isFree ? 0 : hintCost
        // Paid hint: can use if has stock OR can buy with coins
        const hasStock = stockRemaining > 0
        const canAfford = isFree || _cCoins >= cost || hasStock
        const canUseHint = isFree ? (hintsUsed < freeHints) : (hasStock || _cCoins >= cost)
        const needsBuy = !isFree && !hasStock && _cCoins >= cost
        return (
          <HintFlipButton
            key={hintNum}
            num={hintNum}
            hint={hintText}
            catColor={isQuickieMode ? '#FFD700' : (cat?.color || '#FF6B1A')}
            isFree={isFree}
            cost={cost}
            canAfford={canAfford}
            canUse={canUseHint}
            needsBuy={needsBuy}
            onReveal={() => { onUseHint(hintNum); audio.play('click') }}
            onBuyHint={!isFree && cost > 0 ? () => {
              applyCurrencyDelta?.({ coins: -cost, hints: 1 }, 'buy_hint_in_session')?.catch?.(e =>
                console.warn('[QuestionScreen] buy hint RPC failed:', e?.message || e)
              )
            } : null}
            revealedTextColor={isQuickieMode ? '#FFD700' : undefined}
          />
        )
      })}
    </div>
  )


  // ── Zone timer — COR 4 : flex:1 flottant entre QCM et bas ──────────────────
  const timerZone = (
    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `${S(8)} 0 ${S(12)}` }}>
      <div className="qs-timer-wrap" style={{ width: S(64), height: S(64), display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <CircularTimer
          key={`${fact.id}-${answerMode}`}
          size={64}
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
        className="qs-root relative screen-enter"
        style={{
          height: '100%', width: '100%', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
          background: screenBg,
        }}
      >
        {quitModal}
        {header}
        {progressBar}


        <div className="qs-m" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: S(10), padding: `0 ${S(16)}` }}>
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
        className="qs-root relative screen-enter"
        style={{
          height: '100%', width: '100%', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
          background: screenBg,
        }}
      >
        {quitModal}
        {header}
        {difficulty && (
          <div style={{ textAlign: 'center', flexShrink: 0, padding: `0 0 ${S(2)}` }}>
            <span style={{ fontSize: S(10), fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
              {difficulty.emoji || ''} Mode {difficulty.label || difficulty.id}
            </span>
          </div>
        )}
        {progressBar}


        {/* Zone centrale : question + indices + validation */}
        <div className="qs-m" style={{
          flex: 1, minHeight: 0,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'flex-start', gap: S(10),
          padding: `0 ${S(16)}`,
        }}>
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
        </div>

        {timerZone}
      </div>
    )
  }

  // ── Phase 2 : QCM ──────────────────────────────────────────────────────────
  const MODE_LABELS = { quickie: 'QUICKIE', drop: 'MODE DROP', parcours: 'MODE QUEST' }
  const modeLabel = MODE_LABELS[sessionType] || (difficulty ? `Mode ${difficulty.label || difficulty.id}` : '')

  // ── Phase 2 : QCM ──────────────────────────────────────────────────────────
  return (
    <div
      className="qs-root relative screen-enter"
      style={{
        height: '100%', width: '100%', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
        boxSizing: 'border-box', background: screenBg,
      }}
    >
      {quitModal}
      {header}

      {/* Overlay Bonus VIP Surprise (Quickie, 19/04/2026) — 2.2s puis fade */}
      {showVipSurprise && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 60,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(circle at center, rgba(255,215,0,0.25) 0%, rgba(0,0,0,0.7) 70%)',
            backdropFilter: 'blur(3px)',
            pointerEvents: 'none',
            animation: 'vipSurpriseFade 2.2s ease-out forwards',
          }}
        >
          <div style={{
            textAlign: 'center',
            animation: 'vipSurprisePop 2.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          }}>
            <img src="/assets/ui/wtf-star.png" alt="" style={{ width: S(56), height: S(56), objectFit: 'contain', marginBottom: S(6), filter: 'drop-shadow(0 0 16px rgba(255,215,0,0.8))' }} />
            <div style={{
              fontSize: S(28), fontWeight: 900, letterSpacing: '0.06em',
              color: '#FFD700',
              textShadow: '0 0 24px rgba(255,215,0,0.8), 0 2px 8px rgba(0,0,0,0.5)',
              textTransform: 'uppercase',
            }}>
              Bonus f*ct WTF!
            </div>
            <div style={{
              fontSize: S(13), fontWeight: 800, marginTop: S(6),
              color: '#FFE8A0', letterSpacing: '0.06em',
              textShadow: '0 1px 4px rgba(0,0,0,0.5)',
            }}>
              Un f*ct rare vient d'apparaître !
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes vipSurpriseFade {
          0%   { opacity: 0 }
          15%  { opacity: 1 }
          85%  { opacity: 1 }
          100% { opacity: 0 }
        }
        @keyframes vipSurprisePop {
          0%   { transform: scale(0.3) rotate(-10deg) }
          25%  { transform: scale(1.15) rotate(3deg) }
          45%  { transform: scale(0.95) rotate(-1deg) }
          60%  { transform: scale(1) rotate(0deg) }
          100% { transform: scale(1) rotate(0deg) }
        }
        @keyframes vipBadgePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,215,0,0.6) }
          50%      { box-shadow: 0 0 18px 6px rgba(255,215,0,0.25) }
        }
      `}</style>

      {/* Bloc mode label + info + progress — hauteur fixe identique aux 3 modes */}
      <div style={{ height: S(56), flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: `${S(2)} ${S(16)} ${S(4)}` }}>
        {/* Mode label (variante texte gold si VIP surprise, même dimensions) */}
        {isVipSurprise ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(6), animation: 'vipBadgePulse 1.6s ease-in-out infinite', borderRadius: S(999) }}>
            <img src="/assets/ui/wtf-star.png" alt="" style={{ width: S(18), height: S(18), objectFit: 'contain' }} />
            <span style={{
              fontSize: S(11), fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: '#FFD700', textShadow: '0 1px 3px rgba(0,0,0,0.4)',
            }}>
              Bonus f*ct WTF!
            </span>
          </div>
        ) : modeLabel && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(6) }}>
            {isQuickieMode && <img src="/assets/modes/icon-quickie.png?v=2" alt="" style={{ width: S(18), height: S(18), objectFit: 'contain' }} />}
            <span style={{
              fontSize: S(11), fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: isQuickieMode ? '#FFD4A3' : 'rgba(255,255,255,0.6)', textShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}>
              {modeLabel}
            </span>
          </div>
        )}
        {/* Compteur */}
        {isQuickieMode && (
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: S(12), fontWeight: 900, color: '#FFD4A3' }}>
              {factIndex + 1}/{displayTotalFacts}
            </span>
          </div>
        )}
        {/* Barre de progression */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: S(3) }}>
          {Array.from({ length: displayTotalFacts }).map((_, i) => {
            const isActive = i === factIndex
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: isActive ? S(12) : S(8),
                  borderRadius: S(4),
                  background: isActive ? (isQuickieMode ? '#FFD700' : 'white') : 'rgba(255,255,255,0.2)',
                  transition: 'all 0.3s ease',
                }}
              />
            )
          })}
        </div>
      </div>

      {/* ── Bloc contenu S(264) — question + indices + QCM ── */}
      <div className="qs-m" style={{
        height: S(270), flexShrink: 0, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
        padding: `${S(4)} ${S(16)} 0`,
      }}>
        {questionCard}

        {/* Indices — enfant central */}
        <div>{difficulty?.hintsAllowed && hintButtons}</div>

        {/* Boutons QCM — enfant bas */}
        {(() => {
          const is6 = fact.options.length > 4
          const btnH = is6 ? 50 : 50
          const btnFont = is6 ? 11 : 12
          return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: S(5), flexShrink: 0, position: 'relative', zIndex: 5 }}>
              {fact.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => {
                    const correct = index === fact.correctIndex
                    audio.play(correct ? 'correct' : 'wrong')
                    audio.vibrate(correct ? [40, 20, 40] : [120])
                    onSelectAnswer(index)
                  }}
                  className="btn-press active:scale-95"
                  style={{
                    background: isQuickieMode ? '#FFFFFF' : 'rgba(255,255,255,0.15)',
                    border: isQuickieMode
                      ? `3px solid ${isVipSurprise ? vipGold : '#FFD700'}`
                      : '1.5px solid rgba(255,255,255,0.4)',
                    boxShadow: isVipSurprise && isQuickieMode ? vipGoldGlow : undefined,
                    borderRadius: S(12),
                    color: isQuickieMode ? (cat?.color || '#4A3FA3') : 'white',
                    fontWeight: isQuickieMode ? 800 : 700,
                    fontSize: S(btnFont),
                    lineHeight: 1.2,
                    padding: `${S(4)} ${S(6)}`,
                    height: S(btnH),
                    width: '100%',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'transform 0.1s, background 0.15s',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: is6 ? 2 : 3, WebkitBoxOrient: 'vertical' }}>
                    {renderFormattedText(option)}
                  </span>
                </button>
              ))}
            </div>
          )
        })()}
      </div>

      {/* ── Zone image + timer — flex:1 space-evenly (3 espaces égaux) ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly' }}>
        {quickieImage}
        <div style={{ width: S(96), height: S(96), display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <CircularTimer
            key={`${fact.id}-${answerMode}`}
            size={96}
            duration={timerDuration}
            onTimeout={handleTimeout}
            variant={isQuickieMode ? 'quickie' : 'default'}
          />
        </div>
      </div>
    </div>
  )
}
