// ─── Storage Helper — Point unique de lecture wtf_data ───────────────────────
// Tous les fichiers qui lisent wtf_data doivent passer par ici.
// Les écritures restent dans saveStorage (App.jsx) et currencyService.

/**
 * Lire wtf_data depuis localStorage (lecture seule)
 * @returns {object} les données wtf_data parsées, ou un objet vide
 */
export function readWtfData() {
  try {
    return JSON.parse(localStorage.getItem('wtf_data') || '{}')
  } catch {
    return {}
  }
}

/**
 * Lire une clé spécifique de wtf_data
 * @param {string} key — la clé à lire (ex: 'tickets', 'wtfCoins', 'unlockedFacts')
 * @param {*} defaultValue — valeur par défaut si la clé n'existe pas
 */
export function readWtfField(key, defaultValue = null) {
  const data = readWtfData()
  return data[key] !== undefined ? data[key] : defaultValue
}
