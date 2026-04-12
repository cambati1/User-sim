import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import cron from 'node-cron'
import submissionsRouter from './routes/submissions.js'
import annotationsRouter from './routes/annotations.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Serve uploaded screenshots
app.use('/uploads', express.static(path.join(process.cwd(), 'server/uploads')))

// Routes
app.use('/api/submissions', submissionsRouter)
app.use('/api/submissions/:id/annotations', annotationsRouter)

// Serve built frontend in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist')
  app.use(express.static(distPath))
  app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
} else {
  // 404 handler for dev (frontend handled by Vite)
  app.use((req, res) => res.status(404).json({ error: 'Not found.' }))
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

// Daily midnight cleanup of attached_assets folder
const ATTACHED_ASSETS_DIR = path.join(process.cwd(), 'attached_assets')
cron.schedule('0 0 * * *', () => {
  if (!fs.existsSync(ATTACHED_ASSETS_DIR)) return
  const files = fs.readdirSync(ATTACHED_ASSETS_DIR)
  let removed = 0
  for (const file of files) {
    try {
      fs.rmSync(path.join(ATTACHED_ASSETS_DIR, file), { recursive: true, force: true })
      removed++
    } catch (err) {
      console.error(`Failed to remove ${file}:`, err.message)
    }
  }
  console.log(`[cron] Cleaned attached_assets: removed ${removed} file(s)`)
})

export default app
