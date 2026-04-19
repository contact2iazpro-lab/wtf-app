/**
 * FactMobileEditorPage — éditeur mobile inline d'un fact.
 *
 * Calqué sur QuestionScreen du jeu (tailles réelles).
 * - Sticky top : Question + Vraie réponse
 * - Scroll : 8 autres réponses (grid 2) → 4 indices (grid 2) → 3 affirmations → Le saviez-vous
 * - Cellule ROUGE VIF si champ invalide (pas de compteur N/X)
 * - Contenu centré horizontal + vertical dans chaque cadre
 * - Pas de titres de section
 * - FAB Sauvegarder bas-droite
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CATEGORIES } from '../constants/categories'
import FactImageGenerator from '../components/FactImageGenerator'
import { callEdgeFunction } from '../utils/helpers'
import { generateStatementsForFact } from '../lib/generateStatements'

const isLightColor = (hex) => {
  if (!hex) return false
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 160
}

// Limites de caractères (validation → fond rouge si non conforme)
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

// Les 8 mauvaises réponses (hors short_answer)
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

// Rouge vif — fond si champ invalide
const INVALID_BG = 'rgba(239,68,68,0.65)'

// ── Auto-resize textarea, centrée dans un wrapper flex ──────────────────
function CenteredTextarea({ value, onChange, placeholder, bg, border, color, fontSize, fontWeight, lineHeight = 1.3, minHeight, borderRadius = 12, padding = '6px 8px' }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [value])
  return (
    <div style={{
      width: '100%', minHeight,
      background: bg,
      border,
      borderRadius,
      padding,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
    }}>
      <textarea
        ref={ref}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={1}
        style={{
          width: '100%',
          background: 'transparent',
          color,
          border: 'none',
          outline: 'none',
          resize: 'none',
          overflow: 'hidden',
          fontFamily: 'Nunito, sans-serif',
          fontSize,
          fontWeight,
          lineHeight,
          textAlign: 'center',
          padding: 0,
          margin: 0,
          display: 'block',
        }}
      />
    </div>
  )
}

// ── Mini-header de section : label + bouton régénérer (solo, IA) ───────
function SectionHeader({ label, onClick, loading, textColor }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 6, paddingLeft: 2,
    }}>
      <span style={{
        fontSize: 10, fontWeight: 900, letterSpacing: '0.05em',
        textTransform: 'uppercase', color: textColor, opacity: 0.7,
      }}>
        {label}
      </span>
      <button
        onClick={onClick}
        disabled={loading}
        title={`Régénérer ${label.toLowerCase()} via IA`}
        style={{
          height: 22, padding: '0 8px', borderRadius: 6,
          background: loading ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,255,255,0.35)',
          color: '#fff', fontSize: 10, fontWeight: 800,
          cursor: loading ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 4,
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? '⟳ Génération…' : '✨ Régénérer'}
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
export default function FactMobileEditorPage({ toast }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [fact, setFact] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [prevId, setPrevId] = useState(null)
  const [nextId, setNextId] = useState(null)
  const [zoomOpen, setZoomOpen] = useState(false)
  const [genHintsLoading, setGenHintsLoading] = useState(false)
  const [genAnswersLoading, setGenAnswersLoading] = useState(false)
  const [genStatementsLoading, setGenStatementsLoading] = useState(false)

  // ── Load ────────────────────────────────────────────────────────────
  // Calque le pattern de FactEditorPage : applique les mêmes filtres URL
  // (categories, vip, status, pack, image) pour que prev/next navigue au sein
  // de la liste filtrée.
  const load = useCallback(async () => {
    setLoading(true)
    try {
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
      ] = await Promise.all([
        supabase.from('facts').select('*').eq('id', id).single(),
        prevQ,
        nextQ,
      ])
      if (error) throw error
      setFact(data)
      setPrevId(prevData?.[0]?.id ?? null)
      setNextId(nextData?.[0]?.id ?? null)
      setDirty(false)
    } catch (err) {
      console.error(err)
      toast?.('Erreur chargement', 'error')
    } finally {
      setLoading(false)
    }
  }, [id, toast, searchParams])

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
        category: fact.category,
        is_vip: !!fact.is_vip,
        type: fact.is_vip ? 'vip' : 'generated',
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

  // ── Régénération solo : indices (complete-hints chirurgical) ───────
  async function regenHints() {
    if (genHintsLoading || !fact) return
    if (!fact.question || !fact.short_answer) {
      toast?.('Question ou réponse manquante', 'warn')
      return
    }
    setGenHintsLoading(true)
    try {
      const res = await callEdgeFunction('complete-hints', {
        question: fact.question,
        short_answer: fact.short_answer,
        explanation: fact.explanation,
        category: fact.category,
        hint1: fact.hint1, hint2: fact.hint2,
        hint3: fact.hint3, hint4: fact.hint4,
      })
      const updated = res.updated || {}
      const keys = Object.keys(updated)
      if (keys.length === 0) {
        toast?.('Indices déjà valides — rien à changer')
        return
      }
      setFact(prev => ({ ...prev, ...updated }))
      setDirty(true)
      toast?.(`✓ ${keys.length} indice(s) régénéré(s) — pense à sauvegarder`)
    } catch (err) {
      console.error('[regenHints]', err)
      toast?.('Erreur génération indices : ' + err.message, 'error')
    } finally {
      setGenHintsLoading(false)
    }
  }

  // ── Régénération solo : 8 mauvaises réponses (enrich-fact) ─────────
  async function regenAnswers() {
    if (genAnswersLoading || !fact) return
    if (!fact.question || !fact.short_answer) {
      toast?.('Question ou réponse manquante', 'warn')
      return
    }
    setGenAnswersLoading(true)
    try {
      const res = await callEdgeFunction('enrich-fact', {
        question: fact.question,
        short_answer: fact.short_answer,
        explanation: fact.explanation,
        category: fact.category,
        hint1: fact.hint1, hint2: fact.hint2,
      })
      const updates = {
        funny_wrong_1:     res.funny_wrong_1,
        funny_wrong_2:     res.funny_wrong_2,
        funny_wrong_3:     res.funny_wrong_3,
        close_wrong_1:     res.close_wrong_1,
        close_wrong_2:     res.close_wrong_2,
        plausible_wrong_1: res.plausible_wrong_1,
        plausible_wrong_2: res.plausible_wrong_2,
        plausible_wrong_3: res.plausible_wrong_3,
      }
      setFact(prev => ({ ...prev, ...updates }))
      setDirty(true)
      toast?.('✓ 8 réponses régénérées — pense à sauvegarder')
    } catch (err) {
      console.error('[regenAnswers]', err)
      toast?.('Erreur génération réponses : ' + err.message, 'error')
    } finally {
      setGenAnswersLoading(false)
    }
  }

  // ── Régénération solo : 3 affirmations VoF (generateStatements) ────
  async function regenStatements() {
    if (genStatementsLoading || !fact) return
    if (!fact.question || !fact.short_answer) {
      toast?.('Question ou réponse manquante', 'warn')
      return
    }
    if (!fact.funny_wrong_1 || !fact.plausible_wrong_1) {
      toast?.('Il faut au moins 1 funny_wrong et 1 plausible_wrong. Régénère d\'abord les réponses.', 'warn')
      return
    }
    setGenStatementsLoading(true)
    try {
      const res = await generateStatementsForFact(fact)
      setFact(prev => ({ ...prev, ...res }))
      setDirty(true)
      toast?.('✓ 3 affirmations régénérées — pense à sauvegarder')
    } catch (err) {
      console.error('[regenStatements]', err)
      toast?.('Erreur affirmations : ' + err.message, 'error')
    } finally {
      setGenStatementsLoading(false)
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
          {/* Header : retour + prev + id/cat/vip + next */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'rgba(0,0,0,0.35)', border: '1.5px solid rgba(255,255,255,0.35)',
                color: '#fff', fontSize: 14, fontWeight: 900, cursor: 'pointer', flexShrink: 0,
              }}
              title="Retour"
            >
              ←
            </button>

            {/* Prev fact (filtres URL préservés) */}
            {prevId ? (
              <Link
                to={`/facts-mobile/${prevId}?${searchParams.toString()}`}
                style={{
                  height: 30, padding: '0 8px', borderRadius: 8,
                  background: 'rgba(0,0,0,0.35)', border: '1.5px solid rgba(255,255,255,0.35)',
                  color: '#fff', fontSize: 11, fontWeight: 900,
                  display: 'flex', alignItems: 'center', gap: 3,
                  textDecoration: 'none', flexShrink: 0,
                }}
                title={`Fact précédent #${prevId}`}
              >
                ← #{prevId}
              </Link>
            ) : (
              <span style={{
                height: 30, padding: '0 8px', borderRadius: 8,
                background: 'rgba(0,0,0,0.15)', border: '1.5px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 900,
                display: 'flex', alignItems: 'center', flexShrink: 0,
              }}>←</span>
            )}

            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 900, color: textOnCat, letterSpacing: '0.02em',
              minWidth: 0,
            }}>
              <span>#{fact.id}</span>
            </div>

            {/* Next fact (filtres URL préservés) */}
            {nextId ? (
              <Link
                to={`/facts-mobile/${nextId}?${searchParams.toString()}`}
                style={{
                  height: 30, padding: '0 8px', borderRadius: 8,
                  background: 'rgba(0,0,0,0.35)', border: '1.5px solid rgba(255,255,255,0.35)',
                  color: '#fff', fontSize: 11, fontWeight: 900,
                  display: 'flex', alignItems: 'center', gap: 3,
                  textDecoration: 'none', flexShrink: 0,
                }}
                title={`Fact suivant #${nextId}`}
              >
                #{nextId} →
              </Link>
            ) : (
              <span style={{
                height: 30, padding: '0 8px', borderRadius: 8,
                background: 'rgba(0,0,0,0.15)', border: '1.5px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 900,
                display: 'flex', alignItems: 'center', flexShrink: 0,
              }}>→</span>
            )}
          </div>

          {/* Row Catégorie + Mode (WTF! / Fun) — effectif à la sauvegarde */}
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 6, marginBottom: 8 }}>
            <select
              value={fact.category || ''}
              onChange={e => set('category', e.target.value)}
              style={{
                flex: 1, minWidth: 0,
                height: 30, padding: '0 8px', borderRadius: 8,
                background: 'rgba(0,0,0,0.5)',
                border: '1.5px solid rgba(255,255,255,0.35)',
                color: '#fff', fontSize: 11, fontWeight: 800,
                cursor: 'pointer',
                appearance: 'none',
                backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='white' d='M5 7L1 3h8z'/%3E%3C/svg%3E\")",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px center',
                paddingRight: 22,
              }}
            >
              <option value="">— Catégorie —</option>
              {CATEGORIES.map(c => (
                <option key={c.id} value={c.id} style={{ background: '#1e293b', color: '#fff' }}>
                  {c.emoji ? `${c.emoji} ` : ''}{c.label}
                </option>
              ))}
            </select>

            <div style={{
              display: 'flex', height: 30, borderRadius: 8, overflow: 'hidden',
              border: '1.5px solid rgba(255,255,255,0.35)',
              flexShrink: 0,
            }}>
              <button
                onClick={() => set('is_vip', true)}
                style={{
                  padding: '0 10px',
                  background: fact.is_vip ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'rgba(0,0,0,0.35)',
                  color: fact.is_vip ? '#fff' : 'rgba(255,255,255,0.55)',
                  fontSize: 10, fontWeight: 900, letterSpacing: '0.02em',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 3,
                }}
                title="WTF! (VIP)"
              >
                ⭐ WTF!
              </button>
              <button
                onClick={() => set('is_vip', false)}
                style={{
                  padding: '0 10px',
                  background: !fact.is_vip ? 'linear-gradient(135deg, #7C3AED, #5B21B6)' : 'rgba(0,0,0,0.35)',
                  color: !fact.is_vip ? '#fff' : 'rgba(255,255,255,0.55)',
                  fontSize: 10, fontWeight: 900, letterSpacing: '0.02em',
                  border: 'none', cursor: 'pointer',
                  borderLeft: '1px solid rgba(255,255,255,0.25)',
                  display: 'flex', alignItems: 'center', gap: 3,
                }}
                title="Fun Facts (non-VIP)"
              >
                ⚡ Fun
              </button>
            </div>
          </div>

          {/* Question */}
          <div style={{ marginBottom: 8 }}>
            <CenteredTextarea
              value={fact.question}
              onChange={v => set('question', v)}
              placeholder="Question…"
              bg={isFieldInvalid(fact.question, 'question') ? INVALID_BG : 'rgba(0,0,0,0.35)'}
              border="1.5px solid rgba(255,255,255,0.18)"
              color="#ffffff"
              fontSize={15}
              fontWeight={800}
              lineHeight={1.4}
              minHeight={48}
              borderRadius={10}
              padding="8px 10px"
            />
          </div>

          {/* Vraie réponse */}
          <CenteredTextarea
            value={fact.short_answer}
            onChange={v => set('short_answer', v)}
            placeholder="Vraie réponse…"
            bg={isFieldInvalid(fact.short_answer, 'short_answer') ? INVALID_BG : 'rgba(255,255,255,0.15)'}
            border={`3px solid ${COLOR_VRAIE}`}
            color="#ffffff"
            fontSize={13}
            fontWeight={700}
            lineHeight={1.2}
            minHeight={50}
            borderRadius={12}
            padding="4px 8px"
          />
        </div>

        {/* ══ SCROLL : 8 réponses → 4 indices → 3 affirmations → saviez-vous ══ */}
        <div style={{ padding: '10px' }}>

          {/* 8 mauvaises réponses — grid 2 col, taille jeu */}
          <div style={{ marginBottom: 12 }}>
            <SectionHeader
              label="Réponses"
              onClick={regenAnswers}
              loading={genAnswersLoading}
              textColor={textOnCat}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
              {WRONG_ANSWERS.map(({ key, color }) => {
                const invalid = isFieldInvalid(fact[key], key)
                return (
                  <CenteredTextarea
                    key={key}
                    value={fact[key]}
                    onChange={v => set(key, v)}
                    placeholder="—"
                    bg={invalid ? INVALID_BG : 'rgba(255,255,255,0.15)'}
                    border={`3px solid ${color}`}
                    color="#ffffff"
                    fontSize={11}
                    fontWeight={700}
                    lineHeight={1.2}
                    minHeight={50}
                    borderRadius={12}
                    padding="4px 6px"
                  />
                )
              })}
            </div>
          </div>

          {/* 4 Indices — grid 2 col, taille jeu (fond blanc, 28h) */}
          <div style={{ marginBottom: 12 }}>
            <SectionHeader
              label="Indices"
              onClick={regenHints}
              loading={genHintsLoading}
              textColor={textOnCat}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[1, 2, 3, 4].map(n => {
                const key = `hint${n}`
                const invalid = isFieldInvalid(fact[key], key)
                return (
                  <CenteredTextarea
                    key={n}
                    value={fact[key]}
                    onChange={v => set(key, v)}
                    placeholder={`Indice ${n}`}
                    bg={invalid ? INVALID_BG : 'rgba(235,235,235,0.95)'}
                    border={`2px solid ${categoryColor}`}
                    color={invalid ? '#ffffff' : '#1a1a2e'}
                    fontSize={10}
                    fontWeight={800}
                    lineHeight={1}
                    minHeight={28}
                    borderRadius={14}
                    padding="2px 8px"
                  />
                )
              })}
            </div>
          </div>

          {/* 3 Affirmations (Vrai ou Fou) */}
          <div style={{ marginBottom: 12 }}>
            <SectionHeader
              label="Affirmations"
              onClick={regenStatements}
              loading={genStatementsLoading}
              textColor={textOnCat}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { key: 'statement_true',              color: COLOR_VRAIE },
                { key: 'statement_false_funny',       color: COLOR_DROLE },
                { key: 'statement_false_plausible',   color: COLOR_PLAUSIBLE },
              ].map(s => {
                const invalid = isFieldInvalid(fact[s.key], s.key)
                return (
                  <CenteredTextarea
                    key={s.key}
                    value={fact[s.key]}
                    onChange={v => set(s.key, v)}
                    placeholder="—"
                    bg={invalid ? INVALID_BG : 'rgba(0,0,0,0.35)'}
                    border={`2.5px solid ${s.color}`}
                    color="#ffffff"
                    fontSize={12}
                    fontWeight={600}
                    lineHeight={1.3}
                    minHeight={44}
                    borderRadius={10}
                    padding="6px 10px"
                  />
                )
              })}
            </div>
          </div>

          {/* Le saviez-vous */}
          <div style={{ marginBottom: 12 }}>
            <CenteredTextarea
              value={fact.explanation}
              onChange={v => set('explanation', v)}
              placeholder="Le saviez-vous…"
              bg={isFieldInvalid(fact.explanation, 'explanation') ? INVALID_BG : 'rgba(0,0,0,0.35)'}
              border="1.5px solid rgba(255,255,255,0.25)"
              color="#ffffff"
              fontSize={12}
              fontWeight={500}
              lineHeight={1.45}
              minHeight={80}
              borderRadius={10}
              padding="8px 10px"
            />
          </div>

          {/* Image du fact — active */}
          <div style={{
            position: 'relative',
            marginBottom: 12,
            borderRadius: 10,
            overflow: 'hidden',
            background: 'rgba(0,0,0,0.25)',
            border: '1.5px solid rgba(255,255,255,0.18)',
            aspectRatio: '1 / 1',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {fact.image_url ? (
              <>
                <img
                  src={fact.image_url}
                  alt="Fact"
                  onClick={() => setZoomOpen(true)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: 'zoom-in' }}
                  onError={e => { e.target.style.display = 'none' }}
                />
                {/* Loupe — zoom fullscreen */}
                <button
                  onClick={() => setZoomOpen(true)}
                  title="Agrandir l'image"
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.55)', border: '1.5px solid rgba(255,255,255,0.4)',
                    backdropFilter: 'blur(4px)',
                    color: '#fff', fontSize: 14, fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                    padding: 0,
                  }}
                >
                  🔍
                </button>
              </>
            ) : (
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: 12 }}>
                Pas d'image
              </span>
            )}
          </div>

          {/* Matrice de génération d'images */}
          <FactImageGenerator
            factId={fact.id}
            activeImageUrl={fact.image_url}
            initialDirections={fact.image_directions}
            onActivate={(newUrl) => setFact(prev => ({ ...prev, image_url: newUrl }))}
            toast={toast}
          />

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

        {/* ══ Modal zoom image ══════════════════════════════════════════ */}
        {zoomOpen && fact.image_url && (
          <div
            onClick={() => setZoomOpen(false)}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.92)',
              zIndex: 9999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20,
              cursor: 'zoom-out',
            }}
          >
            <img
              src={fact.image_url}
              alt=""
              onClick={e => e.stopPropagation()}
              style={{
                maxWidth: '95vw', maxHeight: '95vh',
                objectFit: 'contain',
                borderRadius: 8,
                boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
              }}
            />
            <button
              onClick={() => setZoomOpen(false)}
              style={{
                position: 'absolute', top: 16, right: 16,
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff', fontSize: 18, fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
