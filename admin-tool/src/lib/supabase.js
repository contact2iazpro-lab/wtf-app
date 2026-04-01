import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[Admin] Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_KEY — check admin-tool/.env.local')
  console.error('[Admin] VITE_SUPABASE_URL =', SUPABASE_URL || '(empty)')
  console.error('[Admin] VITE_SUPABASE_SERVICE_KEY =', SUPABASE_SERVICE_KEY ? '(set)' : '(empty)')
}

// Fallback to prevent crash — will fail on actual requests but app loads
const FALLBACK_URL = 'https://placeholder.supabase.co'
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'

// service_role key bypasses all RLS — full read/write access
export const supabase = createClient(
  SUPABASE_URL || FALLBACK_URL,
  SUPABASE_SERVICE_KEY || FALLBACK_KEY,
  { auth: { persistSession: false } },
)
