// Helper de rendu — mappe les emojis de devises vers leurs assets PNG.
// Utilisé par les sites JSX qui rendent un emoji en tant que valeur de chaîne
// (data arrays, props, default params, renderIcon maps existants).

export const CURRENCY_EMOJI_MAP = {
  '🪙': '/assets/ui/icon-coins.png',
  '💰': '/assets/ui/icon-coins.png',
  '🎟️': '/assets/ui/icon-tickets.png',
  '🎫': '/assets/ui/icon-tickets.png',
  '💡': '/assets/ui/icon-hint.png',
}

const ALT_MAP = {
  '/assets/ui/icon-coins.png': 'coins',
  '/assets/ui/icon-tickets.png': 'tickets',
  '/assets/ui/icon-hint.png': 'indice',
}

export function renderEmoji(value) {
  const src = CURRENCY_EMOJI_MAP[value]
  if (!src) return value
  return (
    <img
      src={src}
      alt={ALT_MAP[src] || ''}
      style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }}
    />
  )
}
