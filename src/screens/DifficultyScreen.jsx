import { useState, useRef } from 'react'
import SettingsModal from '../components/SettingsModal'
import { audio } from '../utils/audio'
import { useScale } from '../hooks/useScale'

// ── Backgrounds aléatoires (vrais assets) ────────────────────────────────────
const BACKGROUNDS = [
  '/assets/backgrounds/home-bleu.webp',
  '/assets/backgrounds/home-orange.webp',
  '/assets/backgrounds/home-rouge.webp',
  '/assets/backgrounds/home-teal.webp',
  '/assets/backgrounds/home-violet.webp',
]

// ── Niveaux — synced with App.jsx DIFFICULTY_LEVELS ─────────────────────────
const DIFFICULTY_LEVELS = [
  {
    id: 'cool',
    label: 'Cool',
    subtitle: 'Pour les Noobs',
    icon: '/assets/ui/level-cool.png',
    tag: 'ACCESSIBLE',
    cardGradient: 'linear-gradient(135deg, #60A5FA, #1D4ED8)',
    selectedGradient: 'linear-gradient(135deg, #93C5FD, #3B82F6)',
    ctaColor: '#1D4ED8',
    rules: [
      { icon: '/assets/ui/icon-qcm.png',  text: '4 choix de réponse' },
      { icon: '/assets/ui/icon-hint.png', text: '2 indices possibles' },
      { icon: '/assets/ui/icon-coins.png', text: '3 coins / bonne réponse' },
    ],
    choices: 4, freeHints: 0, paidHints: 2, hintCost: 2, coinsPerCorrect: 3,
    scoring: { correct: 3, wrong: 0 },
  },
  {
    id: 'hot',
    label: 'Hot',
    subtitle: 'Pour les Pros',
    icon: '/assets/ui/level-hot.png',
    tag: 'INTENSE',
    cardGradient: 'linear-gradient(135deg, #FF6B1A, #DC2626)',
    selectedGradient: 'linear-gradient(135deg, #FF8C4A, #EF4444)',
    ctaColor: '#DC2626',
    rules: [
      { icon: '/assets/ui/icon-qcm.png',  text: '4 choix de réponse' },
      { icon: '/assets/ui/icon-hint.png', text: '2 indices possibles' },
      { icon: '/assets/ui/icon-coins.png', text: '3 coins / bonne réponse' },
    ],
    choices: 4, freeHints: 0, paidHints: 2, hintCost: 5, coinsPerCorrect: 3,
    scoring: { correct: 3, wrong: 0 },
  },
  {
    id: 'wtf',
    label: 'WTF!',
    subtitle: 'Pour les Cracks',
    icon: '/assets/ui/level-wtf.png',
    tag: 'ULTIME',
    cardGradient: 'linear-gradient(135deg, #B91C1C, #8B0000)',
    selectedGradient: 'linear-gradient(135deg, #DC2626, #A31515)',
    ctaColor: '#8B0000',
    rules: [
      { icon: '/assets/ui/icon-qcm.png',  text: '6 choix de réponse' },
      { icon: '/assets/ui/icon-hint.png', text: '1 indice possible' },
      { icon: '/assets/ui/icon-coins.png', text: '5 coins / bonne réponse' },
    ],
    choices: 6, freeHints: 0, paidHints: 1, hintCost: 8, coinsPerCorrect: 5,
    scoring: { correct: 5, wrong: 0 },
  },
]

// ── Scaled helper ────────────────────────────────────────────────────────────
const S = (px) => `calc(${px}px * var(--scale))`

