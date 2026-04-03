import { useState, useRef, useCallback } from 'react'

const SLIDES = [
  {
    emoji: '🎉',
    title: 'Bienvenue sur\nWhat The F*ct !',
    text: 'Des f*cts 100% vrais,\ndes réactions 100% fun',
  },
  {
    emoji: '🎮',
    title: 'Comment jouer ?',
    text: 'Lance des Quest pour débloquer les WTF VIP les plus fous.\nJoue en Flash, Explorer ou Blitz pour gagner des coins et des tickets',
  },
  {
    emoji: '📚',
    title: 'Ta collection\nt\'attend !',
    text: 'Chaque f*ct découvert rejoint ta collection.\nObjectif : les débloquer tous !',
  },
]

export default function TutorialOverlay({ onComplete }) {
  const [slide, setSlide] = useState(0)
  const [fading, setFading] = useState(false)
  const touchStartX = useRef(null)

  const isLast = slide === SLIDES.length - 1
  const current = SLIDES[slide]

  const goTo = useCallback((next) => {
    if (fading || next < 0 || next >= SLIDES.length) return
    setFading(true)
    setTimeout(() => {
      setSlide(next)
      setFading(false)
    }, 180)
  }, [fading])

  const handleNext = useCallback(() => {
    if (isLast) {
      localStorage.setItem('hideWelcomeScreen', 'true')
      onComplete()
    } else {
      goTo(slide + 1)
    }
  }, [isLast, slide, goTo, onComplete])

  const handlePrev = useCallback(() => {
    goTo(slide - 1)
  }, [slide, goTo])

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
        background: 'linear-gradient(170deg, #FF6B1A 0%, #E55A10 50%, #CC4400 100%)',
        fontFamily: 'Nunito, sans-serif',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Content */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-8"
        style={{
          opacity: fading ? 0 : 1,
          transition: 'opacity 0.18s ease',
        }}
      >
        <div style={{ fontSize: '4.5rem', lineHeight: 1, marginBottom: '1.5rem' }}>
          {current.emoji}
        </div>

        <h2
          className="text-center font-black mb-4"
          style={{
            fontSize: 'clamp(1.5rem, 6vw, 2rem)',
            lineHeight: 1.2,
            color: 'white',
            whiteSpace: 'pre-line',
          }}
        >
          {current.title}
        </h2>

        <p
          className="text-center font-semibold"
          style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: 'clamp(0.95rem, 4vw, 1.1rem)',
            lineHeight: 1.6,
            whiteSpace: 'pre-line',
            maxWidth: 320,
          }}
        >
          {current.text}
        </p>
      </div>

      {/* Bottom nav */}
      <div className="px-6 pb-8 pt-4 shrink-0">
        {/* Progress dots */}
        <div className="flex justify-center gap-2.5 mb-6">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === slide ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: i === slide ? 'white' : 'rgba(255,255,255,0.35)',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          {slide > 0 && (
            <button
              onClick={handlePrev}
              className="py-4 rounded-2xl font-black text-sm active:scale-95 transition-all"
              style={{
                width: 56,
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
              }}
            >
              ←
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 py-4 rounded-2xl font-black text-base active:scale-95 transition-all"
            style={{
              background: 'white',
              color: '#FF6B1A',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            }}
          >
            {isLast ? "C'est parti !" : 'Suivant →'}
          </button>
        </div>
      </div>
    </div>
  )
}
