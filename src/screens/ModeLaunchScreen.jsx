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

const QUICKIE_VIOLET = '#FFA500'
const QUICKIE_GOLD = '#FFD700'
const VOF_GREEN = '#6BCB77'
const VOF_RED = '#E84535'

const MODE_COLORS = {
  quickie: '#FF7518',
  vrai_ou_fou: '#008000',
  race: '#0F52BA',
  blitz: '#FF4444',
  quest: '#D94A10',
  flash: '#E91E63',
  multi: '#6B2D8E',
}

const MULTI_VIOLET = '#6B2D8E'
const MULTI_GOLD = '#FFD700'
const QUEST_ORANGE = '#FF6B1A'
const QUEST_DARK = '#D94A10'

const STYLED_MODES = ['quickie', 'vrai_ou_fou', 'race', 'blitz', 'multi', 'quest']

function NoHintIcon({ size = 64, color = '#ffffff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="38" stroke={color} strokeWidth="6" fill="none" />
      <text x="50" y="58" textAnchor="middle" fill={color} fontSize="40" fontWeight="900" fontFamily="Nunito, sans-serif">💡</text>
      <line x1="22" y1="78" x2="78" y2="22" stroke={color} strokeWidth="6" strokeLinecap="round" />
    </svg>
  )
}

function FreeIcon({ size = 64, color = '#ffffff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="38" stroke={color} strokeWidth="6" fill="none" />
      <text x="50" y="66" textAnchor="middle" fill={color} fontSize="44" fontWeight="900" fontFamily="Nunito, sans-serif">∞</text>
    </svg>
  )
}

function TrophyIcon({ size = 64, color = '#ffffff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 25h40v30c0 12-8 20-20 20s-20-8-20-20V25z" stroke={color} strokeWidth="6" fill="none" strokeLinejoin="round" />
      <path d="M30 35H18c0 14 6 20 12 22" stroke={color} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M70 35h12c0 14-6 20-12 22" stroke={color} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="50" y1="75" x2="50" y2="85" stroke={color} strokeWidth="5" strokeLinecap="round" />
      <line x1="36" y1="85" x2="64" y2="85" stroke={color} strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}

function PenaltyIcon({ size = 64, color = '#ffffff', accent = null, text = '−5s' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="38" stroke={color} strokeWidth="6" fill="none" />
      <text x="50" y="64" textAnchor="middle" fill={accent || color} fontSize="38" fontWeight="900" fontFamily="Nunito, sans-serif">{text}</text>
    </svg>
  )
}

function TargetIcon({ size = 64, color = '#ffffff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="38" stroke={color} strokeWidth="6" fill="none" />
      <circle cx="50" cy="50" r="24" stroke={color} strokeWidth="5" fill="none" />
      <circle cx="50" cy="50" r="10" fill={color} />
    </svg>
  )
}

// Escalier 3 marches — Paliers
function StepsIcon({ size = 64, color = '#ffffff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="65" width="26" height="22" rx="2" fill={color} />
      <rect x="37" y="45" width="26" height="42" rx="2" fill={color} />
      <rect x="62" y="25" width="26" height="62" rx="2" fill={color} />
    </svg>
  )
}

// Épées croisées — Mode Multi
function SwordsIcon({ size = 64, color = '#ffffff', accent = null }) {
  const blade = accent || color
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Lame 1 (NW→SE) */}
      <line x1="18" y1="18" x2="70" y2="70" stroke={blade} strokeWidth="8" strokeLinecap="round" />
      <circle cx="14" cy="14" r="5" fill={color} />
      <line x1="72" y1="72" x2="86" y2="86" stroke={color} strokeWidth="5" strokeLinecap="round" />
      {/* Lame 2 (NE→SW) */}
      <line x1="82" y1="18" x2="30" y2="70" stroke={blade} strokeWidth="8" strokeLinecap="round" />
      <circle cx="86" cy="14" r="5" fill={color} />
      <line x1="28" y1="72" x2="14" y2="86" stroke={color} strokeWidth="5" strokeLinecap="round" />
      {/* Point central */}
      <circle cx="50" cy="50" r="4" fill={accent || color} />
    </svg>
  )
}

function SurvivalIcon({ size = 64, color = '#ffffff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 15L15 85h70L50 15z" stroke={color} strokeWidth="6" fill="none" strokeLinejoin="round" />
      <line x1="50" y1="40" x2="50" y2="60" stroke={color} strokeWidth="6" strokeLinecap="round" />
      <circle cx="50" cy="72" r="4" fill={color} />
    </svg>
  )
}

