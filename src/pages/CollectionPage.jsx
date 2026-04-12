import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCollection } from '../hooks/useCollection'
import { getValidFacts, getPlayableCategories } from '../data/factsService'
import { audio } from '../utils/audio'
import { readWtfData } from '../utils/storageHelper'
import FactDetailView from '../components/FactDetailView'
import CategoryFactsView from '../components/CategoryFactsView'

const GUEST_CATEGORIES = ['kids', 'animaux', 'sport', 'records', 'definition']

const S = (px) => `calc(${px}px * var(--scale))`

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

function ProgressBar({ percentage, color }) {
  const isComplete = percentage === 100
  const barColor = isComplete
    ? 'linear-gradient(90deg, #FFD700, #FFA500)'
    : percentage >= 80
      ? '#FF8C00'
      : percentage === 0
        ? 'transparent'
        : `rgba(${hexToRgb(color)}, 0.9)`
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: '#E5E7EB' }}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${percentage}%`, background: barColor }} />
    </div>
  )
}

export default function CollectionPage() {
  const [activeTab, setActiveTab] = useState('vip')
  const [selectedCatId, setSelectedCatId] = useState(null)
  const [selectedFact, setSelectedFact] = useState(null)

  const navigate = useNavigate()
  const [openedFromExternal, setOpenedFromExternal] = useState(false)

  // Auto-open fact detail si venant de ResultsScreen
  useEffect(() => {
    const factId = localStorage.getItem('wtf_open_fact_id')
    if (factId) {
      localStorage.removeItem('wtf_open_fact_id')
      const allFacts = getValidFacts()
      const fact = allFacts.find(f => f.id === Number(factId))
      if (fact) {
        setSelectedFact(fact)
        setOpenedFromExternal(true)
      }
    }
  }, [])

  // Local unlocked facts — re-lu à chaque wtf_storage_sync
  // (nécessaire pour que l'achat d'un fact dans CategoryFactsView persiste
  // visuellement au retour sur la liste des facts)
  const [unlockedTick, setUnlockedTick] = useState(0)
  useEffect(() => {
    const refresh = () => setUnlockedTick(t => t + 1)
    window.addEventListener('wtf_storage_sync', refresh)
    return () => window.removeEventListener('wtf_storage_sync', refresh)
  }, [])
  const localUnlocked = useMemo(() => {
    try {
      const saved = readWtfData()
      return new Set(saved.unlockedFacts || [])
    } catch { return new Set() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlockedTick])

  const { unlockedByCategory } = useCollection(localUnlocked)

  // Unified Set of all unlocked fact IDs
  const allUnlockedIds = useMemo(() => {
    const ids = new Set(localUnlocked)
    for (const catIds of Object.values(unlockedByCategory)) {
      for (const id of catIds) ids.add(id)
    }
    return ids
  }, [localUnlocked, unlockedByCategory])

  // Which categories are unlocked (base 5 + any with >= 1 fact)
  const unlockedCatIds = useMemo(() => {
    const allFacts = getValidFacts()
    const cats = new Set(GUEST_CATEGORIES)
    for (const f of allFacts) {
      if (allUnlockedIds.has(f.id) && f.category) cats.add(f.category)
    }
    return cats
  }, [allUnlockedIds])

  // Index facts by type + category
  const factsIndex = useMemo(() => {
    const idx = {}
    for (const f of getValidFacts()) {
      const type = f.isVip ? 'vip' : 'generated'
      const key = `${type}_${f.category}`
      if (!idx[key]) idx[key] = []
      idx[key].push(f)
    }
    return idx
  }, [])

  // Stats per category for active tab
  const catStats = useMemo(() => {
    return getPlayableCategories()
      .filter(cat => cat.id !== 'crimes')
      .map(cat => {
        const facts = factsIndex[`${activeTab}_${cat.id}`] || []
        const unlockedCount = facts.filter(f => allUnlockedIds.has(f.id)).length
        const pct = facts.length > 0 ? Math.round((unlockedCount / facts.length) * 100) : 0
        const isCatUnlocked = unlockedCatIds.has(cat.id)
        return {
          cat, facts, unlocked: unlockedCount, total: facts.length,
          percentage: pct, isCompleted: facts.length > 0 && unlockedCount === facts.length,
          isLocked: !isCatUnlocked && localStorage.getItem('wtf_dev_mode') !== 'true' && localStorage.getItem('wtf_test_mode') !== 'true',
        }
      })
      .filter(s => s.total > 0)
      .sort((a, b) => {
        if (a.isLocked !== b.isLocked) return a.isLocked ? 1 : -1
        if (b.percentage !== a.percentage) return b.percentage - a.percentage
        return a.cat.label.localeCompare(b.cat.label, 'fr', { sensitivity: 'base' })
      })
  }, [activeTab, allUnlockedIds, factsIndex, unlockedCatIds])

  // Global progress
  const allFacts = useMemo(() => getValidFacts(), [])
  const factsInUnlockedCats = allFacts.filter(f => unlockedCatIds.has(f.category))
  const overallUnlocked = factsInUnlockedCats.filter(f => allUnlockedIds.has(f.id)).length
  const overallTotal = factsInUnlockedCats.length
  const overallPercentage = overallTotal > 0 ? Math.round((overallUnlocked / overallTotal) * 100) : 0

  // Tab progress
  const tabTotalFacts = catStats.filter(s => !s.isLocked).reduce((a, s) => a + s.total, 0)
  const tabTotalUnlocked = catStats.filter(s => !s.isLocked).reduce((a, s) => a + s.unlocked, 0)

  // Selected category
  const selectedCatStats = selectedCatId ? catStats.find(s => s.cat.id === selectedCatId) : null

  // Sub-views
  if (selectedFact) {
    return <FactDetailView fact={selectedFact} onClose={() => {
      if (openedFromExternal) {
        // Retour à la page précédente (ResultsScreen ou autre)
        navigate(-1)
      } else {
        setSelectedFact(null)
      }
    }} />
  }

  if (selectedCatStats) {
    return (
      <CategoryFactsView
        cat={selectedCatStats.cat}
        facts={selectedCatStats.facts}
        unlockedIds={allUnlockedIds}
        activeTab={activeTab}
        onSelectFact={setSelectedFact}
        onClose={() => setSelectedCatId(null)}
      />
    )
  }

  // Main view
  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: '#FAFAF8', paddingBottom: S(80) }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151' }}
          >←</button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black" style={{ color: '#1a1a2e' }}>Ma Collection</h1>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              <strong style={{ color: '#1a1a2e' }}>{overallUnlocked} / {overallTotal}</strong> F*cts débloqués
            </p>
          </div>
        </div>

        {/* Global progress bar */}
        <div className="rounded-2xl p-3 mb-3" style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold" style={{ color: '#374151' }}>Progression globale</span>
            <span className="text-xs font-bold" style={{ color: '#FF6B1A' }}>{overallUnlocked} / {overallTotal} F*cts</span>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: '#E5E7EB' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${overallPercentage}%`, background: 'linear-gradient(90deg, #FF6B1A, #FF3385)' }} />
          </div>
        </div>

        {/* WTF / Funny tabs */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => { audio.play('click'); setActiveTab('vip') }}
            className="flex-1 py-2 rounded-2xl font-black text-xs transition-all active:scale-95"
            style={{
              background: activeTab === 'vip' ? '#FFD700' : '#F3F4F6',
              color: activeTab === 'vip' ? '#1a1a2e' : '#9CA3AF',
              border: activeTab === 'vip' ? 'none' : '1px solid #E5E7EB',
              boxShadow: activeTab === 'vip' ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
            }}
          >WTF!</button>
          <button
            onClick={() => { audio.play('click'); setActiveTab('generated') }}
            className="flex-1 py-2 rounded-2xl font-black text-xs transition-all active:scale-95"
            style={{
              background: activeTab === 'generated' ? '#8B5CF6' : '#F3F4F6',
              color: activeTab === 'generated' ? 'white' : '#9CA3AF',
              border: activeTab === 'generated' ? 'none' : '1px solid #E5E7EB',
              boxShadow: activeTab === 'generated' ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
            }}
          >Funny F*cts</button>
        </div>

        {/* Tab progress */}
        <div className="flex items-center justify-between px-1 mb-1">
          <span className="text-xs" style={{ color: '#9CA3AF' }}>
            {activeTab === 'vip' ? 'WTF!' : 'Funny F*cts'}
          </span>
          <span className="text-xs font-bold" style={{ color: activeTab === 'vip' ? '#FFD700' : '#8B5CF6' }}>
            {tabTotalUnlocked} / {tabTotalFacts}
          </span>
        </div>
      </div>

      {/* Category list */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4">
        <div className="flex flex-col gap-2">
          {catStats.map(({ cat, unlocked, total, percentage, isCompleted, isLocked }) => {
            const rgb = hexToRgb(cat.color)
            const remaining = total - unlocked

            return (
              <button
                key={cat.id}
                onClick={() => {
                  audio.play('click')
                  if (isLocked) return
                  setSelectedCatId(cat.id)
                }}
                className="rounded-2xl p-3 flex items-center gap-3 text-left w-full active:scale-98 transition-all"
                style={{
                  background: isLocked ? '#F3F4F6' : percentage > 0 ? `rgba(${rgb}, 0.08)` : '#F9FAFB',
                  border: isLocked
                    ? '1px solid #E5E7EB'
                    : isCompleted
                      ? '1px solid rgba(255,215,0,0.35)'
                      : percentage > 0
                        ? `1px solid rgba(${rgb}, 0.25)`
                        : '1px solid rgba(229,231,235,0.5)',
                  opacity: isLocked ? 0.5 : 1,
                }}
              >
                {/* Category icon */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img
                    src={`/assets/categories/${cat.id}.png`}
                    alt={cat.label}
                    style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', filter: isLocked ? 'grayscale(0.6)' : 'none' }}
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                  {isLocked && (
                    <div style={{
                      position: 'absolute', bottom: -2, right: -2,
                      width: 18, height: 18, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.5)', border: '1.5px solid white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9,
                    }}>🔒</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-black text-sm truncate" style={{ color: isLocked ? '#9CA3AF' : '#1a1a2e' }}>{cat.label}</span>
                    {isCompleted && !isLocked && <span className="text-sm shrink-0">🏆</span>}
                  </div>
                  {isLocked ? (
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>Débloquer cette catégorie</span>
                  ) : (
                    <>
                      <ProgressBar percentage={percentage} color={cat.color} />
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs" style={{ color: '#6B7280' }}>
                          {isCompleted
                            ? <span style={{ color: '#FFD700', fontWeight: 700 }}>Complété !</span>
                            : percentage >= 80
                              ? <span style={{ color: '#FF8C00', fontWeight: 700 }}>Plus que {remaining} !</span>
                              : `${unlocked}/${total} F*cts`
                          }
                        </span>
                        <span className="text-xs font-bold" style={{
                          color: isCompleted ? '#FFD700' : percentage > 0 ? `rgba(${rgb}, 1)` : '#D1D5DB'
                        }}>
                          {percentage}%
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <span className="text-xl shrink-0" style={{ color: isLocked ? '#D1D5DB' : 'rgba(0,0,0,0.2)' }}>›</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
