#!/usr/bin/env node
/**
 * compress-images.mjs
 * Convertit les PNG de public/assets/facts/ en WebP (qualité 80).
 * Les fichiers PNG originaux sont conservés.
 *
 * Usage : node scripts/compress-images.mjs
 * Prérequis : npm install sharp --save-dev
 */

import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

const FACTS_DIR = join(import.meta.dirname, '..', 'public', 'assets', 'facts')
const QUALITY = 80

async function main() {
  const files = await readdir(FACTS_DIR)
  const pngFiles = files.filter(f => f.endsWith('.png')).sort((a, b) => {
    const idA = parseInt(a) || 0
    const idB = parseInt(b) || 0
    return idA - idB
  })

  console.log(`\n📁 Dossier : ${FACTS_DIR}`)
  console.log(`📦 ${pngFiles.length} fichiers PNG à convertir\n`)

  let totalBefore = 0
  let totalAfter = 0
  let converted = 0
  let errors = 0

  for (const file of pngFiles) {
    const pngPath = join(FACTS_DIR, file)
    const webpPath = join(FACTS_DIR, file.replace('.png', '.webp'))

    try {
      const beforeStat = await stat(pngPath)
      const beforeKB = Math.round(beforeStat.size / 1024)

      await sharp(pngPath)
        .webp({ quality: QUALITY })
        .toFile(webpPath)

      const afterStat = await stat(webpPath)
      const afterKB = Math.round(afterStat.size / 1024)
      const gain = Math.round((1 - afterStat.size / beforeStat.size) * 100)

      totalBefore += beforeStat.size
      totalAfter += afterStat.size
      converted++

      console.log(`${file} → ${file.replace('.png', '.webp')} — ${beforeKB}KB → ${afterKB}KB (${gain}%)`)
    } catch (err) {
      errors++
      console.error(`❌ ${file} — erreur : ${err.message}`)
    }
  }

  const totalGainMB = ((totalBefore - totalAfter) / 1024 / 1024).toFixed(1)
  const totalGainPct = totalBefore > 0 ? Math.round((1 - totalAfter / totalBefore) * 100) : 0

  console.log('\n' + '═'.repeat(60))
  console.log(`✅ ${converted} images converties, ${errors} erreurs`)
  console.log(`📊 Avant : ${(totalBefore / 1024 / 1024).toFixed(1)} MB`)
  console.log(`📊 Après : ${(totalAfter / 1024 / 1024).toFixed(1)} MB`)
  console.log(`💾 Gain  : ${totalGainMB} MB (${totalGainPct}%)`)
  console.log('═'.repeat(60) + '\n')
}

main().catch(err => {
  console.error('Erreur fatale :', err)
  process.exit(1)
})
