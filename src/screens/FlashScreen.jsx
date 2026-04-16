// FlashScreen — Rendez-vous quotidien (spec docs/FLASH_MODE_SPECS.md 15/04/2026)
// Lun-sam : 5 questions Funny thème du jour fixe · 2 QCM · 15s · 30 coins fixe · 0 indice
// Dimanche : 1 VIP cible + 4 Funny distracteurs · débloque UNIQUEMENT le VIP si sa question est juste
// Phases : intro → playing → done · Gratuit 1×/jour
import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { getFunnyFactsByCategory, getVipFacts, getFunnyFacts } from '../data/factsService'
import { getAnswerOptions } from '../utils/answers'
import { DIFFICULTY_LEVELS } from '../constants/gameConfig'
import { usePlayerProfile } from '../hooks/usePlayerProfile'
import { audio } from '../utils/audio'
import { useScale } from '../hooks/useScale'
import GameHeader from '../components/GameHeader'
import FallbackImage from '../components/FallbackImage'
import { CATEGORIES } from '../data/facts'
import CircularTimer from '../components/CircularTimer'
import GainsBreakdown from '../components/results/GainsBreakdown'
import HintFlipButton from '../components/HintFlipButton'
import renderFormattedText from '../utils/renderFormattedText'

const HINT_COST = 50

const STORAGE_KEY_PREFIX = 'wtf_flash_'
const FLASH_REWARD = 30
const FLASH_DURATION = 400
const SUNDAY_GOLD = '#FFD700'
const SUNDAY_BG = 'linear-gradient(160deg, #2E1A47 0%, #1a0f2e 100%)'

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function isSunday() {
  return new Date().getDay() === 0
}

// Seed stable toute la semaine (année + numéro de semaine ISO)
function weekKey() {
  const d = new Date()
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = tmp.getUTCDay() || 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7)
  return `${tmp.getUTCFullYear()}-W${weekNo}`
}

function hashString(s) {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h
}

function seededPick(pool, seed, count) {
  const h = hashString(seed)
  const picked = []
  const used = new Set()
  let cursor = h % pool.length
  while (picked.length < count && used.size < pool.length) {
    if (!used.has(cursor)) {
      used.add(cursor)
      picked.push(pool[cursor])
    }
    cursor = (cursor + 1 + (h % 7)) % pool.length
  }
  return picked
}

// Rotation thématique V1 (spec FLASH_MODE_SPECS.md) : mapping fixe jour → catégorie,
// avec un nom fun (pas le nom de la catégorie). V2 : vrais thèmes transversaux.
// Index JS getDay() : 0=dim, 1=lun, 2=mar, 3=mer, 4=jeu, 5=ven, 6=sam
const WEEKDAY_THEMES = {
  1: { categoryId: 'records',      emoji: '🏆', funName: 'Records absurdes',      color: '#E8B84B' },
  2: { categoryId: 'corps_humain', emoji: '🫀', funName: 'Le corps est bizarre',  color: '#F07070' },
  3: { categoryId: 'animaux',      emoji: '🦥', funName: 'Animaux fous',          color: '#6BCB77' },
  4: { categoryId: 'lois',         emoji: '⚖️', funName: 'Lois WTF!',             color: '#6366B8' },
  5: { categoryId: 'sciences',     emoji: '🔬', funName: 'Science fiction réelle',color: '#80C8E8' },
  6: { categoryId: 'gastronomie',  emoji: '🍔', funName: 'Food WTF!',             color: '#FFA500' },
}

function pickThemeOfDay(dayOfWeek) {
  const theme = WEEKDAY_THEMES[dayOfWeek]
  if (!theme) return null
  const pool = getFunnyFactsByCategory(theme.categoryId)
  if (pool.length < 5) {
    // Fallback : première catégorie avec ≥5 Funny
    const fallbackPool = getFunnyFacts()
    if (fallbackPool.length < 5) return null
    return { ...theme, categoryId: null, poolSize: fallbackPool.length }
  }
  return { ...theme, poolSize: pool.length }
}

