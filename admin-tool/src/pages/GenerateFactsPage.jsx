import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { CATEGORIES } from '../constants/categories'
import { callEdgeFunction } from '../utils/helpers'

// ── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'standard', label: 'Standard', icon: '⚡', desc: 'Volume rapide' },
  { id: 'vip',      label: 'VIP',      icon: '⭐', desc: 'Qualité WTF!' },
]

// ── Archetype labels ─────────────────────────────────────────────────────────
const ARCHETYPES = [
  { id: 1, label: 'Absurde Institutionnel', emoji: '⚖️' },
  { id: 2, label: 'Retournement Tragique',  emoji: '💀' },
  { id: 3, label: 'Proximité Dérangeante',  emoji: '😱' },
  { id: 4, label: 'Existence Impossible',   emoji: '🤯' },
  { id: 5, label: 'Survie/Mort Absurde',    emoji: '🎲' },
  { id: 6, label: 'Animal Humain',          emoji: '🐾' },
  { id: 7, label: 'Formulation Piège',      emoji: '🪤' },
]

function getArchetype(id) {
  return ARCHETYPES.find(a => a.id === id) || { id, label: `Archétype ${id}`, emoji: '?' }
}

// ── WTF Score colors ─────────────────────────────────────────────────────────
function wtfColor(score) {
  if (score >= 4) return '#FFD700'
  if (score >= 3) return '#FF6B1A'
  return '#6B7280'
}

