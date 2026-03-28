export const CATEGORIES = [
  { id: "animaux", label: "Animaux", emoji: "🦁", color: "#6BCB77", bg: "#0A2A0E", image: "Carte WTF Animaux.png" },
  { id: "art", label: "Art", emoji: "🎨", color: "#A07CD8", bg: "#1A0A35", image: "Carte WTF Art.png" },
  { id: "corps-humain", label: "Corps Humain", emoji: "🫀", color: "#F07070", bg: "#3A0A0A", image: "Carte WTF Corps humain.png" },
  { id: "definition", label: "Définition", emoji: "📖", color: "#C8C8C8", bg: "#1C1C1C", image: "Carte WTF Definition.png" },
  { id: "gastronomie", label: "Gastronomie", emoji: "🍽️", color: "#FFA500", bg: "#3A2000", image: "Carte WTF Gastronomie.png" },
  { id: "geographie", label: "Géographie", emoji: "🌍", color: "#40D9C8", bg: "#003A35", image: "Carte WTF Geographie.png" },
  { id: "histoire", label: "Histoire", emoji: "📜", color: "#E8CFA0", bg: "#2C2010", image: "Carte WTF Histoire.png" },
  { id: "kids", label: "Kids", emoji: "🎈", color: "#FFEF60", bg: "#3A3300", image: "Carte WTF Kids.png" },
  { id: "phobies", label: "Phobies", emoji: "😱", color: "#A8B8D8", bg: "#0A1020", image: "Carte WTF Phobies.png" },
  { id: "records", label: "Records", emoji: "🏆", color: "#E8B84B", bg: "#2E2000", image: "Carte WTF Records.png" },
  { id: "sante", label: "Santé", emoji: "⚕️", color: "#90F090", bg: "#053A05", image: "Carte WTF Sante.png" },
  { id: "sciences", label: "Sciences", emoji: "🔬", color: "#80C8E8", bg: "#0A2035", image: "Carte WTF Sciences.png" },
  { id: "sport", label: "Sport", emoji: "⚽", color: "#E84535", bg: "#3A0A05", image: "Carte WTF Sport.png" },
  { id: "technologie", label: "Technologie", emoji: "🤖", color: "#C0C0C0", bg: "#1C1C1C", image: "Carte WTF Technologie.png" },
  { id: "lois", label: "Lois & Règles", emoji: "⚖️", color: "#B0A8D8", bg: "#1A0A35", image: "Carte WTF Lois et regles.png" },
  { id: "politique", label: "Politique", emoji: "🗳️", color: "#B24B4B", bg: "#2A0A0A", image: "Carte WTF Politique.png", disabled: true },
  { id: "cinema", label: "Cinéma", emoji: "🎬", color: "#D4AF37", bg: "#2A2000", image: "Carte WTF Cinema.png" },
  { id: "crimes", label: "Crimes & Faits Divers", emoji: "🔍", color: "#8B4789", bg: "#2A0A2A", image: "Carte WTF Crimes.png", disabled: true },
  { id: "architecture", label: "Architecture", emoji: "🏛️", color: "#A0826D", bg: "#2A1A0F", image: "Carte WTF Architecture.png", disabled: true },
  { id: "internet", label: "Internet & Réseaux Sociaux", emoji: "📱", color: "#5B8DBE", bg: "#0A1A35", image: "Carte WTF Internet.png", disabled: true },
  { id: "espace", label: "Espace", emoji: "🚀", color: "#2E1A47", bg: "#1A0A2A", image: "Carte WTF Espace.png", disabled: true },
  { id: "musique", label: "Musique", emoji: "🎵", color: "#E84B8A", bg: "#2A0A1A", image: "Carte WTF Musique.png" },
  { id: "psychologie", label: "Psychologie", emoji: "🧠", color: "#8E44AD", bg: "#1A0A2A", image: "Carte WTF Psychologie.png", disabled: true }
]

export const FACTS = [

]

export const getCategoryById = (id) => CATEGORIES.find((c) => c.id === id)

// Extract fact ID from relative imageUrl (e.g., "/assets/facts/365.png" → 365)
const getImageId = (imageUrl) => {
  if (!imageUrl || imageUrl.startsWith('http')) return null
  const match = imageUrl.match(/\/(\d+)\.png$/)
  return match ? parseInt(match[1]) : null
}

// Only images 1-350 exist physically in public/assets/facts/
// Facts 351-850 reference images that don't exist, so they're filtered out
const EXISTING_IMAGE_IDS = new Set(Array.from({ length: 350 }, (_, i) => i + 1))