export default function FlashScreen({ onHome, setStorage }) {
  const scale = useScale()
  const S = (px) => `calc(${px}px * var(--scale))`
  const { applyCurrencyDelta, unlockFact, hints: profileHints, coins: profileCoins } = usePlayerProfile()
  const diff = DIFFICULTY_LEVELS.FLASH
  const dateStr = todayKey()
  const sunday = isSunday()
  const storageKey = STORAGE_KEY_PREFIX + dateStr

  const initial = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || 'null') } catch { return null }
  }, [storageKey])

  // Thème du jour — lun-sam rotation fixe · dim = VIP Hunt (1 VIP cible + 4 Funny)
  const dayOfWeek = new Date().getDay()
  const theme = useMemo(() => {
    if (sunday) {
      return {
        id: 'vip-hunt',
        label: 'WTF! de la Semaine',
        shortLabel: 'Hunt VIP',
        emoji: '👑',
        color: SUNDAY_GOLD,
        tagline: 'Débloque le WTF! légendaire de la semaine',
      }
    }
    const td = pickThemeOfDay(dayOfWeek)
    if (!td) return null
    return {
      id: td.categoryId || 'fallback',
      categoryId: td.categoryId,
      label: td.funName,
      shortLabel: td.funName,
      emoji: td.emoji,
      color: td.color,
      tagline: `Thème du jour : ${td.funName}`,
    }
  }, [sunday, dayOfWeek])

  // Dim : 1 VIP cible (seed ISO-week) + 4 Funny distracteurs (seed week+'-distractors')
  // Lun-sam : 5 Funny de la catégorie du jour (seed = dateStr)
  const { preparedFacts, vipTargetId } = useMemo(() => {
    if (sunday) {
      const vipPool = getVipFacts()
      if (!vipPool.length) return { preparedFacts: [], vipTargetId: null }
      const vipTarget = seededPick(vipPool, weekKey(), 1)[0]
      const funnyPool = getFunnyFacts().filter(f => f.id !== vipTarget.id)
      const distractors = seededPick(funnyPool, `${weekKey()}-distractors`, 4)
      // Ordre : insérer le VIP à une position seedée parmi les 5 (anti-déduction simple)
      const hashPos = hashString(weekKey()) % 5
      const ordered = [...distractors]
      ordered.splice(hashPos, 0, vipTarget)
      const final = ordered.slice(0, 5)
      return {
        preparedFacts: final.map(f => ({ ...f, ...getAnswerOptions(f, diff) })),
        vipTargetId: vipTarget.id,
      }
    }
    // Lun-sam
    const pool = theme?.categoryId ? getFunnyFactsByCategory(theme.categoryId) : getFunnyFacts()
    if (!pool.length) return { preparedFacts: [], vipTargetId: null }
    const picked = seededPick(pool, `${dateStr}-${theme?.id || ''}`, diff.questionsCount || 5)
    return {
      preparedFacts: picked.map(f => ({ ...f, ...getAnswerOptions(f, diff) })),
      vipTargetId: null,
    }
  }, [dateStr, diff, sunday, theme])

  // Phase : intro (si pas encore joué) → playing → done
  const [phase, setPhase] = useState(() => (initial?.done ? 'done' : 'intro'))
  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [flash, setFlash] = useState(null)
  const [coinsEarned, setCoinsEarned] = useState(initial?.coinsEarned ?? 0)
  const [vipUnlocked, setVipUnlocked] = useState(initial?.vipUnlocked ?? false)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [showQuit, setShowQuit] = useState(false)

  // Reset indices révélés à chaque nouvelle question
  useEffect(() => { setHintsUsed(0) }, [index])

  const useHint = useCallback((hintNum) => {
    if (profileHints <= 0) return
    setHintsUsed(h => Math.max(h, hintNum))
    applyCurrencyDelta?.({ hints: -1 }, 'flash_sunday_use_hint')
      ?.catch?.(e => console.warn('[Flash] hint debit failed:', e?.message || e))
  }, [profileHints, applyCurrencyDelta])

  const buyHint = useCallback(() => {
    applyCurrencyDelta?.({ coins: -HINT_COST, hints: 1 }, 'buy_hint_in_session')
      ?.catch?.(e => console.warn('[Flash] buy hint RPC failed:', e?.message || e))
  }, [applyCurrencyDelta])
  const flashTimer = useRef(null)

  useEffect(() => () => clearTimeout(flashTimer.current), [])

  const fact = preparedFacts[index]
  const themeColor = theme?.color || '#E91E63'
  const bg = sunday
    ? SUNDAY_BG
    : `linear-gradient(160deg, ${themeColor}22 0%, #0A1E2E 100%)`

  const advance = useCallback((isCorrect) => {
    if (isCorrect) setCorrect(c => c + 1)

    // Déblocage :
    // - Lun-sam : aucun déblocage (le joueur découvre mais ne collecte pas — spec)
    // - Dim : UNIQUEMENT si la question du VIP cible est correcte
    const isVipTargetQuestion = sunday && fact && fact.id === vipTargetId
    const shouldUnlock = isCorrect && isVipTargetQuestion
    let justUnlockedVip = false
    if (shouldUnlock && fact && setStorage) {
      justUnlockedVip = true
      setVipUnlocked(true)
      setStorage(prev => {
        const u = new Set(prev.unlockedFacts || [])
        u.add(fact.id)
        return { ...prev, unlockedFacts: u }
      })
      unlockFact?.(fact.id, fact.category, 'flash_hunt').catch(e =>
        console.warn('[Flash] unlockFact RPC failed:', e?.message || e)
      )
    }

    if (index + 1 >= preparedFacts.length) {
      const reward = sunday ? 0 : FLASH_REWARD
      if (reward > 0) {
        applyCurrencyDelta?.({ coins: reward }, 'flash_daily_complete').catch(e =>
          console.warn('[Flash] reward RPC failed:', e?.message || e)
        )
      }
      const finalCorrect = correct + (isCorrect ? 1 : 0)
      const state = {
        done: true,
        correctCount: finalCorrect,
        coinsEarned: reward,
        themeId: theme?.id,
        vipUnlocked: vipUnlocked || justUnlockedVip,
        vipTargetId: vipTargetId || null,
      }
      try { localStorage.setItem(storageKey, JSON.stringify(state)) } catch { /* ignore */ }
      setCoinsEarned(reward)
      setPhase('done')
    } else {
      setIndex(i => i + 1)
      setFlash(null)
    }
  }, [fact, index, preparedFacts.length, correct, setStorage, unlockFact, applyCurrencyDelta, storageKey, sunday, theme, vipTargetId, vipUnlocked])

  const handleAnswer = useCallback((answerIdx) => {
    if (flash !== null || !fact || phase !== 'playing') return
    const isCorrect = answerIdx === fact.correctIndex
    setFlash({ idx: answerIdx, correct: isCorrect })
    audio.play(isCorrect ? 'correct' : 'buzzer')
    flashTimer.current = setTimeout(() => advance(isCorrect), FLASH_DURATION)
  }, [flash, fact, phase, advance])

  const handleTimeout = useCallback(() => {
    if (flash !== null || !fact || phase !== 'playing') return
    setFlash({ idx: -1, correct: false })
    audio.play('buzzer')
    flashTimer.current = setTimeout(() => advance(false), FLASH_DURATION)
  }, [flash, fact, phase, advance])

  const handleStart = useCallback(() => {
    audio.play('correct')
    setPhase('playing')
  }, [])

  // ─── Pool vide / thème introuvable ─────────────────────────────────────────
  if ((!theme || !preparedFacts.length) && phase !== 'done') {
    return (
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: SUNDAY_BG, color: '#fff', fontFamily: 'Nunito, sans-serif', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔥</div>
          <p style={{ fontSize: 18, fontWeight: 900 }}>Flash indisponible</p>
          <p style={{ fontSize: 14, opacity: 0.7, marginTop: 8 }}>Reviens plus tard !</p>
          <button onClick={onHome} style={{ marginTop: 28, padding: '14px 36px', background: '#FF6B1A', color: '#fff', border: 'none', borderRadius: 16, fontWeight: 900, fontSize: 15, cursor: 'pointer' }}>Retour</button>
        </div>
      </div>
    )
  }

  // ─── Phase INTRO ───────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div
        className="absolute inset-0 flex flex-col"
        style={{ '--scale': scale, background: bg, color: '#fff', fontFamily: 'Nunito, sans-serif' }}
      >
        <div style={{ padding: S(16), display: 'flex', justifyContent: 'flex-start' }}>
          <button
            onClick={onHome}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: `${S(8)} ${S(16)}`, borderRadius: S(12), fontWeight: 700, fontSize: S(13), cursor: 'pointer' }}
          >
            ← Retour
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center" style={{ padding: S(24), textAlign: 'center' }}>
          <div style={{ fontSize: S(96), marginBottom: S(12), filter: `drop-shadow(0 4px 24px ${themeColor}aa)` }}>
            {theme.emoji}
          </div>
          <p style={{ fontSize: S(12), letterSpacing: 3, textTransform: 'uppercase', fontWeight: 800, opacity: 0.75, marginBottom: S(8) }}>
            {sunday ? '👑 Dimanche spécial' : 'Flash du jour'}
          </p>
          <h1 style={{ fontSize: S(32), fontWeight: 900, lineHeight: 1.1, margin: 0, color: themeColor, textShadow: `0 2px 20px ${themeColor}66` }}>
            {theme.label}
          </h1>
          <p style={{ fontSize: S(15), opacity: 0.85, marginTop: S(14), maxWidth: S(320), lineHeight: 1.5 }}>
            {sunday
              ? 'Un WTF! VIP à débloquer chaque dimanche. Pas de coins, mais un fact légendaire à ajouter à ta collection.'
              : `5 questions · 15 secondes chacune · ${FLASH_REWARD} coins à la clé si tu finis.`}
          </p>
          <div style={{ marginTop: S(28), display: 'flex', flexDirection: 'column', gap: S(12), width: '100%', maxWidth: S(320) }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', padding: `${S(12)} ${S(8)}`, background: 'rgba(255,255,255,0.08)', borderRadius: S(14), border: `1px solid ${themeColor}40` }}>
              <InfoPill label="Questions" value="5" />
              <InfoPill label="Timer" value="15s" />
              <InfoPill label="Gain" value={sunday ? '1 VIP' : `${FLASH_REWARD}c`} color={themeColor} />
            </div>
          </div>
        </div>
        <div style={{ padding: S(20), paddingBottom: S(32) }}>
          <button
            onClick={handleStart}
            className="btn-press"
            style={{
              width: '100%', padding: `${S(18)} 0`, borderRadius: S(20),
              background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)`,
              color: sunday ? '#1a1a2e' : '#fff',
              border: 'none', fontWeight: 900, fontSize: S(17),
              boxShadow: `0 8px 24px ${themeColor}55`,
              cursor: 'pointer', letterSpacing: 0.5,
            }}
          >
            {sunday ? '👑 Lancer la chasse' : "C'est parti !"}
          </button>
        </div>
      </div>
    )
  }

  // ─── Phase DONE ────────────────────────────────────────────────────────────
  if (phase === 'done') {
    const alreadyPlayed = initial?.done
    const targetId = initial?.vipTargetId || vipTargetId
    const wasVipUnlocked = initial?.vipUnlocked || vipUnlocked
    // Révélation VIP : retrouver la fact cible pour l'afficher (image + explication)
    const vipTargetFact = sunday && targetId
      ? getVipFacts().find(f => f.id === targetId)
      : null

    return (
      <div className="absolute inset-0 overflow-y-auto" style={{ background: bg, color: '#fff', fontFamily: 'Nunito, sans-serif' }}>
        <div style={{ padding: 24, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', maxWidth: 360, width: '100%' }}>
            <div style={{ fontSize: 72, marginBottom: 8, filter: `drop-shadow(0 4px 20px ${themeColor}aa)` }}>
              {theme?.emoji || '🔥'}
            </div>
            <p style={{ fontSize: 13, opacity: 0.7, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 800, color: themeColor }}>
              {theme?.label || 'Flash du jour'}
            </p>
            <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1, margin: '14px 0 16px' }}>
              {initial?.correctCount ?? correct}<span style={{ fontSize: 32, opacity: 0.5 }}>/{preparedFacts.length || 5}</span>
            </div>

            {!alreadyPlayed && coinsEarned > 0 && (
              <div style={{ marginBottom: 16 }}>
                <GainsBreakdown
                  items={[{ label: '🔥 Flash quotidien', value: `+${coinsEarned}` }]}
                  total={coinsEarned}
                  totalColor={themeColor}
                  textColor="#ffffff"
                />
              </div>
            )}

            {/* Révélation VIP (dimanche uniquement) — affichée qu'il soit débloqué ou non */}
            {sunday && vipTargetFact && (
              <div style={{
                marginTop: 8, marginBottom: 16,
                background: 'rgba(0,0,0,0.35)',
                border: `2px solid ${wasVipUnlocked ? SUNDAY_GOLD : 'rgba(255,255,255,0.15)'}`,
                borderRadius: 16, padding: 16, textAlign: 'left',
                boxShadow: wasVipUnlocked ? `0 0 32px ${SUNDAY_GOLD}44` : 'none',
              }}>
                <div style={{ textAlign: 'center', marginBottom: 10 }}>
                  <span style={{
                    fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
                    fontWeight: 900, color: wasVipUnlocked ? SUNDAY_GOLD : 'rgba(255,255,255,0.5)',
                  }}>
                    {wasVipUnlocked ? '👑 VIP DÉBLOQUÉ' : '🔒 VIP raté cette semaine'}
                  </span>
                </div>
                {(() => {
                  const vipCat = CATEGORIES.find(c => c.id === vipTargetFact.category)
                  const vipCatColor = vipCat?.color || '#1a3a5c'
                  return (
                    <div style={{
                      width: '100%', aspectRatio: '16 / 10',
                      borderRadius: 12, overflow: 'hidden', marginBottom: 10,
                      filter: wasVipUnlocked ? 'none' : 'blur(8px) brightness(0.6)',
                      background: vipCatColor,
                    }}>
                      {vipTargetFact.imageUrl ? (
                        <img
                          src={vipTargetFact.imageUrl}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      ) : (
                        <FallbackImage categoryColor={vipCatColor} />
                      )}
                    </div>
                  )
                })()}
                {wasVipUnlocked && vipTargetFact.explanation && (
                  <p style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.9, margin: 0 }}>
                    {vipTargetFact.explanation}
                  </p>
                )}
                {!wasVipUnlocked && (
                  <p style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.6, margin: 0, textAlign: 'center', fontStyle: 'italic' }}>
                    Le VIP reste verrouillé. Reviens dimanche prochain pour un nouveau WTF! de la semaine.
                  </p>
                )}
              </div>
            )}

            <p style={{ fontSize: 14, opacity: 0.75, marginBottom: 24 }}>
              {alreadyPlayed
                ? (sunday ? 'Tu as déjà chassé ton VIP cette semaine.' : 'Tu as déjà joué ton Flash aujourd\'hui. Reviens demain !')
                : (sunday ? 'Reviens lundi pour un nouveau Flash quotidien !' : 'Rendez-vous demain pour un nouveau thème !')}
            </p>
            <button onClick={onHome} style={{ padding: '14px 40px', background: '#FF6B1A', color: '#fff', border: 'none', borderRadius: 16, fontWeight: 900, fontSize: 15, cursor: 'pointer' }}>
              Retour
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Phase PLAYING ─────────────────────────────────────────────────────────
  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden"
      style={{ '--scale': scale, background: bg, fontFamily: 'Nunito, sans-serif' }}
    >
      {showQuit && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full rounded-3xl p-6 mx-4" style={{ background: '#FAFAF8', maxWidth: 360 }}>
            <div className="text-2xl text-center mb-3">{theme?.emoji || '🔥'}</div>
            <h2 className="font-black text-lg text-center mb-2" style={{ color: '#1a1a2e' }}>Quitter le Flash ?</h2>
            <p className="text-sm text-center mb-6" style={{ color: '#6B7280' }}>Ta session sera perdue et non rejouable aujourd'hui.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => setShowQuit(false)} className="w-full py-4 rounded-2xl font-black text-base" style={{ background: '#FF6B1A', color: 'white' }}>Continuer</button>
              <button onClick={() => { try { localStorage.setItem(storageKey, JSON.stringify({ done: true, correctCount: correct, coinsEarned: 0, themeId: theme?.id })) } catch { /* ignore */ } onHome() }} className="w-full py-3 rounded-2xl font-bold text-sm" style={{ background: '#F3F4F6', color: '#6B7280' }}>Quitter</button>
            </div>
          </div>
        </div>
      )}

      <GameHeader categoryLabel={theme?.shortLabel || 'Flash'} categoryColor={themeColor} onQuit={() => setShowQuit(true)} />

      {/* Bannière thème */}
      <div style={{
        margin: `${S(8)} ${S(12)} 0`,
        padding: `${S(8)} ${S(14)}`,
        borderRadius: S(12),
        background: `linear-gradient(90deg, ${themeColor}33, ${themeColor}11)`,
        border: `1px solid ${themeColor}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: S(8) }}>
          <span style={{ fontSize: S(18) }}>{theme?.emoji}</span>
          <span style={{ fontSize: S(12), fontWeight: 800, color: '#fff', letterSpacing: 0.5 }}>
            {theme?.tagline}
          </span>
        </div>
        <span style={{ fontSize: S(12), fontWeight: 800, color: themeColor }}>
          {index + 1}/{preparedFacts.length}
        </span>
      </div>

      <div className="flex-1 flex flex-col px-4 pb-4 min-h-0" style={{ gap: S(12), paddingTop: S(10) }}>
        <div className="rounded-3xl flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,0.32)', minHeight: S(110), flex: '0 0 auto', border: `1px solid ${themeColor}22` }}>
          <p style={{ color: '#ffffff', fontSize: S(16), fontWeight: 800, textAlign: 'center', lineHeight: 1.4 }}>
            {renderFormattedText(fact.question)}
          </p>
        </div>

        {/* Indices — dimanche uniquement · 2 max · stock perso (achat 50c si vide) */}
        {sunday && (fact.hint1 || fact.hint2) && (
          <div style={{ display: 'flex', gap: S(8), justifyContent: 'center', flexShrink: 0 }}>
            {[fact.hint1, fact.hint2].filter(Boolean).slice(0, 2).map((h, i) => {
              const n = i + 1
              const canUse = profileHints > 0 || hintsUsed >= n
              const canAfford = canUse || ((profileCoins ?? 0) >= HINT_COST)
              return (
                <HintFlipButton
                  key={`${fact.id}-h${n}`}
                  num={n}
                  hint={h}
                  catColor={themeColor}
                  isFree={false}
                  cost={HINT_COST}
                  canAfford={canAfford}
                  canUse={canUse}
                  initialRevealed={hintsUsed >= n}
                  onReveal={() => useHint(n)}
                  onBuyHint={buyHint}
                />
              )
            })}
          </div>
        )}

        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: S(56), height: S(56) }}>
            <CircularTimer
              key={`flash-${index}`}
              size={56}
              duration={diff.duration || 15}
              onTimeout={handleTimeout}
            />
          </div>
        </div>

        <div className="flex-1 flex items-center">
          <div style={{ display: 'flex', flexDirection: 'column', gap: S(10), width: '100%' }}>
            {fact.options.map((opt, i) => {
              const isFlashed = flash?.idx === i
              const isAnswer = i === fact.correctIndex
              let btnBg = 'rgba(255,255,255,0.15)'
              let btnBorder = `${themeColor}55`
              if (flash) {
                if (isFlashed && flash.correct) { btnBg = 'rgba(34,197,94,0.4)'; btnBorder = '#22C55E' }
                else if (isFlashed && !flash.correct) { btnBg = 'rgba(239,68,68,0.4)'; btnBorder = '#EF4444' }
                else if (isAnswer && !flash.correct) { btnBg = 'rgba(34,197,94,0.25)'; btnBorder = '#22C55E' }
              }
              return (
                <button
                  key={`${index}-${i}`}
                  onClick={() => handleAnswer(i)}
                  disabled={flash !== null}
                  className="rounded-2xl text-left transition-all active:scale-[0.98]"
                  style={{
                    background: btnBg, border: `2px solid ${btnBorder}`,
                    padding: `${S(14)} ${S(18)}`, borderRadius: S(14),
                    opacity: flash && !isFlashed && !(isAnswer && !flash.correct) ? 0.5 : 1,
                    transition: 'all 0.15s ease',
                    color: '#ffffff', fontSize: S(14), fontWeight: 700,
                  }}
                >
                  {renderFormattedText(opt)}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoPill({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.6, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2, color: color || '#fff' }}>{value}</div>
    </div>
  )
}
