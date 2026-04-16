const COLORS = {
  5: '#22C55E',
  4: '#84CC16',
  3: '#FACC15',
  2: '#F97316',
  1: '#EF4444',
  0: '#EF4444',
}

const S = (px) => `calc(${px}px * var(--scale))`

export default function BatteryIcon({ level = 5 }) {
  const color = COLORS[Math.max(0, Math.min(5, level))]
  const bars = Math.max(0, Math.min(5, level))

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: S(4),
      animation: level === 0 ? 'battery-pulse 1.2s ease-in-out infinite' : 'none',
    }}>
      <svg
        width={S(28)} height={S(16)}
        viewBox="0 0 34 18"
        fill="none"
        style={{ display: 'block' }}
      >
        <rect x="0.5" y="0.5" width="28" height="17" rx="3.5" ry="3.5"
          stroke={color} strokeWidth="1.5" fill="none" />

        <rect x="29" y="5" width="3.5" height="8" rx="1.5" ry="1.5"
          fill={color} />

        {[0, 1, 2, 3, 4].map(i => (
          <rect
            key={i}
            x={3 + i * 5.2}
            y="3.5"
            width="3.8"
            height="11"
            rx="1"
            ry="1"
            fill={i < bars ? color : 'rgba(255,255,255,0.12)'}
          />
        ))}
      </svg>

      <span style={{
        fontFamily: 'Nunito, sans-serif',
        fontWeight: 700,
        fontSize: S(12),
        color: color,
        lineHeight: 1,
      }}>
        {level}/5
      </span>
    </div>
  )
}
