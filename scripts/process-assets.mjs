// process-assets.mjs — traitement des images de fond
// - Recadre au format 390×844px (crop centré)
// - Supprime une zone 40×40px en bas à droite (remplacée par la couleur dominante du bord)
// - Sauvegarde sur place dans public/assets/backgrounds/

import sharp from 'sharp'
import { readdirSync, existsSync } from 'fs'
import { resolve, dirname, extname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = resolve(__dirname, '..')
const DIR       = resolve(ROOT, 'public/assets/backgrounds')

const TARGET_W = 390
const TARGET_H = 844
const PATCH_W  = 40
const PATCH_H  = 40

if (!existsSync(DIR)) {
  console.error(`Dossier introuvable : ${DIR}`)
  process.exit(1)
}

const EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp'])
const files = readdirSync(DIR).filter(f => EXTS.has(extname(f).toLowerCase()))

if (files.length === 0) {
  console.log('Aucun fichier image trouvé dans', DIR)
  process.exit(0)
}

// Calcule la couleur dominante d'une bande de bordure (bas, hors zone patch)
async function getDominantEdgeColor(img, width, height) {
  // Échantillonne une bande de 4px le long du bord bas, en excluant les 40 derniers px à droite
  const sampleW = Math.max(1, width - PATCH_W)
  const strip = await img
    .clone()
    .extract({ left: 0, top: height - 4, width: sampleW, height: 4 })
    .resize(1, 1, { fit: 'cover' })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { data } = strip
  return { r: data[0], g: data[1], b: data[2] }
}

let processed = 0
let skipped   = 0

for (const file of files) {
  const filePath = resolve(DIR, file)
  console.log(`\n→ ${file}`)

  try {
    const src  = sharp(filePath)
    const meta = await src.metadata()
    const { width: origW, height: origH } = meta

    // ── Étape 1 : crop centré 390×844 ────────────────────────────────────────
    // Utilise sharp resize + cover pour centrer et recadrer
    const cropped = sharp(filePath).resize(TARGET_W, TARGET_H, {
      fit: 'cover',
      position: 'centre',
    })

    // ── Étape 2 : couleur dominante du bord bas ───────────────────────────────
    const color = await getDominantEdgeColor(
      sharp(filePath).resize(TARGET_W, TARGET_H, { fit: 'cover', position: 'centre' }),
      TARGET_W,
      TARGET_H
    )
    console.log(`   Couleur bord : rgb(${color.r}, ${color.g}, ${color.b})`)

    // ── Étape 3 : patch 40×40 en bas à droite ────────────────────────────────
    // Crée un rectangle uni de la couleur dominante, composite par-dessus
    const patch = await sharp({
      create: {
        width:    PATCH_W,
        height:   PATCH_H,
        channels: 3,
        background: color,
      }
    }).png().toBuffer()

    const patchLeft = TARGET_W - PATCH_W  // 350
    const patchTop  = TARGET_H - PATCH_H  // 804

    const result = await cropped
      .composite([{
        input:      patch,
        left:       patchLeft,
        top:        patchTop,
        blend:      'over',
      }])
      .toBuffer()

    // ── Sauvegarde sur place ──────────────────────────────────────────────────
    await sharp(result).toFile(filePath)
    console.log(`   ✅ Sauvegardé (${TARGET_W}×${TARGET_H}, patch bas-droite appliqué)`)
    processed++

  } catch (err) {
    console.error(`   ❌ Erreur : ${err.message}`)
    skipped++
  }
}

console.log(`\nTerminé : ${processed} image(s) traitée(s), ${skipped} ignorée(s).`)
