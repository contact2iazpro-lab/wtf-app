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

// ── String truncation ────────────────────────────────────────────────────────
export function truncate(str, n) {
  return str && str.length > n ? str.slice(0, n) + '…' : (str || '')
}

// ── Supabase paginated fetch ─────────────────────────────────────────────────
// Fetches all rows from a Supabase query, paginating in chunks of `pageSize`.
export async function fetchAllPaginated(supabase, table, select, filters = {}, pageSize = 1000) {
  const all = []
  let from = 0
  while (true) {
    let q = supabase.from(table).select(select).range(from, from + pageSize - 1)
    // Apply filters
    for (const [method, args] of Object.entries(filters)) {
      if (method === 'eq') for (const [col, val] of Object.entries(args)) q = q.eq(col, val)
      if (method === 'not') for (const [col, val] of Object.entries(args)) q = q.not(col, 'is', val)
      if (method === 'neq') for (const [col, val] of Object.entries(args)) q = q.neq(col, val)
      if (method === 'or') q = q.or(args)
    }
    const { data, error } = await q
    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return all
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
