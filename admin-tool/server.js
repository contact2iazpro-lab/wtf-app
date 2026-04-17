import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error('❌ SUPABASE_URL et SUPABASE_SECRET_KEY sont requis')
  process.exit(1)
}

// ── Proxy Supabase (injecte secret key côté serveur) ──
app.use('/supabase-proxy', createProxyMiddleware({
  target: SUPABASE_URL,
  changeOrigin: true,
  pathRewrite: { '^/supabase-proxy': '' },
  on: {
    proxyReq: (proxyReq) => {
      proxyReq.setHeader('apikey', SUPABASE_SECRET_KEY)
      proxyReq.setHeader('Authorization', `Bearer ${SUPABASE_SECRET_KEY}`)
      proxyReq.removeHeader('origin')
      proxyReq.removeHeader('referer')
      proxyReq.setHeader('user-agent', 'wtf-admin-tool-prod-proxy/1.0')
    },
    error: (err) => console.error('[supabase-proxy]', err.message),
  },
}))

// ── Proxy Anthropic (injecte API key côt�� serveur) ──
if (ANTHROPIC_API_KEY) {
  app.use('/anthropic-proxy', createProxyMiddleware({
    target: 'https://api.anthropic.com',
    changeOrigin: true,
    pathRewrite: { '^/anthropic-proxy': '' },
    on: {
      proxyReq: (proxyReq) => {
        proxyReq.setHeader('x-api-key', ANTHROPIC_API_KEY)
        proxyReq.setHeader('anthropic-version', '2023-06-01')
        proxyReq.removeHeader('origin')
        proxyReq.removeHeader('referer')
        proxyReq.setHeader('user-agent', 'wtf-admin-tool-prod-proxy/1.0')
      },
      error: (err) => console.error('[anthropic-proxy]', err.message),
    },
  }))
} else {
  console.warn('⚠️ ANTHROPIC_API_KEY manquant — génération affirmations désactivée')
}

// ── Health check ──
app.get('/health', (req, res) => res.json({ status: 'ok', port: PORT }))

// ── Fichiers statiques (build Vite) ──
const DIST = process.env.ADMIN_DIST_PATH || path.join(__dirname, 'dist')
console.log(`📁 Serving static from: ${DIST}`)

import fs from 'fs'
const files = fs.existsSync(DIST) ? fs.readdirSync(DIST) : ['DIST NOT FOUND']
console.log(`📁 Files in DIST:`, files)

app.use(express.static(DIST))

// ── SPA fallback ──
app.use((req, res) => {
  res.sendFile(path.join(DIST, 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ WTF Admin Tool running on port ${PORT}`)
})
