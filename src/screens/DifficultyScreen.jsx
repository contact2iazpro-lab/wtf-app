import { useState, useRef } from 'react'
import SettingsModal from '../components/SettingsModal'
import { audio } from '../utils/audio'
import { useScale } from '../hooks/useScale'
import { DIFFICULTY_LEVELS } from '../constants/gameConfig'

// ── Backgrounds aléatoires (vrais assets) ────────────────────────────────────
const BACKGROUNDS = [
  '/assets/backgrounds/home-bleu.webp',
  '/assets/backgrounds/home-orange.webp',
  '/assets/backgrounds/home-rouge.webp',
  '/assets/backgrounds/home-teal.webp',
  '/assets/backgrounds/home-violet.webp',
]

// ── UI Configuration pour les niveaux Quest (Cool, Hot) ─────────────────
// Données visuelles + règles dynamiques basées sur DIFFICULTY_LEVELS
// Le niveau WTF! a été retiré de Quest le 2026-04-12 (garde 2 niveaux uniquement)
const DIFFICULTY_UI_CONFIG = {
  cool: {
    subtitle: 'Pour les Noobs',
    icon: '/assets/ui/level-cool.png',
    tag: 'ACCESSIBLE',
    cardGradient: 'linear-gradient(135deg, #60A5FA, #1D4ED8)',
    selectedGradient: 'linear-gradient(135deg, #93C5FD, #3B82F6)',
    ctaColor: '#1D4ED8',
  },
  hot: {
    subtitle: 'Pour les Pros',
    icon: '/assets/ui/level-hot.png',
    tag: 'INTENSE',
    cardGradient: 'linear-gradient(135deg, #FF6B1A, #DC2626)',
    selectedGradient: 'linear-gradient(135deg, #FF8C4A, #EF4444)',
    ctaColor: '#DC2626',
  },
}

// Helper pour générer les règles dynamiquement depuis DIFFICULTY_LEVELS
function buildRules(difficultyConfig) {
  const totalHints = (difficultyConfig.freeHints || 0) + (difficultyConfig.paidHints || 0)
  return [
    {
      icon: '/assets/ui/icon-qcm.png',
      text: `${difficultyConfig.choices} choix de réponse`,
    },
    {
      icon: '/assets/ui/icon-hint.png',
      text: `${totalHints} indice${totalHints > 1 ? 's' : ''} possible${totalHints > 1 ? 's' : ''}`,
    },
    {
      icon: '/assets/ui/icon-coins.png',
      text: `${difficultyConfig.coinsPerCorrect} coin${difficultyConfig.coinsPerCorrect > 1 ? 's' : ''} / bonne réponse`,
    },
    {
      emoji: '⏱️',
      text: `${difficultyConfig.duration} secondes`,
    },
  ]
}

// ── Scaled helper ────────────────────────────────────────────────────────────
const S = (px) => `calc(${px}px * var(--scale))`

const QUEST_LEVELS = [DIFFICULTY_LEVELS.COOL, DIFFICULTY_LEVELS.HOT]

