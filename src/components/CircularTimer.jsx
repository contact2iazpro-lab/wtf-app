import { useEffect, useRef } from 'react'
import { audio } from '../utils/audio'

const RADIUS = 44
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// Single bip at these seconds (not 10 — that's handled as triple bip)
const BIP_SECONDS = new Set([5, 4, 3, 2, 1])

// Smooth color interpolation: green → orange → red
function getTimerColor(remaining, duration) {
  const p = remaining / duration

  const G = [34, 197, 94]    // #22C55E  green
  const O = [249, 115, 22]   // #F97316  orange
  const R = [239, 68, 68]    // #EF4444  red

  let c1, c2, ratio

  if (p > 0.85) {
    return '#22C55E'
  } else if (p > 0.52) {
    c1 = O; c2 = G
    ratio = (p - 0.52) / (0.85 - 0.52)
  } else if (p > 0.27) {
    return '#F97316'
  } else if (p > 0) {
    c1 = R; c2 = O
    ratio = p / 0.27
  } else {
    return '#EF4444'
  }

  const r = Math.round(c2[0] * ratio + c1[0] * (1 - ratio))
  const g = Math.round(c2[1] * ratio + c1[1] * (1 - ratio))
  const b = Math.round(c2[2] * ratio + c1[2] * (1 - ratio))
  return `rgb(${r},${g},${b})`
}

export default function CircularTimer({ duration = 60, onTimeout, paused = false, size = 100, variant = 'default' }) {
  const isQuickie = variant === 'quickie'
  const timeRef = useRef(duration)
  const intervalRef = useRef(null)
  const circleRef = useRef(null)
  const textRef = useRef(null)

  useEffect(() => {
    timeRef.current = duration

    if (circleRef.current) {
      circleRef.current.style.strokeDashoffset = '0'
      circleRef.current.style.stroke = '#22C55E'
    }
    if (textRef.current) {
      textRef.current.textContent = duration
      textRef.current.style.fill = isQuickie ? '#7F77DD' : '#FFFFFF'
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
        textRef.current.style.fill = t <= 5 ? '#EF4444' : (isQuickie ? '#7F77DD' : '#FFFFFF')
      }

      // Bip sounds
      if (t === 10) {
        // Triple rapid bip at 10s
        audio.play('tick')
        setTimeout(() => audio.play('tick'), 130)
        setTimeout(() => audio.play('tick'), 260)
      } else if (BIP_SECONDS.has(t)) {
        audio.play('tick')
      }

      if (t <= 0) {
        clearInterval(intervalRef.current)
        audio.play('timeout')
        onTimeout?.()
      }
    }, 1000)

    return () => clearInterval(intervalRef.current)
  }, [duration, paused, onTimeout])

  const fontSize = size >= 90 ? 22 : size >= 70 ? 17 : 13

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {/* Main circle SVG — rotated so stroke starts at top */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Track */}
        <circle
          cx="50" cy="50" r={RADIUS}
          fill={isQuickie ? '#ffffff' : 'none'}
          stroke={isQuickie ? '#E5E7EB' : '#2E2E2E'}
          strokeWidth="6"
        />
        {/* Progress stroke */}
        <circle
          ref={circleRef}
          cx="50" cy="50" r={RADIUS}
          fill="none"
          stroke="#22C55E"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={0}
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.5s ease' }}
        />
      </svg>
      {/* Number overlay — not rotated, centered */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <text
          ref={textRef}
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize}
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
