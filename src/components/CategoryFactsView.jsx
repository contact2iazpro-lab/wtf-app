import { audio } from '../utils/audio'

const S = (px) => `calc(${px}px * var(--scale))`

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

const TAB_CONFIG = {
  vip:       { label: 'WTF!',        emoji: '👑' },
  generated: { label: 'Funny F*cts', emoji: '🤖' },
}

export default function CategoryFactsView({ cat, facts, unlockedIds, activeTab, onSelectFact, onClose }) {
  const tab = TAB_CONFIG[activeTab]
  const unlockedFacts = facts.filter(f => unlockedIds.has(f.id))
  const lockedFacts = facts.filter(f => !unlockedIds.has(f.id))
  const rgb = hexToRgb(cat.color)

  return (
    <div className="fixed inset-0 flex justify-center" style={{ zIndex: 300, background: '#000' }}>
      <div style={{
        width: '100%', maxWidth: 430, height: '100%',
        display: 'flex', flexDirection: 'column',
        backgroundImage: 'url(/assets/backgrounds/question-default.webp)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        backgroundColor: cat.color, position: 'relative',
      }}>
        {/* Overlay */}
        <div style={{ position: 'absolute', inset: 0, background: `${cat.color}cc`, zIndex: 0 }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: S(10), padding: `${S(12)} ${S(16)}`, flexShrink: 0 }}>
            <button
              onClick={onClose}
              style={{
                width: S(36), height: S(36), borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: S(16), fontWeight: 900, flexShrink: 0, cursor: 'pointer',
              }}
            >←</button>
            <img
              src={`/assets/categories/${cat.id}.png`}
              alt={cat.label}
              style={{ width: S(32), height: S(32), borderRadius: S(8), objectFit: 'cover', flexShrink: 0 }}
              onError={(e) => { e.target.style.display = 'none' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 900, fontSize: S(13), color: 'white', display: 'block', lineHeight: 1.2 }}>{cat.label}</span>
              <span style={{ fontSize: S(10), fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{tab.emoji} {tab.label}</span>
            </div>
            <span style={{
              fontSize: S(11), fontWeight: 900, color: 'white',
              background: 'rgba(255,255,255,0.2)', borderRadius: S(12),
              padding: `${S(4)} ${S(10)}`,
            }}>
              {unlockedFacts.length}/{facts.length}
            </span>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: `0 ${S(16)}`, paddingBottom: S(80) }}>
            {unlockedFacts.length === 0 && (
              <p style={{ textAlign: 'center', fontSize: S(13), color: 'rgba(255,255,255,0.5)', padding: `${S(32)} 0` }}>
                Aucun F*ct débloqué dans cette catégorie.<br />Lance une Quest pour commencer !
              </p>
            )}

            {unlockedFacts.length > 0 && (
              <>
                <p style={{ fontSize: 16, fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: S(8), textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                  F*cts débloqués — {unlockedFacts.length}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: S(8), marginBottom: S(16) }}>
                  {unlockedFacts.map(fact => (
                    <button
                      key={fact.id}
                      onClick={() => { audio.play('click'); onSelectFact(fact) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: S(10),
                        padding: S(10), borderRadius: 12, textAlign: 'left', width: '100%',
                        border: `2px solid ${cat.color}`,
                        background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
                        cursor: 'pointer',
                      }}
                    >
                      {fact.imageUrl ? (
                        <img src={fact.imageUrl} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 60, height: 60, borderRadius: 8, flexShrink: 0, background: `rgba(${rgb}, 0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'rgba(255,255,255,0.3)' }}>?</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: 800, fontSize: S(12), color: 'white', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3, textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>{fact.question}</span>
                      </div>
                      <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>›</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {lockedFacts.length > 0 && (
              <>
                <p style={{ fontSize: 16, fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: S(8), textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                  À débloquer — {lockedFacts.length}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: S(8) }}>
                  {lockedFacts.map(fact => (
                    <div key={fact.id} style={{ display: 'flex', alignItems: 'center', gap: S(10), padding: S(10), borderRadius: 12, background: 'rgba(0,0,0,0.2)' }}>
                      <div style={{ width: 60, height: 60, borderRadius: 8, overflow: 'hidden', position: 'relative', flexShrink: 0, background: 'rgba(0,0,0,0.3)' }}>
                        {fact.imageUrl ? (
                          <img src={fact.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(8px) brightness(0.5)' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 20 }}>?</div>
                        )}
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔒</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ height: 10, borderRadius: 4, background: 'rgba(255,255,255,0.1)', width: '70%', marginBottom: 4 }} />
                        <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', width: '90%', marginBottom: 3 }} />
                        <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', width: '55%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
