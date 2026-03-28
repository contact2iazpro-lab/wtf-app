// ─── WTF! Dev Panel — Device Whitelist ───────────────────────────────────────
//
// Add your device ID here after retrieving it via the HomeScreen dev button.
// The ID is generated once per browser and stored in localStorage.
//
// Format: 'web-<16 hex chars>'
// Retrieve via: HomeScreen → bouton "Afficher mon Device ID" (visible en __DEV__)

export const DEV_WHITELIST_DEVICES = [
  'DEVICE_ID_À_REMPLACER', // Mon iPhone de test / navigateur principal
]

// ─── Device ID (persistent per browser) ──────────────────────────────────────

export function getDeviceId() {
  try {
    let id = localStorage.getItem('wtf_device_id')
    if (!id) {
      const arr = new Uint8Array(8)
      crypto.getRandomValues(arr)
      id = 'web-' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
      localStorage.setItem('wtf_device_id', id)
    }
    return id
  } catch {
    return 'unknown'
  }
}

export function isDevDevice() {
  return DEV_WHITELIST_DEVICES.includes(getDeviceId())
}

// ─── Master gate — double protection ─────────────────────────────────────────
// Requires BOTH conditions:
//   1. Running in Vite dev mode (import.meta.env.DEV === true)
//   2. Current device is whitelisted
// In production builds, import.meta.env.DEV is always false → always blocked.

export const DEV_PANEL_ENABLED = import.meta.env.DEV && isDevDevice()
