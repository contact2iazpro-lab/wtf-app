/**
 * Script one-shot — retire tous les emojis du champ explanation de tous les facts.
 * Usage : cd admin-tool && node scripts/strip-emojis-explanation.mjs
 * Lit SUPABASE_URL + SUPABASE_SECRET_KEY depuis .env.local.
 */

import fs from 'node:fs'
import path from 'node:path'

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local introuvable dans', process.cwd())
    process.exit(1)
  }
  const env = {}
  const content = fs.readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].trim()
  }
  return env
}

function stripEmojis(text) {
  if (!text || typeof text !== 'string') return text
  return text
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[\uFE00-\uFE0F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function main() {
  const env = loadEnvLocal()
  const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const SUPABASE_KEY = env.SUPABASE_SECRET_KEY || env.VITE_SUPABASE_SERVICE_KEY
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ SUPABASE_URL ou SUPABASE_SECRET_KEY manquant')
    process.exit(1)
  }

  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  }

  console.log('⏳ Fetch facts avec explanation non vide...')
  const all = []
  let from = 0
  const PAGE = 1000
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/facts?select=id,explanation&explanation=not.is.null&explanation=neq.&order=id.asc&limit=${PAGE}&offset=${from}`
    const resp = await fetch(url, { headers })
    if (!resp.ok) {
      console.error('❌ Erreur fetch', resp.status, await resp.text())
      process.exit(1)
    }
    const data = await resp.json()
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }

  console.log(`📊 ${all.length} facts avec explanation`)

  const toProcess = all
    .map(f => ({ id: f.id, before: f.explanation, after: stripEmojis(f.explanation) }))
    .filter(f => f.before !== f.after)

  console.log(`🎯 ${toProcess.length} facts contiennent des emojis à retirer`)
  if (toProcess.length === 0) {
    console.log('✅ Rien à faire.')
    return
  }

  let ok = 0, ko = 0
  for (let i = 0; i < toProcess.length; i++) {
    const f = toProcess[i]
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/facts?id=eq.${f.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ explanation: f.after, updated_at: new Date().toISOString() }),
    })
    if (resp.ok) {
      ok++
      if (i % 20 === 0 || i === toProcess.length - 1) {
        process.stdout.write(`\r🧹 ${i + 1}/${toProcess.length} — OK ${ok}, KO ${ko}`)
      }
    } else {
      ko++
      console.error(`\n❌ #${f.id} :`, resp.status, await resp.text())
    }
  }
  console.log(`\n✅ Terminé : ${ok} nettoyés, ${ko} erreurs sur ${toProcess.length}`)
}

main().catch(err => {
  console.error('❌', err)
  process.exit(1)
})
