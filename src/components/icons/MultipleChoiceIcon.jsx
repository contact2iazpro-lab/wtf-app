/**
 * MultipleChoiceIcon — icône QCM / choix multiple pour la page règles.
 * 3 lignes (radio + barre), ligne du milieu sélectionnée en orange WTF avec glow.
 */
const WTF_ORANGE = '#FF6B1A'

export default function MultipleChoiceIcon({ size = 40, color = '#ffffff', accent = WTF_ORANGE }) {
  const id = 'mcGlow'
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
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ligne 1 — non sélectionnée */}
      <circle cx="18" cy="22" r="8" stroke={color} strokeWidth="4" fill={color} opacity={0.7} />
      <rect x="36" y="16" width="50" height="12" rx="6" fill={color} opacity={0.7} />

      {/* Ligne 2 — sélectionnée (orange WTF + glow) */}
      <g filter={`url(#${id})`}>
        <circle cx="18" cy="50" r="8" stroke={accent} strokeWidth="4" fill={accent} />
        <rect x="36" y="44" width="50" height="12" rx="6" fill={accent} />
      </g>

      {/* Ligne 3 — non sélectionnée */}
      <circle cx="18" cy="78" r="8" stroke={color} strokeWidth="4" fill={color} opacity={0.7} />
      <rect x="36" y="72" width="50" height="12" rx="6" fill={color} opacity={0.7} />
    </svg>
  )
}
