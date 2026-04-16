/**
 * PerfectIcon — étoile 5 branches avec glow pour "Perfect" sur la page règles.
 * Stroke-width 5, viewBox 100x100 — cohérent avec les autres icônes règles.
 */
export default function PerfectIcon({ size = 40, color = '#ffffff', glowIntensity = 'strong' }) {
  const id = 'pfGlow'
  const blur = glowIntensity === 'strong' ? 4 : 2.5

  // Étoile 5 branches — rayon externe 42, interne 18, centré sur 50,50
  const points = []
  for (let i = 0; i < 5; i++) {
    const outerAngle = (i * 72 - 90) * Math.PI / 180
    const innerAngle = ((i * 72) + 36 - 90) * Math.PI / 180
    points.push(`${50 + 42 * Math.cos(outerAngle)},${50 + 42 * Math.sin(outerAngle)}`)
    points.push(`${50 + 18 * Math.cos(innerAngle)},${50 + 18 * Math.sin(innerAngle)}`)
  }

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
          <feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter={`url(#${id})`}>
        <polygon
          points={points.join(' ')}
          stroke={color}
          strokeWidth="5"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </svg>
  )
}
