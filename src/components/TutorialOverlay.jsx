import { useState, useRef, useCallback, useEffect } from 'react'
import { audio } from '../utils/audio'

const STEPS = [
  {
    gradient: 'linear-gradient(170deg, #0A0F1E 0%, #2A0A45 60%, #0E1A2E 100%)',
    accent: '#FF6B1A',
    emoji: '⭐',
    title: 'What The\nF*ct !',
    subtitle: 'Le quiz des facts impossibles',
    bullets: null,
    visual: null,
  },
  {
    gradient: 'linear-gradient(170deg, #1a0800 0%, #3d1500 60%, #1a0800 100%)',
    accent: '#FF8C00',
    emoji: '❓',
    title: 'Comment jouer ?',
    subtitle: null,
    bullets: [
      { icon: '📣', text: 'Une **affirmation** s\'affiche : vraie ou fausse ?' },
      { icon: '⏱️', text: 'Tu as **30 à 60 secondes** pour répondre.' },
      { icon: '📋', text: '**10 questions** enchaînées par session.' },
    ],
    visual: {
      type: 'question',
      label: '🐬 Un dauphin peut reconnaître son reflet dans un miroir.',
      choices: ['✓ Vrai', '✗ Faux'],
    },
  },
  {
    gradient: 'linear-gradient(170deg, #001a08 0%, #003015 60%, #001a08 100%)',
    accent: '#22C55E',
    emoji: '🎯',
    title: 'Mode Parcours',
    subtitle: null,
    bullets: [
      { icon: '💚', text: '**Facile** — 60 s · 6 choix · indices disponibles' },
      { icon: '🧠', text: '**Normal** — 60 s · 4 choix · 3 pts par bonne réponse' },
      { icon: '⚡', text: '**Expert** — 30 s · 6 choix · 5 pts · max scoring' },
    ],
    visual: null,
  },
  {
    gradient: 'linear-gradient(170deg, #001522 0%, #002d40 60%, #001522 100%)',
    accent: '#38BDF8',
    emoji: '📚',
    title: 'Ta Collection',
    subtitle: null,
    bullets: [
      { icon: '🔓', text: 'Chaque **bonne réponse** débloque un fact dans ta collection.' },
      { icon: '🗂️', text: 'Facts rangés par **catégorie** : animaux, sciences, sport...' },
      { icon: '⚠️', text: 'Tu dois **terminer la session** pour sauvegarder tes facts !' },
    ],
    visual: {
      type: 'collection',
      categories: [
        { emoji: '🦁', label: 'Animaux', pct: 0.6 },
        { emoji: '🔬', label: 'Sciences', pct: 0.3 },
        { emoji: '⚽', label: 'Sport', pct: 0.1 },
      ],
    },
  },
  {
    gradient: 'linear-gradient(170deg, #1a0505 0%, #3d0a0a 60%, #1a0505 100%)',
    accent: '#FFD700',
    emoji: '🏆',
    title: 'Trophées VIP',
    subtitle: null,
    bullets: [
      { icon: '🌟', text: 'Complète **tous les facts** d\'une catégorie pour un niveau...' },
      { icon: '🃏', text: '...et reçois une **Carte Super WTF** exclusive et unique !' },
      { icon: '🚫', text: 'Ne s\'achète **jamais** — uniquement en jouant !' },
    ],
    visual: {
      type: 'vip',
      label: '✨ Carte Super WTF — Animaux',
    },
  },
  {
    gradient: 'linear-gradient(170deg, #1a0a00 0%, #3a1800 60%, #1a0a00 100%)',
    accent: '#FF6B1A',
    emoji: '🔥',
    title: 'Streak & Coins',
    subtitle: null,
    bullets: [
      { icon: '📅', text: 'Joue **chaque jour** pour maintenir ton streak 🔥' },
      { icon: '🪙', text: 'Plus ton streak est haut → plus de **WTF Coins** gagnés !' },
      { icon: '🏅', text: 'Les **points** mesurent ta progression globale dans le jeu.' },
    ],
    visual: null,
  },
  {
    gradient: 'linear-gradient(170deg, #0A0F1E 0%, #1A0A35 60%, #0E1A2E 100%)',
    accent: '#FF6B1A',
    emoji: '🚀',
    title: "C'est l'heure !",
    subtitle: "T'as tout compris.\nBonne chance, joueur !",
    bullets: null,
    visual: null,
    isLast: true,
  },
]

