import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getCategoryLabel, getCategoryEmoji } from '../constants/categories'

// ── Difficulty badge ────────────────────────────────────────────────────────
const DIFF_STYLES = [
  { value: 'Facile', color: '#22C55E', bg: 'rgba(34,197,94,0.15)' },
  { value: 'Normal', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  { value: 'Expert', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
]
function DifficultyBadge({ value }) {
  const d = DIFF_STYLES.find(s => s.value === value) || DIFF_STYLES[1]
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ color: d.color, background: d.bg }}>
      {d.value}
    </span>
  )
}

export default function ArchivedFactsPage({ toast }) {
  const [archivedFacts, setArchivedFacts] = useState([])
  const [originalFacts, setOriginalFacts] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('doublon') // 'doublon' | 'all'
  const [expandedId, setExpandedId] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)

  // ── Load archived facts ───────────────────────────────────────────────
  async function loadArchived() {
    setLoading(true)
    try {
      let q = supabase
        .from('facts')
        .select('*')
        .eq('is_published', false)
        .order('id', { ascending: true })

      if (filter === 'doublon') {
        q = q.eq('archived_reason', 'doublon')
      }

      const { data, error } = await q
      if (error) throw error

      setArchivedFacts(data || [])

      // Load original facts for doublons
      const originalIds = [...new Set((data || []).filter(f => f.duplicate_of).map(f => f.duplicate_of))]
      if (originalIds.length > 0) {
        const { data: originals } = await supabase
          .from('facts')
          .select('id, question, category, short_answer, is_published')
          .in('id', originalIds)

        const map = {}
        ;(originals || []).forEach(f => { map[f.id] = f })
        setOriginalFacts(map)
      }
    } catch (err) {
      toast?.('Erreur chargement : ' + err.message, 'error')
    }
    setLoading(false)
  }

  useEffect(() => { loadArchived() }, [filter])

  // ── Réintégrer un fact ────────────────────────────────────────────────
  async function reintegrate(factId) {
    setActionLoading(factId)
    try {
      const { error } = await supabase
        .from('facts')
        .update({
          is_published: true,
          archived_reason: null,
          duplicate_of: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', factId)

      if (error) throw error
      toast?.(`✓ Fact #${factId} réintégré (publié)`)
      await loadArchived()
    } catch (err) {
      toast?.('Erreur : ' + err.message, 'error')
    }
    setActionLoading(null)
  }

  // ── Supprimer définitivement ──────────────────────────────────────────
  async function deleteForever(factId) {
    if (!confirm(`Supprimer DÉFINITIVEMENT le fact #${factId} ? Cette action est irréversible.`)) return
    setActionLoading(factId)
    try {
      const { error } = await supabase
        .from('facts')
        .delete()
        .eq('id', factId)

      if (error) throw error
      toast?.(`✓ Fact #${factId} supprimé définitivement`)
      await loadArchived()
    } catch (err) {
      toast?.('Erreur : ' + err.message, 'error')
    }
    setActionLoading(null)
  }

  // ── Render ────────────────────────────────────────────────────────────
  const doublonCount = archivedFacts.filter(f => f.archived_reason === 'doublon').length

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">🗑 Facts Supprimés</h1>
          <p className="text-sm text-slate-400 mt-1">
            {archivedFacts.length} fact{archivedFacts.length > 1 ? 's' : ''} archivé{archivedFacts.length > 1 ? 's' : ''}
            {filter === 'doublon' && ` (doublons uniquement)`}
          </p>
        </div>
        <Link to="/facts" className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-700 text-white hover:bg-slate-600 transition-all">
          ← Retour aux Facts
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('doublon')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            filter === 'doublon'
              ? 'text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
          }`}
          style={filter === 'doublon' ? { background: '#FF6B1A' } : {}}
        >
          🔁 Doublons ({doublonCount})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            filter === 'all'
              ? 'text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
          }`}
          style={filter === 'all' ? { background: '#FF6B1A' } : {}}
        >
          📋 Tous les archivés
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-16 text-slate-500">Chargement…</div>
      )}

      {/* Empty state */}
      {!loading && archivedFacts.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">✨</div>
          <p className="text-slate-400 font-semibold">Aucun fact archivé</p>
          <p className="text-slate-500 text-sm mt-1">Tous les facts sont actifs !</p>
        </div>
      )}

      {/* Facts list */}
      {!loading && archivedFacts.length > 0 && (
        <div className="space-y-3">
          {archivedFacts.map(fact => {
            const original = fact.duplicate_of ? originalFacts[fact.duplicate_of] : null
            const isExpanded = expandedId === fact.id
            const isActionLoading = actionLoading === fact.id

            return (
              <div
                key={fact.id}
                className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden"
              >
                {/* Header row */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-750 transition-all"
                  onClick={() => setExpandedId(isExpanded ? null : fact.id)}
                >
                  <span className="text-xs font-mono text-slate-500 w-10 shrink-0">#{fact.id}</span>
                  <span className="text-sm shrink-0">{getCategoryEmoji(fact.category)}</span>
                  <span className="text-sm text-slate-300 font-semibold truncate flex-1">{fact.question}</span>
                  <DifficultyBadge value={fact.difficulty || 'Normal'} />
                  {fact.archived_reason === 'doublon' && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/15 text-red-400">
                      Doublon
                    </span>
                  )}
                  <span className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-slate-700 px-4 py-4 space-y-3">
                    {/* Question + Answer */}
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase mb-1">Question</p>
                      <p className="text-sm text-white">{fact.question}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase mb-1">Réponse</p>
                      <p className="text-sm text-slate-300">{fact.short_answer || fact.answer}</p>
                    </div>
                    {fact.explanation && (
                      <div>
                        <p className="text-xs text-slate-500 font-bold uppercase mb-1">Explication</p>
                        <p className="text-sm text-slate-400">{fact.explanation}</p>
                      </div>
                    )}

                    {/* Duplicate reference */}
                    {fact.duplicate_of && (
                      <div className="bg-slate-900/50 rounded-xl p-3 border border-amber-500/20">
                        <p className="text-xs text-amber-400 font-bold uppercase mb-2">
                          🔁 Doublon de #{fact.duplicate_of}
                        </p>
                        {original ? (
                          <div className="space-y-1">
                            <p className="text-sm text-white">{original.question}</p>
                            <p className="text-xs text-slate-400">
                              Réponse : {original.short_answer}
                              {' · '}
                              <span className={original.is_published ? 'text-green-400' : 'text-red-400'}>
                                {original.is_published ? '✓ Publié' : '✗ Non publié'}
                              </span>
                            </p>
                            <Link
                              to={`/facts/${fact.duplicate_of}`}
                              className="text-xs font-bold hover:underline"
                              style={{ color: '#FF6B1A' }}
                            >
                              Voir le fact original →
                            </Link>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">Fact original introuvable</p>
                        )}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>Catégorie : {getCategoryEmoji(fact.category)} {getCategoryLabel(fact.category)}</span>
                      <span>Difficulté : {fact.difficulty || 'Normal'}</span>
                      {fact.archived_reason && <span>Raison : {fact.archived_reason}</span>}
                      <span>Modifié : {new Date(fact.updated_at).toLocaleDateString('fr-FR')}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-slate-700">
                      <Link
                        to={`/facts/${fact.id}`}
                        className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-700 text-white hover:bg-slate-600 transition-all"
                      >
                        👁 Consulter
                      </Link>
                      <button
                        onClick={() => reintegrate(fact.id)}
                        disabled={isActionLoading}
                        className="px-4 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all disabled:opacity-40"
                        style={{ background: '#22C55E' }}
                      >
                        {isActionLoading ? '…' : '♻ Réintégrer'}
                      </button>
                      <button
                        onClick={() => deleteForever(fact.id)}
                        disabled={isActionLoading}
                        className="px-4 py-2 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-500 transition-all disabled:opacity-40"
                      >
                        {isActionLoading ? '…' : '🗑 Supprimer'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
