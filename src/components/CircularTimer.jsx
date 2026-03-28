import { useEffect, useRef } from 'react'
import { audio } from '../utils/audio'

const RADIUS = 44
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// Seconds at which bip sounds fire
const BIP_SECONDS = new Set([10, 5, 4, 3, 2, 1])

// Smooth color interpolation: green → orange → red
// Thresholds based on proportion of duration remaining
function getTimerColor(remaining, duration) {
  const p = remaining / duration

  // Color component arrays [R, G, B]
  const G = [34, 197, 94]    // #22C55E  green
  const O = [249, 115, 22]   // #F97316  orange
  const R = [239, 68, 68]    // #EF4444  red

  let c1, c2, ratio

  if (p > 0.85) {
    return '#22C55E'
  } else if (p > 0.52) {
    // green → orange transition
    c1 = O; c2 = G
    ratio = (p - 0.52) / (0.85 - 0.52) // 0 = pure orange, 1 = pure green
  } else if (p > 0.27) {
    return '#F97316'
  } else if (p > 0) {
    // orange → red transition
    c1 = R; c2 = O
    ratio = p / 0.27 // 0 = pure red, 1 = pure orange
  } else {
    return '#EF4444'
  }

  const r = Math.round(c2[0] * ratio + c1[0] * (1 - ratio))
  const g = Math.round(c2[1] * ratio + c1[1] * (1 - ratio))
  const b = Math.round(c2[2] * ratio + c1[2] * (1 - ratio))
  return `rgb(${r},${g},${b})`
}

export default function CircularTimer({ duration = 60, onTimeout, paused = false }) {
  const timeRef = useRef(duration)
  const intervalRef = useRef(null)
  const circleRef = useRef(null)
  const textRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    timeRef.current = duration

    if (circleRef.current) {
      circleRef.current.style.strokeDashoffset = '0'
      circleRef.current.style.stroke = '#22C55E'
    }
    if (textRef.current) {
      textRef.current.textContent = duration
      textRef.current.style.fill = '#FFFFFF'
    }

    intervalRef.current = setInterval(() => {
      if (paused) return
      timeRef.current -= 1

      const t = timeRef.current
      const progress = 1 - t / duration
      const offset = CIRCUMFERENCE * progress
      const color = getTimerColor(t, duration)

      if (circleRef.current) {
        circleRef.current.style.strokeDashoffset = offset
        circleRef.current.style.stroke = color
      }

      if (textRef.current) {
        textRef.current.textContent = t
        textRef.current.style.fill = t <= 10 ? '#EF4444' : '#FFFFFF'
      }

      // Bip sounds at key countdown seconds
      if (BIP_SECONDS.has(t)) {
        audio.play('tick')
      }

      if (t <= 0) {
        clearInterval(intervalRef.current)
        onTimeout?.()
      }
    }, 1000)

    return () => clearInterval(intervalRef.current)
  }, [duration, paused, onTimeout])

  return (
    <div className="relative flex items-center justify-center" ref={containerRef}>
      {/* Pulse ring when < 10s */}
      <div
        className="absolute inset-0 rounded-full animate-ping-slow"
        style={{ opacity: 0 }}
        ref={(el) => {
          if (el) {
            const update = () => {
              el.style.opacity = timeRef.current <= 10 ? '1' : '0'
              el.style.backgroundColor = '#EF444420'
            }
            const id = setInterval(update, 500)
            return () => clearInterval(id)
          }
        }}
      />
      <svg width="100" height="100" className="-rotate-90">
        {/* Track */}
        <circle
          cx="50" cy="50" r={RADIUS}
          fill="none"
          stroke="#2E2E2E"
          strokeWidth="5"
        />
        {/* Progress stroke */}
        <circle
          ref={circleRef}
          cx="50" cy="50" r={RADIUS}
          fill="none"
          stroke="#22C55E"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={0}
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.5s ease' }}
        />
      </svg>
      {/* Seconds number inside circle */}
      <svg
        className="absolute inset-0"
        width="100" height="100"
        style={{ top: 0, left: 0 }}
      >
        <text
          ref={textRef}
          x="50%" y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="22"
          fontWeight="900"
          fontFamily="Inter, sans-serif"
          fill="#FFFFFF"
        >
          {duration}
        </text>
      </svg>
    </div>
  )
}
