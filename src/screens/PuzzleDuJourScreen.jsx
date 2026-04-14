import { useState, useMemo } from 'react'
import { getGeneratedFacts } from '../data/factsService'
import { getAnswerOptions } from '../utils/answers'
import { DIFFICULTY_LEVELS } from '../constants/gameConfig'
import { usePlayerProfile } from '../hooks/usePlayerProfile'
import { audio } from '../utils/audio'

const STORAGE_KEY_PREFIX = 'wtf_puzzle_'

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function dailyHash(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0
  return h
}

export default function PuzzleDuJourScreen({ onHome, setStorage }) {
  const { applyCurrencyDelta, unlockFact } = usePlayerProfile()
  const dateStr = todayKey()
  const storageKey = STORAGE_KEY_PREFIX + dateStr

  const initial = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || 'null') } catch { return null }
  }, [storageKey])

  const fact = useMemo(() => {
    const pool = getGeneratedFacts()
    if (!pool.length) return null
    return pool[dailyHash(dateStr) % pool.length]
  }, [dateStr])

  const { options, correctIndex } = useMemo(() => {
    if (!fact) return { options: [], correctIndex: 0 }
    return getAnswerOptions(fact, DIFFICULTY_LEVELS.FLASH)
  }, [fact])

  const [attemptsLeft, setAttemptsLeft] = useState(initial?.attemptsLeft ?? 3)
  const [eliminated, setEliminated] = useState(new Set(initial?.eliminated || []))
  const [done, setDone] = useState(initial?.done ?? false)
  const [won, setWon] = useState(initial?.won ?? false)
  const [coinsEarned, setCoinsEarned] = useState(initial?.coinsEarned ?? 0)

  const persist = (state) => {
    try { localStorage.setItem(storageKey, JSON.stringify(state)) } catch { /* ignore */ }
  }

  const handleChoice = (idx) => {
    if (done || eliminated.has(idx)) return
    audio.play('click')
    if (idx === correctIndex) {
      // B4.11 — Puzzle 6/4/2 → 5/3/1 (cible F2P 30-50/j)
      const gain = attemptsLeft === 3 ? 5 : attemptsLeft === 2 ? 3 : 1
      applyCurrencyDelta?.({ coins: gain }, `puzzle_du_jour_attempt_${attemptsLeft}`)?.catch?.(e =>
        console.warn('[PuzzleDuJour] reward RPC failed:', e?.message || e)
      )
      if (setStorage && fact) {
        setStorage(prev => {
          const u = new Set(prev.unlockedFacts || [])
          u.add(fact.id)
          return { ...prev, unlockedFacts: u }
        })
        // Phase A.7 : miroir Supabase
        unlockFact?.(fact.id, fact.category, `puzzle_du_jour_attempt_${attemptsLeft}`).catch(e =>
          console.warn('[PuzzleDuJour] unlockFact RPC failed:', e?.message || e)
        )
      }
      setDone(true); setWon(true); setCoinsEarned(gain)
      audio.play('correct')
      persist({ attemptsLeft, eliminated: [...eliminated], done: true, won: true, coinsEarned: gain })
    } else {
      const nextElim = new Set(eliminated); nextElim.add(idx)
      const nextAttempts = attemptsLeft - 1
      setEliminated(nextElim)
      setAttemptsLeft(nextAttempts)
      audio.play('wrong')
      if (nextAttempts === 0) {
        setDone(true); setWon(false)
        persist({ attemptsLeft: 0, eliminated: [...nextElim], done: true, won: false, coinsEarned: 0 })
      } else {
        persist({ attemptsLeft: nextAttempts, eliminated: [...nextElim], done: false, won: false, coinsEarned: 0 })
      }
    }
  }

  const handleShare = () => {
    const greens = won ? 3 - (3 - attemptsLeft) : 0
    const reds = won ? 3 - attemptsLeft : 3
    const squares = '🟩'.repeat(greens) + '🟥'.repeat(reds)
    const text = `Puzzle WTF! ${dateStr}\n${squares}\nhttps://wtf-app-production.up.railway.app/`
    if (navigator.share) navigator.share({ text }).catch(() => {})
    else navigator.clipboard?.writeText(text)
  }

  if (!fact) {
    return (
      <div style={{ padding: 20, color: '#fff' }}>
        <button onClick={onHome} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>← Retour</button>
        <p>Pas de puzzle disponible.</p>
      </div>
    )
  }

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      background: 'linear-gradient(160deg, #2E1A47 0%, #1a0f2e 100%)',
      color: '#fff', fontFamily: 'Nunito, sans-serif',
      display: 'flex', flexDirection: 'column', padding: 20, gap: 14, overflow: 'auto',
    }}>
      <button onClick={onHome} style={{
        background: 'none', border: 'none', color: '#fff', fontSize: 20,
        textAlign: 'left', cursor: 'pointer', padding: 0, alignSelf: 'flex-start',
      }}>← Retour</button>

      <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, textAlign: 'center' }}>🧩 Puzzle du Jour</h1>
      <div style={{ textAlign: 'center', opacity: 0.7, fontSize: 12 }}>{dateStr}</div>

      <div style={{
        background: 'rgba(255,255,255,0.08)', padding: 18, borderRadius: 14,
        fontSize: 16, lineHeight: 1.45, textAlign: 'center', minHeight: 90,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1.5px solid rgba(255,255,255,0.15)',
      }}>
        {fact.fact || fact.titre || fact.question || 'Devine la réponse'}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 4 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 32, height: 10, borderRadius: 5,
            background: i < attemptsLeft ? '#FF6B1A' : 'rgba(255,255,255,0.15)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        {options.map((opt, i) => {
          const isElim = eliminated.has(i)
          const isCorrect = done && i === correctIndex
          return (
            <button
              key={i}
              onClick={() => handleChoice(i)}
              disabled={isElim || done}
              style={{
                background: isCorrect ? '#6BCB77' : isElim ? 'rgba(255,100,100,0.15)' : 'rgba(255,255,255,0.12)',
                border: `1.5px solid ${isCorrect ? '#6BCB77' : isElim ? 'rgba(255,100,100,0.35)' : 'rgba(255,255,255,0.25)'}`,
                borderRadius: 12, padding: '14px 16px',
                color: '#fff', fontSize: 15, fontWeight: 700,
                fontFamily: 'Nunito, sans-serif',
                cursor: isElim || done ? 'default' : 'pointer',
                textAlign: 'left',
                opacity: isElim ? 0.4 : 1,
                textDecoration: isElim ? 'line-through' : 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {opt}
            </button>
          )
        })}
      </div>

      {done && (
        <div style={{
          marginTop: 10,
          background: 'rgba(255,255,255,0.08)', padding: 16, borderRadius: 12,
          textAlign: 'center',
          border: '1.5px solid rgba(255,255,255,0.15)',
        }}>
          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 6 }}>
            {won ? `🎉 Bravo ! +${coinsEarned} coins` : '😢 Raté — reviens demain !'}
          </div>
          {fact.explication && (
            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 12, lineHeight: 1.4 }}>{fact.explication}</div>
          )}
          <button onClick={handleShare} style={{
            background: '#FF6B1A', border: 'none', borderRadius: 10, padding: '10px 20px',
            color: '#fff', fontWeight: 800, fontFamily: 'Nunito, sans-serif', cursor: 'pointer', fontSize: 14,
          }}>
            📤 Partager
          </button>
        </div>
      )}
    </div>
  )
}
