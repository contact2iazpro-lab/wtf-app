import { readWtfData } from '../utils/storageHelper'

// ─── WTF! Facts Service ──────────────────────────────────────────────────────
// Source UNIQUE des facts : Supabase. Pas de fallback local.
// Si Supabase échoue après 3 retries, l'app affiche un écran d'erreur.
//
// Usage dans App.jsx :
//   const result = await initFacts()  // { success: true } ou { success: false, error: '...' }
//   const facts = getValidFacts()
//   const daily = getDailyFact()

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import {
  CATEGORIES,
  VIP_FACT_IDS,
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

// Reset pour permettre un retry après échec
export function resetFacts() {
  _rawFacts = null
  _validFacts = null
  _parcoursFacts = null
  _categoryLevelIds = null
  _difficulty = null
  _playableCategories = null
  _initPromise = null
}

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
    hint3:        row.hint3        || null,
    hint4:        row.hint4        || null,
    shortAnswer:  row.short_answer || row.answer || null,
    explanation:  row.explanation  || null,
    sourceUrl:    row.source_url   || null,
    options,
    correctIndex: row.correct_index,
    imageUrl:     row.image_url    || null,
    difficulty:   row.difficulty   || null,
    type:         row.type         || null,
    isVip:        !!row.is_vip,
    teaser:       row.teaser       || null,
    funnyWrong1:     row.funny_wrong_1     || null,
    funnyWrong2:     row.funny_wrong_2     || null,
    funnyWrong3:     row.funny_wrong_3     || null,
    closeWrong1:     row.close_wrong_1     || null,
    closeWrong2:     row.close_wrong_2     || null,
    plausibleWrong1: row.plausible_wrong_1 || null,
    plausibleWrong2: row.plausible_wrong_2 || null,
    plausibleWrong3: row.plausible_wrong_3 || null,
    statementTrue:           row.statement_true            || null,
    statementFalseFunny:     row.statement_false_funny     || null,
    statementFalsePlausible: row.statement_false_plausible || null,
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

function hasWrongAnswerFields(f) {
  return !!(f.funnyWrong1 || f.closeWrong1 || f.plausibleWrong1)
}

function buildAll(rawFacts) {
  _rawFacts   = rawFacts
  _difficulty = buildDifficultyFrom(rawFacts)

  _validFacts = rawFacts
    .filter(f => {
      if (!f || !f.question || !f.category) return false
      const hasOptions = Array.isArray(f.options) && f.options.length >= 2
      if (!hasOptions && !hasWrongAnswerFields(f)) return false
      if (hasOptions && (typeof f.correctIndex !== 'number' || f.correctIndex < 0)) return false
      return true
    })

  _parcoursFacts = rawFacts
    .filter(f => {
      if (!f || !f.question || !f.category || !_difficulty[f.id]) return false
      const hasOptions = Array.isArray(f.options) && f.options.length >= 2
      if (!hasOptions && !hasWrongAnswerFields(f)) return false
      if (hasOptions && typeof f.correctIndex !== 'number') return false
      return true
    })
    .map(f => ({ ...f, difficulty: _difficulty[f.id], isSuperWTF: false }))

  // Catégories jouables = celles qui ont au moins 1 fact valide
  const activeCatIds = new Set(_validFacts.map(f => f.category))
  _playableCategories = CATEGORIES.filter(c => activeCatIds.has(c.id))

  _categoryLevelIds = {}
  _parcoursFacts.forEach(f => {
    const key = `${f.category}_${f.difficulty}`
    if (!_categoryLevelIds[key]) _categoryLevelIds[key] = new Set()
    _categoryLevelIds[key].add(f.id)
  })

  // AUDIT supprimé (était un console.log de debug)
}

// ─── Cache localStorage ─────────────────────────────────────────────────────
const CACHE_KEY = 'wtf_facts_cache'
const CACHE_VERSION_KEY = 'wtf_facts_cache_version'
const CACHE_VERSION = '5' // bump 17/04/2026 — ajout funny_wrong_3 (8ème fausse réponse drôle)

function saveCacheToLocal(rawRows) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(rawRows))
    localStorage.setItem(CACHE_VERSION_KEY, CACHE_VERSION)
  } catch { /* localStorage plein ou indisponible — pas grave */ }
}

