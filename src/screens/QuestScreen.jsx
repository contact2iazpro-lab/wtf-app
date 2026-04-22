import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { getFunnyFacts, getVipFacts, getCategoryById } from '../data/factsService'
import { getAnswerOptions } from '../utils/answers'
import { updateWtfData, readWtfData } from '../utils/storageHelper'
import { shuffle } from '../utils/shuffle'
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
import EnergyIcon from '../components/icons/EnergyIcon'
import SettingsModal from '../components/SettingsModal'
import FallbackImage from '../components/FallbackImage'
import RevelationScreen from './RevelationScreen'
import renderFormattedText from '../utils/renderFormattedText'
import GainsBreakdown from '../components/results/GainsBreakdown'

// ── Constantes Quest (refonte 19/04/2026 : blocs courts pour rythme soutenu) ─
const QUEST_BLOCK_SIZE = 5                  // 5 Funny par bloc (ex-10)
const BOSS_THRESHOLD = 3                    // boss débloqué à ≥3/5 (ex-5/10)
const COINS_PER_CORRECT = 10
const BOSS_BONUS = 0
const HINT_COST = 50
const BOSS_HINT_COST = 100
const QUEST_DURATION = 30
const QUEST_QCM = { choices: 4, duration: QUEST_DURATION, id: 'quest' }
const QUEST_MAX_LEVEL = 360

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
    const prevServed = wd.quest?.servedFacts
    wd.quest = { ...state }
    if (prevServed) wd.quest.servedFacts = prevServed
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

function readQuestServedSet() {
  try {
    const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    const arr = wd.quest?.servedFacts || []
    return new Set(Array.isArray(arr) ? arr : [])
  } catch { return new Set() }
}

function writeQuestServedFacts(factIds) {
  updateWtfData(wd => {
    if (!wd.quest) wd.quest = { level: 1, stars: {}, bossFailed: {}, bossWrongs: {} }
    const prev = new Set(wd.quest.servedFacts || [])
    factIds.forEach(id => prev.add(id))
    wd.quest.servedFacts = Array.from(prev)
  })
}

