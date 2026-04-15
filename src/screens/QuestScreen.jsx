import { useState, useRef, useEffect, useMemo } from 'react'
import { getFunnyFacts, getVipFacts } from '../data/factsService'
import { getAnswerOptions } from '../utils/answers'
import { usePlayerProfile } from '../hooks/usePlayerProfile'
import { audio } from '../utils/audio'
import { getSnackEnergy, consumeSnackEnergy } from '../services/energyService'
import GainsBreakdown from '../components/results/GainsBreakdown'

// ── Constantes Quest (spec 15/04/2026) ──────────────────────────────────────
const QUEST_MAX_LEVEL = 850           // 85 blocs × 10 niveaux
const QUEST_BLOCK_SIZE = 10
const COINS_PER_CORRECT = 20
const BOSS_BONUS = 100
const QUEST_QCM = { choices: 4, duration: 20, id: 'quest' }

// ── Helpers blocs ────────────────────────────────────────────────────────────
const blockIdxOf = (level) => Math.floor((level - 1) / QUEST_BLOCK_SIZE) + 1
const blockStartOf = (blockIdx) => (blockIdx - 1) * QUEST_BLOCK_SIZE + 1
const blockBossLevelOf = (blockIdx) => blockIdx * QUEST_BLOCK_SIZE

// ── Persistance état Quest ───────────────────────────────────────────────────
function readQuestState() {
  try {
    const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    const legacy = wd.route && !wd.quest ? wd.route : null
    const base = wd.quest || legacy || { level: 1 }
    return {
      level: base.level || 1,
      stars: base.stars || {},
      bossFailed: base.bossFailed || {},   // { [blockIdx]: true } — VIP verrouillé
      bossWrongs: base.bossWrongs || {},   // { [blockIdx]: [prevWrong1, prevWrong2, ...] }
    }
  } catch {
    return { level: 1, stars: {}, bossFailed: {}, bossWrongs: {} }
  }
}

function writeQuestState(state) {
  try {
    const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    wd.quest = state
    if (wd.route) delete wd.route
    wd.lastModified = Date.now()
    localStorage.setItem('wtf_data', JSON.stringify(wd))
  } catch { /* ignore */ }
}

function readUnlockedSet() {
  try {
    const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    const arr = wd.unlockedFacts || []
    return new Set(Array.isArray(arr) ? arr : Array.from(arr))
  } catch { return new Set() }
}

// ── Pick 9 Funny facts de catégories variées, exclus ceux déjà débloqués ────
function pickDiverseFunny(pool, n, unlockedSet) {
  const available = pool.filter(f => !unlockedSet.has(f.id))
  const source = available.length >= n ? available : pool // fallback si pool déjà vidé
  const shuffled = [...source].sort(() => Math.random() - 0.5)
  const picked = []
  const usedCats = new Set()
  // Pass 1 : maximiser la diversité de catégories
  for (const f of shuffled) {
    if (picked.length >= n) break
    if (!usedCats.has(f.category)) {
      picked.push(f)
      usedCats.add(f.category)
    }
  }
  // Pass 2 : remplir si pas assez de catégories distinctes
  for (const f of shuffled) {
    if (picked.length >= n) break
    if (!picked.includes(f)) picked.push(f)
  }
  return picked
}

// ── Boss : tirage 1 fact VIP déterministe par blocIdx ───────────────────────
// Même blocIdx → même boss. Garantit que le « Rejouer » retombe sur le bon VIP.
function pickBossForBlock(blockIdx) {
  const vipPool = getVipFacts()
  if (!vipPool.length) return null
  const sorted = [...vipPool].sort((a, b) => a.id - b.id)
  return sorted[(blockIdx - 1) % sorted.length]
}

