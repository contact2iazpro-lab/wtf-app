import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(__dirname, 'dist')
const PORT = process.env.PORT || 3000

const app = express()

// Admin — static files first, then SPA fallback
app.use('/admin', express.static(path.join(dist, 'admin')))
app.get('/admin', (req, res) => res.sendFile(path.join(dist, 'admin', 'index.html')))
app.get('/admin/*', (req, res) => res.sendFile(path.join(dist, 'admin', 'index.html')))

// Game — static files first, then SPA fallback
app.use(express.static(dist))
app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')))

app.listen(PORT, '0.0.0.0', () => {
  console.log(`WTF server running on port ${PORT}`)
})
