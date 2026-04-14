/**
 * useDailyCoffre — Logique des coffres quotidiens (7 jours/semaine).
 *
 * Extrait de HomeScreen dans le cadre de la refonte 5.1 Option 1 (cleanup).
 * Le hook gère :
 *   - lecture/écriture `coffreClaimedDays` dans localStorage
 *   - reset hebdomadaire (nouveau lundi → liste vide)
 *   - miroir Supabase via `mergeFlags` (A.9.5)
 *   - application de la récompense via `applyCurrencyDelta`
 *   - refresh au retour depuis une autre page (events `wtf_storage_sync`, `focus`)
 */

import { useState, useEffect } from 'react'
import { readWtfData } from '../utils/storageHelper'

// Récompenses par jour (lundi=0 → dimanche=6)
// Dimanche : VIP (coins + bonus ticket). Cf. CLAUDE.md B4.11.
export const COFFRE_REWARDS = [
  { day: 'L', reward: { type: 'coins', amount: 5 } },
  { day: 'M', reward: { type: 'coins', amount: 5 } },
  { day: 'M', reward: { type: 'coins', amount: 5 } },
  { day: 'J', reward: { type: 'hints', amount: 1 } },
  { day: 'V', reward: { type: 'coins', amount: 10 } },
  { day: 'S', reward: { type: 'hints', amount: 1 } },
  { day: 'D', reward: { type: 'coins', amount: 10, bonus: { type: 'tickets', amount: 1 } } },
]

function getWeekStart() {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1))
  return monday.toISOString().slice(0, 10)
}

function applyCofreReward(reward, applyCurrencyDelta) {
  try {
    if (applyCurrencyDelta && ['coins', 'hints', 'tickets'].includes(reward.type)) {
      applyCurrencyDelta({ [reward.type]: reward.amount }, 'daily_coffre_claim')?.catch?.(e =>
        console.warn('[useDailyCoffre] coffre RPC failed:', e?.message || e)
      )
    }
  } catch { /* ignore */ }
}

export function useDailyCoffre(applyCurrencyDelta, mergeFlags) {
  const now = new Date()
  const todayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1 // lundi=0 ... dimanche=6
  const weekStart = getWeekStart()

  const read = () => {
    const wtfData = readWtfData()
    let claimedDays = wtfData.coffreClaimedDays || []
    const storedWeekStart = wtfData.coffreWeekStart || ''
    if (storedWeekStart !== weekStart) claimedDays = []
    return { claimedDays, weekStart }
  }

  const [coffreData, setCoffreData] = useState(read)

  // Refresh au retour depuis une autre page (achat boutique, dev mode, etc.).
  useEffect(() => {
    const refresh = () => setCoffreData(read())
    window.addEventListener('wtf_storage_sync', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.removeEventListener('wtf_storage_sync', refresh)
      window.removeEventListener('focus', refresh)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getStatus = (i) => {
    const { claimedDays } = coffreData
    if (claimedDays.includes(i)) return 'collected'
    if (i === todayIndex) return 'available'
    if (i < todayIndex) return 'missed'
    return 'locked'
  }

  const claim = (index) => {
    if (coffreData.claimedDays.includes(index)) return null
    const newClaimed = [...coffreData.claimedDays, index]
    const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    wtfData.coffreClaimedDays = newClaimed
    wtfData.coffreWeekStart = weekStart
    wtfData.lastModified = Date.now()
    localStorage.setItem('wtf_data', JSON.stringify(wtfData))
    setCoffreData({ claimedDays: newClaimed, weekStart })
    mergeFlags?.({ coffreClaimedDays: newClaimed, coffreWeekStart: weekStart })?.catch?.(e =>
      console.warn('[useDailyCoffre] coffre mergeFlags failed:', e?.message || e)
    )
    const coffreConfig = COFFRE_REWARDS[index]
    applyCofreReward(coffreConfig.reward, applyCurrencyDelta)
    if (coffreConfig.reward.bonus) applyCofreReward(coffreConfig.reward.bonus, applyCurrencyDelta)
    return coffreConfig.reward
  }

  const openCoffre = () => claim(todayIndex)
  const openEarly = (index) => claim(index)

  return { coffres: COFFRE_REWARDS, todayIndex, getStatus, openCoffre, openEarly }
}
