/**
 * QuestionTargetIcon — viseur circulaire avec "?" centré.
 * Icône "questions/set" pour la page règles.
 */
const WTF_ORANGE = '#FF6B1A'

export default function QuestionTargetIcon({ size = 40, color = '#ffffff', accent = WTF_ORANGE }) {
  const id = 'qtGlow'
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

      <g filter={`url(#${id})`}>
        {/* Cercle extérieur — orange WTF */}
        <circle cx="50" cy="50" r="32" stroke={accent} strokeWidth="5" fill="none" />

        {/* 4 traits de viseur — orange WTF */}
        <line x1="50" y1="4" x2="50" y2="14" stroke={accent} strokeWidth="5" strokeLinecap="round" />
        <line x1="50" y1="86" x2="50" y2="96" stroke={accent} strokeWidth="5" strokeLinecap="round" />
        <line x1="4" y1="50" x2="14" y2="50" stroke={accent} strokeWidth="5" strokeLinecap="round" />
        <line x1="86" y1="50" x2="96" y2="50" stroke={accent} strokeWidth="5" strokeLinecap="round" />

        {/* "?" centré — blanc */}
        <text
          x="50" y="62"
          textAnchor="middle"
          fill={color}
          fontSize="40"
          fontWeight="900"
          fontFamily="Nunito, sans-serif"
        >
          ?
        </text>
      </g>
    </svg>
  )
}
