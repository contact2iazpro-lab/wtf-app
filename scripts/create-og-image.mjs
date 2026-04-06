#!/usr/bin/env node

/**
 * create-og-image.mjs
 *
 * Generates the Open Graph share image (1200×630) for WhatsApp/iMessage/Telegram previews.
 * Usage: node scripts/create-og-image.mjs
 * Requires: npm install sharp (already available locally)
 */

import sharp from 'sharp'
import { resolve } from 'path'

const WIDTH = 1200
const HEIGHT = 630
const LOGO_PATH = resolve('public/assets/ui/wtf-logo.png')
const OUTPUT_PATH = resolve('public/assets/og/wtf-share.png')

async function main() {
  // 1. Create orange background
  const background = sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: { r: 255, g: 107, b: 26, alpha: 1 },
    },
  }).png()

  // 2. Resize logo to 300px wide
  const logo = await sharp(LOGO_PATH)
    .resize(300)
    .toBuffer()

  const logoMeta = await sharp(logo).metadata()
  const logoLeft = Math.round((WIDTH - logoMeta.width) / 2)
  const logoTop = Math.round(HEIGHT * 0.12)

  // 3. Create SVG text overlay
  const textTop = logoTop + logoMeta.height + 30
  const svgText = `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .title { fill: white; font-family: sans-serif; font-weight: 900; font-size: 52px; }
        .sub { fill: white; font-family: sans-serif; font-weight: 600; font-size: 28px; opacity: 0.85; }
      </style>
      <text x="${WIDTH / 2}" y="${textTop}" text-anchor="middle" class="title">Vrai ou Fou ?</text>
      <text x="${WIDTH / 2}" y="${textTop + 50}" text-anchor="middle" class="sub">Des faits 100% vrais, des réactions 100% fun !</text>
    </svg>
  `
  const svgBuffer = Buffer.from(svgText)

  // 4. Composite all layers
  const result = await background
    .composite([
      { input: logo, left: logoLeft, top: logoTop },
      { input: svgBuffer, left: 0, top: 0 },
    ])
    .toBuffer()

  await sharp(result).png().toFile(OUTPUT_PATH)

  const meta = await sharp(OUTPUT_PATH).metadata()
  console.log(`✅ Image OG créée : ${OUTPUT_PATH}`)
  console.log(`   Dimensions : ${meta.width}×${meta.height}`)
  console.log(`   Taille : ${(meta.size / 1024).toFixed(1)} KB`)
}

main().catch(err => {
  console.error('❌ Erreur :', err.message)
  process.exit(1)
})
