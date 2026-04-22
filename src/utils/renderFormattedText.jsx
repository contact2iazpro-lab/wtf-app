// Interprète les marqueurs de surbrillance :
//   *mot*          → gras italique jaune souligné (standard)
//   **_mot**_      → legacy, conservé pour rétrocompat
// Le rendu est un span stylé. Si aucun marqueur, retourne le texte brut.
export default function renderFormattedText(text, highlightColor, { noUnderline } = {}) {
  if (!text || typeof text !== 'string') return text
  const normalized = text.replace(/\*\*_(.+?)\*\*_/g, '*$1*')
  if (!normalized.includes('*')) return text
  const parts = normalized.split(/\*([^*\n]+)\*/g)
  if (parts.length === 1) return text
  const c = highlightColor || '#FFD700'
  return parts.map((part, i) =>
    i % 2 === 1
      ? <span key={i} style={{
          fontWeight: 900,
          fontStyle: 'italic',
          color: c,
          ...(noUnderline ? {} : {
            textDecoration: 'underline',
            textDecorationColor: c + '66',
            textUnderlineOffset: '2px',
          }),
        }}>{part}</span>
      : part
  )
}
