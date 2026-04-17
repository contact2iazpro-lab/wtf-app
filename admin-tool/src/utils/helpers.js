/**
 * Shared helpers for admin-tool pages.
 * Centralizes common utilities to avoid duplication across pages.
 */

// ── Date formatter ───────────────────────────────────────────────────────────
export function fmtDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  })
}

export function fmtDateTime(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Edge Function caller ─────────────────────────────────────────────────────
export async function callEdgeFunction(functionName, body = {}) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD
  if (!supabaseUrl || !adminPassword) {
    throw new Error('VITE_SUPABASE_URL ou VITE_ADMIN_PASSWORD manquant dans .env.local')
  }

  const resp = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminPassword}`,
    },
    body: JSON.stringify(body),
  })

  const data = await resp.json()
  if (!resp.ok) {
    throw new Error(data.error || `Erreur ${functionName} (${resp.status})`)
  }
  return data
}
