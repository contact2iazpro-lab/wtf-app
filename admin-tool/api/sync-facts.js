// Vercel Serverless Function — POST /api/sync-facts
//
// 1. Fetches all published facts from Supabase
// 2. Reads current src/data/facts.js from GitHub (to get SHA + preserve header/footer)
// 3. Replaces the FACTS array + updates VIP_FACT_IDS from is_vip column
// 4. Pushes the regenerated file back to GitHub → triggers Vercel redeploy
//
// Required env vars (server-side, set in Vercel dashboard):
//   SUPABASE_URL          — same value as VITE_SUPABASE_URL
//   SUPABASE_SERVICE_KEY  — same value as VITE_SUPABASE_SERVICE_KEY
//   GITHUB_TOKEN          — Personal Access Token with "repo" scope
//   ADMIN_PASSWORD        — same value as VITE_ADMIN_PASSWORD

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // ── Auth ────────────────────────────────────────────────────────────────
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword || req.headers.authorization !== `Bearer ${adminPassword}`) {
    return res.status(401).json({ error: 'Non autorisé — vérifiez ADMIN_PASSWORD dans Vercel' })
  }

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN

  const missing = [
    !SUPABASE_URL && 'SUPABASE_URL',
    !SUPABASE_KEY && 'SUPABASE_SERVICE_KEY',
    !GITHUB_TOKEN && 'GITHUB_TOKEN',
  ].filter(Boolean)

  if (missing.length) {
    return res.status(500).json({
      error: `Variables Vercel manquantes : ${missing.join(', ')}`,
    })
  }

  try {
    // ── Step 1: Fetch all published facts from Supabase (paginated) ──────
    const allFacts = []
    let page = 0
    const LIMIT = 1000

    while (true) {
      const from = page * LIMIT
      const to = from + LIMIT - 1

      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/facts?select=*&is_published=eq.true&order=id.asc`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            Range: `${from}-${to}`,
            'Range-Unit': 'items',
          },
        }
      )

      if (resp.status === 416) break // Range Not Satisfiable — no more rows
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
    // GitHub returns content as base64, possibly with newlines — strip them
    const decoded = Buffer.from(fileData.content.replace(/\n/g, ''), 'base64').toString('utf8')

    // ── Step 3: Splice in new FACTS array ────────────────────────────────
    // Boundaries: '\nexport const FACTS = [' ... 'export const getCategoryById'
    const FACTS_START_MARKER = '\nexport const FACTS = ['
    const FACTS_END_MARKER = 'export const getCategoryById'

    const startIdx = decoded.indexOf(FACTS_START_MARKER)
    const endIdx = decoded.indexOf(FACTS_END_MARKER)

    if (startIdx === -1 || endIdx === -1) {
      throw new Error(
        'Marqueurs FACTS introuvables dans facts.js — le fichier a peut-être été restructuré manuellement'
      )
    }

    const header = decoded.slice(0, startIdx)          // everything before '\nexport const FACTS = ['
    let footer = decoded.slice(endIdx)                  // 'export const getCategoryById' to EOF

    // Update VIP_FACT_IDS from is_vip column
    const vipIds = allFacts
      .filter(f => f.is_vip)
      .map(f => f.id)
      .sort((a, b) => a - b)

    if (vipIds.length > 0) {
      const rows = chunkArray(vipIds, 20)
        .map(row => `  ${row.join(', ')}`)
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
          content: Buffer.from(newContent).toString('base64'),
          sha: currentSha,
        }),
      }
    )

    if (!putResp.ok) {
      throw new Error(`GitHub PUT ${putResp.status}: ${await putResp.text()}`)
    }

    const putData = await putResp.json()
    const shortSha = putData.commit.sha.slice(0, 7)

    return res.status(200).json({
      ok: true,
      count: allFacts.length,
      commit: shortSha,
    })
  } catch (err) {
    console.error('[sync-facts]', err)
    return res.status(500).json({ error: err.message || 'Erreur inconnue' })
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Serialize a value as a JS literal: string → "...", null/undefined → null */
function esc(v) {
  if (v === null || v === undefined) return 'null'
  return JSON.stringify(String(v))
}

/** Normalize French/mixed difficulty values → English lowercase for facts.js */
function normalizeDifficulty(d) {
  if (!d) return null
  switch (d.toLowerCase()) {
    case 'facile': case 'easy':   return 'easy'
    case 'normal':                return 'normal'
    case 'expert': case 'hard':   return 'expert'
    default:                      return null
  }
}

/** Serialize one Supabase fact row into the facts.js object literal format */
function factToJs(f) {
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

/** Split array into chunks of `size` */
function chunkArray(arr, size) {
  const result = []
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size))
  return result
}
