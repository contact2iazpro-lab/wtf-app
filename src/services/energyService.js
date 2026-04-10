import { FLASH_ENERGY } from '../constants/gameConfig'
import { getBalances, updateCoins } from './currencyService'

const TODAY = () => new Date().toISOString().slice(0, 10)

/**
 * Lire l'énergie Explorer restante
 * Reset automatique à minuit (comparaison de date)
 */
export function getFlashEnergy() {
  try {
    const data = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    const today = TODAY()
    const isToday = data.flashEnergyDate === today
    const used = isToday ? (data.flashEnergyUsed || 0) : 0
    const remaining = Math.max(0, FLASH_ENERGY.FREE_SESSIONS_PER_DAY - used)
    return { used, remaining, date: today }
  } catch {
    return { used: 0, remaining: FLASH_ENERGY.FREE_SESSIONS_PER_DAY, date: TODAY() }
  }
}

/**
 * Consommer 1 session d'énergie gratuite
 * @returns true si consommée, false si plus d'énergie
 */
export function consumeFlashEnergy() {
  const { remaining } = getFlashEnergy()
  if (remaining <= 0) return false

  try {
    const data = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    const today = TODAY()
    if (data.flashEnergyDate !== today) {
      data.flashEnergyUsed = 0
      data.flashEnergyDate = today
    }
    data.flashEnergyUsed = (data.flashEnergyUsed || 0) + 1
    data.lastModified = Date.now()
    localStorage.setItem('wtf_data', JSON.stringify(data))
    window.dispatchEvent(new Event('wtf_energy_updated'))
    return true
  } catch {
    return false
  }
}

/**
 * Acheter 1 session supplémentaire avec des coins
 * @returns true si achat réussi
 */
export function buyExtraSession() {
  const { coins } = getBalances()
  if (coins < FLASH_ENERGY.EXTRA_SESSION_COST) return false
  updateCoins(-FLASH_ENERGY.EXTRA_SESSION_COST)
  window.dispatchEvent(new Event('wtf_energy_updated'))
  return true
}

/**
 * Raccourci : peut-on jouer en Explorer ?
 */
export function canPlayFlash() {
  return getFlashEnergy().remaining > 0
}
