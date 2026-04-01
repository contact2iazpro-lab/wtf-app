// crop-icons.mjs — découpe planche-categories.png.png en icônes individuelles
// Layout : 5 colonnes × 4 lignes, 1024×1024px

import sharp from 'sharp'
import { existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const SRC   = resolve(ROOT, 'public/assets/planche-categories.png.png')
const DEST  = resolve(ROOT, 'public/assets/categories')

const COLS = 5
const ROWS = 4
const W    = 1024
const H    = 1024
const cellW = W / COLS  // 204.8
const cellH = H / ROWS  // 256

// null = skip (doublon ou catégorie future)
const GRID = [
  ['animaux',        'art',         'corps-humain', 'definition',     'gastronomie'],
  [null,             'geographie',  'histoire',     'kids',           'phobies'    ],
  [null,             'records',     'sante',        'sciences',       'sport'      ],
  [null,             'technologie', 'lois-et-regles', null,           null         ],
]

if (!existsSync(DEST)) mkdirSync(DEST, { recursive: true })

let saved = 0
let skipped = 0

for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
    const name = GRID[row][col]

    if (!name) {
      skipped++
      continue
    }

    const left   = Math.round(col * cellW)
    const top    = Math.round(row * cellH)
    const width  = Math.round((col + 1) * cellW) - left
    const height = Math.round((row + 1) * cellH) - top

    const outPath = resolve(DEST, `${name}.png`)

    await sharp(SRC)
      .extract({ left, top, width, height })
      .toFile(outPath)

    console.log(`✅ [${row},${col}] ${name}.png  (${left},${top} ${width}×${height})`)
    saved++
  }
}

console.log(`\nTerminé : ${saved} fichiers sauvegardés, ${skipped} cellules ignorées.`)
