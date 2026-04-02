import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CATEGORIES, getCategoryLabel, VIP_USAGES } from '../constants/categories'

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

const QUALITY_CHECKS = [
  { key: 'noImage',               emoji: '📷', label: 'Sans image' },
  { key: 'questionTooLong',       emoji: '📝', label: 'Question trop longue' },
  { key: 'explanationOutOfRange', emoji: '📖', label: 'Explication hors limites' },
  { key: 'missingHints',          emoji: '💡', label: 'Indices manquants' },
  { key: 'incompleteOptions',     emoji: '🎯', label: 'Options QCM incomplètes' },
  { key: 'noSourceUrl',           emoji: '🔗', label: 'Sans URL source' },
]

const NEW_FORMAT_CHECKS = [
  { key: 'missingNewHints',      emoji: '💡', label: 'Indices manquants (hint1-4)' },
  { key: 'hintsTooLong',         emoji: '📏', label: 'Indices trop longs (>1 mot)' },
  { key: 'missingWrongAnswers',  emoji: '❌', label: 'Fausses réponses manquantes' },
  { key: 'closedQuestion',       emoji: '🚫', label: 'Question pas ouverte' },
  { key: 'missingType',          emoji: '🏷️', label: 'Type manquant (vip/generated)' },
  { key: 'notMigrated',          emoji: '🔄', label: 'Ancien format non migré' },
]

