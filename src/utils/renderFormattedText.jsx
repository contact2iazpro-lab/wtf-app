// Interprets **_word**_ markers as bold italic
export default function renderFormattedText(text) {
  if (!text || typeof text !== 'string') return text
  const parts = text.split(/\*\*_(.+?)\*\*_/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1
      ? <span key={i} style={{ fontWeight: 900, fontStyle: 'italic', color: '#FFD700', textDecoration: 'underline', textDecorationColor: 'rgba(255,215,0,0.4)', textUnderlineOffset: '2px' }}>{part}</span>
      : part
  )
}
