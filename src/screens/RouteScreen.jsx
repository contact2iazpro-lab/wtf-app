import { useState, useRef, useEffect } from 'react'
import { getGeneratedFacts, getVipFacts } from '../data/factsService'
import { getAnswerOptions } from '../utils/answers'
import { DIFFICULTY_LEVELS } from '../constants/gameConfig'
import { updateCoins } from '../services/currencyService'
import { usePlayerProfile } from '../hooks/usePlayerProfile'
import { audio } from '../utils/audio'

function readRouteState() {
  try {
    const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    return wd.route || { level: 1, stars: {} }
  } catch { return { level: 1, stars: {} } }
}

function writeRouteState(state) {
  try {
    const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    wd.route = state
    wd.lastModified = Date.now()
    localStorage.setItem('wtf_data', JSON.stringify(wd))
  } catch { /* ignore */ }
}

const isBossLevel = (n) => n % 10 === 0

function buildLevelSession(level) {
  if (isBossLevel(level)) {
    const vip = getVipFacts()
    if (!vip.length) return null
    const fact = vip[Math.floor(Math.random() * vip.length)]
    const prepped = { ...fact, ...getAnswerOptions(fact, DIFFICULTY_LEVELS.HOT) }
    return { facts: [prepped], boss: true }
  }
  const funny = getGeneratedFacts()
  if (funny.length < 3) return null
  const shuffled = [...funny].sort(() => Math.random() - 0.5).slice(0, 3)
  const prepped = shuffled.map(f => ({ ...f, ...getAnswerOptions(f, DIFFICULTY_LEVELS.FLASH) }))
  return { facts: prepped, boss: false }
}

