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
