// FlashScreen — Rendez-vous quotidien (CLAUDE.md 15/04/2026)
// Lun-sam : 5 questions Funny · 2 QCM · 15s · 30 coins fixe sur complétion
// Dimanche : 5 questions VIP Hunt de la semaine · 0 coins · déblocage VIPs
// Gratuit 1×/jour — seed stable (par date en semaine, par semaine le dimanche)
import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { getFunnyFacts, getVipFacts } from '../data/factsService'
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

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

// Dimanche = VIP Hunt hebdomadaire (seed stable toute la semaine via l'année + numéro de semaine ISO)
function isSunday() {
  return new Date().getDay() === 0
}

function weekKey() {
  const d = new Date()
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = tmp.getUTCDay() || 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7)
  return `${tmp.getUTCFullYear()}-W${weekNo}`
}

function seededPick(pool, dateStr, count) {
  let h = 5381
  for (let i = 0; i < dateStr.length; i++) h = ((h << 5) + h + dateStr.charCodeAt(i)) >>> 0
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

  const preparedFacts = useMemo(() => {
    const pool = sunday ? getVipFacts() : getFunnyFacts()
    if (!pool.length) return []
    const seed = sunday ? weekKey() : dateStr
    const picked = seededPick(pool, seed, diff.questionsCount || 5)
    return picked.map(f => ({ ...f, ...getAnswerOptions(f, diff) }))
  }, [dateStr, diff, sunday])

  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [flash, setFlash] = useState(null)
  const [done, setDone] = useState(initial?.done ?? false)
  const [coinsEarned, setCoinsEarned] = useState(initial?.coinsEarned ?? 0)
  const [showQuit, setShowQuit] = useState(false)
  const flashTimer = useRef(null)

  useEffect(() => () => clearTimeout(flashTimer.current), [])

  const fact = preparedFacts[index]

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
      const state = { done: true, correctCount: finalCorrect, coinsEarned: reward }
      try { localStorage.setItem(storageKey, JSON.stringify(state)) } catch { /* ignore */ }
      setCoinsEarned(reward)
      setDone(true)
    } else {
      setIndex(i => i + 1)
      setFlash(null)
    }
  }, [fact, index, preparedFacts.length, correct, setStorage, unlockFact, applyCurrencyDelta, storageKey, sunday])

  const handleAnswer = useCallback((answerIdx) => {
    if (flash !== null || !fact || done) return
    const isCorrect = answerIdx === fact.correctIndex
    setFlash({ idx: answerIdx, correct: isCorrect })
    audio.play(isCorrect ? 'correct' : 'buzzer')
    flashTimer.current = setTimeout(() => advance(isCorrect), FLASH_DURATION)
  }, [flash, fact, done, advance])

  const handleTimeout = useCallback(() => {
    if (flash !== null || !fact || done) return
    setFlash({ idx: -1, correct: false })
    audio.play('buzzer')
    flashTimer.current = setTimeout(() => advance(false), FLASH_DURATION)
  }, [flash, fact, done, advance])

  // Pool vide
  if (!fact && !done) {
    return (
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #2E1A47 0%, #1a0f2e 100%)', color: '#fff', fontFamily: 'Nunito, sans-serif', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔥</div>
          <p style={{ fontSize: 18, fontWeight: 900 }}>Flash indisponible</p>
          <button onClick={onHome} style={{ marginTop: 28, padding: '14px 36px', background: '#FF6B1A', color: '#fff', border: 'none', borderRadius: 16, fontWeight: 900, fontSize: 15, cursor: 'pointer' }}>Retour</button>
        </div>
      </div>
    )
  }

  // Écran fin (déjà joué aujourd'hui ou complété)
  if (done) {
    const alreadyPlayed = initial?.done
    return (
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #2E1A47 0%, #1a0f2e 100%)', color: '#fff', fontFamily: 'Nunito, sans-serif', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 340 }}>
          <div style={{ fontSize: 72, marginBottom: 8 }}>{sunday ? '👑' : '🔥'}</div>
          <p style={{ fontSize: 14, opacity: 0.7, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>{sunday ? 'VIP Hunt de la semaine' : 'Flash du jour'}</p>
          <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 1, margin: '12px 0 20px' }}>
            {initial?.correctCount ?? correct}<span style={{ fontSize: 36, opacity: 0.5 }}>/{preparedFacts.length || 5}</span>
          </div>
          {!alreadyPlayed && coinsEarned > 0 && (
            <div style={{ marginBottom: 20 }}>
              <GainsBreakdown
                items={[{ label: '🔥 Flash quotidien', value: `+${coinsEarned}` }]}
                total={coinsEarned}
                totalColor="#FFD700"
                textColor="#ffffff"
              />
            </div>
          )}
          {!alreadyPlayed && sunday && (
            <p style={{ fontSize: 13, opacity: 0.85, marginBottom: 20, color: '#FFD700', fontWeight: 700 }}>
              👑 VIPs de la semaine débloqués dans ta collection !
            </p>
          )}
          <p style={{ fontSize: 14, opacity: 0.75, marginBottom: 28 }}>
            {alreadyPlayed
              ? (sunday ? 'Tu as déjà chassé ton VIP cette semaine.' : 'Tu as déjà joué ton Flash aujourd\'hui. Reviens demain !')
              : (sunday ? 'Reviens lundi pour un nouveau Flash quotidien !' : 'Rendez-vous demain pour un nouveau Flash !')}
          </p>
          <button onClick={onHome} style={{ padding: '14px 40px', background: '#FF6B1A', color: '#fff', border: 'none', borderRadius: 16, fontWeight: 900, fontSize: 15, cursor: 'pointer' }}>
            Retour
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden"
      style={{ '--scale': scale, background: 'linear-gradient(160deg, #2E1A47 0%, #1a0f2e 100%)', fontFamily: 'Nunito, sans-serif' }}
    >
      {showQuit && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full rounded-3xl p-6 mx-4" style={{ background: '#FAFAF8', maxWidth: 360 }}>
            <div className="text-2xl text-center mb-3">🔥</div>
            <h2 className="font-black text-lg text-center mb-2" style={{ color: '#1a1a2e' }}>Quitter le Flash ?</h2>
            <p className="text-sm text-center mb-6" style={{ color: '#6B7280' }}>Ta session sera perdue et non rejouable aujourd'hui.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => setShowQuit(false)} className="w-full py-4 rounded-2xl font-black text-base" style={{ background: '#FF6B1A', color: 'white' }}>Continuer</button>
              <button onClick={() => { try { localStorage.setItem(storageKey, JSON.stringify({ done: true, correctCount: correct, coinsEarned: 0 })) } catch { /* ignore */ } onHome() }} className="w-full py-3 rounded-2xl font-bold text-sm" style={{ background: '#F3F4F6', color: '#6B7280' }}>Quitter</button>
            </div>
          </div>
        </div>
      )}

      <GameHeader categoryLabel={sunday ? 'VIP Hunt' : 'Flash du jour'} categoryColor={sunday ? '#FFD700' : '#E91E63'} onQuit={() => setShowQuit(true)} />

      <div style={{ textAlign: 'center', padding: `${S(12)} 0 ${S(4)}`, flexShrink: 0 }}>
        <div style={{ fontSize: S(14), fontWeight: 800, color: 'rgba(255,255,255,0.7)', letterSpacing: 1 }}>
          {index + 1} / {preparedFacts.length}
        </div>
      </div>

      <div className="flex-1 flex flex-col px-4 pb-4 min-h-0" style={{ gap: S(12) }}>
        <div className="rounded-3xl flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,0.28)', minHeight: S(110), flex: '0 0 auto' }}>
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
              let btnBorder = 'rgba(255,255,255,0.2)'
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
