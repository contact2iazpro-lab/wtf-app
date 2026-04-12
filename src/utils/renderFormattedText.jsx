// Interprète les marqueurs de surbrillance :
//   *mot*          → gras italique jaune souligné (standard)
//   **_mot**_      → legacy, conservé pour rétrocompat
// Le rendu est un span stylé. Si aucun marqueur, retourne le texte brut.
export default function renderFormattedText(text) {
  if (!text || typeof text !== 'string') return text
  // Normaliser le legacy **_x**_ en *x* pour un seul parser
  const normalized = text.replace(/\*\*_(.+?)\*\*_/g, '*$1*')
  if (!normalized.includes('*')) return text
  const parts = normalized.split(/\*([^*\n]+)\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1
      ? <span key={i} style={{
          fontWeight: 900,
          fontStyle: 'italic',
          color: '#FFD700',
          textDecoration: 'underline',
          textDecorationColor: 'rgba(255,215,0,0.4)',
          textUnderlineOffset: '2px',
        }}>{part}</span>
      : part
  )
}
