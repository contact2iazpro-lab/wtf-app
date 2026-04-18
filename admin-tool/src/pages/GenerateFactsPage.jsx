import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { CATEGORIES } from '../constants/categories'
import { callEdgeFunction } from '../utils/helpers'
import { generateStatementsForFact } from '../lib/generateStatements'

// ── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'standard', label: 'Générer',     icon: '⚡', desc: 'Volume / VIP' },
  { id: 'vof',      label: 'Vrai ou Fou', icon: '🎴', desc: 'Affirmations' },
  { id: 'enrich',   label: 'Enrichir',    icon: '🧠', desc: 'Facts incomplets' },
]

const VOF_MAX = 300
const VOF_RATE_LIMIT_MS = 1000

// ── Archetype labels ─────────────────────────────────────────────────────────
const ARCHETYPES = [
  { id: 1, label: 'Absurde Institutionnel', emoji: '⚖️' },
  { id: 2, label: 'Retournement Tragique',  emoji: '💀' },
  { id: 3, label: 'Proximité Dérangeante',  emoji: '😱' },
  { id: 4, label: 'Existence Impossible',   emoji: '🤯' },
  { id: 5, label: 'Survie/Mort Absurde',    emoji: '🎲' },
  { id: 6, label: 'Animal Humain',          emoji: '🐾' },
  { id: 7, label: 'Formulation Piège',      emoji: '🪤' },
]

function getArchetype(id) {
  return ARCHETYPES.find(a => a.id === id) || { id, label: `Archétype ${id}`, emoji: '?' }
}

// ── WTF Score colors ─────────────────────────────────────────────────────────
function wtfColor(score) {
  if (score >= 4) return '#FFD700'
  if (score >= 3) return '#FF6B1A'
  return '#6B7280'
}

