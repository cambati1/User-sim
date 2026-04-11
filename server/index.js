import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import submissionsRouter from './routes/submissions.js'
import annotationsRouter from './routes/annotations.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Serve uploaded screenshots
app.use('/uploads', express.static(path.join(process.cwd(), 'server/uploads')))

// Routes
app.use('/api/submissions', submissionsRouter)
app.use('/api/submissions/:id/annotations', annotationsRouter)

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Not found.' }))

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

export default app
