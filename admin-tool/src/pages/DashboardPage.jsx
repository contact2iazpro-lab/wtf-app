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
  const [syncStatus, setSyncStatus] = useState(null) // null | 'running' | 'done' | 'error'
  const [syncMessage, setSyncMessage] = useState('')

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
      const resp = await fetch('/api/sync-facts', {
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
