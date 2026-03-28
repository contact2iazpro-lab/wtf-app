import { useState, useEffect } from 'react'
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

function BarChart({ data, max }) {
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
              style={{ width: `${(d.count / m) * 100}%`, background: '#FF6B1A' }}
            />
          </div>
          <span className="w-8 text-right text-slate-400">{d.count}</span>
        </div>
      ))}
    </div>
  )
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
  const [migrating, setMigrating] = useState(false)
  const [migrationDone, setMigrationDone] = useState(() =>
    localStorage.getItem('wtf_admin_migration_done') === 'true'
  )

  useEffect(() => { load() }, [])

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
        supabase.from('facts').select('category, is_published, vip_usage, is_vip, difficulty'),
        supabase.from('edit_history').select('*').order('edited_at', { ascending: false }).limit(5),
      ])

      setStats({ total, published, unpublished, vipTotal })

      // Category counts
      const catCounts = {}
      for (const f of allFacts || []) {
        catCounts[f.category] = (catCounts[f.category] || 0) + 1
      }
      const catData = CATEGORIES
        .map(c => ({ ...c, count: catCounts[c.id] || 0 }))
        .filter(c => c.count > 0)
        .sort((a, b) => b.count - a.count)
      setCategoryData(catData)

      // VIP by usage
      const usageCounts = {}
      for (const f of (allFacts || []).filter(f => f.is_vip)) {
        const u = f.vip_usage || 'available'
        usageCounts[u] = (usageCounts[u] || 0) + 1
      }
      setVipByUsage(
        VIP_USAGES.map(u => ({ ...u, count: usageCounts[u.value] || 0 }))
      )

      // Difficulty distribution
      const diffCounts = { Facile: 0, Normal: 0, Expert: 0 }
      for (const f of allFacts || []) {
        const d = f.difficulty || 'Normal'
        if (diffCounts[d] !== undefined) diffCounts[d]++
      }
      const totalFacts = (allFacts || []).length || 1
      setDifficultyData([
        { value: 'Facile', count: diffCounts.Facile, color: '#22C55E', pct: Math.round((diffCounts.Facile / totalFacts) * 100) },
        { value: 'Normal', count: diffCounts.Normal, color: '#3B82F6', pct: Math.round((diffCounts.Normal / totalFacts) * 100) },
        { value: 'Expert', count: diffCounts.Expert, color: '#EF4444', pct: Math.round((diffCounts.Expert / totalFacts) * 100) },
      ])

      setRecentEdits(history || [])
    } catch (err) {
      console.error(err)
      toast?.('Erreur chargement dashboard', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function runMigration() {
    setMigrating(true)
    try {
      // Read facts from the local facts.js bundle (dev only) or via a known endpoint
      toast?.('Migration non disponible depuis cet outil — utilisez le script Node.js', 'warn', 5000)
    } finally {
      setMigrating(false)
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
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Vue d'ensemble du contenu WTF!</p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-700 transition-all"
        >
          ↺ Actualiser
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Facts total" value={stats?.total} color="#FF6B1A" />
        <StatCard label="Publiés" value={stats?.published} color="#22C55E" />
        <StatCard label="Non publiés" value={stats?.unpublished} color="#EF4444" />
        <StatCard label="Facts VIP ⭐" value={stats?.vipTotal} color="#FFD700" />
      </div>

      {/* Difficulty distribution */}
      <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 mb-8">
        <h2 className="text-base font-black text-white mb-4">🎯 Répartition par difficulté</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
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
          <p className="text-amber-400 text-xs mt-2 font-semibold">
            ⚠ Répartition déséquilibrée — utilisez "Changer difficulté" en lot pour rééquilibrer
          </p>
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
        <h2 className="text-base font-black text-white mb-4">📊 Facts par catégorie</h2>
        <BarChart data={categoryData} />
      </div>

      {/* Migration button */}
      <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
        <h2 className="text-base font-black text-white mb-2">🔄 Migration Supabase</h2>
        <p className="text-slate-400 text-sm mb-4">
          Pour migrer les facts de <code className="text-orange-DEFAULT bg-slate-900 px-1 rounded">facts.js</code> vers Supabase,
          utilisez le script Node.js :<br />
          <code className="text-green-400 text-xs">node --env-file=.env.local scripts/migrate_facts_to_supabase.js</code>
        </p>
        <button
          disabled={migrationDone || migrating}
          onClick={runMigration}
          className="px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: migrationDone ? '#374151' : '#FF6B1A', color: 'white' }}
        >
          {migrationDone ? '✓ Migration effectuée' : migrating ? 'En cours…' : 'Lancer la migration'}
        </button>
      </div>
    </div>
  )
}
