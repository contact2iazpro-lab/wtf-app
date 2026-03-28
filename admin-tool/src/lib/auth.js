const SESSION_KEY = 'wtf_admin_session'
const SESSION_DURATION = 8 * 60 * 60 * 1000 // 8h in ms

export function login(password) {
  const expected = import.meta.env.VITE_ADMIN_PASSWORD
  if (!expected || password !== expected) return false
  const session = {
    token: crypto.randomUUID(),
    expires: Date.now() + SESSION_DURATION,
  }
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    return true
  } catch {
    return false
  }
}

export function isAuthenticated() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return false
    const session = JSON.parse(raw)
    return Boolean(session?.token && session?.expires > Date.now())
  } catch {
    return false
  }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
}
