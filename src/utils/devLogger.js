// ─── WTF! Dev Analytics Logger ───────────────────────────────────────────────
// In-memory log of analytics events. Never sent to any server.
// Only active in dev mode (no-op in production builds).

const MAX_LOGS = 50
let logs = []
let _id = 0

export function logDevEvent(name, data = {}) {
  if (!import.meta.env.DEV) return
  logs = [
    { id: ++_id, name, data, time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) },
    ...logs,
  ].slice(0, MAX_LOGS)
}

export function getDevLogs() {
  return logs
}

export function clearDevLogs() {
  logs = []
}
