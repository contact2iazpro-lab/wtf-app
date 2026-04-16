/**
 * EnergyIcon — éclair pour la page règles et le header.
 */
export default function EnergyIcon({ size = 40, color = '#22C55E' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
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
  )
}
