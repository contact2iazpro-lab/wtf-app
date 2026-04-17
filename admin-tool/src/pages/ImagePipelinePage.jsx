import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { callEdgeFunction } from '../utils/helpers'

const STYLE_LABELS_MAP = {
  'realiste': '📷 Réaliste',
  'humoristique': '😂 Humoristique',
  'metaphorique': '🎭 Métaphorique',
  'retro': '🎨 Rétro Pop Art',
  'ultra_realiste_absurde': '📸 Ultra Réaliste Absurde',
  'wtf_cinematique': '🤯 WTF Cinématique',
}
// Case-insensitive lookup — handles both lowercase and UPPERCASE values from API
const STYLE_LABELS = new Proxy(STYLE_LABELS_MAP, {
  get(target, key) {
    if (typeof key === 'string') return target[key.toLowerCase()] || key
    return target[key]
  }
})

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
  const [expandedFacts, setExpandedFacts] = useState({})
  const [categorySearch, setCategorySearch] = useState('')
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const PAGE_SIZE = 50

  // Tab 2 — Directions
  const [directionsQueue, setDirectionsQueue] = useState([])
  const [selectedDirections, setSelectedDirections] = useState({})
  const [customDirections, setCustomDirections] = useState({})
  const [selectedStyles, setSelectedStyles] = useState({})
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
        .select('id, question, category, is_vip, image_url, status, short_answer, explanation, hint1, hint2, hint3, hint4')
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

  // Tab 1: Fetch distinct categories (all from facts table, no filters)
  const fetchCategories = async () => {
    try {
      const all = []
      let from = 0
      while (true) {
        const { data, error } = await supabase
          .from('facts')
          .select('category')
          .range(from, from + 999)

        if (error) throw error
        if (!data || data.length === 0) break
        all.push(...data)
        if (data.length < 1000) break
        from += 1000
      }

      const uniqueCategories = [...new Set(all.map(f => f.category).filter(Boolean))].sort()
      setCategories(uniqueCategories)
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

  // Close category dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      const categoryDiv = document.querySelector('[data-category-dropdown]')
      if (categoryDiv && !categoryDiv.contains(e.target)) {
        setShowCategoryDropdown(false)
      }
    }
    if (showCategoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCategoryDropdown])

  // ──────────────────────────────────────────────────────────────────────────────
  // TAB 1 — SANS IMAGE
  // ──────────────────────────────────────────────────────────────────────────────

  const filteredFacts = factsNoImage.filter(f => {
    const catMatch = filterCategory === 'all' || f.category === filterCategory
    const statusMatch = filterType === 'all' || (filterType === 'draft' ? f.status !== 'published' : f.status === 'published')
    return catMatch && statusMatch
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

  const toggleExpand = (id) => {
    setExpandedFacts(prev => ({
      ...prev,
      [id]: !prev[id],
    }))
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
      await callEdgeFunction('generate-image-directions', {
        fact_ids: selectedIds,
        fact_type: selectedObjs[0]?.is_vip ? 'vip' : 'funny',
      })

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

  const handleSelectStyle = (itemId, styleId) => {
    setSelectedStyles(prev => ({
      ...prev,
      [itemId]: selectedStyles[itemId] === styleId ? null : styleId,
    }))
  }

  const handleValidateDirection = async (pipelineId) => {
    const selected = selectedDirections[pipelineId]
    const custom = customDirections[pipelineId]
    const selectedStyle = selectedStyles[pipelineId]

    if (!selected && !custom && !selectedStyle) {
      showToast('⚠️ Choisir une direction ou un style')
      return
    }

    setValidatingDirectionId(pipelineId)
    try {
      // Determine direction to use: custom > selected style > default selected direction
      let directionToUse = custom || selectedStyle || selected || null

      // Step 1: Update image_pipeline with direction
      const { error } = await supabase
        .from('image_pipeline')
        .update({
          selected_direction: directionToUse,
          custom_direction: custom || null,
          status: 'direction_selected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', pipelineId)

      if (error) throw error

      console.log(`✓ Direction validée pour pipeline #${pipelineId}`)

      // Step 2: Call generate-image Edge Function
      await callEdgeFunction('generate-image', { pipeline_id: pipelineId })
      showToast('✅ Direction validée ! Génération de l\'image en cours...')
      // Step 3: Switch to Validation tab after 1.5s delay
      setTimeout(() => {
        setTab('validation')
        fetchValidationQueue()
        setValidatingDirectionId(null)
      }, 1500)
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

      // 1. Update image_pipeline status first
      const { error: updatePipeline } = await supabase
        .from('image_pipeline')
        .update({ status: 'validated', final_image_url: imageUrl, updated_at: new Date().toISOString() })
        .eq('id', pipelineId)

      if (updatePipeline) throw updatePipeline

      // 2. ICI et UNIQUEMENT ICI : update facts.image_url
      const { error: updateFact } = await supabase
        .from('facts')
        .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
        .eq('id', pipeline.fact_id)

      if (updateFact) throw updateFact

      showToast('✅ Image validée et ajoutée au fact')
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
      const pipeline = validationQueue.find(p => p.id === pipelineId)
      if (!pipeline) throw new Error('Pipeline not found')

      // Delete image from Storage
      if (pipeline.image_url) {
        const path = pipeline.image_url.split('/fact-images/')[1]
        if (path) {
          const { error: deleteError } = await supabase.storage
            .from('fact-images')
            .remove([path])
          if (deleteError) console.error('Error deleting image from storage:', deleteError)
        }
      }

      // Update pipeline: status = rejected + clear image_url (facts.image_url stays null)
      const { error } = await supabase
        .from('image_pipeline')
        .update({ status: 'rejected', image_url: null, updated_at: new Date().toISOString() })
        .eq('id', pipelineId)

      if (error) throw error

      showToast('✅ Image rejetée — le fact revient dans Sans image')
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
      const pipeline = validationQueue.find(p => p.id === pipelineId)
      if (!pipeline) throw new Error('Pipeline not found')

      // Delete old image from Storage
      if (pipeline.image_url) {
        const path = pipeline.image_url.split('/fact-images/')[1]
        if (path) {
          const { error: deleteError } = await supabase.storage
            .from('fact-images')
            .remove([path])
          if (deleteError) console.error('Error deleting old image from storage:', deleteError)
        }
      }

      // Update pipeline: status = directions_generated + clear image_url + reset selected_direction
      const { error } = await supabase
        .from('image_pipeline')
        .update({
          status: 'directions_generated',
          image_url: null,
          selected_direction: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', pipelineId)

      if (error) throw error

      showToast('✅ Image supprimée — rechoisissez une direction')
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

      {/* Header with left section (title + counters + tabs) and right section (visual guide) */}
      <div style={{
        display: 'flex',
        gap: '24px',
        marginBottom: '32px',
        alignItems: 'flex-start',
      }}>
        {/* LEFT: Title, Counters, Tabs */}
        <div style={{ flex: 1 }}>
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
            marginBottom: '16px',
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

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: '8px',
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
        </div>

        {/* RIGHT: Visual Styles Guide */}
        <div style={{
          width: '300px',
          flexShrink: 0,
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '10px',
          padding: '8px',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{
            fontWeight: 800,
            fontSize: '10px',
            color: 'rgba(255,255,255,0.6)',
            marginBottom: '8px',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            STYLES VISUELS
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '4px',
          }}>
            {[
              { id: 'realiste', label: 'Realiste', emoji: '📷', img: '/assets/guide/style-realiste.png' },
              { id: 'humoristique', label: 'Humoristique', emoji: '😂', img: '/assets/guide/style-humoristique.png' },
              { id: 'metaphorique', label: 'Metaphorique', emoji: '🎭', img: '/assets/guide/style-metaphorique.png' },
              { id: 'retro', label: 'Retro Pop Art', emoji: '🎨', img: '/assets/guide/style-retro.png' },
              { id: 'ultra-realiste-absurde', label: 'Ultra Realiste Absurde', emoji: '📸', img: '/assets/guide/style-ultra-realiste-absurde.png' },
              { id: 'wtf-cinematique', label: 'WTF Cinematique', emoji: '🤯', img: '/assets/guide/style-wtf-cinematique.png' },
            ].map(s => (
              <div key={s.id} style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '6px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{
                  width: '100%',
                  aspectRatio: '1/1',
                  overflow: 'hidden',
                  borderRadius: '4px 4px 0 0',
                }}>
                  <img src={s.img} style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }} alt={s.label} />
                </div>
                <div style={{
                  padding: '4px',
                  textAlign: 'center',
                }}>
                  <div style={{
                    fontWeight: 700,
                    fontSize: '8px',
                    color: 'white',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {s.emoji} {s.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
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
              <div style={{ position: 'relative' }} data-category-dropdown>
                <input
                  value={categorySearch}
                  onChange={e => { setCategorySearch(e.target.value); setShowCategoryDropdown(true) }}
                  onFocus={() => setShowCategoryDropdown(true)}
                  placeholder="Filtrer par categorie..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: '#1a1a2e', color: 'white', border: '1px solid rgba(255,255,255,0.15)', fontSize: 13, fontFamily: 'Nunito, sans-serif' }}
                />
                {showCategoryDropdown && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: 250, overflowY: 'auto', background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0 0 8px 8px', zIndex: 20, marginTop: 2 }}>
                    <div
                      onClick={() => { setFilterCategory('all'); setCategorySearch(''); setShowCategoryDropdown(false) }}
                      style={{ padding: '8px 12px', cursor: 'pointer', color: filterCategory === 'all' ? '#FF6B1A' : 'rgba(255,255,255,0.7)', fontSize: 12, borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: 'Nunito, sans-serif' }}
                    >
                      Toutes les categories
                    </div>
                    {categories
                      .filter(c => !categorySearch || c.toLowerCase().includes(categorySearch.toLowerCase()))
                      .map(cat => (
                        <div
                          key={cat}
                          onClick={() => { setFilterCategory(cat); setCategorySearch(cat); setShowCategoryDropdown(false) }}
                          style={{ padding: '8px 12px', cursor: 'pointer', color: filterCategory === cat ? '#FF6B1A' : 'rgba(255,255,255,0.7)', fontSize: 12, borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: 'Nunito, sans-serif' }}
                        >
                          {cat}
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <label style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.7)',
                display: 'block',
                marginBottom: '6px',
              }}>
                Statut
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
                <option value="draft">Brouillons</option>
                <option value="published">Publiés</option>
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

            {paginatedFacts.map((fact, idx) => (
              <div key={fact.id}>
                {/* Closed row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    cursor: 'pointer',
                    background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                  onClick={() => toggleExpand(fact.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedFacts.has(fact.id)}
                    onChange={() => handleSelectFact(fact.id)}
                    onClick={e => e.stopPropagation()}
                    style={{ cursor: 'pointer' }}
                  />
                  <img
                    src={'/assets/categories/' + fact.category + '.png'}
                    style={{ width: 24, height: 24, objectFit: 'contain' }}
                    alt=""
                    onError={e => e.target.style.display = 'none'}
                  />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 700, minWidth: 40 }}>
                    #{fact.id}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: 'white',
                      fontWeight: 600,
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {fact.question}
                  </span>
                  <span
                    style={{
                      fontSize: 16,
                      color: 'rgba(255,255,255,0.3)',
                      transform: expandedFacts[fact.id] ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  >
                    ▼
                  </span>
                </div>

                {/* Expanded row */}
                {expandedFacts[fact.id] && (
                  <div style={{ padding: '8px 12px 16px 46px', borderTop: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: '#FF6B1A', fontWeight: 700 }}>Réponse : </span>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{fact.short_answer}</span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: '#FF6B1A', fontWeight: 700 }}>Explication : </span>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                        {fact.explanation || 'Non renseignée'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <div>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Indice 1 : </span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{fact.hint1 || '—'}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Indice 2 : </span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{fact.hint2 || '—'}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Indice 3 : </span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{fact.hint3 || '—'}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Indice 4 : </span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{fact.hint4 || '—'}</span>
                      </div>
                    </div>
                  </div>
                )}
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
                  }}
                >
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
                  {!item.directions || item.directions.length === 0 ? (
                    <div style={{
                      padding: '16px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '12px',
                      fontSize: '13px',
                      color: 'rgba(255,255,255,0.5)',
                      marginBottom: '16px',
                      textAlign: 'center',
                    }}>
                      Directions non générées
                    </div>
                  ) : (
                    <div style={{ marginBottom: '16px' }}>
                      {item.directions.map(dir => (
                        <div key={dir.id} style={{ marginBottom: '16px' }}>
                          {/* Titre de la direction */}
                          <div style={{ fontWeight: 900, fontSize: '13px', marginBottom: '12px', color: '#FF6B1A' }}>
                            {STYLE_LABELS[dir.style] || dir.style}
                          </div>

                          {/* Description de la direction */}
                          <div style={{
                            fontSize: 15,
                            color: 'rgba(255,255,255,0.8)',
                            lineHeight: 1.6,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            padding: '16px',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: '8px',
                            marginBottom: '12px',
                          }}>
                            {dir.description}
                          </div>

                          {/* Style selector buttons + Select button */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12, alignItems: 'center' }}>
                            {[
                              { id: 'realiste', label: 'Realiste', emoji: '📷' },
                              { id: 'humoristique', label: 'Humoristique', emoji: '😂' },
                              { id: 'metaphorique', label: 'Metaphorique', emoji: '🎭' },
                              { id: 'retro', label: 'Retro Pop Art', emoji: '🎨' },
                              { id: 'ultra_realiste_absurde', label: 'Ultra Realiste Absurde', emoji: '📸' },
                              { id: 'wtf_cinematique', label: 'WTF Cinematique', emoji: '🤯' },
                            ].map(style => {
                              const isSelected = selectedStyles[item.id] === style.id
                              return (
                                <button
                                  key={style.id}
                                  onClick={() => handleSelectStyle(item.id, style.id)}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: 8,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    border: isSelected ? '2px solid #FF6B1A' : '1px solid rgba(255,255,255,0.15)',
                                    background: isSelected ? 'rgba(255,107,26,0.2)' : 'rgba(255,255,255,0.05)',
                                    color: isSelected ? '#FF6B1A' : 'rgba(255,255,255,0.7)',
                                    transition: 'all 0.2s',
                                  }}
                                >
                                  {style.emoji} {style.label}
                                </button>
                              )
                            })}
                            {/* Sélectionner cette direction button — vert, à droite */}
                            <button
                              onClick={() => handleSelectDirection(item.id, dir.style)}
                              style={{
                                padding: '6px 14px',
                                borderRadius: 8,
                                fontSize: 11,
                                fontWeight: 700,
                                background: 'rgba(34,197,94,0.2)',
                                color: '#22c55e',
                                border: '2px solid #22c55e',
                                cursor: 'pointer',
                                marginLeft: 'auto',
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={e => {
                                e.target.style.background = 'rgba(34,197,94,0.3)'
                              }}
                              onMouseLeave={e => {
                                e.target.style.background = 'rgba(34,197,94,0.2)'
                              }}
                            >
                              ✅ {selectedDirections[item.id] === dir.style ? 'Sélectionnée' : 'Sélectionner'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

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

                  {/* Bottom buttons — Valider direction + Supprimer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={() => handleValidateDirection(item.id)}
                      disabled={!selectedDirections[item.id] && !customDirections[item.id] && !selectedStyles[item.id] || validatingDirectionId === item.id}
                      style={{
                        flex: 1,
                        padding: '10px 20px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: 900,
                        background:
                          !selectedDirections[item.id] && !customDirections[item.id] && !selectedStyles[item.id]
                            ? 'rgba(255,255,255,0.1)'
                            : '#0ea5e9',
                        color: 'white',
                        border: 'none',
                        cursor: !selectedDirections[item.id] && !customDirections[item.id] && !selectedStyles[item.id] || validatingDirectionId === item.id ? 'not-allowed' : 'pointer',
                        opacity: validatingDirectionId === item.id ? 0.6 : 1,
                        transition: 'all 0.2s',
                      }}
                    >
                      {validatingDirectionId === item.id ? '⏳ Validation en cours...' : '✅ Valider direction'}
                    </button>

                    <button
                      onClick={() => handleDeleteFromPipeline(item.id)}
                      style={{
                        padding: '10px 16px',
                        background: 'rgba(239,68,68,0.15)',
                        color: '#ef4444',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '8px',
                        fontSize: '13px',
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
                  </div>
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
