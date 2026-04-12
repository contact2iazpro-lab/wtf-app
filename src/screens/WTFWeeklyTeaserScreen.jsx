import { useState, useEffect } from 'react'
import { getCategoryById } from '../data/facts'
import { audio } from '../utils/audio'
import SettingsModal from '../components/SettingsModal'

// Simulate a realistic daily player count based on the date
function getDailyPlayerCount() {
  const seed = new Date().toISOString().slice(0, 10).split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return 847 + (seed % 312)
}

const S = (px) => `calc(${px}px * var(--scale))`

export default function WTFWeeklyTeaserScreen({ fact, titrePartiel, streak, onStart, onBack }) {
  const [visible, setVisible] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const cat = getCategoryById(fact.category)
  const playerCount = getDailyPlayerCount()

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="flex flex-col h-full w-full overflow-hidden"
      style={{
        background: 'linear-gradient(170deg, #0D9488 0%, #115E59 50%, #0F172A 100%)',
        transition: 'opacity 0.3s',
        opacity: visible ? 1 : 0,
      }}
    >
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Header with back + settings */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${S(8)} ${S(12)}`, flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{
            width: S(36), height: S(36), borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, color: 'white', fontSize: S(16), fontWeight: 900,
          }}
        >←</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div className="font-black text-base tracking-wide" style={{ color: '#FF6B1A' }}>WTF! de la Semaine</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: S(10) }}>Tous les jours, un nouveau f*ct</div>
        </div>
        <button
          onClick={() => { audio.play('click'); setShowSettings(true) }}
          style={{
            width: S(36), height: S(36), borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <img src="/assets/ui/icon-settings.png" style={{ width: S(20), height: S(20) }} alt="" />
        </button>
      </div>

      {/* Main content — compact, no scroll */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: `0 ${S(16)}`, gap: S(8), minHeight: 0 }}>

        {/* Image du f*ct — pleine largeur, floue, élément principal */}
        <div style={{
          width: '100%', borderRadius: S(20), overflow: 'hidden', position: 'relative',
          flex: 1, minHeight: 0, maxHeight: '40vh',
          background: `linear-gradient(135deg, ${cat?.color || '#7C3AED'}44, ${cat?.color || '#7C3AED'})`,
        }}>
          {fact.imageUrl ? (
            <img
              src={fact.imageUrl}
              alt=""
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                position: 'absolute', inset: 0,
                filter: 'blur(16px) brightness(0.55)',
              }}
              onError={(e) => { e.target.style.display = 'none' }}
            />
          ) : (
            <div style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(135deg, ${cat?.color || '#7C3AED'}66, ${cat?.color || '#7C3AED'})`,
              filter: 'blur(8px) brightness(0.55)',
            }} />
          )}
          {/* Overlay sombre */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 1 }} />
          {/* Cadenas + catégorie centrés */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: S(8), padding: S(16) }}>
            <span style={{ fontSize: S(40) }}>🔒</span>
            <div
              style={{
                background: `${cat?.color || '#7C3AED'}33`, border: `1px solid ${cat?.color || '#7C3AED'}66`,
                borderRadius: S(20), padding: `${S(4)} ${S(12)}`,
                fontSize: S(11), fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
              {cat?.label || fact.category}
            </div>
          </div>
        </div>

        {/* Accroche — question du f*ct comme teaser */}
        <div style={{
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(12px)', borderRadius: S(16), padding: `${S(12)} ${S(14)}`,
          flexShrink: 0,
        }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: S(9), fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: S(6), textAlign: 'center' }}>
            Le f*ct de la semaine
          </div>
          <div style={{ color: 'white', fontWeight: 900, fontSize: S(15), lineHeight: 1.35, textAlign: 'center' }}>
            {titrePartiel}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: S(10), textAlign: 'center', marginTop: S(6) }}>
            🔓 Joue la session pour révéler le f*ct complet
          </div>
        </div>

        {/* Social proof */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(6), flexShrink: 0 }}>
          <div className="flex -space-x-1.5">
            {['😎', '🧠', '🤯', '🦊'].map((e, i) => (
              <div key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-sm border" style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)', zIndex: 4 - i }}>
                {e}
              </div>
            ))}
          </div>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: S(11), fontWeight: 700 }}>
            <span style={{ color: 'white' }}>{playerCount.toLocaleString('fr-FR')}</span> joueurs aujourd'hui
          </span>
        </div>

        {/* Streak info if relevant — compact */}
        {streak >= 1 && (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: S(8),
              padding: `${S(8)} ${S(12)}`, borderRadius: S(14), flexShrink: 0,
              background: 'rgba(255,107,26,0.12)', border: '1px solid rgba(255,107,26,0.25)',
            }}>
            <span style={{ fontSize: S(18) }}>{streak >= 7 ? '💙🔥' : '🔥'}</span>
            <div>
              <div style={{ color: 'white', fontWeight: 900, fontSize: S(11) }}>Série en cours : {streak} jours</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: S(10) }}>Maintiens ta flamme en jouant aujourd'hui !</div>
            </div>
          </div>
        )}
      </div>

      {/* CTA — compact, no extra space */}
      <div style={{ padding: `${S(8)} ${S(16)} ${S(12)}`, flexShrink: 0 }}>
        <button
          onClick={() => { audio.play('click'); onStart() }}
          className="btn-press active:scale-95 transition-all"
          style={{
            width: '100%', padding: `${S(14)} 0`, borderRadius: S(16),
            color: 'white', fontWeight: 900, fontSize: S(15),
            textTransform: 'uppercase', letterSpacing: '0.04em', border: 'none',
            background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
            boxShadow: '0 8px 40px rgba(124,58,237,0.6), 0 2px 8px rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(8),
          }}>
          <span style={{ fontSize: S(20) }}>🎯</span>
          Jouer pour débloquer
        </button>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: S(10), textAlign: 'center', marginTop: S(6) }}>
          5 questions · Catégorie {cat?.label || fact.category} · ~2 minutes
        </div>
      </div>
    </div>
  )
}
