import { SNACK_ENERGY } from '../constants/gameConfig'

// ─── Modèle T91 : stock persistant + régén 8h, max 5 ─────────────────────────
// localStorage keys (wtf_data) :
//   - energyCurrent : stock actuel (peut dépasser MAX_STOCK si achats)
//   - energyNextRegenAt : timestamp ISO de la prochaine régénération (null si au cap)
//
// Legacy (ancien modèle compteur journalier) :
//   - flashEnergyUsed / flashEnergyDate : ignorés et nettoyés à la 1re lecture
//
// À la migration : nouveau stock = INITIAL_STOCK (5) si aucune trace.

function readWtfData() {
  try { return JSON.parse(localStorage.getItem('wtf_data') || '{}') }
  catch { return {} }
}

function writeWtfData(data) {
  data.lastModified = Date.now()
  localStorage.setItem('wtf_data', JSON.stringify(data))
  window.dispatchEvent(new Event('wtf_energy_updated'))
  window.dispatchEvent(new Event('wtf_storage_sync'))
}

/**
 * applyRegen — calcule combien d'énergies ont été régénérées depuis la dernière
 * écriture de energyNextRegenAt, et met à jour le state en conséquence.
 * @returns { current, nextRegenAt } (data mutated in place)
 */
function applyRegen(data) {
  const now = Date.now()
  const { MAX_STOCK, REGEN_MS } = SNACK_ENERGY

  // Pas de régén si déjà au cap
  if ((data.energyCurrent ?? 0) >= MAX_STOCK) {
    data.energyNextRegenAt = null
    return
  }

  // Pas de timestamp → l'initialiser pour commencer à régénérer
  if (!data.energyNextRegenAt) {
    data.energyNextRegenAt = now + REGEN_MS
    return
  }

  const nextAt = new Date(data.energyNextRegenAt).getTime()
  if (now < nextAt) return // pas encore l'heure

  // Combien de cycles écoulés depuis le dernier point de régen
  const msOverdue = now - nextAt
  const cyclesPast = Math.floor(msOverdue / REGEN_MS) + 1
  const newCurrent = Math.min(MAX_STOCK, (data.energyCurrent ?? 0) + cyclesPast)

  data.energyCurrent = newCurrent
  if (newCurrent >= MAX_STOCK) {
    data.energyNextRegenAt = null
  } else {
    // Prochain cycle relatif au dernier "théorique"
    data.energyNextRegenAt = new Date(nextAt + cyclesPast * REGEN_MS).toISOString()
  }
}

/**
 * getSnackEnergy — retourne l'état courant de l'énergie.
 * Applique la régen et migre depuis l'ancien modèle si nécessaire.
 */
export function getSnackEnergy() {
  try {
    const data = readWtfData()
    let dirty = false

    // Migration one-shot de l'ancien modèle (journalier)
    if (data.energyCurrent === undefined) {
      data.energyCurrent = SNACK_ENERGY.INITIAL_STOCK
      data.energyNextRegenAt = null
      delete data.flashEnergyUsed
      delete data.flashEnergyDate
      dirty = true
    }

    const before = { c: data.energyCurrent, n: data.energyNextRegenAt }
    applyRegen(data)
    if (before.c !== data.energyCurrent || before.n !== data.energyNextRegenAt) {
      dirty = true
    }

    if (dirty) writeWtfData(data)

    const { MAX_STOCK, REGEN_MS } = SNACK_ENERGY
    const remaining = Math.max(0, data.energyCurrent)
    const nextRegenAt = data.energyNextRegenAt
    const msUntilNext = nextRegenAt ? Math.max(0, new Date(nextRegenAt).getTime() - Date.now()) : 0

    return {
      remaining,                          // énergie actuelle disponible
      max: MAX_STOCK,                     // cap soft
      nextRegenAt,                        // ISO string ou null
      msUntilNext,                        // ms avant prochaine régén (0 si au cap)
      // Legacy — certains composants lisent encore `used`/`date`
      used: Math.max(0, MAX_STOCK - remaining),
      date: new Date().toISOString().slice(0, 10),
    }
  } catch {
    return {
      remaining: SNACK_ENERGY.INITIAL_STOCK,
      max: SNACK_ENERGY.MAX_STOCK,
      nextRegenAt: null,
      msUntilNext: 0,
      used: SNACK_ENERGY.MAX_STOCK - SNACK_ENERGY.INITIAL_STOCK,
      date: new Date().toISOString().slice(0, 10),
    }
  }
}

/**
 * consumeSnackEnergy — décrémente d'1 le stock, arme le timer de régén si
 * l'user redescend sous le cap.
 * @returns true si consommée, false si plus d'énergie
 */
export function consumeSnackEnergy() {
  const data = readWtfData()
  // S'assurer que le state est initialisé + régén appliquée
  if (data.energyCurrent === undefined) {
    data.energyCurrent = SNACK_ENERGY.INITIAL_STOCK
    data.energyNextRegenAt = null
    delete data.flashEnergyUsed
    delete data.flashEnergyDate
  }
  applyRegen(data)

  if ((data.energyCurrent ?? 0) <= 0) return false

  const wasAtCap = data.energyCurrent >= SNACK_ENERGY.MAX_STOCK
  data.energyCurrent -= 1

  // Si on passe sous le cap et qu'aucun timer n'est armé, arme-le
  if (!data.energyNextRegenAt && data.energyCurrent < SNACK_ENERGY.MAX_STOCK) {
    data.energyNextRegenAt = new Date(Date.now() + SNACK_ENERGY.REGEN_MS).toISOString()
  }

  writeWtfData(data)
  return true
}

/**
 * addSnackEnergy — crédite X énergies (achat boutique, récompense).
 * Pas de cap : un joueur peut dépasser MAX_STOCK via achat. La régén reste
 * désactivée tant qu'il est au-dessus du cap.
 */
export function addSnackEnergy(n = 1) {
  if (n <= 0) return
  const data = readWtfData()
  if (data.energyCurrent === undefined) {
    data.energyCurrent = SNACK_ENERGY.INITIAL_STOCK
    data.energyNextRegenAt = null
  }
  applyRegen(data)
  data.energyCurrent = (data.energyCurrent ?? 0) + n
  if (data.energyCurrent >= SNACK_ENERGY.MAX_STOCK) {
    data.energyNextRegenAt = null
  }
  writeWtfData(data)
}

/**
 * Acheter 1 session supplémentaire avec des coins.
 * Signature fonctionnelle : prend les deps currency en argument (hooks-agnostic).
 * @param {Object} deps - { coins, applyCurrencyDelta }
 */
export function buyExtraSession({ coins, applyCurrencyDelta } = {}) {
  if ((coins ?? 0) < SNACK_ENERGY.EXTRA_SESSION_COST) return false
  applyCurrencyDelta?.({ coins: -SNACK_ENERGY.EXTRA_SESSION_COST }, 'buy_extra_energy')
    ?.catch?.(e => console.warn('[buyExtraSession] applyCurrencyDelta failed:', e?.message || e))
  addSnackEnergy(1)
  return true
}

/**
 * Raccourci : peut-on jouer en Snack/Snack ?
 */
export function canPlaySnack() {
  return getSnackEnergy().remaining > 0
}
