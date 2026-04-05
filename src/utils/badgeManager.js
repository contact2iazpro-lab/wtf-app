const BADGES = [
  { id: 'premier_fact', label: 'Premier F*ct', emoji: '🎯', condition: (data) => (data.unlockedFacts?.length || 0) >= 1 },
  { id: 'curieux', label: 'Curieux', emoji: '🧠', condition: (data) => (data.unlockedFacts?.length || 0) >= 10 },
  { id: 'passionne', label: 'Passionné', emoji: '🔥', condition: (data) => (data.unlockedFacts?.length || 0) >= 50 },
  { id: 'collectionneur', label: 'Collectionneur', emoji: '💎', condition: (data) => (data.unlockedFacts?.length || 0) >= 100 },
  { id: 'legende', label: 'Légende', emoji: '✨', condition: (data) => (data.unlockedFacts?.length || 0) >= 200 },
  { id: 'serie_7', label: 'Série de 7', emoji: '⚡', condition: (data) => (data.bestStreak || 0) >= 7 },
  { id: 'serie_30', label: 'Série de 30', emoji: '🌟', condition: (data) => (data.bestStreak || 0) >= 30 },
  { id: 'serie_100', label: 'Série de 100', emoji: '🏅', condition: (data) => (data.bestStreak || 0) >= 100 },
  { id: 'perfect', label: 'Perfect', emoji: '👑', condition: (data) => (data.totalPerfects || 0) >= 1 },
  { id: 'blitz_master', label: 'Blitz Master', emoji: '⏱️', condition: (data) => (data.statsByMode?.blitz?.bestStreak || 0) >= 30 },
  { id: 'expert_wtf', label: 'Expert WTF!', emoji: '🏆', condition: (data) => (data.statsByMode?.parcours?.gamesPlayed || 0) >= 50 },
  { id: 'veteran', label: 'Vétéran', emoji: '🎖️', condition: (data) => (data.gamesPlayed || 0) >= 100 },
]

export function checkBadges() {
  const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')
  const earned = [...(wtfData.badgesEarned || [])]
  const newBadges = []

  for (const badge of BADGES) {
    if (!earned.includes(badge.id) && badge.condition(wtfData)) {
      newBadges.push(badge)
      earned.push(badge.id)
    }
  }

  if (newBadges.length > 0) {
    wtfData.badgesEarned = earned
    wtfData.lastModified = Date.now()
    localStorage.setItem('wtf_data', JSON.stringify(wtfData))
  }

  return newBadges
}

export function getNextBadge() {
  const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')
  const earned = wtfData.badgesEarned || []

  const next = BADGES.find(b => !earned.includes(b.id))
  if (!next) return null

  return getProgressForBadge(next, wtfData)
}

function getProgressForBadge(badge, data) {
  let current = 0, target = 0
  if (badge.id === 'premier_fact') { current = data.unlockedFacts?.length || 0; target = 1 }
  else if (badge.id === 'curieux') { current = data.unlockedFacts?.length || 0; target = 10 }
  else if (badge.id === 'passionne') { current = data.unlockedFacts?.length || 0; target = 50 }
  else if (badge.id === 'collectionneur') { current = data.unlockedFacts?.length || 0; target = 100 }
  else if (badge.id === 'legende') { current = data.unlockedFacts?.length || 0; target = 200 }
  else if (badge.id === 'serie_7') { current = data.bestStreak || 0; target = 7 }
  else if (badge.id === 'serie_30') { current = data.bestStreak || 0; target = 30 }
  else if (badge.id === 'serie_100') { current = data.bestStreak || 0; target = 100 }
  else if (badge.id === 'perfect') { current = data.totalPerfects || 0; target = 1 }
  else if (badge.id === 'blitz_master') { current = data.statsByMode?.blitz?.bestStreak || 0; target = 30 }
  else if (badge.id === 'expert_wtf') { current = data.statsByMode?.parcours?.gamesPlayed || 0; target = 50 }
  else if (badge.id === 'veteran') { current = data.gamesPlayed || 0; target = 100 }

  return {
    badge,
    current: Math.min(current, target),
    target,
    progress: Math.min(100, Math.round((current / target) * 100)),
  }
}

export function getAllBadges() {
  const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')
  const earned = wtfData.badgesEarned || []
  return BADGES.map(b => ({ ...b, earned: earned.includes(b.id) }))
}

export { BADGES }
