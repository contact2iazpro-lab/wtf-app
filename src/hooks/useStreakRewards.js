/**
 * useStreakRewards — Paliers de récompenses fidélité (décision 16/04/2026 Option B).
 *
 * Fusion streak + coffres : un seul rail de récompenses basé sur `wtf_data.streak`.
 * Paliers : Débutant J3 · Habitué J7 · Fidèle J14 · Légende J30.
 */

import { useState, useEffect } from 'react'
import { readWtfData } from '../utils/storageHelper'
import { STREAK_PALIERS } from '../constants/gameConfig'

function readState() {
  const wtfData = readWtfData()
  return {
    streak: wtfData.streak || 0,
    claimed: Array.isArray(wtfData.streakPaliersClaimed) ? wtfData.streakPaliersClaimed : [],
  }
}

function applyReward(palier, applyCurrencyDelta) {
  if (!applyCurrencyDelta) return
  const delta = {}
  if (palier.coins) delta.coins = palier.coins
  if (palier.hints) delta.hints = palier.hints
  if (Object.keys(delta).length === 0) return
  try {
    applyCurrencyDelta(delta, 'streak_reward_claim')?.catch?.(e =>
      console.warn('[useStreakRewards] RPC failed:', e?.message || e)
    )
  } catch { /* ignore */ }
}

export function useStreakRewards(applyCurrencyDelta, mergeFlags) {
  const [state, setState] = useState(readState)

  useEffect(() => {
    const refresh = () => setState(readState())
    window.addEventListener('wtf_storage_sync', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.removeEventListener('wtf_storage_sync', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  const getStatus = (day) => {
    if (state.claimed.includes(day)) return 'claimed'
    if (state.streak >= day) return 'available'
    return 'locked'
  }

  const claim = (day) => {
    const palier = STREAK_PALIERS.find(p => p.day === day)
    if (!palier) return null
    if (state.claimed.includes(day)) return null
    if (state.streak < day) return null

    const newClaimed = [...state.claimed, day]
    const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    wtfData.streakPaliersClaimed = newClaimed
    wtfData.lastModified = Date.now()
    localStorage.setItem('wtf_data', JSON.stringify(wtfData))
    setState({ streak: state.streak, claimed: newClaimed })

    mergeFlags?.({ streakPaliersClaimed: newClaimed })?.catch?.(e =>
      console.warn('[useStreakRewards] mergeFlags failed:', e?.message || e)
    )

    applyReward(palier, applyCurrencyDelta)
    return { name: palier.name, coins: palier.coins, hints: palier.hints }
  }

  const availablePalier = STREAK_PALIERS.find(p => getStatus(p.day) === 'available') || null

  return {
    paliers: STREAK_PALIERS,
    currentStreak: state.streak,
    getStatus,
    claim,
    availablePalier,
  }
}
