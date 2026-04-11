/**
 * syncQueue — Queue offline persistée en IndexedDB pour les deltas de devises.
 *
 * Principe :
 * - Chaque mutation de devise enqueue un delta { coins, tickets, hints }
 * - drain() coalesce tous les deltas pendants et appelle le RPC Supabase
 * - La queue survit aux fermetures d'onglet (IndexedDB ≠ mémoire)
 * - drain() est appelée sur : reconnexion, visibilitychange, timer 30s
 *
 * Utilise l'API IndexedDB native (pas de dépendance externe).
 */

const DB_NAME = 'wtf_sync'
const DB_VERSION = 1
const STORE_NAME = 'deltas'

// ── IndexedDB helpers ────────────────────────────────────────────────────────

let _dbPromise = null

function openDB() {
  if (_dbPromise) return _dbPromise
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => {
      console.warn('[syncQueue] IndexedDB open failed, falling back to in-memory')
      _dbPromise = null
      reject(req.error)
    }
  })
  return _dbPromise
}

async function getAllEntries() {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => reject(req.error)
    })
  } catch {
    return _memoryQueue.slice()
  }
}

async function addEntry(entry) {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.add(entry)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  } catch {
    _memoryQueue.push({ ...entry, id: Date.now() })
  }
}

async function clearAll() {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.clear()
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch {
    _memoryQueue.length = 0
  }
}

// Fallback mémoire si IndexedDB indisponible
let _memoryQueue = []

// ── Public API ───────────────────────────────────────────────────────────────

let _supabaseRef = null
let _draining = false

/**
 * Initialiser la queue avec la référence Supabase.
 * Appelé une seule fois au mount du CurrencyContext.
 */
export function initSyncQueue(supabaseClient) {
  _supabaseRef = supabaseClient
}

/**
 * Ajouter un delta à la queue.
 * @param {{ coins?: number, tickets?: number, hints?: number }} delta
 */
export async function enqueue(delta) {
  const entry = {
    coins: delta.coins || 0,
    tickets: delta.tickets || 0,
    hints: delta.hints || 0,
    timestamp: Date.now(),
  }
  await addEntry(entry)
}

/**
 * Coalescer tous les deltas pendants et les envoyer au serveur.
 * Retourne les balances serveur si succès, null sinon.
 * @returns {{ coins: number, tickets: number, hints: number } | null}
 */
export async function drain() {
  if (_draining || !_supabaseRef) return null
  _draining = true

  try {
    const entries = await getAllEntries()
    if (entries.length === 0) return null

    // Coalescer tous les deltas en un seul
    const coalesced = { coins: 0, tickets: 0, hints: 0 }
    for (const e of entries) {
      coalesced.coins += e.coins || 0
      coalesced.tickets += e.tickets || 0
      coalesced.hints += e.hints || 0
    }

    // Skip si aucun delta réel
    if (coalesced.coins === 0 && coalesced.tickets === 0 && coalesced.hints === 0) {
      await clearAll()
      return null
    }

    // Appeler le RPC
    const { data, error } = await _supabaseRef.rpc('apply_currency_delta', {
      p_coins_delta: coalesced.coins,
      p_tickets_delta: coalesced.tickets,
      p_hints_delta: coalesced.hints,
    })

    if (error) {
      console.warn('[syncQueue] drain RPC failed:', error.message)
      return null
    }

    // Succès → vider la queue
    await clearAll()

    // Retourner les balances confirmées par le serveur
    const serverBalances = Array.isArray(data) ? data[0] : data
    return serverBalances || null
  } catch (err) {
    console.warn('[syncQueue] drain error:', err.message)
    return null
  } finally {
    _draining = false
  }
}

/**
 * Nombre de deltas en attente.
 */
export async function pendingCount() {
  const entries = await getAllEntries()
  return entries.length
}

/**
 * Vider la queue sans envoyer (pour logout).
 */
export async function clearQueue() {
  await clearAll()
}

/**
 * Construire un payload beacon pour pagehide (dernier recours).
 * Retourne null si rien à envoyer.
 */
export async function buildBeaconPayload() {
  const entries = await getAllEntries()
  if (entries.length === 0) return null

  const coalesced = { coins: 0, tickets: 0, hints: 0 }
  for (const e of entries) {
    coalesced.coins += e.coins || 0
    coalesced.tickets += e.tickets || 0
    coalesced.hints += e.hints || 0
  }

  if (coalesced.coins === 0 && coalesced.tickets === 0 && coalesced.hints === 0) return null
  return coalesced
}
