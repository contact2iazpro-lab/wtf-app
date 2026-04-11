/**
 * CurrencyService — Point unique d'écriture des devises (tickets, coins, hints)
 *
 * ARCHITECTURE V2 :
 * - Ce service est maintenant un BRIDGE entre l'ancien code (qui appelle updateCoins/etc.)
 *   et le nouveau CurrencyContext (source de vérité pour les connectés).
 * - Pour les joueurs CONNECTÉS : délègue au CurrencyContext via _contextRef
 * - Pour les joueurs ANONYMES : écrit directement dans localStorage (comportement legacy)
 *
 * Migration progressive : les appelants existants (App.jsx, etc.) continuent d'appeler
 * updateCoins(delta) sans changement. Le service route vers le bon backend.
 *
 * RÈGLE : AUCUN autre fichier ne doit écrire directement tickets/coins/hints
 * dans localStorage. Tout passe par ce service ou le CurrencyContext.
 */

// ── Référence au CurrencyContext (injectée par le Provider) ──────────────────

let _contextRef = null

/**
 * Appelé par CurrencyProvider au mount pour injecter les fonctions du context.
 * @param {{ addCoins: Function, addTickets: Function, addHints: Function, refreshFromServer: Function } | null} ctx
 */
export function setCurrencyContext(ctx) {
  _contextRef = ctx
}

function isConnected() {
  return _contextRef !== null
}

// ── Helpers localStorage (legacy, pour anonymes) ─────────────────────────────

function readWtfData() {
  try {
    return JSON.parse(localStorage.getItem('wtf_data') || '{}')
  } catch {
    return {}
  }
}

function writeWtfData(data) {
  data.lastModified = Date.now()
  localStorage.setItem('wtf_data', JSON.stringify(data))
}

// ── Fonctions publiques ──────────────────────────────────────────────────────

/**
 * Modifier les coins du joueur
 * @param {number} delta — positif pour ajouter, négatif pour retirer
 * @returns {number} nouveau solde (optimistic)
 */
export function updateCoins(delta) {
  if (isConnected()) {
    _contextRef.addCoins(delta)
    return // Le context gère tout
  }

  // Fallback anonyme
  const data = readWtfData()
  data.wtfCoins = Math.max(0, (data.wtfCoins || 0) + delta)
  writeWtfData(data)
  notifyUI()
  return data.wtfCoins
}

/**
 * Modifier les tickets du joueur
 * @param {number} delta — positif pour ajouter, négatif pour retirer
 * @returns {number} nouveau solde (optimistic)
 */
export function updateTickets(delta) {
  if (isConnected()) {
    _contextRef.addTickets(delta)
    return
  }

  const data = readWtfData()
  data.tickets = Math.max(0, (data.tickets || 0) + delta)
  writeWtfData(data)
  notifyUI()
  return data.tickets
}

/**
 * Modifier les indices du joueur
 * @param {number} delta — positif pour ajouter, négatif pour retirer
 * @returns {number} nouveau solde (optimistic)
 */
export function updateHints(delta) {
  if (isConnected()) {
    _contextRef.addHints(delta)
    return
  }

  const current = parseInt(localStorage.getItem('wtf_hints_available') || '0', 10)
  const newValue = Math.max(0, current + delta)
  localStorage.setItem('wtf_hints_available', String(newValue))
  const data = readWtfData()
  writeWtfData(data) // Met à jour lastModified
  notifyUI()
  return newValue
}

/**
 * Modifier plusieurs devises en une seule opération
 * @param {{ coins?: number, tickets?: number, hints?: number }} deltas
 * @returns {{ coins: number, tickets: number, hints: number }} nouveaux soldes
 */
export function updateMultiple(deltas) {
  if (isConnected()) {
    if (deltas.coins) _contextRef.addCoins(deltas.coins)
    if (deltas.tickets) _contextRef.addTickets(deltas.tickets)
    if (deltas.hints) _contextRef.addHints(deltas.hints)
    return
  }

  // Fallback anonyme
  const data = readWtfData()
  if (deltas.coins !== undefined) {
    data.wtfCoins = Math.max(0, (data.wtfCoins || 0) + deltas.coins)
  }
  if (deltas.tickets !== undefined) {
    data.tickets = Math.max(0, (data.tickets || 0) + deltas.tickets)
  }
  writeWtfData(data)

  if (deltas.hints !== undefined) {
    const current = parseInt(localStorage.getItem('wtf_hints_available') || '0', 10)
    localStorage.setItem('wtf_hints_available', String(Math.max(0, current + deltas.hints)))
  }

  notifyUI()

  return {
    coins: data.wtfCoins || 0,
    tickets: data.tickets || 0,
    hints: parseInt(localStorage.getItem('wtf_hints_available') || '0', 10),
  }
}

/**
 * Lire les soldes actuels (lecture seule, pas de modification)
 */
export function getBalances() {
  // Note : pour les connectés, préférer useCurrency() dans les composants React.
  // Cette fonction est gardée pour le code non-React (storageHelper, etc.)
  const data = readWtfData()
  return {
    coins: data.wtfCoins || 0,
    tickets: data.tickets || 0,
    hints: parseInt(localStorage.getItem('wtf_hints_available') || '0', 10),
  }
}

/**
 * Forcer les devises à des valeurs absolues (pour init nouveau joueur ou restore)
 * @param {{ coins?: number, tickets?: number, hints?: number }} values
 */
export function setAbsolute(values) {
  const data = readWtfData()
  if (values.coins !== undefined) data.wtfCoins = values.coins
  if (values.tickets !== undefined) data.tickets = values.tickets
  writeWtfData(data)
  if (values.hints !== undefined) {
    localStorage.setItem('wtf_hints_available', String(values.hints))
  }
  // Note : setAbsolute n'utilise PAS le delta RPC — c'est pour le dev mode uniquement
  notifyUI()
}

// ── Internes ─────────────────────────────────────────────────────────────────

function notifyUI() {
  window.dispatchEvent(new Event('wtf_currency_updated'))
}
