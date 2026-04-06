/**
 * CurrencyService — Point unique d'écriture des devises (tickets, coins, hints)
 *
 * RÈGLE : AUCUN autre fichier ne doit écrire directement tickets/coins/hints
 * dans localStorage. Tout passe par ce service.
 *
 * Flow : lire local → appliquer delta → écrire local → push Supabase → dispatch event
 */

import { pushToServer } from './playerSyncService'

// ── Helpers de lecture ────────────────────────────────────────────────────────

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

function getUserId() {
  try {
    const auth = JSON.parse(localStorage.getItem('sb-znoceotakhynqcqhpwgz-auth-token') || '{}')
    return auth?.user?.id || null
  } catch {
    return null
  }
}

// ── Fonctions publiques ──────────────────────────────────────────────────────

/**
 * Modifier les coins du joueur
 * @param {number} delta — positif pour ajouter, négatif pour retirer
 * @returns {number} nouveau solde
 */
export function updateCoins(delta) {
  const data = readWtfData()
  const oldValue = data.wtfCoins || 0
  data.wtfCoins = Math.max(0, oldValue + delta)
  writeWtfData(data)
  syncToServer()
  notifyUI()
  return data.wtfCoins
}

/**
 * Modifier les tickets du joueur
 * @param {number} delta — positif pour ajouter, négatif pour retirer
 * @returns {number} nouveau solde
 */
export function updateTickets(delta) {
  const data = readWtfData()
  const oldValue = data.tickets || 0
  data.tickets = Math.max(0, oldValue + delta)
  writeWtfData(data)
  syncToServer()
  notifyUI()
  return data.tickets
}

/**
 * Modifier les indices du joueur
 * @param {number} delta — positif pour ajouter, négatif pour retirer
 * @returns {number} nouveau solde
 */
export function updateHints(delta) {
  const current = parseInt(localStorage.getItem('wtf_hints_available') || '0', 10)
  const newValue = Math.max(0, current + delta)
  localStorage.setItem('wtf_hints_available', String(newValue))
  // Aussi mettre à jour lastModified dans wtf_data pour la sync
  const data = readWtfData()
  writeWtfData(data)
  syncToServer()
  notifyUI()
  return newValue
}

/**
 * Modifier plusieurs devises en une seule opération
 * (évite plusieurs push Supabase successifs)
 * @param {{ coins?: number, tickets?: number, hints?: number }} deltas
 * @returns {{ coins: number, tickets: number, hints: number }} nouveaux soldes
 */
export function updateMultiple(deltas) {
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

  syncToServer()
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
  syncToServer()
  notifyUI()
}

// ── Internes ─────────────────────────────────────────────────────────────────

function syncToServer() {
  const userId = getUserId()
  if (userId) {
    pushToServer(userId).catch(() => {})
  }
}

function notifyUI() {
  window.dispatchEvent(new Event('wtf_currency_updated'))
}
