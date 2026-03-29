import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Absolute path to the game's src directory (sibling of admin-tool/)
const gameRoot = path.resolve(__dirname, '../src')

export default defineConfig({
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
        // root node_modules on Vercel — intercept it here.
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

  server: { port: 5174 },
})
