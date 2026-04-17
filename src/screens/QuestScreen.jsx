import { useState, useRef, useEffect, useMemo } from 'react'
import { getFunnyFacts, getVipFacts, getCategoryById } from '../data/factsService'
import { getAnswerOptions } from '../utils/answers'
import { usePlayerProfile } from '../hooks/usePlayerProfile'
import { audio } from '../utils/audio'
import {
  getQuickieEnergy,
  consumeQuickieEnergy,
  buyExtraSession,
} from '../services/energyService'
import { QUICKIE_ENERGY } from '../constants/gameConfig'
import GameHeader from '../components/GameHeader'
import CircularTimer from '../components/CircularTimer'
import HintFlipButton from '../components/HintFlipButton'
import FallbackImage from '../components/FallbackImage'
import EnergyIcon from '../components/icons/EnergyIcon'
import RevelationScreen from './RevelationScreen'
import renderFormattedText from '../utils/renderFormattedText'
import GainsBreakdown from '../components/results/GainsBreakdown'

// ── Constantes Quest (spec QUEST_MODE_UPDATE 15/04/2026) ────────────────────
const QUEST_BLOCK_SIZE = 10                 // 10 Funny par bloc
const BOSS_THRESHOLD = 5                    // boss débloqué à ≥5/10
const COINS_PER_CORRECT = 20
const BOSS_BONUS = 100
const HINT_COST = 50
const QUEST_DURATION = 20
const QUEST_QCM = { choices: 4, duration: QUEST_DURATION, id: 'quest' }
const QUEST_MAX_LEVEL = 850

const S = (px) => `calc(${px}px * var(--scale))`

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
      bossFailed: base.bossFailed || {},
      bossWrongs: base.bossWrongs || {},
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

// ── Pick 10 Funny diversifiées (catégories variées, hors déjà débloquées) ──
function pickDiverseFunny(pool, n, unlockedSet) {
  const available = pool.filter(f => !unlockedSet.has(f.id))
  const source = available.length >= n ? available : pool
  const shuffled = [...source].sort(() => Math.random() - 0.5)
  const picked = []
  const usedCats = new Set()
  for (const f of shuffled) {
    if (picked.length >= n) break
    if (!usedCats.has(f.category)) { picked.push(f); usedCats.add(f.category) }
  }
  for (const f of shuffled) {
    if (picked.length >= n) break
    if (!picked.includes(f)) picked.push(f)
  }
  return picked
}

// ── Boss : tirage VIP déterministe par blockIdx ─────────────────────────────
function pickBossForBlock(blockIdx) {
  const vipPool = getVipFacts()
  if (!vipPool.length) return null
  const sorted = [...vipPool].sort((a, b) => a.id - b.id)
  return sorted[(blockIdx - 1) % sorted.length]
}

// ── Boss anti-déduction : 4 choix en excluant anciennes fausses réponses ──
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

  if (picked.length < 3) {
    const all = [...funny, ...close, ...plausible]
    const fallback = all.filter(w => !picked.includes(w) && !excludeSet.has(w))
    const extra = [...fallback].sort(() => Math.random() - 0.5)
    for (const w of extra) { if (picked.length >= 3) break; picked.push(w) }
  }
  if (picked.length < 3) {
    const all = [...funny, ...close, ...plausible].filter(w => !picked.includes(w))
    const extra = [...all].sort(() => Math.random() - 0.5)
    for (const w of extra) { if (picked.length >= 3) break; picked.push(w) }
  }

  const all = [correct, ...picked.slice(0, 3)].sort(() => Math.random() - 0.5)
  return { options: all, correctIndex: all.indexOf(correct) }
}

// ── Construit une session de bloc : 10 funny + 1 boss préparé (conditionnel) ─
function buildBlockSession({ blockIdx, unlockedSet, bossOnly = false, bossExcludeWrongs = [] }) {
  const bossFact = pickBossForBlock(blockIdx)
  if (!bossFact) return null
  const bossPrepped = {
    ...bossFact,
    ...buildBossOptions(bossFact, bossExcludeWrongs),
    _isBoss: true,
  }
  if (bossOnly) return { facts: [bossPrepped], blockIdx, bossOnly: true }

  const funnyPool = getFunnyFacts()
  if (funnyPool.length < QUEST_BLOCK_SIZE) return null
  const diverse = pickDiverseFunny(funnyPool, QUEST_BLOCK_SIZE, unlockedSet)
  const funnyPrepped = diverse.map(f => ({
    ...f,
    ...getAnswerOptions(f, QUEST_QCM),
    _isBoss: false,
  }))

  return {
    facts: funnyPrepped,      // 10 funny
    bossFact: bossPrepped,    // boss tenu de côté (conditionnel)
    blockIdx,
    bossOnly: false,
  }
}

