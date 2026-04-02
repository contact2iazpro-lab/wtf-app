// ─── WTF! Facts Service ──────────────────────────────────────────────────────
// Source des facts : Supabase en priorité, fallback local (facts.js) si indisponible.
// Garantit que l'app ne plante jamais même sans connexion.
//
// Usage dans App.jsx :
//   await initFacts()           ← appeler une fois au montage
//   const facts = getValidFacts()
//   const daily = getDailyFact()

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import {
  FACTS        as LOCAL_FACTS,
  CATEGORIES,
  PLAYABLE_CATEGORIES,
  DIFFICULTY_ASSIGNMENT as LOCAL_DIFFICULTY,
  VIP_FACT_IDS,
  isFactValid,
  getCategoryById,
  getTitrePartiel,
} from './facts'

// ─── Re-exports : helpers statiques inchangés ────────────────────────────────
export { CATEGORIES, VIP_FACT_IDS, getCategoryById, getTitrePartiel }

// PLAYABLE_CATEGORIES — dynamique, basé sur les facts chargés
let _playableCategories = null
export function getPlayableCategories() {
  if (_playableCategories) return _playableCategories
  // Fallback avant initFacts : filtre statique
  return CATEGORIES.filter(c => !c.disabled && !c.inactive)
}

// ─── Module-level cache ──────────────────────────────────────────────────────
let _rawFacts         = null   // null = pas encore initialisé
let _validFacts       = null
let _parcoursFacts    = null
let _categoryLevelIds = null
let _difficulty       = null
let _initPromise      = null

// ─── Transform : ligne Supabase → objet fact de l'app ───────────────────────
function fromRow(row) {
  const options = Array.isArray(row.options)
    ? row.options
    : (typeof row.options === 'string' ? JSON.parse(row.options) : [])

  return {
    id:           row.id,
    category:     row.category,
    question:     row.question,
    hint1:        row.hint1        || null,
    hint2:        row.hint2        || null,
    shortAnswer:  row.short_answer || row.answer || null,
    explanation:  row.explanation  || null,
    sourceUrl:    row.source_url   || null,
    options,
    correctIndex: row.correct_index,
    imageUrl:     row.image_url    || null,
    difficulty:   row.difficulty   || null,   // ← stocker la difficulté définie dans l'admin
    type:         row.type         || null,   // 'vip' | 'generated'
  }
}

// ─── Normalise les valeurs de difficulté (FR ou EN) → 'cool'|'hot'|'wtf' ─
function normalizeDifficulty(d) {
  if (!d) return null
  switch (d.toLowerCase()) {
    case 'facile': case 'easy': case 'cool':     return 'cool'
    case 'normal': case 'hot':                   return 'hot'
    case 'expert': case 'hard': case 'wtf':      return 'wtf'
    default:                                     return null
  }
}

// ─── Dérivés : construits une seule fois après chargement ────────────────────

// Images 1-350 seulement (mêmes règles que facts.js)
const EXISTING_IMAGE_IDS = new Set(Array.from({ length: 350 }, (_, i) => i + 1))

function getImageId(url) {
  if (!url || url.startsWith('http')) return null
  const m = url.match(/\/(\d+)\.png$/)
  return m ? parseInt(m[1]) : null
}

function buildDifficultyFrom(facts) {
  const map = {}

  // Priorité 1 : utiliser la difficulté définie dans l'admin (Supabase)
  for (const f of facts) {
    const d = normalizeDifficulty(f.difficulty)
    if (d) map[f.id] = d
  }

  // Priorité 2 : calcul positionnel pour les facts sans difficulté stockée (fallback)
  const catIds = CATEGORIES.filter(c => !c.disabled).map(c => c.id)
  for (const catId of catIds) {
    const catFacts = facts
      .filter(f => f && f.question && f.category === catId &&
        Array.isArray(f.options) && f.options.length >= 2 &&
        typeof f.correctIndex === 'number' && !map[f.id])
      .sort((a, b) => a.id - b.id)
    catFacts.forEach((f, i) => {
      map[f.id] = i < 10 ? 'cool' : i < 20 ? 'hot' : 'wtf'
    })
  }
  return map
}

