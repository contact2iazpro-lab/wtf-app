import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CATEGORIES, getCategoryLabel, getCategoryEmoji } from '../constants/categories'

const PAGE_SIZE = 50

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function Toggle({ on, onChange, color }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onChange(!on) }}
      className="relative w-10 h-5 rounded-full transition-all flex-shrink-0"
      style={{ background: on ? (color || '#22C55E') : '#374151' }}
    >
      <div
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
        style={{ left: on ? '22px' : '2px' }}
      />
    </button>
  )
}

function SortIcon({ field, current, dir }) {
  if (field !== current) return <span className="text-slate-600 ml-1">↕</span>
  return <span className="ml-1" style={{ color: '#FF6B1A' }}>{dir === 'asc' ? '↑' : '↓'}</span>
}

export default function FactsListPage({ toast }) {
  const [facts, setFacts] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterCategories, setFilterCategories] = useState([])
  const [filterVip, setFilterVip] = useState('all')
  const [filterPublished, setFilterPublished] = useState('all')
  const [filterPack, setFilterPack] = useState('all')
  const [showCatDropdown, setShowCatDropdown] = useState(false)

  // Sort
  const [sortField, setSortField] = useState('id')
  const [sortDir, setSortDir] = useState('asc')

  // Batch
  const [selected, setSelected] = useState(new Set())
  const [batchAction, setBatchAction] = useState(null) // null | 'category' | 'vip' | 'unpublish' | 'pack'
  const [batchValue, setBatchValue] = useState('')
  const [batchLoading, setBatchLoading] = useState(false)

  const searchRef = useRef(null)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0) }, 300)
    return () => clearTimeout(t)
  }, [search])

  // Reset page on filter change
  useEffect(() => { setPage(0); setSelected(new Set()) }, [filterCategories, filterVip, filterPublished, filterPack])

  // Load facts
  useEffect(() => { loadFacts() }, [page, debouncedSearch, filterCategories, filterVip, filterPublished, filterPack, sortField, sortDir])

  const loadFacts = useCallback(async () => {
    setLoading(true)
    try {
      let q = supabase
        .from('facts')
        .select('id, category, question, is_vip, is_published, pack_id, updated_at', { count: 'exact' })

      if (debouncedSearch) {
        q = q.or(`question.ilike.%${debouncedSearch}%,explanation.ilike.%${debouncedSearch}%,short_answer.ilike.%${debouncedSearch}%`)
      }
      if (filterCategories.length) q = q.in('category', filterCategories)
      if (filterVip === 'vip') q = q.eq('is_vip', true)
      if (filterVip === 'non-vip') q = q.eq('is_vip', false)
      if (filterPublished === 'published') q = q.eq('is_published', true)
      if (filterPublished === 'unpublished') q = q.eq('is_published', false)
      if (filterPack !== 'all') q = q.eq('pack_id', filterPack)

      q = q.order(sortField, { ascending: sortDir === 'asc' })
      q = q.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

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
  }, [page, debouncedSearch, filterCategories, filterVip, filterPublished, filterPack, sortField, sortDir])

  async function toggleVip(fact) {
    const newVal = !fact.is_vip
    setFacts(prev => prev.map(f => f.id === fact.id ? { ...f, is_vip: newVal } : f))
    const { error } = await supabase.from('facts').update({ is_vip: newVal }).eq('id', fact.id)
    if (error) { toast?.('Erreur mise à jour VIP', 'error'); loadFacts() }
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

  async function executeBatch() {
    if (!selected.size) return
    const ids = Array.from(selected)
    setBatchLoading(true)
    try {
      let updateObj = {}
      if (batchAction === 'category') updateObj = { category: batchValue }
      else if (batchAction === 'vip') updateObj = { is_vip: true }
      else if (batchAction === 'unpublish') updateObj = { is_published: false }
      else if (batchAction === 'pack') updateObj = { pack_id: batchValue }

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

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const allSelected = facts.length > 0 && selected.size === facts.length
  const someSelected = selected.size > 0

  return (
    <div className="p-6 flex flex-col h-full" style={{ minHeight: 0 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-white">Facts</h1>
          <p className="text-slate-400 text-sm">{total} facts au total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4 shrink-0">
        {/* Text search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="pl-9 pr-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-DEFAULT w-56"
            style={{ '--tw-ring-color': '#FF6B1A' }}
          />
        </div>

        {/* Category dropdown */}
        <div className="relative">
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
                      setFilterCategories(prev =>
                        e.target.checked ? [...prev, c.id] : prev.filter(x => x !== c.id)
                      )
                    }}
                    className="w-3.5 h-3.5"
                  />
                  <span>{c.emoji} {c.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* VIP filter */}
        <select
          value={filterVip}
          onChange={e => setFilterVip(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-300 focus:outline-none"
        >
          <option value="all">VIP : Tous</option>
          <option value="vip">VIP seulement ⭐</option>
          <option value="non-vip">Non-VIP</option>
        </select>

        {/* Published filter */}
        <select
          value={filterPublished}
          onChange={e => setFilterPublished(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-300 focus:outline-none"
        >
          <option value="all">Publication : Tous</option>
          <option value="published">Publiés</option>
          <option value="unpublished">Non publiés</option>
        </select>

        {/* Pack filter */}
        <select
          value={filterPack}
          onChange={e => setFilterPack(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-300 focus:outline-none"
        >
          <option value="all">Pack : Tous</option>
          <option value="free">Free</option>
          <option value="premium">Premium</option>
        </select>

        {/* Reset filters */}
        {(search || filterCategories.length || filterVip !== 'all' || filterPublished !== 'all' || filterPack !== 'all') && (
          <button
            onClick={() => { setSearch(''); setFilterCategories([]); setFilterVip('all'); setFilterPublished('all'); setFilterPack('all') }}
            className="px-3 py-2 rounded-xl bg-red-900/30 border border-red-800 text-red-400 text-sm hover:bg-red-900/50 transition-all"
          >
            ✕ Effacer
          </button>
        )}
      </div>

      {/* Batch action bar */}
      {someSelected && (
        <div className="flex items-center gap-3 mb-3 p-3 rounded-xl bg-slate-800 border border-orange-DEFAULT/30 shrink-0"
          style={{ borderColor: 'rgba(255,107,26,0.3)' }}>
          <span className="text-sm font-bold" style={{ color: '#FF6B1A' }}>
            {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
          </span>
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'vip',       label: '⭐ Marquer VIP' },
              { key: 'unpublish', label: '👁 Dépublier' },
              { key: 'category',  label: '🗂 Changer catégorie' },
              { key: 'pack',      label: '📦 Changer pack' },
            ].map(a => (
              <button
                key={a.key}
                onClick={() => { setBatchAction(a.key); setBatchValue('') }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-700 text-white hover:bg-slate-600 transition-all"
              >
                {a.label}
              </button>
            ))}
          </div>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-slate-500 hover:text-white text-sm">✕</button>
        </div>
      )}

      {/* Batch action modal */}
      {batchAction && (batchAction === 'category' || batchAction === 'pack') && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60" onClick={() => setBatchAction(null)}>
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 w-80" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-white mb-4">
              {batchAction === 'category' ? '🗂 Changer catégorie' : '📦 Changer pack'}
            </h3>
            {batchAction === 'category' ? (
              <select
                value={batchValue}
                onChange={e => setBatchValue(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm mb-4 focus:outline-none"
              >
                <option value="">Choisir une catégorie…</option>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
              </select>
            ) : (
              <input
                value={batchValue}
                onChange={e => setBatchValue(e.target.value)}
                placeholder="ex: free, premium..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm mb-4 focus:outline-none"
              />
            )}
            <div className="flex gap-2">
              <button onClick={() => setBatchAction(null)} className="flex-1 py-2 rounded-xl bg-slate-700 text-slate-300 text-sm font-bold">Annuler</button>
              <button
                onClick={executeBatch}
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

      {/* Immediate batch actions (no input needed) */}
      {batchAction && (batchAction === 'vip' || batchAction === 'unpublish') && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60" onClick={() => setBatchAction(null)}>
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 w-80" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-white mb-3">
              {batchAction === 'vip' ? '⭐ Marquer VIP' : '👁 Dépublier'}
            </h3>
            <p className="text-slate-400 text-sm mb-5">
              {batchAction === 'vip'
                ? `Marquer ${selected.size} fact(s) comme VIP ?`
                : `Dépublier ${selected.size} fact(s) ?`}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setBatchAction(null)} className="flex-1 py-2 rounded-xl bg-slate-700 text-slate-300 text-sm font-bold">Annuler</button>
              <button
                onClick={executeBatch}
                disabled={batchLoading}
                className="flex-1 py-2 rounded-xl text-white text-sm font-bold"
                style={{ background: batchAction === 'unpublish' ? '#EF4444' : '#FF6B1A' }}
              >
                {batchLoading ? '…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-xl border border-slate-700">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-slate-900 z-10">
            <tr className="border-b border-slate-700">
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="w-3.5 h-3.5"
                />
              </th>
              <th className="px-3 py-3 text-left cursor-pointer text-slate-400 hover:text-white" onClick={() => handleSort('id')}>
                ID<SortIcon field="id" current={sortField} dir={sortDir} />
              </th>
              <th className="px-3 py-3 text-left cursor-pointer text-slate-400 hover:text-white" onClick={() => handleSort('category')}>
                Catégorie<SortIcon field="category" current={sortField} dir={sortDir} />
              </th>
              <th className="px-3 py-3 text-left text-slate-400">Question</th>
              <th className="px-3 py-3 text-center text-slate-400">VIP</th>
              <th className="px-3 py-3 text-center text-slate-400">Publié</th>
              <th className="px-3 py-3 text-left text-slate-400">Pack</th>
              <th className="px-3 py-3 text-left cursor-pointer text-slate-400 hover:text-white" onClick={() => handleSort('updated_at')}>
                Modifié<SortIcon field="updated_at" current={sortField} dir={sortDir} />
              </th>
              <th className="px-3 py-3 text-center text-slate-400">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-12 text-slate-500">Chargement…</td></tr>
            ) : facts.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-slate-500">Aucun fact trouvé</td></tr>
            ) : (
              facts.map(fact => (
                <tr
                  key={fact.id}
                  className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                  style={{ background: selected.has(fact.id) ? 'rgba(255,107,26,0.06)' : undefined }}
                >
                  <td className="px-3 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={selected.has(fact.id)}
                      onChange={() => toggleSelect(fact.id)}
                      className="w-3.5 h-3.5"
                    />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-slate-400 text-xs">{fact.id}</td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-semibold text-slate-300">
                      {getCategoryEmoji(fact.category)} {getCategoryLabel(fact.category)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-300 max-w-xs truncate">
                    {fact.question?.slice(0, 60)}{fact.question?.length > 60 ? '…' : ''}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <button onClick={() => toggleVip(fact)} title="Toggle VIP">
                      {fact.is_vip ? '⭐' : <span className="text-slate-700">☆</span>}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Toggle on={fact.is_published} onChange={() => togglePublished(fact)} />
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
                  <td className="px-3 py-2.5 text-xs text-slate-500">{fmt(fact.updated_at)}</td>
                  <td className="px-3 py-2.5 text-center">
                    <Link
                      to={`/facts/${fact.id}`}
                      className="px-3 py-1 rounded-lg text-xs font-bold text-white transition-all hover:opacity-80"
                      style={{ background: '#FF6B1A' }}
                    >
                      Éditer
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 shrink-0">
        <span className="text-sm text-slate-400">
          Page {page + 1} / {totalPages || 1} · {total} facts
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-300 disabled:opacity-30 hover:bg-slate-700 transition-all"
          >
            ← Précédent
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-300 disabled:opacity-30 hover:bg-slate-700 transition-all"
          >
            Suivant →
          </button>
        </div>
      </div>
    </div>
  )
}
