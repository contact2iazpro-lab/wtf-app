import { getValidFacts } from '../data/factsService'

// ─── Storage Helper — Lecture et écriture centralisées de wtf_data ────────────

export const TODAY = () => new Date().toISOString().slice(0, 10)
export const TODAY_DATE_STR = () => new Date().toDateString()
export const YESTERDAY_DATE_STR = () => new Date(Date.now() - 86400000).toDateString()

/**
 * Lire wtf_data depuis localStorage (lecture seule)
 */
export function readWtfData() {
  try {
    return JSON.parse(localStorage.getItem('wtf_data') || '{}')
  } catch {
    return {}
  }
}

/**
 * Lire une clé spécifique de wtf_data
 */
export function readWtfField(key, defaultValue = null) {
  const data = readWtfData()
  return data[key] !== undefined ? data[key] : defaultValue
}

/**
 * Charger le state initial depuis localStorage (migrations incluses)
 */
export function loadStorage() {
  try {
    const today = TODAY()
    const todayDateStr = TODAY_DATE_STR()
    const saved = JSON.parse(localStorage.getItem('wtf_data') || '{}')

    // Initialiser l'ID anonyme unique si absent
    if (!saved.anonymousId) {
      const randomId = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')
      saved.anonymousId = `${randomId.slice(0, 3)} ${randomId.slice(3, 6)} ${randomId.slice(6, 9)}`
      saved.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(saved))
    }

    // Initialiser le pseudo par défaut si absent
    if (!saved.playerName) {
      saved.playerName = 'Joueur WTF!'
      saved.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(saved))
    }

    // Si on revient de dev/test en mode joueur, restaurer les vrais unlockedFacts
    const isDev = localStorage.getItem('wtf_dev_mode') === 'true'
    const isTest = localStorage.getItem('wtf_test_mode') === 'true'
    if (!isDev && !isTest && saved._savedUnlockedFacts) {
      saved.unlockedFacts = saved._savedUnlockedFacts
      delete saved._savedUnlockedFacts
      saved.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(saved))
    }

    // Initialiser les catégories par défaut si absent
    if (!saved.unlockedCategories) {
      saved.unlockedCategories = ['sport', 'records', 'animaux', 'kids', 'definition']
      saved.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(saved))
    }

    // Streak logic avec Streak Freeze
    let streak
    if (saved.lastDay === todayDateStr) {
      // Déjà joué aujourd'hui
      streak = saved.streak
    } else if (saved.lastDay === YESTERDAY_DATE_STR()) {
      // Joué hier — streak continue
      streak = saved.streak || 0
    } else if ((saved.streakFreezeCount || 0) > 0 && saved.lastDay) {
      // Jour manqué MAIS a un Streak Freeze → consommer le freeze, garder le streak
      saved.streakFreezeCount = (saved.streakFreezeCount || 0) - 1
      saved.streakFreezeUsedDate = todayDateStr
      saved.lastDay = YESTERDAY_DATE_STR() // Simule comme si joué hier
      saved.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(saved))
      streak = saved.streak || 0
    } else {
      // Streak cassé
      streak = 0
    }

    // Filet de sécurité : détecter unlockedFacts anormalement élevés
    if (!isDev && !isTest) {
      const unlocked = saved.unlockedFacts || []
      const gamesPlayed = saved.gamesPlayed || 0
      const maxReasonable = Math.max(50, gamesPlayed * 6)
      if (unlocked.length > maxReasonable && !saved._savedUnlockedFacts) {
        saved.unlockedFacts = []
        saved.lastModified = Date.now()
        localStorage.setItem('wtf_data', JSON.stringify(saved))
      }
    }

    return {
      totalScore: saved.totalScore || 0,
      streak,
      unlockedFacts: new Set(saved.unlockedFacts || []),
      wtfCoins: saved.wtfCoins || 0,
      wtfDuJourDate: saved.wtfDuJourDate || null,
      wtfDuJourFait: (saved.wtfDuJourDate || null) === today,
      sessionsToday: saved.sessionsTodayDate === today ? (saved.sessionsToday || 0) : 0,
      tickets: saved.tickets ?? 0,
      gamesPlayed: saved.gamesPlayed || 0,
      seenModes: saved.seenModes || [],
    }
  } catch {
    return { totalScore: 0, streak: 0, unlockedFacts: new Set(), wtfCoins: 0, wtfDuJourDate: null, wtfDuJourFait: false, sessionsToday: 0, tickets: 0, gamesPlayed: 0, seenModes: [] }
  }
}

/**
 * Sauvegarder le state dans localStorage
 */
export function saveStorage(params) {
  try {
    const existing = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    const bestStreak = Math.max(existing.bestStreak || 0, params.streak || 0)
    localStorage.setItem('wtf_data', JSON.stringify({
      ...existing,
      ...params,
      bestStreak,
      lastDay: TODAY_DATE_STR(),
      sessionsTodayDate: TODAY(),
      lastModified: Date.now(),
      unlockedFacts: params.unlockedFacts ? [...params.unlockedFacts] : (existing.unlockedFacts || []),
    }))
  } catch { /* ignore */ }
}

/**
 * Mettre à jour les données trophées (counts par catégorie, VIP/Funny)
 */
export function updateTrophyData() {
  try {
    const allFacts = getValidFacts()
    const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    const unlockedIds = new Set(wtfData.unlockedFacts || [])

    const unlockedFactsByCategory = {}
    const totalFactsByCategory = {}
    let vipCount = 0
    let funnyCount = 0

    for (const fact of allFacts) {
      const cat = fact.category || 'unknown'
      totalFactsByCategory[cat] = (totalFactsByCategory[cat] || 0) + 1
      if (unlockedIds.has(fact.id)) {
        unlockedFactsByCategory[cat] = (unlockedFactsByCategory[cat] || 0) + 1
        if (fact.isVip) vipCount++
        else funnyCount++
      }
    }

    wtfData.unlockedFactsByCategory = unlockedFactsByCategory
    wtfData.totalFactsByCategory = totalFactsByCategory
    wtfData.vipCount = vipCount
    wtfData.funnyCount = funnyCount
    wtfData.lastModified = Date.now()
    localStorage.setItem('wtf_data', JSON.stringify(wtfData))
  } catch { /* ignore */ }
}
