import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Absolute path to the game's src directory (sibling of admin-tool/)
const gameRoot = path.resolve(__dirname, '../src')

export default defineConfig(({ mode }) => {
  // Load ALL env vars (including non-VITE_) — the third arg '' disables the prefix filter.
  // SUPABASE_SECRET_KEY is kept server-side (Node context only) and injected by the proxy below.
  const env = loadEnv(mode, process.cwd(), '')
  const SUPABASE_URL = env.VITE_SUPABASE_URL
  const SUPABASE_SECRET_KEY = env.SUPABASE_SECRET_KEY
  const ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY

  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    console.warn('[admin-tool] VITE_SUPABASE_URL ou SUPABASE_SECRET_KEY manquant dans .env.local — le proxy Supabase ne fonctionnera pas.')
  }
  if (!ANTHROPIC_API_KEY) {
    console.warn('[admin-tool] ANTHROPIC_API_KEY manquant dans .env.local — le bouton "Générer affirmations" ne fonctionnera pas.')
  }

  return {
  base: '/admin/',
  plugins: [
    react(),

    /**
     * game-preview-stubs — Vite plugin
     *
     * When game components (QuestionScreen, RevelationScreen, CircularTimer…)
     * are imported into the admin-tool for live preview, they pull in side-effect
     * modules (AudioContext, SettingsModal → AuthContext → Supabase) that must not
     * run in the admin context and whose packages may not be installed.
     *
     * This plugin intercepts those imports — only when the importing file is inside
     * the game's src directory — and redirects them to lightweight no-op stubs.
     *
     * Stubbed import chains:
     *   audio            → no AudioContext, no sounds
     *   SettingsModal    → null component (no AuthContext cascade)
     *   AuthContext      → no-op hooks (prevents Supabase auth init)
     *   ../lib/supabase  → null client (prevents @supabase/supabase-js load)
     *   @supabase/supabase-js → stub (safety net — package absent in game node_modules)
     */
    {
      name: 'game-preview-stubs',
      resolveId(id, importer) {
        if (!importer) return null

        // Only intercept imports that originate from the game's src files
        const normalizedImporter = importer.replace(/\\/g, '/')
        const normalizedRoot = gameRoot.replace(/\\/g, '/')
        if (!normalizedImporter.startsWith(normalizedRoot)) return null

        // ── 1. audio ─────────────────────────────────────────────────────
        if (/\/utils\/audio/.test(id) || id === '../utils/audio' || id === '../../utils/audio') {
          return path.resolve(__dirname, 'src/stubs/audio.js')
        }

        // ── 2. SettingsModal ──────────────────────────────────────────────
        if (/SettingsModal/.test(id)) {
          return path.resolve(__dirname, 'src/stubs/SettingsModal.jsx')
        }

        // ── 3. AuthContext ────────────────────────────────────────────────
        // SettingsModal.jsx imports useAuth from AuthContext which imports supabase.
        // Stubbing AuthContext cuts the entire auth/supabase cascade.
        if (/AuthContext/.test(id) || /useAuth/.test(id)) {
          return path.resolve(__dirname, 'src/stubs/AuthContext.jsx')
        }

        // ── 4. Game supabase client ───────────────────────────────────────
        // Catches direct imports of ../lib/supabase from any game file
        if (/\/lib\/supabase/.test(id) || id === '../lib/supabase' || id === '../../lib/supabase') {
          return path.resolve(__dirname, 'src/stubs/supabase.js')
        }

        // ── 5. @supabase/supabase-js (safety net) ────────────────────────
        // If src/lib/supabase.js somehow escapes the redirect above and tries
        // to import @supabase/supabase-js — a package absent in the game's
        // root node_modules — intercept it here.
        if (id === '@supabase/supabase-js') {
          return path.resolve(__dirname, 'src/stubs/supabase.js')
        }

        return null
      },
    },
  ],

  resolve: {
    alias: {
      // @game/screens/QuestionScreen → ../src/screens/QuestionScreen.jsx etc.
      '@game': gameRoot,
    },
  },

  server: {
    port: 5174,
    host: true, // écoute sur toutes les interfaces (utile si un jour tu veux accéder depuis un autre device sur le LAN)
    proxy: {
      // ── Proxy Supabase local ──────────────────────────────────────────
      // Le client supabase-js pointe vers /supabase-proxy (URL locale).
      // Ce middleware Node réécrit chaque requête vers le vrai Supabase
      // et injecte la secret key server-side. Résultat : la secret key
      // n'est JAMAIS envoyée au navigateur.
      '/supabase-proxy': {
        target: SUPABASE_URL,
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/supabase-proxy/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Remplace toute clé fantôme envoyée par le client par la vraie secret key
            proxyReq.setHeader('apikey', SUPABASE_SECRET_KEY)
            proxyReq.setHeader('Authorization', `Bearer ${SUPABASE_SECRET_KEY}`)
            // Supabase rejette les secret keys si la requête porte un header Origin/Referer
            // (détection "ça vient d'un navigateur"). On les retire pour que la requête
            // ressemble à un appel server-to-server légitime.
            proxyReq.removeHeader('origin')
            proxyReq.removeHeader('referer')
            proxyReq.setHeader('user-agent', 'wtf-admin-tool-local-proxy/1.0')
          })
          proxy.on('error', (err) => {
            console.error('[supabase-proxy] error:', err.message)
          })
        },
      },

      // ── Proxy Anthropic local ─────────────────────────────────────────
      // Même principe : le bouton "Générer affirmations" appelle /anthropic-proxy
      // et ce middleware injecte la clé ANTHROPIC_API_KEY côté Node avant
      // de forwarder vers api.anthropic.com. La clé n'est jamais dans le bundle.
      '/anthropic-proxy': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/anthropic-proxy/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('x-api-key', ANTHROPIC_API_KEY || '')
            proxyReq.setHeader('anthropic-version', '2023-06-01')
            proxyReq.removeHeader('origin')
            proxyReq.removeHeader('referer')
            proxyReq.setHeader('user-agent', 'wtf-admin-tool-local-proxy/1.0')
          })
          proxy.on('error', (err) => {
            console.error('[anthropic-proxy] error:', err.message)
          })
        },
      },
    },
  },
  }
})