export default function GenerateFactsPage({ toast }) {
  const [tab, setTab] = useState('standard')
  // Toggle : utilise le flow VIP (3 formulations au choix) au lieu du flow Standard (1 formulation auto)
  const [useVipMode, setUseVipMode] = useState(false)

  // ── Standard mode state ──────────────────────────────────────────────────
  const [stdCategory, setStdCategory] = useState('')
  const [stdTheme, setStdTheme] = useState('')
  const [stdCount, setStdCount] = useState(5)
  const [stdLoading, setStdLoading] = useState(false)
  const [stdResults, setStdResults] = useState([])
  const [stdMessage, setStdMessage] = useState('')

  // ── VIP mode state ───────────────────────────────────────────────────────
  const [vipTheme, setVipTheme] = useState('')
  const [vipCategory, setVipCategory] = useState('')
  const [vipCount, setVipCount] = useState(3)
  const [vipLoading, setVipLoading] = useState(false)
  const [vipResults, setVipResults] = useState([]) // array of { raw_fact, explanation, source_url, formulations: [...] }
  const [vipMessage, setVipMessage] = useState('')
  const [selectedFormulations, setSelectedFormulations] = useState({}) // { factIndex: formulationIndex }

  // ── Vrai ou Fou bulk state ───────────────────────────────────────────────
  const [vofSelectedCats, setVofSelectedCats] = useState([]) // [] = toutes
  const [vofStatus, setVofStatus] = useState('all')           // 'all' | 'vip' | 'funny'
  const [vofCount, setVofCount] = useState(50)
  const [vofForce, setVofForce] = useState(false)
  const [vofRunState, setVofRunState] = useState(null)        // null | 'running' | 'done' | 'error'
  const [vofProgress, setVofProgress] = useState({ current: 0, total: 0, ok: 0, ko: 0 })
  const [vofMessage, setVofMessage] = useState('')
  const [vofEligible, setVofEligible] = useState({ loading: false, count: null, error: null })
  const [vofRemaining, setVofRemaining] = useState({ loading: false, list: null, error: null })
  const vofCancelRef = useRef(false)

  // ── Recompute eligible count when filters change (VoF tab) ─────────────
  useEffect(() => {
    if (tab !== 'vof') return
    let cancelled = false
    setVofEligible(prev => ({ ...prev, loading: true, error: null }))
    ;(async () => {
      try {
        let q = supabase.from('facts').select('id', { count: 'exact', head: true })
        if (vofSelectedCats.length > 0) q = q.in('category', vofSelectedCats)
        if (vofStatus === 'vip') q = q.eq('is_vip', true)
        else if (vofStatus === 'funny') q = q.eq('is_vip', false)
        if (!vofForce) q = q.or('statement_true.is.null,statement_true.eq.')
        const { count, error } = await q
        if (cancelled) return
        if (error) throw error
        setVofEligible({ loading: false, count: count ?? 0, error: null })
      } catch (err) {
        if (!cancelled) setVofEligible({ loading: false, count: null, error: err.message })
      }
    })()
    return () => { cancelled = true }
  }, [tab, vofSelectedCats, vofStatus, vofForce])

  // ── Fetch la liste des facts restants (filtres VoF appliqués) ──────────
  async function loadVofRemaining() {
    setVofRemaining({ loading: true, list: null, error: null })
    try {
      let q = supabase
        .from('facts')
        .select('id, category, question, is_vip, statement_true, statement_false_funny, statement_false_plausible')
        .order('id', { ascending: true })
        .limit(200)
      if (vofSelectedCats.length > 0) q = q.in('category', vofSelectedCats)
      if (vofStatus === 'vip') q = q.eq('is_vip', true)
      else if (vofStatus === 'funny') q = q.eq('is_vip', false)
      q = q.or('statement_true.is.null,statement_true.eq.,statement_false_funny.is.null,statement_false_funny.eq.,statement_false_plausible.is.null,statement_false_plausible.eq.')
      const { data, error } = await q
      if (error) throw error
      setVofRemaining({ loading: false, list: data || [], error: null })
    } catch (err) {
      setVofRemaining({ loading: false, list: null, error: err.message })
    }
  }

  // ── Enrich state ─────────────────────────────────────────────────────────
  const [enrichRunState, setEnrichRunState] = useState(null)
  const [enrichMessage, setEnrichMessage] = useState('')
  const [enrichProgress, setEnrichProgress] = useState({ current: 0, total: 0 })
  const [enrichErrorCount, setEnrichErrorCount] = useState(0)
  const enrichCancelRef = useRef(false)

  // ── Enrich filter : groupes de champs à cibler + écrire ────────────────
  // Une case cochée signifie :
  //   (A) les facts avec au moins un champ vide dans ce groupe seront ciblés
  //   (B) seuls les champs de ce groupe seront réécrits (les autres préservés)
  const [enrichGroups, setEnrichGroups] = useState({
    hints:       true,
    funny:       true,
    close:       true,
    plausible:   true,
    explanation: true,
    urls:        true,
  })
  const toggleEnrichGroup = (g) => setEnrichGroups(prev => ({ ...prev, [g]: !prev[g] }))

  // Nombre de facts concernés par chaque groupe (live)
  const [enrichCounts, setEnrichCounts] = useState({ hints: null, funny: null, close: null, plausible: null, explanation: null, urls: null })
  const [enrichCountsLoading, setEnrichCountsLoading] = useState(false)

  // Limite optionnelle du nombre de facts à enrichir (test / batch réduit)
  const [enrichLimit, setEnrichLimit] = useState('')

  // ── Standard generation ────────────────────────────────────────────────
  async function generateStandard() {
    if (!stdCategory) { toast?.('Catégorie requise', 'warn'); return }
    setStdLoading(true)
    setStdMessage('Génération en cours...')
    setStdResults([])
    try {
      const catObj = CATEGORIES.find(c => c.id === stdCategory)
      const categoryLabel = catObj ? `${catObj.emoji} ${catObj.label}` : stdCategory
      const result = await callEdgeFunction('generate-facts', {
        category: stdCategory, categoryLabel, count: stdCount, theme: stdTheme || undefined,
      })
      setStdResults(Array.isArray(result) ? result : [])
      setStdMessage(`${(Array.isArray(result) ? result : []).length} f*cts générés`)
    } catch (err) {
      setStdMessage(`Erreur : ${err.message}`)
    } finally {
      setStdLoading(false)
    }
  }

  // ── VIP generation ─────────────────────────────────────────────────────
  async function generateVip() {
    if (!vipCategory) { toast?.('Catégorie requise', 'warn'); return }
    if (!vipTheme) { toast?.('Sous-thème requis', 'warn'); return }
    setVipLoading(true)
    setVipMessage('Recherche de faits insolites + 3 formulations par fait...')
    setVipResults([])
    setSelectedFormulations({})
    try {
      const catObj = CATEGORIES.find(c => c.id === vipCategory)
      const categoryLabel = catObj ? `${catObj.emoji} ${catObj.label}` : vipCategory
      const result = await callEdgeFunction('generate-vip-facts', {
        category: vipCategory, categoryLabel, count: vipCount, theme: vipTheme,
      })
      setVipResults(Array.isArray(result) ? result : [])
      const count = Array.isArray(result) ? result.length : 0
      setVipMessage(count > 0 ? `${count} faits trouvés — choisis la meilleure formulation pour chacun` : 'Aucun fait trouvé')
    } catch (err) {
      setVipMessage(`Erreur : ${err.message}`)
    } finally {
      setVipLoading(false)
    }
  }

  // ── Save a single VIP fact (selected formulation) ──────────────────────
  async function saveVipFact(factIndex) {
    const fact = vipResults[factIndex]
    const formIndex = selectedFormulations[factIndex]
    if (formIndex == null || !fact?.formulations?.[formIndex]) {
      toast?.('Sélectionne une formulation d\'abord', 'warn')
      return
    }
    const form = fact.formulations[formIndex]
    try {
      const { data: maxData } = await supabase
        .from('facts').select('id').order('id', { ascending: false }).limit(1)
      const newId = (maxData?.[0]?.id || 0) + 1

      const { error } = await supabase.from('facts').insert({
        id: newId,
        category: fact.category || vipCategory,
        question: form.question,
        short_answer: form.short_answer,
        answer: form.short_answer || '',
        explanation: fact.explanation || null,
        source_url: fact.source_url || null,
        hint1: form.hint1 || null,
        hint2: form.hint2 || null,
        hint3: '',
        hint4: '',
        correct_index: 0,
        image_url: null,
        is_vip: true,
        type: 'vip',
        status: 'draft',
        is_published: false,
        pack_id: 'free',
        vip_usage: 'available',
        difficulty: 'Normal',
        funny_wrong_1: form.funny_wrong_1 || null,
        funny_wrong_2: form.funny_wrong_2 || null,
        close_wrong_1: form.close_wrong_1 || null,
        close_wrong_2: form.close_wrong_2 || null,
        plausible_wrong_1: form.plausible_wrong_1 || null,
        plausible_wrong_2: form.plausible_wrong_2 || null,
        plausible_wrong_3: form.plausible_wrong_3 || null,
        updated_at: new Date().toISOString(),
      })
      if (error) throw error
      toast?.(`Fact #${newId} sauvegardé en brouillon VIP`)
      // Mark as saved
      setVipResults(prev => prev.map((f, i) => i === factIndex ? { ...f, _saved: true } : f))
    } catch (err) {
      toast?.(`Erreur : ${err.message}`, 'error')
    }
  }

  // ── Save standard facts ────────────────────────────────────────────────
  async function saveStandardResults() {
    if (!stdResults.length) return
    let saved = 0
    for (const f of stdResults) {
      try {
        const { data: maxData } = await supabase
          .from('facts').select('id').order('id', { ascending: false }).limit(1)
        const newId = (maxData?.[0]?.id || 0) + 1
        const { error } = await supabase.from('facts').insert({
          id: newId, category: f.category, question: f.question,
          hint1: f.hint1 || null, hint2: f.hint2 || null, hint3: f.hint3 || null, hint4: f.hint4 || null,
          short_answer: f.short_answer, answer: f.short_answer || '',
          explanation: f.explanation || null, source_url: f.source_url || null,
          correct_index: f.correct_index ?? 0, image_url: null,
          is_vip: false, type: 'generated', status: 'draft', is_published: false,
          pack_id: 'free', vip_usage: 'available', difficulty: f.difficulty || 'Normal',
          funny_wrong_1: f.funny_wrong_1 || null, funny_wrong_2: f.funny_wrong_2 || null,
          close_wrong_1: f.close_wrong_1 || null, close_wrong_2: f.close_wrong_2 || null,
          plausible_wrong_1: f.plausible_wrong_1 || null, plausible_wrong_2: f.plausible_wrong_2 || null,
          plausible_wrong_3: f.plausible_wrong_3 || null,
          updated_at: new Date().toISOString(),
        })
        if (!error) saved++
      } catch (err) { console.error(err) }
    }
    toast?.(`${saved} f*cts sauvegardés en brouillon`)
    setStdResults([])
    setStdMessage('')
  }

  // ── Save all selected VIP facts ────────────────────────────────────────
  async function saveAllVipFacts() {
    const indicesToSave = Object.keys(selectedFormulations).map(Number).filter(i => !vipResults[i]?._saved)
    if (!indicesToSave.length) { toast?.('Aucun fait sélectionné à sauvegarder', 'warn'); return }
    for (const i of indicesToSave) {
      await saveVipFact(i)
    }
  }

  // ── Vrai ou Fou bulk ───────────────────────────────────────────────────
  function toggleVofCat(id) {
    setVofSelectedCats(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }
  function stopVof() { vofCancelRef.current = true }

  async function runBulkVof() {
    if (vofRunState === 'running') return
    vofCancelRef.current = false
    setVofRunState('running')
    setVofMessage('⏳ Récupération des facts…')
    setVofProgress({ current: 0, total: 0, ok: 0, ko: 0 })

    try {
      let query = supabase
        .from('facts')
        .select('id, question, short_answer, funny_wrong_1, funny_wrong_2, plausible_wrong_1, plausible_wrong_2, plausible_wrong_3, statement_true, statement_false_funny, statement_false_plausible')
        .limit(vofCount)

      if (vofSelectedCats.length > 0) query = query.in('category', vofSelectedCats)
      if (vofStatus === 'vip') query = query.eq('is_vip', true)
      else if (vofStatus === 'funny') query = query.eq('is_vip', false)
      if (!vofForce) query = query.or('statement_true.is.null,statement_true.eq.')

      const { data: facts, error } = await query
      if (error) throw error
      if (!facts || facts.length === 0) {
        setVofRunState('done')
        setVofMessage('✅ Aucun fact à traiter — tout est déjà généré.')
        return
      }

      setVofProgress({ current: 0, total: facts.length, ok: 0, ko: 0 })
      let ok = 0, ko = 0

      for (let i = 0; i < facts.length; i++) {
        if (vofCancelRef.current) {
          setVofRunState('done')
          setVofMessage(`⏹ Arrêté — ${ok}/${facts.length} générés (${ko} erreurs)`)
          return
        }
        const fact = facts[i]
        setVofMessage(`🎴 Génération ${i + 1}/${facts.length} — fact #${fact.id}...`)

        try {
          const result = await generateStatementsForFact(fact)
          const { error: updErr } = await supabase
            .from('facts')
            .update({
              statement_true: result.statement_true,
              statement_false_funny: result.statement_false_funny,
              statement_false_plausible: result.statement_false_plausible,
              updated_at: new Date().toISOString(),
            })
            .eq('id', fact.id)
          if (updErr) throw updErr
          ok++
        } catch (err) {
          console.error(`VoF fact #${fact.id}:`, err)
          ko++
        }
        setVofProgress({ current: i + 1, total: facts.length, ok, ko })
        if (i < facts.length - 1) await new Promise(r => setTimeout(r, VOF_RATE_LIMIT_MS))
      }

      setVofRunState('done')
      setVofMessage(`✅ Terminé — ${ok}/${facts.length} générés (${ko} erreurs)`)
    } catch (err) {
      setVofRunState('error')
      setVofMessage(`❌ Erreur : ${err.message}`)
    }
  }

  // ── Enrich (incomplets + short hints) ──────────────────────────────────
  function stopEnrich() { enrichCancelRef.current = true }

  // Clauses .or(...) par groupe — sert à la fois au comptage et au ciblage
  const GROUP_CLAUSES = {
    hints:       'hint1.is.null,hint1.eq.,hint2.is.null,hint2.eq.',
    funny:       'funny_wrong_1.is.null,funny_wrong_1.eq.,funny_wrong_2.is.null,funny_wrong_2.eq.,funny_wrong_3.is.null,funny_wrong_3.eq.',
    close:       'close_wrong_1.is.null,close_wrong_1.eq.,close_wrong_2.is.null,close_wrong_2.eq.',
    plausible:   'plausible_wrong_1.is.null,plausible_wrong_1.eq.,plausible_wrong_2.is.null,plausible_wrong_2.eq.,plausible_wrong_3.is.null,plausible_wrong_3.eq.',
    explanation: 'explanation.is.null,explanation.eq.',
    urls:        'source_url.is.null,source_url.eq.',
  }

  // Compte les facts avec au moins un indice "problématique" (vide OU > 20 chars).
  // Nécessite un fetch côté client car Supabase .or(...) ne permet pas la longueur.
  const countHintsProblematic = useCallback(async () => {
    const MAX = 20
    const isProblematic = (v) => !v || String(v).trim() === '' || String(v).length > MAX
    const all = []
    let from = 0
    const PAGE = 1000
    while (true) {
      const { data, error } = await supabase
        .from('facts')
        .select('hint1, hint2, hint3, hint4')
        .range(from, from + PAGE - 1)
      if (error) return null
      if (!data || data.length === 0) break
      all.push(...data)
      if (data.length < PAGE) break
      from += PAGE
    }
    return all.filter(f =>
      isProblematic(f.hint1) || isProblematic(f.hint2) ||
      isProblematic(f.hint3) || isProblematic(f.hint4),
    ).length
  }, [])

  // Charge le count de facts concernés par chaque groupe
  const loadEnrichCounts = useCallback(async () => {
    setEnrichCountsLoading(true)
    try {
      const entries = await Promise.all(
        Object.entries(GROUP_CLAUSES).map(async ([key, clause]) => {
          // Hints : comptage spécial qui inclut les trop longs
          if (key === 'hints') {
            const n = await countHintsProblematic()
            return [key, n]
          }
          const { count, error } = await supabase
            .from('facts')
            .select('id', { count: 'exact', head: true })
            .or(clause)
          return [key, error ? null : (count ?? 0)]
        })
      )
      setEnrichCounts(Object.fromEntries(entries))
    } catch (err) {
      console.error('[loadEnrichCounts]', err)
    } finally {
      setEnrichCountsLoading(false)
    }
  }, [countHintsProblematic])

  // Charge les counts au montage
  useEffect(() => { loadEnrichCounts() }, [loadEnrichCounts])

  // Construit le payload d'update Supabase en ne gardant que les champs des groupes cochés
  function buildEnrichUpdatePayload(enrichResult, groups) {
    const payload = { updated_at: new Date().toISOString() }
    if (groups.hints) {
      payload.hint1 = enrichResult.hint1
      payload.hint2 = enrichResult.hint2
      payload.hint3 = enrichResult.hint3 || ''
      payload.hint4 = enrichResult.hint4 || ''
    }
    if (groups.funny) {
      payload.funny_wrong_1 = enrichResult.funny_wrong_1
      payload.funny_wrong_2 = enrichResult.funny_wrong_2
      payload.funny_wrong_3 = enrichResult.funny_wrong_3
    }
    if (groups.close) {
      payload.close_wrong_1 = enrichResult.close_wrong_1
      payload.close_wrong_2 = enrichResult.close_wrong_2
    }
    if (groups.plausible) {
      payload.plausible_wrong_1 = enrichResult.plausible_wrong_1
      payload.plausible_wrong_2 = enrichResult.plausible_wrong_2
      payload.plausible_wrong_3 = enrichResult.plausible_wrong_3
    }
    if (groups.explanation && enrichResult.explanation) {
      payload.explanation = enrichResult.explanation
    }
    return payload
  }

  // Construit la clause .or(...) qui cible les facts avec au moins un champ vide dans les groupes cochés
  function buildEnrichOrClause(groups) {
    return Object.entries(groups)
      .filter(([, v]) => v)
      .map(([k]) => GROUP_CLAUSES[k])
      .filter(Boolean)
      .join(',')
  }

  async function enrichLoop(facts, label, groups) {
    if (!facts || facts.length === 0) {
      setEnrichRunState('done')
      setEnrichMessage('✅ Aucun fact à traiter.')
      return
    }
    setEnrichProgress({ current: 0, total: facts.length })
    let okCount = 0, koCount = 0

    for (let i = 0; i < facts.length; i++) {
      if (enrichCancelRef.current) {
        setEnrichRunState('done')
        setEnrichMessage(`⏹ Arrêté — ${okCount}/${facts.length}`)
        loadEnrichCounts()
        return
      }
      const fact = facts[i]
      setEnrichMessage(`🧠 ${label} ${i + 1}/${facts.length} — fact #${fact.id}...`)
      setEnrichProgress({ current: i + 1, total: facts.length })

      try {
        const enrichResult = await callEdgeFunction('enrich-fact', {
          question: fact.question,
          short_answer: fact.short_answer,
          explanation: fact.explanation,
          category: fact.category,
          hint1: fact.hint1,
          hint2: fact.hint2,
        })

        const payload = buildEnrichUpdatePayload(enrichResult, groups)
        // Si aucun champ à écrire (groupes tous vides sauf explication absente), skip
        if (Object.keys(payload).length <= 1) { okCount++; continue }

        const { error: updErr } = await supabase
          .from('facts')
          .update(payload)
          .eq('id', fact.id)
        if (updErr) throw updErr
        okCount++
      } catch (err) {
        console.error(`Enrich #${fact.id}:`, err)
        koCount++
        setEnrichErrorCount(prev => prev + 1)
      }
    }

    setEnrichRunState('done')
    setEnrichMessage(`✅ ${label} terminé — ${okCount}/${facts.length} (${koCount} erreurs)`)
    loadEnrichCounts()
  }

  async function runEnrichAll() {
    if (enrichRunState === 'running') return
    // Vérif : au moins un groupe coché
    const activeGroups = Object.entries(enrichGroups).filter(([, v]) => v).map(([k]) => k)
    if (activeGroups.length === 0) {
      toast?.('Sélectionne au moins un groupe de champs', 'warn')
      return
    }

    // Parse la limite (0 ou vide = tous)
    const parsedLimit = parseInt(enrichLimit, 10)
    const limit = !isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : null

    // Mode CHIRURGICAL : seul "hints" coché → complete-hints (préserve les hints valides, cible vides + > 20 chars)
    if (activeGroups.length === 1 && activeGroups[0] === 'hints') {
      enrichCancelRef.current = false
      setEnrichRunState('running')
      setEnrichErrorCount(0)
      try {
        await runHintsSurgical(limit)
      } catch (err) {
        setEnrichRunState('error')
        setEnrichMessage(`❌ Erreur : ${err.message}`)
      }
      return
    }

    // Mode URLs : seul "urls" coché → complete-urls (gpt-4o-search + validation HTTP)
    if (activeGroups.length === 1 && activeGroups[0] === 'urls') {
      enrichCancelRef.current = false
      setEnrichRunState('running')
      setEnrichErrorCount(0)
      try {
        await runUrlsComplete(limit)
      } catch (err) {
        setEnrichRunState('error')
        setEnrichMessage(`❌ Erreur : ${err.message}`)
      }
      return
    }

    // Mode classique : enrich-fact sur les groupes cochés
    const orClause = buildEnrichOrClause(enrichGroups)
    if (!orClause) {
      toast?.('Filtre vide', 'warn')
      return
    }

    enrichCancelRef.current = false
    setEnrichRunState('running')
    setEnrichErrorCount(0)
    setEnrichMessage('⏳ Récupération des facts concernés...')
    try {
      const all = []
      let from = 0
      const PAGE = 1000
      while (true) {
        let q = supabase
          .from('facts')
          .select('id, question, short_answer, explanation, category, hint1, hint2')
          .or(orClause)
          .range(from, from + PAGE - 1)
        const { data, error } = await q
        if (error) throw error
        if (!data || data.length === 0) break
        all.push(...data)
        // Stop dès qu'on a assez pour la limite
        if (limit && all.length >= limit) break
        if (data.length < PAGE) break
        from += PAGE
      }

      // Tronque à la limite si nécessaire
      const toProcess = limit ? all.slice(0, limit) : all

      // Confirm avec le nombre trouvé
      if (toProcess.length === 0) {
        setEnrichRunState('done')
        setEnrichMessage('✅ Aucun fact concerné par ces filtres.')
        return
      }
      const writeGroups = activeGroups.join(', ')
      const limitNote = limit && all.length > limit ? ` (limité à ${limit} sur ${all.length} concernés)` : ''
      if (!confirm(`Enrichir ${toProcess.length} fact${toProcess.length > 1 ? 's' : ''}${limitNote} ? Champs réécrits : ${writeGroups}.`)) {
        setEnrichRunState('done')
        setEnrichMessage('⏹ Annulé.')
        return
      }

      await enrichLoop(toProcess, 'Enrichissement', enrichGroups)
    } catch (err) {
      setEnrichRunState('error')
      setEnrichMessage(`❌ Erreur : ${err.message}`)
    }
  }

  // ── Retire tous les emojis du champ explanation sur tous les facts ────────
  async function runStripEmojisExplanations() {
    if (enrichRunState === 'running') return

    // Regex Unicode : emojis classiques + dingbats + sélecteurs de variation
    const stripEmojis = (text) => {
      if (!text || typeof text !== 'string') return text
      return text
        .replace(/\p{Extended_Pictographic}/gu, '')
        .replace(/[\uFE00-\uFE0F]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    }

    enrichCancelRef.current = false
    setEnrichRunState('running')
    setEnrichErrorCount(0)
    setEnrichMessage('⏳ Chargement des facts avec explication...')

    try {
      const all = []
      let from = 0
      const PAGE = 1000
      while (true) {
        const { data, error } = await supabase
          .from('facts')
          .select('id, explanation')
          .not('explanation', 'is', null)
          .neq('explanation', '')
          .range(from, from + PAGE - 1)
        if (error) throw error
        if (!data || data.length === 0) break
        all.push(...data)
        if (data.length < PAGE) break
        from += PAGE
      }

      // Filtre seulement les facts dont l'explication contient effectivement des emojis
      const toProcess = all
        .map(f => ({ id: f.id, before: f.explanation, after: stripEmojis(f.explanation) }))
        .filter(f => f.before !== f.after)

      if (toProcess.length === 0) {
        setEnrichRunState('done')
        setEnrichMessage(`✅ Aucun emoji trouvé — ${all.length} explications déjà propres.`)
        return
      }

      if (!confirm(`Retirer les emojis de ${toProcess.length} explication${toProcess.length > 1 ? 's' : ''} (sur ${all.length} facts scannés) ?\n\nAction réversible via git/restore de la DB. Pas d'appel IA.`)) {
        setEnrichRunState('done')
        setEnrichMessage('⏹ Annulé.')
        return
      }

      setEnrichProgress({ current: 0, total: toProcess.length })
      let okCount = 0, koCount = 0

      for (let i = 0; i < toProcess.length; i++) {
        if (enrichCancelRef.current) {
          setEnrichRunState('done')
          setEnrichMessage(`⏹ Arrêté — ${okCount}/${toProcess.length}`)
          return
        }
        const f = toProcess[i]
        setEnrichMessage(`🧹 Nettoyage ${i + 1}/${toProcess.length} — fact #${f.id}...`)
        setEnrichProgress({ current: i + 1, total: toProcess.length })

        try {
          const { error: updErr } = await supabase
            .from('facts')
            .update({ explanation: f.after, updated_at: new Date().toISOString() })
            .eq('id', f.id)
          if (updErr) throw updErr
          okCount++
        } catch (err) {
          console.error(`strip-emojis #${f.id}:`, err)
          koCount++
          setEnrichErrorCount(prev => prev + 1)
        }
      }

      setEnrichRunState('done')
      setEnrichMessage(`✅ Nettoyage terminé — ${okCount} explications nettoyées, ${koCount} erreurs.`)
    } catch (err) {
      setEnrichRunState('error')
      setEnrichMessage(`❌ Erreur : ${err.message}`)
    }
  }

  // ── Mode chirurgical hints : vides OU > 20 chars (appelé quand seul le groupe
  //    "hints" est coché dans Enrichir les incomplets) ──────────────────────
  async function runHintsSurgical(limit) {
    const MAX = 20
    const isProblematic = (v) => !v || String(v).trim() === '' || String(v).length > MAX

    setEnrichMessage('⏳ Recherche des indices à compléter...')
    const all = []
    let from = 0
    const PAGE = 1000
    while (true) {
      const { data, error } = await supabase
        .from('facts')
        .select('id, question, short_answer, explanation, category, hint1, hint2, hint3, hint4')
        .order('id')
        .range(from, from + PAGE - 1)
      if (error) throw error
      if (!data || data.length === 0) break
      all.push(...data)
      if (data.length < PAGE) break
      from += PAGE
    }

    const toProcess = all.filter(f =>
      isProblematic(f.hint1) || isProblematic(f.hint2) ||
      isProblematic(f.hint3) || isProblematic(f.hint4),
    )

    if (toProcess.length === 0) {
      setEnrichRunState('done')
      setEnrichMessage('✅ Aucun indice à compléter : tous sont non-vides et ≤ 20 caractères.')
      return
    }

    const subset = limit ? toProcess.slice(0, limit) : toProcess
    const limitNote = limit && toProcess.length > limit ? ` (limité à ${limit} sur ${toProcess.length})` : ''
    if (!confirm(`Compléter les indices de ${subset.length} fact${subset.length > 1 ? 's' : ''}${limitNote} ?\n\nSeuls les indices vides ou dépassant 20 caractères seront modifiés. Les indices valides sont préservés.`)) {
      setEnrichRunState('done')
      setEnrichMessage('⏹ Annulé.')
      return
    }

    setEnrichProgress({ current: 0, total: subset.length })
    let okCount = 0, koCount = 0, touched = 0

    for (let i = 0; i < subset.length; i++) {
      if (enrichCancelRef.current) {
        setEnrichRunState('done')
        setEnrichMessage(`⏹ Arrêté — ${okCount}/${subset.length}`)
        loadEnrichCounts()
        return
      }
      const fact = subset[i]
      setEnrichMessage(`🎯 Complétion ${i + 1}/${subset.length} — fact #${fact.id}...`)
      setEnrichProgress({ current: i + 1, total: subset.length })

      try {
        const res = await callEdgeFunction('complete-hints', {
          question: fact.question,
          short_answer: fact.short_answer,
          explanation: fact.explanation,
          category: fact.category,
          hint1: fact.hint1, hint2: fact.hint2,
          hint3: fact.hint3, hint4: fact.hint4,
        })

        const updated = res.updated || {}
        const keys = Object.keys(updated)
        if (keys.length === 0) { okCount++; continue }

        const payload = { updated_at: new Date().toISOString(), ...updated }
        const { error: updErr } = await supabase.from('facts').update(payload).eq('id', fact.id)
        if (updErr) throw updErr
        okCount++
        touched += keys.length
      } catch (err) {
        console.error(`complete-hints #${fact.id}:`, err)
        koCount++
        setEnrichErrorCount(prev => prev + 1)
      }
    }

    setEnrichRunState('done')
    setEnrichMessage(`✅ Complétion terminée — ${okCount}/${subset.length} facts traités, ${touched} indice(s) mis à jour (${koCount} erreurs)`)
    loadEnrichCounts()
  }

  // ── Complétion URLs (gpt-4o-search-preview + validation HTTP HEAD) ─────
  // Ne traite que les facts où source_url est null ou vide.
  async function runUrlsComplete(limit) {
    setEnrichMessage('⏳ Recherche des facts sans URL...')

    const { data: facts, error } = await supabase
      .from('facts')
      .select('id, question, short_answer, explanation, category')
      .or('source_url.is.null,source_url.eq.')
      .order('id')
    if (error) throw error

    if (!facts || facts.length === 0) {
      setEnrichRunState('done')
      setEnrichMessage('✅ Aucun fact sans URL — tout est déjà renseigné.')
      return
    }

    const subset = limit ? facts.slice(0, limit) : facts
    const limitNote = limit && facts.length > limit ? ` (limité à ${limit} sur ${facts.length})` : ''
    if (!confirm(`Rechercher une URL source pour ${subset.length} fact${subset.length > 1 ? 's' : ''}${limitNote} ?\n\nGPT-4o search + validation HTTP (jusqu'à 3 tentatives par fact). Durée estimée : ~${Math.ceil(subset.length * 8 / 60)} min.`)) {
      setEnrichRunState('done')
      setEnrichMessage('⏹ Annulé.')
      return
    }

    setEnrichProgress({ current: 0, total: subset.length })
    let okCount = 0, notFoundCount = 0, errCount = 0

    for (let i = 0; i < subset.length; i++) {
      if (enrichCancelRef.current) {
        setEnrichRunState('done')
        setEnrichMessage(`⏹ Arrêté — ${okCount} ok · ${notFoundCount} introuvables · ${errCount} erreurs (${i}/${subset.length})`)
        loadEnrichCounts()
        return
      }
      const fact = subset[i]
      setEnrichMessage(`🔗 URL ${i + 1}/${subset.length} — fact #${fact.id}...`)
      setEnrichProgress({ current: i + 1, total: subset.length })

      try {
        const res = await callEdgeFunction('complete-urls', {
          fact_id: fact.id,
          question: fact.question,
          short_answer: fact.short_answer,
          explanation: fact.explanation,
          category: fact.category,
        })

        if (res.status === 'ok' && res.url) {
          const { error: updErr } = await supabase
            .from('facts')
            .update({ source_url: res.url, updated_at: new Date().toISOString() })
            .eq('id', fact.id)
          if (updErr) throw updErr
          okCount++
        } else {
          notFoundCount++
        }
      } catch (err) {
        console.error(`complete-urls #${fact.id}:`, err)
        errCount++
        setEnrichErrorCount(prev => prev + 1)
      }
    }

    setEnrichRunState('done')
    setEnrichMessage(`✅ URLs terminé — ${okCount} ajoutées · ${notFoundCount} introuvables · ${errCount} erreurs`)
    loadEnrichCounts()
  }

  // ── Render ─────────────────────────────────────────────────────────────
  const selectCls = "w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none"
  const inputCls = "w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none placeholder-slate-500"

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Générer des f*cts</h1>
        <p className="text-slate-400 text-sm mt-1">Standard = volume rapide. VIP = 1 fait + 3 formulations au choix.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(t => {
          const active = tab === t.id
          const color =
            t.id === 'vip'    ? '#FFD700' :
            t.id === 'vof'    ? '#A78BFA' :
            t.id === 'enrich' ? '#8B5CF6' :
            t.id === 'urls'   ? '#38BDF8' :
            '#FF6B1A'
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black transition-all"
              style={{
                background: active ? `${color}26` : 'rgba(30,41,59,1)',
                color: active ? color : '#64748B',
                border: `1px solid ${active ? `${color}66` : '#334155'}`,
              }}
            >
              <span className="text-lg">{t.icon}</span>
              <div className="text-left">
                <div>{t.label}</div>
                <div className="text-[10px] font-semibold opacity-60">{t.desc}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* ══════════ STANDARD MODE ══════════ */}
      {tab === 'standard' && (
        <div className="space-y-6">
          {/* Toggle Standard / VIP */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setUseVipMode(false)}
              disabled={stdLoading || vipLoading}
              className="px-4 py-2 rounded-xl text-xs font-black transition-all disabled:opacity-40"
              style={{
                background: !useVipMode ? 'rgba(255,107,26,0.15)' : 'rgba(30,41,59,1)',
                color: !useVipMode ? '#FF6B1A' : '#94A3B8',
                border: `2px solid ${!useVipMode ? '#FF6B1A' : '#334155'}`,
              }}
            >
              ⚡ Standard — 1 formulation auto
            </button>
            <button
              onClick={() => setUseVipMode(true)}
              disabled={stdLoading || vipLoading}
              className="px-4 py-2 rounded-xl text-xs font-black transition-all disabled:opacity-40"
              style={{
                background: useVipMode ? 'rgba(255,215,0,0.15)' : 'rgba(30,41,59,1)',
                color: useVipMode ? '#FFD700' : '#94A3B8',
                border: `2px solid ${useVipMode ? '#FFD700' : '#334155'}`,
              }}
            >
              ⭐ VIP — 1 fait, 3 formulations à choisir
            </button>
          </div>

          {/* ── Mode STANDARD ── */}
          {!useVipMode && (
            <>
              <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
                <h2 className="text-base font-black text-white mb-1">⚡ Mode Standard</h2>
                <p className="text-slate-400 text-xs mb-4">
                  Pipeline unifié : web search + 7 archétypes + sélection automatique de la meilleure formulation.
                  L'IA choisit l'angle, tu as plusieurs f*cts d'un coup.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Catégorie</label>
                    <select value={stdCategory} onChange={e => setStdCategory(e.target.value)} disabled={stdLoading} className={selectCls}>
                      <option value="">Choisir…</option>
                      {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Thème (optionnel)</label>
                    <input value={stdTheme} onChange={e => setStdTheme(e.target.value)} disabled={stdLoading} placeholder="Ex: Les inventions du 20e siècle..." className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Nombre</label>
                    <select value={stdCount} onChange={e => setStdCount(Number(e.target.value))} disabled={stdLoading} className={selectCls}>
                      {[3, 5, 10].map(n => <option key={n} value={n}>{n} f*cts</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={generateStandard} disabled={stdLoading || !stdCategory}
                  className="px-5 py-2.5 rounded-xl font-black text-sm text-white transition-all active:scale-95 disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #FF6B1A, #D94A10)' }}>
                  {stdLoading ? <><span className="inline-block animate-spin mr-2">⟳</span>Génération...</> : '⚡ Générer'}
                </button>
                {stdMessage && <div className="mt-3 text-sm font-semibold" style={{ color: stdMessage.startsWith('Erreur') ? '#EF4444' : '#22C55E' }}>{stdMessage}</div>}
              </div>

              {stdResults.length > 0 && (
                <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
                    <h3 className="text-sm font-black text-white">{stdResults.length} f*cts générés</h3>
                    <button onClick={saveStandardResults} className="px-4 py-2 rounded-xl text-xs font-black text-white active:scale-95" style={{ background: '#22C55E' }}>
                      Sauvegarder tous en brouillon
                    </button>
                  </div>
                  <div className="divide-y divide-slate-700 max-h-96 overflow-y-auto">
                    {stdResults.map((f, i) => (
                      <div key={i} className="px-5 py-3">
                        <div className="text-sm text-white font-semibold mb-1">{f.question}</div>
                        <div className="text-xs font-bold" style={{ color: '#FF6B1A' }}>{f.short_answer}</div>
                        {f.explanation && <div className="text-xs text-slate-400 mt-1">{f.explanation}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      )}

      {/* ══════════ VIP MODE — affiché dans l'onglet "Générer" quand toggle VIP activé ══════════ */}
      {tab === 'standard' && useVipMode && (
        <div className="space-y-6 mt-6">
          {/* Controls */}
          <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700" style={{ borderColor: '#FFD70030' }}>
            <h2 className="text-base font-black mb-1" style={{ color: '#FFD700' }}>⭐ Mode VIP — 1 fait, 3 formulations</h2>
            <p className="text-slate-400 text-xs mb-4">
              Donne un sous-thème + une catégorie. Claude trouve des faits insolites et propose
              3 formulations différentes (3 archétypes) pour chaque fait. Tu choisis la meilleure.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Sous-thème</label>
                <input value={vipTheme} onChange={e => setVipTheme(e.target.value)} disabled={vipLoading}
                  placeholder="Ex: Dessins animés, Fromages, Prisons..." className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Catégorie</label>
                <select value={vipCategory} onChange={e => setVipCategory(e.target.value)} disabled={vipLoading} className={selectCls}>
                  <option value="">Choisir…</option>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Nombre de faits</label>
                <select value={vipCount} onChange={e => setVipCount(Number(e.target.value))} disabled={vipLoading} className={selectCls}>
                  {[1, 2, 3, 5].map(n => <option key={n} value={n}>{n} fait{n > 1 ? 's' : ''} (× 3 formulations)</option>)}
                </select>
              </div>
            </div>

            <button onClick={generateVip} disabled={vipLoading || !vipCategory || !vipTheme}
              className="px-5 py-2.5 rounded-xl font-black text-sm text-white transition-all active:scale-95 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #FFD700, #B8860B)' }}>
              {vipLoading ? <><span className="inline-block animate-spin mr-2">⟳</span>Recherche + formulations...</> : '⭐ Générer'}
            </button>

            {vipMessage && <div className="mt-3 text-sm font-semibold" style={{ color: vipMessage.startsWith('Erreur') ? '#EF4444' : '#FFD700' }}>{vipMessage}</div>}
          </div>

          {/* VIP Results — 1 card per fact, 3 formulations inside */}
          {vipResults.length > 0 && (
            <>
              {/* Save all button */}
              {Object.keys(selectedFormulations).filter(i => !vipResults[i]?._saved).length > 0 && (
                <div className="flex justify-end">
                  <button onClick={saveAllVipFacts}
                    className="px-5 py-2.5 rounded-xl font-black text-sm transition-all active:scale-95"
                    style={{ background: '#FFD700', color: '#1a1a1a' }}>
                    Sauvegarder les {Object.keys(selectedFormulations).filter(i => !vipResults[i]?._saved).length} sélectionnés
                  </button>
                </div>
              )}

              {vipResults.map((fact, fi) => {
                const isSaved = fact._saved
                const selectedIdx = selectedFormulations[fi]

                return (
                  <div key={fi} className="bg-slate-800 rounded-2xl border overflow-hidden transition-all"
                    style={{ borderColor: isSaved ? '#22C55E40' : '#FFD70030', opacity: isSaved ? 0.6 : 1 }}>

                    {/* Fact header — raw fact + explanation */}
                    <div className="px-5 py-4 border-b border-slate-700">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,215,0,0.15)', color: '#FFD700' }}>
                              Fait #{fi + 1}
                            </span>
                            {isSaved && (
                              <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>
                                Sauvegardé
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-white font-bold mb-2">{fact.raw_fact}</div>
                          {fact.explanation && (
                            <div className="text-xs text-slate-400 italic">{fact.explanation}</div>
                          )}
                          {fact.source_url && (
                            <a href={fact.source_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline mt-1 inline-block">
                              Source
                            </a>
                          )}
                        </div>
                        {!isSaved && selectedIdx != null && (
                          <button onClick={() => saveVipFact(fi)}
                            className="shrink-0 px-4 py-2 rounded-xl text-xs font-black text-white active:scale-95"
                            style={{ background: '#22C55E' }}>
                            Sauvegarder
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 3 formulations */}
                    <div className="divide-y divide-slate-700/50">
                      {(fact.formulations || []).map((form, formIdx) => {
                        const arch = getArchetype(form.archetype)
                        const isSelected = selectedIdx === formIdx
                        return (
                          <button
                            key={formIdx}
                            onClick={() => !isSaved && setSelectedFormulations(prev => ({ ...prev, [fi]: formIdx }))}
                            disabled={isSaved}
                            className="w-full text-left px-5 py-4 transition-all hover:bg-slate-700/30"
                            style={{
                              background: isSelected ? 'rgba(255,215,0,0.08)' : 'transparent',
                              borderLeft: isSelected ? '3px solid #FFD700' : '3px solid transparent',
                            }}
                          >
                            {/* Archetype + score */}
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,0.15)', color: '#A78BFA' }}>
                                {arch.emoji} {arch.label}
                              </span>
                              {form.collision && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,107,26,0.15)', color: '#FF6B1A' }}>
                                  {form.collision}
                                </span>
                              )}
                              {form.wtf_score && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: `${wtfColor(form.wtf_score)}20`, color: wtfColor(form.wtf_score) }}>
                                  {form.wtf_score}/4
                                </span>
                              )}
                              {isSelected && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,215,0,0.2)', color: '#FFD700' }}>
                                  SÉLECTIONNÉE
                                </span>
                              )}
                            </div>

                            {/* Question + Answer */}
                            <div className="text-sm text-white font-semibold mb-1">{form.question}</div>
                            <div className="text-xs font-black mb-2" style={{ color: '#FF6B1A' }}>{form.short_answer}</div>

                            {/* Hints + wrong answers preview */}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
                              {form.hint1 && <span>H1: {form.hint1}</span>}
                              {form.hint2 && <span>H2: {form.hint2}</span>}
                              {form.funny_wrong_1 && <span>Drôle: {form.funny_wrong_1}</span>}
                              {form.close_wrong_1 && <span>Proche: {form.close_wrong_1}</span>}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* ══════════ VRAI OU FOU BULK ══════════ */}
      {tab === 'vof' && (
        <div className="space-y-6">
          <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700" style={{ borderColor: '#A78BFA30' }}>
            <h2 className="text-base font-black mb-1" style={{ color: '#A78BFA' }}>🎴 Générer les affirmations Vrai ou Fou</h2>
            <p className="text-slate-400 text-xs mb-4">
              Génère les 3 affirmations (<code>statement_true</code>, <code>_false_funny</code>, <code>_false_plausible</code>)
              pour un lot de facts. 1 req/s — max {VOF_MAX}. Garde l'onglet ouvert pendant l'exécution.
            </p>

            {/* Catégories */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Catégories ({vofSelectedCats.length === 0 ? 'toutes' : vofSelectedCats.length})</label>
                <div className="flex gap-2">
                  <button onClick={() => setVofSelectedCats([])} className="text-[10px] font-bold text-slate-400 hover:text-white">Tout</button>
                  <button onClick={() => setVofSelectedCats(CATEGORIES.map(c => c.id))} className="text-[10px] font-bold text-slate-400 hover:text-white">Inverser</button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto p-2 bg-slate-900 rounded-xl border border-slate-700">
                {CATEGORIES.map(c => {
                  const active = vofSelectedCats.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      disabled={vofRunState === 'running'}
                      onClick={() => toggleVofCat(c.id)}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all text-left disabled:opacity-40"
                      style={{
                        background: active ? `${c.color}26` : 'rgba(30,41,59,1)',
                        color: active ? c.color : '#94A3B8',
                        border: `1px solid ${active ? `${c.color}66` : '#334155'}`,
                      }}
                    >
                      <span>{c.emoji}</span>
                      <span className="truncate">{c.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Statut + nombre */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Statut</label>
                <div className="flex gap-2">
                  {[
                    { id: 'all',   label: 'Tous' },
                    { id: 'vip',   label: 'VIP' },
                    { id: 'funny', label: 'Funny' },
                  ].map(s => (
                    <button
                      key={s.id}
                      disabled={vofRunState === 'running'}
                      onClick={() => setVofStatus(s.id)}
                      className="flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
                      style={{
                        background: vofStatus === s.id ? '#A78BFA26' : 'rgba(15,23,42,1)',
                        color: vofStatus === s.id ? '#A78BFA' : '#94A3B8',
                        border: `1px solid ${vofStatus === s.id ? '#A78BFA66' : '#334155'}`,
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">
                  Nombre ({vofCount}) — max {VOF_MAX}
                </label>
                <input
                  type="number"
                  min={1}
                  max={VOF_MAX}
                  value={vofCount}
                  disabled={vofRunState === 'running'}
                  onChange={e => {
                    const n = Math.max(1, Math.min(VOF_MAX, Number(e.target.value) || 1))
                    setVofCount(n)
                  }}
                  className={inputCls}
                />
                {vofCount > 100 && (
                  <p className="text-[10px] text-amber-400 mt-1">⚠️ Au-delà de 100 : ~{Math.ceil(vofCount / 60)} min, onglet à garder ouvert</p>
                )}
              </div>
            </div>

            {/* Éligibles selon filtres */}
            <div className="mb-4 px-4 py-3 rounded-xl border flex items-center justify-between gap-3"
              style={{
                background: 'rgba(167,139,250,0.08)',
                borderColor: 'rgba(167,139,250,0.25)',
              }}>
              <div className="text-xs font-semibold text-slate-300">
                F*cts concernés par ces filtres
                <span className="text-[10px] text-slate-500 ml-1">
                  ({vofSelectedCats.length === 0 ? 'toutes catégories' : `${vofSelectedCats.length} cat.`} · {vofStatus} · {vofForce ? 'force' : 'skip existants'})
                </span>
              </div>
              <div className="text-right">
                {vofEligible.loading ? (
                  <span className="text-sm font-black text-slate-400"><span className="inline-block animate-spin mr-1">⟳</span>…</span>
                ) : vofEligible.error ? (
                  <span className="text-xs font-bold text-red-400">Erreur</span>
                ) : (
                  <>
                    <span className="text-lg font-black" style={{ color: '#A78BFA' }}>{vofEligible.count ?? 0}</span>
                    <span className="text-xs text-slate-400 ml-1">
                      · traités : <span className="font-bold text-slate-200">{Math.min(vofCount, vofEligible.count ?? 0)}</span>
                    </span>
                    {(vofEligible.count ?? 0) > 0 && (
                      <button
                        type="button"
                        onClick={loadVofRemaining}
                        disabled={vofRemaining.loading}
                        className="ml-3 px-2 py-1 text-[10px] font-bold rounded-md border transition-colors"
                        style={{
                          borderColor: 'rgba(167,139,250,0.4)',
                          background: 'rgba(167,139,250,0.12)',
                          color: '#C4B5FD',
                        }}
                      >
                        {vofRemaining.loading ? '⟳…' : '🔍 Voir les IDs'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Liste des facts restants */}
            {vofRemaining.list && (
              <div className="mb-4 px-3 py-3 rounded-xl border text-xs"
                style={{ background: 'rgba(15,23,42,0.55)', borderColor: 'rgba(167,139,250,0.25)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-300">
                    {vofRemaining.list.length === 0
                      ? '✅ Aucun fact restant (avec le filtre élargi).'
                      : `${vofRemaining.list.length} fact(s) restant(s)${vofRemaining.list.length === 200 ? ' (200 max affichés)' : ''}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setVofRemaining({ loading: false, list: null, error: null })}
                    className="text-slate-400 hover:text-slate-200 text-sm font-bold"
                  >✕</button>
                </div>
                {vofRemaining.list.length > 0 && (
                  <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                    {vofRemaining.list.map(f => {
                      const missing = []
                      if (!f.statement_true) missing.push('true')
                      if (!f.statement_false_funny) missing.push('false_funny')
                      if (!f.statement_false_plausible) missing.push('false_plausible')
                      return (
                        <div key={f.id} className="flex items-start gap-2 px-2 py-1.5 rounded-md"
                          style={{ background: 'rgba(30,41,59,0.6)' }}>
                          <span className="font-black text-purple-300 min-w-[40px]">#{f.id}</span>
                          <span className="text-[10px] uppercase font-bold text-slate-500 min-w-[60px]">{f.category}</span>
                          {f.is_vip && <span className="text-[9px] font-black text-amber-400">VIP</span>}
                          <span className="text-slate-300 flex-1 truncate">{f.question}</span>
                          <span className="text-[9px] font-bold text-rose-400 whitespace-nowrap">manque : {missing.join(', ')}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
            {vofRemaining.error && (
              <div className="mb-4 px-3 py-2 rounded-xl text-xs font-bold text-red-400 border"
                style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' }}>
                Erreur : {vofRemaining.error}
              </div>
            )}

            {/* Force regen */}
            <label className="flex items-center gap-2 mb-4 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={vofForce}
                disabled={vofRunState === 'running'}
                onChange={e => setVofForce(e.target.checked)}
                className="accent-purple-500"
              />
              Régénérer même si <code>statement_true</code> existe déjà (sinon : skip)
            </label>

            {/* Progress */}
            {vofRunState === 'running' && vofProgress.total > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>{vofProgress.current}/{vofProgress.total} · ✓ {vofProgress.ok} · ✗ {vofProgress.ko}</span>
                  <span>{Math.round((vofProgress.current / vofProgress.total) * 100)}%</span>
                </div>
                <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(vofProgress.current / vofProgress.total) * 100}%`,
                      background: 'linear-gradient(135deg, #A78BFA, #7C3AED)',
                    }}
                  />
                </div>
              </div>
            )}

            {vofMessage && (
              <div
                className="mb-4 px-4 py-3 rounded-xl text-sm font-semibold border"
                style={{
                  background: vofRunState === 'error' ? 'rgba(239,68,68,0.1)' : vofRunState === 'done' ? 'rgba(34,197,94,0.1)' : 'rgba(167,139,250,0.1)',
                  borderColor: vofRunState === 'error' ? 'rgba(239,68,68,0.3)' : vofRunState === 'done' ? 'rgba(34,197,94,0.3)' : 'rgba(167,139,250,0.3)',
                  color: vofRunState === 'error' ? '#EF4444' : vofRunState === 'done' ? '#22C55E' : '#A78BFA',
                }}
              >
                {vofRunState === 'running' && <span className="inline-block animate-spin mr-2">⟳</span>}
                {vofMessage}
              </div>
            )}

            <div className="flex gap-3 flex-wrap">
              <button
                disabled={vofRunState === 'running'}
                onClick={runBulkVof}
                className="px-5 py-2.5 rounded-xl font-black text-sm text-white transition-all active:scale-95 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #A78BFA, #7C3AED)' }}
              >
                {vofRunState === 'running' ? 'Génération…' : '🎴 Lancer la génération'}
              </button>
              {vofRunState === 'running' && (
                <button onClick={stopVof} className="px-4 py-2 rounded-xl text-sm font-bold bg-red-900/30 text-red-400 border border-red-800/40 hover:bg-red-900/50 transition-all">
                  ⏹ Arrêter
                </button>
              )}
              {vofRunState === 'error' && (
                <button onClick={runBulkVof} className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all">
                  ↺ Réessayer
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════ ENRICHIR ══════════ */}
      {tab === 'enrich' && (
        <div className="space-y-6">
          {/* Progress partagé */}
          {enrichRunState === 'running' && enrichProgress.total > 0 && (
            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>{enrichProgress.current}/{enrichProgress.total} traités · {enrichErrorCount} erreurs</span>
                <span>{Math.round((enrichProgress.current / enrichProgress.total) * 100)}%</span>
              </div>
              <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(enrichProgress.current / enrichProgress.total) * 100}%`,
                    background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
                  }}
                />
              </div>
            </div>
          )}

          {enrichMessage && (
            <div
              className="px-4 py-3 rounded-xl text-sm font-semibold border"
              style={{
                background: enrichRunState === 'error' ? 'rgba(239,68,68,0.1)' : enrichRunState === 'done' ? 'rgba(34,197,94,0.1)' : 'rgba(139,92,246,0.1)',
                borderColor: enrichRunState === 'error' ? 'rgba(239,68,68,0.3)' : enrichRunState === 'done' ? 'rgba(34,197,94,0.3)' : 'rgba(139,92,246,0.3)',
                color: enrichRunState === 'error' ? '#EF4444' : enrichRunState === 'done' ? '#22C55E' : '#8B5CF6',
              }}
            >
              {enrichRunState === 'running' && <span className="inline-block animate-spin mr-2">⟳</span>}
              {enrichMessage}
            </div>
          )}

          {/* Card 1 — enrich incomplets */}
          <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
            <h2 className="text-base font-black text-white mb-2">🧠 Enrichir les incomplets</h2>
            <p className="text-slate-400 text-sm mb-4">
              Coche les groupes de champs à traiter. Les facts avec au moins un champ vide dans un groupe coché seront ciblés ;
              seuls les champs cochés seront réécrits (les autres sont préservés).
              <br />
              <span className="text-emerald-400">
                🎯 Mode chirurgical pour les indices : si <strong>seule la case « Indices » est cochée</strong>,
                seuls les indices vides OU dépassant 20 caractères sont regénérés — les indices valides sont préservés à 100%.
              </span>
              <br />
              <span className="text-violet-400">
                🔗 Mode URLs : si <strong>seule la case « URL source » est cochée</strong>,
                les URLs manquantes sont recherchées via GPT-4o search et <strong>validées HTTP</strong> (HEAD request, jusqu'à 3 tentatives).
              </span>
            </p>

            {/* Filtres par groupe + counts live */}
            <div className="flex flex-wrap gap-2 mb-2 items-center">
              {[
                { key: 'hints',       label: 'Indices',           color: '#38BDF8' },
                { key: 'funny',       label: 'Fausses drôles',    color: '#EAB308' },
                { key: 'close',       label: 'Fausses proches',   color: '#F97316' },
                { key: 'plausible',   label: 'Fausses plausibles', color: '#EF4444' },
                { key: 'explanation', label: 'Le saviez-vous',    color: '#22C55E' },
                { key: 'urls',        label: 'URL source',        color: '#A78BFA' },
              ].map(({ key, label, color }) => {
                const on = enrichGroups[key]
                const count = enrichCounts[key]
                const countStr = enrichCountsLoading && count == null
                  ? '…'
                  : count == null ? '?' : String(count)
                return (
                  <button
                    key={key}
                    onClick={() => toggleEnrichGroup(key)}
                    disabled={enrichRunState === 'running'}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1.5"
                    style={{
                      background: on ? `${color}22` : 'transparent',
                      border: `2px solid ${on ? color : '#475569'}`,
                      color: on ? color : '#94A3B8',
                    }}
                  >
                    <span>{on ? '✓' : '○'} {label}</span>
                    <span
                      className="px-1.5 py-0.5 rounded-md text-[10px] font-black"
                      style={{
                        background: on ? color : '#475569',
                        color: on ? (['#EAB308','#F97316'].includes(color) ? '#1a1a2e' : '#fff') : '#cbd5e1',
                      }}
                    >
                      {countStr}
                    </span>
                  </button>
                )
              })}
              <button
                onClick={loadEnrichCounts}
                disabled={enrichCountsLoading || enrichRunState === 'running'}
                title="Recharger les compteurs"
                className="px-2 py-1 rounded-md text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-40 transition-all"
              >
                {enrichCountsLoading ? '⟳' : '↻'}
              </button>
            </div>

            {/* Limite optionnelle + raccourcis */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <label className="text-xs font-bold text-slate-400">Limite :</label>
              <input
                type="number"
                min="0"
                value={enrichLimit}
                onChange={e => setEnrichLimit(e.target.value)}
                placeholder="tous"
                disabled={enrichRunState === 'running'}
                className="w-20 px-2 py-1 rounded-md bg-slate-900 border border-slate-700 text-xs font-bold text-white outline-none focus:border-orange-500 disabled:opacity-40"
              />
              <span className="text-xs text-slate-500">(vide = tous)</span>
              <div className="flex gap-1 ml-2">
                {[5, 10, 50, 100].map(n => (
                  <button
                    key={n}
                    onClick={() => setEnrichLimit(String(n))}
                    disabled={enrichRunState === 'running'}
                    className="px-2 py-1 rounded-md text-[10px] font-bold text-slate-300 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition-all"
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setEnrichLimit('')}
                  disabled={enrichRunState === 'running'}
                  className="px-2 py-1 rounded-md text-[10px] font-bold text-slate-300 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                disabled={enrichRunState === 'running'}
                onClick={runEnrichAll}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 hover:opacity-90 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}
              >
                {enrichRunState === 'running' ? 'Enrichissement…' : '🧠 Enrichir les incomplets'}
              </button>
              {enrichRunState === 'running' && (
                <button onClick={stopEnrich} className="px-4 py-2 rounded-xl text-sm font-bold bg-red-900/30 text-red-400 border border-red-800/40 hover:bg-red-900/50 transition-all">
                  ⏹ Arrêter
                </button>
              )}
            </div>
          </div>

          {/* Card — Nettoyer emojis des explications */}
          <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700" style={{ borderColor: '#10B98130' }}>
            <h2 className="text-base font-black mb-2" style={{ color: '#10B981' }}>🧹 Nettoyer les emojis du « Le saviez-vous »</h2>
            <p className="text-slate-400 text-sm mb-4">
              Retire tous les emojis du champ <code>explanation</code> de la base (sur tous les facts).
              Pas d'appel IA, pas de coût — simple regex Unicode côté client.
            </p>
            <div className="flex gap-3 flex-wrap">
              <button
                disabled={enrichRunState === 'running'}
                onClick={runStripEmojisExplanations}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 hover:opacity-90 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
              >
                {enrichRunState === 'running' ? 'Nettoyage…' : '🧹 Nettoyer emojis des explications'}
              </button>
              {enrichRunState === 'running' && (
                <button onClick={stopEnrich} className="px-4 py-2 rounded-xl text-sm font-bold bg-red-900/30 text-red-400 border border-red-800/40 hover:bg-red-900/50 transition-all">
                  ⏹ Arrêter
                </button>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  )
}
