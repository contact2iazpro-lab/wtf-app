/**
 * EnergyIcon — batterie statique pour la page règles.
 * Même design que BatteryIcon du header mais sans le compteur texte.
 */
export default function EnergyIcon({ size = 40, color = '#22C55E' }) {
  const w = size
  const h = size * (18 / 34)
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 34 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
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
          fill={color}
        />
      ))}
    </svg>
  )
}