function renderText(text) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return parts.map((p, i) =>
    i % 2 === 1
      ? <strong key={i} style={{ color: 'white' }}>{p}</strong>
      : <span key={i}>{p}</span>
  )
}

function VisualMockup({ visual, accent }) {
  if (!visual) return null

  if (visual.type === 'question') {
    return (
      <div className="w-full max-w-sm mt-5 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)' }}>
        <div className="p-3 text-center">
          <p className="text-xs font-bold mb-3" style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
            {visual.label}
          </p>
          <div className="flex gap-2">
            {visual.choices.map((c, i) => (
              <div
                key={i}
                className="flex-1 py-2 rounded-xl text-center text-xs font-black"
                style={{
                  background: i === 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                  border: `1px solid ${i === 0 ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
                  color: i === 0 ? '#22C55E' : '#EF4444',
                }}
              >
                {c}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (visual.type === 'collection') {
    return (
      <div className="w-full max-w-sm mt-5 flex flex-col gap-2">
        {visual.categories.map((cat, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="text-xl">{cat.emoji}</span>
            <span className="text-xs font-bold flex-1" style={{ color: 'rgba(255,255,255,0.7)' }}>{cat.label}</span>
            <div className="w-20 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.12)' }}>
              <div className="h-full rounded-full" style={{ width: `${cat.pct * 100}%`, background: accent }} />
            </div>
            <span className="text-xs font-bold" style={{ color: accent }}>{Math.round(cat.pct * 100)}%</span>
          </div>
        ))}
      </div>
    )
  }

  if (visual.type === 'vip') {
    return (
      <div
        className="mt-5 px-5 py-4 rounded-2xl text-center"
        style={{
          background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,140,0,0.1))',
          border: '2px solid rgba(255,215,0,0.4)',
        }}
      >
        <div className="text-3xl mb-1">🏆</div>
        <div className="text-xs font-black uppercase tracking-widest" style={{ color: '#FFD700' }}>
          {visual.label}
        </div>
      </div>
    )
  }

  return null
}

export default function TutorialOverlay({ onComplete }) {
  const [step, setStep] = useState(0)
  const [fading, setFading] = useState(false)
  const touchStartX = useRef(null)

  // Progress bar for first slide
  const [barWidth, setBarWidth] = useState(0)
  const barRafRef = useRef(null)
  const barStartRef = useRef(null)

  // "Ne plus afficher" checkbox — synced with localStorage
  const [hideWelcome, setHideWelcome] = useState(() => localStorage.getItem('hideWelcomeScreen') === 'true')

  const current = STEPS[step]
  const isFirst = step === 0
  const isLast = step === STEPS.length - 1

  // Animate progress bar when on first slide
  useEffect(() => {
    if (step === 0) {
      setBarWidth(0)
      barStartRef.current = null
      const timeout = setTimeout(() => {
        const animate = (ts) => {
          if (!barStartRef.current) barStartRef.current = ts
          const elapsed = ts - barStartRef.current
          const pct = Math.min(100, (elapsed / 4000) * 100)
          setBarWidth(pct)
          if (pct < 100) {
            barRafRef.current = requestAnimationFrame(animate)
          }
        }
        barRafRef.current = requestAnimationFrame(animate)
      }, 50)
      return () => {
        clearTimeout(timeout)
        cancelAnimationFrame(barRafRef.current)
      }
    } else {
      cancelAnimationFrame(barRafRef.current)
    }
  }, [step])

  const handleHideWelcomeChange = useCallback((checked) => {
    setHideWelcome(checked)
    if (checked) {
      localStorage.setItem('hideWelcomeScreen', 'true')
    } else {
      localStorage.removeItem('hideWelcomeScreen')
    }
  }, [])

  const changeStep = useCallback((newStep) => {
    if (fading) return
    audio.play('click')
    setFading(true)
    setTimeout(() => {
      setStep(newStep)
      setFading(false)
    }, 180)
  }, [fading])

  const handleNext = useCallback(() => {
    if (isLast) {
      audio.play('click')
      localStorage.setItem('hideWelcomeScreen', 'true')
      onComplete()
    } else {
      changeStep(step + 1)
    }
  }, [isLast, step, changeStep, onComplete])

  const handlePrev = useCallback(() => {
    if (!isFirst) changeStep(step - 1)
  }, [isFirst, step, changeStep])

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback((e) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (dx < -50) handleNext()
    else if (dx > 50) handlePrev()
  }, [handleNext, handlePrev])

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        zIndex: 500,
        background: current.gradient,
        transition: 'background 0.5s ease',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top accent stripe */}
      <div
        style={{
          height: 3,
          background: `linear-gradient(90deg, transparent 0%, ${current.accent} 50%, transparent 100%)`,
          transition: 'background 0.5s ease',
          flexShrink: 0,
        }}
      />

      {/* Content */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto"
        style={{
          opacity: fading ? 0 : 1,
          transition: 'opacity 0.18s ease',
        }}
      >
        {/* Big emoji */}
        <div
          style={{
            fontSize: '5.5rem',
            lineHeight: 1,
            marginBottom: '1.25rem',
            filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.6))',
          }}
        >
          {current.emoji}
        </div>

        {/* Title */}
        <h2
          className="text-center font-black mb-2"
          style={{
            fontSize: 'clamp(1.6rem, 6vw, 2rem)',
            lineHeight: 1.15,
            color: 'white',
            whiteSpace: 'pre-line',
          }}
        >
          {current.title}
        </h2>

        {/* Subtitle */}
        {current.subtitle && (
          <p
            className="text-center mb-2 font-semibold"
            style={{ color: 'rgba(255,255,255,0.55)', whiteSpace: 'pre-line', lineHeight: 1.55 }}
          >
            {current.subtitle}
          </p>
        )}

        {/* Bullets */}
        {current.bullets && (
          <div className="w-full max-w-sm mt-4 flex flex-col gap-2.5">
            {current.bullets.map((b, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <span className="text-xl shrink-0">{b.icon}</span>
                <p
                  className="text-sm font-semibold"
                  style={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.45 }}
                >
                  {renderText(b.text)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Visual mockup */}
        <VisualMockup visual={current.visual} accent={current.accent} />
      </div>

      {/* Bottom nav */}
      <div className="px-6 pb-8 pt-4 shrink-0">

        {/* Progress bar (first slide only) */}
        {step === 0 && (
          <div
            style={{
              marginBottom: 16,
              height: 26,
              borderRadius: 13,
              background: 'rgba(255,255,255,0.12)',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${barWidth}%`,
                background: `linear-gradient(90deg, ${current.accent}cc, ${current.accent})`,
                borderRadius: 13,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: barWidth > 8 ? 8 : 0,
                minWidth: 0,
              }}
            >
              {barWidth > 8 && (
                <span style={{ fontSize: 11, fontWeight: 900, color: 'white', whiteSpace: 'nowrap' }}>
                  {Math.round(barWidth)}%
                </span>
              )}
            </div>
          </div>
        )}

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-4">
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? 22 : 8,
                height: 8,
                borderRadius: 4,
                background: i === step ? current.accent : 'rgba(255,255,255,0.2)',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* "Ne plus afficher" checkbox */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 14,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={hideWelcome}
            onChange={e => handleHideWelcomeChange(e.target.checked)}
            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: current.accent }}
          />
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>
            Ne plus afficher
          </span>
        </label>

        {/* Buttons */}
        <div className="flex gap-3">
          {!isFirst && (
            <button
              onClick={handlePrev}
              className="py-4 rounded-2xl font-black text-sm active:scale-95 transition-all"
              style={{
                width: 56,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              ←
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 py-4 rounded-2xl font-black text-base active:scale-95 transition-all"
            style={{
              background: `linear-gradient(135deg, ${current.accent}, ${current.accent}bb)`,
              color: 'white',
              boxShadow: `0 8px 32px ${current.accent}44`,
              transition: 'background 0.5s ease, box-shadow 0.5s ease',
            }}
          >
            {isLast ? '🚀 Jouer maintenant !' : 'Suivant →'}
          </button>
        </div>

        {/* Step count hint */}
        <p className="text-center mt-3 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {step + 1} / {STEPS.length}
        </p>
      </div>
    </div>
  )
}
