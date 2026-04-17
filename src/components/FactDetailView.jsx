import { useState } from 'react'
import { getPlayableCategories } from '../data/factsService'
import renderFormattedText from '../utils/renderFormattedText'

const S = (px) => `calc(${px}px * var(--scale))`

export default function FactDetailView({ fact, onClose }) {
  const [showLightbox, setShowLightbox] = useState(false)
  const cat = getPlayableCategories().find(c => c.id === fact.category)
  const catColor = cat?.color || '#FF6B1A'
  const catGradient = `linear-gradient(160deg, ${catColor}22 0%, ${catColor} 100%)`
  const isVip = !!fact.isVip

  // Même message que RevelationScreen mauvaise réponse (pool randomisé de 3 variantes)
  const share = () => {
    const shareMessages = [
      `Mate ce f*ct !\n\n"${fact.question}"\n\n${window.location.origin}`,
      `Tu connais ça ?!\n\n"${fact.question}"\n\n${window.location.origin}`,
      `Incroyable !\n\n"${fact.question}"\n\n${window.location.origin}`,
    ]
    const text = shareMessages[Math.floor(Math.random() * shareMessages.length)]
    if (navigator.share) navigator.share({ text }).catch(() => {})
    else navigator.clipboard?.writeText(text).catch(() => {})
  }

  return (
    <div className="fixed inset-0 flex justify-center" style={{ zIndex: 400, background: '#000' }}>
      <div style={{
        width: '100%', maxWidth: 430, height: '100%',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        ...(isVip ? { background: catGradient } : {
          backgroundImage: 'url(/assets/backgrounds/question-default.webp)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          backgroundColor: catColor,
        }),
        position: 'relative',
      }}>
        {/* Overlay */}
        {isVip ? (
          <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} style={{
                position: 'absolute',
                top: `${(i * 31 + 7) % 90}%`, left: `${(i * 43 + 13) % 95}%`,
                width: i % 3 === 0 ? 6 : 4, height: i % 3 === 0 ? 6 : 4,
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
        `}</style>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', flexShrink: 0, padding: `${S(8)} ${S(12)}` }}>
            <button
              onClick={onClose}
              style={{
                width: S(36), height: S(36), borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: S(16), color: '#ffffff', fontWeight: 900, lineHeight: 1 }}>←</span>
            </button>
          </div>

          {/* Question */}
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

          {/* Image */}
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
                  <img src={fact.imageUrl} alt={fact.question} style={{ objectFit: 'cover', width: '100%', maxHeight: 'calc(35vh - 6px)', display: 'block' }} />
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
                <div style={{ width: '100%', height: 'calc(35vh - 6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <div style={{ fontSize: 72, fontWeight: 900, color: 'white', lineHeight: 1, opacity: 0.3 }}>?</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Image bientôt disponible</div>
                </div>
              )}
            </div>
          </div>

          {/* Réponse + Explication */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: `${S(4)} ${S(12)} 0`, display: 'flex', flexDirection: 'column', gap: S(4) }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: S(12), padding: `${S(8)} ${S(10)}` }}>
              <div style={{ background: 'rgba(76,175,80,0.12)', border: '1px solid rgba(76,175,80,0.3)', borderRadius: S(8), padding: `${S(6)} ${S(8)}` }}>
                <div style={{ fontSize: S(9), fontWeight: 900, color: '#4CAF50', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: S(2) }}>Réponse :</div>
                <div style={{ fontSize: S(12), fontWeight: 700, color: '#ffffff' }}>{fact.shortAnswer || fact.options?.[fact.correctIndex]}</div>
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: S(12), padding: `${S(8)} ${S(10)}`, flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: S(4), marginBottom: S(3), flexShrink: 0 }}>
                <span style={{ color: '#ffffff', fontWeight: 900, fontSize: S(9), textTransform: 'uppercase', letterSpacing: '0.05em' }}>Le saviez-vous ?</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: S(10), lineHeight: 1.4, fontWeight: 500, margin: 0, flex: 1, minHeight: 0, overflowY: 'auto' }}>
                {fact.explanation}
              </p>
              {fact.sourceUrl && (
                <a href={fact.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: S(9), color: 'rgba(255,255,255,0.4)', display: 'block', marginTop: S(4), textDecoration: 'underline', textAlign: 'right', flexShrink: 0 }}>
                  Source
                </a>
              )}
            </div>
          </div>

          {/* Bouton partager */}
          <div style={{ flexShrink: 0, padding: `${S(4)} ${S(12)} ${S(10)}` }}>
            <button
              onClick={share}
              className="active:scale-95 transition-all"
              style={{
                width: '100%', height: S(44), borderRadius: S(14),
                fontWeight: 900, fontSize: S(13), color: '#ffffff',
                border: '3px solid #ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(6),
                background: `linear-gradient(135deg, ${catColor} 0%, ${catColor}cc 100%)`,
                boxShadow: `0 4px 16px ${catColor}50`,
              }}
            >
              Partager ce F*ct
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {showLightbox && fact.imageUrl && (
        <div
          onClick={() => setShowLightbox(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <button
            onClick={() => setShowLightbox(false)}
            style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: 18, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >✕</button>
          <img
            src={fact.imageUrl} alt={fact.question}
            onClick={e => e.stopPropagation()}
            style={{ width: '95%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 12, animation: 'factLightboxZoom 0.2s ease-out' }}
          />
          <style>{`@keyframes factLightboxZoom { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
        </div>
      )}
    </div>
  )
}