// ── Pick 5 Funny diversifiées (hors déjà débloquées ET déjà servies en Quest) ──
function pickDiverseFunny(pool, n, unlockedSet, servedSet) {
  const excludeSet = new Set([...unlockedSet, ...servedSet])
  const available = pool.filter(f => !excludeSet.has(f.id))
  const source = available.length >= n ? available : pool.filter(f => !unlockedSet.has(f.id))
  const finalSource = source.length >= n ? source : pool
  const shuffled = [...finalSource].sort(() => Math.random() - 0.5)
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

// ── Boss Quest : 3 plausible (spec 19/04/2026) — hardcore, pas d'indices funny ──
// Anti-déduction : exclut les fausses déjà vues lors d'un retry du même boss.
// Si plausible < 3 dispo après exclusion, fallback sur close puis funny.
function buildBossOptions(fact, excludeWrongs = []) {
  const correct = fact.shortAnswer || fact.options?.[fact.correctIndex]
  if (!correct) return getAnswerOptions(fact, QUEST_QCM)

  const excludeSet = new Set(excludeWrongs)
  const funny     = [fact.funnyWrong1, fact.funnyWrong2, fact.funnyWrong3].filter(Boolean)
  const close     = [fact.closeWrong1, fact.closeWrong2].filter(Boolean)
  const plausible = [fact.plausibleWrong1, fact.plausibleWrong2, fact.plausibleWrong3].filter(Boolean)

  // 1) Tenter 3 plausible, en excluant les fausses déjà vues
  const availablePlausible = plausible.filter(w => !excludeSet.has(w))
  const shuffledPlausible = [...availablePlausible].sort(() => Math.random() - 0.5)
  const picked = shuffledPlausible.slice(0, 3)

  // 2) Fallback si < 3 : compléter par close, puis funny (hors exclusions)
  if (picked.length < 3) {
    const used = new Set(picked)
    const fallbackPool = [...close, ...funny]
      .filter(w => !used.has(w) && !excludeSet.has(w))
    const extra = shuffle(fallbackPool)
    for (const w of extra) { if (picked.length >= 3) break; picked.push(w) }
  }

  // 3) Ultime fallback — toutes les fausses (incluant excludeSet) si toujours < 3
  if (picked.length < 3) {
    const used = new Set(picked)
    const anyExtra = [...funny, ...close, ...plausible].filter(w => !used.has(w))
    const extra = shuffle(anyExtra)
    for (const w of extra) { if (picked.length >= 3) break; picked.push(w) }
  }

  const all = shuffle([correct, ...picked.slice(0, 3)])
  return { options: all, correctIndex: all.indexOf(correct) }
}

// ── Construit une session de bloc : 10 funny + 1 boss préparé (conditionnel) ─
function buildBlockSession({ blockIdx, unlockedSet, servedSet = new Set(), bossOnly = false, bossExcludeWrongs = [] }) {
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
  const diverse = pickDiverseFunny(funnyPool, QUEST_BLOCK_SIZE, unlockedSet, servedSet)
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
  const [bossUnlocked, setBossUnlocked] = useState(false)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [energyState, setEnergyState] = useState(() => getQuickieEnergy())
  const [showEnergyModal, setShowEnergyModal] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [buyBossOffer, setBuyBossOffer] = useState(null)
  // Pending boss : retour carte → animation → overlay VIP → lancement boss
  const [pendingBoss, setPendingBoss] = useState(null) // { session, correctIds, funnyCount }
  const [bossAnimPhase, setBossAnimPhase] = useState(null) // 'travel' | 'overlay' | null
  // Pré-build session pour afficher les couleurs catégories sur la carte
  const [prebuiltSession, setPrebuiltSession] = useState(null)
  const [prebuiltNextSession, setPrebuiltNextSession] = useState(null)
  const [catTooltip, setCatTooltip] = useState(null)
  const mapRef = useRef(null)

  useEffect(() => {
    const refresh = () => setEnergyState(getQuickieEnergy())
    window.addEventListener('wtf_energy_updated', refresh)
    return () => window.removeEventListener('wtf_energy_updated', refresh)
  }, [])

  useEffect(() => {
    if (mapRef.current && !session && !pendingBoss) {
      const el = mapRef.current.querySelector('[data-current="true"]')
      el?.scrollIntoView({ block: 'center', behavior: 'instant' })
    }
  }, [session, state.level, pendingBoss])

  // Pré-build session bloc courant + suivant (couleurs catégories sur la carte)
  useEffect(() => {
    if (session || pendingBoss) return
    const unlockedSet = readUnlockedSet()
    const servedSet = readQuestServedSet()
    const curBlock = blockIdxOf(state.level)
    const s = buildBlockSession({ blockIdx: curBlock, unlockedSet, servedSet })
    setPrebuiltSession(s)
    const TOTAL_BLOCKS = Math.ceil(QUEST_MAX_LEVEL / QUEST_BLOCK_SIZE)
    if (curBlock < TOTAL_BLOCKS) {
      const s2 = buildBlockSession({ blockIdx: curBlock + 1, unlockedSet, servedSet })
      setPrebuiltNextSession(s2)
    } else {
      setPrebuiltNextSession(null)
    }
  }, [session, pendingBoss, state.level])

  // Pending boss animation sequence : travel (1.2s) → overlay (2.5s) → launch boss
  useEffect(() => {
    if (!pendingBoss) return
    setBossAnimPhase('travel')
    audio.play('click')
    const t1 = setTimeout(() => {
      setBossAnimPhase('overlay')
      audio.play('roulette_jackpot')
      audio.vibrate?.([40, 30, 80])
    }, 1200)
    const t2 = setTimeout(() => {
      const { session: sess, correctIds, funnyCount } = pendingBoss
      setBossAnimPhase(null)
      setPendingBoss(null)
      setBossUnlocked(true)
      setSession(sess)
      setQIndex(sess.facts.length) // bossFact
      setSelected(null)
      setPhase('question')
      setHintsUsed(0)
      setCorrectFactIds(correctIds)
      setFunnyCorrectCount(funnyCount)
    }, 3700)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [pendingBoss])

  useEffect(() => {
    setSelected(null); setTimedOut(false)
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

    // Utilise la session pré-construite (couleurs catégories déjà visibles sur la carte)
    const s = prebuiltSession || buildBlockSession({ blockIdx: currentBlockIdx, unlockedSet: readUnlockedSet(), servedSet: readQuestServedSet() })
    if (!s) return
    setPrebuiltSession(null)
    setSession(s); setQIndex(0); setPhase('question')
    setSelected(null); setCorrectFactIds([]); setFunnyCorrectCount(0)
    setBossCorrect(false); setBossUnlocked(false); setHintsUsed(0); setTimedOut(false); setImgFailed(false)
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

  // ── Achat énergie (200 coins) ─────────────────────────────────────────────
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

    // Persiste unlocked + served dans localStorage pour que le prochain bloc les exclue
    const allServedIds = sessionArg.facts.filter(f => !f._isBoss).map(f => f.id)
    if (allServedIds.length > 0) writeQuestServedFacts(allServedIds)
    if (toUnlock.size > 0) {
      updateWtfData(wd => {
        const prev = new Set(wd.unlockedFacts || [])
        toUnlock.forEach(id => prev.add(id))
        wd.unlockedFacts = Array.from(prev)
      })
    }

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
    audio.play(isCorrect ? 'correct' : 'buzzer')
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

    // Enchaînement : bonne réponse OU boss (même raté) → révélation, sinon saut direct
    setTimeout(() => {
      if (isCorrect || wasBoss) {
        setPhase('revelation')
      } else {
        advance(nextCorrectIds, nextFunnyCount, nextBossCorrect)
      }
    }, 650)
  }

  // ── Timeout : redirige vers revelation (mauvaise réponse) ──────────────────
  const handleTimeoutRef = useRef()
  handleTimeoutRef.current = () => {
    if (selected !== null || phase !== 'question' || timedOut) return
    const fact = currentFact()
    if (!fact) return
    setTimedOut(true)
    audio.play('timeout')
    audio.vibrate([120])
    setPhase('revelation')
  }
  const handleTimeout = useCallback(() => handleTimeoutRef.current?.(), [])

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
      setHintsUsed(0)
      setTimedOut(false)
      setImgFailed(false)
      setPhase('question')
      return
    }
    // 5e funny terminée → seuil boss ?
    const unlocked = funnyCount >= BOSS_THRESHOLD
    if (unlocked) {
      // Retour carte → animation vers boss → overlay VIP → lancement boss
      setPendingBoss({ session: sess, correctIds, funnyCount })
      setSession(null)
      return
    }
    // <3/5 : proposer l'achat d'accès au WTF!
    const missing = BOSS_THRESHOLD - funnyCount
    const cost = missing * 100
    setBuyBossOffer({ session: sess, correctIds, funnyCount, didBossCorrect, missing, cost })
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
  const currentHintCost = isBoss ? BOSS_HINT_COST : HINT_COST
  const buyHint = () => {
    if ((profileCoins ?? 0) < currentHintCost) return
    applyCurrencyDelta?.({ coins: -currentHintCost, hints: 1 }, 'buy_hint_in_session')
      ?.catch?.(e => console.warn('[QuestScreen] buy hint RPC failed:', e?.message || e))
  }

  // ═════════════════════════════════════════════════════════════════════════
  // MODAL ACHAT ACCÈS WTF!
  // ═════════════════════════════════════════════════════════════════════════
  if (buyBossOffer) {
    const { session: bSess, correctIds: bIds, funnyCount: bCount, didBossCorrect: bDid, missing, cost } = buyBossOffer
    const canBuy = (profileCoins ?? 0) >= cost
    const handleBuy = () => {
      applyCurrencyDelta?.({ coins: -cost }, 'buy_boss_access')
      setBuyBossOffer(null)
      setPendingBoss({ session: bSess, correctIds: bIds, funnyCount: bCount })
      setSession(null)
    }
    const handleDecline = () => {
      setBuyBossOffer(null)
      finalizeSession(bSess, bIds, bDid, false)
      setPhase('results')
    }
    return (
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        background: 'linear-gradient(160deg, #FFA50088, #FFA500)',
        color: '#fff', fontFamily: 'Nunito, sans-serif',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, '--scale': 1,
      }}>
        <div style={{
          background: '#FAFAF8', borderRadius: 20, padding: 24, width: '100%', maxWidth: 320,
          color: '#1a1a2e', textAlign: 'center',
        }}>
          <img src="/assets/modes/icon-quest.png?v=2" alt="" style={{ width: 48, height: 48, objectFit: 'contain', marginBottom: 8 }} />
          <h2 style={{ fontSize: 18, fontWeight: 900, margin: '0 0 6px' }}>Accès au F*ct WTF!</h2>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 4px', lineHeight: 1.5 }}>
            Tu as obtenu <b>{bCount}/{QUEST_BLOCK_SIZE}</b> bonnes réponses.
          </p>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 16px', lineHeight: 1.5 }}>
            Il te manque <b>{missing}</b> bonne{missing > 1 ? 's' : ''} réponse{missing > 1 ? 's' : ''}.
            <br />Achète l'accès pour <b>{cost} coins</b> !
          </p>
          <button
            onClick={handleBuy}
            disabled={!canBuy}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 12,
              background: canBuy ? '#FF6600' : '#E5E7EB',
              border: 'none',
              color: canBuy ? '#fff' : '#9CA3AF',
              fontWeight: 900, fontSize: 14, fontFamily: 'Nunito, sans-serif',
              cursor: canBuy ? 'pointer' : 'not-allowed',
            }}
          >
            {canBuy ? `Acheter (${cost} coins)` : `Pas assez de coins (${cost})`}
          </button>
          <button onClick={handleDecline} style={{
            width: '100%', padding: '10px 0', marginTop: 8,
            background: 'transparent', border: 'none', color: '#6B7280',
            fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
          }}>
            Non merci
          </button>
        </div>
      </div>
    )
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
    const isCorrectReveal = !timedOut && selected !== null && selected === fact.correctIndex
    const totalFunny = session?.bossOnly ? 1 : (session?.facts?.length || 10)
    const totalDisplay = session?.bossOnly ? 1 : totalFunny + (bossUnlocked ? 1 : 0)
    const displayIdx = session?.bossOnly ? 0 : (isBoss ? totalFunny : qIndex)
    const pointsEarned = isCorrectReveal ? (isBoss ? BOSS_BONUS : COINS_PER_CORRECT) : 0
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', '--scale': 1 }}>
        <RevelationScreen
          fact={fact}
          isCorrect={isCorrectReveal}
          selectedAnswer={timedOut ? -1 : (selected ?? 0)}
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
  // VUE CARTE (hub) — chemin sinueux vertical
  // ═════════════════════════════════════════════════════════════════════════
  if (!session) {
    const TOTAL_BLOCKS = Math.ceil(QUEST_MAX_LEVEL / QUEST_BLOCK_SIZE)
    // Compteur WTF! débloqués (boss réussis)
    const vipUnlocked = Object.values(state.stars || {}).filter(s => s === 3).length

    // 5 blocs affichés : bloc courant + 4 suivants
    const VIEW_BLOCKS = 5
    const viewStart = currentBlockIdx
    const viewEnd = Math.min(TOTAL_BLOCKS, viewStart + VIEW_BLOCKS - 1)
    const nodes = []
    for (let b = viewStart; b <= viewEnd; b++) {
      for (let i = 1; i <= QUEST_BLOCK_SIZE; i++) {
        const lvl = blockStartOf(b) + i - 1
        nodes.push({ level: lvl, block: b, indexInBlock: i, isBoss: false })
      }
      nodes.push({ level: blockBossLevelOf(b), block: b, indexInBlock: 0, isBoss: true })
    }

    // Couleurs catégories des facts (bloc courant + suivant) depuis prebuiltSessions
    const factCatColors = {}
    const factCatIds = {}
    const factCatLabels = {}
    const nextBlockIdx = currentBlockIdx + 1
    if (prebuiltSession?.facts) {
      prebuiltSession.facts.forEach((f, i) => {
        const cat = getCategoryById(f.category)
        const key = `${currentBlockIdx}_${i + 1}`
        factCatColors[key] = cat?.color || '#FF6B1A'
        factCatIds[key] = f.category
        factCatLabels[key] = cat?.label || ''
      })
    }
    if (prebuiltNextSession?.facts) {
      prebuiltNextSession.facts.forEach((f, i) => {
        const cat = getCategoryById(f.category)
        const key = `${nextBlockIdx}_${i + 1}`
        factCatColors[key] = cat?.color || '#FF6B1A'
        factCatIds[key] = f.category
        factCatLabels[key] = cat?.label || ''
      })
    }

    // Positions zigzag
    const NODE_GAP = 40
    const MAP_WIDTH = 300
    const MARGIN_X = 50
    const BOTTOM_DOTS = 110
    const getNodePos = (idx) => {
      if (idx === 0) return { x: MAP_WIDTH / 2, y: BOTTOM_DOTS }
      const cycle = Math.floor(idx / 6)
      const pos = idx % 6
      const absBlock = viewStart + cycle
      const goingRight = ((absBlock * 2654435761) >>> 0) % 2 === 0
      const xSteps = [0, 0.4, 0.85, 1, 0.6, 0.15]
      const rawX = xSteps[pos]
      const x = goingRight ? rawX : (1 - rawX)
      return {
        x: MARGIN_X + x * (MAP_WIDTH - MARGIN_X * 2),
        y: BOTTOM_DOTS + idx * NODE_GAP,
      }
    }

    const currentLevel = state.level
    const currentNodeIdx = nodes.findIndex(n => n.level >= currentLevel)
    const playerIdx = currentNodeIdx >= 0 ? currentNodeIdx : 0
    const bossNodeIdx = nodes.findIndex(n => n.isBoss && n.block === currentBlockIdx)
    const DOTS_TOP = 80
    const totalHeight = BOTTOM_DOTS + nodes.length * NODE_GAP + DOTS_TOP + 40

    // SVG path
    const pathPoints = nodes.map((_, i) => getNodePos(i))
    const pathD = pathPoints.reduce((d, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`
      const prev = pathPoints[i - 1]
      const cpY = (prev.y + p.y) / 2
      return d + ` C ${prev.x} ${cpY}, ${p.x} ${cpY}, ${p.x} ${p.y}`
    }, '')

    // Pointillés haut (après le dernier node) et bas (niveaux passés)
    const lastPos = pathPoints[pathPoints.length - 1]
    const dotsTopY = lastPos ? lastPos.y + NODE_GAP * 0.6 : 0
    const dotsTopX = lastPos ? lastPos.x : MAP_WIDTH / 2
    const firstPos = pathPoints[0]
    const dotsBotX = firstPos ? firstPos.x : MAP_WIDTH / 2
    const dotsBotY = firstPos ? firstPos.y - NODE_GAP * 0.5 : 0

    return (
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        background: 'linear-gradient(160deg, #FFA50088, #FFA500)',
        color: '#fff', fontFamily: 'Nunito, sans-serif',
        display: 'flex', flexDirection: 'column',
        '--scale': 1,
      }}>
        {/* Header fixe */}
        <div style={{ flexShrink: 0, padding: '16px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <button onClick={() => { if (!pendingBoss) onHome() }} style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: 18,
              cursor: pendingBoss ? 'default' : 'pointer', padding: 0, width: 36, height: 36, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)',
              opacity: pendingBoss ? 0.3 : 1,
            }}>←</button>
            <h1 style={{ fontSize: 18, fontWeight: 900, margin: 0, flex: 1, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <img src="/assets/modes/icon-quest.png" alt="quest" style={{ width: 24, height: 24, objectFit: 'contain' }} />
              Quête WTF!
            </h1>
            <button onClick={() => setShowSettings(true)} style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
              width: 36, height: 36, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', backdropFilter: 'blur(8px)', padding: 0,
            }}>
              <img src="/assets/ui/icon-settings.png" alt="settings" style={{ width: 16, height: 16 }} />
            </button>
          </div>
          <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
            Niveau <b>{state.level}</b> / {QUEST_MAX_LEVEL}
          </div>
        </div>

        {/* Zone scrollable — chemin inversé (bas = début, haut = avancé) */}
        <div ref={mapRef} onClick={(e) => { if (e.target === e.currentTarget || !e.target.closest('[data-cat-node]')) setCatTooltip(null) }} style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden',
          position: 'relative',
        }}>
          <div style={{
            position: 'relative', width: MAP_WIDTH, height: totalHeight,
            margin: '0 auto',
            transform: 'scaleY(-1)',
          }}>
            {/* Chemin SVG */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <path d={pathD} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="5" strokeLinecap="round" />
              {playerIdx > 0 && (() => {
                const doneD = pathPoints.slice(0, playerIdx + 1).reduce((d, p, i) => {
                  if (i === 0) return `M ${p.x} ${p.y}`
                  const prev = pathPoints[i - 1]
                  const cpY = (prev.y + p.y) / 2
                  return d + ` C ${prev.x} ${cpY}, ${p.x} ${cpY}, ${p.x} ${p.y}`
                }, '')
                return <path d={doneD} fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.6" />
              })()}
              {/* Pointillés haut (niveaux à venir) */}
              {[0, 1, 2].map(i => (
                <circle key={`dot-top-${i}`} cx={dotsTopX} cy={dotsTopY + i * 18} r="4" fill="rgba(255,255,255,0.35)" />
              ))}
              {/* Pointillés bas (niveaux passés) */}
              {currentBlockIdx > 1 && [0, 1].map(i => (
                <circle key={`dot-bot-${i}`} cx={dotsBotX} cy={dotsBotY - i * 18} r="4" fill="rgba(255,255,255,0.35)" />
              ))}
              {/* 1 pointillé entre étoile et premier node */}
              {(() => {
                const pp = getNodePos(playerIdx)
                const starCenterY = pp.y - 38
                return (
                  <>
                    <circle cx={MAP_WIDTH / 2} cy={(pp.y + starCenterY) / 2} r="4" fill="rgba(255,255,255,0.5)" />
                    {/* 3 pointillés sous l'étoile */}
                    {[1, 2, 3].map(i => (
                      <circle key={`dot-below-${i}`} cx={MAP_WIDTH / 2} cy={starCenterY - i * 16} r="4" fill="rgba(255,255,255,0.35)" />
                    ))}
                  </>
                )
              })()}
            </svg>

            {/* Nodes */}
            {nodes.map((node, i) => {
              const pos = getNodePos(i)
              const isDone = node.level < currentLevel
              const isCurrent = i === playerIdx
              const isLocked = node.level > currentLevel
              const failedBoss = node.isBoss && state.bossFailed?.[node.block]
              const FACT_SIZE = 34
              const BOSS_SIZE = 44
              const nodeSize = node.isBoss ? BOSS_SIZE : FACT_SIZE
              const halfSize = nodeSize / 2

              // Couleur catégorie pour les facts du bloc courant ou suivant
              const nodeKey = `${node.block}_${node.indexInBlock}`
              const hasPrebuiltCat = !node.isBoss && factCatColors[nodeKey]
              const catColor = hasPrebuiltCat ? factCatColors[nodeKey] : '#FF6B1A'

              return (
                <div
                  key={`${node.block}-${node.indexInBlock}-${node.isBoss ? 'boss' : 'f'}`}
                  data-current={isCurrent ? 'true' : 'false'}
                  style={{
                    position: 'absolute',
                    left: pos.x - halfSize,
                    top: pos.y - halfSize,
                    width: nodeSize,
                    height: nodeSize,
                    transform: 'scaleY(-1)',
                  }}
                >
                  {node.isBoss ? (
                    <button
                      onClick={() => {
                        if (isCurrent) launchBlock()
                        else if (isDone && failedBoss) launchBossRetry(node.block)
                      }}
                      style={{
                        width: BOSS_SIZE, height: BOSS_SIZE, borderRadius: '50%',
                        background: isDone && !failedBoss
                          ? 'linear-gradient(135deg, #FFD700, #FFA500)'
                          : failedBoss
                            ? 'linear-gradient(135deg, #E84535, #8B0000)'
                            : 'linear-gradient(135deg, #FFD700, #FFAA00)',
                        border: `3px solid ${isDone && !failedBoss ? '#FFD700' : failedBoss ? '#E84535' : '#FFD700'}`,
                        boxShadow: isCurrent
                          ? '0 0 24px rgba(255,215,0,0.8), 0 0 8px rgba(255,215,0,0.5)'
                          : '0 0 12px rgba(255,215,0,0.3)',
                        cursor: (isCurrent || (isDone && failedBoss)) ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 0,
                        animation: (isCurrent || (node.block === currentBlockIdx)) ? 'questBossPulse 2s ease-in-out infinite' : 'none',
                        opacity: (isLocked && node.block !== currentBlockIdx && node.block !== nextBlockIdx) ? 0.35
                          : (isLocked && node.block === nextBlockIdx) ? 0.55 : 1,
                      }}
                    >
                      <img src="/assets/modes/icon-quest.png" alt="WTF!" style={{
                        width: BOSS_SIZE * 0.6, height: BOSS_SIZE * 0.6, objectFit: 'contain',
                        filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.4))',
                      }} />
                    </button>
                  ) : (
                    <div
                      data-cat-node="true"
                      onClick={() => {
                        if (hasPrebuiltCat && factCatLabels[nodeKey]) {
                          setCatTooltip(prev => prev === nodeKey ? null : nodeKey)
                        }
                      }}
                      style={{
                        width: FACT_SIZE, height: FACT_SIZE, borderRadius: '50%',
                        background: isDone ? '#ffffff' : hasPrebuiltCat ? catColor : '#FF6B1A',
                        border: isDone
                          ? '2.5px solid rgba(255,255,255,0.9)'
                          : isCurrent
                            ? `2.5px solid #fff`
                            : `2.5px solid ${hasPrebuiltCat ? catColor + '80' : 'rgba(255,255,255,0.4)'}`,
                        opacity: isLocked && !hasPrebuiltCat ? 0.3
                          : (isLocked && node.block === nextBlockIdx) ? 0.65 : 1,
                        transition: 'all 0.3s ease',
                        boxShadow: isCurrent
                          ? `0 0 16px rgba(255,255,255,0.8), 0 0 6px ${catColor}99`
                          : isDone
                            ? '0 0 8px rgba(255,255,255,0.3)'
                            : 'none',
                        animation: isCurrent ? 'questNodePulse 1.5s ease-in-out infinite' : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden',
                        cursor: hasPrebuiltCat ? 'pointer' : 'default',
                        position: 'relative',
                      }}
                    >
                      {hasPrebuiltCat && factCatIds[nodeKey] && (
                        <img src={`/assets/categories/${factCatIds[nodeKey]}.png`} alt=""
                          style={{ width: FACT_SIZE * 0.65, height: FACT_SIZE * 0.65, objectFit: 'contain', flexShrink: 0 }} />
                      )}
                      {isDone && !hasPrebuiltCat && (
                        <span style={{ fontSize: FACT_SIZE * 0.45, lineHeight: 1, color: '#FF6B1A' }}>✓</span>
                      )}
                      {catTooltip === nodeKey && factCatLabels[nodeKey] && (
                        <div style={{
                          position: 'absolute', bottom: '110%', left: '50%',
                          transform: 'translateX(-50%) scaleY(-1)',
                          background: 'rgba(0,0,0,0.85)', color: '#fff',
                          padding: '4px 10px', borderRadius: 8, fontSize: 11,
                          fontWeight: 700, whiteSpace: 'nowrap', zIndex: 20,
                          pointerEvents: 'none',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        }}>
                          {factCatLabels[nodeKey]}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Étoile joueur — centrée horizontalement, anime vers boss si pendingBoss */}
            {(() => {
              const startPos = getNodePos(playerIdx)
              const targetPos = bossAnimPhase === 'travel' && bossNodeIdx >= 0
                ? getNodePos(bossNodeIdx)
                : startPos
              const isAnimating = bossAnimPhase === 'travel'
              return (
                <div style={{
                  position: 'absolute',
                  left: isAnimating ? (targetPos.x - 18) : (MAP_WIDTH / 2 - 18),
                  top: (isAnimating ? targetPos.y : startPos.y) - 56,
                  transform: 'scaleY(-1)',
                  textAlign: 'center',
                  pointerEvents: 'none',
                  animation: isAnimating ? 'none' : 'questFloat 2s ease-in-out infinite',
                  transition: isAnimating ? 'left 1s cubic-bezier(0.25, 0.46, 0.45, 0.94), top 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
                  zIndex: 10,
                }}>
                  <img src="/assets/ui/wtf-star.png" alt="player" style={{
                    width: 36, height: 36, objectFit: 'contain',
                    filter: 'drop-shadow(0 2px 10px rgba(255,215,0,0.8))',
                  }} />
                </div>
              )
            })()}
          </div>
        </div>

        {/* Overlay VIP Boss */}
        {bossAnimPhase === 'overlay' && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 60,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(circle at center, rgba(255,215,0,0.25) 0%, rgba(0,0,0,0.75) 70%)',
            backdropFilter: 'blur(4px)',
            pointerEvents: 'none',
            animation: 'questVipFade 2.5s ease-out forwards',
          }}>
            <div style={{
              textAlign: 'center',
              animation: 'questVipPop 2.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            }}>
              <img src="/assets/ui/wtf-star.png" alt="" style={{
                width: 64, height: 64, objectFit: 'contain', marginBottom: 8,
                filter: 'drop-shadow(0 0 20px rgba(255,215,0,0.9))',
              }} />
              <div style={{
                fontSize: 30, fontWeight: 900, letterSpacing: '0.06em',
                color: '#FFD700',
                textShadow: '0 0 24px rgba(255,215,0,0.8), 0 2px 8px rgba(0,0,0,0.5)',
                textTransform: 'uppercase', fontFamily: 'Nunito, sans-serif',
              }}>
                F*CT WTF!
              </div>
              <div style={{
                fontSize: 14, fontWeight: 800, marginTop: 8,
                color: '#FFE8A0', letterSpacing: '0.04em',
                textShadow: '0 1px 4px rgba(0,0,0,0.5)', fontFamily: 'Nunito, sans-serif',
              }}>
                Un f*ct rare t'attend !
              </div>
            </div>
          </div>
        )}

        {/* Bouton CTA — masqué pendant l'animation */}
        {!pendingBoss && (
        <div style={{
          flexShrink: 0, padding: '8px 20px 16px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        }}>
          <button
            onClick={launchBlock}
            style={{
              width: '85%', padding: '10px 0 8px',
              background: '#FF6600',
              border: '3px solid #ffffff',
              borderRadius: 16,
              fontFamily: 'Nunito, sans-serif',
              fontSize: 16, fontWeight: 900,
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: '0 8px 30px rgba(255,102,0,0.5), 0 4px 0 rgba(0,0,0,0.15)',
              letterSpacing: '0.03em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '14px 0',
            }}
          >
            Niveau {state.level}
            <span style={{ fontSize: 20, lineHeight: 1, display: 'inline-block', transform: 'scaleX(1.8)' }}>→</span>
            <img src="/assets/modes/icon-quest.png" alt="" style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0 }} />
          </button>
          {state.bossFailed?.[currentBlockIdx - 1] && currentBlockIdx > 1 && (
            <button
              onClick={() => launchBossRetry(currentBlockIdx - 1)}
              style={{
                background: 'rgba(255,255,255,0.15)', border: '1.5px solid #fff',
                borderRadius: 10, padding: '8px 20px',
                color: '#fff', fontWeight: 800, fontSize: 12,
                cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
              }}
            >
              🔒 Rejouer WTF! Set {currentBlockIdx - 1}
            </button>
          )}
        </div>
        )}

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

        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

        <style>{`
          @keyframes questNodePulse { 0%,100%{transform:scale(1); box-shadow: 0 0 16px rgba(255,255,255,0.8)} 50%{transform:scale(1.25); box-shadow: 0 0 24px rgba(255,255,255,1)} }
          @keyframes questBossPulse { 0%,100%{transform:scale(1); box-shadow: 0 0 24px rgba(255,215,0,0.8)} 50%{transform:scale(1.15); box-shadow: 0 0 36px rgba(255,215,0,1)} }
          @keyframes questFloat { 0%,100%{transform:scaleY(-1) translateY(0)} 50%{transform:scaleY(-1) translateY(-6px)} }
          @keyframes questVipFade { 0%{opacity:0} 15%{opacity:1} 85%{opacity:1} 100%{opacity:0} }
          @keyframes questVipPop { 0%{transform:scale(0.3) rotate(-10deg)} 25%{transform:scale(1.15) rotate(3deg)} 45%{transform:scale(0.95) rotate(-1deg)} 60%,100%{transform:scale(1) rotate(0deg)} }
        `}</style>
      </div>
    )
  }

  // ═════════════════════════════════════════════════════════════════════════
  // VUE QUESTION — squelette Quickie
  // ═════════════════════════════════════════════════════════════════════════
  const cat = getCategoryById(fact.category)
  const catColor = cat?.color || '#FF6B1A'
  const questAccent = isBoss ? '#FFA500' : '#FFA500'
  const bossGold = '#FFD700'
  const screenBg = isBoss
    ? '#1a1a2e'
    : `linear-gradient(160deg, ${catColor}22 0%, ${catColor} 100%)`
  const totalFunny = session.bossOnly ? 0 : session.facts.length
  const displayIndex = isBoss ? totalFunny : qIndex
  const displayTotal = totalFunny + (bossUnlocked || isBoss ? 1 : 0) || 1
  const cardBorderColor = isBoss ? bossGold : questAccent
  const cardBoxShadow = isBoss ? '0 0 20px rgba(255,215,0,0.3)' : 'none'
  const btnBorderColor = isBoss ? bossGold : questAccent

  return (
    <div
      className="relative screen-enter"
      style={{
        height: '100%', width: '100%', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
        boxSizing: 'border-box', background: screenBg,
        color: '#fff', fontFamily: 'Nunito, sans-serif', '--scale': 1,
        position: 'relative',
      }}
    >
      {/* Particules gold flottantes — boss uniquement */}
      {isBoss && (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: i % 3 === 0 ? 4 : i % 3 === 1 ? 3 : 2,
              height: i % 3 === 0 ? 4 : i % 3 === 1 ? 3 : 2,
              borderRadius: '50%',
              background: `rgba(255,215,0,${0.3 + (i % 4) * 0.15})`,
              boxShadow: `0 0 ${4 + (i % 3) * 3}px rgba(255,215,0,${0.2 + (i % 3) * 0.1})`,
              left: `${5 + (i * 37) % 90}%`,
              top: `${3 + (i * 53) % 94}%`,
              animation: `questParticleFloat${i % 3} ${4 + (i % 4) * 1.5}s ${(i * 0.7) % 3}s ease-in-out infinite`,
            }} />
          ))}
        </div>
      )}
      {/* Header */}
      <GameHeader
        categoryLabel={cat?.label || 'Quest'}
        categoryColor={catColor}
        categoryIcon={fact.category ? `/assets/categories/${fact.category}.png` : null}
        playerCoins={profileCoins}
        playerHints={profileHints}
        onQuit={() => setSession(null)}
      />

      {/* Mode label + compteur + progress */}
      <div style={{ height: S(56), flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: `${S(2)} ${S(16)} ${S(4)}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(6) }}>
          {isBoss ? (
            <>
              <img src="/assets/modes/icon-quest.png?v=2" alt="" style={{ width: S(18), height: S(18), objectFit: 'contain' }} />
              <span style={{
                fontSize: S(11), fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: bossGold, textShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }}>
                F*ct WTF!
              </span>
            </>
          ) : (
            <>
              <img src="/assets/modes/icon-quest.png?v=2" alt="" style={{ width: S(18), height: S(18), objectFit: 'contain' }} />
              <span style={{
                fontSize: S(11), fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase',
                color: questAccent, textShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}>
                QUEST
              </span>
            </>
          )}
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: S(12), fontWeight: 900, color: isBoss ? bossGold : questAccent }}>
            {displayIndex + 1}/{displayTotal}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: S(3) }}>
          {Array.from({ length: displayTotal }).map((_, i) => {
            const isActive = i === displayIndex
            const isBossSegment = i === totalFunny && (bossUnlocked || isBoss)
            const segColor = isActive
              ? (isBossSegment ? bossGold : questAccent)
              : (isBossSegment ? `${bossGold}40` : 'rgba(255,255,255,0.2)')
            return (
              <div key={i} style={{
                flex: 1,
                height: isActive ? S(12) : S(8),
                borderRadius: S(4),
                background: segColor,
                transition: 'all 0.3s ease',
              }} />
            )
          })}
        </div>
      </div>

      {/* Bloc contenu : question + indices + QCM */}
      <div style={{
        height: S(270), flexShrink: 0, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
        padding: `${S(4)} ${S(16)} 0`,
      }}>
        {/* Card question */}
        <div style={{
          padding: `${S(12)} ${S(16)}`,
          borderRadius: S(16),
          background: 'rgba(0,0,0,0.28)',
          border: `3px solid ${cardBorderColor}`,
          backdropFilter: 'blur(12px)',
          boxShadow: isBoss ? `0 0 16px ${bossGold}80, 0 0 32px ${bossGold}40` : cardBoxShadow,
          height: S(72), flexShrink: 0, overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <p style={{ color: '#ffffff', fontSize: S(15), fontWeight: 800, textAlign: 'center', lineHeight: 1.4, margin: 0 }}>
            {renderFormattedText(fact.question || fact.fact || '', isBoss ? bossGold : catColor, { noUnderline: true })}
          </p>
        </div>

        {/* Indices */}
        <div>
          {availableHints.length > 0 && (
            <div style={{
              display: 'grid', gridTemplateColumns: availableHints.length === 1 ? '1fr' : '1fr 1fr',
              gap: 8,
              ...(isBoss ? { filter: `drop-shadow(0 0 8px ${bossGold}80)` } : {}),
            }}>
              {availableHints.map((h, i) => {
                const hintNum = i + 1
                const hasStock = (profileHints ?? 0) > 0
                const hCost = isBoss ? BOSS_HINT_COST : HINT_COST
                const canAfford = hasStock || (profileCoins ?? 0) >= hCost
                const canUse = hasStock
                return (
                  <HintFlipButton
                    key={`${fact.id}-${qIndex}-h${hintNum}`}
                    num={hintNum}
                    hint={h}
                    catColor={isBoss ? bossGold : questAccent}
                    isFree={false}
                    cost={hCost}
                    canAfford={canAfford}
                    canUse={canUse}
                    initialRevealed={hintsUsed >= hintNum}
                    onReveal={() => useHint(hintNum)}
                    onBuyHint={!canUse && canAfford ? buyHint : null}
                    revealedTextColor={isBoss ? bossGold : questAccent}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* QCM 4 choix — style Quickie (fond blanc, bordure accent) */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: S(5),
          flexShrink: 0, position: 'relative', zIndex: 5,
          ...(isBoss ? { filter: `drop-shadow(0 0 8px ${bossGold}80)` } : {}),
        }}>
          {fact.options.map((opt, i) => {
            const isSel = selected === i
            const isWrongPick = isSel && i !== fact.correctIndex
            const isRightPick = isSel && i === fact.correctIndex
            const bg = isWrongPick
              ? 'rgba(232,69,53,0.55)'
              : isRightPick
                ? 'rgba(107,203,119,0.55)'
                : '#FFFFFF'
            const border = isWrongPick
              ? '3px solid #E84535'
              : isRightPick
                ? '3px solid #6BCB77'
                : `3px solid ${btnBorderColor}`
            const optLen = opt?.length || 0
            const btnFont = optLen > 40 ? 10 : optLen > 25 ? 11 : 12
            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={selected !== null}
                className="btn-press active:scale-95"
                style={{
                  background: bg, border, borderRadius: S(12),
                  color: (isWrongPick || isRightPick) ? '#fff' : (catColor || '#4A3FA3'),
                  fontWeight: 800, fontSize: S(btnFont), lineHeight: 1.2,
                  padding: `${S(4)} ${S(6)}`, height: S(50), width: '100%',
                  overflow: 'hidden', wordBreak: 'break-word',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  textAlign: 'center', cursor: selected === null ? 'pointer' : 'default',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'transform 0.1s, background 0.15s',
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

      {/* Image floutée + timer */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: S(8) }}>
        {/* Image floutée avec cadenas */}
        <div style={{
          position: 'relative',
          width: '55%', aspectRatio: '1 / 1',
          borderRadius: S(12), overflow: 'hidden',
          margin: '0 auto',
          background: 'rgba(0,0,0,0.3)',
          border: `3px solid ${isBoss ? bossGold : questAccent}`,
          ...(isBoss ? { boxShadow: `0 0 20px ${bossGold}80, 0 0 40px ${bossGold}40` } : {}),
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
              <FallbackImage categoryColor={catColor} />
            </div>
          )}
          {/* Holo shimmer — boss uniquement */}
          {isBoss && (
            <>
              <div style={{
                position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
                background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.15) 30%, rgba(127,119,221,0.2) 38%, rgba(255,215,0,0.15) 44%, rgba(0,188,212,0.15) 50%, rgba(255,64,129,0.15) 56%, rgba(127,119,221,0.2) 62%, rgba(255,255,255,0.15) 70%, transparent 80%)',
                backgroundSize: '200% 100%',
                animation: 'questHoloShimmer 3s linear infinite',
                mixBlendMode: 'screen',
              }} />
              <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute', top: '-20%', bottom: '-20%', width: '45%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
                  animation: 'questHoloSweep 2.5s 0.5s ease-in-out infinite',
                }} />
              </div>
            </>
          )}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: S(4), padding: `0 ${S(10)}` }}>
              <span style={{ fontSize: S(28), filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}>
                🔒
              </span>
              <span style={{
                fontSize: S(9), fontWeight: 700, color: 'rgba(255,255,255,0.85)',
                textAlign: 'center', textShadow: '0 1px 3px rgba(0,0,0,0.6)', lineHeight: 1.3,
              }}>
                Trouve la bonne réponse et ajoute ce f*ct à ta collection
              </span>
            </div>
          </div>
        </div>

        {/* Timer */}
        <div style={{ width: S(96), height: S(96), display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <CircularTimer
            key={`${fact.id}-${qIndex}`}
            size={96}
            duration={QUEST_DURATION}
            paused={selected !== null || timedOut}
            onTimeout={handleTimeout}
          />
        </div>
      </div>

      {isBoss && (
        <style>{`
          @keyframes questHoloShimmer { 0% { background-position: 0% 50% } 100% { background-position: 200% 50% } }
          @keyframes questHoloSweep { 0% { transform: translateX(-100%) skewX(-15deg) } 100% { transform: translateX(200%) skewX(-15deg) } }
          @keyframes questParticleFloat0 { 0%,100% { transform: translateY(0) scale(1); opacity: 0.4 } 50% { transform: translateY(-18px) scale(1.3); opacity: 0.9 } }
          @keyframes questParticleFloat1 { 0%,100% { transform: translateY(0) translateX(0) scale(1); opacity: 0.3 } 50% { transform: translateY(-12px) translateX(8px) scale(1.2); opacity: 0.8 } }
          @keyframes questParticleFloat2 { 0%,100% { transform: translateY(0) translateX(0) scale(1); opacity: 0.5 } 50% { transform: translateY(-22px) translateX(-6px) scale(1.4); opacity: 1 } }
        `}</style>
      )}
    </div>
  )
}
