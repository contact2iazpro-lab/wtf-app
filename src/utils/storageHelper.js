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
 * Mettre à jour wtf_data via une fonction mutator.
 * Pattern read-modify-write centralisé pour éviter les 60+ duplications.
 * @param {(data: object) => void} mutator - reçoit l'objet wtf_data, peut le muter
 * @returns {object} le nouvel état après mutation
 *
 * Exemple :
 *   updateWtfData(wd => { wd.wtfCoins = 100; wd.hints = 5 })
 */
export function updateWtfData(mutator) {
  try {
    const data = readWtfData()
    mutator(data)
    data.lastModified = Date.now()
    localStorage.setItem('wtf_data', JSON.stringify(data))
    return data
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

    // Date d'installation (pour fenêtres d'offre de bienvenue)
    if (!saved.firstSeenDate) {
      saved.firstSeenDate = Date.now()
      saved.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(saved))
    }

    // 1e — Migration statsByMode : flash_solo + explorer + marathon → quickie ;
    //              hunt + puzzle + wtf_du_jour → flash
    // 1f — Migration snack → quickie (rename Snack → Quickie 16/04/2026)
    if (saved.statsByMode) {
      const sbm = saved.statsByMode
      const mergeInto = (targetKey, sourceKeys) => {
        for (const src of sourceKeys) {
          if (!sbm[src]) continue
          if (!sbm[targetKey]) sbm[targetKey] = { gamesPlayed: 0, totalCorrect: 0, totalAnswered: 0 }
          sbm[targetKey].gamesPlayed = (sbm[targetKey].gamesPlayed || 0) + (sbm[src].gamesPlayed || 0)
          sbm[targetKey].totalCorrect = (sbm[targetKey].totalCorrect || 0) + (sbm[src].totalCorrect || 0)
          sbm[targetKey].totalAnswered = (sbm[targetKey].totalAnswered || 0) + (sbm[src].totalAnswered || 0)
          delete sbm[src]
        }
      }
      mergeInto('quickie', ['flash_solo', 'explorer', 'marathon', 'snack'])
      mergeInto('flash', ['hunt', 'puzzle', 'wtf_du_jour'])
      saved.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(saved))
    }

    // 1d — Migration wtf_data.route → wtf_data.quest (rename Route WTF! → Quest)
    if (saved.route && !saved.quest) {
      saved.quest = saved.route
      delete saved.route
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

    // Filet de sécurité anti-triche retiré 2026-04-12 :
    // - Supabase est désormais source de vérité via mutation_ledger (Phase A)
    // - Le filet était déclenché par pullFromServer qui hydrate unlockedFacts
    //   sans mettre à jour gamesPlayed → faux positif systématique
    // - L'anti-triche officielle est côté serveur : CHECK constraints sur
    //   profiles + UNIQUE nonce sur mutation_ledger + plafonds seed_from_local

    return {
      totalScore: saved.totalScore || 0,
      streak,
      unlockedFacts: new Set(saved.unlockedFacts || []),
      wtfCoins: saved.wtfCoins || 0,
      // NOTE : clés legacy wtfDuJour* conservées pour compatibilité avec l'état
      // persisté des joueurs existants. Sémantiquement c'est le WTF de la Semaine
      // (Flash 1×/semaine dimanche) — voir T92 pour le renommage complet si migration.
      wtfDuJourDate: saved.wtfDuJourDate || null,
      wtfDuJourFait: (saved.wtfDuJourDate || null) === today,
      sessionsToday: saved.sessionsTodayDate === today ? (saved.sessionsToday || 0) : 0,
      gamesPlayed: saved.gamesPlayed || 0,
    }
  } catch {
    // Fallback sur erreur parse : valeurs F2P officielles CLAUDE.md (500 coins / 3 indices / 5 énergie)
    return { totalScore: 0, streak: 0, unlockedFacts: new Set(), wtfCoins: 500, wtfDuJourDate: null, wtfDuJourFait: false, sessionsToday: 0, hints: 3, gamesPlayed: 0 }
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
