import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { execSync } from 'child_process'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))
const gitHash = (() => { try { return execSync('git rev-parse --short HEAD').toString().trim() } catch { return Date.now().toString(36) } })()
const APP_VERSION = `${pkg.version}-${gitHash}`

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(APP_VERSION),
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(Date.now().toString()),
  },
  server: {
    port: 5176,
    strictPort: true,
    headers: {
      'Cache-Control': 'no-cache',
    },
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
})