function buildAll(rawFacts) {
  _rawFacts   = rawFacts
  _difficulty = buildDifficultyFrom(rawFacts)

  _validFacts = rawFacts
    .filter(f => {
      if (!f || !f.question || !f.category) return false
      if (!Array.isArray(f.options) || f.options.length < 2) return false
      if (typeof f.correctIndex !== 'number' || f.correctIndex < 0) return false
      return true
    })
    .map(f => {
      // Image locale manquante → null (ne pas rejeter le fact)
      let imageUrl = f.imageUrl
      if (imageUrl && !imageUrl.startsWith('http')) {
        const id = getImageId(imageUrl)
        if (!id || !EXISTING_IMAGE_IDS.has(id)) imageUrl = null
      }
      return imageUrl !== f.imageUrl ? { ...f, imageUrl } : f
    })

  _parcoursFacts = rawFacts
    .filter(f =>
      f && f.question && f.category &&
      Array.isArray(f.options) && f.options.length >= 2 &&
      typeof f.correctIndex === 'number' && _difficulty[f.id])
    .map(f => {
      let imageUrl = f.imageUrl
      if (imageUrl !== null && imageUrl !== undefined && !imageUrl.startsWith('http')) {
        const id = getImageId(imageUrl)
        if (!id || !EXISTING_IMAGE_IDS.has(id)) imageUrl = null
      }
      return { ...f, imageUrl, difficulty: _difficulty[f.id], isSuperWTF: false }
    })

  // Catégories jouables = celles qui ont au moins 1 fact valide
  const activeCatIds = new Set(_validFacts.map(f => f.category))
  _playableCategories = CATEGORIES.filter(c => activeCatIds.has(c.id))

  _categoryLevelIds = {}
  _parcoursFacts.forEach(f => {
    const key = `${f.category}_${f.difficulty}`
    if (!_categoryLevelIds[key]) _categoryLevelIds[key] = new Set()
    _categoryLevelIds[key].add(f.id)
  })
}

// ─── initFacts() — appeler une fois dans App.jsx au montage ─────────────────
export async function initFacts() {
  if (_rawFacts !== null) return        // déjà initialisé
  if (_initPromise)       return _initPromise  // en cours

  _initPromise = (async () => {
    if (!isSupabaseConfigured) {
      buildAll(LOCAL_FACTS)
      return
    }

    try {
      const { data, error } = await supabase
        .from('facts')
        .select('id, category, question, hint1, hint2, short_answer, answer, explanation, source_url, options, correct_index, image_url, difficulty, type')
        .eq('is_published', true)
        .order('id')

      if (!error && data && data.length >= 10) {
        buildAll(data.map(fromRow))
        console.log(`[factsService] ${data.length} facts chargés depuis Supabase`)
      } else {
        if (error) console.warn('[factsService] Erreur Supabase, fallback local :', error.message)
        else       console.warn('[factsService] Données insuffisantes, fallback local')
        buildAll(LOCAL_FACTS)
      }
    } catch (err) {
      console.warn('[factsService] Fetch échoué, fallback local :', err.message)
      buildAll(LOCAL_FACTS)
    }
  })()

  return _initPromise
}

// ─── Getters synchrones (utilisables après initFacts()) ─────────────────────
// Si appelés avant initFacts(), retournent le fallback local (app ne plante pas)

export function getValidFacts() {
  return _validFacts ?? LOCAL_FACTS.filter(isFactValid)
}

export function getParcoursFacts() {
  return _parcoursFacts ?? []
}

export function getCategoryLevelFactIds() {
  return _categoryLevelIds ?? {}
}

export function getFactsByCategory(categoryId) {
  const v = getValidFacts()
  return categoryId ? v.filter(f => f.category === categoryId) : v
}

// ─── Getters par type (VIP / Generated) ─────────────────────────────────────
// Règles officielles :
//   VIP     = facts du jeu physique (type = 'vip' ou sans type pour les anciens)
//   Generated = facts créés par IA (type = 'generated')

export function getVipFacts() {
  return getValidFacts().filter(f => !f.type || f.type === 'vip')
}

export function getVipFactsByCategory(categoryId) {
  const vip = getVipFacts()
  return categoryId ? vip.filter(f => f.category === categoryId) : vip
}

export function getGeneratedFacts() {
  return getValidFacts().filter(f => f.type === 'generated')
}

export function getGeneratedFactsByCategory(categoryId) {
  const generated = getGeneratedFacts()
  return categoryId ? generated.filter(f => f.category === categoryId) : generated
}

// ─── Getters par mode de jeu ────────────────────────────────────────────────
// Chaque mode a son getter dédié pour garantir le bon pool de facts.

/** Mode Quête : VIP uniquement, toutes catégories */
export function getQuestFacts() {
  return getVipFacts()
}

/** Mode Flash : Generated uniquement, toutes catégories */
export function getFlashFacts() {
  return getGeneratedFacts()
}

/** Mode Marathon : Generated uniquement, dans la catégorie choisie */
export function getMarathonFacts(categoryId) {
  return getGeneratedFactsByCategory(categoryId)
}

/** Mode Série : Generated uniquement, toutes catégories */
export function getSeriesFacts() {
  return getGeneratedFacts()
}

/** Mode WTF Semaine : Generated uniquement, dans la catégorie de la semaine */
export function getWeeklyFacts(categoryId) {
  return getGeneratedFactsByCategory(categoryId)
}

/** Mode WTF du Jour : pioche dans les VIP uniquement */
export function getDailyFact() {
  const dateStr = new Date().toISOString().slice(0, 10)
  const seed    = dateStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const pool    = getVipFacts()
  if (pool.length === 0) return getValidFacts()[0] // fallback ultime
  return pool[seed % pool.length]
}

/** Facts pour la session WTF du Jour (VIP, même catégorie que le daily) */
export function getDailySessionFacts(dailyFact) {
  return getVipFacts().filter(f => f.category === dailyFact.category && f.id !== dailyFact.id)
}
