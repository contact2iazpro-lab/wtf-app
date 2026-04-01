export const CATEGORIES = [
  { id: 'animaux',            label: 'Animaux',                  emoji: '🦁', color: '#6BCB77' },
  { id: 'animaux-marins',     label: 'Animaux Marins',           emoji: '🐬', color: '#40B4D8' },
  { id: 'animaux-terrestres', label: 'Animaux Terrestres',       emoji: '🦁', color: '#6BCB77' },
  { id: 'architecture',       label: 'Architecture',             emoji: '🏛️', color: '#A0826D' },
  { id: 'art',                label: 'Art',                      emoji: '🎨', color: '#A07CD8' },
  { id: 'celebrites',         label: 'Célébrités',               emoji: '🌟', color: '#FFD700' },
  { id: 'cinema',             label: 'Cinéma',                   emoji: '🎬', color: '#D4AF37' },
  { id: 'corps-humain',       label: 'Corps Humain',             emoji: '🫀', color: '#F07070' },
  { id: 'crimes',             label: 'Crimes & Faits Divers',    emoji: '🔍', color: '#8B4789' },
  { id: 'definition',         label: 'Définition',               emoji: '📖', color: '#C8C8C8' },
  { id: 'dictons',            label: 'Dictons & Expressions',    emoji: '🗨️', color: '#E67E22' },
  { id: 'espace',             label: 'Espace',                   emoji: '🚀', color: '#2E1A47' },
  { id: 'gastronomie',        label: 'Gastronomie',              emoji: '🍽️', color: '#FFA500' },
  { id: 'geographie',         label: 'Géographie',               emoji: '🌍', color: '#40D9C8' },
  { id: 'histoire',           label: 'Histoire',                 emoji: '📜', color: '#E8CFA0' },
  { id: 'internet',           label: 'Internet & Réseaux',       emoji: '📡', color: '#5B8DBE' },
  { id: 'inventions',         label: 'Inventions & Découvertes', emoji: '💡', color: '#F1C40F' },
  { id: 'jeux-jouets',        label: 'Jeux & Jouets',            emoji: '🎮', color: '#9B59B6' },
  { id: 'kids',               label: 'Kids',                     emoji: '🎈', color: '#FFEF60' },
  { id: 'lois',               label: 'Lois & Règles',            emoji: '⚖️', color: '#B0A8D8' },
  { id: 'musique',            label: 'Musique',                  emoji: '🎵', color: '#E84B8A' },
  { id: 'mythologie',         label: 'Mythologie',               emoji: '⚡', color: '#C8A84B' },
  { id: 'phobies',            label: 'Phobies',                  emoji: '😱', color: '#A8B8D8' },
  { id: 'politique',          label: 'Politique',                emoji: '🗳️', color: '#B24B4B' },
  { id: 'psychologie',        label: 'Psychologie',              emoji: '🧠', color: '#8E44AD' },
  { id: 'records',            label: 'Records',                  emoji: '🏆', color: '#E8B84B' },
  { id: 'sante',              label: 'Santé',                    emoji: '⚕️', color: '#90F090' },
  { id: 'sciences',           label: 'Sciences',                 emoji: '🔬', color: '#80C8E8' },
  { id: 'sport',              label: 'Sport',                    emoji: '⚽', color: '#E84535' },
  { id: 'technologie',        label: 'Technologie',              emoji: '🤖', color: '#C0C0C0' },
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
