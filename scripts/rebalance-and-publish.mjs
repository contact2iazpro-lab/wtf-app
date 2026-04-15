/**
 * WTF! — RÉÉQUILIBRAGE + PUBLICATION
 *
 * ÉTAPE 1 : Migre 180 facts Normal → Expert
 * ÉTAPE 2 : Migre 159 autres facts Normal → Facile
 * ÉTAPE 3 : Vérifie l'équilibre : 330 Facile / 329 Normal / 330 Expert
 * ÉTAPE 4 : Dépublie tout puis publie 5 facts aléatoires par catégorie × difficulté
 *
 * Usage :
 *   node scripts/rebalance-and-publish.mjs
 *
 * Prérequis — créer wtf-app/.env.local avec :
 *   SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_SERVICE_KEY=eyJ...
 *   (récupérer dans Railway dashboard → Variables)
 */

import { createClient } from '@supabase/supabase-js'
import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Chargement .env ──────────────────────────────────────────────────────────
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
  } catch { /* fichier absent, on continue */ }
}

loadEnvFile(path.join(__dirname, '../.env.local'))
loadEnvFile(path.join(__dirname, '../.env'))
loadEnvFile(path.join(__dirname, '../admin-tool/.env.local'))
loadEnvFile(path.join(__dirname, '../admin-tool/.env'))

const SUPABASE_URL  = process.env.SUPABASE_URL  || process.env.VITE_SUPABASE_URL
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_KEY
                   || process.env.VITE_SUPABASE_SERVICE_KEY
                   || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('\n❌  Variables manquantes.')
  console.error('    SUPABASE_URL       :', SUPABASE_URL ? '✓' : '✗ MANQUANTE')
  console.error('    SUPABASE_SERVICE_KEY:', SERVICE_KEY  ? '✓' : '✗ MANQUANTE')
  console.error('\n    Crée le fichier wtf-app/.env.local :')
  console.error('    SUPABASE_URL=https://xxxx.supabase.co')
  console.error('    SUPABASE_SERVICE_KEY=eyJ...\n')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

