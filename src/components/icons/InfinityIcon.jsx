/**
 * InfinityIcon — symbole infini seul (sans cercle).
 * Picto "Illimité" pour Vrai ET Fou.
 */
export default function InfinityIcon({ size = 64, color = '#6BCB77' }) {
  return (
    <svg width={size} height={size} viewBox="-5 0 110 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 50c0-10 7-18 18-18s18 8 22 18c4-10 10-18 22-18s18 8 18 18-7 18-18 18-18-8-22-18c-4 10-10 18-22 18S10 60 10 50z"
        stroke={color} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
    </svg>
  )
}
