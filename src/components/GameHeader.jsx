import { useState } from 'react'
import SettingsModal from './SettingsModal'
import { audio } from '../utils/audio'
import { usePlayerProfile } from '../hooks/usePlayerProfile'

const S = (px) => `calc(${px}px * var(--scale))`

const Pill = ({ icon, value, alt }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: S(4),
    background: 'rgba(255,255,255,0.25)', borderRadius: S(20),
    padding: `${S(3)} ${S(10)}`,
  }}>
    <img src={icon} alt={alt} style={{ width: S(14), height: S(14), objectFit: 'contain', flexShrink: 0 }} />
    <span style={{ fontWeight: 800, color: 'white', fontSize: S(11), whiteSpace: 'nowrap' }}>{value}</span>
  </div>
)

export default function GameHeader({
  // Les devises ne sont PLUS passées en props — lues depuis CurrencyContext
  categoryLabel = null,
  categoryColor = null,
  categoryIcon = null,
  onQuit = null,
  coinFlash = null,
}) {
  const [showSettings, setShowSettings] = useState(false)

  // Source unique de vérité pour les devises (Supabase si session, sinon localStorage)
  const { coins, hints } = usePlayerProfile()

  return (
    <>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      <div style={{
        display: 'flex', flexDirection: 'row',
        alignItems: 'center', justifyContent: 'space-between',
        width: '100%', flexShrink: 0,
        padding: `${S(8)} ${S(12)}`,
      }}>
        {/* Gauche : ✕ quitter + catégorie */}
        <div style={{ display: 'flex', alignItems: 'center', gap: S(6), flex: 1, minWidth: 0 }}>
          {onQuit && (
            <button
              onClick={onQuit}
              title="Quitter"
              style={{
                width: S(32), height: S(32), borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                border: '1.5px solid rgba(255,255,255,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: S(14), color: 'white', cursor: 'pointer', flexShrink: 0,
                WebkitTapHighlightColor: 'transparent',
              }}
            >✕</button>
          )}
          {categoryIcon ? (
            <img
              src={categoryIcon}
              alt={categoryLabel || ''}
              style={{ width: S(24), height: S(24), borderRadius: S(6), objectFit: 'cover', flexShrink: 0 }}
              onError={e => { e.target.style.display = 'none' }}
            />
          ) : categoryLabel ? (
            <span style={{
              fontWeight: 900, fontSize: categoryLabel.length > 15 ? S(9) : S(11),
              color: categoryColor || 'rgba(255,255,255,0.7)',
              lineHeight: 1.2, whiteSpace: 'nowrap',
            }}>
              {categoryLabel}
            </span>
          ) : null}
        </div>

        {/* Droite : pills + settings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: S(6), flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <Pill icon="/assets/ui/icon-coins.png" value={coins} alt="coins" />
            {coinFlash && (
              <span style={{
                position: 'absolute', top: '-12px', right: S(4),
                color: '#22C55E', fontWeight: 900, fontSize: S(10), whiteSpace: 'nowrap',
                animation: 'coinFlashUp 1.2s ease-out forwards', pointerEvents: 'none',
              }}>
                {coinFlash}
              </span>
            )}
          </div>
          <Pill icon="/assets/ui/icon-hint.png" value={hints} alt="hints" />
          <button
            onClick={() => { audio.play('click'); setShowSettings(true) }}
            style={{
              width: S(28), height: S(28), borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              border: 'none', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <img src="/assets/ui/icon-settings.png" alt="settings" style={{ width: S(16), height: S(16) }} />
          </button>
        </div>
      </div>
    </>
  )
}
