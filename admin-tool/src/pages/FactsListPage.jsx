import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CATEGORIES, getCategoryLabel, getCategoryEmoji } from '../constants/categories'
import { STATUSES, StatusBadge, DIFFICULTIES, difficultyStyle, DifficultyBadge, Toggle, SortIcon, inputCls as sharedInputCls, inputClsErr as sharedInputClsErr } from '../components/shared'
import { fmtDate, callEdgeFunction } from '../utils/helpers'

const PAGE_SIZE_OPTIONS = [50, 100, 200, 500]

// ── Claude API generation via Supabase Edge Function ──────────────────────
async function generateFactsWithClaude(category, count) {
  const categoryObj = CATEGORIES.find(c => c.id === category)
  const categoryLabel = categoryObj ? `${categoryObj.emoji} ${categoryObj.label}` : category
  return callEdgeFunction('generate-facts', { category, categoryLabel, count })
}

// ── Empty fact template ────────────────────────────────────────────────────
function emptyFact() {
  return {
    category: '',
    question: '',
    hint1: '',
    hint2: '',
    short_answer: '',
    explanation: '',
    source_url: '',
    options: ['', '', '', '', '', ''],
    correct_index: 0,
    image_url: '',
    is_vip: false,
    is_published: false,
    status: 'draft',
    pack_id: 'free',
    vip_usage: 'available',
    difficulty: 'Normal',
  }
}