const COMPONENT_ICONS = {
  'icon:qcm': (size, color, modeId) => {
    if (modeId === 'race') return <MultipleChoiceIcon size={size} color={'#0F52BA'} accent={QUICKIE_GOLD} />
    if (modeId === 'blitz') return <MultipleChoiceIcon size={size} color={'#FF4444'} accent={QUICKIE_GOLD} />
    if (modeId === 'multi') return <MultipleChoiceIcon size={size} color={'#ffffff'} accent={MULTI_GOLD} />
    return <MultipleChoiceIcon size={size} color={color === QUICKIE_GOLD ? QUICKIE_VIOLET : (color || '#ffffff')} accent={color || undefined} />
  },
  'icon:set': (size, color, modeId) => {
    if (modeId === 'vrai_ou_fou') return <QuestionTargetIcon size={size} color={'#ffffff'} accent={VOF_GREEN} questionColor={VOF_RED} />
    return <QuestionTargetIcon size={size} color={color === QUICKIE_GOLD ? '#ffffff' : (color || '#ffffff')} accent={color === QUICKIE_GOLD ? QUICKIE_VIOLET : (color || undefined)} questionColor={color === QUICKIE_GOLD ? QUICKIE_GOLD : null} />
  },
  'icon:timer': (size, color, modeId) => {
    if (modeId === 'vrai_ou_fou') return <TimerIcon size={size} color={VOF_GREEN} accent={VOF_RED} />
    if (modeId === 'race') return <TimerIcon size={size} color={'#0F52BA'} accent={QUICKIE_GOLD} />
    if (modeId === 'blitz') return <TimerIcon size={size} color={'#FF4444'} accent={'#FF4444'} />
    if (modeId === 'multi') return <TimerIcon size={size} color={'#ffffff'} accent={MULTI_GOLD} />
    return <TimerIcon size={size} color={color === QUICKIE_GOLD ? QUICKIE_VIOLET : (color || '#ffffff')} accent={color || undefined} />
  },
  'icon:perfect': (size, color) => <PerfectIcon size={size} accent={color || undefined} />,
  'icon:star': (size) => <img src="/assets/ui/wtf-star.png" alt="" style={{ width: size, height: size, objectFit: 'contain' }} />,
  'icon:energy': (size, color) => <EnergyIcon size={size} color={color || '#22C55E'} />,
  'icon:hint': (size) => <img src="/assets/ui/icon-hint.png" alt="" style={{ width: size, height: size, objectFit: 'contain' }} />,
  'icon:coins': (size) => <img src="/assets/ui/icon-coins.png" alt="" style={{ width: size, height: size, objectFit: 'contain' }} />,
  'picto:infinity': (size, color) => <InfinityIcon size={size} color={color || '#6BCB77'} />,
  'picto:swipe': (size, color) => <SwipeArrowsIcon size={size} />,
  'picto:share': (size, color) => <ShareIcon size={size} />,
  'picto:no-hint': (size, color) => <NoHintIcon size={size} color={color || '#ffffff'} />,
  'picto:free': (size, color) => <FreeIcon size={size} color={color || '#ffffff'} />,
  'picto:trophy': (size, color) => <TrophyIcon size={size} color={color || '#ffffff'} />,
  'picto:penalty': (size, color, modeId) => {
    if (modeId === 'blitz') return <PenaltyIcon size={size} color={'#FF4444'} accent={'#FF4444'} text="−5s" />
    if (modeId === 'multi') return <PenaltyIcon size={size} color={'#ffffff'} accent={MULTI_GOLD} text="±5s" />
    return <PenaltyIcon size={size} color={color || '#ffffff'} />
  },
  'picto:target': (size, color) => <TargetIcon size={size} color={color || '#ffffff'} />,
  'picto:steps': (size, color) => <StepsIcon size={size} color={color || '#ffffff'} />,
  'picto:swords': (size, color, modeId) => {
    if (modeId === 'multi') return <SwordsIcon size={size} color={'#ffffff'} accent={MULTI_GOLD} />
    return <SwordsIcon size={size} color={color || '#ffffff'} />
  },
  'picto:survival': (size, color) => <SurvivalIcon size={size} color={color || '#ffffff'} />,
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
  // Règle (17/04/2026) : la page de règles s'affiche TOUJOURS par défaut, case décochée.
  // - Seul le clic utilisateur sur la case "Ne plus afficher" + LET'S GO active skip_launch_${modeId}.
  // - Unique moyen de réactiver : décocher "Réafficher les règles au lancement" dans le livret (HowToPlayModal).
  // - Aucun autre code ne doit écrire la clé skip_launch_* (audité 18/04/2026).
  const [skipNext, setSkipNext] = useState(false)

  const handleStart = () => {
    audio.play('click')
    if (skipNext && modeId) {
      localStorage.setItem(`skip_launch_${modeId}`, 'true')
    }
    onStart()
  }

  const isStyled = STYLED_MODES.includes(modeId)
  const modeColor = MODE_COLORS[modeId] || color
  const textColor = modeId === 'quickie' ? '#FFA500'
    : modeId === 'vrai_ou_fou' ? '#6BCB77'
    : modeId === 'race' ? '#23D5D5'
    : modeId === 'multi' ? MULTI_VIOLET
    : modeId === 'quest' ? QUEST_ORANGE
    : modeColor

  const btnBg = modeId === 'vrai_ou_fou' ? '#008000'
    : modeId === 'race' ? '#0F52BA'
    : modeId === 'blitz' ? '#CC0000'
    : modeId === 'multi' ? MULTI_VIOLET
    : modeId === 'quest' ? QUEST_DARK
    : '#FF7518'
  const btnShadow = modeId === 'vrai_ou_fou' ? '0 8px 30px rgba(0,128,0,0.5), 0 4px 0 rgba(0,0,0,0.15)'
    : modeId === 'race' ? '0 8px 30px rgba(0,255,255,0.5), 0 4px 0 rgba(0,0,0,0.15)'
    : modeId === 'blitz' ? '0 8px 30px rgba(204,0,0,0.5), 0 4px 0 rgba(0,0,0,0.15)'
    : modeId === 'multi' ? '0 8px 30px rgba(107,45,142,0.5), 0 4px 0 rgba(0,0,0,0.15)'
    : modeId === 'quest' ? '0 8px 30px rgba(217,74,16,0.5), 0 4px 0 rgba(0,0,0,0.15)'
    : '0 8px 30px rgba(255,117,24,0.5), 0 4px 0 rgba(0,0,0,0.15)'

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

      {/* Icône + Titre + Sous-titre — compact pour laisser la place aux règles */}
      <div style={{
        textAlign: 'center', flexShrink: 0,
        padding: `${S(4)} ${S(20)} ${S(4)}`,
      }}>
        {icon
          ? <img src={icon} alt={modeName} style={{ width: S(72), height: S(72), objectFit: 'contain', marginBottom: S(2), display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
          : <div style={{ fontSize: S(32), marginBottom: S(2), lineHeight: 1 }}>{renderIcon(emoji)}</div>
        }
        <h1 style={{
          fontSize: S(22), fontWeight: 900, margin: 0,
          letterSpacing: '0.02em',
          textShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}>
          {modeName}
        </h1>
        <p style={{
          fontSize: S(12), fontWeight: 700, margin: `${S(2)} 0 0`,
          opacity: 0.8,
        }}>
          {subtitle}
        </p>
      </div>

      {/* Règles — compact, sans scroll, encadrés tous à la largeur du plus grand,
          centrés horizontalement et verticalement (équidistance titre ↔ bouton) */}
      <div style={{
        flex: 1, minHeight: 0, overflow: 'hidden',
        padding: `0 ${S(16)}`,
        display: 'grid',
        gridTemplateColumns: 'auto',
        justifyContent: 'center',
        alignContent: 'center',
        rowGap: isStyled ? S(4) : S(5),
      }}>
        {(rules || []).map((rule, i) => {
          let iconColor = undefined
          if (modeId === 'quickie') {
            iconColor = rule.icon === 'icon:energy' ? '#22C55E' : '#FFD700'
          } else if (modeId === 'vrai_ou_fou') {
            iconColor = i % 2 === 0 ? '#6BCB77' : '#E84535'
          } else if (modeId === 'race') {
            iconColor = i % 2 === 0 ? '#00E5FF' : '#0097A7'
          } else if (modeId === 'blitz') {
            iconColor = i % 2 === 0 ? '#FF4444' : '#CC0000'
          } else if (modeId === 'multi') {
            iconColor = i % 2 === 0 ? MULTI_VIOLET : '#4A1E63'
          } else if (modeId === 'quest') {
            iconColor = i % 2 === 0 ? QUEST_ORANGE : QUEST_DARK
          }
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: S(10),
              background: isStyled ? '#ffffff' : 'rgba(255,255,255,0.12)',
              border: isStyled ? `3px solid ${modeColor}` : 'none',
              backdropFilter: isStyled ? 'none' : 'blur(8px)',
              borderRadius: S(10), padding: isStyled ? `${S(5)} ${S(10)}` : `${S(8)} ${S(10)}`,
              width: '100%', boxSizing: 'border-box',
            }}>
              <span style={{ fontSize: S(18), flexShrink: 0, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: S(18), height: S(18), color: isStyled ? textColor : 'inherit' }}>{renderIcon(rule.icon, 18, iconColor, modeId)}</span>
              <span style={{ fontSize: S(12), fontWeight: isStyled ? 700 : 600, lineHeight: 1.3, color: isStyled ? textColor : 'inherit' }}>
                {renderText(rule.text)}
              </span>
            </div>
          )
        })}
      </div>

      {/* Checkbox + Bouton — footer compact */}
      <div style={{
        flexShrink: 0, padding: `${S(4)} ${S(20)} ${S(10)}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <button
          onClick={() => setSkipNext(!skipNext)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: S(8), marginBottom: S(8), cursor: 'pointer',
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

        {/* Bouton CTA */}
        <button
          onClick={handleStart}
          className="active:scale-95 transition-transform"
          style={{
            width: '85%', padding: `${S(14)} 0`,
            background: btnBg,
            border: '3px solid #ffffff',
            borderRadius: S(16),
            fontFamily: 'Nunito, sans-serif',
            fontSize: S(18), fontWeight: 900,
            color: '#ffffff',
            cursor: 'pointer',
            boxShadow: btnShadow,
            letterSpacing: '0.04em',
          }}
        >
          {ctaLabel || "LET'S GO !"}
        </button>
      </div>
    </div>
  )
}
