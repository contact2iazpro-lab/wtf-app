/**
 * FactMobileEditorPage — éditeur mobile inline d'un fact.
 *
 * Layout calqué sur QuestionScreen du jeu (tailles réelles) :
 * - Sticky top : Question + Réponse vraie (toujours visibles)
 * - Scroll : 7 autres réponses (grid 2 col) → 4 indices (grid 2 col)
 *           → Le saviez-vous → 3 affirmations
 * - Compteur N/X sous chaque champ (rouge si dépasse)
 * - Bouton flottant Sauvegarder bas-droite
 *
 * Objectif : permettre à l'admin de vérifier si les textes dépassent l'UI
 * du jeu directement dans l'éditeur.
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
  question: 100,
  short_answer: 50,
  hint1: 20, hint2: 20, hint3: 20, hint4: 20,
  funny_wrong_1: 50, funny_wrong_2: 50,
  close_wrong_1: 50, close_wrong_2: 50,
  plausible_wrong_1: 50, plausible_wrong_2: 50, plausible_wrong_3: 50,
  explanation_min: 100, explanation_max: 300,
  statement_true: 140, statement_false_funny: 140, statement_false_plausible: 140,
}

// Couleurs des 4 types (source : QuestionScreen dev mode)
const COLOR_VRAIE     = '#22C55E'
const COLOR_DROLE     = '#EAB308'
const COLOR_PROCHE    = '#F97316'
const COLOR_PLAUSIBLE = '#EF4444'

// Les 7 mauvaises réponses (toutes sauf short_answer) avec couleur
const WRONG_ANSWERS = [
  { key: 'funny_wrong_1',      color: COLOR_DROLE },
  { key: 'funny_wrong_2',      color: COLOR_DROLE },
  { key: 'close_wrong_1',      color: COLOR_PROCHE },
  { key: 'close_wrong_2',      color: COLOR_PROCHE },
  { key: 'plausible_wrong_1',  color: COLOR_PLAUSIBLE },
  { key: 'plausible_wrong_2',  color: COLOR_PLAUSIBLE },
  { key: 'plausible_wrong_3',  color: COLOR_PLAUSIBLE },
]

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

// ── Compteur N/X (rouge si dépasse) ─────────────────────────────────────
function CharCounter({ value, max, min = null }) {
  const len = (value || '').length
  const tooLong = len > max
  const tooShort = min != null && len > 0 && len < min
  const bad = tooLong || tooShort
  return (
    <span style={{
      fontSize: 9, fontWeight: 800,
      color: bad ? '#EF4444' : 'rgba(255,255,255,0.5)',
      letterSpacing: '0.03em',
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
        funny_wrong_1: fact.funny_wrong_1, funny_wrong_2: fact.funny_wrong_2,
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
  // Couleur opaque pour sticky (évite transparence sur scroll)
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

          {/* Question — taille jeu : fontSize 15, weight 800, center, bg noir translucide */}
          <div style={{ marginBottom: 8 }}>
            <AutoTextarea
              value={fact.question}
              onChange={v => set('question', v)}
              placeholder="Question du fact…"
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.35)',
                color: '#ffffff',
                border: '1.5px solid rgba(255,255,255,0.18)',
                borderRadius: 10,
                padding: '8px 10px',
                fontSize: 15,
                fontWeight: 800,
                lineHeight: 1.4,
                textAlign: 'center',
                outline: 'none',
                backdropFilter: 'blur(8px)',
              }}
              minHeight={44}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2, paddingLeft: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Question
              </span>
              <CharCounter value={fact.question} max={LIMITS.question} />
            </div>
          </div>

          {/* Vraie réponse — juste après la question, contour vert */}
          <div>
            <AutoTextarea
              value={fact.short_answer}
              onChange={v => set('short_answer', v)}
              placeholder="Vraie réponse…"
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.15)',
                color: '#ffffff',
                border: `3px solid ${COLOR_VRAIE}`,
                borderRadius: 12,
                padding: '8px 10px',
                fontSize: 13,
                fontWeight: 700,
                lineHeight: 1.2,
                textAlign: 'center',
                outline: 'none',
              }}
              minHeight={50}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2, paddingLeft: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 900, color: COLOR_VRAIE, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Vraie
              </span>
              <CharCounter value={fact.short_answer} max={LIMITS.short_answer} />
            </div>
          </div>
        </div>

        {/* ══ SCROLL : 7 autres réponses → indices → Le saviez-vous → affirmations ══ */}
        <div style={{ padding: '10px' }}>

          {/* ── 7 autres réponses — grid 2 col, taille jeu (btnH 50, fontSize 11) ── */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
              Mauvaises réponses (7)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
              {WRONG_ANSWERS.map(({ key, color }) => (
                <div key={key}>
                  <AutoTextarea
                    value={fact[key]}
                    onChange={v => set(key, v)}
                    placeholder="—"
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.15)',
                      color: '#ffffff',
                      border: `3px solid ${color}`,
                      borderRadius: 12,
                      padding: '4px 6px',
                      fontSize: 11,
                      fontWeight: 700,
                      lineHeight: 1.2,
                      textAlign: 'center',
                      outline: 'none',
                    }}
                    minHeight={50}
                  />
                  <div style={{ textAlign: 'right', marginTop: 2, paddingRight: 2 }}>
                    <CharCounter value={fact[key]} max={LIMITS[key]} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 4 Indices — grille 2 col, taille jeu (height 28, fontSize 10) ── */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
              Indices (4)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[1, 2, 3, 4].map(n => {
                const key = `hint${n}`
                return (
                  <div key={n}>
                    <AutoTextarea
                      value={fact[key]}
                      onChange={v => set(key, v)}
                      placeholder={`Indice ${n}`}
                      style={{
                        width: '100%',
                        height: 28,
                        background: 'rgba(235,235,235,0.95)',
                        color: '#1a1a2e',
                        border: `2px solid ${categoryColor}`,
                        borderRadius: 14,
                        padding: '2px 8px',
                        fontSize: 10,
                        fontWeight: 800,
                        lineHeight: 1,
                        textAlign: 'center',
                        outline: 'none',
                        overflow: 'hidden',
                      }}
                      minHeight={28}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2, paddingLeft: 2 }}>
                      <span style={{ fontSize: 8, fontWeight: 900, color: 'rgba(255,255,255,0.5)' }}>#{n}</span>
                      <CharCounter value={fact[key]} max={LIMITS[key]} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Le saviez-vous (explanation) ────────────────────────────── */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
              Le saviez-vous ?
            </div>
            <AutoTextarea
              value={fact.explanation}
              onChange={v => set('explanation', v)}
              placeholder="Explication du fact…"
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.35)',
                color: '#ffffff',
                border: '1.5px solid rgba(255,255,255,0.25)',
                borderRadius: 10,
                padding: '8px 10px',
                fontSize: 12,
                fontWeight: 500,
                lineHeight: 1.45,
                outline: 'none',
              }}
              minHeight={80}
            />
            <div style={{ textAlign: 'right', marginTop: 2 }}>
              <CharCounter value={fact.explanation} max={LIMITS.explanation_max} min={LIMITS.explanation_min} />
            </div>
          </div>

          {/* ── 3 Affirmations (Vrai ou Fou) ─────────────────────────────── */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
              Affirmations — Vrai ou Fou
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { key: 'statement_true',              color: COLOR_VRAIE,     label: 'VRAIE' },
                { key: 'statement_false_funny',       color: COLOR_DROLE,     label: 'FAUSSE DRÔLE' },
                { key: 'statement_false_plausible',   color: COLOR_PLAUSIBLE, label: 'FAUSSE PLAUSIBLE' },
              ].map(s => (
                <div key={s.key}>
                  <AutoTextarea
                    value={fact[s.key]}
                    onChange={v => set(s.key, v)}
                    placeholder={s.label.toLowerCase()}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.35)',
                      color: '#ffffff',
                      border: `2.5px solid ${s.color}`,
                      borderRadius: 10,
                      padding: '8px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      lineHeight: 1.3,
                      outline: 'none',
                    }}
                    minHeight={44}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2, paddingLeft: 2 }}>
                    <span style={{ fontSize: 8, fontWeight: 900, color: s.color, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {s.label}
                    </span>
                    <CharCounter value={fact[s.key]} max={LIMITS[s.key]} />
                  </div>
                </div>
              ))}
            </div>
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
