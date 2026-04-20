export const CATEGORIES = [
  { id: 'gastronomie',        label: 'A table !',                emoji: '🍽️', color: '#FFA500' },
  { id: 'lois',               label: 'Article 22',               emoji: '⚖️', color: '#6366B8' },
  { id: 'architecture',       label: 'Bati dingue',              emoji: '🏛️', color: '#A0826D' },
  { id: 'bestioles',          label: 'Bestioles',                emoji: '🐛', color: '#7A9F35' },
  { id: 'animaux-ciel',       label: 'Ca plane !',               emoji: '🦅', color: '#B8A5E8' },
  { id: 'crimes',             label: 'Casier judiciaire',        emoji: '🔍', color: '#8B4789' },
  { id: 'art',                label: "Chef-d'oeuvre ?",           emoji: '🎨', color: '#A07CD8' },
  { id: 'corps-humain',       label: 'Corps et Ame',             emoji: '🫀', color: '#F07070' },
  { id: 'politique',          label: 'Coulisses du pouvoir',     emoji: '🗳️', color: '#B24B4B' },
  { id: 'celebrites',         label: 'Crazy Stars',              emoji: '🌟', color: '#FFD700' },
  { id: 'definition',         label: 'Dico WTF',                 emoji: '📖', color: '#4A9BD9' },
  { id: 'sciences',           label: 'E = WTF²',                 emoji: '🔬', color: '#80C8E8' },
  { id: 'cinema',             label: 'Ecran noir',               emoji: '🎬', color: '#D4AF37' },
  { id: 'jeux-jouets',        label: 'Game On',                  emoji: '🎮', color: '#9B59B6' },
  { id: 'technologie',        label: 'Geek zone',                emoji: '🤖', color: '#7B8FA0' },
  { id: 'animaux-sauvages',   label: 'Griffes et Crocs',         emoji: '🦁', color: '#E8712A' },
  { id: 'espace',             label: 'Houston...',               emoji: '🚀', color: '#2E1A47' },
  { id: 'inventions',         label: 'Idee de genie ?',          emoji: '💡', color: '#5BC0DE' },
  { id: 'kids',               label: 'Kids',                     emoji: '🎈', color: '#E8C000' },
  { id: 'mythologie',         label: 'Mythes et Monstres',       emoji: '⚡', color: '#C8A84B' },
  { id: 'dictons',            label: 'On dit que...',            emoji: '🗨️', color: '#4CAF50' },
  { id: 'transports',         label: 'On the road again',        emoji: '🚂', color: '#3A6FA0' },
  { id: 'histoire',           label: 'Passe compose',            emoji: '📜', color: '#E8A030' },
  { id: 'phobies',            label: 'Phobies',                  emoji: '😱', color: '#7B5EA7' },
  { id: 'meteo',              label: 'Quel temps...',            emoji: '🌦️', color: '#6FC0D8' },
  { id: 'sante',              label: 'Quoi de neuf, Doc ?',      emoji: '⚕️', color: '#90F090' },
  { id: 'records',            label: 'Sans limites',             emoji: '🏆', color: '#E8B84B' },
  { id: 'animaux-marins',     label: 'Sous les vagues',          emoji: '🐬', color: '#40B4D8' },
  { id: 'sport',              label: 'Sport',                    emoji: '⚽', color: '#E84535' },
  { id: 'geographie',         label: 'Terre inconnue',           emoji: '🌍', color: '#40D9C8' },
  { id: 'psychologie',        label: "Tete a l'envers",          emoji: '🧠', color: '#8E44AD' },
  { id: 'musique',            label: 'Volume a fond',            emoji: '🎵', color: '#E84B8A' },
  { id: 'animaux',            label: 'What the Zoo',             emoji: '🦁', color: '#6BCB77' },
  { id: 'internet',           label: 'WTF 2.0',                  emoji: '📡', color: '#5B8DBE' },
]

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]))

export function getCategoryLabel(id) {
  return CATEGORY_MAP[id]?.label ?? id
}

export function getCategoryEmoji(id) {
  return CATEGORY_MAP[id]?.emoji ?? '❓'
}

export const VIP_USAGES = [
  { value: 'available',         label: 'Disponible (non assigné)' },
  { value: 'daily_rotation',    label: 'Rotation quotidienne' },
  { value: 'completion_reward', label: 'Récompense de complétion' },
  { value: 'loyalty_reward',    label: 'Récompense de fidélité' },
]
