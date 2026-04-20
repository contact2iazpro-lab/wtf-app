/**
 * Retire tous les emojis d'une chaîne de caractères.
 * Utilisé pour nettoyer les champs "Le saviez-vous" (explanation) au rendu.
 *
 * Regex Unicode `\p{Extended_Pictographic}` couvre :
 *   - Emojis classiques (😀 🧠 🎯 etc.)
 *   - Symboles dingbats (✅ ✨ etc.)
 *   - Transport/météo/signes zodiaque
 *   - Et les sélecteurs de variation (FE0F) qui traînent
 *
 * Nettoie aussi les espaces multiples créés par la suppression.
 */
export function stripEmojis(text) {
  if (!text || typeof text !== 'string') return text
  return text
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[\uFE00-\uFE0F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
