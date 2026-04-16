/**
 * SwipeArrowsIcon — cercle vert VOF fond blanc avec flèche verte ← et flèche rouge →.
 * Picto "Swipe" pour Vrai ou Fou.
 */
export default function SwipeArrowsIcon({ size = 64, circleColor = '#6BCB77', leftColor = '#6BCB77', rightColor = '#E84535' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="44" stroke={circleColor} strokeWidth="5" fill="#ffffff" />
      {/* Flèche gauche ← rouge */}
      <line x1="18" y1="50" x2="42" y2="50" stroke={rightColor} strokeWidth="5" strokeLinecap="round" />
      <polyline points="28,40 18,50 28,60" stroke={rightColor} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Flèche droite → verte */}
      <line x1="58" y1="50" x2="82" y2="50" stroke={leftColor} strokeWidth="5" strokeLinecap="round" />
      <polyline points="72,40 82,50 72,60" stroke={leftColor} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}