export default function DifficultyScreen({ onSelectDifficulty, onBack }) {
  const [selectedId, setSelectedId] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const scale = useScale()
  const bgIndex = useRef(Math.floor(Math.random() * BACKGROUNDS.length))

  const handleSelect = (difficultyId) => {
    const d = DIFFICULTY_LEVELS.find(l => l.id === difficultyId)
    audio.play('click')
    onSelectDifficulty({
      id: d.id,
      label: d.label,
      emoji: d.id === 'cool' ? '❄️' : d.id === 'hot' ? '🔥' : '⚡',
      choices: d.choices,
      duration: 30,
      hintsAllowed: true,
      freeHints: d.freeHints,
      paidHints: d.paidHints,
      hintCost: d.hintCost,
      coinsPerCorrect: d.coinsPerCorrect,
      scoring: d.scoring,
    })
  }

  const hasSelection = selectedId !== null
  const selectedLevel = DIFFICULTY_LEVELS.find(l => l.id === selectedId)

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
      <div style={{ textAlign: 'center', flexShrink: 0, marginBottom: S(10) }}>
        <h1 style={{
          fontSize: S(26), fontWeight: 900, color: 'white',
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
          QUÊTE WTF!
        </p>
      </div>

      {/* ── 3 cartes niveaux ───────────────────────────────────────────── */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'flex', flexDirection: 'column',
        padding: `0 ${S(12)}`,
      }}>
        {DIFFICULTY_LEVELS.map((d) => {
          const isSelected = selectedId === d.id
          return (
            <button
              key={d.id}
              onClick={() => { audio.play('click'); setSelectedId(d.id) }}
              style={{
                position: 'relative',
                background: isSelected ? d.selectedGradient : d.cardGradient,
                borderRadius: S(16),
                padding: S(12),
                marginBottom: S(8),
                width: '100%', boxSizing: 'border-box',
                border: isSelected ? '2.5px solid white' : '2.5px solid transparent',
                boxShadow: isSelected
                  ? '0 0 24px rgba(255,255,255,0.3), 0 4px 16px rgba(0,0,0,0.3)'
                  : '0 4px 12px rgba(0,0,0,0.2)',
                cursor: 'pointer',
                textAlign: 'left',
                flexShrink: 0,
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
                    src={d.icon}
                    alt={d.label}
                    style={{
                      width: S(32), height: S(32),
                      objectFit: 'contain', flexShrink: 0,
                      borderRadius: S(6),
                    }}
                  />
                  <div>
                    <span style={{
                      fontSize: S(20), fontWeight: 900, color: 'white',
                      textShadow: '0 1px 4px rgba(0,0,0,0.3)',
                      display: 'block', lineHeight: 1.1,
                    }}>
                      {d.label}
                    </span>
                    <span style={{
                      fontSize: S(10), fontWeight: 700,
                      color: 'rgba(255,255,255,0.7)',
                      display: 'block', marginTop: S(1),
                    }}>
                      {d.subtitle}
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
                  {d.tag}
                </span>
              </div>

              {/* Séparateur */}
              <div style={{
                borderTop: '1px solid rgba(255,255,255,0.3)',
                margin: `${S(8)} 0`,
              }} />

              {/* 3 lignes de règles */}
              {d.rules.map((rule, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center',
                  gap: S(8), marginBottom: i < d.rules.length - 1 ? S(4) : 0,
                }}>
                  <img
                    src={rule.icon}
                    alt=""
                    style={{
                      width: S(18), height: S(18),
                      objectFit: 'contain', flexShrink: 0,
                    }}
                  />
                  <span style={{
                    fontSize: S(12), fontWeight: 700,
                    color: 'white',
                  }}>
                    {rule.text}
                  </span>
                </div>
              ))}
            </button>
          )
        })}

        {/* ── CTA — poussé en bas, pas d'espace mort ───────────────────── */}
        <div style={{ marginTop: 'auto', paddingBottom: S(12) }}>
          <button
            onClick={() => hasSelection && handleSelect(selectedId)}
            disabled={!hasSelection}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              minHeight: S(52),
              padding: S(14),
              borderRadius: S(16),
              fontSize: S(18), fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              border: 'none',
              cursor: hasSelection ? 'pointer' : 'default',
              background: hasSelection ? 'white' : 'rgba(255,255,255,0.25)',
              color: hasSelection ? selectedLevel.ctaColor : 'rgba(255,255,255,0.5)',
              boxShadow: hasSelection ? '0 4px 20px rgba(0,0,0,0.2)' : 'none',
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