// ── Boss anti-déduction : 4 choix en excluant les anciennes fausses réponses ─
function buildBossOptions(fact, excludeWrongs = []) {
  const correct = fact.shortAnswer || fact.options?.[fact.correctIndex]
  if (!correct) return getAnswerOptions(fact, QUEST_QCM)

  const excludeSet = new Set(excludeWrongs)
  const funny     = [fact.funnyWrong1, fact.funnyWrong2].filter(Boolean)
  const close     = [fact.closeWrong1, fact.closeWrong2].filter(Boolean)
  const plausible = [fact.plausibleWrong1, fact.plausibleWrong2, fact.plausibleWrong3].filter(Boolean)

  const pickFromType = (arr, alreadyPicked) => {
    const cands = arr.filter(w => !excludeSet.has(w) && !alreadyPicked.includes(w))
    if (!cands.length) return null
    return cands[Math.floor(Math.random() * cands.length)]
  }

  const picked = []
  const f = pickFromType(funny, picked);     if (f) picked.push(f)
  const c = pickFromType(close, picked);     if (c) picked.push(c)
  const p = pickFromType(plausible, picked); if (p) picked.push(p)

  // Remplissage si pool filtré trop maigre (relâcher exclude puis allAvailable)
  if (picked.length < 3) {
    const all = [...funny, ...close, ...plausible]
    const fallback = all.filter(w => !picked.includes(w) && !excludeSet.has(w))
    const extra = [...fallback].sort(() => Math.random() - 0.5)
    for (const w of extra) {
      if (picked.length >= 3) break
      picked.push(w)
    }
  }
  if (picked.length < 3) {
    // Exclude épuisé → on relâche, mais on garde au moins un nouveau
    const all = [...funny, ...close, ...plausible].filter(w => !picked.includes(w))
    const extra = [...all].sort(() => Math.random() - 0.5)
    for (const w of extra) {
      if (picked.length >= 3) break
      picked.push(w)
    }
  }

  const all = [correct, ...picked.slice(0, 3)].sort(() => Math.random() - 0.5)
  return { options: all, correctIndex: all.indexOf(correct) }
}

// ── Construit une session de bloc : 9 funny + 1 boss (ou boss seul pour retry) ─
function buildBlockSession({ blockIdx, unlockedSet, bossOnly = false, bossExcludeWrongs = [] }) {
  const bossFact = pickBossForBlock(blockIdx)
  if (!bossFact) return null
  const bossPrepped = {
    ...bossFact,
    ...buildBossOptions(bossFact, bossExcludeWrongs),
    _isBoss: true,
  }

  if (bossOnly) {
    return { facts: [bossPrepped], blockIdx, bossOnly: true }
  }

  const funnyPool = getFunnyFacts()
  if (funnyPool.length < 9) return null
  const diverse = pickDiverseFunny(funnyPool, 9, unlockedSet)
  const funnyPrepped = diverse.map(f => ({
    ...f,
    ...getAnswerOptions(f, QUEST_QCM),
    _isBoss: false,
  }))

  return {
    facts: [...funnyPrepped, bossPrepped],
    blockIdx,
    bossOnly: false,
  }
}