// ── Helpers ──────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function batchUpdate(ids, updateObj, label, BATCH = 50) {
  for (let i = 0; i < ids.length; i += BATCH) {
    const slice = ids.slice(i, i + BATCH)
    const { error } = await supabase.from('facts').update(updateObj).in('id', slice)
    if (error) {
      console.error(`\n❌ Erreur batch ${label} [i=${i}] :`, error.message)
      process.exit(1)
    }
    process.stdout.write('.')
  }
  console.log()
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n═══════════════════════════════════════════════════')
  console.log('  WTF! — RÉÉQUILIBRAGE + PUBLICATION')
  console.log('═══════════════════════════════════════════════════\n')

  // ── 0. État initial ───────────────────────────────────────────────────────
  console.log('📊 ÉTAT INITIAL')
  const { data: allInit, error: initErr } = await supabase
    .from('facts').select('id, difficulty').is('duplicate_of', null)
  if (initErr) { console.error('❌ Lecture initiale :', initErr.message); process.exit(1) }

  const countByDiff = (data) => data.reduce((acc, f) => {
    acc[f.difficulty] = (acc[f.difficulty] || 0) + 1; return acc
  }, {})
  const init = countByDiff(allInit)

  console.log(`   Facile : ${init['Facile'] || 0}`)
  console.log(`   Normal : ${init['Normal'] || 0}`)
  console.log(`   Expert : ${init['Expert'] || 0}`)
  console.log(`   TOTAL  : ${allInit.length}\n`)

  // ── 1. Sélection des lots Normal → Expert et Normal → Facile ─────────────
  console.log('───────────────────────────────────────────────────')
  console.log('ÉTAPE 1 — Sélection des lots à migrer')
  console.log('───────────────────────────────────────────────────')

  const { data: normalFacts, error: normErr } = await supabase
    .from('facts').select('id').eq('difficulty', 'Normal').is('duplicate_of', null)
  if (normErr) { console.error('❌ Lecture Normal :', normErr.message); process.exit(1) }

  const NEED_EXPERT = 180
  const NEED_FACILE = 159

  if (normalFacts.length < NEED_EXPERT + NEED_FACILE) {
    console.error(`❌ Facts Normal insuffisants : ${normalFacts.length} disponibles, ${NEED_EXPERT + NEED_FACILE} requis`)
    process.exit(1)
  }

  const shuffled   = shuffle(normalFacts)
  const toExpert   = shuffled.slice(0, NEED_EXPERT)
  const toFacile   = shuffled.slice(NEED_EXPERT, NEED_EXPERT + NEED_FACILE)
  const expertIds  = toExpert.map(f => f.id)
  const facileIds  = toFacile.map(f => f.id)

  // Anti-collision garantie par le slice non-chevauchant
  const expertSet = new Set(expertIds)
  const collision = facileIds.filter(id => expertSet.has(id))
  if (collision.length > 0) {
    console.error(`❌ Collision inattendue sur ${collision.length} IDs — ABORT`)
    process.exit(1)
  }

  console.log(`   ✓ Lot Expert : ${expertIds.length} facts sélectionnés (aucun doublon)`)
  console.log(`   ✓ Lot Facile : ${facileIds.length} facts sélectionnés (aucun doublon)\n`)

  // ── 2. Migration → Expert ─────────────────────────────────────────────────
  console.log('───────────────────────────────────────────────────')
  console.log(`ÉTAPE 2 — Migration ${NEED_EXPERT} facts Normal → Expert`)
  console.log('───────────────────────────────────────────────────')
  process.stdout.write('   ')
  await batchUpdate(expertIds, { difficulty: 'Expert' }, 'Expert')
  console.log(`   ✅ ${NEED_EXPERT} facts → Expert`)

  // ── 3. Migration → Facile ─────────────────────────────────────────────────
  console.log('\n───────────────────────────────────────────────────')
  console.log(`ÉTAPE 3 — Migration ${NEED_FACILE} facts Normal → Facile`)
  console.log('───────────────────────────────────────────────────')
  process.stdout.write('   ')
  await batchUpdate(facileIds, { difficulty: 'Facile' }, 'Facile')
  console.log(`   ✅ ${NEED_FACILE} facts → Facile`)

  // ── 4. Vérification équilibre ─────────────────────────────────────────────
  console.log('\n───────────────────────────────────────────────────')
  console.log('ÉTAPE 4 — Vérification équilibre')
  console.log('───────────────────────────────────────────────────')

  const { data: afterMigration } = await supabase
    .from('facts').select('id, difficulty').is('duplicate_of', null)
  const after = countByDiff(afterMigration)

  console.log(`   Facile : ${after['Facile'] || 0}  (cible 330)`)
  console.log(`   Normal : ${after['Normal'] || 0}  (cible 329)`)
  console.log(`   Expert : ${after['Expert'] || 0}  (cible 330)`)

  const ok = (after['Facile'] || 0) === 330
           && (after['Normal'] || 0) === 329
           && (after['Expert'] || 0) === 330
  if (!ok) {
    console.error('\n❌ Équilibre non atteint — vérifiez manuellement dans Supabase')
    process.exit(1)
  }
  console.log('   ✅ Équilibre parfait : 330 / 329 / 330\n')

  // ── 5. Dépublier tous les facts ───────────────────────────────────────────
  console.log('───────────────────────────────────────────────────')
  console.log('ÉTAPE 5 — Dépublication de tous les facts')
  console.log('───────────────────────────────────────────────────')
  const { error: unpubErr } = await supabase
    .from('facts').update({ is_published: false }).gt('id', 0)
  if (unpubErr) { console.error('❌ Dépublication :', unpubErr.message); process.exit(1) }
  console.log('   ✅ Tous les facts dépubliés\n')

  // ── 6. Publication 5 par catégorie × difficulté ───────────────────────────
  console.log('───────────────────────────────────────────────────')
  console.log('ÉTAPE 6 — Publication 5 facts par catégorie × difficulté')
  console.log('───────────────────────────────────────────────────')

  const { data: allFacts, error: allErr } = await supabase
    .from('facts')
    .select('id, category, difficulty')
    .is('duplicate_of', null)
    .order('id')
  if (allErr) { console.error('❌ Lecture facts :', allErr.message); process.exit(1) }

  // Grouper par catégorie + difficulté
  const groups = {}
  for (const f of allFacts) {
    const key = `${f.category}||${f.difficulty}`
    if (!groups[key]) groups[key] = []
    groups[key].push(f.id)
  }

  const toPublish = []
  const report    = []

  for (const [key, ids] of Object.entries(groups)) {
    const [cat, diff] = key.split('||')
    const selected = shuffle(ids).slice(0, 5)
    toPublish.push(...selected)
    report.push({ cat, diff, available: ids.length, published: selected.length })
  }

  // Vérification doublons
  const publishSet = new Set(toPublish)
  if (publishSet.size !== toPublish.length) {
    console.error('❌ Doublons dans la liste de publication — ABORT')
    process.exit(1)
  }

  // Mise à jour is_published = true
  process.stdout.write('   ')
  await batchUpdate(toPublish, { is_published: true }, 'publication')
  console.log(`   ✅ ${toPublish.length} facts publiés (aucun doublon)\n`)

  // ── Rapport final ─────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════')
  console.log('  RAPPORT FINAL')
  console.log('═══════════════════════════════════════════════════\n')

  console.log('📦 MIGRATION :')
  console.log(`   ${NEED_EXPERT} facts Normal → Expert`)
  console.log(`   ${NEED_FACILE} facts Normal → Facile`)
  console.log(`   Résultat : Facile 330 / Normal 329 / Expert 330\n`)

  console.log('📢 PUBLICATION (5 par catégorie × difficulté) :')
  const sorted = [...report].sort((a, b) =>
    a.cat.localeCompare(b.cat) || a.diff.localeCompare(b.diff)
  )
  for (const r of sorted) {
    const warn = r.published < 5 ? ` ⚠️  (seulement ${r.available} facts dispos)` : ''
    console.log(`   ${r.cat.padEnd(15)} ${r.diff.padEnd(8)} → ${r.published}/5${warn}`)
  }

  console.log(`\n✅ TOTAL PUBLIÉ : ${toPublish.length} facts`)
  console.log('\n⚠️  Prochain(s) step(s) manuels :')
  console.log('   1. Admin-tool → bouton "Sync" pour mettre à jour facts.js sur GitHub')
  console.log('   2. Railway redéploie automatiquement après le sync')
  console.log('\n═══════════════════════════════════════════════════\n')
}

main().catch(err => {
  console.error('\n❌ Erreur fatale :', err.message || err)
  process.exit(1)
})