function truncate(str, n) {
  return str && str.length > n ? str.slice(0, n) + '…' : (str || '')
}

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function DashboardPage({ toast }) {
  const [stats, setStats] = useState(null)
  const [categoryData, setCategoryData] = useState([])
  const [vipByUsage, setVipByUsage] = useState([])
  const [difficultyData, setDifficultyData] = useState([])
  const [recentEdits, setRecentEdits] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState(null) // null | 'running' | 'done' | 'error'
  const [syncMessage, setSyncMessage] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all') // 'all' | 'published' | 'unpublished' | 'doublon'
  const [difficultyFilter, setDifficultyFilter] = useState('published') // 'all' | 'published' | 'unpublished' | 'doublon'
  const [allFactsForFilter, setAllFactsForFilter] = useState([])
  const [qualityIssues, setQualityIssues] = useState(null)
  const [qualityLoading, setQualityLoading] = useState(true)
  const [qualityError, setQualityError] = useState(false)
  const [expandedIssue, setExpandedIssue] = useState(null)
  const [newFormatIssues, setNewFormatIssues] = useState(null)
  const [expandedNewFormatIssue, setExpandedNewFormatIssue] = useState(null)
  const [newFormatTotal, setNewFormatTotal] = useState(0)
  const [enrichStatus, setEnrichStatus] = useState(null)
  const [enrichMessage, setEnrichMessage] = useState('')
  const [enrichProgress, setEnrichProgress] = useState({ current: 0, total: 0 })
  const enrichCancelRef = useRef(false)

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
            const { data, error } = await supabase.from('facts').select('category, is_published, vip_usage, is_vip, difficulty, archived_reason').range(from, from + PAGE - 1)
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

      // VIP by usage
      const usageCounts = {}
      for (const f of (allFacts || []).filter(f => f.is_vip)) {
        const u = f.vip_usage || 'available'
        usageCounts[u] = (usageCounts[u] || 0) + 1
      }
      setVipByUsage(
        VIP_USAGES.map(u => ({ ...u, count: usageCounts[u.value] || 0 }))
      )

      // Difficulty distribution (will be recalculated via filter)
      updateDifficultyData(allFacts || [], 'all')

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

  // ── Filter difficulty data by publication status ────────────────────────
  function updateDifficultyData(facts, filter) {
    let filtered = facts
    if (filter === 'published') {
      filtered = facts.filter(f => f.is_published === true)
    } else if (filter === 'unpublished') {
      filtered = facts.filter(f => f.is_published === false)
    } else if (filter === 'doublon') {
      filtered = facts.filter(f => f.archived_reason === 'doublon')
    }
    // filter === 'all' uses all facts

    const diffCounts = { Facile: 0, Normal: 0, Expert: 0 }
    for (const f of filtered) {
      const d = f.difficulty || 'Normal'
      if (diffCounts[d] !== undefined) diffCounts[d]++
    }
    const totalFacts = filtered.length || 1
    setDifficultyData([
      { value: 'Facile', count: diffCounts.Facile, color: '#22C55E', pct: Math.round((diffCounts.Facile / totalFacts) * 100) },
      { value: 'Normal', count: diffCounts.Normal, color: '#3B82F6', pct: Math.round((diffCounts.Normal / totalFacts) * 100) },
      { value: 'Expert', count: diffCounts.Expert, color: '#EF4444', pct: Math.round((diffCounts.Expert / totalFacts) * 100) },
    ])
  }

  function handleDifficultyFilterChange(newFilter) {
    setDifficultyFilter(newFilter)
    updateDifficultyData(allFactsForFilter, newFilter)
  }

  async function fetchQualityIssues() {
    setQualityLoading(true)
    setQualityError(false)
    try {
      // Legacy quality checks — original columns only
      const { data, error } = await supabase
        .from('facts')
        .select('id, question, hint1, hint2, explanation, options, image_url, source_url, category, is_published')
      if (error) throw error
      const f = data || []
      setQualityIssues({
        noImage:               f.filter(x => !x.image_url || x.image_url.trim() === ''),
        questionTooLong:       f.filter(x => x.question && x.question.length > 100),
        explanationOutOfRange: f.filter(x => !x.explanation || x.explanation.length < 100 || x.explanation.length > 300),
        missingHints:          f.filter(x => !x.hint1 || !x.hint2 || x.hint1.trim() === '' || x.hint2.trim() === ''),
        incompleteOptions:     f.filter(x => !x.options || x.options.length < 4),
        noSourceUrl:           f.filter(x => !x.source_url || x.source_url.trim() === ''),
      })
    } catch (err) {
      console.error('Quality check error:', err)
      setQualityError(true)
    } finally {
      setQualityLoading(false)
    }

    // New format checks — separate query with new columns (may not exist yet)
    try {
      const all = []
      let from = 0
      const PAGE = 1000
      while (true) {
        const { data, error } = await supabase
          .from('facts')
          .select('id, question, hint1, hint2, hint3, hint4, options, category, is_published, type, funny_wrong_1, funny_wrong_2, close_wrong_1, close_wrong_2, plausible_wrong_1, plausible_wrong_2, plausible_wrong_3')
          .range(from, from + PAGE - 1)
        if (error) throw error
        if (!data || data.length === 0) break
        all.push(...data)
        if (data.length < PAGE) break
        from += PAGE
      }

      const pub = all.filter(x => x.is_published)
      const isEmpty = v => !v || (typeof v === 'string' && v.trim() === '')
      const hasMultipleWords = v => v && typeof v === 'string' && v.trim().split(/\s+/).length > 1

      const nf = {
        missingNewHints: pub.filter(x =>
          isEmpty(x.hint1) || isEmpty(x.hint2) || isEmpty(x.hint3) || isEmpty(x.hint4)
        ),
        hintsTooLong: pub.filter(x =>
          hasMultipleWords(x.hint1) || hasMultipleWords(x.hint2) || hasMultipleWords(x.hint3) || hasMultipleWords(x.hint4)
        ),
        missingWrongAnswers: pub.filter(x =>
          isEmpty(x.funny_wrong_1) || isEmpty(x.funny_wrong_2) ||
          isEmpty(x.close_wrong_1) || isEmpty(x.close_wrong_2) ||
          isEmpty(x.plausible_wrong_1) || isEmpty(x.plausible_wrong_2) || isEmpty(x.plausible_wrong_3)
        ),
        closedQuestion: pub.filter(x =>
          x.question && (
            /vrai ou faux/i.test(x.question) ||
            /^est-ce que\b/i.test(x.question.trim())
          )
        ),
        missingType: pub.filter(x =>
          x.type !== 'vip' && x.type !== 'generated'
        ),
        notMigrated: pub.filter(x =>
          x.options && x.options.length > 0 &&
          isEmpty(x.funny_wrong_1) && isEmpty(x.funny_wrong_2) &&
          isEmpty(x.close_wrong_1) && isEmpty(x.close_wrong_2) &&
          isEmpty(x.plausible_wrong_1) && isEmpty(x.plausible_wrong_2) && isEmpty(x.plausible_wrong_3)
        ),
      }
      setNewFormatIssues(nf)

      const uniqueIds = new Set()
      for (const list of Object.values(nf)) {
        for (const x of list) uniqueIds.add(x.id)
      }
      setNewFormatTotal(uniqueIds.size)
    } catch (err) {
      console.error('New format check error:', err)
      // Don't set qualityError — only the new format section will show "no data"
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

  async function runEnrichAll() {
    if (enrichStatus === 'running') return
    enrichCancelRef.current = false
    setEnrichStatus('running')
    setEnrichMessage('⏳ Récupération des facts VIP à enrichir...')

    try {
      const all = []
      let from = 0
      const PAGE = 1000
      while (true) {
        const { data, error } = await supabase
          .from('facts')
          .select('id, question, short_answer, explanation, category, hint1, hint2')
          .eq('is_vip', true)
          .or('funny_wrong_1.is.null,funny_wrong_1.eq.')
          .range(from, from + PAGE - 1)
        if (error) throw error
        if (!data || data.length === 0) break
        all.push(...data)
        if (data.length < PAGE) break
        from += PAGE
      }

      if (all.length === 0) {
        setEnrichStatus('done')
        setEnrichMessage('✅ Aucun fact VIP à enrichir — tous sont déjà traités !')
        return
      }

      setEnrichProgress({ current: 0, total: all.length })
      let enriched = 0

      for (let i = 0; i < all.length; i++) {
        if (enrichCancelRef.current) {
          setEnrichStatus('done')
          setEnrichMessage(`⏹ Arrêté — ${enriched}/${all.length} enrichis`)
          return
        }

        const fact = all[i]
        setEnrichMessage(`🧠 Enrichissement ${i + 1}/${all.length} — fact #${fact.id}...`)
        setEnrichProgress({ current: i + 1, total: all.length })

        try {
          const resp = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enrich-fact`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${import.meta.env.VITE_ADMIN_PASSWORD}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                question: fact.question,
                short_answer: fact.short_answer,
                explanation: fact.explanation,
                category: fact.category,
                hint1: fact.hint1,
                hint2: fact.hint2,
              }),
            }
          )
          const data = await resp.json()
          if (!resp.ok) throw new Error(data.error || 'Erreur API')

          const { error: updateError } = await supabase
            .from('facts')
            .update({
              hint1: data.hint1,
              hint2: data.hint2,
              hint3: data.hint3,
              hint4: data.hint4,
              funny_wrong_1: data.funny_wrong_1,
              funny_wrong_2: data.funny_wrong_2,
              close_wrong_1: data.close_wrong_1,
              close_wrong_2: data.close_wrong_2,
              plausible_wrong_1: data.plausible_wrong_1,
              plausible_wrong_2: data.plausible_wrong_2,
              plausible_wrong_3: data.plausible_wrong_3,
              updated_at: new Date().toISOString(),
            })
            .eq('id', fact.id)
          if (updateError) throw updateError
          enriched++
        } catch (err) {
          console.error(`Erreur enrichissement fact #${fact.id}:`, err)
        }
      }

      setEnrichStatus('done')
      setEnrichMessage(`✅ Enrichissement terminé — ${enriched}/${all.length} facts VIP traités`)
      fetchQualityIssues()
    } catch (err) {
      setEnrichStatus('error')
      setEnrichMessage(`❌ Erreur : ${err.message}`)
    }
  }

  function stopEnrich() {
    enrichCancelRef.current = true
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
      <div className="flex items-center justify-between mb-8">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Facts total" value={stats?.total} color="#FF6B1A" />
        <StatCard label="Publiés" value={stats?.published} color="#22C55E" />
        <Link to="/archived" className="hover:ring-2 ring-red-500/30 rounded-2xl transition-all">
          <StatCard label="Non publiés / Archivés" value={stats?.unpublished} color="#EF4444" sub="Cliquer pour voir →" />
        </Link>
        <StatCard label="Facts VIP ⭐" value={stats?.vipTotal} color="#FFD700" />
      </div>

      {/* Quality Dashboard */}
      {(() => {
        const totalAlerts = qualityIssues
          ? Object.values(qualityIssues).reduce((sum, list) => sum + list.length, 0)
          : 0
        const expandedList = expandedIssue && qualityIssues ? qualityIssues[expandedIssue] : null
        const expandedCheck = QUALITY_CHECKS.find(c => c.key === expandedIssue)

        return (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 mb-8 overflow-hidden">
            {/* Section header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-black text-white">🔍 Qualité des F*cts</h2>
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
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {QUALITY_CHECKS.map(c => (
                    <div key={c.key} className="bg-slate-700/50 rounded-xl p-4 animate-pulse h-24" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {QUALITY_CHECKS.map(c => {
                    const count = qualityIssues?.[c.key]?.length ?? 0
                    const isExpanded = expandedIssue === c.key
                    return (
                      <div
                        key={c.key}
                        className="bg-slate-700/50 rounded-xl p-4 border transition-all"
                        style={{ borderColor: isExpanded ? '#FF6B1A' : 'transparent' }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-lg">{c.emoji}</span>
                          <span
                            className="text-2xl font-black leading-none"
                            style={{ color: count > 0 ? '#EF4444' : '#22C55E' }}
                          >
                            {count}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-300 mb-3 leading-tight">{c.label}</div>
                        <button
                          onClick={() => setExpandedIssue(isExpanded ? null : c.key)}
                          disabled={count === 0}
                          className="text-xs font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          style={{ color: isExpanded ? '#FF6B1A' : '#94A3B8' }}
                        >
                          {isExpanded ? '▲ Masquer' : 'Voir les f*cts →'}
                        </button>
                      </div>
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
                          {truncate(f.question, 60)}
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

      {/* New Format Quality Alerts */}
      {(() => {
        const totalNewAlerts = newFormatIssues
          ? Object.values(newFormatIssues).reduce((sum, list) => sum + list.length, 0)
          : 0
        const expandedNewList = expandedNewFormatIssue && newFormatIssues ? newFormatIssues[expandedNewFormatIssue] : null
        const expandedNewCheck = NEW_FORMAT_CHECKS.find(c => c.key === expandedNewFormatIssue)
        const publishedCount = stats?.published || 0

        return (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 mb-8 overflow-hidden">
            {/* Section header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-black text-white">⚠️ Alertes qualité — nouveau format</h2>
                {!qualityLoading && !qualityError && newFormatIssues && (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-black"
                    style={{
                      background: newFormatTotal > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                      color: newFormatTotal > 0 ? '#EF4444' : '#22C55E',
                    }}
                  >
                    {newFormatTotal > 0
                      ? `${newFormatTotal} f*ct${newFormatTotal > 1 ? 's' : ''} à corriger sur ${publishedCount} publiés`
                      : '✓ Tout est OK'}
                  </span>
                )}
              </div>
            </div>

            {/* Cards grid */}
            <div className="p-5">
              {!newFormatIssues && !qualityLoading ? (
                <p className="text-amber-400 text-sm">Les colonnes du nouveau format ne sont pas encore disponibles en base. Ajoutez hint3, hint4, funny_wrong_*, close_wrong_*, plausible_wrong_* à la table facts.</p>
              ) : qualityLoading ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {NEW_FORMAT_CHECKS.map(c => (
                    <div key={c.key} className="bg-slate-700/50 rounded-xl p-4 animate-pulse h-24" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {NEW_FORMAT_CHECKS.map(c => {
                    const count = newFormatIssues?.[c.key]?.length ?? 0
                    const isExpanded = expandedNewFormatIssue === c.key
                    return (
                      <div
                        key={c.key}
                        className="bg-slate-700/50 rounded-xl p-4 border transition-all"
                        style={{ borderColor: isExpanded ? '#FF6B1A' : 'transparent' }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-lg">{c.emoji}</span>
                          <span
                            className="text-2xl font-black leading-none"
                            style={{ color: count > 0 ? '#EF4444' : '#22C55E' }}
                          >
                            {count}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-300 mb-3 leading-tight">{c.label}</div>
                        <button
                          onClick={() => setExpandedNewFormatIssue(isExpanded ? null : c.key)}
                          disabled={count === 0}
                          className="text-xs font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          style={{ color: isExpanded ? '#FF6B1A' : '#94A3B8' }}
                        >
                          {isExpanded ? '▲ Masquer' : 'Voir les f*cts →'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Expanded list */}
              {expandedNewList && expandedNewCheck && (
                <div className="mt-4 border border-slate-600 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-700 border-b border-slate-600">
                    <span className="text-sm font-bold text-white">
                      {expandedNewCheck.emoji} {expandedNewCheck.label} — {expandedNewList.length} f*ct{expandedNewList.length > 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={() => setExpandedNewFormatIssue(null)}
                      className="text-slate-400 hover:text-white text-lg leading-none transition-colors"
                    >
                      ×
                    </button>
                  </div>
                  <div className="divide-y divide-slate-700 max-h-72 overflow-y-auto">
                    {expandedNewList.map(f => (
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
                          {truncate(f.question, 60)}
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

      {/* Difficulty distribution */}
      <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-black text-white">🎯 Répartition par difficulté</h2>
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
              onClick={() => handleDifficultyFilterChange(tab.id)}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                difficultyFilter === tab.id
                  ? 'text-white shadow-lg'
                  : 'bg-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              style={difficultyFilter === tab.id ? { background: tab.color } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
          {difficultyData.map(d => (
            <div key={d.value} className="text-center p-3 rounded-xl" style={{ background: `${d.color}18`, border: `1px solid ${d.color}40` }}>
              <div className="text-2xl font-black mb-1" style={{ color: d.color }}>{d.count}</div>
              <div className="text-sm font-bold" style={{ color: d.color }}>{d.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{d.pct}%</div>
            </div>
          ))}
        </div>
        <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
          {difficultyData.map(d => (
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
        {difficultyData.some(d => Math.abs(d.pct - 33) > 10) && (
          <div className="flex items-center gap-3 mt-2">
            <p className="text-amber-400 text-xs font-semibold flex-1">
              ⚠ Répartition déséquilibrée — sélectionnez des facts dans la liste puis utilisez "🎯 Difficulté" dans la barre d'actions en bas
            </p>
            <Link
              to="/facts"
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
              style={{ background: '#FF6B1A' }}
            >
              Gérer les facts →
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* VIP by usage */}
        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
          <h2 className="text-base font-black text-white mb-4">⭐ VIP par usage</h2>
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
                  <span className="text-slate-500 shrink-0">{fmt(e.edited_at)}</span>
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
          if (!catMap[f.category]) catMap[f.category] = { total: 0, published: 0, vip: 0, cool: 0, hot: 0, wtf: 0 }
          const c = catMap[f.category]
          c.total++
          if (f.is_published) c.published++
          if (f.is_vip) c.vip++
          const d = (f.difficulty || '').toLowerCase()
          if (d === 'facile' || d === 'easy' || d === 'cool') c.cool++
          else if (d === 'normal' || d === 'hot') c.hot++
          else if (d === 'expert' || d === 'hard' || d === 'wtf') c.wtf++
        }
        // Sort by total descending, merge with CATEGORIES for label/emoji
        const rows = CATEGORIES
          .map(cat => ({ ...cat, ...(catMap[cat.id] || { total: 0, published: 0, vip: 0, cool: 0, hot: 0, wtf: 0 }) }))
          .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
        const maxTotal = rows.length > 0 ? rows[0].total : 1

        return (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 mb-8 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <h2 className="text-base font-black text-white">📋 Vue détaillée par catégorie</h2>
              <span className="text-xs text-slate-500 font-semibold">{rows.length} catégories · {facts.length} facts</span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs uppercase tracking-wider">
                    <th className="text-left px-5 py-3 text-slate-500 font-bold">Catégorie</th>
                    <th className="text-center px-3 py-3 text-slate-500 font-bold">Total</th>
                    <th className="text-center px-3 py-3 font-bold" style={{ color: '#22C55E' }}>Publiés</th>
                    <th className="text-center px-3 py-3 font-bold" style={{ color: '#FFD700' }}>VIP</th>
                    <th className="text-center px-3 py-3 font-bold" style={{ color: '#3B82F6' }}>Cool</th>
                    <th className="text-center px-3 py-3 font-bold" style={{ color: '#FF6B1A' }}>Hot</th>
                    <th className="text-center px-3 py-3 font-bold" style={{ color: '#8B5CF6' }}>WTF!</th>
                    <th className="px-5 py-3 text-slate-500 font-bold text-right" style={{ minWidth: 140 }}>Progression</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const pubPct = r.total > 0 ? Math.round((r.published / r.total) * 100) : 0
                    return (
                      <tr
                        key={r.id}
                        className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors cursor-pointer"
                        onClick={() => { window.location.href = `/facts?category=${r.id}` }}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{r.emoji}</span>
                            <span className="text-slate-200 font-semibold">{r.label}</span>
                          </div>
                        </td>
                        <td className="text-center px-3 py-3 font-black text-slate-300">{r.total}</td>
                        <td className="text-center px-3 py-3 font-bold" style={{ color: '#22C55E' }}>{r.published}</td>
                        <td className="text-center px-3 py-3 font-bold" style={{ color: r.vip > 0 ? '#FFD700' : '#475569' }}>{r.vip}</td>
                        <td className="text-center px-3 py-3 font-bold" style={{ color: r.cool > 0 ? '#3B82F6' : '#475569' }}>{r.cool}</td>
                        <td className="text-center px-3 py-3 font-bold" style={{ color: r.hot > 0 ? '#FF6B1A' : '#475569' }}>{r.hot}</td>
                        <td className="text-center px-3 py-3 font-bold" style={{ color: r.wtf > 0 ? '#8B5CF6' : '#475569' }}>{r.wtf}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2.5 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${pubPct}%`,
                                  background: pubPct === 100 ? '#22C55E' : pubPct >= 50 ? '#FF6B1A' : '#EF4444',
                                }}
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-500 w-9 text-right">{pubPct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {/* Footer totals */}
                <tfoot>
                  <tr className="border-t-2 border-slate-600 bg-slate-800/80">
                    <td className="px-5 py-3 text-slate-300 font-black text-sm">TOTAL</td>
                    <td className="text-center px-3 py-3 font-black text-white">{rows.reduce((s, r) => s + r.total, 0)}</td>
                    <td className="text-center px-3 py-3 font-black" style={{ color: '#22C55E' }}>{rows.reduce((s, r) => s + r.published, 0)}</td>
                    <td className="text-center px-3 py-3 font-black" style={{ color: '#FFD700' }}>{rows.reduce((s, r) => s + r.vip, 0)}</td>
                    <td className="text-center px-3 py-3 font-black" style={{ color: '#3B82F6' }}>{rows.reduce((s, r) => s + r.cool, 0)}</td>
                    <td className="text-center px-3 py-3 font-black" style={{ color: '#FF6B1A' }}>{rows.reduce((s, r) => s + r.hot, 0)}</td>
                    <td className="text-center px-3 py-3 font-black" style={{ color: '#8B5CF6' }}>{rows.reduce((s, r) => s + r.wtf, 0)}</td>
                    <td className="px-5 py-3">
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
          </div>
        )
      })()}

      {/* Enrichir VIP batch */}
      <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 mb-8">
        <h2 className="text-base font-black text-white mb-2">🧠 Enrichir tous les VIP</h2>
        <p className="text-slate-400 text-sm mb-4">
          Enrichit automatiquement tous les facts VIP sans fausses réponses
          via Claude Opus. Chaque fact est sauvegardé immédiatement après enrichissement.
        </p>

        {/* Progress bar */}
        {enrichStatus === 'running' && enrichProgress.total > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>{enrichProgress.current}/{enrichProgress.total} enrichis</span>
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
            className="mb-4 px-4 py-3 rounded-xl text-sm font-semibold border"
            style={{
              background: enrichStatus === 'error' ? 'rgba(239,68,68,0.1)' : enrichStatus === 'done' ? 'rgba(34,197,94,0.1)' : 'rgba(139,92,246,0.1)',
              borderColor: enrichStatus === 'error' ? 'rgba(239,68,68,0.3)' : enrichStatus === 'done' ? 'rgba(34,197,94,0.3)' : 'rgba(139,92,246,0.3)',
              color: enrichStatus === 'error' ? '#EF4444' : enrichStatus === 'done' ? '#22C55E' : '#8B5CF6',
            }}
          >
            {enrichStatus === 'running' && (
              <span className="inline-block animate-spin mr-2">⟳</span>
            )}
            {enrichMessage}
          </div>
        )}

        <div className="flex gap-3 flex-wrap">
          <button
            disabled={enrichStatus === 'running'}
            onClick={runEnrichAll}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}
          >
            {enrichStatus === 'running' ? 'Enrichissement…' : '🧠 Enrichir tous les VIP'}
          </button>
          {enrichStatus === 'running' && (
            <button
              onClick={stopEnrich}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-red-900/30 text-red-400 border border-red-800/40 hover:bg-red-900/50 transition-all"
            >
              ⏹ Arrêter
            </button>
          )}
          {enrichStatus === 'error' && (
            <button
              onClick={runEnrichAll}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all"
            >
              ↺ Réessayer
            </button>
          )}
        </div>
      </div>

      {/* Sync button */}
      <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
        <h2 className="text-base font-black text-white mb-2">🔄 Sync Supabase → GitHub</h2>
        <p className="text-slate-400 text-sm mb-4">
          Régénère <code className="text-orange-400 bg-slate-900 px-1 rounded">src/data/facts.js</code> depuis
          les facts <span className="text-green-400 font-semibold">publiés</span> dans Supabase,
          puis pousse le fichier sur GitHub — Vercel redéploie automatiquement.
        </p>

        {syncMessage && (
          <div
            className="mb-4 px-4 py-3 rounded-xl text-sm font-semibold border"
            style={{
              background: syncStatus === 'error' ? 'rgba(239,68,68,0.1)' : syncStatus === 'done' ? 'rgba(34,197,94,0.1)' : 'rgba(255,107,26,0.1)',
              borderColor: syncStatus === 'error' ? 'rgba(239,68,68,0.3)' : syncStatus === 'done' ? 'rgba(34,197,94,0.3)' : 'rgba(255,107,26,0.3)',
              color: syncStatus === 'error' ? '#EF4444' : syncStatus === 'done' ? '#22C55E' : '#FF6B1A',
            }}
          >
            {syncStatus === 'running' && (
              <span className="inline-block animate-spin mr-2">⟳</span>
            )}
            {syncMessage}
          </div>
        )}

        <div className="flex gap-3 flex-wrap">
          <button
            disabled={syncStatus === 'running'}
            onClick={runSync}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #FF6B1A, #D94A10)' }}
          >
            {syncStatus === 'running' ? 'Synchronisation…' : '🔄 Lancer la synchronisation'}
          </button>
          {syncStatus === 'error' && (
            <button
              onClick={runSync}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all"
            >
              ↺ Réessayer
            </button>
          )}
        </div>

        <p className="text-xs text-slate-600 mt-3">
          Requiert <code className="text-slate-500">GITHUB_TOKEN</code> + <code className="text-slate-500">ADMIN_PASSWORD</code> dans les variables Vercel.
        </p>
      </div>
    </div>
  )
}
