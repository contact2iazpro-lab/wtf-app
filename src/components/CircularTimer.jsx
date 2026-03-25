import { useEffect, useRef } from 'react'

const RADIUS = 44
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

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
    }
    if (textRef.current) {
      textRef.current.textContent = duration
    }

    intervalRef.current = setInterval(() => {
      if (paused) return
      timeRef.current -= 1

      const t = timeRef.current
      const progress = 1 - t / duration
      const offset = CIRCUMFERENCE * progress

      if (circleRef.current) {
        circleRef.current.style.strokeDashoffset = offset
        // Color transition: green → orange → red
        if (t > 30) {
          circleRef.current.style.stroke = '#22C55E'
        } else if (t > 15) {
          circleRef.current.style.stroke = '#FF5C1A'
        } else {
          circleRef.current.style.stroke = '#EF4444'
        }
      }

      if (textRef.current) {
        textRef.current.textContent = t
        textRef.current.style.fill = t <= 10 ? '#EF4444' : t <= 30 ? '#FF5C1A' : '#FFFFFF'
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
        {/* Progress */}
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
      {/* Number */}
      <svg
        className="absolute inset-0"
        width="100" height="100"
        style={{ top: 0, left: 0 }}>
        <text
          ref={textRef}
          x="50%" y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="22"
          fontWeight="900"
          fontFamily="Inter, sans-serif"
          fill="#FFFFFF">
          {duration}
        </text>
      </svg>
    </div>
  )
}
