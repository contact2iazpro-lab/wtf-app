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

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: S(3),
      animation: level === 0 ? 'battery-pulse 1.2s ease-in-out infinite' : 'none',
    }}>
      <svg
        width={S(18)} height={S(18)}
        viewBox="0 0 24 24"
        fill="none"
        style={{ display: 'block' }}
      >
        <path
          d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"
          fill={color}
          stroke={color}
          strokeWidth="1"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
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
