/**
 * resolveImageUrl — résout les URLs d'images pour l'admin tool.
 *
 * PROBLÈME : Les facts existants stockent des chemins relatifs comme
 * "/assets/facts/1.png". Ces chemins sont servis par le jeu
 * depuis son dossier /public, mais l'admin tool est sur un domaine différent
 * et ne dispose pas de ces assets localement.
 *
 * SOLUTION : Préfixer les chemins relatifs avec l'URL de base du jeu.
 * Les URLs absolues (Supabase Storage, http://, https://) sont retournées telles quelles.
 *
 * Types d'URL rencontrés :
 *   "/assets/facts/1.png"                        → chemin relatif du jeu (legacy)
 *   "https://xxx.supabase.co/storage/v1/..."     → upload Supabase (nouveau)
 *   null / ""                                    → pas d'image
 */

// URL de base du jeu — les assets statiques sont servis depuis ce domaine.
// Peut être surchargée via variable d'environnement Vite.
export const GAME_BASE_URL =
  import.meta.env.VITE_GAME_BASE_URL?.replace(/\/$/, '') ||
  'https://wtf-app-production.up.railway.app'

/**
 * Transforme une URL issue du client admin Supabase en URL stockable et chargeable
 * partout (admin-tool, jeu en prod).
 *
 * 1. Remplace le préfixe proxy local (`/supabase-proxy`) par l'URL Supabase absolue
 *    → indispensable pour que le jeu (domaine différent) puisse charger l'image.
 * 2. Si `transform: true` (Supabase Pro requis), réécrit vers l'endpoint
 *    `render/image/public/` avec les params WebP + width + quality.
 *    Sinon laisse `object/public/` (gratuit, PNG/JPG originaux).
 *
 * Plan Supabase Free → garder transform=false pour que les images se chargent.
 * Plan Supabase Pro  → activer transform=true pour bénéficier du WebP à la volée.
 */
export function optimizeSupabaseImageUrl(
  url,
  { width = 1024, quality = 75, transform = false } = {},
) {
  if (!url || typeof url !== 'string') return url

  const supabaseBase = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')

  // Étape 1 — Remplace le proxy local par l'URL absolue si nécessaire
  let absolute = url
  const proxyMatch = url.match(/\/supabase-proxy(\/storage\/v1\/.+)$/)
  if (proxyMatch && supabaseBase) {
    absolute = supabaseBase + proxyMatch[1]
  }

  // Étape 2 — Si pas une URL Supabase Storage, on retourne tel quel
  if (!absolute.includes('/storage/v1/')) return absolute

  // Étape 3 — Image Transformations (WebP) ou non
  if (!transform) return absolute

  const transformed = absolute.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/',
  )
  if (transformed === absolute) return absolute
  const [base] = transformed.split('?')
  return `${base}?width=${width}&quality=${quality}&format=webp`
}

/**
 * Retourne une URL absolue utilisable dans un <img src>.
 * @param {string|null} url  Valeur brute issue de Supabase (image_url)
 * @returns {string|null}    URL absolue, ou null si pas d'image
 */
export function resolveImageUrl(url) {
  if (!url || url.trim() === '') return null

  // Déjà une URL absolue (Supabase Storage, CDN, etc.)
  if (url.startsWith('http://') || url.startsWith('https://')) return url

  // Chemin relatif legacy → on préfixe avec le domaine du jeu
  if (url.startsWith('/')) return GAME_BASE_URL + url

  // Cas inattendu : retourner tel quel
  return url
}