export default function DifficultyScreen({ onSelectDifficulty, onBack }) {
  const [selectedId, setSelectedId] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const scale = useScale()
  const bgIndex = useRef(Math.floor(Math.random() * BACKGROUNDS.length))

  const handleSelect = (difficultyId) => {
    const d = DIFFICULTY_LEVELS[difficultyId.toUpperCase()]
    if (!d) return
    audio.play('click')
    onSelectDifficulty(d)
  }

  const hasSelection = selectedId !== null
  const selectedLevelConfig = selectedId ? DIFFICULTY_LEVELS[selectedId.toUpperCase()] : null

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden',
      fontFamily: 'Nunito, sans-serif',
      '--scale': scale,
      backgroundImage: `url(${BACKGROUNDS[bgIndex.current]})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundColor: '#1a1a2e',
    }}>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `${S(8)} ${S(12)}`,
        flexShrink: 0,
      }}>
        <button
          onClick={() => { audio.play('click'); onBack() }}
          style={{
            width: S(36), height: S(36), borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            border: '1.5px solid rgba(255,255,255,0.4)',
            color: 'white', fontSize: S(16),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
            WebkitTapHighlightColor: 'transparent',
          }}
        >←</button>
        <button
          onClick={() => { audio.play('click'); setShowSettings(true) }}
          style={{
            width: S(36), height: S(36), borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            border: '1.5px solid rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <img src="/assets/ui/icon-settings.png" style={{ width: S(20), height: S(20) }} alt="" />
        </button>
      </div>

      {/* ── Titre + sous-titre ─────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', flexShrink: 0, marginBottom: S(6) }}>
        <h1 style={{
          fontSize: S(22), fontWeight: 900, color: 'white',
          textShadow: '0 2px 10px rgba(0,0,0,0.3)',
          margin: 0,
        }}>
          Choisis ton niveau
        </h1>
        <p style={{
          fontSize: S(11), fontWeight: 700,
          color: 'rgba(255,255,255,0.75)',
          letterSpacing: '3px',
          textTransform: 'uppercase',
          marginTop: S(4), marginBottom: 0,
        }}>
          QUEST
        </p>
      </div>

      {/* ── 3 cartes niveaux ───────────────────────────────────────────── */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'flex', flexDirection: 'column',
        padding: `0 ${S(12)}`,
      }}>
        {QUEST_LEVELS.map((d) => {
          const isSelected = selectedId === d.id
          const uiConfig = DIFFICULTY_UI_CONFIG[d.id]
          const rules = buildRules(d)
          return (
            <button
              key={d.id}
              onClick={() => { audio.play('click'); setSelectedId(d.id) }}
              style={{
                position: 'relative',
                background: isSelected ? uiConfig.selectedGradient : uiConfig.cardGradient,
                borderRadius: S(16),
                padding: S(10),
                marginBottom: S(6),
                width: '100%', boxSizing: 'border-box',
                border: isSelected ? '2.5px solid white' : '2.5px solid transparent',
                boxShadow: isSelected
                  ? '0 0 24px rgba(255,255,255,0.3), 0 4px 16px rgba(0,0,0,0.3), inset 0 0 12px rgba(255,255,255,0.15)'
                  : '0 4px 12px rgba(0,0,0,0.2)',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                WebkitTapHighlightColor: 'transparent',
                fontFamily: 'Nunito, sans-serif',
              }}
            >
              {/* En-tête : icône + nom + subtitle + tag */}
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: S(8) }}>
                  <img
                    src={uiConfig.icon}
                    alt={d.label}
                    style={{
                      width: S(32), height: S(32),
                      objectFit: 'contain', flexShrink: 0,
                      borderRadius: S(6),
                    }}
                  />
                  <div>
                    <span style={{
                      fontSize: S(18), fontWeight: 900, color: 'white',
                      textShadow: '0 1px 4px rgba(0,0,0,0.3)',
                      display: 'block', lineHeight: 1.1,
                    }}>
                      {d.label}
                    </span>
                    <span style={{
                      fontSize: S(9), fontWeight: 700,
                      color: 'rgba(255,255,255,0.7)',
                      display: 'block', marginTop: S(1),
                    }}>
                      {uiConfig.subtitle}
                    </span>
                  </div>
                </div>
                <span style={{
                  background: 'rgba(0,0,0,0.25)',
                  borderRadius: S(20),
                  padding: `${S(3)} ${S(8)}`,
                  fontSize: S(9), fontWeight: 800,
                  color: 'white', textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  flexShrink: 0,
                }}>
                  {uiConfig.tag}
                </span>
              </div>

              {/* Séparateur */}
              <div style={{
                borderTop: '1px solid rgba(255,255,255,0.3)',
                margin: `${S(8)} 0`,
              }} />

              {/* 4 lignes de règles (dynamiques) */}
              {rules.map((rule, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center',
                  gap: S(6), marginBottom: i < rules.length - 1 ? S(3) : 0,
                }}>
                  {rule.icon ? (
                    <img src={rule.icon} alt="" style={{ width: S(16), height: S(16), objectFit: 'contain', flexShrink: 0 }} />
                  ) : (
                    <span style={{ fontSize: S(14), flexShrink: 0, width: S(16), textAlign: 'center', lineHeight: 1 }}>{rule.emoji}</span>
                  )}
                  <span style={{ fontSize: S(11), fontWeight: 700, color: 'white' }}>
                    {rule.text}
                  </span>
                </div>
              ))}
            </button>
          )
        })}

        {/* ── CTA — poussé en bas, pas d'espace mort ───────────────────── */}
        <div style={{ marginTop: 'auto', paddingBottom: S(8) }}>
          <button
            onClick={() => hasSelection && handleSelect(selectedId)}
            disabled={!hasSelection}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              minHeight: S(44),
              padding: S(12),
              borderRadius: S(16),
              fontSize: S(16), fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              border: 'none',
              cursor: hasSelection ? 'pointer' : 'default',
              background: hasSelection ? DIFFICULTY_UI_CONFIG[selectedId].cardGradient : 'rgba(255,255,255,0.25)',
              color: hasSelection ? 'white' : 'rgba(255,255,255,0.5)',
              boxShadow: hasSelection ? `0 6px 24px ${DIFFICULTY_UI_CONFIG[selectedId].ctaColor}50, 0 0 12px ${DIFFICULTY_UI_CONFIG[selectedId].ctaColor}30` : 'none',
              transition: 'all 0.2s ease',
              fontFamily: 'Nunito, sans-serif',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {hasSelection ? "C'EST PARTI ! ⚡" : 'Sélectionne un niveau'}
          </button>
        </div>
      </div>
    </div>
  )
}