// ── Pending fact card ──────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════════════
export default function FactsListPage({ toast }) {
  const [searchParams] = useSearchParams()
  const [facts, setFacts] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(100)
  const [loading, setLoading] = useState(true)

  // Filters — init from URL params if present
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterCategories, setFilterCategories] = useState(() => {
    try { const s = localStorage.getItem('selectedCategories'); return s ? JSON.parse(s) : [] } catch { return [] }
  })
  const [filterVip, setFilterVip] = useState('all')
  const [filterPublished, setFilterPublished] = useState(() => searchParams.get('status') === 'draft' ? 'unpublished' : 'all')
  const [filterStatus, setFilterStatus] = useState(() => searchParams.get('status') || 'all')
  const [filterPack, setFilterPack] = useState('all')
  const [filterImage, setFilterImage] = useState('all') // 'all' | 'with' | 'without'
  const [showCatDropdown, setShowCatDropdown] = useState(false)

  // Sort
  const [sortField, setSortField] = useState('id')
  const [sortDir, setSortDir] = useState('desc')
  const [filterRecent, setFilterRecent] = useState(false)

  // Batch
  const [selected, setSelected] = useState(new Set())
  const [batchAction, setBatchAction] = useState(null)
  const [batchValue, setBatchValue] = useState('')
  const [batchLoading, setBatchLoading] = useState(false)

  // Add fact modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [newFact, setNewFact] = useState(emptyFact())
  const [addErrors, setAddErrors] = useState({})
  const [addLoading, setAddLoading] = useState(false)
  const [addImageUploading, setAddImageUploading] = useState(false)
  const addImageInputRef = useRef(null)

  // Generate modal
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [genCategory, setGenCategory] = useState('')
  const [genCount, setGenCount] = useState(3)
  const [genLoading, setGenLoading] = useState(false)

  // Enrich
  const [enriching, setEnriching] = useState(false)
  const [enrichProgress, setEnrichProgress] = useState({ current: 0, total: 0 })
  const [enrichingSingleId, setEnrichingSingleId] = useState(null)
  const enrichCancelRef = useRef(false)


  const searchRef = useRef(null)
  const catDropdownRef = useRef(null)
  const prevCatCountRef = useRef(filterCategories.length)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0) }, 300)
    return () => clearTimeout(t)
  }, [search])

  // Persist category filter to localStorage
  useEffect(() => {
    localStorage.setItem('selectedCategories', JSON.stringify(filterCategories))
  }, [filterCategories])

  // Auto-sort alphabetically when first category is selected
  useEffect(() => {
    const prev = prevCatCountRef.current
    prevCatCountRef.current = filterCategories.length
    if (prev === 0 && filterCategories.length > 0) {
      setSortField('question')
      setSortDir('asc')
    }
  }, [filterCategories])

  // Close category dropdown on outside click
  useEffect(() => {
    if (!showCatDropdown) return
    function handler(e) {
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target)) {
        setShowCatDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showCatDropdown])

  // Reset page on filter change
  useEffect(() => { setPage(0); setSelected(new Set()) }, [filterCategories, filterVip, filterPublished, filterStatus, filterPack, filterImage, filterRecent, pageSize])

  // Load facts
  useEffect(() => { loadFacts() }, [page, pageSize, debouncedSearch, filterCategories, filterVip, filterPublished, filterStatus, filterPack, filterImage, filterRecent, sortField, sortDir])


  const loadFacts = useCallback(async () => {
    setLoading(true)
    try {
      let q = supabase
        .from('facts')
        .select('id, category, question, short_answer, explanation, hint1, hint2, is_vip, is_published, status, pack_id, updated_at, image_url, funny_wrong_1', { count: 'exact' })

      if (debouncedSearch) {
        q = q.or(`question.ilike.%${debouncedSearch}%,explanation.ilike.%${debouncedSearch}%,short_answer.ilike.%${debouncedSearch}%`)
      }
      if (filterCategories.length) q = q.in('category', filterCategories)
      if (filterVip === 'vip') q = q.eq('is_vip', true)
      if (filterVip === 'non-vip') q = q.eq('is_vip', false)
      if (filterPublished === 'published') q = q.eq('is_published', true)
      if (filterPublished === 'unpublished') q = q.eq('is_published', false)
      if (filterStatus !== 'all') q = q.eq('status', filterStatus)
      if (filterPack !== 'all') q = q.eq('pack_id', filterPack)
      if (filterImage === 'with') q = q.not('image_url', 'is', null).neq('image_url', '')
      if (filterImage === 'without') q = q.or('image_url.is.null,image_url.eq.')
      if (filterRecent) {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        q = q.gte('updated_at', since)
      }

      q = q.order(sortField, { ascending: sortDir === 'asc' })
      q = q.range(page * pageSize, (page + 1) * pageSize - 1)

      const { data, count, error } = await q
      if (error) throw error

      setFacts(data || [])
      setTotal(count || 0)
    } catch (err) {
      console.error(err)
      toast?.('Erreur chargement facts', 'error')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, filterCategories, filterVip, filterPublished, filterStatus, filterPack, filterImage, filterRecent, sortField, sortDir])


  async function toggleVip(fact) {
    const newVal = !fact.is_vip
    const newType = newVal ? 'vip' : 'generated'
    setFacts(prev => prev.map(f => f.id === fact.id ? { ...f, is_vip: newVal, type: newType } : f))
    const { error } = await supabase.from('facts').update({ is_vip: newVal, type: newType }).eq('id', fact.id)
    if (error) { toast?.('Erreur mise à jour mode', 'error'); loadFacts() }
  }

  async function togglePublished(fact) {
    const newVal = !fact.is_published
    setFacts(prev => prev.map(f => f.id === fact.id ? { ...f, is_published: newVal } : f))
    const { error } = await supabase.from('facts').update({ is_published: newVal }).eq('id', fact.id)
    if (error) { toast?.('Erreur mise à jour publication', 'error'); loadFacts() }
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === facts.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(facts.map(f => f.id)))
    }
  }

  function handleSort(field) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  async function executeBatch(actionOverride) {
    if (!selected.size) return
    const action = actionOverride || batchAction
    const ids = Array.from(selected)
    setBatchLoading(true)
    try {
      let updateObj = {}
      if (action === 'category') updateObj = { category: batchValue }
      else if (action === 'mode_quete') updateObj = { is_vip: true, type: 'vip' }
      else if (action === 'mode_flash') updateObj = { is_vip: false, type: 'generated' }
      else if (action === 'status_published') updateObj = { status: 'published', is_published: true }
      else if (action === 'status_reserve') updateObj = { status: 'reserve', is_published: false }
      else if (action === 'status_draft') updateObj = { status: 'draft', is_published: false }
      else if (action === 'delete') {
        const { error } = await supabase.from('facts').delete().in('id', ids)
        if (error) throw error
        toast?.(`✓ ${ids.length} facts supprimés`)
        setBatchAction(null); setBatchValue(''); setSelected(new Set())
        await loadFacts()
        return
      }
      else if (action === 'pack') updateObj = { pack_id: batchValue }

      const { error } = await supabase.from('facts').update(updateObj).in('id', ids)
      if (error) throw error
      toast?.(`✓ ${ids.length} facts mis à jour`)
      setBatchAction(null)
      setBatchValue('')
      setSelected(new Set())
      await loadFacts()
    } catch (err) {
      toast?.('Erreur action en lot', 'error')
    } finally {
      setBatchLoading(false)
    }
  }

  // ── Add fact ──────────────────────────────────────────────────────────────
  function setNewFactField(field, value) {
    setNewFact(prev => ({ ...prev, [field]: value }))
    if (addErrors[field]) setAddErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  function setNewFactOption(index, value) {
    setNewFact(prev => {
      const opts = [...prev.options]
      opts[index] = value
      return { ...prev, options: opts }
    })
  }

  async function handleAddImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAddImageUploading(true)
    try {
      // Ensure bucket exists (ignore "already exists" error)
      await supabase.storage.createBucket('fact-images', { public: true }).catch(() => {})

      const ext = file.name.split('.').pop().toLowerCase()
      const path = `facts/new-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('fact-images')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('fact-images').getPublicUrl(path)
      setNewFactField('image_url', publicUrl)
      toast?.('✓ Image uploadée')
    } catch (err) {
      console.error(err)
      const msg = err.message || ''
      if (msg.includes('row-level security') || msg.includes('policy') || msg.includes('Bucket')) {
        toast?.('Bucket "fact-images" manquant ou sans politique. Créez-le dans Supabase → Storage (Public ✓)', 'error')
      } else {
        toast?.('Erreur upload : ' + msg, 'error')
      }
    } finally {
      setAddImageUploading(false)
      if (addImageInputRef.current) addImageInputRef.current.value = ''
    }
  }

  function validateNewFact() {
    const e = {}
    if (!newFact.question?.trim()) e.question = 'Obligatoire'
    else if (newFact.question.length > 100) e.question = 'Max 100 caractères'
    if (!newFact.short_answer?.trim()) e.short_answer = 'Obligatoire'
    else if (newFact.short_answer.length > 50) e.short_answer = 'Max 50 caractères'
    if (!newFact.category) e.category = 'Obligatoire'
    if (!newFact.difficulty) e.difficulty = 'Obligatoire'
    if (newFact.hint1?.length > 20) e.hint1 = 'Max 20 caractères'
    if (newFact.hint2?.length > 20) e.hint2 = 'Max 20 caractères'
    if (newFact.explanation) {
      if (newFact.explanation.length < 100) e.explanation = 'Min 100 caractères'
      else if (newFact.explanation.length > 300) e.explanation = 'Max 300 caractères'
    }
    setAddErrors(e)
    return Object.keys(e).length === 0
  }

  async function submitNewFact() {
    if (!validateNewFact()) return
    setAddLoading(true)
    try {
      // Get next available ID
      const { data: maxData } = await supabase
        .from('facts').select('id').order('id', { ascending: false }).limit(1)
      const newId = (maxData?.[0]?.id || 0) + 1

      const options = newFact.options.filter(o => o.trim())
      const payload = {
        id: newId,
        ...newFact,
        answer: newFact.short_answer || '',   // answer is NOT NULL in DB
        options: options.length > 0 ? options : null,
        status: 'draft',
        is_published: false,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from('facts').insert(payload)
      if (error) throw error

      toast?.(`✓ Fact #${newId} créé (non publié)`)
      setShowAddModal(false)
      setNewFact(emptyFact())
      setAddErrors({})
      await loadFacts()
    } catch (err) {
      console.error(err)
      toast?.('Erreur création fact : ' + (err.message || ''), 'error')
    } finally {
      setAddLoading(false)
    }
  }

  // ── Generate facts ─────────────────────────────────────────────────────
  async function startGeneration() {
    if (!genCategory) { toast?.('Choisir une catégorie', 'warn'); return }
    if (genCount < 1 || genCount > 20) { toast?.('Entre 1 et 20 facts', 'warn'); return }
    setGenLoading(true)
    try {
      const generated = await generateFactsWithClaude(genCategory, genCount)

      // Insert directly as drafts
      let inserted = 0
      for (const f of generated) {
        if (!f.funny_wrong_1) console.warn(`[generate] Fact incomplet (pas de fausses réponses) : "${f.question?.slice(0, 50)}"`)
        try {
          const { data: maxData } = await supabase
            .from('facts').select('id').order('id', { ascending: false }).limit(1)
          const newId = (maxData?.[0]?.id || 0) + 1
          const options = (f.options || []).filter(o => o.trim())
          const { error } = await supabase.from('facts').insert({
            id: newId, category: f.category, question: f.question,
            hint1: f.hint1 || null, hint2: f.hint2 || null,
            hint3: f.hint3 || null, hint4: f.hint4 || null,
            short_answer: f.short_answer, answer: f.short_answer || '',
            explanation: f.explanation || null, source_url: f.source_url || null,
            options: options.length > 0 ? options : null,
            correct_index: f.correct_index ?? 0, image_url: f.image_url || null,
            is_vip: false, type: f.type || 'generated',
            status: 'draft', is_published: false,
            pack_id: f.pack_id || 'free', vip_usage: 'available',
            difficulty: f.difficulty || 'Normal',
            funny_wrong_1: f.funny_wrong_1 || null, funny_wrong_2: f.funny_wrong_2 || null,
            close_wrong_1: f.close_wrong_1 || null, close_wrong_2: f.close_wrong_2 || null,
            plausible_wrong_1: f.plausible_wrong_1 || null, plausible_wrong_2: f.plausible_wrong_2 || null,
            plausible_wrong_3: f.plausible_wrong_3 || null,
            updated_at: new Date().toISOString(),
          })
          if (!error) inserted++
        } catch (err) { console.error('Erreur insertion fact:', err) }
      }

      setShowGenerateModal(false)
      toast?.(`✓ ${inserted} facts générés et ajoutés en brouillon`)
      await loadFacts()
    } catch (err) {
      console.error(err)
      toast?.('Erreur génération : ' + (err.message || ''), 'error')
    } finally {
      setGenLoading(false)
    }
  }


  // ── Enrich functions ──────────────────────────────────────────────────
  async function enrichSingleFact(fact) {
    setEnrichingSingleId(fact.id)
    try {
      const data = await callEdgeFunction('enrich-fact', {
        question: fact.question, short_answer: fact.short_answer,
        explanation: fact.explanation, category: fact.category,
        hint1: fact.hint1, hint2: fact.hint2,
      })
      await supabase.from('facts').update({
        hint1: data.hint1, hint2: data.hint2, hint3: data.hint3, hint4: data.hint4,
        funny_wrong_1: data.funny_wrong_1, funny_wrong_2: data.funny_wrong_2,
        close_wrong_1: data.close_wrong_1, close_wrong_2: data.close_wrong_2,
        plausible_wrong_1: data.plausible_wrong_1, plausible_wrong_2: data.plausible_wrong_2,
        plausible_wrong_3: data.plausible_wrong_3, updated_at: new Date().toISOString(),
      }).eq('id', fact.id)
      toast?.(`✓ Fact #${fact.id} enrichi`)
      await loadFacts()
    } catch (err) {
      toast?.(`Erreur enrichissement #${fact.id}: ${err.message}`, 'error')
    } finally {
      setEnrichingSingleId(null)
    }
  }

  async function enrichAllIncomplete() {
    enrichCancelRef.current = false
    setEnriching(true)
    try {
      const { data: incomplete, error } = await supabase
        .from('facts')
        .select('id, question, short_answer, explanation, category, hint1, hint2')
        .is('funny_wrong_1', null)
        .eq('is_published', true)
        .order('id')
      if (error) throw error
      if (!incomplete?.length) {
        toast?.('✅ Aucun fact incomplet à enrichir')
        setEnriching(false)
        return
      }
      if (!confirm(`Enrichir ${incomplete.length} facts incomplets ?`)) {
        setEnriching(false)
        return
      }
      setEnrichProgress({ current: 0, total: incomplete.length })
      let enriched = 0
      for (const fact of incomplete) {
        if (enrichCancelRef.current) break
        try {
          const data = await callEdgeFunction('enrich-fact', {
            question: fact.question, short_answer: fact.short_answer,
            explanation: fact.explanation, category: fact.category,
            hint1: fact.hint1, hint2: fact.hint2,
          })
          await supabase.from('facts').update({
            hint1: data.hint1, hint2: data.hint2, hint3: data.hint3, hint4: data.hint4,
            funny_wrong_1: data.funny_wrong_1, funny_wrong_2: data.funny_wrong_2,
            close_wrong_1: data.close_wrong_1, close_wrong_2: data.close_wrong_2,
            plausible_wrong_1: data.plausible_wrong_1, plausible_wrong_2: data.plausible_wrong_2,
            plausible_wrong_3: data.plausible_wrong_3, updated_at: new Date().toISOString(),
          }).eq('id', fact.id)
          enriched++
        } catch (err) {
          console.error(`Erreur enrichissement #${fact.id}:`, err)
        }
        setEnrichProgress({ current: enriched, total: incomplete.length })
      }
      toast?.(`✅ ${enriched}/${incomplete.length} facts enrichis`)
      await loadFacts()
    } catch (err) {
      toast?.('Erreur enrichissement : ' + (err.message || ''), 'error')
    } finally {
      setEnriching(false)
    }
  }

  const totalPages = Math.ceil(total / pageSize)
  const allSelected = facts.length > 0 && selected.size === facts.length
  const someSelected = selected.size > 0

  const inputCls = sharedInputCls
  const inputClsErr = sharedInputClsErr

  // Mobile filters toggle
  const [showFilters, setShowFilters] = useState(false)
  const activeFilterCount = [
    filterCategories.length > 0,
    filterVip !== 'all',
    filterPublished !== 'all',
    filterStatus !== 'all',
    filterPack !== 'all',
    filterImage !== 'all',
    filterRecent,
  ].filter(Boolean).length

  return (
    <div className="p-3 sm:p-6 flex flex-col h-full" style={{ minHeight: 0 }}>

      {/* ── Add fact modal ───────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/70 overflow-y-auto py-0 sm:py-6" onClick={() => setShowAddModal(false)}>
          <div className="bg-slate-800 sm:rounded-2xl border-y sm:border border-slate-700 w-full max-w-2xl mx-0 sm:mx-4 shadow-2xl min-h-screen sm:min-h-0" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-700">
              <h2 className="text-lg font-black text-white">➕ Ajouter un fact manuellement</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {/* Category + Difficulty */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                    Catégorie {addErrors.category && <span className="text-red-400 normal-case">— {addErrors.category}</span>}
                  </label>
                  <select
                    value={newFact.category}
                    onChange={e => setNewFactField('category', e.target.value)}
                    className={addErrors.category ? inputClsErr : inputCls}
                  >
                    <option value="">Choisir…</option>
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                    Niveau de difficulté {addErrors.difficulty && <span className="text-red-400 normal-case">— {addErrors.difficulty}</span>}
                  </label>
                  <select
                    value={newFact.difficulty}
                    onChange={e => setNewFactField('difficulty', e.target.value)}
                    className={addErrors.difficulty ? inputClsErr : inputCls}
                    style={{ color: difficultyStyle(newFact.difficulty).color }}
                  >
                    {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.value}</option>)}
                  </select>
                </div>
              </div>

              {/* Question */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Question (100 max) {addErrors.question && <span className="text-red-400 normal-case">— {addErrors.question}</span>}
                  </label>
                  <span className={`text-xs font-mono ${(newFact.question?.length || 0) > 100 ? 'text-red-400' : 'text-slate-600'}`}>
                    {newFact.question?.length || 0}/100
                  </span>
                </div>
                <textarea
                  value={newFact.question}
                  onChange={e => setNewFactField('question', e.target.value)}
                  rows={3}
                  className={addErrors.question ? inputClsErr : inputCls}
                  placeholder="Affirmation vraie ou fausse…"
                  maxLength={110}
                />
              </div>

              {/* Hints */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Indice 1 (20 max)</label>
                    <span className={`text-xs font-mono ${(newFact.hint1?.length || 0) > 20 ? 'text-red-400' : 'text-slate-600'}`}>{newFact.hint1?.length || 0}/20</span>
                  </div>
                  <input value={newFact.hint1} onChange={e => setNewFactField('hint1', e.target.value)} className={addErrors.hint1 ? inputClsErr : inputCls} placeholder="Indice 1…" maxLength={25} />
                </div>
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Indice 2 (20 max)</label>
                    <span className={`text-xs font-mono ${(newFact.hint2?.length || 0) > 20 ? 'text-red-400' : 'text-slate-600'}`}>{newFact.hint2?.length || 0}/20</span>
                  </div>
                  <input value={newFact.hint2} onChange={e => setNewFactField('hint2', e.target.value)} className={addErrors.hint2 ? inputClsErr : inputCls} placeholder="Indice 2…" maxLength={25} />
                </div>
              </div>

              {/* Short answer */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Réponse courte (50 max) {addErrors.short_answer && <span className="text-red-400 normal-case">— {addErrors.short_answer}</span>}
                  </label>
                  <span className={`text-xs font-mono ${(newFact.short_answer?.length || 0) > 50 ? 'text-red-400' : 'text-slate-600'}`}>{newFact.short_answer?.length || 0}/50</span>
                </div>
                <input value={newFact.short_answer} onChange={e => setNewFactField('short_answer', e.target.value)} className={addErrors.short_answer ? inputClsErr : inputCls} placeholder="VRAI ou FAUX…" maxLength={55} />
              </div>

              {/* Explanation */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Explication (100-300) {addErrors.explanation && <span className="text-red-400 normal-case">— {addErrors.explanation}</span>}
                  </label>
                  <span className={`text-xs font-mono ${(newFact.explanation?.length || 0) > 300 ? 'text-red-400' : 'text-slate-600'}`}>{newFact.explanation?.length || 0}/300</span>
                </div>
                <textarea value={newFact.explanation} onChange={e => setNewFactField('explanation', e.target.value)} rows={3} className={addErrors.explanation ? inputClsErr : inputCls} placeholder="Explication détaillée…" maxLength={310} />
              </div>

              {/* Options QCM */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Options QCM (50 max chacune)</label>
                <div className="grid grid-cols-2 gap-2">
                  {newFact.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="new_correct"
                        checked={newFact.correct_index === i}
                        onChange={() => setNewFactField('correct_index', i)}
                        className="w-3.5 h-3.5 shrink-0"
                        style={{ accentColor: '#FF6B1A' }}
                      />
                      <input
                        value={opt}
                        onChange={e => setNewFactOption(i, e.target.value)}
                        className={`${opt.length > 50 ? inputClsErr : inputCls} flex-1`}
                        placeholder={`Option ${i + 1}…`}
                        maxLength={55}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Source + Image */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">URL Source</label>
                  <input value={newFact.source_url} onChange={e => setNewFactField('source_url', e.target.value)} className={inputCls} placeholder="https://…" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">URL Image</label>
                  <div className="flex gap-2">
                    <input
                      value={newFact.image_url}
                      onChange={e => setNewFactField('image_url', e.target.value)}
                      className={`${inputCls} flex-1`}
                      placeholder="https://… ou importer →"
                    />
                    <label
                      className="cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-700 text-slate-200 text-xs font-bold hover:bg-slate-600 transition-all select-none shrink-0"
                      style={{ opacity: addImageUploading ? 0.5 : 1, pointerEvents: addImageUploading ? 'none' : 'auto' }}
                    >
                      {addImageUploading ? <span className="animate-spin">⟳</span> : '📁'}
                      <span className="hidden sm:inline">{addImageUploading ? 'Upload…' : 'Importer'}</span>
                      <input
                        ref={addImageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAddImageUpload}
                      />
                    </label>
                  </div>
                  {newFact.image_url && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-slate-700 bg-slate-900/80 flex items-center justify-center" style={{ height: 72 }}>
                      <img src={newFact.image_url} alt="aperçu" style={{ height: '100%', objectFit: 'contain' }} onError={e => e.target.style.display='none'} />
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-500 bg-slate-900 rounded-xl p-3">
                ℹ Ce fact sera créé en <span className="text-amber-400 font-semibold">Brouillon</span> — il ne sera pas visible par les joueurs tant que vous ne le passez pas en « Publié ».
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => { setShowAddModal(false); setNewFact(emptyFact()); setAddErrors({}) }} className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 font-bold text-sm hover:bg-slate-600 transition-all">
                Annuler
              </button>
              <button
                onClick={submitNewFact}
                disabled={addLoading}
                className="flex-1 py-3 rounded-xl text-white font-black text-sm transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #FF6B1A, #D94A10)' }}
              >
                {addLoading ? 'Création…' : '➕ Créer le fact'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Generate modal ───────────────────────────────────────────── */}
      {showGenerateModal && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70"
          onMouseDown={e => { e.currentTarget._mouseDownTarget = e.target }}
          onClick={e => { if (e.target === e.currentTarget && e.currentTarget._mouseDownTarget === e.target && !genLoading) setShowGenerateModal(false) }}
        >
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 border-b border-slate-700">
              <h2 className="text-lg font-black text-white">⚡ Générer des facts</h2>
              <p className="text-slate-500 text-xs mt-1">Les facts générés seront ajoutés automatiquement en brouillon.</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Catégorie</label>
                <select
                  value={genCategory}
                  onChange={e => setGenCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none"
                >
                  <option value="">Choisir une catégorie…</option>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  Nombre de facts à générer
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={genCount}
                    onChange={e => setGenCount(Number(e.target.value))}
                    className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                    style={{ background: `linear-gradient(to right, #FF6B1A 0%, #FF6B1A ${(genCount - 1) / 19 * 100}%, #374151 ${(genCount - 1) / 19 * 100}%, #374151 100%)` }}
                  />
                  <span className="text-white font-black text-lg tabular-nums w-8 text-center">{genCount}</span>
                </div>
              </div>

              {(!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_ADMIN_PASSWORD) && (
                <p className="text-amber-400 text-xs bg-amber-900/20 border border-amber-700/30 rounded-xl p-3">
                  ⚠ <span className="font-bold">VITE_SUPABASE_URL</span> ou <span className="font-bold">VITE_ADMIN_PASSWORD</span> non configuré — la génération ne fonctionnera pas.
                </p>
              )}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowGenerateModal(false)}
                disabled={genLoading}
                className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 font-bold text-sm hover:bg-slate-600 transition-all disabled:opacity-40"
              >
                Annuler
              </button>
              <button
                onClick={startGeneration}
                disabled={genLoading || !genCategory}
                className="flex-1 py-3 rounded-xl text-white font-black text-sm transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}
              >
                {genLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⟳</span> Génération…
                  </span>
                ) : '⚡ Générer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Batch modals ──────────────────────────────────────────────── */}
      {batchAction && (batchAction === 'category' || batchAction === 'pack') && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60" onClick={() => setBatchAction(null)}>
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 w-80" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-white mb-4">
              {batchAction === 'category' ? '🗂 Changer catégorie' : '📦 Changer pack'}
            </h3>
            {batchAction === 'category' ? (
              <select value={batchValue} onChange={e => setBatchValue(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm mb-4 focus:outline-none">
                <option value="">Choisir une catégorie…</option>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
              </select>
            ) : (
              <input value={batchValue} onChange={e => setBatchValue(e.target.value)} placeholder="ex: free, premium..." className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm mb-4 focus:outline-none" />
            )}
            <div className="flex gap-2">
              <button onClick={() => setBatchAction(null)} className="flex-1 py-2 rounded-xl bg-slate-700 text-slate-300 text-sm font-bold">Annuler</button>
              <button onClick={() => executeBatch()} disabled={!batchValue || batchLoading} className="flex-1 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-40" style={{ background: '#FF6B1A' }}>
                {batchLoading ? '…' : 'Appliquer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Mode de jeu (WTF! / Funny) */}
      {batchAction && (batchAction === 'mode_quete' || batchAction === 'mode_flash') && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60" onClick={() => setBatchAction(null)}>
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 w-80" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-white mb-3">
              {batchAction === 'mode_quete' ? '⚔️ Passer en WTF!' : '⚡ Passer en Funny F*cts'}
            </h3>
            <p className="text-slate-400 text-sm mb-5">
              {batchAction === 'mode_quete'
                ? `Passer ${selected.size} fact(s) en mode WTF! ?`
                : `Passer ${selected.size} fact(s) en Funny F*cts ?`}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setBatchAction(null)} className="flex-1 py-2 rounded-xl bg-slate-700 text-slate-300 text-sm font-bold">Annuler</button>
              <button onClick={() => executeBatch()} disabled={batchLoading} className="flex-1 py-2 rounded-xl text-white text-sm font-bold" style={{ background: batchAction === 'mode_quete' ? '#D97706' : '#7C3AED' }}>
                {batchLoading ? '…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Statut (radio) */}
      {batchAction === 'status_change' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60" onClick={() => setBatchAction(null)}>
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 w-80" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-white mb-4">📋 Changer le statut</h3>
            <div className="space-y-2 mb-5">
              {[
                { value: 'status_published', label: '✅ Publié', color: '#10B981' },
                { value: 'status_reserve', label: '🔒 Réserve', color: '#F59E0B' },
                { value: 'status_draft', label: '✏️ Brouillon', color: '#9CA3AF' },
              ].map(s => (
                <label key={s.value} className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all" style={{ background: batchValue === s.value ? `${s.color}20` : 'transparent', border: `1.5px solid ${batchValue === s.value ? s.color : 'transparent'}` }}>
                  <input type="radio" name="batch_status" value={s.value} checked={batchValue === s.value} onChange={() => setBatchValue(s.value)} className="w-4 h-4" style={{ accentColor: s.color }} />
                  <span className="text-sm font-bold" style={{ color: s.color }}>{s.label}</span>
                </label>
              ))}
            </div>
            <p className="text-slate-500 text-xs mb-4">{selected.size} fact(s) seront modifiés</p>
            <div className="flex gap-2">
              <button onClick={() => setBatchAction(null)} className="flex-1 py-2 rounded-xl bg-slate-700 text-slate-300 text-sm font-bold">Annuler</button>
              <button
                onClick={() => { if (batchValue) executeBatch(batchValue) }}
                disabled={!batchValue || batchLoading}
                className="flex-1 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-40"
                style={{ background: '#FF6B1A' }}
              >
                {batchLoading ? '…' : 'Appliquer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Supprimer (danger) */}
      {batchAction === 'delete' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60" onClick={() => setBatchAction(null)}>
          <div className="bg-slate-800 rounded-2xl p-6 border border-red-700 w-96" onClick={e => e.stopPropagation()}>
            <div className="text-2xl mb-2">🗑</div>
            <h3 className="font-black text-white mb-2">Supprimer définitivement ?</h3>
            <p className="text-slate-400 text-sm mb-1">
              <span className="text-red-400 font-bold">⚠️ Supprimer {selected.size} fact(s) définitivement ?</span>
            </p>
            <p className="text-slate-500 text-xs mb-5">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setBatchAction(null)} className="flex-1 py-2.5 rounded-xl bg-slate-700 text-slate-300 text-sm font-bold hover:bg-slate-600 transition-all">Annuler</button>
              <button onClick={() => executeBatch()} disabled={batchLoading} className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50 transition-all" style={{ background: '#DC2626' }}>
                {batchLoading ? '…' : '🗑 Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 shrink-0 flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Facts</h1>
          <p className="text-slate-400 text-sm">{total} facts au total</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #FF6B1A, #D94A10)' }}
          >
            ➕<span className="hidden sm:inline"> Ajouter un fact</span><span className="sm:hidden"> Ajouter</span>
          </button>
        </div>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-4 shrink-0">
        {/* Search bar — always visible */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="pl-9 pr-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none w-52"
          />
        </div>

        {/* Mobile toggle button for filters */}
        <button
          onClick={() => setShowFilters(v => !v)}
          className="md:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-300 hover:bg-slate-700 transition-all"
        >
          🎛 Filtres{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''} {showFilters ? '▴' : '▾'}
        </button>

        {/* Collapsible filters — hidden on mobile by default, always visible on md+ */}
        <div className={`${showFilters ? 'flex' : 'hidden'} md:flex flex-wrap gap-2 w-full md:w-auto`}>

          {/* Page size selector */}
          <select
            value={pageSize}
            onChange={e => setPageSize(Number(e.target.value))}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-300 focus:outline-none cursor-pointer hover:bg-slate-700 transition-all"
          >
            {PAGE_SIZE_OPTIONS.map(n => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>

          {/* Category dropdown */}
          <div className="relative" ref={catDropdownRef}>
            <button
              onClick={() => setShowCatDropdown(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-300 hover:bg-slate-700 transition-all"
            >
              Catégorie{filterCategories.length > 0 ? ` (${filterCategories.length})` : ''} ▾
            </button>
            {showCatDropdown && (
              <div className="absolute top-full left-0 mt-1 z-20 w-52 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-auto" style={{ maxHeight: 300 }}>
                <div className="p-2 border-b border-slate-700 flex justify-between">
                  <button onClick={() => setFilterCategories([])} className="text-xs text-slate-400 hover:text-white">Tout effacer</button>
                  <button onClick={() => setShowCatDropdown(false)} className="text-xs text-slate-400 hover:text-white">Fermer</button>
                </div>
                {CATEGORIES.map(c => (
                  <label key={c.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-700 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={filterCategories.includes(c.id)}
                      onChange={e => {
                        setFilterCategories(prev => e.target.checked ? [...prev, c.id] : prev.filter(x => x !== c.id))
                      }}
                      className="w-3.5 h-3.5"
                    />
                    <span>{c.emoji} {c.label}</span>
                  </label>
                ))}
                <div className="p-2 border-t border-slate-700">
                  <button onClick={() => setShowCatDropdown(false)} className="w-full text-xs text-center text-slate-400 hover:text-white py-1 rounded hover:bg-slate-700 transition-colors">
                    ▲ Fermer
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* WTF! / Funny filter */}
          <div className="flex rounded-xl overflow-hidden border border-slate-700">
            {[
              { value: 'all',    label: 'Tous' },
              { value: 'vip',    label: '⭐ WTF!', color: '#F59E0B' },
              { value: 'non-vip', label: '⚡ Funny F*cts', color: '#7C3AED' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilterVip(opt.value)}
                className="px-3 py-2 text-xs font-bold transition-all"
                style={{
                  background: filterVip === opt.value ? (opt.color || '#FF6B1A') : 'transparent',
                  color: filterVip === opt.value ? 'white' : '#94A3B8',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Recent filter */}
          <button
            onClick={() => setFilterRecent(v => !v)}
            className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
            style={{
              background: filterRecent ? '#3B82F6' : 'transparent',
              color: filterRecent ? 'white' : '#94A3B8',
              border: `1px solid ${filterRecent ? '#3B82F6' : '#334155'}`,
            }}
          >
            🕐 Récents (24h)
          </button>

          {/* Brouillons filter */}
          <button
            onClick={() => {
              const next = filterPublished === 'unpublished' ? 'all' : 'unpublished'
              setFilterPublished(next)
              if (next === 'unpublished') setFilterStatus('draft')
              else setFilterStatus('all')
            }}
            className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
            style={{
              background: filterPublished === 'unpublished' ? '#EF4444' : 'transparent',
              color: filterPublished === 'unpublished' ? 'white' : '#94A3B8',
              border: `1px solid ${filterPublished === 'unpublished' ? '#EF4444' : '#334155'}`,
            }}
          >
            📝 Brouillons
          </button>

          {/* Status filter */}
          <div className="flex rounded-xl overflow-hidden border border-slate-700">
            {[
              { value: 'all', label: 'Tous', color: '#FF6B1A' },
              ...STATUSES.map(s => ({ value: s.value, label: `${s.icon}`, color: s.color, title: s.label })),
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilterStatus(opt.value)}
                className="px-3 py-2 text-xs font-bold transition-all"
                title={opt.title || opt.label}
                style={{
                  background: filterStatus === opt.value ? (opt.color || '#FF6B1A') : 'transparent',
                  color: filterStatus === opt.value ? 'white' : '#94A3B8',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <select
            value={filterPack}
            onChange={e => setFilterPack(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-300 focus:outline-none"
          >
            <option value="all">Pack : Tous</option>
            <option value="free">Free</option>
            <option value="premium">Premium</option>
          </select>

          {/* Filtre image */}
          <select
            value={filterImage}
            onChange={e => setFilterImage(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-300 focus:outline-none"
            style={filterImage !== 'all' ? { borderColor: filterImage === 'with' ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)' } : {}}
          >
            <option value="all">Image : Tous</option>
            <option value="with">🖼️ Avec image</option>
            <option value="without">❌ Sans image</option>
          </select>

          {(search || filterCategories.length || filterVip !== 'all' || filterPublished !== 'all' || filterStatus !== 'all' || filterPack !== 'all' || filterImage !== 'all') && (
            <button
              onClick={() => { setSearch(''); setFilterCategories([]); setFilterVip('all'); setFilterPublished('all'); setFilterStatus('all'); setFilterPack('all'); setFilterImage('all') }}
              className="px-3 py-2 rounded-xl bg-red-900/30 border border-red-800 text-red-400 text-sm hover:bg-red-900/50 transition-all"
            >
              ✕ Effacer
            </button>
          )}
        </div>
      </div>

      {/* ── Batch action bar ──────────────────────────────────────────── */}
      {someSelected && (
        <div className="fixed bottom-0 left-0 right-0 z-20 md:relative md:z-auto flex items-center gap-3 mb-0 md:mb-3 p-3 rounded-none md:rounded-xl bg-slate-800 border-t md:border shrink-0" style={{ borderColor: 'rgba(255,107,26,0.3)', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <span className="text-sm font-bold shrink-0" style={{ color: '#FF6B1A' }}>
            {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Groupe 1 — Mode de jeu */}
            <button onClick={() => { setBatchAction('mode_quete'); setBatchValue('') }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-80 transition-all min-h-[44px] md:min-h-0" style={{ background: '#D97706' }}>⚔️ WTF!</button>
            <button onClick={() => { setBatchAction('mode_flash'); setBatchValue('') }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-80 transition-all min-h-[44px] md:min-h-0" style={{ background: '#7C3AED' }}>⚡ Funny</button>
            <span className="text-slate-600 mx-1 hidden md:inline">|</span>
            {/* Groupe 2 — Statut */}
            <button onClick={() => { setBatchAction('status_change'); setBatchValue('') }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-80 transition-all min-h-[44px] md:min-h-0" style={{ background: '#334155' }}>📋 Statut</button>
            <span className="text-slate-600 mx-1 hidden md:inline">|</span>
            {/* Groupe 3 — Organisation */}
            <button onClick={() => { setBatchAction('category'); setBatchValue('') }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-80 transition-all min-h-[44px] md:min-h-0" style={{ background: '#334155' }}>🗂 Catégorie</button>
            <button onClick={() => { setBatchAction('pack'); setBatchValue('') }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-80 transition-all min-h-[44px] md:min-h-0" style={{ background: '#334155' }}>📦 Pack</button>
            <span className="text-slate-600 mx-1 hidden md:inline">|</span>
            {/* Groupe 4 — Danger */}
            <button onClick={() => { setBatchAction('delete'); setBatchValue('') }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-80 transition-all min-h-[44px] md:min-h-0" style={{ background: '#DC2626' }}>🗑 Supprimer</button>
          </div>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-slate-500 hover:text-white text-sm shrink-0 min-h-[44px] md:min-h-0 min-w-[44px] flex items-center justify-center">✕</button>
        </div>
      )}

      {/* ── Table (desktop) ──────────────────────────────────────────── */}
      <div className={`flex-1 overflow-auto rounded-xl border border-slate-700 hidden md:block`}>
        <table className="w-full text-sm border-collapse min-w-[700px]">
          <thead className="sticky top-0 bg-slate-900 z-10">
            <tr className="border-b border-slate-700">
              <th className="w-10 px-3 py-3">
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="w-3.5 h-3.5" />
              </th>
              <th className="px-3 py-3 text-left cursor-pointer text-slate-400 hover:text-white" onClick={() => handleSort('id')}>
                ID<SortIcon field="id" current={sortField} dir={sortDir} />
              </th>
              <th className="px-3 py-3 text-left cursor-pointer text-slate-400 hover:text-white" onClick={() => handleSort('category')}>
                Catégorie<SortIcon field="category" current={sortField} dir={sortDir} />
              </th>
              <th className="px-3 py-3 text-left cursor-pointer text-slate-400 hover:text-white" onClick={() => handleSort('question')}>
                Question<SortIcon field="question" current={sortField} dir={sortDir} />
              </th>
              <th className="px-3 py-3 text-center text-slate-400">Image</th>
              <th className="px-3 py-3 text-center text-slate-400">WTF!</th>
              <th className="px-3 py-3 text-center text-slate-400">Statut</th>
              <th className="px-3 py-3 text-left text-slate-400">Pack</th>
              <th className="px-3 py-3 text-left cursor-pointer text-slate-400 hover:text-white" onClick={() => handleSort('updated_at')}>
                Modifié<SortIcon field="updated_at" current={sortField} dir={sortDir} />
              </th>
              <th className="px-3 py-3 text-center text-slate-400">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="text-center py-12 text-slate-500">Chargement…</td></tr>
            ) : facts.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-12 text-slate-500">Aucun fact trouvé</td></tr>
            ) : (
              facts.map(fact => (
                <tr
                  key={fact.id}
                  className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                  style={{ background: selected.has(fact.id) ? 'rgba(255,107,26,0.06)' : undefined }}
                >
                  <td className="px-3 py-2.5 text-center">
                    <input type="checkbox" checked={selected.has(fact.id)} onChange={() => toggleSelect(fact.id)} className="w-3.5 h-3.5" />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-slate-400 text-xs">{fact.id}</td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-semibold text-slate-300">
                      {getCategoryEmoji(fact.category)} {getCategoryLabel(fact.category)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-300 max-w-xs truncate">
                    {fact.question?.slice(0, 55)}{fact.question?.length > 55 ? '…' : ''}
                  </td>
                  {/* Indicateur image */}
                  <td className="px-3 py-2.5 text-center">
                    {fact.image_url
                      ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                          style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}
                          title={fact.image_url}
                        >
                          🖼️
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                          style={{ background: 'rgba(239,68,68,0.1)', color: 'rgba(239,68,68,0.6)' }}
                        >
                          ✕
                        </span>
                      )
                    }
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <button onClick={() => toggleVip(fact)} title="Toggle WTF!">
                      {fact.is_vip ? '⭐' : <span className="text-slate-700">☆</span>}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <StatusBadge value={fact.status || (fact.is_published ? 'published' : 'draft')} />
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-bold"
                      style={{
                        background: fact.pack_id === 'free' ? 'rgba(34,197,94,0.12)' : 'rgba(255,107,26,0.15)',
                        color: fact.pack_id === 'free' ? '#22C55E' : '#FF6B1A',
                      }}
                    >
                      {fact.pack_id || 'free'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-500">{fmtDate(fact.updated_at)}</td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {!fact.funny_wrong_1 && (
                        <button
                          onClick={() => enrichSingleFact(fact)}
                          disabled={enrichingSingleId === fact.id}
                          className="px-2 py-1 rounded-lg text-xs font-bold transition-all hover:opacity-80 disabled:opacity-40"
                          style={{ background: '#F59E0B', color: 'white' }}
                          title="Enrichir ce fact"
                        >
                          {enrichingSingleId === fact.id ? '⟳' : '✨'}
                        </button>
                      )}
                      <Link
                        to={`/facts/${fact.id}`}
                        className="px-3 py-1 rounded-lg text-xs font-bold text-white transition-all hover:opacity-80"
                        style={{ background: '#FF6B1A' }}
                      >
                        Éditer
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Cards (mobile) ────────────────────────────────────────────── */}
      <div className={`md:hidden flex-1 overflow-auto space-y-2 ${someSelected ? 'pb-16' : ''}`}>
        {loading ? (
          <div className="text-center py-12 text-slate-500">Chargement...</div>
        ) : facts.length === 0 ? (
          <div className="text-center py-12 text-slate-500">Aucun fact trouve</div>
        ) : (
          facts.map(fact => (
            <div
              key={fact.id}
              className="rounded-xl border border-slate-700 p-3 transition-colors"
              style={{ background: selected.has(fact.id) ? 'rgba(255,107,26,0.08)' : '#1E293B' }}
            >
              {/* Row 1: checkbox + #id + emoji cat + status + VIP toggle */}
              <div className="flex items-center gap-2 mb-1.5">
                <input
                  type="checkbox"
                  checked={selected.has(fact.id)}
                  onChange={() => toggleSelect(fact.id)}
                  className="w-4 h-4 shrink-0"
                />
                <span className="font-mono text-xs text-slate-500">#{fact.id}</span>
                <span className="text-sm">{getCategoryEmoji(fact.category)}</span>
                <StatusBadge value={fact.status || (fact.is_published ? 'published' : 'draft')} />
                <button onClick={() => toggleVip(fact)} className="ml-auto text-lg min-w-[44px] min-h-[44px] flex items-center justify-center">
                  {fact.is_vip ? '⭐' : <span className="text-slate-700">☆</span>}
                </button>
              </div>
              {/* Row 2: question */}
              <p className="text-sm text-slate-300 line-clamp-2 mb-1.5 leading-snug">{fact.question}</p>
              {/* Row 3: image indicator + pack + date */}
              <div className="flex items-center gap-2 text-xs mb-2.5">
                {fact.image_url ? (
                  <span className="px-1.5 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>🖼️</span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(239,68,68,0.1)', color: 'rgba(239,68,68,0.6)' }}>✕</span>
                )}
                <span
                  className="px-2 py-0.5 rounded text-xs font-bold"
                  style={{
                    background: fact.pack_id === 'free' ? 'rgba(34,197,94,0.12)' : 'rgba(255,107,26,0.15)',
                    color: fact.pack_id === 'free' ? '#22C55E' : '#FF6B1A',
                  }}
                >
                  {fact.pack_id || 'free'}
                </span>
                <span className="text-slate-500 ml-auto">{fmtDate(fact.updated_at)}</span>
              </div>
              {/* Edit button */}
              <Link
                to={`/facts/${fact.id}`}
                className="w-full text-center py-2.5 rounded-lg text-sm font-bold text-white transition-all hover:opacity-80 min-h-[44px] flex items-center justify-center"
                style={{ background: '#FF6B1A' }}
              >
                Editer
              </Link>
            </div>
          ))
        )}
      </div>

      {/* ── Pagination ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mt-3 shrink-0 flex-wrap gap-2">
        <span className="text-xs md:text-sm text-slate-400">
          {page * pageSize + 1}-{Math.min((page + 1) * pageSize, total)} / {total}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 md:px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs md:text-sm text-slate-300 disabled:opacity-30 hover:bg-slate-700 transition-all min-h-[44px]"
          >
            ← <span className="hidden sm:inline">Precedent</span>
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 md:px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs md:text-sm text-slate-300 disabled:opacity-30 hover:bg-slate-700 transition-all min-h-[44px]"
          >
            <span className="hidden sm:inline">Suivant </span>→
          </button>
        </div>
      </div>
    </div>
  )
}
