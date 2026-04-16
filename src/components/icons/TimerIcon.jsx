/**
 * TimerIcon — chronomètre stylisé pour la page règles.
 * Aiguille et bouton pression en orange WTF, reste en blanc.
 */
const WTF_ORANGE = '#FF6B1A'

export default function TimerIcon({ size = 40, color = '#ffffff', accent = WTF_ORANGE }) {
  const id = 'tiGlow'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Bouton top — orange WTF */}
      <rect x="42" y="4" width="16" height="10" rx="3" fill={accent} />

      {/* Petits traits latéraux du bouton */}
      <line x1="34" y1="18" x2="40" y2="12" stroke={color} strokeWidth="4" strokeLinecap="round" opacity={0.7} />
      <line x1="66" y1="18" x2="60" y2="12" stroke={color} strokeWidth="4" strokeLinecap="round" opacity={0.7} />

      {/* Cercle principal */}
      <circle cx="50" cy="56" r="34" stroke={color} strokeWidth="5" fill={color} opacity={0.85} />

      {/* Pivot central */}
      <circle cx="50" cy="56" r="3" fill={accent} />

      {/* Aiguille avec glow — orange WTF */}
      <g filter={`url(#${id})`}>
        <line
          x1="50" y1="56"
          x2="67" y2="39"
          stroke={accent} strokeWidth="5" strokeLinecap="round"
        />
      </g>
    </svg>
  )
}
