import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { createSubmission, getSubmission } from '../db.js'
import { analyzeScreenshot } from '../ai.js'

const UPLOAD_DIR = path.join(process.cwd(), 'server/uploads')
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${randomUUID()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp']
    cb(null, allowed.includes(file.mimetype))
  },
})

const router = Router()

// POST /api/submissions
router.post('/', upload.single('screenshot'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'A PNG, JPG, or WebP screenshot is required.' })
  }

  const { description, questions: rawQuestions } = req.body
  if (!description) {
    fs.unlinkSync(req.file.path)
    return res.status(400).json({ error: 'description is required.' })
  }

  const questions = rawQuestions
    ? rawQuestions.split('\n').map(q => q.trim()).filter(Boolean)
    : []

  // Read original file (used for display in review page)
  const fileBuffer = fs.readFileSync(req.file.path)

  // Resize to max 1200px wide before sending to AI so coordinate space is predictable.
  // Retina screenshots (3024px+) cause Gemini to return coordinates in a lower-res
  // internal space, making pixel→percentage conversion inaccurate at full resolution.
  const { data: resizedBuffer, info: resizedInfo } = await sharp(fileBuffer)
    .resize(1200, null, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer({ resolveWithObject: true })

  const aiAnnotations = await analyzeScreenshot({
    base64Image: resizedBuffer.toString('base64'),
    mediaType: 'image/png',
    description,
    questions,
    imageDims: { width: resizedInfo.width, height: resizedInfo.height },
  })

  const screenshotPath = `uploads/${path.basename(req.file.path)}`
  const submission = createSubmission({ screenshotPath, description, questions, aiAnnotations })

  res.status(201).json({
    id: submission.id,
    aiAnnotations: submission.aiAnnotations,
  })
})

// GET /api/submissions/:id
router.get('/:id', (req, res) => {
  const submission = getSubmission(req.params.id)
  if (!submission) return res.status(404).json({ error: 'Submission not found.' })
  res.json(submission)
})

export default router
