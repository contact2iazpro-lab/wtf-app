import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CATEGORIES, getCategoryLabel, VIP_USAGES } from '../constants/categories'
import { fmtDateTime } from '../utils/helpers'

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
      <div className="text-3xl font-black mb-1" style={{ color: color || '#FF6B1A' }}>
        {value ?? '—'}
      </div>
      <div className="text-sm font-semibold text-slate-300">{label}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function BarChart({ data, max, color = '#FF6B1A' }) {
  const m = max || Math.max(...data.map(d => d.count), 1)
  return (
    <div className="space-y-1.5">
      {data.map(d => (
        <div key={d.id} className="flex items-center gap-2 text-xs">
          <span className="w-5 text-center">{d.emoji}</span>
          <span className="w-28 text-slate-400 truncate">{d.label}</span>
          <div className="flex-1 h-4 bg-slate-700 rounded overflow-hidden">
            <div
              className="h-full rounded transition-all"
              style={{ width: `${(d.count / m) * 100}%`, background: color }}
            />
          </div>
          <span className="w-8 text-right text-slate-400">{d.count}</span>
        </div>
      ))}
    </div>
  )
}

const ALL_QUALITY_CHECKS = [
  { key: 'noImage',               emoji: '📷', label: 'Sans image' },
  { key: 'questionTooLong',       emoji: '📝', label: 'Question trop longue' },
  { key: 'explanationOutOfRange', emoji: '📖', label: 'Explication hors limites' },
  { key: 'incompleteHints',       emoji: '💡', label: 'Indices incomplets (< 4)' },
  { key: 'noSourceUrl',           emoji: '🔗', label: 'Sans URL source' },
  { key: 'missingWrongAnswers',   emoji: '🎭', label: 'Fausses réponses incomplètes' },
]


