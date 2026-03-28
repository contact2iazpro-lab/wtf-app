import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CATEGORIES, VIP_USAGES } from '../constants/categories'

const EDITABLE_FIELDS = [
  'category', 'question', 'hint1', 'hint2', 'short_answer', 'explanation',
  'source_url', 'options', 'correct_index', 'image_url',
  'is_vip', 'is_published', 'pack_id', 'vip_usage',
]

function Toggle({ on, onChange, label, color }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="flex items-center gap-3 w-full"
    >
      <div
        className="relative w-12 h-6 rounded-full transition-all shrink-0"
        style={{ background: on ? (color || '#22C55E') : '#374151' }}
      >
        <div className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all" style={{ left: on ? '26px' : '4px' }} />
      </div>
      <span className={`text-sm font-semibold ${on ? 'text-white' : 'text-slate-500'}`}>{label}</span>
    </button>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
      <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4">{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-orange-DEFAULT placeholder-slate-500 resize-none"

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export default function FactEditorPage({ toast }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [fact, setFact] = useState(null)
  const [originalFact, setOriginalFact] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [prevId, setPrevId] = useState(null)
  const [nextId, setNextId] = useState(null)
  const [history, setHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [imageStatus, setImageStatus] = useState(null) // null | 'loading' | 'ok' | 'error'
  const imageTimerRef = useRef(null)

  useEffect(() => { load() }, [id])

  const load = useCallback(async () => {
    setLoading(true)
    setErrors({})
    try {
      const [
        { data, error },
        { data: prevData },
        { data: nextData },
        { data: hist },
      ] = await Promise.all([
        supabase.from('facts').select('*').eq('id', id).single(),
        supabase.from('facts').select('id').lt('id', id).order('id', { ascending: false }).limit(1),
        supabase.from('facts').select('id').gt('id', id).order('id', { ascending: true }).limit(1),
        supabase.from('edit_history').select('*').eq('fact_id', id).order('edited_at', { ascending: false }).limit(10),
      ])
      if (error) throw error
      // Ensure options is always an array of 6 strings
      const options = Array.isArray(data.options) ? data.options : []
      while (options.length < 6) options.push('')
      const f = { ...data, options, vip_usage: data.vip_usage || 'available' }
      setFact(f)
      setOriginalFact(JSON.parse(JSON.stringify(f)))
      setPrevId(prevData?.[0]?.id ?? null)
      setNextId(nextData?.[0]?.id ?? null)
      setHistory(hist || [])
      // Check image
      if (data.image_url) checkImage(data.image_url)
    } catch (err) {
      console.error(err)
      toast?.('Erreur chargement fact', 'error')
    } finally {
      setLoading(false)
    }
  }, [id])

  function checkImage(url) {
    if (!url) { setImageStatus(null); return }
    setImageStatus('loading')
    clearTimeout(imageTimerRef.current)
    imageTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(url, { method: 'HEAD', mode: 'no-cors' })
        setImageStatus('ok')
      } catch {
        setImageStatus('error')
      }
    }, 500)
  }

  function set(field, value) {
    setFact(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  function setOption(index, value) {
    setFact(prev => {
      const opts = [...prev.options]
      opts[index] = value
      return { ...prev, options: opts }
    })
  }

  function validate() {
    const e = {}
    if (!fact.question?.trim()) e.question = 'Question obligatoire'
    if (!fact.short_answer?.trim()) e.short_answer = 'Réponse courte obligatoire'
    if (!fact.category) e.category = 'Catégorie obligatoire'
    const validCats = CATEGORIES.map(c => c.id)
    if (fact.category && !validCats.includes(fact.category)) e.category = 'Catégorie invalide'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function save() {
    if (!validate()) return
    setSaving(true)
    try {
      // Compute diff for history
      const changes = []
      for (const field of EDITABLE_FIELDS) {
        const oldVal = JSON.stringify(originalFact?.[field] ?? null)
        const newVal = JSON.stringify(fact[field] ?? null)
        if (oldVal !== newVal) {
          changes.push({
            fact_id: Number(id),
            field_name: field,
            old_value: oldVal,
            new_value: newVal,
          })
        }
      }

      // Prepare payload — trim options array
      const options = fact.options.filter(o => o.trim())
      const payload = {
        ...fact,
        options: options.length > 0 ? options : null,
        updated_at: new Date().toISOString(),
      }
      delete payload.id // don't override id in upsert key

      const { error } = await supabase.from('facts').update(payload).eq('id', id)
      if (error) throw error

      // Log history
      if (changes.length) {
        await supabase.from('edit_history').insert(changes)
        // Reload history
        const { data: hist } = await supabase
          .from('edit_history').select('*').eq('fact_id', id)
          .order('edited_at', { ascending: false }).limit(10)
        setHistory(hist || [])
      }

      setOriginalFact(JSON.parse(JSON.stringify(fact)))
      toast?.(`✓ Fact #${id} sauvegardé`)

      // Warn if VIP without usage
      if (fact.is_vip && fact.vip_usage === 'available') {
        toast?.('⚠ Ce Fact VIP n\'a pas d\'usage assigné', 'warn', 5000)
      }
    } catch (err) {
      console.error(err)
      toast?.('Erreur sauvegarde', 'error')
    } finally {
      setSaving(false)
    }
  }

  const isDirty = fact && originalFact && JSON.stringify(fact) !== JSON.stringify(originalFact)

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="text-slate-400 text-sm">Chargement…</div></div>
  }
  if (!fact) {
    return <div className="flex items-center justify-center h-full"><div className="text-red-400 text-sm">Fact introuvable</div></div>
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/facts" className="text-slate-400 hover:text-white transition-colors text-sm">← Liste</Link>
          <span className="text-slate-600">/</span>
          <h1 className="text-xl font-black text-white">
            Fact #{id}
            {isDirty && <span className="ml-2 text-xs font-semibold text-orange-DEFAULT px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,107,26,0.15)', color: '#FF6B1A' }}>modifié</span>}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {prevId && (
            <Link
              to={`/facts/${prevId}`}
              className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:bg-slate-700 transition-all"
            >
              ← #{prevId}
            </Link>
          )}
          {nextId && (
            <Link
              to={`/facts/${nextId}`}
              className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:bg-slate-700 transition-all"
            >
              #{nextId} →
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* IDENTIFICATION */}
        <Section title="🆔 Identification">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">ID</label>
              <div className="px-3 py-2.5 rounded-xl bg-slate-900/50 border border-slate-700 text-slate-500 font-mono text-sm">
                {fact.id}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                Catégorie {errors.category && <span className="text-red-400 normal-case">— {errors.category}</span>}
              </label>
              <select
                value={fact.category || ''}
                onChange={e => set('category', e.target.value)}
                className={`${inputCls} ${errors.category ? 'border-red-500' : ''}`}
              >
                <option value="">Choisir…</option>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Pack</label>
              <input
                value={fact.pack_id || 'free'}
                onChange={e => set('pack_id', e.target.value)}
                className={inputCls}
                placeholder="free"
              />
            </div>
          </div>
        </Section>

        {/* CONTENU */}
        <Section title="📝 Contenu">
          <Field label={`Question ${errors.question ? '— ' + errors.question : ''}`}>
            <textarea
              value={fact.question || ''}
              onChange={e => set('question', e.target.value)}
              rows={3}
              className={`${inputCls} ${errors.question ? 'border-red-500' : ''}`}
              placeholder="Affirmation à valider ou infirmer…"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Indice 1">
              <input value={fact.hint1 || ''} onChange={e => set('hint1', e.target.value)} className={inputCls} placeholder="Premier indice…" />
            </Field>
            <Field label="Indice 2">
              <input value={fact.hint2 || ''} onChange={e => set('hint2', e.target.value)} className={inputCls} placeholder="Deuxième indice…" />
            </Field>
          </div>

          <Field label={`Réponse courte ${errors.short_answer ? '— ' + errors.short_answer : ''}`}>
            <input
              value={fact.short_answer || ''}
              onChange={e => set('short_answer', e.target.value)}
              className={`${inputCls} ${errors.short_answer ? 'border-red-500' : ''}`}
              placeholder="Réponse courte visible au joueur…"
            />
          </Field>

          <Field label="Explication complète">
            <textarea
              value={fact.explanation || ''}
              onChange={e => set('explanation', e.target.value)}
              rows={4}
              className={inputCls}
              placeholder="Explication détaillée du fait…"
            />
          </Field>

          <Field label="URL Source">
            <div className="flex gap-2">
              <input
                value={fact.source_url || ''}
                onChange={e => set('source_url', e.target.value)}
                className={`${inputCls} flex-1`}
                placeholder="https://…"
              />
              {fact.source_url && (
                <a
                  href={fact.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2.5 rounded-xl bg-slate-700 text-slate-300 hover:bg-slate-600 text-sm transition-all shrink-0"
                >
                  🔗
                </a>
              )}
            </div>
          </Field>
        </Section>

        {/* OPTIONS (QCM) */}
        <Section title="🔢 Options (QCM)">
          <div className="grid grid-cols-2 gap-3 mb-4">
            {fact.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct_index"
                  checked={fact.correct_index === i}
                  onChange={() => set('correct_index', i)}
                  className="w-4 h-4 shrink-0"
                  style={{ accentColor: '#FF6B1A' }}
                />
                <input
                  value={opt}
                  onChange={e => setOption(i, e.target.value)}
                  className={inputCls}
                  placeholder={`Option ${i + 1}…`}
                />
                {fact.correct_index === i && (
                  <span className="text-green-400 text-sm shrink-0">✓</span>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Sélectionnez le bouton radio à gauche de la bonne réponse.
            Réponse correcte actuelle : option {(fact.correct_index ?? 0) + 1}
          </p>
        </Section>

        {/* STATUTS */}
        <Section title="⚙️ Statuts">
          <div className="space-y-4">
            <div className="p-4 rounded-xl border" style={{ background: fact.is_vip ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.03)', borderColor: fact.is_vip ? 'rgba(255,215,0,0.3)' : '#334155' }}>
              <Toggle
                on={fact.is_vip}
                onChange={v => set('is_vip', v)}
                label="⭐ Fact VIP — Récompense exclusive"
                color="#FFD700"
              />
            </div>

            <div className="p-4 rounded-xl border" style={{ background: fact.is_published ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)', borderColor: fact.is_published ? 'rgba(34,197,94,0.3)' : '#334155' }}>
              <Toggle
                on={fact.is_published}
                onChange={v => set('is_published', v)}
                label="👁 Publié — Visible dans l'app"
                color="#22C55E"
              />
            </div>

            {fact.is_vip && (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Usage VIP</label>
                <select
                  value={fact.vip_usage || 'available'}
                  onChange={e => set('vip_usage', e.target.value)}
                  className={inputCls}
                >
                  {VIP_USAGES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
                {fact.vip_usage === 'available' && (
                  <p className="text-amber-400 text-xs mt-1.5 font-semibold">
                    ⚠ Ce Fact VIP n'a pas d'usage assigné
                  </p>
                )}
              </div>
            )}
          </div>
        </Section>

        {/* IMAGE */}
        <Section title="🖼 Image">
          <Field label={`URL Image ${imageStatus === 'ok' ? '— ✓ Accessible' : imageStatus === 'error' ? '— ✕ Non accessible' : ''}`}>
            <div className="flex gap-2">
              <input
                value={fact.image_url || ''}
                onChange={e => { set('image_url', e.target.value); checkImage(e.target.value) }}
                className={`${inputCls} flex-1`}
                placeholder="https://…"
              />
              <div className="flex items-center px-3">
                {imageStatus === 'loading' && <span className="text-slate-400 text-sm">⟳</span>}
                {imageStatus === 'ok' && <span className="text-green-400 text-sm">●</span>}
                {imageStatus === 'error' && <span className="text-red-400 text-sm">✕</span>}
              </div>
            </div>
          </Field>
          {fact.image_url && (
            <div className="mt-2 rounded-xl overflow-hidden border border-slate-700" style={{ maxHeight: 200 }}>
              <img
                src={fact.image_url}
                alt="aperçu"
                className="w-full h-48 object-cover"
                onLoad={() => setImageStatus('ok')}
                onError={() => setImageStatus('error')}
              />
            </div>
          )}
        </Section>

        {/* HISTORIQUE */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700">
          <button
            onClick={() => setShowHistory(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-sm font-black text-slate-300 hover:text-white transition-all"
          >
            <span>🕐 Historique des modifications ({history.length})</span>
            <span className="text-slate-500">{showHistory ? '▲' : '▼'}</span>
          </button>
          {showHistory && (
            <div className="border-t border-slate-700 p-5">
              {history.length === 0 ? (
                <p className="text-slate-500 text-sm">Aucune modification enregistrée.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-700">
                      <th className="text-left pb-2">Date</th>
                      <th className="text-left pb-2">Champ</th>
                      <th className="text-left pb-2">Avant</th>
                      <th className="text-left pb-2">Après</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(h => (
                      <tr key={h.id} className="border-b border-slate-800">
                        <td className="py-1.5 text-slate-500 pr-4 whitespace-nowrap">{fmt(h.edited_at)}</td>
                        <td className="py-1.5 text-orange-DEFAULT pr-4 font-mono" style={{ color: '#FF6B1A' }}>{h.field_name}</td>
                        <td className="py-1.5 text-slate-500 pr-4 max-w-xs truncate" title={h.old_value}>{h.old_value}</td>
                        <td className="py-1.5 text-slate-300 max-w-xs truncate" title={h.new_value}>{h.new_value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="text-xs text-slate-600 px-1">
          Dernière modification : {fmt(fact.updated_at)}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2 pb-8">
          <Link
            to="/facts"
            className="flex-1 py-3.5 rounded-2xl text-center font-black text-sm bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-all"
          >
            Annuler
          </Link>
          <button
            onClick={save}
            disabled={saving || !isDirty}
            className="flex-1 py-3.5 rounded-2xl font-black text-sm text-white transition-all disabled:opacity-40 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #FF6B1A, #D94A10)' }}
          >
            {saving ? 'Sauvegarde…' : isDirty ? `Enregistrer ✓` : 'Aucune modification'}
          </button>
        </div>
      </div>
    </div>
  )
}