export default function GenerateFactsPage({ toast }) {
  const [tab, setTab] = useState('standard')

  // ── Standard mode state ──────────────────────────────────────────────────
  const [stdCategory, setStdCategory] = useState('')
  const [stdTheme, setStdTheme] = useState('')
  const [stdCount, setStdCount] = useState(5)
  const [stdLoading, setStdLoading] = useState(false)
  const [stdResults, setStdResults] = useState([])
  const [stdMessage, setStdMessage] = useState('')

  // ── VIP mode state ───────────────────────────────────────────────────────
  const [vipTheme, setVipTheme] = useState('')
  const [vipCategory, setVipCategory] = useState('')
  const [vipCount, setVipCount] = useState(3)
  const [vipLoading, setVipLoading] = useState(false)
  const [vipResults, setVipResults] = useState([]) // array of { raw_fact, explanation, source_url, formulations: [...] }
  const [vipMessage, setVipMessage] = useState('')
  const [selectedFormulations, setSelectedFormulations] = useState({}) // { factIndex: formulationIndex }

  // ── Standard generation ────────────────────────────────────────────────
  async function generateStandard() {
    if (!stdCategory) { toast?.('Catégorie requise', 'warn'); return }
    setStdLoading(true)
    setStdMessage('Génération en cours...')
    setStdResults([])
    try {
      const catObj = CATEGORIES.find(c => c.id === stdCategory)
      const categoryLabel = catObj ? `${catObj.emoji} ${catObj.label}` : stdCategory
      const result = await callEdgeFunction('generate-facts', {
        category: stdCategory, categoryLabel, count: stdCount, theme: stdTheme || undefined,
      })
      setStdResults(Array.isArray(result) ? result : [])
      setStdMessage(`${(Array.isArray(result) ? result : []).length} f*cts générés`)
    } catch (err) {
      setStdMessage(`Erreur : ${err.message}`)
    } finally {
      setStdLoading(false)
    }
  }

  // ── VIP generation ─────────────────────────────────────────────────────
  async function generateVip() {
    if (!vipCategory) { toast?.('Catégorie requise', 'warn'); return }
    if (!vipTheme) { toast?.('Sous-thème requis', 'warn'); return }
    setVipLoading(true)
    setVipMessage('Recherche de faits insolites + 3 formulations par fait...')
    setVipResults([])
    setSelectedFormulations({})
    try {
      const catObj = CATEGORIES.find(c => c.id === vipCategory)
      const categoryLabel = catObj ? `${catObj.emoji} ${catObj.label}` : vipCategory
      const result = await callEdgeFunction('generate-vip-facts', {
        category: vipCategory, categoryLabel, count: vipCount, theme: vipTheme,
      })
      setVipResults(Array.isArray(result) ? result : [])
      const count = Array.isArray(result) ? result.length : 0
      setVipMessage(count > 0 ? `${count} faits trouvés — choisis la meilleure formulation pour chacun` : 'Aucun fait trouvé')
    } catch (err) {
      setVipMessage(`Erreur : ${err.message}`)
    } finally {
      setVipLoading(false)
    }
  }

  // ── Save a single VIP fact (selected formulation) ──────────────────────
  async function saveVipFact(factIndex) {
    const fact = vipResults[factIndex]
    const formIndex = selectedFormulations[factIndex]
    if (formIndex == null || !fact?.formulations?.[formIndex]) {
      toast?.('Sélectionne une formulation d\'abord', 'warn')
      return
    }
    const form = fact.formulations[formIndex]
    try {
      const { data: maxData } = await supabase
        .from('facts').select('id').order('id', { ascending: false }).limit(1)
      const newId = (maxData?.[0]?.id || 0) + 1

      const { error } = await supabase.from('facts').insert({
        id: newId,
        category: fact.category || vipCategory,
        question: form.question,
        short_answer: form.short_answer,
        answer: form.short_answer || '',
        explanation: fact.explanation || null,
        source_url: fact.source_url || null,
        hint1: form.hint1 || null,
        hint2: form.hint2 || null,
        hint3: '',
        hint4: '',
        correct_index: 0,
        image_url: null,
        is_vip: true,
        type: 'vip',
        status: 'draft',
        is_published: false,
        pack_id: 'free',
        vip_usage: 'available',
        difficulty: 'Normal',
        funny_wrong_1: form.funny_wrong_1 || null,
        funny_wrong_2: form.funny_wrong_2 || null,
        close_wrong_1: form.close_wrong_1 || null,
        close_wrong_2: form.close_wrong_2 || null,
        plausible_wrong_1: form.plausible_wrong_1 || null,
        plausible_wrong_2: form.plausible_wrong_2 || null,
        plausible_wrong_3: form.plausible_wrong_3 || null,
        updated_at: new Date().toISOString(),
      })
      if (error) throw error
      toast?.(`Fact #${newId} sauvegardé en brouillon VIP`)
      // Mark as saved
      setVipResults(prev => prev.map((f, i) => i === factIndex ? { ...f, _saved: true } : f))
    } catch (err) {
      toast?.(`Erreur : ${err.message}`, 'error')
    }
  }

  // ── Save standard facts ────────────────────────────────────────────────
  async function saveStandardResults() {
    if (!stdResults.length) return
    let saved = 0
    for (const f of stdResults) {
      try {
        const { data: maxData } = await supabase
          .from('facts').select('id').order('id', { ascending: false }).limit(1)
        const newId = (maxData?.[0]?.id || 0) + 1
        const { error } = await supabase.from('facts').insert({
          id: newId, category: f.category, question: f.question,
          hint1: f.hint1 || null, hint2: f.hint2 || null, hint3: f.hint3 || null, hint4: f.hint4 || null,
          short_answer: f.short_answer, answer: f.short_answer || '',
          explanation: f.explanation || null, source_url: f.source_url || null,
          correct_index: f.correct_index ?? 0, image_url: null,
          is_vip: false, type: 'generated', status: 'draft', is_published: false,
          pack_id: 'free', vip_usage: 'available', difficulty: f.difficulty || 'Normal',
          funny_wrong_1: f.funny_wrong_1 || null, funny_wrong_2: f.funny_wrong_2 || null,
          close_wrong_1: f.close_wrong_1 || null, close_wrong_2: f.close_wrong_2 || null,
          plausible_wrong_1: f.plausible_wrong_1 || null, plausible_wrong_2: f.plausible_wrong_2 || null,
          plausible_wrong_3: f.plausible_wrong_3 || null,
          updated_at: new Date().toISOString(),
        })
        if (!error) saved++
      } catch (err) { console.error(err) }
    }
    toast?.(`${saved} f*cts sauvegardés en brouillon`)
    setStdResults([])
    setStdMessage('')
  }

  // ── Save all selected VIP facts ────────────────────────────────────────
  async function saveAllVipFacts() {
    const indicesToSave = Object.keys(selectedFormulations).map(Number).filter(i => !vipResults[i]?._saved)
    if (!indicesToSave.length) { toast?.('Aucun fait sélectionné à sauvegarder', 'warn'); return }
    for (const i of indicesToSave) {
      await saveVipFact(i)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────
  const selectCls = "w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none"
  const inputCls = "w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none placeholder-slate-500"

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Générer des f*cts</h1>
        <p className="text-slate-400 text-sm mt-1">Standard = volume rapide. VIP = 1 fait + 3 formulations au choix.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black transition-all"
            style={{
              background: tab === t.id ? (t.id === 'vip' ? 'rgba(255,215,0,0.15)' : 'rgba(255,107,26,0.15)') : 'rgba(30,41,59,1)',
              color: tab === t.id ? (t.id === 'vip' ? '#FFD700' : '#FF6B1A') : '#64748B',
              border: `1px solid ${tab === t.id ? (t.id === 'vip' ? '#FFD70040' : '#FF6B1A40') : '#334155'}`,
            }}
          >
            <span className="text-lg">{t.icon}</span>
            <div className="text-left">
              <div>{t.label}</div>
              <div className="text-[10px] font-semibold opacity-60">{t.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* ══════════ STANDARD MODE ══════════ */}
      {tab === 'standard' && (
        <div className="space-y-6">
          <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
            <h2 className="text-base font-black text-white mb-1">⚡ Mode Standard</h2>
            <p className="text-slate-400 text-xs mb-4">Génère des f*cts en volume via le prompt classique.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Catégorie</label>
                <select value={stdCategory} onChange={e => setStdCategory(e.target.value)} disabled={stdLoading} className={selectCls}>
                  <option value="">Choisir…</option>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Thème (optionnel)</label>
                <input value={stdTheme} onChange={e => setStdTheme(e.target.value)} disabled={stdLoading} placeholder="Ex: Les inventions du 20e siècle..." className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Nombre</label>
                <select value={stdCount} onChange={e => setStdCount(Number(e.target.value))} disabled={stdLoading} className={selectCls}>
                  {[3, 5, 10].map(n => <option key={n} value={n}>{n} f*cts</option>)}
                </select>
              </div>
            </div>
            <button onClick={generateStandard} disabled={stdLoading || !stdCategory}
              className="px-5 py-2.5 rounded-xl font-black text-sm text-white transition-all active:scale-95 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #FF6B1A, #D94A10)' }}>
              {stdLoading ? <><span className="inline-block animate-spin mr-2">⟳</span>Génération...</> : '⚡ Générer'}
            </button>
            {stdMessage && <div className="mt-3 text-sm font-semibold" style={{ color: stdMessage.startsWith('Erreur') ? '#EF4444' : '#22C55E' }}>{stdMessage}</div>}
          </div>

          {stdResults.length > 0 && (
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
                <h3 className="text-sm font-black text-white">{stdResults.length} f*cts générés</h3>
                <button onClick={saveStandardResults} className="px-4 py-2 rounded-xl text-xs font-black text-white active:scale-95" style={{ background: '#22C55E' }}>
                  Sauvegarder tous en brouillon
                </button>
              </div>
              <div className="divide-y divide-slate-700 max-h-96 overflow-y-auto">
                {stdResults.map((f, i) => (
                  <div key={i} className="px-5 py-3">
                    <div className="text-sm text-white font-semibold mb-1">{f.question}</div>
                    <div className="text-xs font-bold" style={{ color: '#FF6B1A' }}>{f.short_answer}</div>
                    {f.explanation && <div className="text-xs text-slate-400 mt-1">{f.explanation}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════ VIP MODE ══════════ */}
      {tab === 'vip' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700" style={{ borderColor: '#FFD70030' }}>
            <h2 className="text-base font-black mb-1" style={{ color: '#FFD700' }}>⭐ Mode VIP — 1 fait, 3 formulations</h2>
            <p className="text-slate-400 text-xs mb-4">
              Donne un sous-thème + une catégorie. Claude trouve des faits insolites et propose
              3 formulations différentes (3 archétypes) pour chaque fait. Tu choisis la meilleure.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Sous-thème</label>
                <input value={vipTheme} onChange={e => setVipTheme(e.target.value)} disabled={vipLoading}
                  placeholder="Ex: Dessins animés, Fromages, Prisons..." className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Catégorie</label>
                <select value={vipCategory} onChange={e => setVipCategory(e.target.value)} disabled={vipLoading} className={selectCls}>
                  <option value="">Choisir…</option>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Nombre de faits</label>
                <select value={vipCount} onChange={e => setVipCount(Number(e.target.value))} disabled={vipLoading} className={selectCls}>
                  {[1, 2, 3, 5].map(n => <option key={n} value={n}>{n} fait{n > 1 ? 's' : ''} (× 3 formulations)</option>)}
                </select>
              </div>
            </div>

            <button onClick={generateVip} disabled={vipLoading || !vipCategory || !vipTheme}
              className="px-5 py-2.5 rounded-xl font-black text-sm text-white transition-all active:scale-95 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #FFD700, #B8860B)' }}>
              {vipLoading ? <><span className="inline-block animate-spin mr-2">⟳</span>Recherche + formulations...</> : '⭐ Générer'}
            </button>

            {vipMessage && <div className="mt-3 text-sm font-semibold" style={{ color: vipMessage.startsWith('Erreur') ? '#EF4444' : '#FFD700' }}>{vipMessage}</div>}
          </div>

          {/* VIP Results — 1 card per fact, 3 formulations inside */}
          {vipResults.length > 0 && (
            <>
              {/* Save all button */}
              {Object.keys(selectedFormulations).filter(i => !vipResults[i]?._saved).length > 0 && (
                <div className="flex justify-end">
                  <button onClick={saveAllVipFacts}
                    className="px-5 py-2.5 rounded-xl font-black text-sm transition-all active:scale-95"
                    style={{ background: '#FFD700', color: '#1a1a1a' }}>
                    Sauvegarder les {Object.keys(selectedFormulations).filter(i => !vipResults[i]?._saved).length} sélectionnés
                  </button>
                </div>
              )}

              {vipResults.map((fact, fi) => {
                const isSaved = fact._saved
                const selectedIdx = selectedFormulations[fi]

                return (
                  <div key={fi} className="bg-slate-800 rounded-2xl border overflow-hidden transition-all"
                    style={{ borderColor: isSaved ? '#22C55E40' : '#FFD70030', opacity: isSaved ? 0.6 : 1 }}>

                    {/* Fact header — raw fact + explanation */}
                    <div className="px-5 py-4 border-b border-slate-700">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,215,0,0.15)', color: '#FFD700' }}>
                              Fait #{fi + 1}
                            </span>
                            {isSaved && (
                              <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>
                                Sauvegardé
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-white font-bold mb-2">{fact.raw_fact}</div>
                          {fact.explanation && (
                            <div className="text-xs text-slate-400 italic">{fact.explanation}</div>
                          )}
                          {fact.source_url && (
                            <a href={fact.source_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline mt-1 inline-block">
                              Source
                            </a>
                          )}
                        </div>
                        {!isSaved && selectedIdx != null && (
                          <button onClick={() => saveVipFact(fi)}
                            className="shrink-0 px-4 py-2 rounded-xl text-xs font-black text-white active:scale-95"
                            style={{ background: '#22C55E' }}>
                            Sauvegarder
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 3 formulations */}
                    <div className="divide-y divide-slate-700/50">
                      {(fact.formulations || []).map((form, formIdx) => {
                        const arch = getArchetype(form.archetype)
                        const isSelected = selectedIdx === formIdx
                        return (
                          <button
                            key={formIdx}
                            onClick={() => !isSaved && setSelectedFormulations(prev => ({ ...prev, [fi]: formIdx }))}
                            disabled={isSaved}
                            className="w-full text-left px-5 py-4 transition-all hover:bg-slate-700/30"
                            style={{
                              background: isSelected ? 'rgba(255,215,0,0.08)' : 'transparent',
                              borderLeft: isSelected ? '3px solid #FFD700' : '3px solid transparent',
                            }}
                          >
                            {/* Archetype + score */}
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,0.15)', color: '#A78BFA' }}>
                                {arch.emoji} {arch.label}
                              </span>
                              {form.collision && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,107,26,0.15)', color: '#FF6B1A' }}>
                                  {form.collision}
                                </span>
                              )}
                              {form.wtf_score && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: `${wtfColor(form.wtf_score)}20`, color: wtfColor(form.wtf_score) }}>
                                  {form.wtf_score}/4
                                </span>
                              )}
                              {isSelected && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,215,0,0.2)', color: '#FFD700' }}>
                                  SÉLECTIONNÉE
                                </span>
                              )}
                            </div>

                            {/* Question + Answer */}
                            <div className="text-sm text-white font-semibold mb-1">{form.question}</div>
                            <div className="text-xs font-black mb-2" style={{ color: '#FF6B1A' }}>{form.short_answer}</div>

                            {/* Hints + wrong answers preview */}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
                              {form.hint1 && <span>H1: {form.hint1}</span>}
                              {form.hint2 && <span>H2: {form.hint2}</span>}
                              {form.funny_wrong_1 && <span>Drôle: {form.funny_wrong_1}</span>}
                              {form.close_wrong_1 && <span>Proche: {form.close_wrong_1}</span>}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}
