export const CATEGORIES = [
  { id: 'animaux',       label: 'Animaux',                    emoji: '🦁' },
  { id: 'art',           label: 'Art',                        emoji: '🎨' },
  { id: 'corps-humain',  label: 'Corps Humain',               emoji: '🫀' },
  { id: 'definition',    label: 'Définition',                 emoji: '📖' },
  { id: 'gastronomie',   label: 'Gastronomie',                emoji: '🍽️' },
  { id: 'geographie',    label: 'Géographie',                 emoji: '🌍' },
  { id: 'histoire',      label: 'Histoire',                   emoji: '📜' },
  { id: 'kids',          label: 'Kids',                       emoji: '🎈' },
  { id: 'phobies',       label: 'Phobies',                    emoji: '😱' },
  { id: 'records',       label: 'Records',                    emoji: '🏆' },
  { id: 'sante',         label: 'Santé',                      emoji: '⚕️' },
  { id: 'sciences',      label: 'Sciences',                   emoji: '🔬' },
  { id: 'sport',         label: 'Sport',                      emoji: '⚽' },
  { id: 'technologie',   label: 'Technologie',                emoji: '🤖' },
  { id: 'lois',          label: 'Lois & Règles',              emoji: '⚖️' },
  { id: 'cinema',        label: 'Cinéma',                     emoji: '🎬' },
  { id: 'musique',       label: 'Musique',                    emoji: '🎵' },
  { id: 'politique',     label: 'Politique',                  emoji: '🗳️' },
  { id: 'crimes',        label: 'Crimes & Faits Divers',      emoji: '🔍' },
  { id: 'architecture',  label: 'Architecture',               emoji: '🏛️' },
  { id: 'internet',      label: 'Internet & Réseaux',         emoji: '📱' },
  { id: 'espace',        label: 'Espace',                     emoji: '🚀' },
  { id: 'psychologie',   label: 'Psychologie',                emoji: '🧠' },
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
