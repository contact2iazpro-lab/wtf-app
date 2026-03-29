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
     * modules (AudioContext, SettingsModal) that must not run in the admin context.
     *
     * This plugin intercepts those specific imports — only when the importing file
     * is inside the game's src directory — and redirects them to no-op stubs.
     */
    {
      name: 'game-preview-stubs',
      resolveId(id, importer) {
        if (!importer) return null

        // Only intercept imports that originate from the game's src files
        const normalizedImporter = importer.replace(/\\/g, '/')
        const normalizedRoot = gameRoot.replace(/\\/g, '/')
        if (!normalizedImporter.startsWith(normalizedRoot)) return null

        // Redirect ../utils/audio (any depth) → no-op stub
        if (/\/utils\/audio/.test(id) || id === '../utils/audio' || id === '../../utils/audio') {
          return path.resolve(__dirname, 'src/stubs/audio.js')
        }

        // Redirect SettingsModal → null component stub
        if (/SettingsModal/.test(id)) {
          return path.resolve(__dirname, 'src/stubs/SettingsModal.jsx')
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
