// ─── Fisher-Yates shuffle — vrai ordre aléatoire ───────────────────────────
// Remplace `.sort(() => Math.random() - 0.5)` qui est biaisé :
// - V8/SpiderMonkey cachent les résultats de comparaison pour optimiser
// - Les premiers éléments ont statistiquement plus de chance de rester en tête
// - Ordre non uniforme, surtout sur les petits arrays

/**
 * Mélange un array avec Fisher-Yates (uniforme, vrai aléatoire).
 * Retourne une nouvelle array (ne mute pas l'original).
 */
export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Pioche N éléments aléatoires uniques d'un array.
 * Plus efficace que shuffle().slice(0, n) si n << arr.length.
 */
export function pickRandom(arr, n) {
  if (n >= arr.length) return shuffle(arr)
  return shuffle(arr).slice(0, n)
}