export default function RouteScreen({ onHome, setStorage }) {
  const { applyCurrencyDelta, unlockFact, mergeFlags } = usePlayerProfile()
  const [state, setState] = useState(readRouteState)
  const [session, setSession] = useState(null)
  const [qIndex, setQIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [selected, setSelected] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const mapRef = useRef(null)

  useEffect(() => {
    if (mapRef.current && !session) {
      const el = mapRef.current.querySelector('[data-current="true"]')
      el?.scrollIntoView({ block: 'center', behavior: 'instant' })
    }
  }, [session, state.level])

  const launchLevel = () => {
    audio.play('click')
    const s = buildLevelSession(state.level)
    if (!s) return
    setSession(s); setQIndex(0); setCorrectCount(0); setSelected(null); setShowResult(false)
  }

  const handleAnswer = (idx) => {
    if (selected !== null) return
    setSelected(idx)
    const fact = session.facts[qIndex]
    const isCorrect = idx === fact.correctIndex
    if (isCorrect) { setCorrectCount(c => c + 1); audio.play('correct') } else audio.play('wrong')
    setTimeout(() => {
      if (qIndex + 1 < session.facts.length) {
        setQIndex(q => q + 1); setSelected(null)
      } else {
        const finalCorrect = correctCount + (isCorrect ? 1 : 0)
        const perfect = finalCorrect === session.facts.length
        if (perfect) {
          const coins = session.boss ? 20 : 6
          updateCoins(coins)
          applyCurrencyDelta?.({ coins }, session.boss ? 'route_boss_cleared' : 'route_level_cleared').catch(e =>
            console.warn('[RouteScreen] reward RPC failed:', e?.message || e)
          )
          if (setStorage) {
            setStorage(prev => {
              const u = new Set(prev.unlockedFacts || [])
              session.facts.forEach(f => u.add(f.id))
              return { ...prev, unlockedFacts: u }
            })
          }
          // Phase A.7 : miroir unlock_fact pour chaque fact du niveau
          session.facts.forEach(f => {
            unlockFact?.(f.id, f.category, session.boss ? 'route_boss_unlock' : 'route_level_unlock').catch(e =>
              console.warn('[RouteScreen] unlockFact RPC failed:', e?.message || e)
            )
          })
          const nextState = {
            level: state.level + 1,
            stars: { ...state.stars, [state.level]: 3 },
          }
          writeRouteState(nextState); setState(nextState)
          // A.9.4 — miroir Supabase pour route progress
          mergeFlags?.({ route: nextState }).catch(e =>
            console.warn('[RouteScreen] route mergeFlags failed:', e?.message || e)
          )
        }
        setShowResult(true)
      }
    }, 900)
  }

  // ── Vue carte ─────────────────────────────────────────────────────────
  if (!session) {
    const levels = []
    const start = Math.max(1, state.level - 4)
    for (let n = start; n < start + 30; n++) levels.push(n)
    return (
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        background: 'linear-gradient(160deg, #1a0f2e 0%, #2E1A47 100%)',
        color: '#fff', fontFamily: 'Nunito, sans-serif',
        display: 'flex', flexDirection: 'column', padding: '20px 20px 10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <button onClick={onHome} style={{
            background: 'none', border: 'none', color: '#fff', fontSize: 20,
            cursor: 'pointer', padding: 0,
          }}>←</button>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, flex: 1, textAlign: 'center' }}>🗺️ Route WTF!</h1>
          <div style={{ width: 20 }} />
        </div>
        <div style={{ textAlign: 'center', opacity: 0.7, fontSize: 12, marginBottom: 10 }}>
          Niveau actuel : <b style={{ color: '#FF6B1A' }}>{state.level}</b>
          {isBossLevel(state.level) && ' · ⭐ BOSS'}
        </div>

        <div ref={mapRef} style={{
          flex: 1, overflowY: 'auto',
          display: 'flex', flexDirection: 'column-reverse',
          gap: 14, padding: '20px 0',
        }}>
          {levels.map(n => {
            const isDone = state.stars[n] > 0
            const isCurrent = n === state.level
            const isLocked = n > state.level
            const boss = isBossLevel(n)
            const side = n % 2 === 0 ? 'flex-end' : 'flex-start'
            return (
              <div key={n} data-current={isCurrent ? 'true' : 'false'} style={{
                display: 'flex', justifyContent: side, width: '100%',
              }}>
                <button
                  onClick={() => isCurrent && launchLevel()}
                  disabled={!isCurrent}
                  style={{
                    width: '68%',
                    background: isCurrent
                      ? (boss ? '#E84535' : '#FF6B1A')
                      : isDone
                        ? 'rgba(107,203,119,0.25)'
                        : 'rgba(255,255,255,0.06)',
                    border: `2px solid ${isCurrent ? '#fff' : isDone ? '#6BCB77' : 'rgba(255,255,255,0.12)'}`,
                    borderRadius: 16, padding: '16px 18px',
                    color: '#fff', fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 15,
                    cursor: isCurrent ? 'pointer' : 'default',
                    opacity: isLocked ? 0.35 : 1,
                    animation: isCurrent ? 'pulse 1.5s ease-in-out infinite' : 'none',
                    textAlign: 'center',
                    boxShadow: isCurrent ? '0 4px 20px rgba(255,107,26,0.4)' : 'none',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {boss ? '⭐ BOSS · ' : ''}Niveau {n} {isDone ? ' ✓' : ''}
                </button>
              </div>
            )
          })}
        </div>
        <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }`}</style>
      </div>
    )
  }

  // ── Vue résultat ──────────────────────────────────────────────────────
  if (showResult) {
    const perfect = correctCount === session.facts.length
    return (
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        background: 'linear-gradient(160deg, #1a0f2e 0%, #2E1A47 100%)',
        color: '#fff', fontFamily: 'Nunito, sans-serif',
        display: 'flex', flexDirection: 'column', padding: 20,
        justifyContent: 'center', alignItems: 'center', gap: 20,
      }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0, textAlign: 'center' }}>
          {perfect ? (session.boss ? '👑 BOSS vaincu !' : '🎉 Niveau réussi !') : '😢 Raté'}
        </h1>
        <div style={{ fontSize: 20 }}>{correctCount} / {session.facts.length}</div>
        {perfect && <div style={{ fontSize: 16, opacity: 0.9, color: '#FFD700' }}>+{session.boss ? 20 : 6} coins</div>}
        {!perfect && <div style={{ fontSize: 13, opacity: 0.7, textAlign: 'center', maxWidth: 260 }}>Réessaie pour débloquer le niveau suivant.</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button onClick={() => { setSession(null) }} style={{
            background: '#FF6B1A', border: 'none', borderRadius: 10, padding: '12px 22px',
            color: '#fff', fontWeight: 800, fontFamily: 'Nunito, sans-serif', cursor: 'pointer', fontSize: 14,
          }}>{perfect ? 'Continuer' : 'Carte'}</button>
          <button onClick={onHome} style={{
            background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 10, padding: '12px 22px',
            color: '#fff', fontWeight: 800, fontFamily: 'Nunito, sans-serif', cursor: 'pointer', fontSize: 14,
          }}>Accueil</button>
        </div>
      </div>
    )
  }

  // ── Vue session ──────────────────────────────────────────────────────
  const fact = session.facts[qIndex]
  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      background: session.boss
        ? 'linear-gradient(160deg, #4a0e1a 0%, #2E1A47 100%)'
        : 'linear-gradient(160deg, #1a0f2e 0%, #2E1A47 100%)',
      color: '#fff', fontFamily: 'Nunito, sans-serif',
      display: 'flex', flexDirection: 'column', padding: 20, gap: 14,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setSession(null)} style={{
          background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', padding: 0,
        }}>←</button>
        <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 700 }}>
          {session.boss ? '⭐ BOSS' : `Niveau ${state.level}`} · Q{qIndex + 1}/{session.facts.length}
        </div>
        <div style={{ width: 20 }} />
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.08)', padding: 18, borderRadius: 14,
        fontSize: 16, lineHeight: 1.45, textAlign: 'center', minHeight: 110,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1.5px solid rgba(255,255,255,0.15)',
      }}>
        {fact.fact || fact.titre || fact.question || 'Question'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {fact.options.map((opt, i) => {
          const isSel = selected === i
          const revealed = selected !== null
          const isTheCorrect = revealed && i === fact.correctIndex
          const isWrong = isSel && !isTheCorrect
          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={revealed}
              style={{
                background: isTheCorrect ? '#6BCB77' : isWrong ? '#E84535' : 'rgba(255,255,255,0.12)',
                border: `1.5px solid ${isTheCorrect ? '#6BCB77' : isWrong ? '#E84535' : 'rgba(255,255,255,0.25)'}`,
                borderRadius: 12, padding: '14px 16px',
                color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: 'Nunito, sans-serif',
                cursor: revealed ? 'default' : 'pointer', textAlign: 'left',
                WebkitTapHighlightColor: 'transparent',
                transition: 'background 0.2s, border-color 0.2s',
              }}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}