function loadCacheFromLocal() {
  try {
    if (localStorage.getItem(CACHE_VERSION_KEY) !== CACHE_VERSION) return null
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null
    const rows = JSON.parse(cached)
    if (!Array.isArray(rows) || rows.length < 10) return null
    return rows
  } catch { return null }
}

// ─── initFacts() — appeler une fois dans App.jsx au montage ─────────────────
// Retourne { success: true } ou { success: false, error: '...' }
const MAX_RETRIES = 3
const RETRY_DELAY = 1500 // ms

async function fetchFromSupabase() {
  const SELECT_COLS = 'id, category, question, hint1, hint2, hint3, hint4, short_answer, answer, explanation, source_url, options, correct_index, image_url, difficulty, type, is_vip, teaser, funny_wrong_1, funny_wrong_2, funny_wrong_3, close_wrong_1, close_wrong_2, plausible_wrong_1, plausible_wrong_2, plausible_wrong_3, statement_true, statement_false_funny, statement_false_plausible'
  const all = []
  let from = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await supabase
      .from('facts')
      .select(SELECT_COLS)
      .eq('is_published', true)
      .order('id')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }
  if (all.length < 10) throw new Error(`Seulement ${all.length} facts retournés`)
  return all
}

export async function initFacts() {
  if (_rawFacts !== null) return { success: true }
  if (_initPromise) return _initPromise

  _initPromise = (async () => {
    if (!isSupabaseConfigured) {
      console.error('[factsService] Supabase non configuré')
      return { success: false, error: 'Supabase non configuré' }
    }

    // Étape 1 : charger le cache local (instantané)
    const cached = loadCacheFromLocal()
    if (cached) {
      buildAll(cached.map(fromRow))
      // log supprimé
    }

    // Étape 2 : fetch Supabase (mise à jour en background)
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const data = await fetchFromSupabase()
        buildAll(data.map(fromRow))
        saveCacheToLocal(data)
        // log supprimé
        return { success: true }
      } catch (err) {
        console.warn(`[factsService] Tentative ${attempt}/${MAX_RETRIES} échouée :`, err.message)
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, RETRY_DELAY))
        }
      }
    }

    // Étape 3 : si Supabase échoue mais qu'on a un cache → succès partiel
    if (cached) {
      console.warn('[factsService] Supabase indisponible — utilisation du cache local')
      return { success: true }
    }

    console.error('[factsService] Échec après 3 tentatives — aucun fact chargé')
    return { success: false, error: 'Impossible de charger les facts après 3 tentatives' }
  })()

  return _initPromise
}

// ─── Getters synchrones (utilisables après initFacts()) ─────────────────────
// Si appelés avant initFacts(), retournent le fallback local (app ne plante pas)

