// Supabase Edge Function — POST /functions/v1/sync-facts
// v1.0.0
//
// 1. Fetches all published facts from Supabase
// 2. Reads current src/data/facts.js from GitHub (to get SHA + preserve header/footer)
// 3. Replaces the FACTS array + updates VIP_FACT_IDS from is_vip column
// 4. Pushes the regenerated file back to GitHub → triggers redeploy
//
// Required env vars (set in Supabase dashboard → Edge Functions → Secrets):
//   SUPABASE_URL          — auto-injected by Supabase
//   SUPABASE_SERVICE_ROLE_KEY — auto-injected by Supabase
//   GITHUB_TOKEN          — Personal Access Token with "repo" scope
//   ADMIN_PASSWORD        — shared admin password

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ── Auth ──────────────────────────────────────────────────────────────
  const adminPassword = Deno.env.get('ADMIN_PASSWORD')
  if (!adminPassword || req.headers.get('authorization') !== `Bearer ${adminPassword}`) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN')

  const missing = [
    !SUPABASE_URL && 'SUPABASE_URL',
    !SUPABASE_KEY && 'SUPABASE_SERVICE_ROLE_KEY',
    !GITHUB_TOKEN && 'GITHUB_TOKEN',
  ].filter(Boolean)

  if (missing.length) {
    return new Response(JSON.stringify({ error: `Variables manquantes : ${missing.join(', ')}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // ── Step 1: Fetch all published facts from Supabase (paginated) ──────
    const allFacts: any[] = []
    let page = 0
    const LIMIT = 1000

    while (true) {
      const from = page * LIMIT
      const to = from + LIMIT - 1

      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/facts?select=*&is_published=eq.true&order=id.asc`,
        {
          headers: {
            apikey: SUPABASE_KEY!,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            Range: `${from}-${to}`,
            'Range-Unit': 'items',
          },
        }
      )

      if (resp.status === 416) break
      if (!resp.ok) throw new Error(`Supabase ${resp.status}: ${await resp.text()}`)

      const batch = await resp.json()
      allFacts.push(...batch)
      if (batch.length < LIMIT) break
      page++
    }

    // ── Step 2: Get current facts.js from GitHub ─────────────────────────
    const OWNER = 'contact2iazpro-lab'
    const REPO = 'wtf-app'
    const FILE_PATH = 'src/data/facts.js'
    const GH_HEADERS = {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    }

    const getResp = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`,
      { headers: GH_HEADERS }
    )
    if (!getResp.ok) {
      throw new Error(`GitHub GET ${getResp.status}: ${await getResp.text()}`)
    }

    const fileData = await getResp.json()
    const currentSha = fileData.sha
    const decoded = atob(fileData.content.replace(/\n/g, ''))

    // ── Step 3: Splice in new FACTS array ────────────────────────────────
    const FACTS_START_MARKER = '\nexport const FACTS = ['
    const FACTS_END_MARKER = 'export const getCategoryById'

    const startIdx = decoded.indexOf(FACTS_START_MARKER)
    const endIdx = decoded.indexOf(FACTS_END_MARKER)

    if (startIdx === -1 || endIdx === -1) {
      throw new Error('Marqueurs FACTS introuvables dans facts.js')
    }

    const header = decoded.slice(0, startIdx)
    let footer = decoded.slice(endIdx)

    // Update VIP_FACT_IDS from is_vip column
    const vipIds = allFacts
      .filter((f: any) => f.is_vip)
      .map((f: any) => f.id)
      .sort((a: number, b: number) => a - b)

    if (vipIds.length > 0) {
      const rows = chunkArray(vipIds, 20)
        .map((row: number[]) => `  ${row.join(', ')}`)
        .join(',\n')
      footer = footer.replace(
        /export const VIP_FACT_IDS = new Set\(\[[\s\S]*?\]\)/,
        `export const VIP_FACT_IDS = new Set([\n${rows},\n])`
      )
    }

    const factsSection = allFacts.map(factToJs).join('\n')
    const newContent =
      header +
      '\nexport const FACTS = [\n' +
      factsSection +
      '\n]\n\n' +
      footer

    // ── Step 4: Push to GitHub ────────────────────────────────────────────
    const now = new Date()
    const dateStr = now.toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
    const timeStr = now.toLocaleTimeString('fr-FR', {
      hour: '2-digit', minute: '2-digit',
    })

    const putResp = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`,
      {
        method: 'PUT',
        headers: { ...GH_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `sync: facts.js mis à jour depuis Supabase — ${dateStr} ${timeStr}`,
          content: btoa(unescape(encodeURIComponent(newContent))),
          sha: currentSha,
        }),
      }
    )

    if (!putResp.ok) {
      throw new Error(`GitHub PUT ${putResp.status}: ${await putResp.text()}`)
    }

    const putData = await putResp.json()
    const shortSha = putData.commit.sha.slice(0, 7)

    return new Response(JSON.stringify({ ok: true, count: allFacts.length, commit: shortSha }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[sync-facts]', err)
    return new Response(JSON.stringify({ error: (err as Error).message || 'Erreur inconnue' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function esc(v: any): string {
  if (v === null || v === undefined) return 'null'
  return JSON.stringify(String(v))
}

function normalizeDifficulty(d: string | null): string | null {
  if (!d) return null
  switch (d.toLowerCase()) {
    case 'facile': case 'easy':   return 'easy'
    case 'normal':                return 'normal'
    case 'expert': case 'hard':   return 'expert'
    default:                      return null
  }
}

function factToJs(f: any): string {
  const options = Array.isArray(f.options)
    ? `[${f.options.map(esc).join(',')}]`
    : 'null'

  const difficulty = normalizeDifficulty(f.difficulty)

  return `  {
    id: ${f.id},
    category: ${esc(f.category)},
    question: ${esc(f.question)},
    hint1: ${esc(f.hint1)},
    hint2: ${esc(f.hint2)},
    shortAnswer: ${esc(f.short_answer)},
    explanation: ${esc(f.explanation)},
    sourceUrl: ${esc(f.source_url)},
    options: ${options},
    correctIndex: ${f.correct_index ?? 0},
    imageUrl: ${esc(f.image_url)},
    difficulty: ${difficulty ? `'${difficulty}'` : 'null'},
  },`
}

function chunkArray(arr: any[], size: number): any[][] {
  const result: any[][] = []
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size))
  return result
}
