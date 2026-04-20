/**
 * FactImageGenerator — matrice de génération d'images pour un fact.
 *
 * Flow en 2 temps :
 *  1. Opus propose 3 idées (+ slot perso éditable)
 *  2. Choix direction + styles cochés (Réaliste / WTF / Cinéma) + modèle
 *     → 1 image par style via Gemini 2.5 Flash / Gemini 3 Pro / gpt-image-1
 *  3. Historique des 10 dernières variantes avec Activer / Supprimer
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { callEdgeFunction } from '../utils/helpers'

const STYLES = [
  { id: 'realiste', label: 'Réaliste', color: '#22C55E' },
  { id: 'wtf',      label: 'WTF',      color: '#FF6B1A' },
  { id: 'cinema',   label: 'Cinéma',   color: '#6366F1' },
]

const MODELS = [
  { id: 'gpt-image-1',      label: 'ChatGPT',       hint: '~0,01 $/img' },
  { id: 'gemini-2.5-flash', label: 'Gemini Flash',  hint: '~0,04 $/img' },
  { id: 'gemini-3-pro',     label: 'Gemini 3 Pro',  hint: '~0,12 $/img' },
]

export default function FactImageGenerator({ factId, activeImageUrl, initialDirections, onActivate, toast }) {
  // Directions — pré-chargées depuis fact.image_directions si dispo
  const [directions, setDirections] = useState(
    Array.isArray(initialDirections) && initialDirections.length > 0
      ? initialDirections.map(d => ({ id: d.id, titre: d.titre, description: d.description, was_used: d.was_used }))
      : [],
  )
  const [selectedDirectionId, setSelectedDirectionId] = useState(null) // number | 'custom'
  const [customDirectionTitle, setCustomDirectionTitle] = useState('')
  const [customDirectionDesc, setCustomDirectionDesc]   = useState('')
  const [loadingDirections, setLoadingDirections] = useState(false)

  // Image params
  const [checkedStyles, setCheckedStyles] = useState(new Set(['wtf']))
  const [model, setModel] = useState('gemini-2.5-flash')
  const [variantsPerStyle, setVariantsPerStyle] = useState(1)
  const [generating, setGenerating] = useState(false)
  const [refining, setRefining] = useState(false)

  // Zoom modal
  const [zoomUrl, setZoomUrl] = useState(null)

  // History
  const [variants, setVariants] = useState([])
  const [loadingVariants, setLoadingVariants] = useState(false)

  // ── Load history ──
  const loadVariants = useCallback(async () => {
    setLoadingVariants(true)
    try {
      const { data, error } = await supabase
        .from('fact_image_variants')
        .select('*')
        .eq('fact_id', factId)
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      setVariants(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingVariants(false)
    }
  }, [factId])

  useEffect(() => { loadVariants() }, [loadVariants])

  // ── Propose directions (Opus) ──
  const handleProposeDirections = async () => {
    setLoadingDirections(true)
    try {
      const res = await callEdgeFunction('generate-fact-directions-single', { fact_id: factId })
      setDirections(res.directions || [])
      setSelectedDirectionId(null)
      toast?.('✓ 3 idées générées')
    } catch (err) {
      console.error(err)
      toast?.('Erreur directions : ' + err.message, 'error')
    } finally {
      setLoadingDirections(false)
    }
  }

  // ── Refine user's own idea via Opus ──
  const handleRefineCustom = async () => {
    const raw = customDirectionDesc.trim()
    if (!raw) return toast?.('Écris ton idée brute d\'abord', 'error')
    setRefining(true)
    try {
      const res = await callEdgeFunction('generate-fact-directions-single', {
        fact_id: factId,
        raw_idea: raw,
      })
      const refined = res.refined
      if (!refined?.description) throw new Error('Réponse invalide')
      if (refined.titre) setCustomDirectionTitle(refined.titre)
      setCustomDirectionDesc(refined.description)
      toast?.('✓ Idée retravaillée par Opus')
    } catch (err) {
      console.error(err)
      toast?.('Erreur retravail : ' + err.message, 'error')
    } finally {
      setRefining(false)
    }
  }

  // ── Generate images ──
  const handleGenerate = async () => {
    // Résout la direction sélectionnée
    let dirTitle = null
    let dirDesc  = null
    if (selectedDirectionId === 'custom') {
      dirTitle = customDirectionTitle.trim() || null
      dirDesc  = customDirectionDesc.trim()
      if (!dirDesc) return toast?.('Écris ta direction perso', 'error')
    } else {
      const d = directions.find(x => x.id === selectedDirectionId)
      if (!d) return toast?.('Choisis une direction', 'error')
      dirTitle = d.titre
      dirDesc  = d.description
    }

    if (checkedStyles.size === 0) return toast?.('Coche au moins un style', 'error')

    setGenerating(true)
    try {
      const res = await callEdgeFunction('generate-fact-image-single', {
        fact_id: factId,
        direction_title: dirTitle,
        direction_description: dirDesc,
        styles: Array.from(checkedStyles),
        model,
        variants_per_style: variantsPerStyle,
      })
      const okCount = (res.variants || []).length
      const errors = res.errors || []
      if (errors.length > 0) {
        console.error('[generate-fact-image-single] errors:', errors)
        const detail = errors.map(e => `${e.style}: ${e.error}`).join(' · ')
        toast?.(`✓ ${okCount} ok · ${errors.length} échec(s) — voir console`, 'error')
        console.error('Échecs détaillés :\n' + detail)
      } else {
        toast?.(`✓ ${okCount} image(s) générée(s)`)
      }
      await loadVariants()
    } catch (err) {
      console.error(err)
      toast?.('Erreur génération : ' + err.message, 'error')
    } finally {
      setGenerating(false)
    }
  }

  // ── Activate variant ──
  const handleActivate = async (variantId) => {
    try {
      const variant = variants.find(x => x.id === variantId)
      if (!variant) throw new Error('Variante introuvable')

      // 1. Désactive les autres variantes actives du même fact
      const { error: e1 } = await supabase
        .from('fact_image_variants')
        .update({ is_active: false })
        .eq('fact_id', factId)
        .eq('is_active', true)
      if (e1) throw e1

      // 2. Active la variante cible
      const { error: e2 } = await supabase
        .from('fact_image_variants')
        .update({ is_active: true })
        .eq('id', variantId)
      if (e2) throw e2

      // 3. Sync facts.image_url
      const { error: e3 } = await supabase
        .from('facts')
        .update({ image_url: variant.image_url, updated_at: new Date().toISOString() })
        .eq('id', factId)
      if (e3) throw e3

      toast?.('✓ Image activée')
      await loadVariants()
      if (onActivate) onActivate(variant.image_url)
    } catch (err) {
      console.error(err)
      toast?.('Erreur activation : ' + err.message, 'error')
    }
  }

  // ── Delete variant ──
  const handleDelete = async (variantId) => {
    if (!window.confirm('Supprimer cette variante ?')) return
    try {
      const v = variants.find(x => x.id === variantId)
      if (v?.storage_path) {
        await supabase.storage.from('fact-images').remove([v.storage_path])
      }
      const { error } = await supabase.from('fact_image_variants').delete().eq('id', variantId)
      if (error) throw error
      toast?.('✓ Variante supprimée')
      await loadVariants()
    } catch (err) {
      console.error(err)
      toast?.('Erreur suppression', 'error')
    }
  }

  // ── UI ──
  const toggleStyle = (id) => {
    setCheckedStyles(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const sectionStyle = {
    background: 'rgba(0,0,0,0.35)',
    border: '1.5px solid rgba(255,255,255,0.18)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  }
  const labelStyle = {
    fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.65)',
    letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6,
  }

  return (
    <div style={{ marginTop: 4 }}>
      {/* ═══ Étape 1 — Directions ═══ */}
      <div style={sectionStyle}>
        <div style={labelStyle}>🎨 Étape 1 · Direction</div>
        <button
          onClick={handleProposeDirections}
          disabled={loadingDirections}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10,
            background: loadingDirections ? 'rgba(255,255,255,0.12)' : '#FF6B1A',
            color: '#fff', fontWeight: 800, fontSize: 12,
            border: 'none', cursor: loadingDirections ? 'wait' : 'pointer',
            marginBottom: directions.length ? 10 : 0,
          }}
        >
          {loadingDirections ? '⟳ Opus réfléchit…' : directions.length ? '🔁 Re-proposer 3 directions' : '✨ Proposer 3 directions (Opus)'}
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: directions.length > 0 ? 10 : 10 }}>
          {directions.map(d => {
            const selected = selectedDirectionId === d.id
            return (
              <button
                key={d.id}
                onClick={() => setSelectedDirectionId(d.id)}
                style={{
                  textAlign: 'left', padding: '8px 10px', borderRadius: 8,
                  background: selected ? 'rgba(255,107,26,0.25)' : 'rgba(255,255,255,0.06)',
                  border: `1.5px solid ${selected ? '#FF6B1A' : 'rgba(255,255,255,0.15)'}`,
                  color: '#fff', cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: '#FF6B1A' }}>
                    {d.titre}
                  </span>
                  {d.was_used && (
                    <span style={{
                      fontSize: 9, fontWeight: 800,
                      color: '#10B981',
                      background: 'rgba(16,185,129,0.15)',
                      padding: '1px 6px',
                      borderRadius: 4,
                    }}>
                      ✅ utilisée
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>
                  {d.description}
                </div>
              </button>
            )
          })}

          {/* Slot perso — toujours affiché */}
          <button
            onClick={() => setSelectedDirectionId('custom')}
            style={{
              textAlign: 'left', padding: '8px 10px', borderRadius: 8,
              background: selectedDirectionId === 'custom' ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)',
              border: `1.5px dashed ${selectedDirectionId === 'custom' ? '#6366F1' : 'rgba(255,255,255,0.25)'}`,
              color: '#fff', cursor: 'pointer',
            }}
          >
              <div style={{ fontSize: 11, fontWeight: 900, color: '#6366F1', marginBottom: 4 }}>
                ✍️ Ma direction perso
              </div>
              {selectedDirectionId === 'custom' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <input
                    value={customDirectionTitle}
                    onChange={e => setCustomDirectionTitle(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    placeholder="Titre (optionnel)"
                    style={inputStyle}
                  />
                  <textarea
                    value={customDirectionDesc}
                    onChange={e => setCustomDirectionDesc(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    placeholder="Décris ta scène (même en brouillon)…"
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical', fontFamily: 'Nunito, sans-serif' }}
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRefineCustom() }}
                    disabled={refining || !customDirectionDesc.trim()}
                    style={{
                      padding: '6px 10px', borderRadius: 6, border: 'none',
                      background: refining || !customDirectionDesc.trim()
                        ? 'rgba(255,255,255,0.12)'
                        : '#6366F1',
                      color: '#fff', fontSize: 11, fontWeight: 800,
                      cursor: refining || !customDirectionDesc.trim() ? 'not-allowed' : 'pointer',
                      marginTop: 2,
                    }}
                  >
                    {refining ? '⟳ Opus retravaille…' : '✨ Retravailler avec Opus'}
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                  Clique pour écrire ta propre direction (brute ou détaillée)
                </div>
              )}
            </button>
          </div>
      </div>

      {/* ═══ Étape 2 — Styles + Modèle + Générer ═══ */}
      <div style={sectionStyle}>
        <div style={labelStyle}>🖼️ Étape 2 · Variantes</div>

        {/* Styles */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
            Styles (1 image par style coché)
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {STYLES.map(s => {
              const checked = checkedStyles.has(s.id)
              return (
                <button
                  key={s.id}
                  onClick={() => toggleStyle(s.id)}
                  style={{
                    flex: 1, padding: '8px 6px', borderRadius: 8, cursor: 'pointer',
                    background: checked ? `${s.color}33` : 'rgba(255,255,255,0.06)',
                    border: `1.5px solid ${checked ? s.color : 'rgba(255,255,255,0.15)'}`,
                    color: checked ? s.color : 'rgba(255,255,255,0.7)',
                    fontSize: 11, fontWeight: 800,
                  }}
                >
                  {checked ? '✓ ' : ''}{s.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Modèle */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
            Modèle
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {MODELS.map(m => {
              const active = model === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => setModel(m.id)}
                  style={{
                    flex: 1, padding: '6px 4px', borderRadius: 8, cursor: 'pointer',
                    background: active ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)',
                    border: `1.5px solid ${active ? '#6366F1' : 'rgba(255,255,255,0.15)'}`,
                    color: active ? '#fff' : 'rgba(255,255,255,0.7)',
                    fontSize: 10, fontWeight: 800,
                    display: 'flex', flexDirection: 'column', gap: 1,
                  }}
                >
                  <span>{m.label}</span>
                  <span style={{ fontSize: 8, fontWeight: 600, opacity: 0.6 }}>{m.hint}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Variantes par style */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
            Variantes par style
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 3, 4].map(n => {
              const active = variantsPerStyle === n
              return (
                <button
                  key={n}
                  onClick={() => setVariantsPerStyle(n)}
                  style={{
                    flex: 1, padding: '6px 4px', borderRadius: 8, cursor: 'pointer',
                    background: active ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)',
                    border: `1.5px solid ${active ? '#6366F1' : 'rgba(255,255,255,0.15)'}`,
                    color: active ? '#fff' : 'rgba(255,255,255,0.7)',
                    fontSize: 12, fontWeight: 800,
                  }}
                >
                  {n}
                </button>
              )
            })}
          </div>
        </div>

        {/* Generate button */}
        {(() => {
          const totalImages = checkedStyles.size * variantsPerStyle
          const disabled = generating || selectedDirectionId === null || checkedStyles.size === 0
          return (
            <button
              onClick={handleGenerate}
              disabled={disabled}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                background: disabled ? 'rgba(255,255,255,0.12)' : '#10B981',
                color: '#fff', fontWeight: 900, fontSize: 13,
                border: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              {generating
                ? `⟳ Génération ${totalImages} image(s)…`
                : `🚀 Générer ${totalImages} image(s)`}
            </button>
          )
        })()}
      </div>

      {/* ═══ Historique ═══ */}
      <div style={sectionStyle}>
        <div style={labelStyle}>📚 Historique (10 dernières)</div>
        {loadingVariants && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Chargement…</div>}
        {!loadingVariants && variants.length === 0 && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Aucune image générée pour ce fact.</div>
        )}
        {variants.length > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8,
          }}>
            {variants.map(v => {
              const isActive = v.is_active || v.image_url === activeImageUrl
              const styleMeta = STYLES.find(s => s.id === v.style)
              return (
                <div key={v.id} style={{
                  borderRadius: 8, overflow: 'hidden',
                  border: `2px solid ${isActive ? '#10B981' : 'rgba(255,255,255,0.15)'}`,
                  background: 'rgba(0,0,0,0.35)',
                  position: 'relative',
                }}>
                  <div
                    onClick={() => setZoomUrl(v.image_url)}
                    style={{ aspectRatio: '1 / 1', width: '100%', background: '#000', cursor: 'zoom-in', position: 'relative' }}
                  >
                    <img
                      src={v.image_url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    <div style={{
                      position: 'absolute', top: 4, right: 4,
                      width: 22, height: 22, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.65)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, color: '#fff',
                      pointerEvents: 'none',
                    }}>
                      🔍
                    </div>
                  </div>
                  <div style={{ padding: 6 }}>
                    <div style={{
                      fontSize: 9, fontWeight: 900,
                      color: styleMeta?.color || '#fff',
                      marginBottom: 2,
                    }}>
                      {styleMeta?.label || v.style} · {v.model}
                    </div>
                    {v.direction_title && (
                      <div style={{
                        fontSize: 9, color: 'rgba(255,255,255,0.7)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        marginBottom: 4,
                      }}>
                        {v.direction_title}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => handleActivate(v.id)}
                        disabled={isActive}
                        style={{
                          flex: 1, padding: '4px 6px', borderRadius: 6,
                          background: isActive ? 'rgba(16,185,129,0.35)' : '#10B981',
                          color: '#fff', fontSize: 10, fontWeight: 800,
                          border: 'none',
                          cursor: isActive ? 'default' : 'pointer',
                        }}
                      >
                        {isActive ? '✓ Active' : 'Activer'}
                      </button>
                      <button
                        onClick={() => handleDelete(v.id)}
                        style={{
                          padding: '4px 8px', borderRadius: 6,
                          background: 'rgba(239,68,68,0.2)',
                          color: '#ef4444', fontSize: 10, fontWeight: 800,
                          border: '1px solid rgba(239,68,68,0.3)',
                          cursor: 'pointer',
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ═══ Modal zoom image ═══ */}
      {zoomUrl && (
        <div
          onClick={() => setZoomUrl(null)}
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
            src={zoomUrl}
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
            onClick={() => setZoomUrl(null)}
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
  )
}

const inputStyle = {
  width: '100%', padding: '6px 8px', borderRadius: 6,
  background: 'rgba(0,0,0,0.5)', color: '#fff',
  border: '1px solid rgba(255,255,255,0.2)',
  fontSize: 11, boxSizing: 'border-box',
}
