import { useState } from 'react'
import { useScale } from '../hooks/useScale'
import { audio } from '../utils/audio'
import MultipleChoiceIcon from '../components/icons/MultipleChoiceIcon'

const S = (px) => `calc(${px}px * var(--scale))`

import { CURRENCY_EMOJI_MAP } from '../utils/renderEmoji'

const EMOJI_IMG = {
  '🎰': '/assets/ui/emoji-roulette.png?v=2',
  '🔋': '/assets/ui/emoji-energy.png',
  '🗺️': '/assets/ui/emoji-route.png',
  '🧩': '/assets/ui/emoji-puzzle.png',
  ...CURRENCY_EMOJI_MAP,
}

const COMPONENT_ICONS = {
  'icon:qcm': (size) => <MultipleChoiceIcon size={size} />,
}

function renderIcon(value, size) {
  const compFn = COMPONENT_ICONS[value]
  if (compFn) return compFn(size)
  const src = EMOJI_IMG[value]
  if (!src) return value
  return <img src={src} alt="" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} />
}

export default function ModeLaunchScreen({ modeId, modeName, subtitle, emoji, icon, rules, color, onStart, onBack }) {
  const scale = useScale()
  const [skipNext, setSkipNext] = useState(false)

  const handleStart = () => {
    audio.play('click')
    if (skipNext && modeId) {
      localStorage.setItem(`skip_launch_${modeId}`, 'true')
    }
    onStart()
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', width: '100%',
      overflow: 'hidden', boxSizing: 'border-box',
      fontFamily: 'Nunito, sans-serif',
      '--scale': scale,
      background: `linear-gradient(160deg, ${color}88, ${color})`,
      color: '#ffffff',
      position: 'relative',
    }}>
      {/* Bouton retour */}
      <div style={{ flexShrink: 0, padding: `${S(16)} ${S(16)} 0` }}>
        <button
          onClick={() => { audio.play('click'); onBack() }}
          style={{
            background: 'rgba(255,255,255,0.2)', border: 'none',
            borderRadius: '50%', width: S(36), height: S(36),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: S(18), color: '#fff',
            backdropFilter: 'blur(8px)',
          }}
        >
          ←
        </button>
      </div>

      {/* Icône + Titre + Sous-titre */}
      <div style={{
        textAlign: 'center', flexShrink: 0,
        padding: `${S(8)} ${S(20)} ${S(8)}`,
      }}>
        {icon
          ? <img src={icon} alt={modeName} style={{ width: S(110), height: S(110), objectFit: 'contain', marginBottom: S(4), display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
          : <div style={{ fontSize: S(40), marginBottom: S(2), lineHeight: 1 }}>{renderIcon(emoji)}</div>
        }
        <h1 style={{
          fontSize: S(28), fontWeight: 900, margin: 0,
          letterSpacing: '0.02em',
          textShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}>
          {modeName}
        </h1>
        <p style={{
          fontSize: S(15), fontWeight: 700, margin: `${S(4)} 0 0`,
          opacity: 0.8,
        }}>
          {subtitle}
        </p>
      </div>

      {/* Règles */}
      <div style={{
        flex: 1, minHeight: 0, overflow: 'hidden',
        padding: `0 ${S(20)}`,
        display: 'flex', flexDirection: 'column', gap: S(8),
        justifyContent: 'flex-start',
      }}>
        {(rules || []).map((rule, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: S(12),
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(8px)',
            borderRadius: S(12), padding: `${S(12)} ${S(14)}`,
          }}>
            <span style={{ fontSize: S(22), flexShrink: 0, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: S(22), height: S(22) }}>{renderIcon(rule.icon, 22)}</span>
            <span style={{ fontSize: S(13), fontWeight: 600, lineHeight: 1.35 }}>
              {rule.text}
            </span>
          </div>
        ))}
      </div>

      {/* Checkbox + Bouton */}
      <div style={{
        flexShrink: 0, padding: `${S(8)} ${S(20)} ${S(12)}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <button
          onClick={() => setSkipNext(!skipNext)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: S(10), marginBottom: S(14), cursor: 'pointer',
            background: 'none', border: 'none', padding: 0,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <div style={{
            width: S(22), height: S(22), borderRadius: S(6),
            border: `2.5px solid ${skipNext ? '#ffffff' : 'rgba(255,255,255,0.5)'}`,
            background: skipNext ? 'rgba(255,255,255,0.25)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s ease',
            flexShrink: 0,
          }}>
            {skipNext && <span style={{ fontSize: S(14), color: '#ffffff', fontWeight: 900, lineHeight: 1 }}>✓</span>}
          </div>
          <span style={{
            fontSize: S(12), fontWeight: 700,
            color: 'rgba(255,255,255,0.8)',
          }}>
            Ne plus afficher ce message
          </span>
        </button>

        {/* Bouton C'EST PARTI ! */}
        <button
          onClick={handleStart}
          className="active:scale-95 transition-transform"
          style={{
            width: '85%', padding: `${S(14)} 0`,
            background: '#9400D3',
            border: '3px solid #ffffff',
            borderRadius: S(16),
            fontFamily: 'Nunito, sans-serif',
            fontSize: S(18), fontWeight: 900,
            color: '#ffffff',
            cursor: 'pointer',
            boxShadow: '0 8px 30px rgba(148,0,211,0.5), 0 4px 0 rgba(0,0,0,0.15)',
            letterSpacing: '0.04em',
          }}
        >
          LET'S GO !
        </button>
      </div>
    </div>
  )
}