export const isFactValid = (fact) => {
  if (!fact || !fact.question || !fact.category) return false
  if (!Array.isArray(fact.options) || fact.options.length < 2) return false
  if (typeof fact.correctIndex !== 'number' || fact.correctIndex < 0) return false

  // imageUrl: null → no image, allowed
  // imageUrl: "https://..." → external image, always allowed
  // imageUrl: "/assets/facts/N.png" → must exist locally (N between 1-350)
  if (fact.imageUrl !== null && fact.imageUrl !== undefined) {
    if (!fact.imageUrl.startsWith('http')) {
      const imageId = getImageId(fact.imageUrl)
      if (imageId === null || !EXISTING_IMAGE_IDS.has(imageId)) return false
    }
  }

  return true
}

export const VALID_FACTS = FACTS.filter(isFactValid)

// Categories available for gameplay (disabled: true = hidden until ready)
export const PLAYABLE_CATEGORIES = CATEGORIES.filter((c) => !c.disabled)

export const getFactsByCategory = (categoryId) =>
  categoryId
    ? VALID_FACTS.filter((f) => f.category === categoryId)
    : VALID_FACTS

// Build difficulty assignment:
//   Priority 1 — use stored difficulty field (set in admin, synced from Supabase)
//   Priority 2 — positional fallback (first 10 per category = easy, next 10 = normal, rest = expert)
function buildDifficultyAssignment() {
  const map = {}

  // Priority 1: use stored difficulty where available
  for (const f of FACTS) {
    if (!f || !f.difficulty) continue
    switch (f.difficulty.toLowerCase()) {
      case 'facile': case 'easy':   map[f.id] = 'easy';   break
      case 'normal':                map[f.id] = 'normal'; break
      case 'expert': case 'hard':   map[f.id] = 'expert'; break
    }
  }

  // Priority 2: positional fallback for facts without stored difficulty
  const catIds = CATEGORIES.filter(c => !c.disabled).map(c => c.id)
  for (const catId of catIds) {
    const catFacts = FACTS
      .filter(f => f && f.question && f.category === catId && Array.isArray(f.options) && f.options.length >= 2 && typeof f.correctIndex === 'number' && !map[f.id])
      .sort((a, b) => a.id - b.id)
    catFacts.forEach((f, i) => {
      if (i < 10) map[f.id] = 'easy'
      else if (i < 20) map[f.id] = 'normal'
      else map[f.id] = 'expert'
    })
  }
  return map
}
export const DIFFICULTY_ASSIGNMENT = buildDifficultyAssignment()

// Parcours facts: relaxed image filter (imageUrl → null if image missing), includes difficulty + isSuperWTF
export const PARCOURS_FACTS = FACTS
  .filter(f => f && f.question && f.category && Array.isArray(f.options) && f.options.length >= 2 && typeof f.correctIndex === 'number' && DIFFICULTY_ASSIGNMENT[f.id])
  .map(f => {
    let imageUrl = f.imageUrl
    if (imageUrl !== null && imageUrl !== undefined && !imageUrl.startsWith('http')) {
      const imageId = getImageId(imageUrl)
      if (!imageId || !EXISTING_IMAGE_IDS.has(imageId)) imageUrl = null
    }
    return { ...f, imageUrl, difficulty: DIFFICULTY_ASSIGNMENT[f.id], isSuperWTF: false }
  })

// Lookup: category+difficulty → Set of fact IDs (for completion detection)
export const CATEGORY_LEVEL_FACT_IDS = {}
PARCOURS_FACTS.forEach(f => {
  const key = `${f.category}_${f.difficulty}`
  if (!CATEGORY_LEVEL_FACT_IDS[key]) CATEGORY_LEVEL_FACT_IDS[key] = new Set()
  CATEGORY_LEVEL_FACT_IDS[key].add(f.id)
})

// ─── WTF du Jour — daily game loop ─────────────────────────────────────────

// VIP Fact IDs — manually curated selection of the most "What The Fact!" facts
export const VIP_FACT_IDS = new Set([
  2, 4, 7, 10, 14, 17, 20, 24, 29, 30, 35, 38, 42, 47, 51, 56, 60, 65, 70, 75,
  80, 85, 90, 95, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250,
  260, 270, 280, 290, 300, 320, 330, 340, 350,
])

// Generate a masked teaser title — reveals first ~40% of words to build curiosity
export function getTitrePartiel(fact) {
  const answer = fact.shortAnswer || ''
  const words = answer.split(' ')
  if (words.length <= 1) return `${words[0] || '...'} [masqué] 🔒`
  const revealCount = Math.max(1, Math.floor(words.length * 0.4))
  return `${words.slice(0, revealCount).join(' ')}... [masqué] 🔒`
}

// Get today's WTF du Jour fact — deterministic per calendar day, same for all users
export function getDailyFact() {
  const dateStr = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const seed = dateStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const pool = VALID_FACTS.filter(f => VIP_FACT_IDS.has(f.id))
  const facts = pool.length > 0 ? pool : VALID_FACTS
  return facts[seed % facts.length]
}
