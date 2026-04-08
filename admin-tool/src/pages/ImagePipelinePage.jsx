import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CATEGORIES } from '../constants/categories'

export default function ImagePipelinePage() {
  const [tab, setTab] = useState('noimage') // 'noimage', 'directions', 'validation'
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  // Tab 1 — Sans image
  const [factsNoImage, setFactsNoImage] = useState([])
  const [selectedFacts, setSelectedFacts] = useState(new Set())
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [countNoImage, setCountNoImage] = useState(0)
  const [categories, setCategories] = useState([])

  // Tab 2 — Directions
  const [directionsQueue, setDirectionsQueue] = useState([])
  const [selectedDirections, setSelectedDirections] = useState({}) // { pipeline_id: direction_name }
  const [customDirections, setCustomDirections] = useState({}) // { pipeline_id: custom_text }

  // Tab 3 — Validation
  const [validationQueue, setValidationQueue] = useState([])
  const [countValidation, setCountValidation] = useState(0)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  // Fetch categories from Supabase
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('facts')
        .select('category', { count: 'exact' })
        .neq('category', null)

      if (error) throw error

      // Extract distinct categories
      const uniqueCategories = [...new Set(data.map(f => f.category))].sort()
      setCategories(uniqueCategories)
    } catch (err) {
      console.error('Erreur chargement catégories:', err)
      // Fallback to CATEGORIES from constants
      setCategories(CATEGORIES.map(c => c.id))
    }
  }

  // Fetch Tab 1 data
  const fetchNoImageFacts = async () => {
    setLoading(true)
    try {
      const { data: facts, error } = await supabase
        .from('facts')
        .select('id, question, category, is_vip, type')
        .or('image_url.is.null,image_url.eq.""')
        .order('id', { ascending: false })

      if (error) throw error

      setFactsNoImage(facts || [])
      setCountNoImage(facts?.length || 0)
    } catch (err) {
      console.error(err)
      showToast('Erreur chargement facts sans image')
    } finally {
      setLoading(false)
    }
  }

  // Fetch Tab 2 data
  const fetchDirectionsQueue = async () => {
    setLoading(true)
    try {
      const { data: pipeline, error } = await supabase
        .from('image_pipeline')
        .select('*, facts(id, question, short_answer, category, is_vip, type)')
        .eq('status', 'directions_generated')
        .order('created_at', { ascending: true })

      if (error) throw error

      setDirectionsQueue(pipeline || [])
    } catch (err) {
      console.error(err)
      showToast('Erreur chargement directions')
    } finally {
      setLoading(false)
    }
  }

  // Fetch Tab 3 data
  const fetchValidationQueue = async () => {
    setLoading(true)
    try {
      const { data: pipeline, error } = await supabase
        .from('image_pipeline')
        .select('*, facts(id, question, short_answer, category)')
        .eq('status', 'image_generated')
        .order('created_at', { ascending: true })

      if (error) throw error

      setValidationQueue(pipeline || [])
      setCountValidation(pipeline?.length || 0)
    } catch (err) {
      console.error(err)
      showToast('Erreur chargement validation')
    } finally {
      setLoading(false)
    }
  }

  // Load data when tab changes
  useEffect(() => {
    fetchCategories() // Load categories once on mount
    if (tab === 'noimage') fetchNoImageFacts()
    else if (tab === 'directions') fetchDirectionsQueue()
    else if (tab === 'validation') fetchValidationQueue()
  }, [tab])

  // Filter facts
  const filteredFacts = factsNoImage.filter(f => {
    const catMatch = filterCategory === 'all' || f.category === filterCategory
    const typeMatch = filterType === 'all' || (filterType === 'vip' ? f.is_vip : !f.is_vip) // 'generated' = !is_vip
    return catMatch && typeMatch
  })

  // Tab 1 handlers
  const handleSelectFact = (id) => {
    const newSet = new Set(selectedFacts)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedFacts(newSet)
  }

  const handleGenerateDirections = async () => {
    if (selectedFacts.size === 0) return
    setLoading(true)
    try {
      const factsToInsert = Array.from(selectedFacts).map(id => ({
        fact_id: id,
        status: 'pending',
        fact_type: 'funny', // Default — could be 'vip' if needed
      }))

      const { error } = await supabase
        .from('image_pipeline')
        .insert(factsToInsert)

      if (error) throw error

      showToast(`✓ ${selectedFacts.size} facts en attente de directions`)
      setSelectedFacts(new Set())
      fetchNoImageFacts()
    } catch (err) {
      console.error(err)
      showToast('Erreur création pipeline')
    } finally {
      setLoading(false)
    }
  }

  // Tab 2 handlers
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

  const handleGenerateImage = async (pipelineId) => {
    const selected = selectedDirections[pipelineId]
    const custom = customDirections[pipelineId]

    if (!selected && !custom) {
      showToast('Choisir ou écrire une direction')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('image_pipeline')
        .update({
          selected_direction: selected || null,
          custom_direction: custom || null,
          status: 'generating',
          updated_at: new Date().toISOString(),
        })
        .eq('id', pipelineId)

      if (error) throw error

      showToast('✓ Image en génération')
      fetchDirectionsQueue()
    } catch (err) {
      console.error(err)
      showToast('Erreur génération image')
    } finally {
      setLoading(false)
    }
  }

  // Tab 3 handlers
  const handleValidate = async (pipelineId, imageUrl) => {
    if (!imageUrl) {
      showToast('Pas d\'image à valider')
      return
    }

    setLoading(true)
    try {
      // TODO: Copy image to Supabase Storage, get public URL
      // For now, assume imageUrl is already a public URL

      const pipeline = validationQueue.find(p => p.id === pipelineId)
      if (!pipeline) throw new Error('Pipeline not found')

      const { error: updateFact } = await supabase
        .from('facts')
        .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
        .eq('id', pipeline.fact_id)

      if (updateFact) throw updateFact

      const { error: updatePipeline } = await supabase
        .from('image_pipeline')
        .update({ status: 'validated', final_image_url: imageUrl, updated_at: new Date().toISOString() })
        .eq('id', pipelineId)

      if (updatePipeline) throw updatePipeline

      showToast('✓ Image validée')
      fetchValidationQueue()
    } catch (err) {
      console.error(err)
      showToast('Erreur validation')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async (pipelineId) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('image_pipeline')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', pipelineId)

      if (error) throw error

      showToast('✓ Image rejetée')
      fetchValidationQueue()
    } catch (err) {
      console.error(err)
      showToast('Erreur rejet')
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerate = async (pipelineId) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('image_pipeline')
        .update({ status: 'directions_generated', updated_at: new Date().toISOString() })
        .eq('id', pipelineId)

      if (error) throw error

      showToast('✓ Retour à la sélection de direction')
      fetchValidationQueue()
      fetchDirectionsQueue()
    } catch (err) {
      console.error(err)
      showToast('Erreur régénération')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', color: 'white', fontFamily: 'Nunito, sans-serif' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 1000,
          background: '#10b981', color: 'white',
          padding: '12px 20px', borderRadius: 12,
          fontWeight: 700, fontSize: 14,
        }}>
          {toast}
        </div>
      )}

      {/* Header avec compteurs */}
      <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <h1 style={{ margin: 0, marginBottom: 16, fontSize: 28, fontWeight: 900 }}>📸 Pipeline d'Images</h1>
        <div style={{
          display: 'flex', gap: 20, flexWrap: 'wrap',
          fontSize: 14, fontWeight: 700,
        }}>
          <div>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>Sans image</span> {' '}
            <span style={{ background: 'rgba(255,107,26,0.2)', color: '#FF6B1A', padding: '4px 10px', borderRadius: 6, fontWeight: 900 }}>
              {countNoImage}
            </span>
          </div>
          <div>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>Directions</span> {' '}
            <span style={{ background: 'rgba(147,51,234,0.2)', color: '#a855f7', padding: '4px 10px', borderRadius: 6, fontWeight: 900 }}>
              {directionsQueue.length}
            </span>
          </div>
          <div>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>À valider</span> {' '}
            <span style={{ background: 'rgba(14,165,233,0.2)', color: '#0ea5e9', padding: '4px 10px', borderRadius: 6, fontWeight: 900 }}>
              {countValidation}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0 24px' }}>
        {[
          { id: 'noimage', label: 'Sans image', icon: '📭' },
          { id: 'directions', label: 'Directions', icon: '🎨' },
          { id: 'validation', label: 'Validation', icon: '✅' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '16px 24px', fontSize: 14, fontWeight: 700,
              background: 'transparent', border: 'none', color: tab === t.id ? 'white' : 'rgba(255,255,255,0.5)',
              borderBottom: tab === t.id ? '2px solid #FF6B1A' : 'none',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '24px' }}>
        {/* TAB 1 — Sans image */}
        {tab === 'noimage' && (
          <div>
            <div style={{
              display: 'flex', gap: 12, marginBottom: 20,
              background: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Catégorie</label>
                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px', marginTop: 6,
                    background: 'rgba(255,255,255,0.08)', color: 'white',
                    border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, fontSize: 13,
                  }}
                >
                  <option value="all">Tous</option>
                  {categories.map(catId => (
                    <option key={catId} value={catId}>
                      {CATEGORIES.find(c => c.id === catId)?.label || catId}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Type</label>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px', marginTop: 6,
                    background: 'rgba(255,255,255,0.08)', color: 'white',
                    border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, fontSize: 13,
                  }}
                >
                  <option value="all">Tous</option>
                  <option value="vip">VIP</option>
                  <option value="generated">Générés</option>
                </select>
              </div>
            </div>

            {/* Facts list */}
            <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
              {filteredFacts.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                  Aucun fact sans image
                </div>
              ) : (
                filteredFacts.map(fact => (
                  <div
                    key={fact.id}
                    style={{
                      display: 'flex', gap: 12, alignItems: 'center',
                      background: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFacts.has(fact.id)}
                      onChange={() => handleSelectFact(fact.id)}
                      style={{ width: 20, height: 20, cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>#{fact.id} — {fact.question.slice(0, 60)}...</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                        {CATEGORIES.find(c => c.id === fact.category)?.label || fact.category}
                        {fact.is_vip && ' • VIP'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerateDirections}
              disabled={selectedFacts.size === 0 || loading}
              style={{
                padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 900,
                background: selectedFacts.size === 0 ? 'rgba(255,255,255,0.1)' : '#FF6B1A',
                color: 'white', border: 'none', cursor: selectedFacts.size === 0 ? 'not-allowed' : 'pointer',
                opacity: selectedFacts.size === 0 ? 0.5 : 1,
              }}
            >
              🎨 Générer directions ({selectedFacts.size})
            </button>
          </div>
        )}

        {/* TAB 2 — Directions */}
        {tab === 'directions' && (
          <div>
            {directionsQueue.length === 0 ? (
              <div style={{
                padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.5)',
                background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
              }}>
                Aucun fact en attente. Générez des directions d'abord. 👈
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 20 }}>
                {directionsQueue.map(item => (
                  <div
                    key={item.id}
                    style={{
                      background: 'rgba(255,255,255,0.05)', padding: 20, borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                        {item.facts?.question}
                      </div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                        ✓ {item.facts?.short_answer}
                      </div>
                    </div>

                    {/* Directions - placeholder (would come from API) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 16 }}>
                      {['Art moderne', 'Meme fun', 'Photo réelle', 'Dessin manga', 'Emoji'].map(dir => (
                        <button
                          key={dir}
                          onClick={() => handleSelectDirection(item.id, dir)}
                          style={{
                            padding: '10px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                            background: selectedDirections[item.id] === dir ? '#a855f7' : 'rgba(255,255,255,0.08)',
                            color: 'white', border: '1px solid rgba(255,255,255,0.2)',
                            cursor: 'pointer',
                          }}
                        >
                          {dir}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      placeholder="Ou écris ta propre direction..."
                      value={customDirections[item.id] || ''}
                      onChange={e => handleCustomDirection(item.id, e.target.value)}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 13,
                        background: 'rgba(255,255,255,0.08)', color: 'white',
                        border: '1px solid rgba(255,255,255,0.2)', marginBottom: 12,
                      }}
                    />

                    <button
                      onClick={() => handleGenerateImage(item.id)}
                      disabled={!selectedDirections[item.id] && !customDirections[item.id] || loading}
                      style={{
                        padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 900,
                        background: (!selectedDirections[item.id] && !customDirections[item.id]) ? 'rgba(255,255,255,0.1)' : '#0ea5e9',
                        color: 'white', border: 'none', cursor: 'pointer',
                      }}
                    >
                      🚀 Générer image
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
                padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.5)',
                background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
              }}>
                Aucune image à valider. 🎉
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 20 }}>
                {validationQueue.map(item => (
                  <div
                    key={item.id}
                    style={{
                      background: 'rgba(255,255,255,0.05)', padding: 20, borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.1)',
                      display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
                        {item.facts?.question}
                      </div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>
                        ✓ {item.facts?.short_answer}
                      </div>

                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          onClick={() => handleValidate(item.id, item.image_url)}
                          style={{
                            flex: 1, padding: '12px 16px', borderRadius: 8, fontSize: 13, fontWeight: 900,
                            background: '#10b981', color: 'white', border: 'none', cursor: 'pointer',
                          }}
                        >
                          ✅ Valider
                        </button>
                        <button
                          onClick={() => handleReject(item.id)}
                          style={{
                            flex: 1, padding: '12px 16px', borderRadius: 8, fontSize: 13, fontWeight: 900,
                            background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer',
                          }}
                        >
                          ❌ Rejeter
                        </button>
                        <button
                          onClick={() => handleRegenerate(item.id)}
                          style={{
                            flex: 1, padding: '12px 16px', borderRadius: 8, fontSize: 13, fontWeight: 900,
                            background: '#f59e0b', color: 'white', border: 'none', cursor: 'pointer',
                          }}
                        >
                          🔄 Régénérer
                        </button>
                      </div>
                    </div>

                    <div>
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt="Generated"
                          style={{
                            width: '100%', maxWidth: 300, borderRadius: 8,
                            background: 'rgba(0,0,0,0.3)',
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '100%', maxWidth: 300, height: 200, borderRadius: 8,
                          background: 'rgba(255,255,255,0.05)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)',
                        }}>
                          Pas d'image
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
