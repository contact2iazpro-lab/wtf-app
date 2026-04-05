import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CATEGORIES, VIP_USAGES } from '../constants/categories'
import { resolveImageUrl } from '../utils/imageUrl'

const EDITABLE_FIELDS = [
  'category', 'question', 'hint1', 'hint2', 'hint3', 'hint4', 'short_answer', 'explanation',
  'source_url', 'options', 'correct_index', 'image_url',
  'is_vip', 'type', 'status', 'pack_id', 'vip_usage',
  'funny_wrong_1', 'funny_wrong_2', 'close_wrong_1', 'close_wrong_2',
  'plausible_wrong_1', 'plausible_wrong_2', 'plausible_wrong_3',
]

const STATUSES = [
  { value: 'draft',     label: 'Brouillon', color: '#9CA3AF', icon: '✏️' },
  { value: 'reserve',   label: 'Réserve',   color: '#F59E0B', icon: '🔒' },
  { value: 'published', label: 'Publié',    color: '#10B981', icon: '✅' },
]


const CHAR_LIMITS = {
  question:     { max: 100 },
  hint1:        { max: 20 },
  hint2:        { max: 20 },
  short_answer: { max: 50 },
  explanation:  { min: 100, max: 300 },
  option:       { max: 50 },
}

function CharCounter({ value, max, min }) {
  const len = (value || '').length
  const isOver = len > max
  const isUnder = min != null && len > 0 && len < min
  return (
    <span className={`text-xs font-mono tabular-nums ${isOver ? 'text-red-400 font-bold' : isUnder ? 'text-amber-400' : 'text-slate-600'}`}>
      {len}/{max}{isOver && ' ⚠'}
    </span>
  )
}

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

