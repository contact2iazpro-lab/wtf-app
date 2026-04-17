/**
 * ShareIcon — contour vert VOF, fond blanc, symbole partage vert VOF.
 * Picto "Partage ton score" pour Vrai ET Fou.
 */
export default function ShareIcon({ size = 64, circleColor = '#6BCB77', iconColor = '#E84535' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="44" stroke={circleColor} strokeWidth="7" fill="#ffffff" />
      {/* Carré ouvert en haut */}
      <path
        d="M35 45v22a4 4 0 004 4h22a4 4 0 004-4V45"
        stroke={iconColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
      {/* Flèche vers le haut */}
      <line x1="50" y1="55" x2="50" y2="28" stroke={iconColor} strokeWidth="6" strokeLinecap="round" />
      <polyline points="40,37 50,28 60,37" stroke={iconColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}
