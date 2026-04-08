import { useMemo, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCollection } from '../hooks/useCollection'
import { getValidFacts, getPlayableCategories } from '../data/factsService'
import LoginModal from '../components/Auth/LoginModal'
import ConnectBanner from '../components/ConnectBanner'
import { audio } from '../utils/audio'
import { readWtfData } from '../utils/storageHelper'
import renderFormattedText from '../utils/renderFormattedText'

const GUEST_CATEGORIES = ['kids', 'animaux', 'sport', 'records', 'definition']

// ─── Helpers ───────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

function isLightColor(hex) {
  if (!hex) return false
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 155
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

const TAB_CONFIG = {
  vip:       { label: 'WTF!',         emoji: '👑', color: '#FFD700' },
  generated: { label: 'Funny F*cts', emoji: '🤖', color: '#8B5CF6' },
}

// ─── Fact detail full-screen view ──────────────────────────────────────────

function FactDetailView({ fact, onClose, isOnboardingFactDetail }) {
  const [showLightbox, setShowLightbox] = useState(false)
  const cat = getPlayableCategories().find(c => c.id === fact.category)
  const catColor = cat?.color || '#FF6B1A'
  const catGradient = `linear-gradient(160deg, ${catColor}22 0%, ${catColor} 100%)`
  const isVip = !!fact.isVip
  const S = (px) => `calc(${px}px * var(--scale))`

  const share = () => {
    const text = `🤯 Le saviez-vous ?\n\n${fact.explanation}\n\nJoue sur What The F*ct! https://wtf-app-production.up.railway.app/`
    if (navigator.share) navigator.share({ text }).catch(() => {})
    else navigator.clipboard?.writeText(text).catch(() => {})
  }

  return (
    <div
      className="fixed inset-0 flex justify-center"
      style={{ zIndex: 400, background: '#000' }}
    >
      <div style={{
        width: '100%', maxWidth: 430, height: '100%',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        ...(isVip ? {
          background: catGradient,
        } : {
          backgroundImage: 'url(/assets/backgrounds/question-default.webp)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          backgroundColor: catColor,
        }),
        position: 'relative',
      }}>
      {/* Overlay catégorie (non-VIP) ou particules VIP */}
      {isVip ? (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} style={{
              position: 'absolute',
              top: `${(i * 31 + 7) % 90}%`,
              left: `${(i * 43 + 13) % 95}%`,
              width: i % 3 === 0 ? 6 : 4,
              height: i % 3 === 0 ? 6 : 4,
              borderRadius: '50%',
              background: `rgba(255,255,255,${0.1 + (i % 4) * 0.07})`,
              animation: `vipDetailPulse ${2 + (i % 3) * 0.5}s ${(i * 0.3).toFixed(1)}s ease-in-out infinite`,
            }} />
          ))}
        </div>
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: `${catColor}cc`, zIndex: 0 }} />
      )}

      <style>{`
        @keyframes vipDetailPulse {
          0%, 100% { opacity: 0.1; transform: scale(0.8); }
          50% { opacity: 0.35; transform: scale(1.2); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,107,26,0.4), 0 0 15px rgba(255,255,255,0.5), 0 4px 16px rgba(255,107,26,0.4); }
          50% { transform: scale(1.05); box-shadow: 0 0 20px 8px rgba(255,107,26,0.3), 0 0 20px rgba(255,255,255,0.6), 0 4px 16px rgba(255,107,26,0.4); }
        }
      `}</style>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

        {/* Header — ← | ⚙️ */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexShrink: 0, padding: `${S(8)} ${S(12)}` }}>
          <button
            onClick={onClose}
            style={{
              width: S(36), height: S(36), borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <span style={{ fontSize: S(16), color: '#ffffff', fontWeight: 900, lineHeight: 1, cursor: 'pointer' }}>←</span>
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => { audio.play('click') }}
            style={{
              width: S(36), height: S(36), borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <img src="/assets/ui/icon-settings.png" style={{ width: S(20), height: S(20) }} alt="" />
          </button>
        </div>

        {/* Question dans un encadré sombre */}
        <div style={{ flexShrink: 0, padding: `0 ${S(12)} ${S(6)}` }}>
          <div style={{
            background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(12px)',
            borderRadius: S(12), padding: `${S(10)} ${S(14)}`,
            border: '1px solid rgba(255,255,255,0.12)',
          }}>
            <span style={{ fontWeight: 900, fontSize: S(14), color: '#ffffff', lineHeight: 1.3, display: 'block', textAlign: 'center' }}>
              {renderFormattedText(fact.question)}
            </span>
          </div>
        </div>

        {/* Image — maxHeight 35vh, cliquable lightbox */}
        <div style={{ flexShrink: 0, padding: `0 ${S(10)}`, maxHeight: '35vh' }}>
          <div
            onClick={() => fact.imageUrl && setShowLightbox(true)}
            style={{
              width: '100%', maxHeight: '35vh', borderRadius: S(16), overflow: 'hidden',
              border: `3px solid ${catColor}`, position: 'relative',
              background: catGradient, cursor: fact.imageUrl ? 'pointer' : 'default',
            }}
          >
            {fact.imageUrl ? (
              <>
                <img
                  src={fact.imageUrl}
                  alt={fact.question}
                  style={{ objectFit: 'cover', width: '100%', maxHeight: 'calc(35vh - 6px)', display: 'block' }}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); setShowLightbox(true) }}
                  style={{
                    position: 'absolute', top: S(8), right: S(8), zIndex: 10,
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.5)', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontSize: 18,
                  }}
                >🔍</button>
              </>
            ) : (
              <div style={{
                width: '100%', height: 'calc(35vh - 6px)', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <div style={{ fontSize: 72, fontWeight: 900, color: 'white', lineHeight: 1, opacity: 0.3 }}>?</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Image bientôt disponible</div>
              </div>
            )}
          </div>
        </div>

        {/* Encadrés réponse + Le saviez-vous */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: `${S(4)} ${S(12)} 0`, display: 'flex', flexDirection: 'column', gap: S(4) }}>
          {/* Encadré réponse */}
          <div style={{
            background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: S(12), padding: `${S(8)} ${S(10)}`,
          }}>
            <div style={{
              background: 'rgba(76,175,80,0.12)', border: '1px solid rgba(76,175,80,0.3)',
              borderRadius: S(8), padding: `${S(6)} ${S(8)}`,
            }}>
              <div style={{ fontSize: S(9), fontWeight: 900, color: '#4CAF50', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: S(2) }}>Réponse :</div>
              <div style={{ fontSize: S(12), fontWeight: 700, color: '#ffffff' }}>{fact.shortAnswer || fact.options?.[fact.correctIndex]}</div>
            </div>
          </div>

          {/* Le saviez-vous */}
          <div style={{
            background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: S(12), padding: `${S(8)} ${S(10)}`,
            flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: S(4), marginBottom: S(3), flexShrink: 0 }}>
              <span style={{ fontSize: S(12) }}>🧠</span>
              <span style={{ color: '#ffffff', fontWeight: 900, fontSize: S(9), textTransform: 'uppercase', letterSpacing: '0.05em' }}>Le saviez-vous ?</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: S(10), lineHeight: 1.4, fontWeight: 500, margin: 0, flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {fact.explanation}
            </p>
            {fact.sourceUrl && (
              <a
                href={fact.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: S(9), color: 'rgba(255,255,255,0.4)', display: 'block', marginTop: S(4), textDecoration: 'underline', textAlign: 'right', flexShrink: 0 }}
              >
                Source
              </a>
            )}
          </div>
        </div>

        {/* Bouton partager ou "Voir ma collection" — fixe en bas */}
        <div style={{ flexShrink: 0, padding: `${S(4)} ${S(12)} ${S(10)}`, position: 'relative' }}>
          {isOnboardingFactDetail ? (
            <div>
              <button
                onClick={() => {
                  const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
                  delete wd.pendingFactDetail
                  wd.lastModified = Date.now()
                  localStorage.setItem('wtf_data', JSON.stringify(wd))
                  onClose()
                }}
                className="active:scale-95 transition-all"
                style={{
                  width: '100%', height: S(44), borderRadius: S(14),
                  fontWeight: 900, fontSize: S(13), color: '#ffffff', border: '3px solid white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(6),
                  background: '#FF6B1A',
                  boxShadow: '0 0 15px rgba(255,255,255,0.5), 0 4px 16px rgba(255,107,26,0.4)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              >
                Voir ma collection 📚
              </button>
              <div style={{
                textAlign: 'center', marginTop: S(4),
                fontSize: 24, animation: 'collectionFingerPulse 0.8s ease-in-out infinite',
                pointerEvents: 'none',
              }}>👆</div>
            </div>
          ) : (
            <button
              onClick={share}
              className="active:scale-95 transition-all"
              style={{
                width: '100%', height: S(44), borderRadius: S(14),
                fontWeight: 900, fontSize: S(13), color: '#ffffff', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(6),
                background: `linear-gradient(135deg, ${catColor} 0%, ${catColor}cc 100%)`,
                boxShadow: `0 4px 16px ${catColor}50`,
              }}
            >
              🎩 Partager ce F*ct
            </button>
          )}
        </div>
      </div>

      {/* Lightbox image */}
      </div>
      {showLightbox && fact.imageUrl && (
        <div
          onClick={() => setShowLightbox(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <button
            onClick={() => setShowLightbox(false)}
            style={{
              position: 'absolute', top: 16, right: 16, zIndex: 10,
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)', border: 'none',
              color: 'white', fontSize: 18, fontWeight: 900,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >✕</button>
          <img
            src={fact.imageUrl}
            alt={fact.question}
            onClick={e => e.stopPropagation()}
            style={{
              width: '95%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 12,
              animation: 'factLightboxZoom 0.2s ease-out',
            }}
          />
          <style>{`
            @keyframes factLightboxZoom {
              from { transform: scale(0.8); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </div>
  )
}

// ─── Fact list overlay for a category+difficulty ────────────────────────────

function CategoryFactsView({ cat, facts, unlockedIds, activeTab, onSelectFact, onClose, onboardingMode, firstUnlockedFact }) {
  const S = (px) => `calc(${px}px * var(--scale))`
  const tab = TAB_CONFIG[activeTab]
  const unlockedFacts = facts.filter(f => unlockedIds.has(f.id))
  const lockedFacts   = facts.filter(f => !unlockedIds.has(f.id))
  const rgb = hexToRgb(cat.color)
  const textColor = isLightColor(cat.color) ? '#1a1a1a' : '#ffffff'
  const subtextColor = isLightColor(cat.color) ? 'rgba(26,26,26,0.6)' : 'rgba(255,255,255,0.6)'
  const mutedColor = isLightColor(cat.color) ? 'rgba(26,26,26,0.4)' : 'rgba(255,255,255,0.4)'

  return (
    <div
      className="fixed inset-0 flex justify-center"
      style={{ zIndex: 300, background: '#000' }}
    >
      <style>{`
        @keyframes collectionFingerPulse {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>

      <div style={{
        width: '100%', maxWidth: 430, height: '100%',
        display: 'flex', flexDirection: 'column',
        backgroundImage: 'url(/assets/backgrounds/question-default.webp)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        backgroundColor: cat.color, position: 'relative',
      }}>
      {/* Overlay catégorie */}
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
              color: 'white', fontSize: S(16), fontWeight: 900, flexShrink: 0,
            }}
          >
            ←
          </button>
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

          {onboardingMode && firstUnlockedFact && (
            <div style={{ fontSize: 11, fontWeight: 800, color: '#FFD700', marginBottom: 8, textAlign: 'center' }}>
              Clique pour voir le détail ! 👇
            </div>
          )}

          {unlockedFacts.length > 0 && (
            <>
              <p style={{ fontSize: 16, fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: S(8), textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                F*cts débloqués — {unlockedFacts.length}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: S(8), marginBottom: S(16) }}>
                {unlockedFacts.map((fact, idx) => {
                  const isFirstFact = onboardingMode && firstUnlockedFact && fact.id === firstUnlockedFact.id
                  const shouldFade = onboardingMode && firstUnlockedFact && fact.id !== firstUnlockedFact.id
                  return (
                  <button
                    key={fact.id}
                    onClick={() => { audio.play('click'); onSelectFact(fact) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: S(10),
                      padding: S(10), borderRadius: 12, textAlign: 'left', width: '100%',
                      border: isFirstFact ? `2px solid #FFD700` : `2px solid ${cat.color}`,
                      background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
                      cursor: 'pointer',
                      opacity: shouldFade ? 0.4 : 1,
                      animation: isFirstFact ? 'collectionPulse 2s ease-in-out infinite' : 'none',
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
                  )
                })}
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
                  <div
                    key={fact.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: S(10),
                      padding: S(10), borderRadius: 12,
                      background: 'rgba(0,0,0,0.2)',
                    }}
                  >
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

// ─── Main collection page ───────────────────────────────────────────────────

const S_main = (px) => `calc(${px}px * var(--scale))`

export default function CollectionPage() {
  const navigate = useNavigate()
  const { isConnected } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const [showConnectBanner, setShowConnectBanner] = useState(false)
  const [activeTab, setActiveTab] = useState('vip')
  const [selectedCatId, setSelectedCatId] = useState(null)
  const [selectedFact, setSelectedFact] = useState(null)
  const [isOnboardingFactDetail, setIsOnboardingFactDetail] = useState(false)
  const [collectionSpotlightStep, setCollectionSpotlightStep] = useState(0)
  const [fingerPos, setFingerPos] = useState({ top: '50%', left: '50%' })
  const progressBarRef = useRef(null)
  const firstUnlockedCategoryRef = useRef(null)

  // Onboarding Collection
  const wtfDataInit = readWtfData()
  const isFirstVisitCollection = !wtfDataInit.onboardingCompleted && !wtfDataInit.hasVisitedCollection
  const [onboardingMode, setOnboardingMode] = useState(isFirstVisitCollection)

  // Local unlocked facts
  const localUnlocked = useMemo(() => {
    try {
      const saved = readWtfData()
      return new Set(saved.unlockedFacts || [])
    } catch { return new Set() }
  }, [])

  const { unlockedByCategory } = useCollection(localUnlocked)

  // Build a unified Set of all unlocked fact IDs (local + supabase)
  const allUnlockedIds = useMemo(() => {
    const ids = new Set(localUnlocked)
    for (const catIds of Object.values(unlockedByCategory)) {
      for (const id of catIds) ids.add(id)
    }
    return ids
  }, [localUnlocked, unlockedByCategory])

  // Determine which categories are unlocked (base 5 + any with >= 1 fact unlocked)
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

  // Stats for active tab, per category
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

  // Global progress — only facts in UNLOCKED categories
  const allFacts = getValidFacts()
  const factsInUnlockedCats = allFacts.filter(f => unlockedCatIds.has(f.category))
  const overallUnlocked = factsInUnlockedCats.filter(f => allUnlockedIds.has(f.id)).length
  const overallTotal = factsInUnlockedCats.length
  const overallPercentage = overallTotal > 0 ? Math.round((overallUnlocked / overallTotal) * 100) : 0

  // Tab progress
  const tabTotalFacts = catStats.filter(s => !s.isLocked).reduce((a, s) => a + s.total, 0)
  const tabTotalUnlocked = catStats.filter(s => !s.isLocked).reduce((a, s) => a + s.unlocked, 0)

  // Onboarding: first unlocked category
  const firstUnlockedCatStats = useMemo(() => {
    return catStats.find(s => !s.isLocked && s.unlocked > 0)
  }, [catStats])

  // Onboarding: first unlocked fact in first category
  const firstUnlockedFact = useMemo(() => {
    if (!firstUnlockedCatStats) return null
    return firstUnlockedCatStats.facts.find(f => allUnlockedIds.has(f.id)) || null
  }, [firstUnlockedCatStats, allUnlockedIds])

  // Auto-scroll vers première catégorie débloquée au moment du spotlight 2
  useEffect(() => {
    if (collectionSpotlightStep === 2 && firstUnlockedCategoryRef.current) {
      firstUnlockedCategoryRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [collectionSpotlightStep])

  // Ouvrir directement un fact si pendingFactDetail existe (depuis onboarding)
  useEffect(() => {
    const wtfDataOnb = readWtfData()
    if (wtfDataOnb.pendingFactDetail) {
      try {
        const pendingFact = JSON.parse(wtfDataOnb.pendingFactDetail)
        setSelectedFact(pendingFact)
        setIsOnboardingFactDetail(true)
        // Supprimer le flag
        delete wtfDataOnb.pendingFactDetail
        wtfDataOnb.lastModified = Date.now()
        localStorage.setItem('wtf_data', JSON.stringify(wtfDataOnb))
      } catch {
        // ignore parse error
      }
    }
  }, [])

  // Spotlight séquentiel désormais démarré manuellement dans handleFactDetailClose()
  // Cet useEffect est supprimé car le fact detail bloquait le rendu du spotlight au mount

  // Selected category for fact list
  const selectedCatStats = selectedCatId ? catStats.find(s => s.cat.id === selectedCatId) : null

  // Mark Collection as visited when fact detail closes (entering then leaving)
  const handleFactDetailClose = () => {
    if (onboardingMode) {
      const wd = readWtfData()
      // NE PAS mettre hasVisitedCollection = true ici
      // NE PAS mettre setOnboardingMode(false) ici
      wd.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(wd))
      // Démarrer le spotlight séquentiel maintenant
      setCollectionSpotlightStep(1)
      setTimeout(() => setCollectionSpotlightStep(2), 2600)
      setTimeout(() => setCollectionSpotlightStep(3), 5200)
    }
    setSelectedFact(null)
    setIsOnboardingFactDetail(false)
  }

  // Mettre à jour la position du doigt quand le spotlight change
  useEffect(() => {
    if (collectionSpotlightStep === 1 && progressBarRef.current) {
      // Étape 1 : Déplacer le doigt vers la barre de progression
      const timer = requestAnimationFrame(() => {
        const rect = progressBarRef.current.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.bottom + 20 // juste en dessous de la barre
        setFingerPos({
          top: `${centerY}px`,
          left: `${centerX}px`,
        })
      })
      return () => cancelAnimationFrame(timer)
    } else if (collectionSpotlightStep === 2 && firstUnlockedCategoryRef.current) {
      // Étape 2 : Déplacer le doigt vers la première catégorie
      const timer = requestAnimationFrame(() => {
        const rect = firstUnlockedCategoryRef.current.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.bottom + 20 // juste en dessous de la catégorie
        setFingerPos({
          top: `${centerY}px`,
          left: `${centerX}px`,
        })
      })
      return () => cancelAnimationFrame(timer)
    } else if (collectionSpotlightStep === 3) {
      // Étape 3 : Déplacer le doigt vers le bouton "Continuer le tutoriel" au centre
      setFingerPos({
        top: 'calc(50% + 40px)',
        left: '50%',
      })
    }
  }, [collectionSpotlightStep])

  // ── Spotlight JSX (rendu en overlay indépendamment de la vue) ──
  const spotlightJSX = (
    <>
      {/* Overlay transparent qui bloque les clics pendant étapes 1 et 2 */}
      {collectionSpotlightStep >= 1 && collectionSpotlightStep < 3 && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 499, background: 'transparent' }} />
      )}

      {/* Étape 1 : Encadré doré autour du bloc "Ma Collection" */}
      {collectionSpotlightStep === 1 && progressBarRef.current && (
        <div style={{
          position: 'fixed',
          top: progressBarRef.current.getBoundingClientRect().top - 90,
          left: progressBarRef.current.getBoundingClientRect().left - 8,
          width: progressBarRef.current.getBoundingClientRect().width + 16,
          height: progressBarRef.current.getBoundingClientRect().height + 98,
          border: '3px solid #FFD700',
          borderRadius: 16,
          boxShadow: '0 0 20px rgba(255,215,0,0.5), 0 0 40px rgba(255,215,0,0.2)',
          pointerEvents: 'none', zIndex: 500,
          background: 'transparent',
        }} />
      )}

      {/* Étape 2 : Encadré doré autour de la première catégorie */}
      {collectionSpotlightStep === 2 && firstUnlockedCategoryRef.current && (
        <div style={{
          position: 'fixed',
          top: firstUnlockedCategoryRef.current.getBoundingClientRect().top - 8,
          left: firstUnlockedCategoryRef.current.getBoundingClientRect().left - 8,
          width: firstUnlockedCategoryRef.current.getBoundingClientRect().width + 16,
          height: firstUnlockedCategoryRef.current.getBoundingClientRect().height + 16,
          border: '3px solid #FFD700',
          borderRadius: 16,
          boxShadow: '0 0 20px rgba(255,215,0,0.5), 0 0 40px rgba(255,215,0,0.2)',
          pointerEvents: 'none', zIndex: 500,
          background: 'transparent',
        }} />
      )}

      {/* Doigt animé — étapes 1, 2 et 3 */}
      {collectionSpotlightStep >= 1 && (
        <div style={{
          position: 'fixed',
          top: fingerPos.top,
          left: fingerPos.left,
          transform: 'translate(-50%, -50%)',
          fontSize: 32,
          zIndex: 501,
          pointerEvents: 'none',
          transition: 'top 0.6s ease-out, left 0.6s ease-out',
          animation: 'fingerBounce 0.8s ease-in-out infinite',
        }}>👆</div>
      )}

      {/* Étape 3 : Bouton "Continuer le tutoriel" */}
      {collectionSpotlightStep === 3 && (
        <button
          onClick={() => {
            const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
            wd.hasVisitedCollection = true
            wd.onboardingCompleted = true
            wd.lastModified = Date.now()
            localStorage.setItem('wtf_data', JSON.stringify(wd))
            setOnboardingMode(false)
            setCollectionSpotlightStep(0)
            navigate('/')
          }}
          style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            zIndex: 501, padding: '14px 32px', borderRadius: 14,
            background: '#FF6B1A', color: 'white', border: 'none',
            fontWeight: 900, fontSize: 16, cursor: 'pointer',
            fontFamily: 'Nunito, sans-serif',
            boxShadow: '0 0 15px rgba(255,107,26,0.5), 0 4px 16px rgba(255,107,26,0.4)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        >
          Continuer le tutoriel 🚀
        </button>
      )}

      {/* Keyframe animations */}
      {collectionSpotlightStep > 0 && (
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 0 15px rgba(255,107,26,0.5), 0 4px 16px rgba(255,107,26,0.4); }
            50% { transform: translate(-50%, -50%) scale(1.05); box-shadow: 0 0 25px rgba(255,107,26,0.7), 0 8px 24px rgba(255,107,26,0.6); }
          }
          @keyframes fingerBounce {
            0%, 100% { transform: translate(-50%, -50%) translateY(0); }
            50% { transform: translate(-50%, -50%) translateY(-6px); }
          }
        `}</style>
      )}
    </>
  )

  // ── Sub-views ──
  if (selectedFact) {
    return (
      <>
        <FactDetailView fact={selectedFact} onClose={handleFactDetailClose} isOnboardingFactDetail={isOnboardingFactDetail} />
        {spotlightJSX}
      </>
    )
  }

  if (selectedCatStats) {
    return (
      <>
        <CategoryFactsView
          cat={selectedCatStats.cat}
          facts={selectedCatStats.facts}
          unlockedIds={allUnlockedIds}
          activeTab={activeTab}
          onSelectFact={setSelectedFact}
          onClose={() => setSelectedCatId(null)}
          onboardingMode={onboardingMode}
          firstUnlockedFact={firstUnlockedFact}
        />
        {spotlightJSX}
      </>
    )
  }

  // ── Main view ──
  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: '#FAFAF8', paddingBottom: S_main(80) }}>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} message="Connecte-toi pour sauvegarder ta progression dans le cloud ☁️" />}

      {/* CSS animations onboarding */}
      <style>{`
        @keyframes collectionPulse {
          0%, 100% { border-color: #FFD700; box-shadow: 0 0 0 0 rgba(255,215,0,0.4); }
          50% { border-color: rgba(255,215,0,0.6); box-shadow: 0 0 0 8px rgba(255,215,0,0.1); }
        }
      `}</style>

      {/* Header */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151' }}
          >
            ←
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black" style={{ color: '#1a1a2e' }}>Ma Collection</h1>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              <strong style={{ color: '#1a1a2e' }}>{overallUnlocked} / {overallTotal}</strong> F*cts débloqués
            </p>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151' }}
            title="Paramètres"
          >
            <img src="/assets/ui/icon-settings.png" alt="settings" style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Global progress bar (overall) */}
        <div ref={progressBarRef} className="rounded-2xl p-3 mb-3" style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold" style={{ color: '#374151' }}>Progression globale</span>
            <span className="text-xs font-bold" style={{ color: '#FF6B1A' }}>{overallUnlocked} / {overallTotal} F*cts</span>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: '#E5E7EB' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${overallPercentage}%`, background: 'linear-gradient(90deg, #FF6B1A, #FF3385)' }}
            />
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
          >
            ⭐ WTF!
          </button>
          <button
            onClick={() => { audio.play('click'); setActiveTab('generated') }}
            className="flex-1 py-2 rounded-2xl font-black text-xs transition-all active:scale-95"
            style={{
              background: activeTab === 'generated' ? '#8B5CF6' : '#F3F4F6',
              color: activeTab === 'generated' ? 'white' : '#9CA3AF',
              border: activeTab === 'generated' ? 'none' : '1px solid #E5E7EB',
              boxShadow: activeTab === 'generated' ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            🤖 Funny F*cts
          </button>
        </div>

        {/* Tab progress */}
        <div className="flex items-center justify-between px-1 mb-1">
          <span className="text-xs" style={{ color: '#9CA3AF' }}>
            {activeTab === 'vip' ? '⭐ WTF!' : '🤖 Funny F*cts'}
          </span>
          <span className="text-xs font-bold" style={{ color: activeTab === 'vip' ? '#FFD700' : '#8B5CF6' }}>
            {tabTotalUnlocked} / {tabTotalFacts}
          </span>
        </div>
      </div>

      {/* Category list */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4">
        {onboardingMode && firstUnlockedCatStats && (
          <div style={{ fontSize: 12, fontWeight: 800, color: '#FFD700', marginBottom: 8, textAlign: 'center' }}>
            Découvre tes f*cts ! 🌟
          </div>
        )}
        <div className="flex flex-col gap-2">
          {catStats.map(({ cat, unlocked, total, percentage, isCompleted, isLocked }) => {
            const rgb = hexToRgb(cat.color)
            const remaining = total - unlocked
            const isFirstCatOnboarding = onboardingMode && firstUnlockedCatStats && cat.id === firstUnlockedCatStats.cat.id
            const shouldFade = onboardingMode && firstUnlockedCatStats && cat.id !== firstUnlockedCatStats.cat.id && !isLocked
            const isFirstUnlockedCat = collectionSpotlightStep === 2 && firstUnlockedCatStats && cat.id === firstUnlockedCatStats.cat.id

            return (
              <button
                ref={isFirstUnlockedCat ? firstUnlockedCategoryRef : null}
                data-first-unlocked-cat={isFirstUnlockedCat ? 'true' : undefined}
                key={cat.id}
                onClick={() => {
                  audio.play('click')
                  if (isLocked) { alert('Continue à jouer pour débloquer cette catégorie ! 🎮'); return }
                  setSelectedCatId(cat.id)
                }}
                className="rounded-2xl p-3 flex items-center gap-3 text-left w-full active:scale-98 transition-all"
                style={{
                  background: isLocked ? '#F3F4F6' : percentage > 0 ? `rgba(${rgb}, 0.08)` : '#F9FAFB',
                  border: isFirstCatOnboarding
                    ? '2px solid #FFD700'
                    : isLocked
                      ? '1px solid #E5E7EB'
                      : isCompleted
                        ? '1px solid rgba(255,215,0,0.35)'
                        : percentage > 0
                          ? `1px solid rgba(${rgb}, 0.25)`
                          : '1px solid rgba(229,231,235,0.5)',
                  opacity: shouldFade ? 0.4 : (isLocked ? 0.5 : 1),
                  animation: isFirstCatOnboarding ? 'collectionPulse 2s ease-in-out infinite' : 'none',
                }}
              >
                {/* Icône catégorie + cadenas */}
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
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9,
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
                            ? <span style={{ color: '#FFD700', fontWeight: 700 }}>✓ Complété !</span>
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

      {/* Spotlight overlay (rendu indépendamment de la vue) */}
      {spotlightJSX}

      {showConnectBanner && <ConnectBanner onClose={() => setShowConnectBanner(false)} />}
    </div>
  )
}