// ═════════════════════════════════════════════════════════════════════════════
export default function QuestScreen({ onHome, setStorage }) {
  const { applyCurrencyDelta, unlockFact, mergeFlags, hints: profileHints } = usePlayerProfile()
  const [state, setState] = useState(readQuestState)
  const [session, setSession] = useState(null)
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [correctFactIds, setCorrectFactIds] = useState([])      // facts répondus correctement dans la session
  const [bossCorrect, setBossCorrect] = useState(false)
  const [energyState, setEnergyState] = useState(() => getSnackEnergy())
  const [noEnergyMsg, setNoEnergyMsg] = useState(false)
  const [hintsRevealed, setHintsRevealed] = useState(0)         // 0, 1 ou 2 indices affichés pour la question courante
  const mapRef = useRef(null)

  useEffect(() => {
    const refresh = () => setEnergyState(getSnackEnergy())
    window.addEventListener('wtf_energy_updated', refresh)
    return () => window.removeEventListener('wtf_energy_updated', refresh)
  }, [])

  useEffect(() => {
    if (mapRef.current && !session) {
      const el = mapRef.current.querySelector('[data-current="true"]')
      el?.scrollIntoView({ block: 'center', behavior: 'instant' })
    }
  }, [session, state.level])

  // Intro dramatique au passage sur la question boss d'un bloc complet
  useEffect(() => {
    if (!session || session.bossOnly) return
    const fact = session.facts[qIndex]
    if (fact?._isBoss) audio.play('boss_intro')
  }, [session, qIndex])

  const currentBlockIdx = blockIdxOf(state.level)

  // ── Lance le bloc courant (consomme 1 énergie) ────────────────────────────
  const launchBlock = () => {
    audio.play('click')
    setNoEnergyMsg(false)
    const energy = getSnackEnergy()
    if ((energy.remaining ?? 0) < 1) {
      setNoEnergyMsg(true)
      return
    }
    const ok = consumeSnackEnergy()
    if (!ok) { setNoEnergyMsg(true); return }
    setEnergyState(getSnackEnergy())

    const unlockedSet = readUnlockedSet()
    const s = buildBlockSession({ blockIdx: currentBlockIdx, unlockedSet })
    if (!s) return
    setSession(s); setQIndex(0); setSelected(null); setCorrectFactIds([]); setBossCorrect(false); setHintsRevealed(0)
  }

  // ── Lance la boss retry (gratuit) ────────────────────────────────────────
  const launchBossRetry = (blockIdx) => {
    audio.play('click')
    const prevWrongs = state.bossWrongs?.[blockIdx] || []
    const s = buildBlockSession({ blockIdx, unlockedSet: readUnlockedSet(), bossOnly: true, bossExcludeWrongs: prevWrongs })
    if (!s) return
    setSession(s); setQIndex(0); setSelected(null); setCorrectFactIds([]); setBossCorrect(false); setHintsRevealed(0)
    // Intro dramatique quand on relance le boss directement
    setTimeout(() => audio.play('boss_intro'), 120)
  }

  // ── Fin de session : applique les gains, progression, unlocks ─────────────
  const finalizeSession = (finalCorrectIds, finalBossCorrect, currentSession) => {
    const blockIdx = currentSession.blockIdx
    const bossFact = currentSession.facts.find(f => f._isBoss)
    const funnyCorrectCount = finalCorrectIds.filter(id => id !== bossFact?.id).length

    // Coins : 20/bonne funny + 100 si boss réussi
    const coinsFunny = funnyCorrectCount * COINS_PER_CORRECT
    const coinsBoss = finalBossCorrect ? BOSS_BONUS : 0
    const coinsTotal = coinsFunny + coinsBoss
    if (coinsTotal > 0) {
      applyCurrencyDelta?.({ coins: coinsTotal }, finalBossCorrect ? 'quest_block_cleared_boss' : 'quest_block_cleared')
        ?.catch?.(e => console.warn('[QuestScreen] reward RPC failed:', e?.message || e))
    }

    // Unlock facts : funny correctes + VIP SEULEMENT si boss réussi
    const toUnlock = new Set(finalCorrectIds.filter(id => id !== bossFact?.id))
    if (finalBossCorrect && bossFact) toUnlock.add(bossFact.id)

    if (setStorage && toUnlock.size > 0) {
      setStorage(prev => {
        const u = new Set(prev.unlockedFacts || [])
        toUnlock.forEach(id => u.add(id))
        return { ...prev, unlockedFacts: u }
      })
    }
    // Miroir Supabase unlock_fact
    toUnlock.forEach(id => {
      const fact = currentSession.facts.find(f => f.id === id)
      unlockFact?.(id, fact?.category, fact?._isBoss ? 'quest_boss_unlock' : 'quest_level_unlock')
        ?.catch?.(e => console.warn('[QuestScreen] unlockFact RPC failed:', e?.message || e))
    })

    // État Quest : avance de bloc même si boss raté, marque bossFailed, historise wrongs
    const nextBossFailed = { ...state.bossFailed }
    const nextBossWrongs = { ...state.bossWrongs }
    if (bossFact) {
      if (finalBossCorrect) {
        delete nextBossFailed[blockIdx]
        delete nextBossWrongs[blockIdx]
      } else {
        nextBossFailed[blockIdx] = true
        // historise les 3 fausses réponses montrées (pour anti-déduction au prochain retry)
        const shownWrongs = (bossFact.options || []).filter((_, i) => i !== bossFact.correctIndex)
        const prev = state.bossWrongs?.[blockIdx] || []
        // cap la liste à 12 pour éviter de tout vider
        nextBossWrongs[blockIdx] = [...new Set([...prev, ...shownWrongs])].slice(-12)
      }
    }

    let nextLevel = state.level
    if (!currentSession.bossOnly) {
      // Bloc complet joué → avance toujours au début du bloc suivant (règle « le joueur avance quand même »)
      nextLevel = Math.min(QUEST_MAX_LEVEL, blockStartOf(blockIdx + 1))
    }

    const nextState = {
      level: nextLevel,
      stars: {
        ...state.stars,
        [blockBossLevelOf(blockIdx)]: finalBossCorrect ? 3 : 1,
      },
      bossFailed: nextBossFailed,
      bossWrongs: nextBossWrongs,
    }
    writeQuestState(nextState)
    setState(nextState)
    mergeFlags?.({ quest: nextState })
      ?.catch?.(e => console.warn('[QuestScreen] quest mergeFlags failed:', e?.message || e))
  }

  const handleAnswer = (idx) => {
    if (selected !== null) return
    setSelected(idx)
    const fact = session.facts[qIndex]
    const isCorrect = idx === fact.correctIndex
    audio.play(isCorrect ? 'correct' : 'wrong')

    const nextCorrectIds = isCorrect ? [...correctFactIds, fact.id] : correctFactIds
    const nextBossCorrect = fact._isBoss ? isCorrect : bossCorrect
    if (isCorrect) setCorrectFactIds(nextCorrectIds)
    if (fact._isBoss) setBossCorrect(nextBossCorrect)

    setTimeout(() => {
      if (qIndex + 1 < session.facts.length) {
        setQIndex(q => q + 1); setSelected(null); setHintsRevealed(0)
      } else {
        finalizeSession(nextCorrectIds, nextBossCorrect, session)
        setQIndex(session.facts.length) // trigger résultat
      }
    }, 900)
  }

  // ── Vue résultat ──────────────────────────────────────────────────────────
  const inResults = session && qIndex >= session.facts.length
  if (inResults) {
    const bossFact = session.facts.find(f => f._isBoss)
    const funnyCount = session.facts.filter(f => !f._isBoss).length
    const funnyCorrect = correctFactIds.filter(id => id !== bossFact?.id).length
    const coinsFunny = funnyCorrect * COINS_PER_CORRECT
    const coinsBoss = bossCorrect ? BOSS_BONUS : 0
    const coinsTotal = coinsFunny + coinsBoss

    return (
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        background: 'linear-gradient(160deg, #1a0f2e 0%, #2E1A47 100%)',
        color: '#fff', fontFamily: 'Nunito, sans-serif',
        display: 'flex', flexDirection: 'column', padding: 20,
        justifyContent: 'center', alignItems: 'center', gap: 16,
        '--scale': 1,
      }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, textAlign: 'center' }}>
          {session.bossOnly
            ? (bossCorrect ? '👑 BOSS vaincu !' : '💀 Boss raté')
            : (bossCorrect ? '👑 Bloc parfait !' : '🎯 Bloc terminé')}
        </h1>
        {!session.bossOnly && (
          <div style={{ fontSize: 16, opacity: 0.85 }}>
            Funny : {funnyCorrect}/{funnyCount} · Boss : {bossCorrect ? '✅' : '❌'}
          </div>
        )}
        <div style={{ width: '100%', maxWidth: 320 }}>
          <GainsBreakdown
            items={[
              !session.bossOnly && { label: `✅ ${funnyCorrect} bonnes réponses`, value: `+${coinsFunny}`, color: '#FFD700' },
              bossCorrect && { label: '👑 Boss vaincu', value: `+${coinsBoss}`, color: '#FFD700' },
            ].filter(Boolean)}
            total={coinsTotal}
            totalColor="#FFD700"
            textColor="#ffffff"
          />
        </div>
        {!bossCorrect && bossFact && (
          <div style={{ fontSize: 12, opacity: 0.7, textAlign: 'center', maxWidth: 280 }}>
            🔒 VIP non débloqué. Rejoue le boss depuis la carte pour le débloquer.
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button onClick={() => { setSession(null) }} style={{
            background: '#FF6B1A', border: 'none', borderRadius: 10, padding: '12px 22px',
            color: '#fff', fontWeight: 800, fontFamily: 'Nunito, sans-serif', cursor: 'pointer', fontSize: 14,
          }}>Carte</button>
          <button onClick={onHome} style={{
            background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 10, padding: '12px 22px',
            color: '#fff', fontWeight: 800, fontFamily: 'Nunito, sans-serif', cursor: 'pointer', fontSize: 14,
          }}>Accueil</button>
        </div>
      </div>
    )
  }

  // ── Vue carte ─────────────────────────────────────────────────────────────
  if (!session) {
    const TOTAL_BLOCKS = Math.ceil(QUEST_MAX_LEVEL / QUEST_BLOCK_SIZE)
    const start = Math.max(1, currentBlockIdx - 3)
    const end = Math.min(TOTAL_BLOCKS, start + 12)
    const visibleBlocks = []
    for (let b = start; b <= end; b++) visibleBlocks.push(b)

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
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, flex: 1, textAlign: 'center' }}>
            <img src="/assets/ui/emoji-route.png" alt="quest" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} /> Quest
          </h1>
          <div style={{ width: 20 }} />
        </div>
        <div style={{ textAlign: 'center', opacity: 0.85, fontSize: 13, marginBottom: 4 }}>
          Niveau <b style={{ color: '#FF6B1A' }}>{state.level}</b> / {QUEST_MAX_LEVEL}
          <span style={{ opacity: 0.6, marginLeft: 8 }}>· Bloc {currentBlockIdx}/{TOTAL_BLOCKS}</span>
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
          <img src="/assets/ui/emoji-energy.png" alt="⚡" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline', marginRight: 4 }} />
          {energyState.remaining}/{energyState.max} · 1 énergie par bloc de 10
        </div>
        {noEnergyMsg && (
          <div style={{
            background: 'rgba(232,69,53,0.15)', border: '1.5px solid rgba(232,69,53,0.5)',
            borderRadius: 10, padding: '10px 14px', fontSize: 12, marginBottom: 10, textAlign: 'center',
          }}>
            Plus d'énergie. Attends la régénération ou joue un autre mode.
          </div>
        )}

        <div ref={mapRef} style={{
          flex: 1, overflowY: 'auto',
          display: 'flex', flexDirection: 'column-reverse',
          gap: 12, padding: '14px 0',
        }}>
          {visibleBlocks.map(b => {
            const isCurrent = b === currentBlockIdx
            const isDone = b < currentBlockIdx
            const isLocked = b > currentBlockIdx
            const failedBoss = state.bossFailed?.[b]
            const side = b % 2 === 0 ? 'flex-end' : 'flex-start'
            const startLv = blockStartOf(b)
            const bossLv = blockBossLevelOf(b)
            return (
              <div key={b} data-current={isCurrent ? 'true' : 'false'} style={{
                display: 'flex', flexDirection: 'column', alignItems: side === 'flex-end' ? 'flex-end' : 'flex-start', width: '100%', gap: 6,
              }}>
                <button
                  onClick={() => isCurrent && launchBlock()}
                  disabled={!isCurrent}
                  style={{
                    width: '72%',
                    background: isCurrent
                      ? 'linear-gradient(135deg, #FF6B1A 0%, #E84535 100%)'
                      : isDone
                        ? 'rgba(107,203,119,0.2)'
                        : 'rgba(255,255,255,0.06)',
                    border: `2px solid ${isCurrent ? '#fff' : isDone ? '#6BCB77' : 'rgba(255,255,255,0.12)'}`,
                    borderRadius: 16, padding: '14px 16px',
                    color: '#fff', fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 14,
                    cursor: isCurrent ? 'pointer' : 'default',
                    opacity: isLocked ? 0.35 : 1,
                    animation: isCurrent ? 'pulse 1.5s ease-in-out infinite' : 'none',
                    textAlign: 'center',
                    boxShadow: isCurrent ? '0 4px 20px rgba(255,107,26,0.4)' : 'none',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Bloc {b} — Niv. {startLv}-{bossLv} ⭐
                  {isDone ? ' ✓' : ''}
                </button>
                {isDone && failedBoss && (
                  <button
                    onClick={() => launchBossRetry(b)}
                    style={{
                      width: '55%',
                      background: 'rgba(232,69,53,0.2)',
                      border: '1.5px solid #E84535',
                      borderRadius: 10, padding: '8px 12px',
                      color: '#fff', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    🔒 VIP verrouillé · Rejouer le boss
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }`}</style>
      </div>
    )
  }

  // ── Vue session (question) ───────────────────────────────────────────────
  const fact = session.facts[qIndex]
  const isBoss = fact._isBoss

  // Tirage 2 indices parmi 4 (hint1-hint4), stable par fact + retry
  // Le retryCount fait varier le tirage à chaque retry boss
  const retryCount = isBoss ? (state.bossWrongs?.[session.blockIdx]?.length || 0) : 0
  const hintPool = [fact.hint1, fact.hint2, fact.hint3, fact.hint4].filter(h => h && h.trim() !== '')
  // Shuffle déterministe via seed simple (factId + retryCount)
  const seed = (fact.id * 31 + retryCount * 7) >>> 0
  const shuffledHints = [...hintPool].sort((a, b) => {
    const ha = (a.charCodeAt(0) + seed) % 100
    const hb = (b.charCodeAt(0) + seed * 3) % 100
    return ha - hb
  })
  const availableHints = shuffledHints.slice(0, 2)

  const canUseHint = selected === null && hintsRevealed < availableHints.length && (profileHints ?? 0) > 0
  const useHint = () => {
    if (!canUseHint) return
    audio.play('click')
    setHintsRevealed(n => n + 1)
    applyCurrencyDelta?.({ hints: -1 }, 'quest_use_hint')
      ?.catch?.(e => console.warn('[QuestScreen] hint debit failed:', e?.message || e))
  }
  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      background: isBoss
        ? 'linear-gradient(160deg, #4a0e1a 0%, #2E1A47 100%)'
        : 'linear-gradient(160deg, #1a0f2e 0%, #2E1A47 100%)',
      color: '#fff', fontFamily: 'Nunito, sans-serif',
      display: 'flex', flexDirection: 'column', padding: 20, gap: 14,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setSession(null)} style={{
          background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', padding: 0,
        }}>←</button>
        <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 700 }}>
          {session.bossOnly
            ? '👑 BOSS (retry)'
            : `Bloc ${session.blockIdx} · ${isBoss ? '👑 BOSS' : `Q${qIndex + 1}/${session.facts.length - 1}`}`}
        </div>
        <div style={{ width: 20 }} />
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.08)', padding: 18, borderRadius: 14,
        fontSize: 16, lineHeight: 1.45, textAlign: 'center', minHeight: 110,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1.5px solid ${isBoss ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.15)'}`,
      }}>
        {fact.fact || fact.titre || fact.question || 'Question'}
      </div>

      {/* Indices révélés + bouton indice */}
      {availableHints.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {availableHints.slice(0, hintsRevealed).map((h, i) => (
            <div key={i} style={{
              background: 'rgba(255,215,0,0.12)', border: '1.5px solid rgba(255,215,0,0.4)',
              borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 700,
              color: '#FFD700', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>💡</span><span>{h}</span>
            </div>
          ))}
          {hintsRevealed < availableHints.length && (
            <button
              onClick={useHint}
              disabled={!canUseHint}
              style={{
                background: canUseHint ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1.5px solid ${canUseHint ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.15)'}`,
                borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 800,
                color: canUseHint ? '#FFD700' : 'rgba(255,255,255,0.3)',
                cursor: canUseHint ? 'pointer' : 'not-allowed',
                fontFamily: 'Nunito, sans-serif',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              💡 Indice {hintsRevealed + 1}/{availableHints.length}
              <span style={{ opacity: 0.7, fontSize: 10 }}>
                · stock : {profileHints ?? 0}
              </span>
            </button>
          )}
        </div>
      )}

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
