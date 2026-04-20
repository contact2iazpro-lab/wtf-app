/**
 * useStreakRewards — Récompenses fidélité quotidiennes + paliers cerveaux.
 *
 * Système à 2 niveaux :
 * - Quotidien : micro-récompense chaque jour (J1=15c, J2=25c, ...)
 * - Paliers majeurs : cerveaux J3/J7/J14/J30 (grosses récompenses)
 *
 * Le joueur a TOUJOURS une récompense à réclamer, pas de gap vide.
 */

import { useState, useEffect } from 'react'
import { readWtfData } from '../utils/storageHelper'
import { STREAK_PALIERS, getDailyStreakReward } from '../constants/gameConfig'

function readState() {
  const wtfData = readWtfData()
  return {
    streak: wtfData.streak || 0,
    claimed: Array.isArray(wtfData.streakPaliersClaimed) ? wtfData.streakPaliersClaimed : [],
    dailyClaimed: Array.isArray(wtfData.streakDailyClaimed) ? wtfData.streakDailyClaimed : [],
  }
}

function applyReward(reward, applyCurrencyDelta) {
  if (!applyCurrencyDelta) return
  const delta = {}
  if (reward.coins) delta.coins = reward.coins
  if (reward.hints) delta.hints = reward.hints
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

  // Claim palier majeur (cerveau)
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
    setState(prev => ({ ...prev, claimed: newClaimed }))

    mergeFlags?.({ streakPaliersClaimed: newClaimed })?.catch?.(e =>
      console.warn('[useStreakRewards] mergeFlags failed:', e?.message || e)
    )

    applyReward(palier, applyCurrencyDelta)
    return { name: palier.name, coins: palier.coins, hints: palier.hints, isMilestone: true }
  }

  // Claim récompense quotidienne (auto ou via popup)
  const claimDaily = () => {
    const day = state.streak
    if (day < 1) return null
    if (state.dailyClaimed.includes(day)) return null
    // Les milestones sont gérés par claim(), pas claimDaily
    const isMilestone = STREAK_PALIERS.some(p => p.day === day)
    if (isMilestone) return null

    const reward = getDailyStreakReward(day)
    if (!reward) return null

    const newDailyClaimed = [...state.dailyClaimed, day]
    const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    wtfData.streakDailyClaimed = newDailyClaimed
    wtfData.lastModified = Date.now()
    localStorage.setItem('wtf_data', JSON.stringify(wtfData))
    setState(prev => ({ ...prev, dailyClaimed: newDailyClaimed }))

    mergeFlags?.({ streakDailyClaimed: newDailyClaimed })?.catch?.(e =>
      console.warn('[useStreakRewards] mergeFlags daily failed:', e?.message || e)
    )

    applyReward(reward, applyCurrencyDelta)
    return { coins: reward.coins, hints: reward.hints || 0, day, isMilestone: false }
  }

  const availablePalier = STREAK_PALIERS.find(p => getStatus(p.day) === 'available') || null

  // Détecte si une récompense quotidienne est disponible (non-milestone, non-claimed)
  const pendingDaily = (() => {
    const day = state.streak
    if (day < 1) return null
    if (state.dailyClaimed.includes(day)) return null
    if (STREAK_PALIERS.some(p => p.day === day)) return null
    return getDailyStreakReward(day)
  })()

  return {
    paliers: STREAK_PALIERS,
    currentStreak: state.streak,
    getStatus,
    claim,
    claimDaily,
    availablePalier,
    pendingDaily,
  }
}
