/**
 * FactMobileEditorPage — éditeur mobile inline d'un fact.
 *
 * Layout QuestionScreen (style Race) avec tous les champs en inputs/textareas
 * éditables directement. Bouton Sauvegarder flottant en bas-droite.
 *
 * Champs affichés :
 *   1 question
 *   4 indices (grille 2×2)
 *   8 réponses (code couleur par type)
 *   3 affirmations (statements)
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CATEGORIES } from '../constants/categories'

const isLightColor = (hex) => {
  if (!hex) return false
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 160
}

// Couleurs des 4 types de réponses
const ANSWER_COLORS = {
  true:      { bg: '#22c55e', label: 'VRAIE' },
  funny:     { bg: '#a855f7', label: 'DRÔLE' },
  close:     { bg: '#f97316', label: 'PROCHE' },
  plausible: { bg: '#3b82f6', label: 'PLAUSIBLE' },
}

// Les 8 champs de réponse avec leur type
const ANSWER_FIELDS = [
  { key: 'short_answer',       type: 'true' },
  { key: 'funny_wrong_1',      type: 'funny' },
  { key: 'funny_wrong_2',      type: 'funny' },
  { key: 'close_wrong_1',      type: 'close' },
  { key: 'close_wrong_2',      type: 'close' },
  { key: 'plausible_wrong_1',  type: 'plausible' },
  { key: 'plausible_wrong_2',  type: 'plausible' },
  { key: 'plausible_wrong_3',  type: 'plausible' },
]

// ── Auto-resize textarea ────────────────────────────────────────────────
function AutoTextarea({ value, onChange, placeholder, style, minRows = 1, ...rest }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [value])
  return (
    <textarea
      ref={ref}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={minRows}
      style={{
        resize: 'none',
        overflow: 'hidden',
        fontFamily: 'inherit',
        ...style,
      }}
      {...rest}
    />
  )
}

// ── Bloc labelled (titre + contenu) ─────────────────────────────────────
function Field({ label, color = '#94a3b8', children, style }) {
  return (
    <div style={style}>
      <div style={{
        fontSize: 9, fontWeight: 900, color, textTransform: 'uppercase',
        letterSpacing: '0.08em', marginBottom: 3,
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
export default function FactMobileEditorPage({ toast }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [fact, setFact] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  // ── Load ────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('facts').select('*').eq('id', id).single()
      if (error) throw error
      setFact(data)
      setDirty(false)
    } catch (err) {
      console.error(err)
      toast?.('Erreur chargement', 'error')
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => { load() }, [load])

  const set = (field, value) => {
    setFact(prev => ({ ...prev, [field]: value }))
    setDirty(true)
  }

  // ── Save ────────────────────────────────────────────────────────────
  async function save() {
    if (!fact || saving) return
    setSaving(true)
    try {
      const payload = {
        question: fact.question,
        hint1: fact.hint1, hint2: fact.hint2, hint3: fact.hint3, hint4: fact.hint4,
        short_answer: fact.short_answer,
        funny_wrong_1: fact.funny_wrong_1, funny_wrong_2: fact.funny_wrong_2,
        close_wrong_1: fact.close_wrong_1, close_wrong_2: fact.close_wrong_2,
        plausible_wrong_1: fact.plausible_wrong_1, plausible_wrong_2: fact.plausible_wrong_2, plausible_wrong_3: fact.plausible_wrong_3,
        statement_true: fact.statement_true,
        statement_false_funny: fact.statement_false_funny,
        statement_false_plausible: fact.statement_false_plausible,
        updated_at: new Date().toISOString(),
      }
      const { error } = await supabase.from('facts').update(payload).eq('id', id)
      if (error) throw error
      toast?.(`✓ Fact #${id} sauvegardé`)
      setDirty(false)
    } catch (err) {
      console.error(err)
      toast?.('Erreur sauvegarde', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Loading / not found ─────────────────────────────────────────────
  if (loading) return (
    <div className="p-8 text-center text-slate-400">Chargement...</div>
  )
  if (!fact) return (
    <div className="p-8 text-center text-slate-400">Fact introuvable</div>
  )

  // ── Derived ─────────────────────────────────────────────────────────
  const cat = CATEGORIES.find(c => c.id === fact.category)
  const categoryColor = cat?.color || '#FF6B1A'
  const textOnCat = isLightColor(categoryColor) ? '#1a1a1a' : '#ffffff'
  const bg = `linear-gradient(160deg, ${categoryColor}22, ${categoryColor})`

  // Styles communs inputs (fond sombre + texte blanc, look QuestionScreen Race)
  const inputBase = {
    width: '100%',
    background: 'rgba(0,0,0,0.35)',
    color: '#ffffff',
    border: '1.5px solid rgba(255,255,255,0.18)',
    borderRadius: 10,
    padding: '8px 10px',
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.35,
    outline: 'none',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  }

  return (
    <div className="min-h-full flex justify-center" style={{ background: '#0f172a' }}>
      <div
        className="w-full"
        style={{
          maxWidth: 420,
          background: bg,
          padding: '12px 12px 96px',
          minHeight: '100vh',
          color: '#ffffff',
          fontFamily: 'Nunito, sans-serif',
        }}
      >
        {/* ── Header : retour + catégorie + id ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'rgba(0,0,0,0.35)', border: '1.5px solid rgba(255,255,255,0.25)',
              color: '#fff', fontSize: 16, fontWeight: 900, cursor: 'pointer',
            }}
          >
            ←
          </button>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 10px', borderRadius: 8,
            background: categoryColor, color: textOnCat,
            fontWeight: 900, fontSize: 12, letterSpacing: '0.03em',
          }}>
            <span>#{fact.id}</span>
            <span style={{ opacity: 0.6 }}>·</span>
            <span>{cat?.label || fact.category || '—'}</span>
            {fact.is_vip && <span style={{ marginLeft: 'auto' }}>⭐</span>}
          </div>
        </div>

        {/* ── Question ─────────────────────────────────────────────── */}
        <Field label="Question" color="rgba(255,255,255,0.75)" style={{ marginBottom: 12 }}>
          <AutoTextarea
            value={fact.question}
            onChange={v => set('question', v)}
            placeholder="Question du fact…"
            minRows={2}
            style={{ ...inputBase, fontSize: 14, fontWeight: 800 }}
          />
        </Field>

        {/* ── 4 Indices — grille 2×2 ──────────────────────────────── */}
        <Field label="Indices (1 à 4)" color="rgba(255,255,255,0.75)" style={{ marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[1, 2, 3, 4].map(n => (
              <div key={n} style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', top: 4, right: 6, zIndex: 1,
                  fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.5)',
                }}>
                  {n}
                </span>
                <AutoTextarea
                  value={fact[`hint${n}`]}
                  onChange={v => set(`hint${n}`, v)}
                  placeholder={`Indice ${n}`}
                  minRows={1}
                  style={{ ...inputBase, fontSize: 12, paddingRight: 22 }}
                />
              </div>
            ))}
          </div>
        </Field>

        {/* ── 8 Réponses — code couleur par type ──────────────────── */}
        <Field label="Réponses (8)" color="rgba(255,255,255,0.75)" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ANSWER_FIELDS.map(({ key, type }) => {
              const c = ANSWER_COLORS[type]
              return (
                <div key={key} style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
                  <div style={{
                    width: 70, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: c.bg, borderRadius: 10, padding: '0 6px',
                    color: isLightColor(c.bg) ? '#1a1a1a' : '#ffffff',
                    fontSize: 9, fontWeight: 900, letterSpacing: '0.04em',
                  }}>
                    {c.label}
                  </div>
                  <AutoTextarea
                    value={fact[key]}
                    onChange={v => set(key, v)}
                    placeholder={c.label.toLowerCase()}
                    minRows={1}
                    style={{
                      ...inputBase,
                      flex: 1,
                      borderColor: `${c.bg}88`,
                      background: `${c.bg}14`,
                    }}
                  />
                </div>
              )
            })}
          </div>
        </Field>

        {/* ── 3 Affirmations ─────────────────────────────────────── */}
        <Field label="Affirmations (Vrai ou Fou)" color="rgba(255,255,255,0.75)" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { key: 'statement_true',              label: 'VRAIE',    color: '#22c55e' },
              { key: 'statement_false_funny',       label: 'F. DRÔLE', color: '#a855f7' },
              { key: 'statement_false_plausible',   label: 'F. PLAUS.', color: '#3b82f6' },
            ].map(s => (
              <div key={s.key} style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
                <div style={{
                  width: 70, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: s.color, borderRadius: 10, padding: '0 6px',
                  color: isLightColor(s.color) ? '#1a1a1a' : '#ffffff',
                  fontSize: 9, fontWeight: 900, letterSpacing: '0.04em', textAlign: 'center', lineHeight: 1.1,
                }}>
                  {s.label}
                </div>
                <AutoTextarea
                  value={fact[s.key]}
                  onChange={v => set(s.key, v)}
                  placeholder={s.label.toLowerCase()}
                  minRows={1}
                  style={{
                    ...inputBase,
                    flex: 1,
                    borderColor: `${s.color}88`,
                    background: `${s.color}14`,
                  }}
                />
              </div>
            ))}
          </div>
        </Field>

        {/* ── FAB Sauvegarder (bas-droite) ────────────────────────── */}
        <button
          onClick={save}
          disabled={saving || !dirty}
          style={{
            position: 'fixed', bottom: 16, right: 16, zIndex: 50,
            padding: '14px 22px', borderRadius: 999, border: 'none',
            background: dirty ? '#FF6B1A' : '#475569',
            color: '#fff', fontWeight: 900, fontSize: 14,
            cursor: saving || !dirty ? 'default' : 'pointer',
            boxShadow: dirty ? '0 10px 30px rgba(255,107,26,0.5)' : '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', gap: 6,
            opacity: saving ? 0.6 : 1,
            transition: 'all 0.15s',
          }}
        >
          {saving ? '⟳ Sauvegarde…' : dirty ? '💾 Sauvegarder' : '✓ À jour'}
        </button>
      </div>
    </div>
  )
}
