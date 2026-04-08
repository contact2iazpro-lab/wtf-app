import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ImagePipelinePage() {
  // ──────────────────────────────────────────────────────────────────────────────
  // STATE
  // ──────────────────────────────────────────────────────────────────────────────

  const [tab, setTab] = useState('noimage') // 'noimage', 'directions', 'validation'
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  // Tab 1 — Sans image
  const [factsNoImage, setFactsNoImage] = useState([])
  const [categories, setCategories] = useState([])
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [countNoImage, setCountNoImage] = useState(0)
  const [selectedFacts, setSelectedFacts] = useState(new Set())
  const [selectAllMode, setSelectAllMode] = useState(false)
  const [noImagePage, setNoImagePage] = useState(1)
  const PAGE_SIZE = 50

  // Tab 2 — Directions
  const [directionsQueue, setDirectionsQueue] = useState([])
  const [selectedDirections, setSelectedDirections] = useState({})
  const [customDirections, setCustomDirections] = useState({})
  const [generatingDirections, setGeneratingDirections] = useState(false)
  const [validatingDirectionId, setValidatingDirectionId] = useState(null)

  // Tab 3 — Validation
  const [validationQueue, setValidationQueue] = useState([])
  const [countValidation, setCountValidation] = useState(0)

  // ──────────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────────────────────────

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // FETCH FUNCTIONS
  // ──────────────────────────────────────────────────────────────────────────────

  // Tab 1: Fetch facts without images
  const fetchNoImageFacts = async () => {
    setLoading(true)
    try {
      const { data: allFacts, error } = await supabase
        .from('facts')
        .select('id, question, category, is_vip, image_url')
        .or('image_url.is.null,image_url.eq.""')
        .order('id', { ascending: false })

      if (error) throw error

      setFactsNoImage(allFacts || [])
      setCountNoImage(allFacts?.length || 0)
      setNoImagePage(1)
    } catch (err) {
      console.error('Error fetching facts without images:', err)
      showToast('❌ Erreur chargement facts')
    } finally {
      setLoading(false)
    }
  }

  // Tab 1: Fetch distinct categories
  const fetchCategories = async () => {
    try {
      const { data: allFacts, error } = await supabase
        .from('facts')
        .select('category')
        .neq('category', null)

      if (error) throw error

      const unique = [...new Set(allFacts.map(f => f.category).filter(Boolean))].sort()
      setCategories(unique)
    } catch (err) {
      console.error('Error fetching categories:', err)
      showToast('❌ Erreur catégories')
    }
  }

  // Tab 2: Fetch directions queue
  const fetchDirectionsQueue = async () => {
    setLoading(true)
    try {
      const { data: pipeline, error } = await supabase
        .from('image_pipeline')
        .select('*, facts(id, question, short_answer, category, is_vip)')
        .eq('status', 'directions_generated')
        .order('created_at', { ascending: true })

      if (error) throw error

      setDirectionsQueue(pipeline || [])
    } catch (err) {
      console.error('Error fetching directions queue:', err)
      showToast('❌ Erreur chargement directions')
    } finally {
      setLoading(false)
    }
  }

  // Tab 3: Fetch validation queue (including items being generated)
  const fetchValidationQueue = async () => {
    setLoading(true)
    try {
      const { data: pipeline, error } = await supabase
        .from('image_pipeline')
        .select('*, facts(id, question, short_answer, category)')
        .or('status.eq.image_generated,status.eq.direction_selected')
        .order('created_at', { ascending: true })

      if (error) throw error

      setValidationQueue(pipeline || [])
      setCountValidation(pipeline?.length || 0)
    } catch (err) {
      console.error('Error fetching validation queue:', err)
      showToast('❌ Erreur chargement validation')
    } finally {
      setLoading(false)
    }
  }

  // Load data on tab change
  useEffect(() => {
    if (tab === 'noimage') {
      fetchNoImageFacts()
      fetchCategories()
    } else if (tab === 'directions') {
      fetchDirectionsQueue()
    } else if (tab === 'validation') {
      fetchValidationQueue()
    }
  }, [tab])

  // ──────────────────────────────────────────────────────────────────────────────
  // TAB 1 — SANS IMAGE
  // ──────────────────────────────────────────────────────────────────────────────

  const filteredFacts = factsNoImage.filter(f => {
    const catMatch = filterCategory === 'all' || f.category === filterCategory
    const typeMatch = filterType === 'all' || (filterType === 'vip' ? f.is_vip : !f.is_vip)
    return catMatch && typeMatch
  })

  const paginatedFacts = filteredFacts.slice(0, noImagePage * PAGE_SIZE)

  const handleSelectFact = (id) => {
    const newSet = new Set(selectedFacts)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedFacts(newSet)
    setSelectAllMode(newSet.size === filteredFacts.length)
  }

  const handleSelectAll = (checked) => {
    setSelectAllMode(checked)
    if (checked) {
      setSelectedFacts(new Set(filteredFacts.map(f => f.id)))
    } else {
      setSelectedFacts(new Set())
    }
  }

  const handleGenerateDirections = async () => {
    if (selectedFacts.size === 0) {
      showToast('⚠️ Sélectionner au moins un fact')
      return
    }

    setGeneratingDirections(true)
    try {
      const selectedIds = Array.from(selectedFacts)
      const selectedObjs = factsNoImage.filter(f => selectedIds.includes(f.id))

      // Insert into image_pipeline
      const toInsert = selectedIds.map(id => {
        const fact = selectedObjs.find(f => f.id === id)
        return {
          fact_id: id,
          status: 'pending',
          fact_type: fact?.is_vip ? 'vip' : 'funny',
        }
      })

      const { error: insertError } = await supabase
        .from('image_pipeline')
        .insert(toInsert)

      if (insertError) throw insertError

      console.log(`✓ Inserted ${selectedFacts.size} facts into image_pipeline`)

      // Call Edge Function
      const resp = await fetch(
        import.meta.env.VITE_SUPABASE_URL + '/functions/v1/generate-image-directions',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + import.meta.env.VITE_ADMIN_PASSWORD,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fact_ids: selectedIds,
            fact_type: selectedObjs[0]?.is_vip ? 'vip' : 'funny',
          }),
        }
      )

      const result = await resp.json()
      console.log('Edge Function response:', result)

      if (!resp.ok) {
        throw new Error(result.error || 'Edge Function error')
      }

      showToast(`✅ ${selectedFacts.size} facts en attente de directions`)
      setSelectedFacts(new Set())
      setSelectAllMode(false)
      fetchNoImageFacts()
      setTab('directions')
    } catch (err) {
      console.error(err)
      showToast('❌ Erreur: ' + err.message)
    } finally {
      setGeneratingDirections(false)
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // TAB 2 — DIRECTIONS
  // ──────────────────────────────────────────────────────────────────────────────

  const handleSelectDirection = (pipelineId, direction) => {
    setSelectedDirections(prev => ({
      ...prev,
      [pipelineId]: direction,
    }))
  }

  const handleCustomDirection = (pipelineId, text) => {
    setCustomDirections(prev => ({
      ...prev,
      [pipelineId]: text,
    }))
  }

  const handleValidateDirection = async (pipelineId) => {
    const selected = selectedDirections[pipelineId]
    const custom = customDirections[pipelineId]

    if (!selected && !custom) {
      showToast('⚠️ Choisir ou écrire une direction')
      return
    }

    setValidatingDirectionId(pipelineId)
    try {
      // Step 1: Update image_pipeline with direction
      const { error } = await supabase
        .from('image_pipeline')
        .update({
          selected_direction: selected || null,
          custom_direction: custom || null,
          status: 'direction_selected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', pipelineId)

      if (error) throw error

      console.log(`✓ Direction validée pour pipeline #${pipelineId}`)

      // Step 2: Call generate-image Edge Function
      const resp = await fetch(
        import.meta.env.VITE_SUPABASE_URL + '/functions/v1/generate-image',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + import.meta.env.VITE_ADMIN_PASSWORD,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pipeline_id: pipelineId }),
        }
      )

      const result = await resp.json()
      console.log('Image generation result:', result)

      if (!resp.ok) {
        console.error('Image generation error:', result)
        showToast('❌ Erreur génération image: ' + (result.error || 'inconnu'))
        setValidatingDirectionId(null)
      } else {
        showToast('✅ Direction validée ! Génération de l\'image en cours...')
        // Step 3: Switch to Validation tab after 1.5s delay
        setTimeout(() => {
          setTab('validation')
          fetchValidationQueue()
          setValidatingDirectionId(null)
        }, 1500)
      }
    } catch (err) {
      console.error('Error in handleValidateDirection:', err)
      showToast('❌ Erreur: ' + err.message)
      setValidatingDirectionId(null)
    }
  }

  const handleDeleteFromPipeline = async (pipelineId) => {
    if (!window.confirm('Supprimer ce fact du pipeline images ?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('image_pipeline')
        .delete()
        .eq('id', pipelineId)

      if (error) throw error

      showToast('✓ Fact retiré du pipeline')

      // Refresh the appropriate queue
      if (tab === 'directions') {
        fetchDirectionsQueue()
      } else if (tab === 'validation') {
        fetchValidationQueue()
      }
    } catch (err) {
      console.error(err)
      showToast('❌ Erreur suppression')
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // TAB 3 — VALIDATION
  // ──────────────────────────────────────────────────────────────────────────────

  const handleValidateImage = async (pipelineId, imageUrl) => {
    if (!imageUrl) {
      showToast('⚠️ Pas d\'image à valider')
      return
    }

    setLoading(true)
    try {
      const pipeline = validationQueue.find(p => p.id === pipelineId)
      if (!pipeline) throw new Error('Pipeline not found')

      // Update fact with image
      const { error: updateFact } = await supabase
        .from('facts')
        .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
        .eq('id', pipeline.fact_id)

      if (updateFact) throw updateFact

      // Update pipeline status
      const { error: updatePipeline } = await supabase
        .from('image_pipeline')
        .update({ status: 'validated', final_image_url: imageUrl, updated_at: new Date().toISOString() })
        .eq('id', pipelineId)

      if (updatePipeline) throw updatePipeline

      showToast('✅ Image validée')
      fetchValidationQueue()
    } catch (err) {
      console.error(err)
      showToast('❌ Erreur validation')
    } finally {
      setLoading(false)
    }
  }

  const handleRejectImage = async (pipelineId) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('image_pipeline')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', pipelineId)

      if (error) throw error

      showToast('✅ Image rejetée')
      fetchValidationQueue()
    } catch (err) {
      console.error(err)
      showToast('❌ Erreur rejet')
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerateImage = async (pipelineId) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('image_pipeline')
        .update({ status: 'directions_generated', updated_at: new Date().toISOString() })
        .eq('id', pipelineId)

      if (error) throw error

      showToast('✅ Retour aux directions')
      fetchValidationQueue()
      fetchDirectionsQueue()
    } catch (err) {
      console.error(err)
      showToast('❌ Erreur régénération')
    } finally {
      setLoading(false)
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0f1e',
      color: 'white',
      padding: '24px',
      fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          zIndex: 1000,
          background: 'rgba(16, 185, 129, 0.9)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '12px',
          fontWeight: 700,
          fontSize: '14px',
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 900,
          margin: 0,
          marginBottom: '16px',
        }}>
          📸 Pipeline d'Images
        </h1>

        {/* Counters */}
        <div style={{
          display: 'flex',
          gap: '20px',
          flexWrap: 'wrap',
          fontSize: '14px',
          fontWeight: 700,
        }}>
          <div>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>Sans image</span>
            {' '}
            <span style={{
              background: 'rgba(255,107,26,0.2)',
              color: '#FF6B1A',
              padding: '4px 12px',
              borderRadius: '8px',
              fontWeight: 900,
            }}>
              {countNoImage}
            </span>
          </div>
          <div>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>Directions prêtes</span>
            {' '}
            <span style={{
              background: 'rgba(168, 85, 247, 0.2)',
              color: '#a855f7',
              padding: '4px 12px',
              borderRadius: '8px',
              fontWeight: 900,
            }}>
              {directionsQueue.length}
            </span>
          </div>
          <div>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>À valider</span>
            {' '}
            <span style={{
              background: 'rgba(14, 165, 233, 0.2)',
              color: '#0ea5e9',
              padding: '4px 12px',
              borderRadius: '8px',
              fontWeight: 900,
            }}>
              {countValidation}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        paddingBottom: '0px',
      }}>
        {[
          { id: 'noimage', label: '📭 Sans image' },
          { id: 'directions', label: '🎨 Directions' },
          { id: 'validation', label: '✅ Validation' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 700,
              background: tab === t.id ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: 'none',
              color: tab === t.id ? 'white' : 'rgba(255,255,255,0.5)',
              borderBottom: tab === t.id ? '2px solid #FF6B1A' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {/* TAB 1 — Sans image */}
      {tab === 'noimage' && (
        <div>
          {/* Filters */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '20px',
            background: 'rgba(255,255,255,0.05)',
            padding: '16px',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ flex: 1 }}>
              <label style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.7)',
                display: 'block',
                marginBottom: '6px',
              }}>
                Catégorie
              </label>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#1a1a2e',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontFamily: 'Nunito, sans-serif',
                  cursor: 'pointer',
                }}
              >
                <option value="all">Toutes</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.7)',
                display: 'block',
                marginBottom: '6px',
              }}>
                Type
              </label>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#1a1a2e',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontFamily: 'Nunito, sans-serif',
                  cursor: 'pointer',
                }}
              >
                <option value="all">Tous</option>
                <option value="vip">VIP</option>
                <option value="generated">Générés</option>
              </select>
            </div>
          </div>

          {/* Sticky bar — Selection + Button */}
          <div style={{
            position: 'sticky',
            top: '0',
            zIndex: 10,
            background: 'rgba(255,255,255,0.05)',
            padding: '12px 16px',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <input
                type="checkbox"
                checked={selectAllMode}
                onChange={e => handleSelectAll(e.target.checked)}
                style={{
                  width: '20px',
                  height: '20px',
                  cursor: 'pointer',
                }}
              />
              <span style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.9)',
              }}>
                {selectedFacts.size > 0
                  ? `${selectedFacts.size} sélectionnés`
                  : 'Tout sélectionner'}
              </span>
            </div>

            <button
              onClick={handleGenerateDirections}
              disabled={selectedFacts.size === 0 || generatingDirections}
              style={{
                padding: '8px 16px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 700,
                background: selectedFacts.size === 0 ? 'rgba(255,255,255,0.1)' : '#FF6B1A',
                color: 'white',
                border: 'none',
                cursor: selectedFacts.size === 0 || generatingDirections ? 'not-allowed' : 'pointer',
                opacity: selectedFacts.size === 0 || generatingDirections ? 0.5 : 1,
                transition: 'all 0.2s',
              }}
            >
              {generatingDirections ? '⏳ Génération en cours...' : `🎨 Générer (${selectedFacts.size})`}
            </button>
          </div>

          {/* Facts list */}
          <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
            {paginatedFacts.length === 0 && (
              <div style={{
                padding: '40px 24px',
                textAlign: 'center',
                color: 'rgba(255,255,255,0.5)',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                Aucun fact sans image
              </div>
            )}

            {paginatedFacts.map(fact => (
              <div
                key={fact.id}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '16px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedFacts.has(fact.id)}
                  onChange={() => handleSelectFact(fact.id)}
                  style={{
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer',
                    marginTop: '2px',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    marginBottom: '4px',
                  }}>
                    #{fact.id} — {fact.question.slice(0, 60)}
                    {fact.question.length > 60 ? '…' : ''}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.6)',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                  }}>
                    <span>{fact.category}</span>
                    {fact.is_vip && (
                      <span style={{
                        background: 'rgba(168, 85, 247, 0.2)',
                        color: '#a855f7',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontSize: '11px',
                      }}>
                        VIP
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load more */}
          {paginatedFacts.length < filteredFacts.length && (
            <button
              onClick={() => setNoImagePage(p => p + 1)}
              style={{
                width: '100%',
                padding: '12px 20px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              📥 Charger 50 de plus ({paginatedFacts.length}/{filteredFacts.length})
            </button>
          )}
        </div>
      )}

      {/* TAB 2 — Directions */}
      {tab === 'directions' && (
        <div>
          {/* Guide des styles visuels */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: '#FF6B1A' }}>
              Guide des styles visuels
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
              🎨 <b>Art moderne</b> — Illustration stylisée, couleurs vives, composition graphique<br />
              😂 <b>Meme fun</b> — Style meme internet, humour visuel, format partage réseaux sociaux<br />
              📷 <b>Photo réelle</b> — Rendu photorréaliste, mise en scène naturelle<br />
              ✏️ <b>Dessin manga</b> — Style manga/anime japonais, traits dynamiques<br />
              😀 <b>Emoji</b> — Composition à base d'emojis, style flat design coloré
            </div>
          </div>

          {directionsQueue.length === 0 ? (
            <div style={{
              padding: '40px 24px',
              textAlign: 'center',
              color: 'rgba(255,255,255,0.5)',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              Aucun fact en attente. Générez des directions d'abord. 👈
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '20px' }}>
              {directionsQueue.map(item => (
                <div
                  key={item.id}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    padding: '20px',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    position: 'relative',
                  }}
                >
                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteFromPipeline(item.id)}
                    style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      background: 'rgba(239,68,68,0.15)',
                      color: '#ef4444',
                      border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.target.style.background = 'rgba(239,68,68,0.25)'
                      e.target.style.borderColor = 'rgba(239,68,68,0.5)'
                    }}
                    onMouseLeave={e => {
                      e.target.style.background = 'rgba(239,68,68,0.15)'
                      e.target.style.borderColor = 'rgba(239,68,68,0.3)'
                    }}
                  >
                    🗑️ Supprimer
                  </button>

                  <div style={{ marginBottom: '16px' }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      marginBottom: '4px',
                    }}>
                      {item.facts?.question}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: 'rgba(255,255,255,0.7)',
                    }}>
                      ✓ {item.facts?.short_answer}
                    </div>
                  </div>

                  {/* Directions */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: '8px',
                    marginBottom: '16px',
                  }}>
                    {['Art moderne', 'Meme fun', 'Photo réelle', 'Dessin manga', 'Emoji'].map(
                      dir => (
                        <button
                          key={dir}
                          onClick={() => handleSelectDirection(item.id, dir)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 700,
                            background:
                              selectedDirections[item.id] === dir
                                ? '#a855f7'
                                : 'rgba(255,255,255,0.08)',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.2)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          {dir}
                        </button>
                      )
                    )}
                  </div>

                  {/* Custom input */}
                  <input
                    type="text"
                    placeholder="Ou écris ta propre direction..."
                    value={customDirections[item.id] || ''}
                    onChange={e => handleCustomDirection(item.id, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      background: 'rgba(255,255,255,0.08)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.2)',
                      marginBottom: '12px',
                      fontFamily: 'Nunito, sans-serif',
                    }}
                  />

                  {/* Submit button */}
                  <button
                    onClick={() => handleValidateDirection(item.id)}
                    disabled={!selectedDirections[item.id] && !customDirections[item.id] || validatingDirectionId === item.id}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: 900,
                      background:
                        !selectedDirections[item.id] && !customDirections[item.id]
                          ? 'rgba(255,255,255,0.1)'
                          : '#0ea5e9',
                      color: 'white',
                      border: 'none',
                      cursor: !selectedDirections[item.id] && !customDirections[item.id] || validatingDirectionId === item.id ? 'not-allowed' : 'pointer',
                      opacity: validatingDirectionId === item.id ? 0.6 : 1,
                      transition: 'all 0.2s',
                    }}
                  >
                    {validatingDirectionId === item.id ? '⏳ Validation en cours...' : '✅ Valider direction'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3 — Validation */}
      {tab === 'validation' && (
        <div>
          {validationQueue.length === 0 ? (
            <div style={{
              padding: '40px 24px',
              textAlign: 'center',
              color: 'rgba(255,255,255,0.5)',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              Aucune image à valider. 🎉
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '20px' }}>
              {validationQueue.map(item => (
                <div
                  key={item.id}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    padding: '20px',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 300px',
                    gap: '20px',
                    position: 'relative',
                  }}
                >
                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteFromPipeline(item.id)}
                    style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      background: 'rgba(239,68,68,0.15)',
                      color: '#ef4444',
                      border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.target.style.background = 'rgba(239,68,68,0.25)'
                      e.target.style.borderColor = 'rgba(239,68,68,0.5)'
                    }}
                    onMouseLeave={e => {
                      e.target.style.background = 'rgba(239,68,68,0.15)'
                      e.target.style.borderColor = 'rgba(239,68,68,0.3)'
                    }}
                  >
                    🗑️ Supprimer
                  </button>

                  {/* Content based on status */}
                  {item.status === 'direction_selected' ? (
                    // Generating state
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '16px',
                      minHeight: '200px',
                    }}>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px',
                        textAlign: 'center',
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          border: '3px solid rgba(255,255,255,0.2)',
                          borderTopColor: '#FF6B1A',
                          animation: 'spin 1s linear infinite',
                        }} />
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#FF6B1A',
                        }}>
                          Génération en cours...
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: 'rgba(255,255,255,0.5)',
                        }}>
                          Merci de patienter
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Generated state with image and buttons
                    <>
                      <div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          marginBottom: '8px',
                        }}>
                          {item.facts?.question}
                        </div>
                        <div style={{
                          fontSize: '13px',
                          color: 'rgba(255,255,255,0.7)',
                          marginBottom: '16px',
                        }}>
                          ✓ {item.facts?.short_answer}
                        </div>

                        {/* Buttons */}
                        <div style={{
                          display: 'flex',
                          gap: '10px',
                        }}>
                          <button
                            onClick={() => handleValidateImage(item.id, item.image_url)}
                            style={{
                              flex: 1,
                              padding: '12px 16px',
                              borderRadius: '12px',
                              fontSize: '13px',
                              fontWeight: 900,
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                          >
                            ✅ Valider
                          </button>
                          <button
                            onClick={() => handleRejectImage(item.id)}
                            style={{
                              flex: 1,
                              padding: '12px 16px',
                              borderRadius: '12px',
                              fontSize: '13px',
                              fontWeight: 900,
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                          >
                            ❌ Rejeter
                          </button>
                          <button
                            onClick={() => handleRegenerateImage(item.id)}
                            style={{
                              flex: 1,
                              padding: '12px 16px',
                              borderRadius: '12px',
                              fontSize: '13px',
                              fontWeight: 900,
                              background: '#f59e0b',
                              color: 'white',
                              border: 'none',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                          >
                            🔄 Régénérer
                          </button>
                        </div>
                      </div>

                      {/* Image */}
                      <div>
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt="Generated"
                            style={{
                              width: '100%',
                              maxWidth: '300px',
                              borderRadius: '12px',
                              background: 'rgba(0,0,0,0.3)',
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '100%',
                            maxWidth: '300px',
                            height: '200px',
                            borderRadius: '12px',
                            background: 'rgba(255,255,255,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'rgba(255,255,255,0.5)',
                            border: '1px solid rgba(255,255,255,0.1)',
                          }}>
                            Pas d'image
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