// ═════════════════════════════════════════════════════════════════════════════
export default function QuestScreen({ onHome, setStorage }) {
  const {
    applyCurrencyDelta,
    unlockFact,
    mergeFlags,
    coins: profileCoins,
    hints: profileHints,
  } = usePlayerProfile()
  const [state, setState] = useState(readQuestState)
  const [session, setSession] = useState(null)
  const [qIndex, setQIndex] = useState(0)
  const [phase, setPhase] = useState('question')        // 'question' | 'revelation' | 'results'
  const [selected, setSelected] = useState(null)
  const [correctFactIds, setCorrectFactIds] = useState([])
  const [funnyCorrectCount, setFunnyCorrectCount] = useState(0)
  const [bossCorrect, setBossCorrect] = useState(false)
  const [bossUnlocked, setBossUnlocked] = useState(false) // ≥5/10 atteint
  const [hintsUsed, setHintsUsed] = useState(0)
  const [imgFailed, setImgFailed] = useState(false)
  const [energyState, setEnergyState] = useState(() => getQuickieEnergy())
  const [showEnergyModal, setShowEnergyModal] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const mapRef = useRef(null)

  useEffect(() => {
    const refresh = () => setEnergyState(getQuickieEnergy())
    window.addEventListener('wtf_energy_updated', refresh)
    return () => window.removeEventListener('wtf_energy_updated', refresh)
  }, [])

  useEffect(() => {
    if (mapRef.current && !session) {
      const el = mapRef.current.querySelector('[data-current="true"]')
      el?.scrollIntoView({ block: 'center', behavior: 'instant' })
    }
  }, [session, state.level])

  // Reset image/selected/timeout quand on change de question.
  // NOTE : hintsUsed NE se reset PAS entre questions d'un même bloc (le flip indice
  // reste actif pour les questions suivantes). Reset uniquement à nouvelle session.
  useEffect(() => {
    setImgFailed(false); setSelected(null); setTimedOut(false)
  }, [qIndex])

  // Intro dramatique quand on arrive sur le boss
  useEffect(() => {
    if (!session || phase !== 'question') return
    const fact = currentFact()
    if (fact?._isBoss) audio.play('boss_intro')

  }, [phase, session, qIndex])

  const currentBlockIdx = blockIdxOf(state.level)

  const currentFact = () => {
    if (!session) return null
    if (session.bossOnly) return session.facts[0]
    // Phase funny : facts[qIndex] ; phase boss : session.bossFact
    if (qIndex < session.facts.length) return session.facts[qIndex]
    return session.bossFact
  }

  // ── Lance le bloc courant (consomme 1 énergie) ────────────────────────────
  const launchBlock = () => {
    audio.play('click')
    const energy = getQuickieEnergy()
    if ((energy.remaining ?? 0) < 1) { setShowEnergyModal(true); return }
    const ok = consumeQuickieEnergy()
    if (!ok) { setShowEnergyModal(true); return }
    setEnergyState(getQuickieEnergy())

    const unlockedSet = readUnlockedSet()
    const s = buildBlockSession({ blockIdx: currentBlockIdx, unlockedSet })
    if (!s) return
    setSession(s); setQIndex(0); setPhase('question')
    setSelected(null); setCorrectFactIds([]); setFunnyCorrectCount(0)
    setBossCorrect(false); setBossUnlocked(false); setHintsUsed(0); setTimedOut(false)
  }

  // ── Lance la boss retry (gratuit, bloc déjà gagné à ≥5/10) ───────────────
  const launchBossRetry = (blockIdx) => {
    audio.play('click')
    const prevWrongs = state.bossWrongs?.[blockIdx] || []
    const s = buildBlockSession({ blockIdx, unlockedSet: readUnlockedSet(), bossOnly: true, bossExcludeWrongs: prevWrongs })
    if (!s) return
    setSession(s); setQIndex(0); setPhase('question')
    setSelected(null); setCorrectFactIds([]); setFunnyCorrectCount(0)
    setBossCorrect(false); setBossUnlocked(true); setHintsUsed(0)
  }

  // ── Achat énergie (75 coins) ─────────────────────────────────────────────
  const handleBuyEnergy = () => {
    const ok = buyExtraSession({ coins: profileCoins ?? 0, applyCurrencyDelta })
    if (!ok) return
    setShowEnergyModal(false)
    setEnergyState(getQuickieEnergy())
    // Relance automatique
    setTimeout(() => launchBlock(), 80)
  }

  // ── Fin de session : gains + progression + unlocks ─────────────────────────
  const finalizeSession = (sessionArg, funnyCorrectIds, didBossCorrect, didBossUnlocked) => {
    const blockIdx = sessionArg.blockIdx
    const bossFact = sessionArg.bossFact || sessionArg.facts.find(f => f._isBoss)
    // NOTE : coins déjà crédités immédiatement à chaque bonne réponse (handleAnswer)

    // Unlock funny correctes toujours ; VIP seulement si boss réussi
    const toUnlock = new Set(funnyCorrectIds)
    if (didBossCorrect && bossFact) toUnlock.add(bossFact.id)

    if (setStorage && toUnlock.size > 0) {
      setStorage(prev => {
        const u = new Set(prev.unlockedFacts || [])
        toUnlock.forEach(id => u.add(id))
        return { ...prev, unlockedFacts: u }
      })
    }
    toUnlock.forEach(id => {
      const isBoss = bossFact && id === bossFact.id
      const fact = isBoss ? bossFact : sessionArg.facts.find(f => f.id === id)
      unlockFact?.(id, fact?.category, isBoss ? 'quest_boss_unlock' : 'quest_level_unlock')
        ?.catch?.(e => console.warn('[QuestScreen] unlockFact RPC failed:', e?.message || e))
    })

    const nextBossFailed = { ...state.bossFailed }
    const nextBossWrongs = { ...state.bossWrongs }
    if (bossFact && didBossUnlocked) {
      if (didBossCorrect) {
        delete nextBossFailed[blockIdx]
        delete nextBossWrongs[blockIdx]
      } else {
        nextBossFailed[blockIdx] = true
        const shownWrongs = (bossFact.options || []).filter((_, i) => i !== bossFact.correctIndex)
        const prev = state.bossWrongs?.[blockIdx] || []
        nextBossWrongs[blockIdx] = [...new Set([...prev, ...shownWrongs])].slice(-12)
      }
    }

    // Avance : SEULEMENT si boss réussi
    let nextLevel = state.level
    if (didBossCorrect && !sessionArg.bossOnly) {
      nextLevel = Math.min(QUEST_MAX_LEVEL, blockStartOf(blockIdx + 1))
    }

    const nextState = {
      level: nextLevel,
      stars: {
        ...state.stars,
        [blockBossLevelOf(blockIdx)]: didBossCorrect ? 3 : (didBossUnlocked ? 1 : 0),
      },
      bossFailed: nextBossFailed,
      bossWrongs: nextBossWrongs,
    }
    writeQuestState(nextState)
    setState(nextState)
    mergeFlags?.({ quest: nextState })
      ?.catch?.(e => console.warn('[QuestScreen] quest mergeFlags failed:', e?.message || e))
  }

  // ── Sélection d'une réponse ────────────────────────────────────────────────
  const handleAnswer = (idx) => {
    if (selected !== null || phase !== 'question' || timedOut) return
    const fact = currentFact()
    if (!fact) return
    // Blur le bouton focus pour éviter le scroll auto du navigateur
    try { document.activeElement?.blur?.() } catch (_) {}
    setSelected(idx)
    const isCorrect = idx === fact.correctIndex
    audio.play(isCorrect ? 'correct' : 'wrong_quest')
    audio.vibrate(isCorrect ? [40, 20, 40] : [120])

    const wasBoss = !!fact._isBoss
    const nextCorrectIds = isCorrect && !wasBoss ? [...correctFactIds, fact.id] : correctFactIds
    const nextFunnyCount = isCorrect && !wasBoss ? funnyCorrectCount + 1 : funnyCorrectCount
    const nextBossCorrect = wasBoss ? isCorrect : bossCorrect
    if (isCorrect && !wasBoss) setCorrectFactIds(nextCorrectIds)
    if (isCorrect && !wasBoss) setFunnyCorrectCount(nextFunnyCount)
    if (wasBoss) setBossCorrect(nextBossCorrect)

    // Crédite les coins IMMÉDIATEMENT au compteur header à chaque bonne réponse
    if (isCorrect) {
      const gain = wasBoss ? BOSS_BONUS : COINS_PER_CORRECT
      applyCurrencyDelta?.({ coins: gain }, wasBoss ? 'quest_boss_correct' : 'quest_correct')
        ?.catch?.(e => console.warn('[QuestScreen] coins credit failed:', e?.message || e))
    }

    // Enchaînement : si bonne réponse → révélation, sinon saut direct
    setTimeout(() => {
      if (isCorrect) {
        setPhase('revelation')
      } else {
        advance(nextCorrectIds, nextFunnyCount, nextBossCorrect)
      }
    }, 650)
  }

  // ── Timeout : avertissement bref puis saut comme mauvaise réponse ─────────
  const handleTimeout = () => {
    if (selected !== null || phase !== 'question' || timedOut) return
    const fact = currentFact()
    if (!fact) return
    setTimedOut(true)
    audio.play('timeout')
    audio.vibrate([120])
    const wasBoss = !!fact._isBoss
    setTimeout(() => {
      advance(correctFactIds, funnyCorrectCount, wasBoss ? false : bossCorrect)
    }, 1200)
  }

  // ── Passe à la question suivante ou aux résultats ─────────────────────────
  const advance = (correctIds, funnyCount, didBossCorrect) => {
    const sess = session
    if (!sess) return
    // Retry boss seul
    if (sess.bossOnly) {
      finalizeSession(sess, [], didBossCorrect, true)
      setPhase('results')
      return
    }
    // On vient de répondre au boss (qIndex === sess.facts.length)
    if (qIndex >= sess.facts.length) {
      finalizeSession(sess, correctIds, didBossCorrect, true)
      setPhase('results')
      return
    }
    // Encore des funnies à jouer
    if (qIndex + 1 < sess.facts.length) {
      setQIndex(q => q + 1)
      setSelected(null)
      setPhase('question')
      return
    }
    // 10e funny terminée → seuil boss ?
    const unlocked = funnyCount >= BOSS_THRESHOLD
    if (unlocked) {
      setBossUnlocked(true)
      setQIndex(sess.facts.length) // → currentFact() renvoie bossFact
      setSelected(null)
      setPhase('question')
      return
    }
    // <5/10 : bloc raté, pas de boss
    finalizeSession(sess, correctIds, didBossCorrect, false)
    setPhase('results')
  }

  // ── Révélation → next ─────────────────────────────────────────────────────
  const handleRevelationNext = () => {
    audio.play('click')
    advance(correctFactIds, funnyCorrectCount, bossCorrect)
  }

  // ── Indices : tirage 2 parmi 4 (stable par fact + retry boss) ──────────────
  const fact = currentFact()
  const isBoss = !!fact?._isBoss
  const retryCount = isBoss ? (state.bossWrongs?.[session?.blockIdx]?.length || 0) : 0
  const hintPool = useMemo(() => {
    if (!fact) return []
    return [fact.hint1, fact.hint2, fact.hint3, fact.hint4].filter(h => h && h.trim() !== '')
  }, [fact])
  const shuffledHints = useMemo(() => {
    if (!fact) return []
    const seed = (fact.id * 31 + retryCount * 7) >>> 0
    return [...hintPool].sort((a, b) => {
      const ha = (a.charCodeAt(0) + seed) % 100
      const hb = (b.charCodeAt(0) + seed * 3) % 100
      return ha - hb
    })
  }, [fact, hintPool, retryCount])
  const availableHints = shuffledHints.slice(0, 2)

  const useHint = (hintNum) => {
    // Débit stock immédiatement (optimistic via applyCurrencyDelta)
    audio.play('click')
    setHintsUsed(h => Math.max(h, hintNum))
    applyCurrencyDelta?.({ hints: -1 }, 'quest_use_hint')
      ?.catch?.(e => console.warn('[QuestScreen] hint debit failed:', e?.message || e))
  }
  const buyHint = () => {
    if ((profileCoins ?? 0) < HINT_COST) return
    applyCurrencyDelta?.({ coins: -HINT_COST, hints: 1 }, 'buy_hint_in_session')
      ?.catch?.(e => console.warn('[QuestScreen] buy hint RPC failed:', e?.message || e))
  }

  // ═════════════════════════════════════════════════════════════════════════
  // VUE RÉSULTATS
  // ═════════════════════════════════════════════════════════════════════════
  if (phase === 'results' && session) {
    const unlocked = bossUnlocked
    const coinsFunny = funnyCorrectCount * COINS_PER_CORRECT
    const coinsBoss = bossCorrect ? BOSS_BONUS : 0
    const coinsTotal = coinsFunny + coinsBoss

    const title = session.bossOnly
      ? (bossCorrect ? '👑 Boss vaincu !' : '💀 Boss raté')
      : !unlocked
        ? '🔒 Bloc raté'
        : bossCorrect ? '👑 Bloc réussi !' : '💀 Boss raté'
    const subtitle = session.bossOnly
      ? ''
      : !unlocked
        ? `${funnyCorrectCount}/10 · il faut au moins 5 bonnes réponses pour affronter le boss`
        : bossCorrect
          ? `${funnyCorrectCount}/10 Funny · Boss vaincu → niveau suivant débloqué`
          : `${funnyCorrectCount}/10 Funny · Boss raté → refais le bloc`

    return (
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        background: 'linear-gradient(160deg, #1a0f2e 0%, #2E1A47 100%)',
        color: '#fff', fontFamily: 'Nunito, sans-serif',
        display: 'flex', flexDirection: 'column', padding: 20,
        justifyContent: 'center', alignItems: 'center', gap: 16,
        '--scale': 1,
      }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, textAlign: 'center' }}>{title}</h1>
        {subtitle && (
          <div style={{ fontSize: 14, opacity: 0.85, textAlign: 'center', maxWidth: 300 }}>{subtitle}</div>
        )}
        <div style={{ width: '100%', maxWidth: 320 }}>
          <GainsBreakdown
            items={[
              !session.bossOnly && { label: `✅ ${funnyCorrectCount} bonnes réponses`, value: `+${coinsFunny}`, color: '#FFD700' },
              bossCorrect && { label: '👑 Boss vaincu', value: `+${coinsBoss}`, color: '#FFD700' },
            ].filter(Boolean)}
            total={coinsTotal}
            totalColor="#FFD700"
            textColor="#ffffff"
          />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button onClick={() => { setSession(null); setPhase('question') }} style={{
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

  // ═════════════════════════════════════════════════════════════════════════
  // VUE RÉVÉLATION (après bonne réponse → déblocage fact)
  // ═════════════════════════════════════════════════════════════════════════
  if (phase === 'revelation' && fact) {
    const totalFunny = session?.bossOnly ? 1 : (session?.facts?.length || 10)
    const totalDisplay = session?.bossOnly ? 1 : totalFunny + (bossUnlocked ? 1 : 0)
    const displayIdx = session?.bossOnly ? 0 : (isBoss ? totalFunny : qIndex)
    const pointsEarned = isBoss ? BOSS_BONUS : COINS_PER_CORRECT
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', '--scale': 1 }}>
        <RevelationScreen
          fact={fact}
          isCorrect={true}
          selectedAnswer={selected ?? 0}
          pointsEarned={pointsEarned}
          hintsUsed={hintsUsed}
          onNext={handleRevelationNext}
          onShare={() => {}}
          onQuit={() => setSession(null)}
          factIndex={displayIdx}
          totalFacts={totalDisplay}
          gameMode="quest"
          sessionScore={(correctFactIds.length * COINS_PER_CORRECT) + (bossCorrect ? BOSS_BONUS : 0)}
          sessionType="parcours"
        />
      </div>
    )
  }

  // ═════════════════════════════════════════════════════════════════════════
  // VUE CARTE (hub)
  // ═════════════════════════════════════════════════════════════════════════
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
        '--scale': 1,
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
          <span style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }}><EnergyIcon size={14} /></span>
          {energyState.remaining}/{energyState.max} · 1 énergie par bloc
        </div>

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
                      : isDone ? 'rgba(107,203,119,0.2)' : 'rgba(255,255,255,0.06)',
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
                  Bloc {b} — Niv. {startLv}-{bossLv}{isDone ? ' ✓' : ''}
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

        {/* Modal énergie insuffisante */}
        {showEnergyModal && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}>
            <div style={{
              background: '#FAFAF8', borderRadius: 20, padding: 22, width: '100%', maxWidth: 320,
              color: '#1a1a2e', textAlign: 'center',
            }}>
              <div style={{ marginBottom: 4 }}><EnergyIcon size={42} /></div>
              <h2 style={{ fontSize: 18, fontWeight: 900, margin: '4px 0 6px' }}>Plus d'énergie !</h2>
              <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 16px', lineHeight: 1.5 }}>
                Achète 1 énergie pour {QUICKIE_ENERGY.EXTRA_SESSION_COST} coins et lance ce bloc, ou attends la régénération.
              </p>
              <button
                onClick={handleBuyEnergy}
                disabled={(profileCoins ?? 0) < QUICKIE_ENERGY.EXTRA_SESSION_COST}
                style={{
                  width: '100%', padding: '12px 0', borderRadius: 12,
                  background: (profileCoins ?? 0) >= QUICKIE_ENERGY.EXTRA_SESSION_COST
                    ? 'linear-gradient(135deg, #FF6B1A, #D94A10)' : '#E5E7EB',
                  border: 'none',
                  color: (profileCoins ?? 0) >= QUICKIE_ENERGY.EXTRA_SESSION_COST ? '#fff' : '#9CA3AF',
                  fontWeight: 900, fontSize: 14, fontFamily: 'Nunito, sans-serif',
                  cursor: (profileCoins ?? 0) >= QUICKIE_ENERGY.EXTRA_SESSION_COST ? 'pointer' : 'not-allowed',
                }}
              >
                Acheter ({QUICKIE_ENERGY.EXTRA_SESSION_COST} coins)
              </button>
              <button onClick={() => setShowEnergyModal(false)} style={{
                width: '100%', padding: '10px 0', marginTop: 8,
                background: 'transparent', border: 'none', color: '#6B7280',
                fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
              }}>
                Fermer
              </button>
            </div>
          </div>
        )}

        <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }`}</style>
      </div>
    )
  }

  // ═════════════════════════════════════════════════════════════════════════
  // VUE QUESTION
  // ═════════════════════════════════════════════════════════════════════════
  const cat = getCategoryById(fact.category)
  const catColor = cat?.color || '#FF6B1A'
  const screenBg = isBoss
    ? 'linear-gradient(160deg, #4a0e1a 0%, #2E1A47 100%)'
    : `linear-gradient(160deg, ${catColor}22 0%, ${catColor} 100%)`
  const totalFunny = session.bossOnly ? 0 : session.facts.length
  const displayIndex = isBoss ? totalFunny : qIndex
  const displayTotal = totalFunny + (bossUnlocked || isBoss ? 1 : 0) || 1

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%', overflow: 'hidden',
      background: screenBg, color: '#fff', fontFamily: 'Nunito, sans-serif',
      display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
      '--scale': 1,
    }}>
      <div style={{ padding: `${S(16)} ${S(16)} 0`, flexShrink: 0 }}>
        <GameHeader
          categoryLabel={cat?.label || 'Quest'}
          categoryColor={catColor}
          categoryIcon={fact.category ? `/assets/categories/${fact.category}.png` : null}
          onQuit={() => setSession(null)}
        />
      </div>

      {/* Label mode */}
      <div style={{ textAlign: 'center', flexShrink: 0, padding: `${S(4)} 0 ${S(2)}` }}>
        <span style={{
          fontSize: S(12), fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.6)', textShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}>
          {isBoss ? '👑 BOSS VIP' : `MODE QUEST · BLOC ${session.blockIdx}`}
        </span>
      </div>

      {/* Barre de progression */}
      <div style={{ padding: `0 ${S(16)}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: S(3) }}>
          {Array.from({ length: displayTotal }).map((_, i) => {
            const isActive = i === displayIndex
            return (
              <div key={i} style={{
                flex: 1,
                height: isActive ? S(20) : S(10),
                borderRadius: S(5),
                background: isActive ? 'white' : 'rgba(255,255,255,0.3)',
                position: isActive ? 'relative' : 'static',
                transition: 'all 0.3s ease',
              }}>
                {isActive && (
                  <span style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: S(12), fontWeight: 900, color: catColor, whiteSpace: 'nowrap',
                  }}>
                    {displayIndex + 1}/{displayTotal}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Zone question + hints + QCM */}
      <div style={{
        flex: 1, minHeight: 0, overflow: 'hidden',
        display: 'flex', flexDirection: 'column', gap: S(10),
        padding: `${S(10)} ${S(16)} 0`,
      }}>
        {/* Card question avec image floutée + 🔒 */}
        <div style={{
          background: 'rgba(0,0,0,0.28)', border: `1.5px solid ${catColor}70`,
          borderRadius: S(16), padding: S(12), backdropFilter: 'blur(12px)',
          boxShadow: `0 4px 32px ${catColor}30`,
          flexShrink: 0,
        }}>
          <div style={{
            position: 'relative', width: '100%', aspectRatio: '1 / 1',
            borderRadius: S(12), overflow: 'hidden', marginBottom: S(10),
            background: 'rgba(0,0,0,0.3)',
          }}>
            {fact.imageUrl && !imgFailed ? (
              <img
                src={fact.imageUrl} alt=""
                style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  filter: 'blur(18px) brightness(0.6)', transform: 'scale(1.15)',
                }}
                onError={() => setImgFailed(true)}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', filter: 'blur(14px) brightness(0.6)' }}>
                <FallbackImage categoryColor={catColor} />
              </div>
            )}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: S(56), filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))',
            }}>🔒</div>
          </div>
          <h2 style={{
            fontSize: 'calc(1.05rem * var(--scale))', fontWeight: 800, lineHeight: 1.35,
            color: '#fff', margin: 0, textAlign: 'center',
          }}>
            {renderFormattedText(fact.question || fact.fact || '', '#FF6B1A')}
          </h2>
        </div>

        {/* Deux boutons indices visibles d'un coup */}
        {availableHints.length > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: availableHints.length === 1 ? '1fr' : '1fr 1fr',
            gap: 8, flexShrink: 0,
          }}>
            {availableHints.map((h, i) => {
              const hintNum = i + 1
              const hasStock = (profileHints ?? 0) > 0
              const canAfford = hasStock || (profileCoins ?? 0) >= HINT_COST
              const canUse = hasStock
              return (
                <HintFlipButton
                  key={`${fact.id}-${hintNum}`}
                  num={hintNum}
                  hint={h}
                  catColor={catColor}
                  isFree={false}
                  cost={HINT_COST}
                  canAfford={canAfford}
                  canUse={canUse}
                  initialRevealed={hintsUsed >= hintNum}
                  onReveal={() => useHint(hintNum)}
                  onBuyHint={!canUse && canAfford ? buyHint : null}
                />
              )
            })}
          </div>
        )}

        {/* QCM : pas de vert sur bonne réponse si mal répondu */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: S(5),
          flexShrink: 0, position: 'relative', zIndex: 5,
        }}>
          {fact.options.map((opt, i) => {
            const isSel = selected === i
            const isWrongPick = isSel && i !== fact.correctIndex
            const isRightPick = isSel && i === fact.correctIndex
            const bg = isWrongPick
              ? 'rgba(232,69,53,0.55)'
              : isRightPick
                ? 'rgba(107,203,119,0.55)'
                : 'rgba(255,255,255,0.15)'
            const border = isWrongPick
              ? '2px solid #E84535'
              : isRightPick
                ? '2px solid #6BCB77'
                : '1.5px solid rgba(255,255,255,0.4)'
            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={selected !== null}
                style={{
                  background: bg, border, borderRadius: S(12),
                  color: '#fff', fontWeight: 700, fontSize: S(13), lineHeight: 1.2,
                  padding: `${S(4)} ${S(6)}`, height: S(64), width: '100%',
                  overflow: 'hidden', wordBreak: 'break-word',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  textAlign: 'center', cursor: selected === null ? 'pointer' : 'default',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
              >
                <span style={{
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                }}>
                  {renderFormattedText(opt)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Overlay timeout */}
      {timedOut && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 40,
          background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{
            background: 'rgba(232,69,53,0.95)', borderRadius: 18,
            padding: '20px 32px', textAlign: 'center',
            border: '2px solid rgba(255,255,255,0.4)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontSize: 42, marginBottom: 6 }}>⏱️</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '0.05em' }}>
              TEMPS ÉCOULÉ !
            </div>
          </div>
          <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
        </div>
      )}

      {/* Timer en bas */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `${S(8)} 0 ${S(14)}` }}>
        <div style={{ width: S(72), height: S(72), display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <CircularTimer
            key={`${fact.id}-${phase}`}
            size={72}
            duration={QUEST_DURATION}
            onTimeout={handleTimeout}
          />
        </div>
      </div>
    </div>
  )
}