function Field({ label, hint, children }) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">{label}</label>
        {hint && <span className="text-xs text-slate-600">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

const inputCls = "w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-orange-DEFAULT placeholder-slate-500 resize-none"
const inputClsOver = "w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-red-500 text-white text-sm focus:outline-none placeholder-slate-500 resize-none"

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

const isLightColor = (hex) => {
  if (!hex) return false
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128
}

function FactPreviewStandalone({ fact }) {
  const [tab, setTab] = useState('question')
  const cat = CATEGORIES.find(c => c.id === fact.category)
  const categoryColor = cat?.color || '#FF6B1A'
  const categoryLabel = cat?.label || fact.category || '—'
  const categoryEmoji = cat?.emoji || '❓'
  const textColor = isLightColor(categoryColor) ? '#1a1a1a' : '#ffffff'
  const bg = `linear-gradient(160deg, ${categoryColor}22, ${categoryColor})`

  // Build QCM options: short_answer + 3 first available wrong answers
  const wrongAnswers = [
    fact.funny_wrong_1, fact.close_wrong_1, fact.plausible_wrong_1,
    fact.funny_wrong_2, fact.close_wrong_2, fact.plausible_wrong_2, fact.plausible_wrong_3,
  ].filter(Boolean)
  const qcmOptions = [fact.short_answer, ...wrongAnswers.slice(0, 3)].filter(Boolean)

  return (
    <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
      <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4">👁 Aperçu en jeu</h3>
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('question')}
          className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
          style={{
            background: tab === 'question' ? categoryColor : 'transparent',
            color: tab === 'question' ? (isLightColor(categoryColor) ? '#1a1a1a' : '#fff') : '#94a3b8',
            border: `2px solid ${tab === 'question' ? categoryColor : '#475569'}`,
          }}
        >
          ❓ Question
        </button>
        <button
          onClick={() => setTab('revelation')}
          className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
          style={{
            background: tab === 'revelation' ? categoryColor : 'transparent',
            color: tab === 'revelation' ? (isLightColor(categoryColor) ? '#1a1a1a' : '#fff') : '#94a3b8',
            border: `2px solid ${tab === 'revelation' ? categoryColor : '#475569'}`,
          }}
        >
          💡 Révélation
        </button>
      </div>

      {/* Phone frame */}
      <div
        className="mx-auto rounded-[2rem] overflow-hidden border-4 border-slate-600 shadow-2xl"
        style={{ width: 320, height: 580, fontFamily: 'Nunito, sans-serif' }}
      >
        {tab === 'question' ? (
          /* ───── QUESTION TAB ───── */
          <div className="relative w-full h-full flex flex-col" style={{ background: bg }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span style={{ color: textColor, opacity: 0.7, fontSize: 18 }}>✕</span>
              <span style={{ color: textColor, fontSize: 13, fontWeight: 700 }}>{categoryEmoji} {categoryLabel}</span>
              <span style={{ color: textColor, opacity: 0.7, fontSize: 16 }}>💰</span>
            </div>

            {/* Progress bar */}
            <div className="flex gap-1.5 px-5 mb-3">
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className="flex-1 h-1.5 rounded-full"
                  style={{ background: i === 0 ? categoryColor : `${textColor}33` }}
                />
              ))}
            </div>

            {/* Question */}
            <div className="flex-1 flex items-center justify-center px-6">
              <p style={{ color: textColor, fontWeight: 900, fontSize: 18, textAlign: 'center', lineHeight: 1.4 }}>
                {fact.question || 'Aucune question…'}
              </p>
            </div>

            {/* QCM grid */}
            <div className="grid grid-cols-2 gap-2 px-4 mb-3">
              {qcmOptions.length > 0 ? qcmOptions.map((opt, i) => (
                <div
                  key={i}
                  className="rounded-xl text-center py-2.5 px-2 text-xs font-bold truncate"
                  style={{
                    background: opt === fact.short_answer ? '#16a34a' : 'rgba(255,255,255,0.15)',
                    color: opt === fact.short_answer ? '#fff' : textColor,
                    border: opt === fact.short_answer ? '2px solid #22c55e' : `1px solid ${textColor}22`,
                  }}
                >
                  {opt}
                </div>
              )) : (
                <>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="rounded-xl text-center py-2.5 px-2 text-xs" style={{ background: `${textColor}15`, color: `${textColor}44` }}>
                      Option {i}
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Timer + hints */}
            <div className="flex items-center justify-between px-5 pb-4">
              {/* Hint buttons */}
              <div className="flex gap-2">
                {fact.hint1 && (
                  <div className="rounded-full px-3 py-1.5 text-[10px] font-bold" style={{ background: `${textColor}20`, color: textColor }}>
                    💡 Indice 1
                  </div>
                )}
                {fact.hint2 && (
                  <div className="rounded-full px-3 py-1.5 text-[10px] font-bold" style={{ background: `${textColor}20`, color: textColor }}>
                    💡 Indice 2
                  </div>
                )}
              </div>
              {/* Timer */}
              <div className="relative" style={{ width: 44, height: 44 }}>
                <svg viewBox="0 0 44 44" width="44" height="44">
                  <circle cx="22" cy="22" r="19" fill="none" stroke={`${textColor}33`} strokeWidth="3" />
                  <circle cx="22" cy="22" r="19" fill="none" stroke={textColor} strokeWidth="3"
                    strokeDasharray={`${2 * Math.PI * 19}`} strokeDashoffset="0"
                    strokeLinecap="round" transform="rotate(-90 22 22)" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-black" style={{ color: textColor }}>
                  30
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* ───── REVELATION TAB ───── */
          <div className="relative w-full h-full flex flex-col overflow-y-auto" style={{ background: bg }}>
            {/* Image */}
            <div className="mx-auto mt-4 rounded-xl overflow-hidden flex items-center justify-center" style={{ width: 180, height: 180, background: 'rgba(0,0,0,0.2)' }}>
              {fact.image_url ? (
                <img
                  src={resolveImageUrl(fact.image_url)}
                  alt="fact"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-1" style={{ color: `${textColor}66` }}>
                  <span style={{ fontSize: 32 }}>📷</span>
                  <span style={{ fontSize: 11, fontWeight: 700 }}>Pas d'image</span>
                </div>
              )}
            </div>

            {/* Result badges */}
            <div className="flex flex-col items-center gap-2 mt-3 px-4">
              <div className="rounded-full px-4 py-1.5 text-xs font-black" style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e', border: '2px solid #22c55e' }}>
                ✅ BONNE RÉPONSE
              </div>
              <div className="rounded-full px-4 py-1.5 text-xs font-black" style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: '2px solid #ef4444' }}>
                ❌ PAS CETTE FOIS
              </div>
            </div>

            {/* Answer */}
            <div className="text-center mt-3 px-5">
              <p style={{ color: categoryColor, fontWeight: 900, fontSize: 22, textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                {fact.short_answer || '—'}
              </p>
            </div>

            {/* Explanation */}
            <div className="px-5 mt-2 flex-1">
              <p style={{ color: textColor, fontSize: 12, lineHeight: 1.5, opacity: 0.85 }}>
                {fact.explanation || 'Aucune explication…'}
              </p>
            </div>

            {/* Bottom buttons */}
            <div className="flex gap-2 px-4 pb-4 mt-3">
              <div
                className="flex-1 rounded-xl text-center py-2.5 text-xs font-bold"
                style={{ background: `${textColor}20`, color: textColor }}
              >
                🔗 Partager
              </div>
              <div
                className="flex-1 rounded-xl text-center py-2.5 text-xs font-bold"
                style={{ background: categoryColor, color: isLightColor(categoryColor) ? '#1a1a1a' : '#fff' }}
              >
                Suivant →
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function FactEditorPage({ toast }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [fact, setFact] = useState(null)
  const [originalFact, setOriginalFact] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [errors, setErrors] = useState({})
  const [prevId, setPrevId] = useState(null)
  const [nextId, setNextId] = useState(null)
  const [history, setHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [imageStatus, setImageStatus] = useState(null) // null | 'loading' | 'ok' | 'error'
  const [imageUploading, setImageUploading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const imageTimerRef = useRef(null)
  const imageInputRef = useRef(null)

  useEffect(() => { load() }, [id])

  const load = useCallback(async () => {
    setLoading(true)
    setErrors({})
    setShowDeleteConfirm(false)
    try {
      // ── Build filtered prev/next queries ──────────────────────────
      // Read filters from URL search params (priority) or localStorage (fallback for categories)
      const filterCats = searchParams.get('categories')?.split(',').filter(Boolean)
        || (() => { try { const s = localStorage.getItem('selectedCategories'); return s ? JSON.parse(s) : [] } catch { return [] } })()
      const filterVip = searchParams.get('vip') || 'all'
      const filterStatus = searchParams.get('status') || 'all'
      const filterPack = searchParams.get('pack') || 'all'
      const filterImage = searchParams.get('image') || 'all'

      function applyFilters(q) {
        if (filterCats.length) q = q.in('category', filterCats)
        if (filterVip === 'vip') q = q.eq('is_vip', true)
        if (filterVip === 'non-vip') q = q.eq('is_vip', false)
        if (filterStatus !== 'all') q = q.eq('status', filterStatus)
        if (filterPack !== 'all') q = q.eq('pack_id', filterPack)
        if (filterImage === 'with') q = q.not('image_url', 'is', null).neq('image_url', '')
        if (filterImage === 'without') q = q.or('image_url.is.null,image_url.eq.')
        return q
      }

      let prevQ = supabase.from('facts').select('id').lt('id', id).order('id', { ascending: false }).limit(1)
      let nextQ = supabase.from('facts').select('id').gt('id', id).order('id', { ascending: true }).limit(1)
      prevQ = applyFilters(prevQ)
      nextQ = applyFilters(nextQ)

      const [
        { data, error },
        { data: prevData },
        { data: nextData },
        { data: hist },
      ] = await Promise.all([
        supabase.from('facts').select('*').eq('id', id).single(),
        prevQ,
        nextQ,
        supabase.from('edit_history').select('*').eq('fact_id', id).order('edited_at', { ascending: false }).limit(10),
      ])
      if (error) throw error
      const options = Array.isArray(data.options) ? data.options : []
      while (options.length < 6) options.push('')
      // Rétrocompatibilité : mapper is_published → status si status absent
      const status = data.status || (data.is_published ? 'published' : 'draft')
      const f = {
        ...data,
        options,
        status,
        vip_usage: data.vip_usage || 'available',
      }
      setFact(f)
      setOriginalFact(JSON.parse(JSON.stringify(f)))
      setPrevId(prevData?.[0]?.id ?? null)
      setNextId(nextData?.[0]?.id ?? null)
      setHistory(hist || [])
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
    // BUG FIX : fetch() avec mode:'no-cors' retournait toujours une réponse opaque
    // considérée comme succès, même pour les URLs invalides.
    // On utilise un objet Image natif qui déclenche onload/onerror correctement.
    imageTimerRef.current = setTimeout(() => {
      const img = new Image()
      img.onload = () => setImageStatus('ok')
      img.onerror = () => setImageStatus('error')
      img.src = resolveImageUrl(url) ?? url
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

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageUploading(true)
    setImageStatus('loading')
    try {
      // Ensure bucket exists (ignore "already exists" error)
      await supabase.storage.createBucket('fact-images', { public: true }).catch(() => {})

      const ext = file.name.split('.').pop().toLowerCase()
      const path = `facts/${id}-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('fact-images')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('fact-images').getPublicUrl(path)

      set('image_url', publicUrl)
      checkImage(publicUrl)

      // Save to DB immediately so URL is persisted without needing to click Sauvegarder
      await supabase.from('facts').update({ image_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', id)
      toast?.('✓ Image uploadée et sauvegardée')
    } catch (err) {
      console.error(err)
      setImageStatus('error')
      const msg = err.message || ''
      if (msg.includes('row-level security') || msg.includes('policy') || msg.includes('Bucket')) {
        toast?.('Bucket "fact-images" manquant ou sans politique. Créez-le dans Supabase → Storage (Public ✓)', 'error')
      } else {
        toast?.('Erreur upload : ' + msg, 'error')
      }
    } finally {
      setImageUploading(false)
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
  }

  function isOverLimit(field, value) {
    const limit = CHAR_LIMITS[field]
    if (!limit) return false
    return (value || '').length > limit.max
  }

  function validate() {
    const e = {}
    if (!fact.question?.trim()) e.question = 'Question obligatoire'
    else if (fact.question.length > CHAR_LIMITS.question.max) e.question = `Max ${CHAR_LIMITS.question.max} caractères`
    if (!fact.short_answer?.trim()) e.short_answer = 'Réponse courte obligatoire'
    else if (fact.short_answer.length > CHAR_LIMITS.short_answer.max) e.short_answer = `Max ${CHAR_LIMITS.short_answer.max} caractères`
    if (!fact.category) e.category = 'Catégorie obligatoire'
    const validCats = CATEGORIES.map(c => c.id)
    if (fact.category && !validCats.includes(fact.category)) e.category = 'Catégorie invalide'
    if (fact.hint1?.length > CHAR_LIMITS.hint1.max) e.hint1 = `Max ${CHAR_LIMITS.hint1.max} caractères`
    if (fact.hint2?.length > CHAR_LIMITS.hint2.max) e.hint2 = `Max ${CHAR_LIMITS.hint2.max} caractères`
    if (fact.explanation) {
      if (fact.explanation.length < CHAR_LIMITS.explanation.min) e.explanation = `Min ${CHAR_LIMITS.explanation.min} caractères`
      else if (fact.explanation.length > CHAR_LIMITS.explanation.max) e.explanation = `Max ${CHAR_LIMITS.explanation.max} caractères`
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function save() {
    if (!validate()) return
    setSaving(true)
    try {
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

      const options = fact.options.filter(o => o.trim())
      const payload = {
        ...fact,
        options: options.length > 0 ? options : null,
        updated_at: new Date().toISOString(),
        // Rétrocompatibilité : sync is_published depuis status
        is_published: fact.status === 'published',
      }
      delete payload.id

      const { error } = await supabase.from('facts').update(payload).eq('id', id)
      if (error) throw error

      if (changes.length) {
        await supabase.from('edit_history').insert(changes)
        const { data: hist } = await supabase
          .from('edit_history').select('*').eq('fact_id', id)
          .order('edited_at', { ascending: false }).limit(10)
        setHistory(hist || [])
      }

      setOriginalFact(JSON.parse(JSON.stringify(fact)))
      toast?.(`✓ Fact #${id} sauvegardé`)

      if (fact.is_vip && fact.vip_usage === 'available') {
        toast?.('⚠ Ce Fact Quête n\'a pas d\'usage assigné', 'warn', 5000)
      }
    } catch (err) {
      console.error(err)
      toast?.('Erreur sauvegarde', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function enrichFact() {
    setEnriching(true)
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
      if (!resp.ok) throw new Error(data.error || 'Erreur enrichissement')

      set('hint1', data.hint1)
      set('hint2', data.hint2)
      set('hint3', data.hint3)
      set('hint4', data.hint4)
      set('funny_wrong_1', data.funny_wrong_1)
      set('funny_wrong_2', data.funny_wrong_2)
      set('close_wrong_1', data.close_wrong_1)
      set('close_wrong_2', data.close_wrong_2)
      set('plausible_wrong_1', data.plausible_wrong_1)
      set('plausible_wrong_2', data.plausible_wrong_2)
      set('plausible_wrong_3', data.plausible_wrong_3)

      toast?.('✓ Fact enrichi par Claude — vérifiez avant de sauvegarder')
    } catch (err) {
      console.error(err)
      toast?.('Erreur enrichissement : ' + (err.message || ''), 'error')
    } finally {
      setEnriching(false)
    }
  }

  async function deleteFact() {
    setDeleting(true)
    try {
      const { error } = await supabase.from('facts').delete().eq('id', id)
      if (error) throw error
      toast?.(`✓ Fact #${id} supprimé`)
      navigate('/facts')
    } catch (err) {
      console.error(err)
      toast?.('Erreur suppression', 'error')
      setDeleting(false)
      setShowDeleteConfirm(false)
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-slate-800 rounded-2xl p-6 border border-red-700 w-96 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-2xl mb-2">🗑</div>
            <h3 className="text-lg font-black text-white mb-2">Supprimer ce fact ?</h3>
            <p className="text-slate-400 text-sm mb-1">
              Fact <span className="text-white font-mono">#{id}</span> — cette action est <span className="text-red-400 font-bold">irréversible</span>.
            </p>
            <p className="text-slate-500 text-xs mb-5 truncate">{fact.question}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-700 text-slate-300 text-sm font-bold hover:bg-slate-600 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={deleteFact}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-50"
                style={{ background: '#EF4444' }}
              >
                {deleting ? 'Suppression…' : '🗑 Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Link to="/facts" className="text-slate-400 hover:text-white transition-colors text-sm shrink-0">← Liste</Link>
          <span className="text-slate-600">/</span>
          <h1 className="text-lg sm:text-xl font-black text-white truncate">
            Fact #{id}
            {isDirty && <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,107,26,0.15)', color: '#FF6B1A' }}>modifié</span>}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {prevId && (
            <Link to={`/facts/${prevId}?${searchParams.toString()}`} className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:bg-slate-700 transition-all">
              ← #{prevId}
            </Link>
          )}
          {nextId && (
            <Link to={`/facts/${nextId}?${searchParams.toString()}`} className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:bg-slate-700 transition-all">
              #{nextId} →
            </Link>
          )}
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* COLONNE GAUCHE */}
        <div className="w-80 flex-shrink-0 space-y-4">
        {/* Warning bandeau si fausses réponses incomplètes */}
        {(() => {
          const wrongFields = ['funny_wrong_1', 'funny_wrong_2', 'close_wrong_1', 'close_wrong_2', 'plausible_wrong_1', 'plausible_wrong_2', 'plausible_wrong_3']
          const filled = wrongFields.filter(f => fact[f]?.trim()).length
          if (filled < 7) return (
            <div className="px-4 py-3 rounded-xl border border-amber-600/50 text-sm font-semibold" style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
              ⚠️ Ce f*ct est incomplet — ID #{fact.id}. Notez cet ID pour mise à jour manuelle.
            </div>
          )
          return null
        })()}

        {/* IDENTIFICATION */}
        <Section title="🆔 Identification">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">ID</label>
              <div className="px-3 py-2.5 rounded-xl bg-slate-900/50 border border-slate-700 text-slate-500 font-mono text-sm">
                {fact.id}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          {/* Mode de jeu toggle */}
          <div className="mt-3">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Mode de jeu</label>
            <div className="flex rounded-xl overflow-hidden border border-slate-700">
              <button
                onClick={() => { set('is_vip', true); set('type', 'vip') }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold transition-all"
                style={{
                  background: fact.is_vip ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'transparent',
                  color: fact.is_vip ? 'white' : '#9CA3AF',
                }}
              >
                <span>⭐</span> <span>⚔️ Quête WTF!</span>
              </button>
              <button
                onClick={() => { set('is_vip', false); set('type', 'generated') }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold transition-all"
                style={{
                  background: !fact.is_vip ? 'linear-gradient(135deg, #7C3AED, #5B21B6)' : 'transparent',
                  color: !fact.is_vip ? 'white' : '#9CA3AF',
                }}
              >
                <span>⚡</span> <span>Flash / Marathon</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              {fact.is_vip
                ? 'Disponible uniquement en mode Quête WTF!'
                : 'Disponible en Flash, Marathon, Blitz, Série'}
            </p>
          </div>
        </Section>

        {/* CONTENU */}
        <Section title="📝 Contenu">
          <Field
            label={`Question (100 max)${errors.question ? ' — ' + errors.question : ''}`}
            hint={<CharCounter value={fact.question} max={CHAR_LIMITS.question.max} />}
          >
            <textarea
              value={fact.question || ''}
              onChange={e => set('question', e.target.value)}
              rows={3}
              className={isOverLimit('question', fact.question) || errors.question ? inputClsOver : inputCls}
              placeholder="Affirmation à valider ou infirmer…"
              maxLength={120}
            />
          </Field>

          <Field
            label={`Réponse courte (50 max)${errors.short_answer ? ' — ' + errors.short_answer : ''}`}
            hint={<CharCounter value={fact.short_answer} max={CHAR_LIMITS.short_answer.max} />}
          >
            <input
              value={fact.short_answer || ''}
              onChange={e => set('short_answer', e.target.value)}
              className={isOverLimit('short_answer', fact.short_answer) || errors.short_answer ? inputClsOver : inputCls}
              placeholder="Réponse courte visible au joueur…"
              maxLength={55}
            />
          </Field>

          <Field
            label={`Explication (100-300)${errors.explanation ? ' — ' + errors.explanation : ''}`}
            hint={<CharCounter value={fact.explanation} max={CHAR_LIMITS.explanation.max} min={CHAR_LIMITS.explanation.min} />}
          >
            <textarea
              value={fact.explanation || ''}
              onChange={e => set('explanation', e.target.value)}
              rows={4}
              className={errors.explanation ? inputClsOver : inputCls}
              placeholder="Explication détaillée du fait…"
              maxLength={310}
            />
            {fact.explanation && fact.explanation.length < CHAR_LIMITS.explanation.min && (
              <p className="text-amber-400 text-xs mt-1">
                ⚠ Encore {CHAR_LIMITS.explanation.min - fact.explanation.length} caractère(s) minimum requis
              </p>
            )}
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

        </div>{/* END COLONNE GAUCHE */}

        {/* COLONNE DROITE — sticky */}
        <div className="flex-1 min-w-0 space-y-4 sticky top-4">
        {/* RÉPONSES (8 au total) */}
        <Section title="🎯 Réponses (8 au total)">
          {/* Vraie réponse — lecture seule */}
          <div className="mb-4 p-3 rounded-xl border border-green-800" style={{ background: '#14532d' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-green-300 uppercase tracking-wide">✅ Vraie réponse</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-900 text-green-300">Vraie réponse — toujours proposée au joueur</span>
            </div>
            <div className="px-3 py-2.5 rounded-xl bg-green-950/50 border border-green-800 text-green-100 text-sm font-semibold">
              {fact.short_answer || '—'}
            </div>
          </div>

          {/* Badge de complétion */}
          {(() => {
            const wrongFields = ['funny_wrong_1', 'funny_wrong_2', 'close_wrong_1', 'close_wrong_2', 'plausible_wrong_1', 'plausible_wrong_2', 'plausible_wrong_3']
            const filled = wrongFields.filter(f => fact[f]?.trim()).length
            const badgeColor = filled === 7 ? '#22C55E' : filled >= 4 ? '#F59E0B' : '#EF4444'
            const badgeBg = filled === 7 ? 'rgba(34,197,94,0.15)' : filled >= 4 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)'
            return (
              <div className="mb-4 flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: badgeBg, color: badgeColor }}>
                  {filled}/7 fausses réponses renseignées
                </span>
              </div>
            )
          })()}

          {/* 😂 Fausses drôles */}
          <div className="mb-4">
            <div className="text-xs font-bold text-slate-400 mb-2">😂 Fausses drôles</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Drôle 1" hint={<CharCounter value={fact.funny_wrong_1} max={50} />}>
                <input
                  value={fact.funny_wrong_1 || ''}
                  onChange={e => set('funny_wrong_1', e.target.value)}
                  className={(fact.funny_wrong_1 || '').length > 50 ? inputClsOver : inputCls}
                  placeholder="Une réponse absurde et marrante…"
                  maxLength={55}
                />
              </Field>
              <Field label="Drôle 2" hint={<CharCounter value={fact.funny_wrong_2} max={50} />}>
                <input
                  value={fact.funny_wrong_2 || ''}
                  onChange={e => set('funny_wrong_2', e.target.value)}
                  className={(fact.funny_wrong_2 || '').length > 50 ? inputClsOver : inputCls}
                  placeholder="Une réponse absurde et marrante…"
                  maxLength={55}
                />
              </Field>
            </div>
          </div>

          {/* 🎯 Fausses proches */}
          <div className="mb-4">
            <div className="text-xs font-bold text-slate-400 mb-2">🎯 Fausses proches</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Proche 1" hint={<CharCounter value={fact.close_wrong_1} max={50} />}>
                <input
                  value={fact.close_wrong_1 || ''}
                  onChange={e => set('close_wrong_1', e.target.value)}
                  className={(fact.close_wrong_1 || '').length > 50 ? inputClsOver : inputCls}
                  placeholder="Une réponse crédible mais fausse…"
                  maxLength={55}
                />
              </Field>
              <Field label="Proche 2" hint={<CharCounter value={fact.close_wrong_2} max={50} />}>
                <input
                  value={fact.close_wrong_2 || ''}
                  onChange={e => set('close_wrong_2', e.target.value)}
                  className={(fact.close_wrong_2 || '').length > 50 ? inputClsOver : inputCls}
                  placeholder="Une réponse crédible mais fausse…"
                  maxLength={55}
                />
              </Field>
            </div>
          </div>

          {/* 🤔 Fausses plausibles */}
          <div>
            <div className="text-xs font-bold text-slate-400 mb-2">🤔 Fausses plausibles</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Plausible 1" hint={<CharCounter value={fact.plausible_wrong_1} max={50} />}>
                <input
                  value={fact.plausible_wrong_1 || ''}
                  onChange={e => set('plausible_wrong_1', e.target.value)}
                  className={(fact.plausible_wrong_1 || '').length > 50 ? inputClsOver : inputCls}
                  placeholder="Une réponse qui semble logique…"
                  maxLength={55}
                />
              </Field>
              <Field label="Plausible 2" hint={<CharCounter value={fact.plausible_wrong_2} max={50} />}>
                <input
                  value={fact.plausible_wrong_2 || ''}
                  onChange={e => set('plausible_wrong_2', e.target.value)}
                  className={(fact.plausible_wrong_2 || '').length > 50 ? inputClsOver : inputCls}
                  placeholder="Une réponse qui semble logique…"
                  maxLength={55}
                />
              </Field>
              <Field label="Plausible 3" hint={<CharCounter value={fact.plausible_wrong_3} max={50} />}>
                <input
                  value={fact.plausible_wrong_3 || ''}
                  onChange={e => set('plausible_wrong_3', e.target.value)}
                  className={(fact.plausible_wrong_3 || '').length > 50 ? inputClsOver : inputCls}
                  placeholder="Une réponse qui semble logique…"
                  maxLength={55}
                />
              </Field>
            </div>
          </div>
        </Section>

        {/* INDICES (4 au total) */}
        <Section title="💡 Indices (4 au total)">
          <div className="grid grid-cols-2 gap-3">
            <Field
              label={`Indice 1 (20 max)${errors.hint1 ? ' — ' + errors.hint1 : ''}`}
              hint={<CharCounter value={fact.hint1} max={CHAR_LIMITS.hint1.max} />}
            >
              <input
                value={fact.hint1 || ''}
                onChange={e => set('hint1', e.target.value)}
                className={isOverLimit('hint1', fact.hint1) || errors.hint1 ? inputClsOver : inputCls}
                placeholder="Premier indice…"
                maxLength={25}
              />
            </Field>
            <Field
              label={`Indice 2 (20 max)${errors.hint2 ? ' — ' + errors.hint2 : ''}`}
              hint={<CharCounter value={fact.hint2} max={CHAR_LIMITS.hint2.max} />}
            >
              <input
                value={fact.hint2 || ''}
                onChange={e => set('hint2', e.target.value)}
                className={isOverLimit('hint2', fact.hint2) || errors.hint2 ? inputClsOver : inputCls}
                placeholder="Deuxième indice…"
                maxLength={25}
              />
            </Field>
            <Field label="Indice 3">
              <input
                value={fact.hint3 || ''}
                onChange={e => set('hint3', e.target.value)}
                className={inputCls}
                placeholder="Troisième indice…"
              />
            </Field>
            <Field label="Indice 4">
              <input
                value={fact.hint4 || ''}
                onChange={e => set('hint4', e.target.value)}
                className={inputCls}
                placeholder="Quatrième indice…"
              />
            </Field>
          </div>
        </Section>
        </div>{/* END COLONNE DROITE */}
      </div>{/* END FLEX 2 COLONNES */}

      <div className="space-y-4 mt-4">
        {/* STATUTS */}
        <Section title="⚙️ Statuts">
          <div className="space-y-4">
            <div className="p-4 rounded-xl border" style={{ background: fact.is_vip ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.03)', borderColor: fact.is_vip ? 'rgba(255,215,0,0.3)' : '#334155' }}>
              <Toggle
                on={fact.is_vip}
                onChange={v => set('is_vip', v)}
                label="⭐ Fact Quête — Récompense exclusive"
                color="#FFD700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Statut de publication</label>
              <div className="flex gap-2">
                {STATUSES.map(s => {
                  const active = fact.status === s.value
                  return (
                    <button
                      key={s.value}
                      onClick={() => set('status', s.value)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all"
                      style={{
                        background: active ? s.color : 'transparent',
                        color: active ? 'white' : s.color,
                        border: `2px solid ${s.color}`,
                      }}
                    >
                      <span>{s.icon}</span>
                      <span>{s.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {fact.is_vip && (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Usage Quête</label>
                <select
                  value={fact.vip_usage || 'available'}
                  onChange={e => set('vip_usage', e.target.value)}
                  className={inputCls}
                >
                  {VIP_USAGES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
                {fact.vip_usage === 'available' && (
                  <p className="text-amber-400 text-xs mt-1.5 font-semibold">
                    ⚠ Ce Fact Quête n'a pas d'usage assigné
                  </p>
                )}
              </div>
            )}
          </div>
        </Section>

        {/* IMAGE */}
        <Section title="🖼 Image">
          <Field label={`URL Image ${imageStatus === 'ok' ? '— ✓ Accessible' : imageStatus === 'error' ? '— ✕ Non accessible' : imageStatus === 'loading' ? '— vérification…' : ''}`}>
            <div className="flex gap-2">
              <input
                value={fact.image_url || ''}
                onChange={e => { set('image_url', e.target.value); checkImage(e.target.value) }}
                className={`${inputCls} flex-1`}
                placeholder="https://… ou /assets/facts/N.png"
              />
              <div className="flex items-center gap-2 shrink-0">
                {imageStatus === 'loading' && <span className="text-slate-400 text-sm animate-spin">⟳</span>}
                {imageStatus === 'ok' && <span className="text-green-400 text-sm">●</span>}
                {imageStatus === 'error' && <span className="text-red-400 text-sm">✕</span>}
                {/* Ouvrir l'URL résolue dans un onglet — utile pour diagnostiquer les 404 */}
                {fact.image_url && (
                  <a
                    href={resolveImageUrl(fact.image_url) ?? fact.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-2 rounded-xl bg-slate-700 text-slate-400 text-xs hover:text-white hover:bg-slate-600 transition-all shrink-0"
                    title={`Ouvrir: ${resolveImageUrl(fact.image_url) ?? fact.image_url}`}
                  >
                    🔗
                  </a>
                )}
                <label
                  className="cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-700 text-slate-200 text-xs font-bold hover:bg-slate-600 transition-all select-none"
                  title="Importer une image depuis votre disque"
                  style={{ opacity: imageUploading ? 0.5 : 1, pointerEvents: imageUploading ? 'none' : 'auto' }}
                >
                  {imageUploading ? <span className="animate-spin">⟳</span> : '📁'}
                  <span className="hidden sm:inline">{imageUploading ? 'Upload…' : 'Importer'}</span>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
              </div>
            </div>
            {/* Affiche l'URL résolue quand non accessible — aide au diagnostic */}
            {imageStatus === 'error' && fact.image_url && (
              <p className="text-red-400/70 text-xs mt-1.5 font-mono break-all">
                URL testée : {resolveImageUrl(fact.image_url) ?? fact.image_url}
              </p>
            )}
          </Field>
          {fact.image_url && (
            <div
              className="mt-3 rounded-xl overflow-hidden border border-slate-700 bg-slate-900/80 mx-auto flex items-center justify-center"
              style={{ width: '100%', maxWidth: 280, aspectRatio: '1 / 1' }}
            >
              <img
                src={resolveImageUrl(fact.image_url)}
                alt="aperçu"
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                onLoad={() => setImageStatus('ok')}
                onError={() => setImageStatus('error')}
              />
            </div>
          )}
        </Section>

        {/* APERÇU EN JEU — synchronisé en temps réel avec le formulaire */}
        <FactPreviewStandalone fact={fact} />

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
                        <td className="py-1.5 pr-4 font-mono" style={{ color: '#FF6B1A' }}>{h.field_name}</td>
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
        <div className="flex gap-3 pt-2 pb-8 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-5 py-3.5 rounded-2xl font-black text-sm text-red-400 bg-red-900/20 border border-red-800/40 hover:bg-red-900/40 transition-all"
          >
            🗑 Supprimer
          </button>
          <button
            onClick={enrichFact}
            disabled={enriching || !fact.question || !fact.short_answer}
            className="px-5 py-3.5 rounded-2xl font-black text-sm text-white transition-all disabled:opacity-40 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}
          >
            {enriching ? '⟳ Enrichissement…' : '🧠 Enrichir ce f*ct'}
          </button>
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
            {saving ? 'Sauvegarde…' : isDirty ? 'Enregistrer ✓' : 'Aucune modification'}
          </button>
        </div>
      </div>
    </div>
  )
}
