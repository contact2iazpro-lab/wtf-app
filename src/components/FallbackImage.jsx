export default function FallbackImage({ categoryColor = '#1a3a5c' }) {
  const gradId = `fb-bg-${categoryColor.replace('#', '')}`
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 680 680"
      preserveAspectRatio="xMidYMid slice"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1" gradientTransform="rotate(160, 0.5, 0.5)">
          <stop offset="0%" stopColor={categoryColor} stopOpacity="0.133" />
          <stop offset="100%" stopColor={categoryColor} stopOpacity="1" />
        </linearGradient>
      </defs>

      <rect width="680" height="680" fill={`url(#${gradId})`} />

      <text x="340" y="140" textAnchor="middle" fontFamily="'Nunito', system-ui, sans-serif" fontSize="90" fontWeight="900" fill="white" fillOpacity="0.25" letterSpacing="4">WTF!</text>

      <text x="340" y="270" textAnchor="middle" dominantBaseline="central" fontFamily="'Nunito', system-ui, sans-serif" fontSize="110" fontWeight="900" fill="white">?</text>

      <line x1="80" y1="330" x2="600" y2="330" stroke="white" strokeOpacity="0.3" strokeWidth="1" />

      <text x="340" y="385" textAnchor="middle" fontFamily="'Nunito', system-ui, sans-serif" fontSize="22" fontWeight="700" fill="white" letterSpacing="1">CE FAIT EST SI INCROYABLE</text>

      <text x="340" y="425" textAnchor="middle" fontFamily="'Nunito', system-ui, sans-serif" fontSize="18" fontWeight="400" fill="white" fillOpacity="0.85">{"qu'on n'a pas encore trouv\u00e9"}</text>

      <text x="340" y="455" textAnchor="middle" fontFamily="'Nunito', system-ui, sans-serif" fontSize="18" fontWeight="400" fill="white" fillOpacity="0.85">une image à la hauteur...</text>

      <line x1="80" y1="500" x2="600" y2="500" stroke="white" strokeOpacity="0.3" strokeWidth="1" />

      <text x="340" y="540" textAnchor="middle" fontFamily="'Nunito', system-ui, sans-serif" fontSize="14" fontWeight="400" fill="white" fillOpacity="0.6">Image bientôt disponible</text>
    </svg>
  )
}
