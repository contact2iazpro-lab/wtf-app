/**
 * QuestRoute — Flow Quest simple et autonome.
 *
 * RÈGLE : ZÉRO état de devises ici. Tout est lu via getBalances() / loadStorage()
 * au moment où c'est nécessaire. Les modifications passent par updateCoins/updateTickets
 * qui notifient le reste de l'app via events.
 *
 * Flow : [LAUNCH] → DIFFICULTY → QUESTION ↔ REVELATION → RESULTS
 *        "Rejouer" → retour à DIFFICULTY
 *        "Accueil" → navigate('/')
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DIFFICULTY_LEVELS, MODE_CONFIGS, QUESTIONS_PER_GAME, getStreakReward } from '../constants/gameConfig'
import { getValidFacts, getParcoursFacts, getQuestFacts, getCategoryLevelFactIds } from '../data/factsService'
import { getAnswerOptions } from '../utils/answers'
import { loadStorage, saveStorage, updateTrophyData, TODAY } from '../utils/storageHelper'
import { updateCoins, updateTickets, updateHints, getBalances } from '../services/currencyService'
import { useCurrency } from '../context/CurrencyContext'
import { updateCollection } from '../services/collectionService'
import { syncAfterAction } from '../services/playerSyncService'
import { checkBadges } from '../utils/badgeManager'
import { useAuth } from '../context/AuthContext'
import { audio } from '../utils/audio'

import ModeLaunchScreen from '../screens/ModeLaunchScreen'
import DifficultyScreen from '../screens/DifficultyScreen'
import QuestionScreen from '../screens/QuestionScreen'
import RevelationScreen from '../screens/RevelationScreen'
import ResultsScreen from '../screens/ResultsScreen'
import GameModal from '../components/GameModal'

export default function QuestRoute() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { coins, tickets, hints } = useCurrency()

  // ── Seul état local : l'écran courant ──────────────────────────────────
  const [screen, setScreen] = useState('loading')

  // ── Session data dans un ref (pas de re-render, pas de closure stale) ──
  const session = useRef({
    facts: [],
    index: 0,
    score: 0,
    correctCount: 0,
    hintsUsed: 0,
    anyHintUsed: false,
    correctFacts: [],
    difficulty: null,
    answer: null,
    correct: null,
    points: 0,
  })

  // ── Pour forcer un re-render quand le ref change ───────────────────────
  const [tick, setTick] = useState(0)
  const bump = () => setTick(t => t + 1)

  // ── Modals ─────────────────────────────────────────────────────────────
  const [noTicket, setNoTicket] = useState(false)
  const [trophies, setTrophies] = useState([])
  const [endData, setEndData] = useState(null)

  // ── Raccourcis ─────────────────────────────────────────────────────────
  const s = session.current
  const fact = s.facts[s.index] || null

  // ── Au mount : décider du premier écran ────────────────────────────────
  useEffect(() => {
    const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    if ((wd.questsPlayed || 0) === 0) {
      // Première Quest : aller directement à la difficulté (pas de page règles)
      setScreen('difficulty')
    } else {
      const skip = localStorage.getItem('skip_launch_quest') === 'true'
      setScreen(skip ? 'difficulty' : 'launch')
    }
  }, [])

  // ══════════════════════════════════════════════════════════════════════
  // LANCER UNE QUEST
  // ══════════════════════════════════════════════════════════════════════
  const launchQuest = useCallback((difficulty, firstEver = false) => {
    const isDev = localStorage.getItem('wtf_dev_mode') === 'true' || localStorage.getItem('wtf_test_mode') === 'true'

    // Ticket check — lu FRAIS, pas depuis un state
    if (!isDev && !firstEver) {
      if (getBalances().tickets < 1) {
        setNoTicket(true)
        return
      }
      updateTickets(-1)
    }

    // Facts pool — lu FRAIS
    const { unlockedFacts } = loadStorage()
    let pool = getParcoursFacts().filter(f => f.isVip && f.difficulty === difficulty.id && (isDev || !unlockedFacts.has(f.id)))
    if (pool.length < QUESTIONS_PER_GAME) pool = getParcoursFacts().filter(f => f.isVip && (isDev || !unlockedFacts.has(f.id)))
    if (pool.length < QUESTIONS_PER_GAME) pool = getQuestFacts()
    if (pool.length < QUESTIONS_PER_GAME) pool = getValidFacts()

    const facts = [...pool].sort(() => Math.random() - 0.5).slice(0, QUESTIONS_PER_GAME)
      .map(f => ({ ...f, ...getAnswerOptions(f, difficulty) }))

    // Reset session ref
    session.current = {
      facts, index: 0, score: 0, correctCount: 0, hintsUsed: 0,
      anyHintUsed: false, correctFacts: [], difficulty,
      answer: null, correct: null, points: 0,
    }
    setEndData(null)
    bump()
    setScreen('question')
  }, [])

  // ══════════════════════════════════════════════════════════════════════
  // RÉPONDRE
  // ══════════════════════════════════════════════════════════════════════
  const onAnswer = useCallback((answerIndex) => {
    const f = session.current.facts[session.current.index]
    if (!f) return
    const ok = answerIndex === f.correctIndex
    const pts = ok ? (session.current.difficulty?.coinsPerCorrect ?? 0) : 0

    session.current.answer = answerIndex
    session.current.correct = ok
    session.current.points = pts
    if (ok) {
      session.current.score += pts
      session.current.correctCount++
      session.current.correctFacts.push(f)
      if (pts > 0) updateCoins(pts)
    }
    bump()
    setScreen('revelation')
  }, [])

  const onValidate = useCallback((ok) => {
    const f = session.current.facts[session.current.index]
    const pts = ok ? (session.current.difficulty?.coinsPerCorrect ?? 0) : 0
    session.current.answer = ok ? 100 : -2
    session.current.correct = ok
    session.current.points = pts
    if (ok && f) {
      session.current.score += pts
      session.current.correctCount++
      session.current.correctFacts.push(f)
      if (pts > 0) updateCoins(pts)
    }
    bump()
    setScreen('revelation')
  }, [])

  const onTimeout = useCallback(() => {
    if (session.current.answer !== null) return
    session.current.answer = -1
    session.current.correct = false
    session.current.points = 0
    bump()
    setScreen('revelation')
  }, [])

  const onHint = useCallback((n) => {
    const free = session.current.difficulty?.freeHints || 0
    if (n > free) {
      if (getBalances().hints < 1) return
      updateHints(-1)
    }
    session.current.hintsUsed = n
    session.current.anyHintUsed = true
    bump()
  }, [])

  // ══════════════════════════════════════════════════════════════════════
  // SUIVANT (question suivante OU fin de session)
  // ══════════════════════════════════════════════════════════════════════
  const onNext = useCallback(() => {
    const s = session.current
    const next = s.index + 1

    if (next < s.facts.length) {
      // Question suivante
      s.index = next
      s.hintsUsed = 0
      s.answer = null
      s.correct = null
      s.points = 0
      bump()
      setScreen('question')
      return
    }

    // ── FIN DE SESSION ────────────────────────────────────────────────
    const store = loadStorage()
    const isFirstToday = store.sessionsToday === 0
    const newStreak = isFirstToday ? store.streak + 1 : store.streak

    // Unlock facts
    const unlocked = new Set(store.unlockedFacts)
    const toSync = []
    const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    if (wd.onboardingCompleted) {
      for (const f of s.correctFacts) {
        if (!unlocked.has(f.id)) { unlocked.add(f.id); toSync.push(f) }
      }
    }

    // Completed levels
    const completed = []
    for (const f of toSync) {
      if (!f.difficulty) continue
      const key = `${f.category}_${f.difficulty}`
      const lvl = getCategoryLevelFactIds()[key]
      if (lvl && [...lvl].every(id => unlocked.has(id))) {
        if (!completed.find(c => c.catId === f.category && c.difficulty === f.difficulty))
          completed.push({ catId: f.category, difficulty: f.difficulty })
      }
    }

    // Unlock categories
    const cats = wd.unlockedCategories || ['sport', 'records', 'animaux', 'kids', 'definition']
    const newCats = []
    for (const f of toSync) {
      if (f.category && !cats.includes(f.category)) { cats.push(f.category); newCats.push(f.category) }
    }
    if (newCats.length > 0) {
      wd.unlockedCategories = cats; wd.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(wd))
    }

    // Perfect + bonus
    const isPerfect = s.correctCount === s.facts.length
    let bonus = isPerfect ? 10 : 0
    const streakR = isFirstToday ? getStreakReward(newStreak) : null
    bonus += streakR?.coins ?? 0
    const bonusTickets = (isPerfect ? 1 : 0) + (streakR?.tickets ?? 0)
    if (bonus > 0) updateCoins(bonus)
    if (bonusTickets > 0) updateTickets(bonusTickets)
    if (streakR?.hints > 0) updateHints(streakR.hints)

    // Save storage
    saveStorage({
      totalScore: store.totalScore + s.score,
      streak: newStreak,
      unlockedFacts: unlocked,
      wtfCoins: getBalances().coins,
      wtfDuJourDate: store.wtfDuJourDate,
      sessionsToday: store.sessionsToday + 1,
      tickets: getBalances().tickets,
      wtfDuJourFait: store.wtfDuJourDate === TODAY(),
    })

    // Supabase sync
    if (user) {
      for (const f of toSync) updateCollection(user.id, f.category, f.id)
      syncAfterAction(user.id)
    }

    // Stats
    try {
      const d = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      if (!d.statsByMode) d.statsByMode = {}
      if (!d.statsByMode.parcours) d.statsByMode.parcours = { gamesPlayed: 0, totalCorrect: 0, totalAnswered: 0, bestStreak: 0 }
      d.statsByMode.parcours.gamesPlayed++
      d.statsByMode.parcours.totalCorrect += s.correctCount
      d.statsByMode.parcours.totalAnswered += s.facts.length
      d.gamesPlayed = (d.gamesPlayed || 0) + 1
      d.questsPlayed = (d.questsPlayed || 0) + 1
      d.totalCorrect = (d.totalCorrect || 0) + s.correctCount
      d.totalAnswered = (d.totalAnswered || 0) + s.facts.length
      d.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(d))
      window.dispatchEvent(new Event('wtf_storage_sync'))
    } catch {}

    // Trophies
    updateTrophyData()
    const badges = checkBadges()
    if (badges.length > 0) setTrophies(badges)

    setEndData({
      score: s.score, correctCount: s.correctCount, totalFacts: s.facts.length,
      coinsEarned: s.score + bonus, isPerfect, completed, difficulty: s.difficulty,
    })
    setScreen('results')
  }, [user])

  // ══════════════════════════════════════════════════════════════════════
  // NAVIGATION
  // ══════════════════════════════════════════════════════════════════════
  const goHome = useCallback(() => {
    window.dispatchEvent(new Event('wtf_storage_sync'))
    navigate('/')
  }, [navigate])

  const goReplay = useCallback(() => setScreen('difficulty'), [])

  const goShare = useCallback(() => {
    const f = session.current.facts[session.current.index]
    if (!f) return
    if (navigator.share) navigator.share({ text: `🤯 WTF! "${f.shortAnswer}" — ${f.question}\n#WTF` }).catch(() => {})
  }, [])

  // ══════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════
  if (screen === 'loading') return null

  return (
    <>
      {screen === 'launch' && (
        <ModeLaunchScreen mode={MODE_CONFIGS.quest} onStart={() => setScreen('difficulty')} onBack={goHome} />
      )}

      {screen === 'difficulty' && (
        <DifficultyScreen onSelectDifficulty={launchQuest} onBack={goHome} />
      )}

      {screen === 'question' && fact && (
        <QuestionScreen
          key={`q-${s.index}-${fact.id}`}
          fact={fact}
          factIndex={s.index}
          totalFacts={s.facts.length}
          hintsUsed={s.hintsUsed}
          onSelectAnswer={onAnswer}
          onOpenValidate={onValidate}
          onUseHint={onHint}
          onTimeout={onTimeout}
          onQuit={goHome}
          category={null}
          gameMode="solo"
          difficulty={s.difficulty}
          playerCoins={coins}
          playerHints={hints}
          playerTickets={tickets}
          sessionType="parcours"
        />
      )}

      {screen === 'question' && !fact && (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e' }}>
          <p style={{ color: '#FF6B1A', fontWeight: 900 }}>Chargement...</p>
        </div>
      )}

      {screen === 'revelation' && fact && (
        <RevelationScreen
          key={`r-${s.index}-${fact.id}`}
          fact={fact}
          isCorrect={s.correct}
          selectedAnswer={s.answer}
          pointsEarned={s.points}
          hintsUsed={s.hintsUsed}
          onNext={onNext}
          onShare={goShare}
          onQuit={goHome}
          factIndex={s.index}
          totalFacts={s.facts.length}
          duelContext={null}
          gameMode="solo"
          sessionScore={s.score}
          playerCoins={coins}
          playerHints={hints}
          playerTickets={tickets}
        />
      )}

      {screen === 'results' && endData && (
        <ResultsScreen
          sessionScore={endData.score}
          correctCount={endData.correctCount}
          totalFacts={endData.totalFacts}
          coinsEarned={endData.coinsEarned}
          onHome={goHome}
          onReplay={goReplay}
          sessionType="parcours"
          isPerfect={endData.isPerfect}
          completedLevels={endData.completed}
          selectedDifficulty={endData.difficulty}
        />
      )}

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {noTicket && (
        <GameModal emoji="🎫" title="Pas de ticket !"
          message="Il te faut 1 ticket pour jouer en Quest."
          confirmLabel="Boutique" cancelLabel="Retour"
          onConfirm={() => { setNoTicket(false); navigate('/boutique') }}
          onCancel={() => { setNoTicket(false); goHome() }}
        />
      )}

      {trophies.length > 0 && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setTrophies(t => t.slice(1))}>
          <div style={{ background: 'linear-gradient(145deg, #1a1a2e, #2d1b4e)', borderRadius: 24, padding: '32px 28px', maxWidth: 340, width: '100%', textAlign: 'center', border: '2px solid rgba(255,215,0,0.4)', boxShadow: '0 0 40px rgba(255,215,0,0.3)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>{trophies[0].emoji}</div>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#FFD700', textTransform: 'uppercase', marginBottom: 4 }}>Trophée débloqué !</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'white', marginBottom: 16 }}>{trophies[0].label}</div>
            <button onClick={() => setTrophies(t => t.slice(1))}
              style={{ width: '100%', padding: '14px 0', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#1a1a2e', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>
              {trophies.length > 1 ? `Suivant (${trophies.length - 1})` : 'Continuer'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
