const CoinsIcon = ({ size = 20, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
  >
    {/* Pièce du bas */}
    <ellipse cx="12" cy="18" rx="8" ry="3" fill="#F59E0B" stroke="#D97706" strokeWidth="1"/>
    {/* Corps de la pile */}
    <rect x="4" y="10" width="16" height="8" fill="#FBBF24"/>
    <rect x="4" y="10" width="16" height="8" fill="url(#coinGrad)"/>
    {/* Pièce du haut */}
    <ellipse cx="12" cy="10" rx="8" ry="3" fill="#FCD34D" stroke="#D97706" strokeWidth="1"/>
    {/* Reflet */}
    <ellipse cx="10" cy="9.5" rx="3" ry="1" fill="#FEF3C7" opacity="0.6"/>
    <defs>
      <linearGradient id="coinGrad" x1="4" y1="10" x2="4" y2="18" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FBBF24"/>
        <stop offset="100%" stopColor="#F59E0B"/>
      </linearGradient>
    </defs>
  </svg>
)

export default CoinsIcon
