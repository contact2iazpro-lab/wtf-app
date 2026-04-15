// FlashScreen — Rendez-vous quotidien (CLAUDE.md 15/04/2026)
// Lun-sam : 5 questions Funny thème du jour · 2 QCM · 15s · 30 coins fixe
// Dimanche : 5 questions VIP Hunt de la semaine · 0 coins · déblocage VIPs
// Phases : intro → playing → done · Gratuit 1×/jour
import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { getFunnyFactsByCategory, getVipFacts, getPlayableCategories } from '../data/factsService'
import { getAnswerOptions } from '../utils/answers'
import { DIFFICULTY_LEVELS } from '../constants/gameConfig'
import { usePlayerProfile } from '../hooks/usePlayerProfile'
import { audio } from '../utils/audio'
import { useScale } from '../hooks/useScale'
import GameHeader from '../components/GameHeader'
import CircularTimer from '../components/CircularTimer'
import GainsBreakdown from '../components/results/GainsBreakdown'
import renderFormattedText from '../utils/renderFormattedText'

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

// Rotation thématique : pick une catégorie du jour avec ≥5 funny facts
function pickThemeOfDay(dateStr) {
  const cats = getPlayableCategories()
  const eligible = cats.filter(c => {
    const pool = getFunnyFactsByCategory(c.id)
    return pool.length >= 5
  })
  if (!eligible.length) return null
  const h = hashString(dateStr)
  return eligible[h % eligible.length]
}

export default function FlashScreen({ onHome, setStorage }) {
  const scale = useScale()
  const S = (px) => `calc(${px}px * var(--scale))`
  const { applyCurrencyDelta, unlockFact } = usePlayerProfile()
  const diff = DIFFICULTY_LEVELS.FLASH
  const dateStr = todayKey()
  const sunday = isSunday()
  const storageKey = STORAGE_KEY_PREFIX + dateStr

  const initial = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || 'null') } catch { return null }
  }, [storageKey])

  // Thème du jour — catégorie Funny ou VIP Hunt le dimanche
  const theme = useMemo(() => {
    if (sunday) {
      return {
        id: 'vip-hunt',
        label: 'VIP Hunt de la semaine',
        shortLabel: 'VIP Hunt',
        emoji: '👑',
        color: SUNDAY_GOLD,
        tagline: 'Chasse au WTF! légendaire',
      }
    }
    const cat = pickThemeOfDay(dateStr)
    if (!cat) return null
    return {
      id: cat.id,
      label: cat.label,
      shortLabel: cat.label,
      emoji: cat.emoji || '🔥',
      color: cat.color || '#E91E63',
      tagline: `Thème du jour : ${cat.label}`,
    }
  }, [sunday, dateStr])

  const preparedFacts = useMemo(() => {
    const pool = sunday ? getVipFacts() : (theme ? getFunnyFactsByCategory(theme.id) : [])
    if (!pool.length) return []
    const seed = sunday ? weekKey() : `${dateStr}-${theme?.id || ''}`
    const picked = seededPick(pool, seed, diff.questionsCount || 5)
    return picked.map(f => ({ ...f, ...getAnswerOptions(f, diff) }))
  }, [dateStr, diff, sunday, theme])

  // Phase : intro (si pas encore joué) → playing → done
  const [phase, setPhase] = useState(() => (initial?.done ? 'done' : 'intro'))
  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [flash, setFlash] = useState(null)
  const [coinsEarned, setCoinsEarned] = useState(initial?.coinsEarned ?? 0)
  const [showQuit, setShowQuit] = useState(false)
  const flashTimer = useRef(null)

  useEffect(() => () => clearTimeout(flashTimer.current), [])

  const fact = preparedFacts[index]
  const themeColor = theme?.color || '#E91E63'
  const bg = sunday
    ? SUNDAY_BG
    : `linear-gradient(160deg, ${themeColor}22 0%, #0A1E2E 100%)`

  const advance = useCallback((isCorrect) => {
    if (isCorrect) setCorrect(c => c + 1)
    if (fact && isCorrect && setStorage) {
      setStorage(prev => {
        const u = new Set(prev.unlockedFacts || [])
        u.add(fact.id)
        return { ...prev, unlockedFacts: u }
      })
      unlockFact?.(fact.id, fact.category, 'flash_daily').catch(e =>
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
      const state = { done: true, correctCount: finalCorrect, coinsEarned: reward, themeId: theme?.id }
      try { localStorage.setItem(storageKey, JSON.stringify(state)) } catch { /* ignore */ }
      setCoinsEarned(reward)
      setPhase('done')
    } else {
      setIndex(i => i + 1)
      setFlash(null)
    }
  }, [fact, index, preparedFacts.length, correct, setStorage, unlockFact, applyCurrencyDelta, storageKey, sunday, theme])

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
    return (
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: bg, color: '#fff', fontFamily: 'Nunito, sans-serif', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 340 }}>
          <div style={{ fontSize: 84, marginBottom: 8, filter: `drop-shadow(0 4px 20px ${themeColor}aa)` }}>
            {theme?.emoji || '🔥'}
          </div>
          <p style={{ fontSize: 13, opacity: 0.7, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 800, color: themeColor }}>
            {theme?.label || 'Flash du jour'}
          </p>
          <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 1, margin: '14px 0 20px' }}>
            {initial?.correctCount ?? correct}<span style={{ fontSize: 36, opacity: 0.5 }}>/{preparedFacts.length || 5}</span>
          </div>
          {!alreadyPlayed && coinsEarned > 0 && (
            <div style={{ marginBottom: 20 }}>
              <GainsBreakdown
                items={[{ label: '🔥 Flash quotidien', value: `+${coinsEarned}` }]}
                total={coinsEarned}
                totalColor={themeColor}
                textColor="#ffffff"
              />
            </div>
          )}
          {!alreadyPlayed && sunday && (
            <p style={{ fontSize: 13, opacity: 0.9, marginBottom: 20, color: SUNDAY_GOLD, fontWeight: 800 }}>
              👑 VIPs de la semaine débloqués dans ta collection !
            </p>
          )}
          <p style={{ fontSize: 14, opacity: 0.75, marginBottom: 28 }}>
            {alreadyPlayed
              ? (sunday ? 'Tu as déjà chassé ton VIP cette semaine.' : 'Tu as déjà joué ton Flash aujourd\'hui. Reviens demain !')
              : (sunday ? 'Reviens lundi pour un nouveau Flash quotidien !' : 'Rendez-vous demain pour un nouveau thème !')}
          </p>
          <button onClick={onHome} style={{ padding: '14px 40px', background: '#FF6B1A', color: '#fff', border: 'none', borderRadius: 16, fontWeight: 900, fontSize: 15, cursor: 'pointer' }}>
            Retour
          </button>
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
