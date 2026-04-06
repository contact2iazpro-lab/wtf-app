import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTrophySections, getNextBadge, CATEGORY_LABELS } from '../utils/badgeManager'

const S = (px) => `calc(${px}px * var(--scale))`

export default function RecompensesPage() {
  const navigate = useNavigate()
  const [sections, setSections] = useState([])
  const [nextTrophy, setNextTrophy] = useState(null)
  const [expanded, setExpanded] = useState({ global: true, type: true, categories: false, streak: true, blitz: true, games: true, social: true, perfect: true })
  const [selectedTrophy, setSelectedTrophy] = useState(null)

  useEffect(() => {
    setSections(getTrophySections())
    setNextTrophy(getNextBadge())
  }, [])

  const totalEarned = sections.reduce((sum, s) => sum + s.earnedCount, 0)
  const totalCount = sections.reduce((sum, s) => sum + s.totalCount, 0)

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  // Group category trophies by category
  const groupByCategory = (trophies) => {
    const groups = {}
    for (const t of trophies) {
      const cat = t.category || 'unknown'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(t)
    }
    return Object.entries(groups)
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: '#FAFAF8', paddingBottom: S(80), fontFamily: 'Nunito, sans-serif' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform" style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151' }}>←</button>
          <h1 className="flex-1 text-lg font-black" style={{ color: '#1a1a2e' }}>Trophées</h1>
          <span className="px-3 py-1 rounded-xl text-xs font-black" style={{ background: 'rgba(255,215,0,0.15)', color: '#D97706' }}>
            {totalEarned}/{totalCount}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        {/* Prochain objectif */}
        <div className="rounded-2xl p-4 mb-3" style={{ background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' }}>
          {nextTrophy ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span style={{ fontSize: 24 }}>{nextTrophy.badge.emoji}</span>
                <div>
                  <span className="font-black text-xs block" style={{ color: 'rgba(26,26,46,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prochain objectif</span>
                  <span className="font-black text-sm block" style={{ color: '#1a1a2e' }}>{nextTrophy.badge.label}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div style={{ flex: 1, background: 'rgba(0,0,0,0.15)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${nextTrophy.progress}%`, background: '#1a1a2e', borderRadius: 4, transition: 'width 0.5s ease' }} />
                </div>
                <span className="text-xs font-black" style={{ color: '#1a1a2e' }}>{nextTrophy.current}/{nextTrophy.target}</span>
              </div>
            </>
          ) : (
            <div className="text-center">
              <span className="text-2xl block mb-1">🏆</span>
              <span className="font-black text-sm block" style={{ color: '#1a1a2e' }}>Tous les trophées débloqués !</span>
            </div>
          )}
        </div>

        {/* Sections */}
        {sections.map(section => (
          <div key={section.id} className="rounded-2xl mb-3 overflow-hidden" style={{ background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            {/* Section header */}
            <button
              onClick={() => toggle(section.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(0,0,0,0.02)', borderBottom: expanded[section.id] ? '1px solid rgba(0,0,0,0.06)' : 'none', cursor: 'pointer', border: 'none', fontFamily: 'Nunito, sans-serif', textAlign: 'left' }}
            >
              <span style={{ fontSize: 14, fontWeight: 900, color: '#1a1a2e' }}>{section.label}</span>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 11, fontWeight: 800, color: section.earnedCount > 0 ? '#D97706' : '#9CA3AF', background: section.earnedCount > 0 ? 'rgba(255,215,0,0.12)' : 'rgba(0,0,0,0.04)', padding: '2px 8px', borderRadius: 8 }}>
                  {section.earnedCount}/{section.totalCount}
                </span>
                <span style={{ fontSize: 12, color: '#9CA3AF', transition: 'transform 0.2s', transform: expanded[section.id] ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
              </div>
            </button>

            {/* Section content */}
            {expanded[section.id] && (
              <div style={{ padding: '12px 12px' }}>
                {section.id === 'categories' ? (
                  /* Categories: grouped by category */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {groupByCategory(section.trophies).map(([catId, trophies]) => {
                      const catEarned = trophies.filter(t => t.earned).length
                      return (
                        <div key={catId}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <img src={`/assets/categories/${catId}.png`} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
                            <span style={{ fontSize: 12, fontWeight: 800, color: '#1a1a2e' }}>{CATEGORY_LABELS[catId] || catId}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', marginLeft: 'auto' }}>{catEarned}/5</span>
                          </div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {trophies.map(trophy => (
                              <div
                                key={trophy.id}
                                onClick={() => setSelectedTrophy(trophy)}
                                style={{
                                  flex: 1, textAlign: 'center', padding: '6px 2px', borderRadius: 8, cursor: 'pointer',
                                  background: trophy.earned ? 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,165,0,0.2))' : 'rgba(0,0,0,0.03)',
                                  border: trophy.earned ? '1px solid rgba(255,215,0,0.4)' : '1px solid rgba(0,0,0,0.05)',
                                }}
                              >
                                <span style={{ fontSize: 16, display: 'block', opacity: trophy.earned ? 1 : 0.25, filter: trophy.earned ? 'none' : 'grayscale(100%)' }}>{trophy.emoji}</span>
                                {!trophy.earned && trophy.current > 0 && (
                                  <div style={{ height: 2, background: 'rgba(0,0,0,0.08)', borderRadius: 1, margin: '3px 4px 0', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${Math.min(100, (trophy.current / trophy.target) * 100)}%`, background: '#FF6B1A', borderRadius: 1 }} />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  /* Other sections: grid 3 columns */
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {section.trophies.map(trophy => (
                      <div
                        key={trophy.id}
                        onClick={() => setSelectedTrophy(trophy)}
                        style={{
                          textAlign: 'center', padding: '10px 4px', borderRadius: 12, cursor: 'pointer',
                          background: trophy.earned ? 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,165,0,0.2))' : 'rgba(0,0,0,0.03)',
                          border: trophy.earned ? '1px solid rgba(255,215,0,0.4)' : '1px solid rgba(0,0,0,0.05)',
                        }}
                      >
                        <div className="relative mb-1" style={{ display: 'inline-block' }}>
                          <span style={{ fontSize: 26, display: 'block', opacity: trophy.earned ? 1 : 0.25, filter: trophy.earned ? 'none' : 'grayscale(100%)' }}>{trophy.emoji}</span>
                          {trophy.earned && <span style={{ position: 'absolute', bottom: -2, right: -6, fontSize: 10 }}>✅</span>}
                          {!trophy.earned && <span style={{ position: 'absolute', bottom: -2, right: -6, fontSize: 10 }}>🔒</span>}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: trophy.earned ? '#1a1a2e' : '#9CA3AF', lineHeight: 1.2 }}>{trophy.label}</div>
                        {!trophy.earned && (
                          <div style={{ margin: '4px 6px 0', height: 3, background: 'rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(100, (trophy.current / trophy.target) * 100)}%`, background: '#FF6B1A', borderRadius: 2 }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedTrophy && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setSelectedTrophy(null)}
        >
          <div
            style={{
              background: 'white', borderRadius: 20, padding: '24px 20px',
              maxWidth: 300, width: '100%', textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              fontFamily: 'Nunito, sans-serif',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>{selectedTrophy.emoji}</div>
            <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1a1a2e', margin: '0 0 8px' }}>
              {selectedTrophy.label}
            </h3>
            <div style={{
              fontSize: 13, fontWeight: 700, margin: '0 0 12px',
              color: selectedTrophy.earned ? '#22C55E' : '#9CA3AF',
            }}>
              {selectedTrophy.earned ? '✅ Débloqué !' : '🔒 Pas encore débloqué'}
            </div>
            {selectedTrophy.description && (
              <p style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', margin: '8px 0 12px', lineHeight: 1.4 }}>
                {selectedTrophy.description}
              </p>
            )}
            {/* Barre de progression */}
            <div style={{ background: '#F3F4F6', borderRadius: 8, height: 8, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{
                height: '100%', borderRadius: 8,
                width: `${Math.min(100, Math.round((selectedTrophy.current / (selectedTrophy.target === 'all' ? selectedTrophy.current || 1 : selectedTrophy.target)) * 100))}%`,
                background: selectedTrophy.earned ? '#22C55E' : '#FF6B1A',
                transition: 'width 0.5s ease',
              }} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280' }}>
              {selectedTrophy.current} / {selectedTrophy.target === 'all' ? '∞' : selectedTrophy.target}
            </div>
            <button
              onClick={() => setSelectedTrophy(null)}
              style={{
                marginTop: 16, padding: '10px 32px', borderRadius: 12,
                background: '#FF6B1A', color: 'white', border: 'none',
                fontWeight: 900, fontSize: 14, cursor: 'pointer',
                fontFamily: 'Nunito, sans-serif',
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
