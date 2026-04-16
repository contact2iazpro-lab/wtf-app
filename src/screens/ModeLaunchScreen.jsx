import { useState } from 'react'
import { useScale } from '../hooks/useScale'
import { audio } from '../utils/audio'
import MultipleChoiceIcon from '../components/icons/MultipleChoiceIcon'
import QuestionTargetIcon from '../components/icons/QuestionTargetIcon'
import TimerIcon from '../components/icons/TimerIcon'
import PerfectIcon from '../components/icons/PerfectIcon'
import EnergyIcon from '../components/icons/EnergyIcon'
import InfinityIcon from '../components/icons/InfinityIcon'
import SwipeArrowsIcon from '../components/icons/SwipeArrowsIcon'
import ShareIcon from '../components/icons/ShareIcon'

const S = (px) => `calc(${px}px * var(--scale))`

import { CURRENCY_EMOJI_MAP } from '../utils/renderEmoji'

const EMOJI_IMG = {
  '🎰': '/assets/ui/emoji-roulette.png?v=2',
  '🗺️': '/assets/ui/emoji-route.png',
  '🧩': '/assets/ui/emoji-puzzle.png',
  ...CURRENCY_EMOJI_MAP,
}

const QUICKIE_VIOLET = '#7F77DD'
const QUICKIE_GOLD = '#FFD700'
const VOF_GREEN = '#6BCB77'
const VOF_RED = '#E84535'

const COMPONENT_ICONS = {
  'icon:qcm': (size, color) => <MultipleChoiceIcon size={size} color={color === QUICKIE_GOLD ? QUICKIE_VIOLET : (color || '#ffffff')} accent={color || undefined} />,
  'icon:set': (size, color, modeId) => {
    if (modeId === 'vrai_ou_fou') return <QuestionTargetIcon size={size} color={'#ffffff'} accent={VOF_GREEN} questionColor={VOF_RED} />
    return <QuestionTargetIcon size={size} color={color === QUICKIE_GOLD ? '#ffffff' : (color || '#ffffff')} accent={color === QUICKIE_GOLD ? QUICKIE_VIOLET : (color || undefined)} questionColor={color === QUICKIE_GOLD ? QUICKIE_GOLD : null} />
  },
  'icon:timer': (size, color, modeId) => {
    if (modeId === 'vrai_ou_fou') return <TimerIcon size={size} color={VOF_GREEN} accent={VOF_RED} />
    return <TimerIcon size={size} color={color === QUICKIE_GOLD ? QUICKIE_VIOLET : (color || '#ffffff')} accent={color || undefined} />
  },
  'icon:perfect': (size, color) => <PerfectIcon size={size} accent={color || undefined} />,
  'icon:energy': (size, color) => <EnergyIcon size={size} color={color || '#22C55E'} />,
  'picto:infinity': (size) => <InfinityIcon size={size} />,
  'picto:swipe': (size) => <SwipeArrowsIcon size={size} />,
  'picto:share': (size) => <ShareIcon size={size} />,
}

function renderIcon(value, size, color, modeId) {
  const compFn = COMPONENT_ICONS[value]
  if (compFn) return compFn(size, color, modeId)
  if (value === '🔋') return <EnergyIcon size={size || 16} color={color} />
  const src = EMOJI_IMG[value]
  if (!src) return value
  return <img src={src} alt="" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} />
}

function renderText(text) {
  // Support {{red}}...{{/red}} + **bold**
  const parts = text.split(/(\{\{red\}\}.*?\{\{\/red\}\}|\*\*.*?\*\*)/g)
  return parts.map((part, i) => {
    const redMatch = part.match(/^\{\{red\}\}(.*?)\{\{\/red\}\}$/)
    if (redMatch) return <span key={i} style={{ color: '#E84535' }}>{redMatch[1]}</span>
    const boldMatch = part.match(/^\*\*(.*?)\*\*$/)
    if (boldMatch) return <strong key={i}>{boldMatch[1]}</strong>
    return part
  })
}

export default function ModeLaunchScreen({ modeId, modeName, subtitle, emoji, icon, rules, color, ctaLabel, onStart, onBack }) {
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
        display: 'flex', flexDirection: 'column', gap: (modeId === 'quickie' || modeId === 'vrai_ou_fou') ? S(5) : S(8),
        justifyContent: 'flex-start',
      }}>
        {(rules || []).map((rule, i) => {
          const isStyled = modeId === 'quickie' || modeId === 'vrai_ou_fou'
          const isQuickie = modeId === 'quickie'
          const isVOF = modeId === 'vrai_ou_fou'
          const modeColor = isQuickie ? '#7F77DD' : isVOF ? '#6BCB77' : undefined
          let iconColor = undefined
          if (isQuickie) {
            iconColor = rule.icon === 'icon:energy' ? '#22C55E' : '#FFD700'
          } else if (isVOF) {
            iconColor = i % 2 === 0 ? '#6BCB77' : '#E84535'
          }
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: S(12),
              background: isStyled ? '#ffffff' : 'rgba(255,255,255,0.12)',
              border: isStyled ? `2px solid ${modeColor}` : 'none',
              backdropFilter: isStyled ? 'none' : 'blur(8px)',
              borderRadius: S(12), padding: isStyled ? `${S(8)} ${S(14)}` : `${S(12)} ${S(14)}`,
            }}>
              <span style={{ fontSize: S(22), flexShrink: 0, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: S(22), height: S(22), color: isStyled ? modeColor : 'inherit' }}>{renderIcon(rule.icon, 22, iconColor, modeId)}</span>
              <span style={{ fontSize: S(13), fontWeight: isStyled ? 700 : 600, lineHeight: 1.35, color: isStyled ? modeColor : 'inherit' }}>
                {renderText(rule.text)}
              </span>
            </div>
          )
        })}
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
            background: modeId === 'vrai_ou_fou'
              ? '#008000'
              : '#9400D3',
            border: '3px solid #ffffff',
            borderRadius: S(16),
            fontFamily: 'Nunito, sans-serif',
            fontSize: S(18), fontWeight: 900,
            color: '#ffffff',
            cursor: 'pointer',
            boxShadow: modeId === 'vrai_ou_fou'
              ? '0 8px 30px rgba(0,128,0,0.5), 0 4px 0 rgba(0,0,0,0.15)'
              : '0 8px 30px rgba(148,0,211,0.5), 0 4px 0 rgba(0,0,0,0.15)',
            letterSpacing: '0.04em',
          }}
        >
          {ctaLabel || "LET'S GO !"}
        </button>
      </div>
    </div>
  )
}
