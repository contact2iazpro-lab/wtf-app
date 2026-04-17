/**
 * FactMobileEditorPage — éditeur mobile inline d'un fact.
 *
 * Calqué sur QuestionScreen du jeu (tailles réelles) pour vérifier le débord UI.
 * - Sticky top : Question + Réponse vraie
 * - Scroll : 7+1 autres réponses (grid 2 col) → 4 indices (grid 2 col) → 3 affirmations → Le saviez-vous
 * - Compteur N/X positionné en bas-droite DANS le cadre
 * - Fond rouge si champ invalide (dépasse max ou manquant sous min ou vide obligatoire)
 * - Pas de titres de section (devinés par le layout)
 * - Texte centré vertical + horizontal (vraie/fausses/indices)
 * - Bouton flottant Sauvegarder bas-droite
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

// Limites de caractères (source : admin-tool FactEditorPage + spec jeu)
const LIMITS = {
  question: { max: 100, required: true },
  short_answer: { max: 50, required: true },
  hint1: { max: 20, required: true },
  hint2: { max: 20, required: true },
  hint3: { max: 20, required: false },
  hint4: { max: 20, required: false },
  funny_wrong_1: { max: 50, required: true },
  funny_wrong_2: { max: 50, required: true },
  funny_wrong_3: { max: 50, required: true },
  close_wrong_1: { max: 50, required: true },
  close_wrong_2: { max: 50, required: true },
  plausible_wrong_1: { max: 50, required: true },
  plausible_wrong_2: { max: 50, required: true },
  plausible_wrong_3: { max: 50, required: true },
  explanation: { min: 100, max: 300, required: true },
  statement_true: { max: 140, required: false },
  statement_false_funny: { max: 140, required: false },
  statement_false_plausible: { max: 140, required: false },
}

function isFieldInvalid(value, key) {
  const lim = LIMITS[key]
  if (!lim) return false
  const v = value || ''
  const len = v.length
  if (lim.required && len === 0) return true
  if (lim.max && len > lim.max) return true
  if (lim.min && len > 0 && len < lim.min) return true
  return false
}

// Couleurs des 4 types (source : QuestionScreen dev mode)
const COLOR_VRAIE     = '#22C55E'
const COLOR_DROLE     = '#EAB308'
const COLOR_PROCHE    = '#F97316'
const COLOR_PLAUSIBLE = '#EF4444'

// Les 8 mauvaises réponses (hors short_answer) avec couleur
const WRONG_ANSWERS = [
  { key: 'funny_wrong_1',      color: COLOR_DROLE },
  { key: 'funny_wrong_2',      color: COLOR_DROLE },
  { key: 'funny_wrong_3',      color: COLOR_DROLE },
  { key: 'close_wrong_1',      color: COLOR_PROCHE },
  { key: 'close_wrong_2',      color: COLOR_PROCHE },
  { key: 'plausible_wrong_1',  color: COLOR_PLAUSIBLE },
  { key: 'plausible_wrong_2',  color: COLOR_PLAUSIBLE },
  { key: 'plausible_wrong_3',  color: COLOR_PLAUSIBLE },
]

// Fond rouge (invalide) — teinté sombre, gardé lisible
const INVALID_BG = 'rgba(239,68,68,0.35)'

// ── Auto-resize textarea ────────────────────────────────────────────────
function AutoTextarea({ value, onChange, placeholder, style, minHeight = null, ...rest }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    const h = minHeight ? Math.max(el.scrollHeight, minHeight) : el.scrollHeight
    el.style.height = h + 'px'
  }, [value, minHeight])
  return (
    <textarea
      ref={ref}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        resize: 'none',
        overflow: 'hidden',
        fontFamily: 'Nunito, sans-serif',
        display: 'block',
        ...style,
      }}
      {...rest}
    />
  )
}

// ── Compteur overlay (bas-droite DANS le cadre) ─────────────────────────
function OverlayCounter({ value, max, min = null, color = 'rgba(255,255,255,0.55)', dark = false }) {
  const len = (value || '').length
  const tooLong = len > max
  const tooShort = min != null && len > 0 && len < min
  const bad = tooLong || tooShort
  const textColor = bad ? '#EF4444' : (dark ? 'rgba(0,0,0,0.55)' : color)
  return (
    <span style={{
      position: 'absolute', right: 4, bottom: 2, zIndex: 2,
      fontSize: 9, fontWeight: 800, lineHeight: 1,
      letterSpacing: '0.02em',
      color: textColor,
      pointerEvents: 'none',
      textShadow: dark ? 'none' : '0 1px 2px rgba(0,0,0,0.5)',
    }}>
      {len}/{min != null ? `${min}-${max}` : max}
    </span>
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
        funny_wrong_1: fact.funny_wrong_1, funny_wrong_2: fact.funny_wrong_2, funny_wrong_3: fact.funny_wrong_3,
        close_wrong_1: fact.close_wrong_1, close_wrong_2: fact.close_wrong_2,
        plausible_wrong_1: fact.plausible_wrong_1, plausible_wrong_2: fact.plausible_wrong_2, plausible_wrong_3: fact.plausible_wrong_3,
        explanation: fact.explanation,
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
  const stickyBg = categoryColor

  // ══════════════════════════════════════════════════════════════════════
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#0f172a',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div
        style={{
          maxWidth: 420,
          margin: '0 auto',
          background: bg,
          minHeight: '100%',
          color: '#ffffff',
          fontFamily: 'Nunito, sans-serif',
          paddingBottom: 100,
          position: 'relative',
        }}
      >
        {/* ══ STICKY TOP : Header + Question + Vraie ══════════════════════ */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: stickyBg,
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          padding: '8px 10px 10px',
        }}>
          {/* Header : retour + id + cat + vip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'rgba(0,0,0,0.35)', border: '1.5px solid rgba(255,255,255,0.35)',
                color: '#fff', fontSize: 14, fontWeight: 900, cursor: 'pointer', flexShrink: 0,
              }}
            >
              ←
            </button>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 11, fontWeight: 900, color: textOnCat, letterSpacing: '0.02em',
            }}>
              <span>#{fact.id}</span>
              <span style={{ opacity: 0.6 }}>·</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {cat?.label || fact.category || '—'}
              </span>
              {fact.is_vip && <span style={{ marginLeft: 4 }}>⭐</span>}
            </div>
          </div>

          {/* Question — taille jeu : fontSize 15, weight 800, center */}
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <AutoTextarea
              value={fact.question}
              onChange={v => set('question', v)}
              placeholder="Question…"
              style={{
                width: '100%',
                background: isFieldInvalid(fact.question, 'question') ? INVALID_BG : 'rgba(0,0,0,0.35)',
                color: '#ffffff',
                border: '1.5px solid rgba(255,255,255,0.18)',
                borderRadius: 10,
                padding: '10px 32px 14px 10px',
                fontSize: 15,
                fontWeight: 800,
                lineHeight: 1.4,
                textAlign: 'center',
                outline: 'none',
                backdropFilter: 'blur(8px)',
              }}
              minHeight={44}
            />
            <OverlayCounter value={fact.question} max={LIMITS.question.max} />
          </div>

          {/* Vraie réponse — contour vert, centré */}
          <div style={{ position: 'relative' }}>
            <AutoTextarea
              value={fact.short_answer}
              onChange={v => set('short_answer', v)}
              placeholder="Vraie réponse…"
              style={{
                width: '100%',
                background: isFieldInvalid(fact.short_answer, 'short_answer') ? INVALID_BG : 'rgba(255,255,255,0.15)',
                color: '#ffffff',
                border: `3px solid ${COLOR_VRAIE}`,
                borderRadius: 12,
                padding: '8px 32px 14px 10px',
                fontSize: 13,
                fontWeight: 700,
                lineHeight: 1.2,
                textAlign: 'center',
                outline: 'none',
              }}
              minHeight={50}
            />
            <OverlayCounter value={fact.short_answer} max={LIMITS.short_answer.max} />
          </div>
        </div>

        {/* ══ SCROLL : 8 autres réponses → 4 indices → affirmations → saviez-vous ══ */}
        <div style={{ padding: '10px' }}>

          {/* ── 8 autres réponses — grid 2 col, taille jeu (50h, 11px, centré) ── */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
              {WRONG_ANSWERS.map(({ key, color }) => {
                const invalid = isFieldInvalid(fact[key], key)
                return (
                  <div key={key} style={{ position: 'relative' }}>
                    <AutoTextarea
                      value={fact[key]}
                      onChange={v => set(key, v)}
                      placeholder="—"
                      style={{
                        width: '100%',
                        background: invalid ? INVALID_BG : 'rgba(255,255,255,0.15)',
                        color: '#ffffff',
                        border: `3px solid ${color}`,
                        borderRadius: 12,
                        padding: '4px 24px 12px 6px',
                        fontSize: 11,
                        fontWeight: 700,
                        lineHeight: 1.2,
                        textAlign: 'center',
                        outline: 'none',
                      }}
                      minHeight={50}
                    />
                    <OverlayCounter value={fact[key]} max={LIMITS[key].max} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── 4 Indices — grille 2 col, taille jeu (28h, fond blanc, centré) ── */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[1, 2, 3, 4].map(n => {
                const key = `hint${n}`
                const invalid = isFieldInvalid(fact[key], key)
                return (
                  <div key={n} style={{ position: 'relative' }}>
                    <AutoTextarea
                      value={fact[key]}
                      onChange={v => set(key, v)}
                      placeholder={`Indice ${n}`}
                      style={{
                        width: '100%',
                        background: invalid ? INVALID_BG : 'rgba(235,235,235,0.95)',
                        color: invalid ? '#ffffff' : '#1a1a2e',
                        border: `2px solid ${categoryColor}`,
                        borderRadius: 14,
                        padding: '2px 24px 8px 8px',
                        fontSize: 10,
                        fontWeight: 800,
                        lineHeight: 1,
                        textAlign: 'center',
                        outline: 'none',
                        overflow: 'hidden',
                      }}
                      minHeight={28}
                    />
                    <OverlayCounter value={fact[key]} max={LIMITS[key].max} dark={!invalid} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── 3 Affirmations ────────────────────────────────────────── */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { key: 'statement_true',              color: COLOR_VRAIE },
                { key: 'statement_false_funny',       color: COLOR_DROLE },
                { key: 'statement_false_plausible',   color: COLOR_PLAUSIBLE },
              ].map(s => {
                const invalid = isFieldInvalid(fact[s.key], s.key)
                return (
                  <div key={s.key} style={{ position: 'relative' }}>
                    <AutoTextarea
                      value={fact[s.key]}
                      onChange={v => set(s.key, v)}
                      placeholder="—"
                      style={{
                        width: '100%',
                        background: invalid ? INVALID_BG : 'rgba(0,0,0,0.35)',
                        color: '#ffffff',
                        border: `2.5px solid ${s.color}`,
                        borderRadius: 10,
                        padding: '8px 32px 14px 10px',
                        fontSize: 12,
                        fontWeight: 600,
                        lineHeight: 1.3,
                        outline: 'none',
                      }}
                      minHeight={44}
                    />
                    <OverlayCounter value={fact[s.key]} max={LIMITS[s.key].max} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Le saviez-vous (explanation) — en TOUT FIN ────────────── */}
          <div style={{ marginBottom: 12, position: 'relative' }}>
            <AutoTextarea
              value={fact.explanation}
              onChange={v => set('explanation', v)}
              placeholder="Le saviez-vous…"
              style={{
                width: '100%',
                background: isFieldInvalid(fact.explanation, 'explanation') ? INVALID_BG : 'rgba(0,0,0,0.35)',
                color: '#ffffff',
                border: '1.5px solid rgba(255,255,255,0.25)',
                borderRadius: 10,
                padding: '8px 10px 18px',
                fontSize: 12,
                fontWeight: 500,
                lineHeight: 1.45,
                outline: 'none',
              }}
              minHeight={80}
            />
            <OverlayCounter value={fact.explanation} max={LIMITS.explanation.max} min={LIMITS.explanation.min} />
          </div>

        </div>{/* end scroll */}

        {/* ══ FAB Sauvegarder (fixed bas-droite) ══════════════════════ */}
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
