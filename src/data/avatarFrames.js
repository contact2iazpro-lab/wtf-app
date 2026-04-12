// ─── Cadres de profil achetables ────────────────────────────────────────────
// Stockage: wtf_data.ownedFrames = ['default', ...], wtf_data.equippedFrame = 'default'
// Prix cohérents avec Notion F2P (Tier 1 — cosmétiques, 30-80 coins)

export const AVATAR_FRAMES = [
  {
    id: 'default',
    label: 'Classique',
    cost: 0,
    border: '3px solid white',
    glow: '0 2px 12px rgba(0,0,0,0.15)',
  },
  {
    id: 'bronze',
    label: 'Bronze',
    cost: 30,
    border: '3px solid #CD7F32',
    glow: '0 0 14px rgba(205,127,50,0.6)',
  },
  {
    id: 'argent',
    label: 'Argent',
    cost: 50,
    border: '3px solid #C0C0C0',
    glow: '0 0 16px rgba(192,192,192,0.7)',
  },
  {
    id: 'or',
    label: 'Or',
    cost: 80,
    border: '3px solid #FFD700',
    glow: '0 0 18px rgba(255,215,0,0.75)',
  },
  {
    id: 'neon',
    label: 'Néon',
    cost: 60,
    border: '3px solid #FF6B1A',
    glow: '0 0 22px rgba(255,107,26,0.8), 0 0 40px rgba(255,107,26,0.4)',
  },
]

export function getFrameById(id) {
  return AVATAR_FRAMES.find(f => f.id === id) || AVATAR_FRAMES[0]
}

export function readFrameState() {
  try {
    const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    return {
      owned: Array.isArray(wd.ownedFrames) && wd.ownedFrames.length > 0 ? wd.ownedFrames : ['default'],
      equipped: wd.equippedFrame || 'default',
    }
  } catch {
    return { owned: ['default'], equipped: 'default' }
  }
}

export function setEquippedFrame(id) {
  try {
    const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    wd.equippedFrame = id
    wd.lastModified = Date.now()
    localStorage.setItem('wtf_data', JSON.stringify(wd))
    window.dispatchEvent(new Event('wtf_storage_sync'))
  } catch { /* ignore */ }
}

export function addOwnedFrame(id) {
  try {
    const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    const owned = Array.isArray(wd.ownedFrames) && wd.ownedFrames.length > 0 ? wd.ownedFrames : ['default']
    if (!owned.includes(id)) owned.push(id)
    wd.ownedFrames = owned
    wd.lastModified = Date.now()
    localStorage.setItem('wtf_data', JSON.stringify(wd))
    window.dispatchEvent(new Event('wtf_storage_sync'))
  } catch { /* ignore */ }
}
