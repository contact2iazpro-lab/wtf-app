import { useState, useEffect } from 'react'
import { getCategoryById } from '../data/facts'
import { audio } from '../utils/audio'
import CoinsIcon from '../components/CoinsIcon'
import { useScale } from '../hooks/useScale'
import { stripEmojis } from '../utils/stripEmojis'

export default function WTFWeeklyRevealScreen({
  fact,
  sessionScore,
  correctCount,
  totalFacts,
  coinsEarned,
  streak,
  onHome,
  onShare,
}) {
  const scale = useScale()
  const S = (px) => `calc(${px}px * var(--scale))`
  const [phase, setPhase] = useState(0)
  const [displayedCoins, setDisplayedCoins] = useState(0)
  const [showLightbox, setShowLightbox] = useState(false)
  const cat = getCategoryById(fact.category)
  const catColor = cat?.color || '#FF6B1A'

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 600)
    const t2 = setTimeout(() => {
      setPhase(2)
      audio.playFile?.('Coins points.mp3')
    }, 1400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  useEffect(() => {
    if (phase < 2 || coinsEarned === 0) return
    let current = 0
    const step = Math.ceil(coinsEarned / 20)
    const interval = setInterval(() => {
      current = Math.min(current + step, coinsEarned)
      setDisplayedCoins(current)
      if (current >= coinsEarned) clearInterval(interval)
    }, 50)
    return () => clearInterval(interval)
  }, [phase, coinsEarned])

  return (
    <div
      className="flex flex-col h-full w-full"
      style={{
        '--scale': scale, fontFamily: 'Nunito, sans-serif',
        backgroundImage: 'url(/assets/backgrounds/question-default.webp)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        backgroundColor: catColor, overflow: 'hidden',
      }}>
      {/* Overlay catégorie + glow doré VIP */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: `${catColor}cc`,
      }} />
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse at 50% 30%, rgba(255,215,0,0.08) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

        {/* Header — catégorie + badge */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: S(10), padding: `${S(12)} ${S(16)}`, flexShrink: 0,
            transform: phase >= 1 ? 'translateY(0)' : 'translateY(-20px)',
            opacity: phase >= 1 ? 1 : 0, transition: 'all 0.5s ease',
          }}>
          <img
            src={`/assets/categories/${fact.category}.png`}
            alt={cat?.label}
            style={{ width: S(40), height: S(40), borderRadius: '50%', objectFit: 'cover', border: `2px solid rgba(255,215,0,0.5)` }}
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ color: 'white', fontWeight: 900, fontSize: S(16), textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>What The F*ct !</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: S(10), fontWeight: 700 }}>F*ct de la semaine débloqué</div>
          </div>
          <span style={{ fontSize: S(10), fontWeight: 900, color: '#FFD700', background: 'rgba(255,215,0,0.15)', borderRadius: S(12), padding: `${S(3)} ${S(10)}`, border: '1px solid rgba(255,215,0,0.3)' }}>
            VIP
          </span>
        </div>

        {/* Image pleine largeur — VIP glow + lightbox */}
        <div style={{
          flexShrink: 0, padding: `0 ${S(16)}`, maxHeight: '35vh',
          transform: phase >= 1 ? 'translateY(0)' : 'translateY(60px)',
          opacity: phase >= 1 ? 1 : 0, transition: 'all 0.6s cubic-bezier(0.34,1.2,0.64,1) 0.2s',
        }}>
          <div
            className="overflow-hidden relative wow-shine wow-glow gold-card-rounded"
            onClick={() => fact.imageUrl && setShowLightbox(true)}
            style={{
              width: '100%', maxHeight: '35vh', borderRadius: S(16), padding: 4,
              cursor: fact.imageUrl ? 'pointer' : 'default',
              background: `linear-gradient(135deg, ${catColor}44, ${catColor})`,
            }}
          >
            {fact.imageUrl ? (
              <img
                src={fact.imageUrl}
                alt={fact.question}
                style={{ objectFit: 'contain', width: '100%', maxHeight: 'calc(35vh - 14px)', display: 'block', borderRadius: S(12) }}
              />
            ) : (
              <div style={{ width: '100%', height: 'calc(30vh - 14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: S(12), background: `linear-gradient(135deg, ${catColor}66, ${catColor})` }}>
                <span style={{ fontSize: 72, fontWeight: 900, color: 'white', opacity: 0.3 }}>?</span>
              </div>
            )}
          </div>
        </div>

        {/* Titre + réponse */}
        <div style={{ flexShrink: 0, padding: `${S(8)} ${S(16)}`, textAlign: 'center' }}>
          <div style={{ fontSize: S(14), fontWeight: 900, color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.5)', lineHeight: 1.3 }}>
            {fact.shortAnswer}
          </div>
        </div>

        {/* Le Saviez-Vous — complet, pas tronqué */}
        <div style={{
          flex: 1, minHeight: 0, overflow: 'hidden', padding: `0 ${S(16)}`,
          display: 'flex', flexDirection: 'column',
          opacity: phase >= 1 ? 1 : 0, transition: 'opacity 0.4s ease 0.4s',
        }}>
          <div style={{
            background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: S(14), padding: `${S(8)} ${S(12)}`, flex: 1, overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: S(4), marginBottom: S(4) }}>
              <span style={{ color: 'white', fontWeight: 900, fontSize: S(9), textTransform: 'uppercase', letterSpacing: '0.05em' }}>Le saviez-vous ?</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: S(12), lineHeight: 1.4, fontWeight: 500, margin: 0 }}>
              {stripEmojis(fact.explanation)}
            </p>
          </div>
        </div>

        {/* Score compact */}
        <div style={{
          flexShrink: 0, padding: `${S(8)} ${S(16)}`,
          opacity: phase >= 2 ? 1 : 0, transition: 'opacity 0.4s ease 0.3s',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: S(16), textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: S(18), fontWeight: 900, color: 'white' }}>{correctCount}/{totalFacts}</div>
              <div style={{ fontSize: S(9), fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Correct</div>
            </div>
            <div>
              <div style={{ fontSize: S(18), fontWeight: 900, color: '#FFD700' }}>+{displayedCoins}</div>
              <div style={{ fontSize: S(9), fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}><CoinsIcon size={10} /> Coins</div>
            </div>
            {streak > 0 && (
              <div>
                <div style={{ fontSize: S(18), fontWeight: 900, color: '#FF6B1A' }}>🔥 {streak}</div>
                <div style={{ fontSize: S(9), fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Série</div>
              </div>
            )}
          </div>
        </div>

        {/* Boutons */}
        <div style={{
          flexShrink: 0, padding: `0 ${S(16)} ${S(12)}`,
          opacity: phase >= 2 ? 1 : 0, transition: 'opacity 0.4s ease 0.5s',
        }}>
          <div style={{ display: 'flex', gap: S(8), height: S(44) }}>
            <button
              onClick={onHome}
              className="active:scale-95 transition-all"
              style={{
                flex: 1, height: '100%', borderRadius: S(14), fontWeight: 900, fontSize: S(13),
                background: 'linear-gradient(135deg, #FF5C1A, #D94A10)', color: 'white', border: 'none',
                boxShadow: '0 4px 16px rgba(255,92,26,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ✓ Ajouter à ma collection
            </button>
            <button
              onClick={() => { audio.play('click'); onShare() }}
              className="active:scale-95 transition-all"
              style={{
                width: S(44), height: '100%', borderRadius: S(14), fontSize: S(18),
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              📤
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {showLightbox && fact.imageUrl && (
        <div
          onClick={() => setShowLightbox(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
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
              animation: 'huntLightboxZoom 0.2s ease-out',
            }}
          />
          <style>{`
            @keyframes huntLightboxZoom {
              from { transform: scale(0.8); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </div>
  )
}