export function getValidFacts() {
  return _validFacts ?? []
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

// ─── Getters par type (VIP / Funny) ────────────────────────────────────────
// Règles officielles :
//   VIP     = facts du jeu physique (type = 'vip' ou sans type pour les anciens)
//   Funny   = facts créés par IA / générés (type = 'generated', !isVip)

export function getVipFacts() {
  return getValidFacts().filter(f => f.isVip)
}

export function getVipFactsByCategory(categoryId) {
  const vip = getVipFacts()
  return categoryId ? vip.filter(f => f.category === categoryId) : vip
}

export function getFunnyFacts() {
  return getValidFacts().filter(f => !f.isVip)
}

export function getFunnyFactsByCategory(categoryId) {
  const funny = getFunnyFacts()
  return categoryId ? funny.filter(f => f.category === categoryId) : funny
}

// Alias pour rétrocompatibilité
export function getGeneratedFacts() {
  return getFunnyFacts()
}

export function getGeneratedFactsByCategory(categoryId) {
  return getFunnyFactsByCategory(categoryId)
}

// ─── Getters par mode de jeu (CLAUDE.md 15/04/2026 — 6 modes officiels) ────

/** Mode Quest : Funny + boss VIP tous les 10 (contenu global, sélection par bloc gérée côté QuestScreen) */
export function getQuestFacts() {
  return getVipFacts()
}

/** Mode Vrai ET Fou : Funny facts avec affirmation vraie + au moins une fausse remplie */
export function getFunnyFactsWithStatement() {
  return getFunnyFacts().filter(f =>
    f.statementTrue && (f.statementFalsePlausible || f.statementFalseFunny)
  )
}

/**
 * Construit un "draw" pour le mode Vrai ET Fou : affirmation vraie + fausse,
 * position vraie/fausse randomisée.
 * Pondération fausse (décision 18/04/2026) : 75% plausible, 25% drôle.
 * Si un type manque, fallback sur l'autre.
 */
export function buildVraiOuFouDraw(fact) {
  const trueSide = Math.random() < 0.5 ? 'left' : 'right'
  const hasPlausible = !!fact.statementFalsePlausible
  const hasFunny = !!fact.statementFalseFunny
  let falseStatement
  if (hasPlausible && hasFunny) {
    falseStatement = Math.random() < 0.75 ? fact.statementFalsePlausible : fact.statementFalseFunny
  } else {
    falseStatement = fact.statementFalsePlausible || fact.statementFalseFunny
  }
  return {
    fact,
    trueStatement: fact.statementTrue,
    falseStatement,
    trueSide,
  }
}

/** Construit un pool de N draws à partir d'une liste de facts. */
export function buildVraiOuFouSessionPool(facts, size) {
  return facts.slice(0, size).map(buildVraiOuFouDraw)
}

/** Mode Race : Funny + VIP déjà débloqués, mélangés */
export function getMixedUnlockedFacts() {
  try {
    const wtfData = readWtfData()
    const unlockedIds = new Set(wtfData.unlockedFacts || [])
    if (unlockedIds.size === 0) return []
    return getValidFacts().filter(f => unlockedIds.has(f.id))
  } catch (e) {
    console.error('[getMixedUnlockedFacts] Error:', e)
    return []
  }
}

/** Mode Flash : Funny facts, toutes catégories */
export function getFlashFacts() {
  return getFunnyFacts()
}

/** Mode Quickie : Funny facts, toutes catégories pour CategoryScreen */
export function getQuickieFacts() {
  return getFunnyFacts()
}

/** Mode Race : Funny facts, dans la catégorie choisie */
export function getRaceFacts(categoryId) {
  return getFunnyFactsByCategory(categoryId)
}

/** Mode Blitz : tous les f*cts débloqués (VIP + Funny confondus) */
export function getBlitzFacts() {
  try {
    const wtfData = readWtfData()
    const unlockedIds = new Set(wtfData.unlockedFacts || [])
    if (unlockedIds.size === 0) return []
    const validFacts = getValidFacts()
    return validFacts.filter(f => unlockedIds.has(f.id))
  } catch (e) {
    console.error('[getBlitzFacts] Error:', e)
    return []
  }
}

/** Mode WTF Semaine : Funny facts, dans la catégorie de la semaine */
export function getWeeklyFacts(categoryId) {
  return getFunnyFactsByCategory(categoryId)
}

/** Mode WTF de la Semaine : pioche 1 VIP stable du lundi au dimanche.
 *  Seed basée sur l'ISO week number + année — change chaque lundi. */
export function getDailyFact() {
  const d = new Date()
  const target = new Date(d.valueOf())
  const dayNr = (d.getDay() + 6) % 7 // 0=Lundi
  target.setDate(target.getDate() - dayNr + 3)
  const firstThursday = target.valueOf()
  target.setMonth(0, 1)
  if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7)
  const weekNr = 1 + Math.ceil((firstThursday - target) / 604800000)
  const year = d.getFullYear()
  const seed = `${year}-W${weekNr}`.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const pool = getVipFacts()
  if (pool.length === 0) return getValidFacts()[0]
  return pool[seed % pool.length]
}

/** Facts pour la session WTF du Jour (VIP, même catégorie que le daily) */
export function getDailySessionFacts(dailyFact) {
  return getVipFacts().filter(f => f.category === dailyFact.category && f.id !== dailyFact.id)
}