export default function DashboardPage({ toast }) {
  const [stats, setStats] = useState(null)
  const [categoryData, setCategoryData] = useState([])
  const [vipByUsage, setVipByUsage] = useState([])
  const [typeData, setTypeData] = useState([])
  const [recentEdits, setRecentEdits] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState(null) // null | 'running' | 'done' | 'error'
  const [syncMessage, setSyncMessage] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all') // 'all' | 'published' | 'unpublished' | 'doublon'
  const [allFactsForFilter, setAllFactsForFilter] = useState([])
  const [qualityIssues, setQualityIssues] = useState(null)
  const [qualityLoading, setQualityLoading] = useState(true)
  const [qualityError, setQualityError] = useState(false)
  const [expandedIssue, setExpandedIssue] = useState(null)

  useEffect(() => { load(); fetchQualityIssues() }, [])

  async function load() {
    setLoading(true)
    try {
      const [
        { count: total },
        { count: published },
        { count: unpublished },
        { count: vipTotal },
        { data: allFacts },
        { data: history },
      ] = await Promise.all([
        supabase.from('facts').select('*', { count: 'exact', head: true }),
        supabase.from('facts').select('*', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('facts').select('*', { count: 'exact', head: true }).eq('is_published', false),
        supabase.from('facts').select('*', { count: 'exact', head: true }).eq('is_vip', true),
        (async () => {
          const all = []
          let from = 0
          const PAGE = 1000
          while (true) {
            const { data, error } = await supabase.from('facts').select('category, is_published, vip_usage, is_vip, type, archived_reason').range(from, from + PAGE - 1)
            if (error || !data || data.length === 0) break
            all.push(...data)
            if (data.length < PAGE) break
            from += PAGE
          }
          return { data: all }
        })(),
        supabase.from('edit_history').select('*').order('edited_at', { ascending: false }).limit(5),
      ])

      setStats({ total, published, unpublished, vipTotal })
      setAllFactsForFilter(allFacts || [])

      // Category counts (will be recalculated via filter)
      updateCategoryData(allFacts || [], 'all')

      // Quête by usage
      const usageCounts = {}
      for (const f of (allFacts || []).filter(f => f.is_vip)) {
        const u = f.vip_usage || 'available'
        usageCounts[u] = (usageCounts[u] || 0) + 1
      }
      setVipByUsage(
        VIP_USAGES.map(u => ({ ...u, count: usageCounts[u.value] || 0 }))
      )

      // Type distribution (VIP boss / Funny)
      const typeCounts = { vip: 0, generated: 0 }
      for (const f of (allFacts || [])) {
        if (f.is_vip) typeCounts.vip++
        else typeCounts.generated++
      }
      const typeTotal = (allFacts || []).length || 1
      setTypeData([
        { value: 'WTF!', count: typeCounts.vip, color: '#FFD700', pct: Math.round((typeCounts.vip / typeTotal) * 100) },
        { value: 'Funny F*cts', count: typeCounts.generated, color: '#8B5CF6', pct: Math.round((typeCounts.generated / typeTotal) * 100) },
      ])

      setRecentEdits(history || [])
    } catch (err) {
      console.error(err)
      toast?.('Erreur chargement dashboard', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ── Filter category data by publication status ────────────────────────
  function updateCategoryData(facts, filter) {
    let filtered = facts
    if (filter === 'published') {
      filtered = facts.filter(f => f.is_published === true)
    } else if (filter === 'unpublished') {
      filtered = facts.filter(f => f.is_published === false)
    } else if (filter === 'doublon') {
      filtered = facts.filter(f => f.archived_reason === 'doublon')
    }
    // filter === 'all' uses all facts

    const catCounts = {}
    for (const f of filtered) {
      catCounts[f.category] = (catCounts[f.category] || 0) + 1
    }
    const catData = CATEGORIES
      .map(c => ({ ...c, count: catCounts[c.id] || 0 }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
    setCategoryData(catData)
  }

  function handleCategoryFilterChange(newFilter) {
    setCategoryFilter(newFilter)
    updateCategoryData(allFactsForFilter, newFilter)
  }

  async function fetchQualityIssues() {
    setQualityLoading(true)
    setQualityError(false)
    try {
      // Fetch ALL facts with relevant columns for quality checks
      const all = []
      let from = 0
      const PAGE = 1000
      while (true) {
        const { data, error } = await supabase
          .from('facts')
          .select('id, question, hint1, hint2, hint3, hint4, explanation, options, image_url, source_url, category, is_published, funny_wrong_1, funny_wrong_2, close_wrong_1, close_wrong_2, plausible_wrong_1, plausible_wrong_2, plausible_wrong_3')
          .range(from, from + PAGE - 1)
        if (error) throw error
        if (!data || data.length === 0) break
        all.push(...data)
        if (data.length < PAGE) break
        from += PAGE
      }

      const isEmpty = v => !v || (typeof v === 'string' && v.trim() === '')

      setQualityIssues({
        noImage:               all.filter(x => isEmpty(x.image_url)),
        questionTooLong:       all.filter(x => x.question && x.question.length > 100),
        explanationOutOfRange: all.filter(x => !x.explanation || x.explanation.length < 100 || x.explanation.length > 300),
        incompleteHints:       all.filter(x => {
          const filled = [x.hint1, x.hint2, x.hint3, x.hint4]
            .filter(h => h && h.trim() !== '').length
          return filled < 4
        }),
        noSourceUrl:           all.filter(x => isEmpty(x.source_url)),
        missingWrongAnswers:   all.filter(x =>
          isEmpty(x.funny_wrong_1) || isEmpty(x.funny_wrong_2) ||
          isEmpty(x.close_wrong_1) || isEmpty(x.close_wrong_2) ||
          isEmpty(x.plausible_wrong_1) || isEmpty(x.plausible_wrong_2) || isEmpty(x.plausible_wrong_3)
        ),
        _total: all.length,
      })
    } catch (err) {
      console.error('Quality check error:', err)
      setQualityError(true)
    } finally {
      setQualityLoading(false)
    }
  }

  async function runSync() {
    if (syncStatus === 'running') return
    setSyncStatus('running')
    setSyncMessage('⏳ Récupération des facts depuis Supabase...')

    const STEPS = [
      '⏳ Récupération des facts depuis Supabase...',
      '⚙️ Génération du fichier facts.js...',
      '📤 Push vers GitHub...',
    ]
    let stepIdx = 0
    const interval = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, STEPS.length - 1)
      setSyncMessage(STEPS[stepIdx])
    }, 2000)

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-facts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_ADMIN_PASSWORD}`,
          'Content-Type': 'application/json',
        },
      })
      clearInterval(interval)
      const data = await resp.json()

      if (!resp.ok) {
        setSyncStatus('error')
        setSyncMessage(`❌ Erreur : ${data.error || resp.statusText}`)
      } else {
        setSyncStatus('done')
        setSyncMessage(`✅ Synchronisation terminée — ${data.count} facts · Commit : ${data.commit}`)
        load() // refresh stats
      }
    } catch (err) {
      clearInterval(interval)
      setSyncStatus('error')
      setSyncMessage(`❌ Erreur réseau : ${err.message}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400 text-sm">Chargement…</div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4 sm:mb-8">
        <div>
          <h1 className="text-2xl font-black text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Vue d'ensemble du contenu WTF!</p>
        </div>
        <button
          onClick={() => { load(); fetchQualityIssues() }}
          className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-700 transition-all"
        >
          ↺ Actualiser
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Facts total" value={stats?.total} color="#FF6B1A" />
        <StatCard label="Publiés" value={stats?.published} color="#22C55E" />
        <Link to="/facts?status=draft" className="hover:ring-2 ring-red-500/30 rounded-2xl transition-all">
          <StatCard label="Non publiés / Archivés" value={stats?.unpublished} color="#EF4444" sub="Cliquer pour voir →" />
        </Link>
        <StatCard label="Facts WTF! ⭐" value={stats?.vipTotal} color="#FFD700" />
      </div>

      {/* Quality Dashboard — unified */}
      {(() => {
        const totalFacts = qualityIssues?._total || 0
        const totalAlerts = qualityIssues
          ? ALL_QUALITY_CHECKS.reduce((sum, c) => sum + (qualityIssues[c.key]?.length ?? 0), 0)
          : 0
        const expandedList = expandedIssue && qualityIssues ? qualityIssues[expandedIssue] : null
        const expandedCheck = ALL_QUALITY_CHECKS.find(c => c.key === expandedIssue)

        return (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 mb-4 overflow-hidden">
            {/* Section header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-black text-white">🔍 Qualité des f*cts</h2>
                {!qualityLoading && !qualityError && (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-black"
                    style={{
                      background: totalAlerts > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                      color: totalAlerts > 0 ? '#EF4444' : '#22C55E',
                    }}
                  >
                    {totalAlerts > 0 ? `${totalAlerts} alertes` : '✓ Tout est OK'}
                  </span>
                )}
              </div>
              <button
                onClick={fetchQualityIssues}
                disabled={qualityLoading}
                className="text-slate-500 hover:text-slate-300 text-sm transition-colors disabled:opacity-40"
                title="Recalculer"
              >
                {qualityLoading ? <span className="inline-block animate-spin">⟳</span> : '↺'}
              </button>
            </div>

            {/* Cards grid */}
            <div className="p-5">
              {qualityError ? (
                <p className="text-red-400 text-sm">Erreur lors du chargement des données qualité.</p>
              ) : qualityLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {ALL_QUALITY_CHECKS.map(c => (
                    <div key={c.key} className="bg-slate-700/50 rounded-xl p-4 animate-pulse h-28" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {ALL_QUALITY_CHECKS.map(c => {
                    const badCount = qualityIssues?.[c.key]?.length ?? 0
                    const okCount = totalFacts - badCount
                    const pct = totalFacts > 0 ? Math.round((okCount / totalFacts) * 100) : 100
                    const barColor = pct === 100 ? '#22C55E' : pct >= 90 ? '#F59E0B' : '#EF4444'
                    const isExpanded = expandedIssue === c.key
                    return (
                      <button
                        key={c.key}
                        onClick={() => setExpandedIssue(isExpanded ? null : c.key)}
                        disabled={badCount === 0}
                        className="bg-slate-700/50 rounded-xl p-4 border transition-all text-left disabled:cursor-default"
                        style={{ borderColor: isExpanded ? '#FF6B1A' : 'transparent' }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span className="text-base">{c.emoji}</span>
                          <span
                            className="text-xl font-black leading-none"
                            style={{ color: badCount > 0 ? '#EF4444' : '#22C55E' }}
                          >
                            {badCount}
                          </span>
                        </div>
                        <div className="text-[11px] font-semibold text-slate-300 mb-2 leading-tight">{c.label}</div>
                        {/* Progress bar */}
                        <div className="h-1.5 bg-slate-600 rounded-full overflow-hidden mb-1">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                        </div>
                        <div className="text-[10px] font-bold" style={{ color: barColor }}>
                          {okCount}/{totalFacts} OK
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Expanded list */}
              {expandedList && expandedCheck && (
                <div className="mt-4 border border-slate-600 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-700 border-b border-slate-600">
                    <span className="text-sm font-bold text-white">
                      {expandedCheck.emoji} {expandedCheck.label} — {expandedList.length} f*ct{expandedList.length > 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={() => setExpandedIssue(null)}
                      className="text-slate-400 hover:text-white text-lg leading-none transition-colors"
                    >
                      ×
                    </button>
                  </div>
                  <div className="divide-y divide-slate-700 max-h-72 overflow-y-auto">
                    {expandedList.map(f => (
                      <div key={f.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700/50 transition-colors">
                        <Link
                          to={`/facts/${f.id}`}
                          className="text-xs font-black shrink-0 hover:underline"
                          style={{ color: '#FF6B1A' }}
                        >
                          #{f.id}
                        </Link>
                        <span className="text-xs text-slate-500 shrink-0">{f.category}</span>
                        <span className="text-xs text-slate-300 flex-1 min-w-0 truncate">
                          {f.question?.length > 60 ? f.question.slice(0, 60) + '…' : (f.question || '')}
                        </span>
                        <span className="text-xs shrink-0" style={{ color: f.is_published ? '#22C55E' : '#F59E0B' }}>
                          {f.is_published ? '✓' : '⏸'}
                        </span>
                        <Link
                          to={`/facts/${f.id}`}
                          className="shrink-0 px-2 py-1 rounded-lg text-xs font-bold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                        >
                          Éditer →
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Type distribution (VIP boss / Funny) */}
      <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 mb-8">
        <h2 className="text-base font-black text-white mb-4">🏷️ Répartition par type</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {typeData.map(d => (
            <div key={d.value} className="text-center p-4 rounded-xl" style={{ background: `${d.color}18`, border: `1px solid ${d.color}40` }}>
              <div className="text-3xl font-black mb-1" style={{ color: d.color }}>{d.count}</div>
              <div className="text-sm font-bold" style={{ color: d.color }}>{d.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{d.pct}%</div>
            </div>
          ))}
        </div>
        <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
          {typeData.map(d => (
            d.pct > 0 && (
              <div
                key={d.value}
                title={`${d.value} : ${d.pct}%`}
                style={{ width: `${d.pct}%`, background: d.color }}
                className="transition-all rounded-sm"
              />
            )
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* VIP by usage */}
        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
          <h2 className="text-base font-black text-white mb-4">⭐ WTF! par usage</h2>
          <div className="space-y-2">
            {vipByUsage.map(u => (
              <div key={u.value} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{u.label}</span>
                <span className="font-bold" style={{ color: u.count > 0 ? '#FF6B1A' : '#475569' }}>
                  {u.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent edits */}
        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
          <h2 className="text-base font-black text-white mb-4">🕐 Dernières modifications</h2>
          {recentEdits.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucune modification enregistrée.</p>
          ) : (
            <div className="space-y-2">
              {recentEdits.map(e => (
                <div key={e.id} className="text-xs flex gap-2 items-start">
                  <span className="text-slate-500 shrink-0">{fmtDateTime(e.edited_at)}</span>
                  <Link
                    to={`/facts/${e.fact_id}`}
                    className="font-semibold text-orange-DEFAULT hover:underline shrink-0"
                    style={{ color: '#FF6B1A' }}
                  >
                    #{e.fact_id}
                  </Link>
                  <span className="text-slate-400 truncate">{e.field_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category bar chart */}
      <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-black text-white">📊 Facts par catégorie</h2>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
          {[
            { id: 'all', label: 'Tous', color: '#94A3B8' },
            { id: 'published', label: 'Publiés', color: '#22C55E' },
            { id: 'unpublished', label: 'Non-publiés', color: '#F59E0B' },
            { id: 'doublon', label: 'Doublons', color: '#EF4444' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleCategoryFilterChange(tab.id)}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                categoryFilter === tab.id
                  ? 'text-white shadow-lg'
                  : 'bg-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              style={categoryFilter === tab.id ? { background: tab.color } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ background: '#94A3B8' }} />
            <span className="text-slate-400">Tous</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ background: '#22C55E' }} />
            <span className="text-slate-400">Publiés</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ background: '#F59E0B' }} />
            <span className="text-slate-400">Non-publiés</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ background: '#EF4444' }} />
            <span className="text-slate-400">Doublons</span>
          </div>
        </div>

        <BarChart data={categoryData} color={
          categoryFilter === 'all' ? '#94A3B8' :
          categoryFilter === 'published' ? '#22C55E' :
          categoryFilter === 'unpublished' ? '#F59E0B' :
          '#EF4444'
        } />
      </div>

      {/* Detailed category table */}
      {(() => {
        const facts = allFactsForFilter || []
        // Build grouped data per category
        const catMap = {}
        for (const f of facts) {
          if (!f.category) continue
          if (!catMap[f.category]) catMap[f.category] = { total: 0, published: 0, draftQuete: 0, draftFlash: 0, pubQuete: 0, pubFlash: 0 }
          const c = catMap[f.category]
          const isVip = !!f.is_vip
          c.total++
          if (f.is_published) {
            c.published++
            if (isVip) c.pubQuete++; else c.pubFlash++
          } else {
            if (isVip) c.draftQuete++; else c.draftFlash++
          }
        }
        const rows = CATEGORIES
          .map(cat => ({ ...cat, ...(catMap[cat.id] || { total: 0, published: 0, draftQuete: 0, draftFlash: 0, pubQuete: 0, pubFlash: 0 }) }))
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'))

        return (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 mb-8 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <h2 className="text-base font-black text-white">📋 Vue détaillée par catégorie</h2>
              <span className="text-xs text-slate-500 font-semibold">{rows.length} catégories · {facts.length} facts</span>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3 text-slate-500 font-bold">Catégorie</th>
                    <th className="text-center px-2 py-3 text-slate-500 font-bold">Total</th>
                    <th className="text-center px-2 py-3 font-bold" style={{ color: '#F59E0B' }} colSpan={2}>Brouillons</th>
                    <th className="text-center px-2 py-3 font-bold" style={{ color: '#22C55E' }} colSpan={2}>Publiés</th>
                    <th className="px-4 py-3 text-slate-500 font-bold text-right" style={{ minWidth: 120 }}>Progression</th>
                  </tr>
                  <tr className="border-b border-slate-700/50 text-[10px] uppercase tracking-wider">
                    <th></th>
                    <th></th>
                    <th className="text-center px-2 py-1" style={{ color: '#FFD700' }}>WTF!</th>
                    <th className="text-center px-2 py-1" style={{ color: '#8B5CF6' }}>Funny</th>
                    <th className="text-center px-2 py-1" style={{ color: '#FFD700' }}>WTF!</th>
                    <th className="text-center px-2 py-1" style={{ color: '#8B5CF6' }}>Funny</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const pubPct = r.total > 0 ? Math.round((r.published / r.total) * 100) : 0
                    const drafts = r.draftQuete + r.draftFlash
                    return (
                      <tr
                        key={r.id}
                        className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors cursor-pointer"
                        onClick={() => { window.location.href = `/admin/facts?category=${r.id}` }}
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{r.emoji}</span>
                            <span className="text-slate-200 font-semibold text-xs">{r.label}</span>
                          </div>
                        </td>
                        <td className="text-center px-2 py-2.5 font-black text-slate-300">{r.total}</td>
                        <td className="text-center px-2 py-2.5 font-bold" style={{ color: r.draftQuete > 0 ? '#F59E0B' : '#475569' }}>{r.draftQuete}</td>
                        <td className="text-center px-2 py-2.5 font-bold" style={{ color: r.draftFlash > 0 ? '#F59E0B' : '#475569' }}>{r.draftFlash}</td>
                        <td className="text-center px-2 py-2.5 font-bold" style={{ color: r.pubQuete > 0 ? '#22C55E' : '#475569' }}>{r.pubQuete}</td>
                        <td className="text-center px-2 py-2.5 font-bold" style={{ color: r.pubFlash > 0 ? '#22C55E' : '#475569' }}>{r.pubFlash}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pubPct}%`, background: pubPct === 100 ? '#22C55E' : pubPct >= 50 ? '#FF6B1A' : '#EF4444' }} />
                            </div>
                            <span className="text-xs font-bold text-slate-500 w-9 text-right">{pubPct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-600 bg-slate-800/80">
                    <td className="px-4 py-3 text-slate-300 font-black text-sm">TOTAL</td>
                    <td className="text-center px-2 py-3 font-black text-white">{rows.reduce((s, r) => s + r.total, 0)}</td>
                    <td className="text-center px-2 py-3 font-black" style={{ color: '#F59E0B' }}>{rows.reduce((s, r) => s + r.draftQuete, 0)}</td>
                    <td className="text-center px-2 py-3 font-black" style={{ color: '#F59E0B' }}>{rows.reduce((s, r) => s + r.draftFlash, 0)}</td>
                    <td className="text-center px-2 py-3 font-black" style={{ color: '#22C55E' }}>{rows.reduce((s, r) => s + r.pubQuete, 0)}</td>
                    <td className="text-center px-2 py-3 font-black" style={{ color: '#22C55E' }}>{rows.reduce((s, r) => s + r.pubFlash, 0)}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const totalAll = rows.reduce((s, r) => s + r.total, 0)
                        const totalPub = rows.reduce((s, r) => s + r.published, 0)
                        const pct = totalAll > 0 ? Math.round((totalPub / totalAll) * 100) : 0
                        return (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2.5 bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#22C55E' }} />
                            </div>
                            <span className="text-xs font-bold text-slate-400 w-9 text-right">{pct}%</span>
                          </div>
                        )
                      })()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden p-4 space-y-2">
              {rows.map(r => {
                const pubPct = r.total > 0 ? Math.round((r.published / r.total) * 100) : 0
                return (
                  <button
                    key={r.id}
                    className="w-full text-left bg-slate-700/40 rounded-xl p-3 hover:bg-slate-700/60 transition-colors"
                    onClick={() => { window.location.href = `/admin/facts?category=${r.id}` }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{r.emoji}</span>
                        <span className="text-slate-200 font-semibold text-sm">{r.label}</span>
                      </div>
                      <span className="text-sm font-black text-slate-300">{r.total}</span>
                    </div>
                    <div className="h-1.5 bg-slate-600 rounded-full overflow-hidden mb-1.5">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pubPct}%`, background: pubPct === 100 ? '#22C55E' : pubPct >= 50 ? '#FF6B1A' : '#EF4444' }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span style={{ color: '#22C55E' }} className="font-bold">{r.published} pub.</span>
                      <span style={{ color: '#F59E0B' }} className="font-bold">{r.draftQuete + r.draftFlash} brouillon{(r.draftQuete + r.draftFlash) > 1 ? 's' : ''}</span>
                      <span className="text-slate-500 font-bold">{pubPct}%</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })()}

    </div>
  )
}
