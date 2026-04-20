import { useState } from 'react'
import { useScale } from '../hooks/useScale'
import { audio } from '../utils/audio'
// Icons + renderIcon partagés avec HowToPlayModal (source unique de vérité)
import { renderIcon } from '../utils/modeRuleIcons'

const S = (px) => `calc(${px}px * var(--scale))`

const MODE_COLORS = {
  quickie: '#C2185B',
  vrai_ou_fou: '#008000',
  race: '#0F52BA',
  blitz: '#FF4444',
  quest: '#D94A10',
  drop: '#E91E63',
  multi: '#6B2D8E',
}

const MULTI_VIOLET = '#6B2D8E'
const MULTI_GOLD = '#FFD700'
const QUEST_ORANGE = '#FF6B1A'
const QUEST_DARK = '#D94A10'
const DROP_PINK = '#E91E63'
const DROP_DARK = '#AD1457'

const STYLED_MODES = ['quickie', 'vrai_ou_fou', 'race', 'blitz', 'multi', 'quest', 'drop']

function renderText(text, highlightColor) {
  const parts = text.split(/(\{\{red\}\}.*?\{\{\/red\}\}|\*\*.*?\*\*|\n)/g)
  return parts.map((part, i) => {
    if (part === '\n') return <br key={i} />
    const redMatch = part.match(/^\{\{red\}\}(.*?)\{\{\/red\}\}$/)
    if (redMatch) return <span key={i} style={{ color: '#E84535' }}>{redMatch[1]}</span>
    const boldMatch = part.match(/^\*\*(.*?)\*\*$/)
    if (boldMatch) return <span key={i} style={{ fontWeight: 900, fontStyle: 'italic', color: highlightColor || 'inherit' }}>{boldMatch[1]}</span>
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
  const textColor = modeId === 'quickie' ? '#9B1150'
    : modeId === 'vrai_ou_fou' ? '#6BCB77'
    : modeId === 'race' ? '#23D5D5'
    : modeId === 'multi' ? MULTI_VIOLET
    : modeId === 'quest' ? QUEST_ORANGE
    : modeId === 'drop' ? DROP_PINK
    : modeColor

  const btnBg = modeId === 'vrai_ou_fou' ? '#008000'
    : modeId === 'race' ? '#0F52BA'
    : modeId === 'blitz' ? '#CC0000'
    : modeId === 'multi' ? MULTI_VIOLET
    : modeId === 'quest' ? QUEST_DARK
    : modeId === 'drop' ? DROP_DARK
    : '#E91E90'
  const btnShadow = modeId === 'vrai_ou_fou' ? '0 8px 30px rgba(0,128,0,0.5), 0 4px 0 rgba(0,0,0,0.15)'
    : modeId === 'race' ? '0 8px 30px rgba(0,255,255,0.5), 0 4px 0 rgba(0,0,0,0.15)'
    : modeId === 'blitz' ? '0 8px 30px rgba(204,0,0,0.5), 0 4px 0 rgba(0,0,0,0.15)'
    : modeId === 'multi' ? '0 8px 30px rgba(107,45,142,0.5), 0 4px 0 rgba(0,0,0,0.15)'
    : modeId === 'quest' ? '0 8px 30px rgba(217,74,16,0.5), 0 4px 0 rgba(0,0,0,0.15)'
    : modeId === 'drop' ? '0 8px 30px rgba(173,20,87,0.5), 0 4px 0 rgba(0,0,0,0.15)'
    : '0 8px 30px rgba(233,30,144,0.5), 0 4px 0 rgba(0,0,0,0.15)'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', width: '100%',
      overflow: 'hidden', boxSizing: 'border-box',
      fontFamily: 'Nunito, sans-serif',
      '--scale': scale,
      background: modeId === 'quickie'
        ? 'linear-gradient(160deg, #F8BBD0, #F06292)'
        : `linear-gradient(160deg, ${color}88, ${color})`,
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
          // Spacer : séparation visuelle entre groupes de règles (ex : Blitz communes vs variants)
          if (rule.spacer) {
            return <div key={`sp-${i}`} style={{ height: S(10) }} aria-hidden />
          }
          let iconColor = undefined
          if (modeId === 'quickie') {
            iconColor = rule.icon === 'icon:energy' ? '#22C55E' : '#E91E90'
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
          } else if (modeId === 'drop') {
            iconColor = i % 2 === 0 ? DROP_PINK : DROP_DARK
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
                {renderText(rule.text, isStyled ? modeColor : undefined)}
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
