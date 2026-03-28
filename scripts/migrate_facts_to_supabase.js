/**
 * Migration one-shot : insère tous les facts de src/data/facts.js dans Supabase.
 *
 * Idempotent — utilise upsert sur l'id, peut être relancé sans créer de doublons.
 *
 * Prérequis :
 *   - SUPABASE_URL          (ex: https://xxxx.supabase.co)
 *   - SUPABASE_SERVICE_ROLE_KEY  (clé service_role, PAS la clé anon)
 *
 * Usage :
 *   node --env-file=.env.local scripts/migrate_facts_to_supabase.js
 *
 *   Ou en exportant les vars manuellement :
 *   SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate_facts_to_supabase.js
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { FACTS, VIP_FACT_IDS } from '../src/data/facts.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Charge .env.local si les vars ne sont pas déjà définies ──────────────
function loadEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    for (const line of content.split('\n')) {
      const match = line.match(/^\s*([^#=][^=]*?)\s*=\s*(.*?)\s*$/)
      if (!match) continue
      const key = match[1].trim()
      const val = match[2].replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  } catch { /* pas de fichier .env, on continue */ }
}

loadEnvFile(path.join(__dirname, '../.env.local'))
loadEnvFile(path.join(__dirname, '../.env'))

// ─── Validation des vars d'environnement ──────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Variables manquantes.')
  console.error('   SUPABASE_URL           :', SUPABASE_URL ? '✓' : '✗ MANQUANTE')
  console.error('   SUPABASE_SERVICE_ROLE_KEY :', SERVICE_KEY  ? '✓' : '✗ MANQUANTE')
  console.error('\n   Ajoutez-les dans .env.local ou exportez-les avant de lancer le script.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// ─── Transform fact JS → ligne Supabase ───────────────────────────────────
function toRow(fact) {
  return {
    id:            fact.id,
    category:      fact.category,
    question:      fact.question       || null,
    hint1:         fact.hint1          || null,
    hint2:         fact.hint2          || null,
    answer:        fact.shortAnswer    || null,   // colonne legacy
    short_answer:  fact.shortAnswer    || null,
    explanation:   fact.explanation    || null,
    source_url:    fact.sourceUrl      || null,
    options:       Array.isArray(fact.options) ? fact.options : [],
    correct_index: typeof fact.correctIndex === 'number' ? fact.correctIndex : null,
    image_url:     fact.imageUrl       || null,
    is_vip:        VIP_FACT_IDS.has(fact.id),
    is_exceptional: VIP_FACT_IDS.has(fact.id),   // alias legacy
    is_published:  true,
    pack_id:       'free',
    updated_at:    new Date().toISOString(),
  }
}

// ─── Migration ─────────────────────────────────────────────────────────────
const BATCH_SIZE = 50

async function migrate() {
  const facts = FACTS.filter(f => f && f.id && f.category && f.question)
  const total  = facts.length
  const batches = Math.ceil(total / BATCH_SIZE)

  console.log(`\n🚀  Migration WTF! Facts → Supabase`)
  console.log(`   URL      : ${SUPABASE_URL}`)
  console.log(`   Facts    : ${total}`)
  console.log(`   Batches  : ${batches} × ${BATCH_SIZE}\n`)

  let inserted = 0
  const errors = []

  for (let i = 0; i < batches; i++) {
    const batch = facts.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    const rows  = batch.map(toRow)

    const { error } = await supabase
      .from('facts')
      .upsert(rows, { onConflict: 'id' })

    if (error) {
      console.error(`❌  Batch ${i + 1}/${batches} FAILED : ${error.message}`)
      errors.push({ batch: i + 1, message: error.message })
    } else {
      inserted += batch.length
      const pct = Math.round((inserted / total) * 100)
      console.log(`   ✓ Batch ${i + 1}/${batches} inséré (${batch.length} facts) — total : ${inserted}/${total} (${pct}%)`)
    }
  }

  console.log('\n─────────────────────────────────────────')
  if (errors.length === 0) {
    console.log(`✅  Migration réussie : ${inserted}/${total} facts insérés dans Supabase.`)
  } else {
    console.log(`⚠️   Migration terminée avec ${errors.length} erreur(s).`)
    console.log(`   Succès : ${inserted} facts`)
    console.log(`   Erreurs :`)
    errors.forEach(e => console.log(`     Batch ${e.batch} : ${e.message}`))
    process.exit(1)
  }

  // ─── Vérification post-migration ────────────────────────────────────────
  const { count, error: countErr } = await supabase
    .from('facts')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true)

  if (!countErr) {
    console.log(`\n   Vérification : ${count} facts publiés dans Supabase.`)
  }
}

migrate().catch(err => {
  console.error('❌  Erreur fatale :', err.message)
  process.exit(1)
})
