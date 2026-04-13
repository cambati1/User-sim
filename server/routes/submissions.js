import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { createSubmission, getSubmission, updateSubmissionAI } from '../db.js'
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

function friendlyAiError(err) {
  const msg = err?.message ?? ''
  try {
    const { error } = JSON.parse(msg)
    if (error?.code === 503 || error?.status === 'UNAVAILABLE') {
      return 'Our AI is a bit overwhelmed right now — it\'s handling too many requests. Give it a minute and hit Retry.'
    }
  } catch { /* not JSON */ }
  if (msg.includes('503') || msg.toLowerCase().includes('unavailable')) {
    return 'Our AI is a bit overwhelmed right now — it\'s handling too many requests. Give it a minute and hit Retry.'
  }
  if (msg.includes('no usable annotations') || msg.includes('unexpected format')) {
    return 'Our AI couldn\'t make sense of this screenshot. Try submitting again or with a clearer image.'
  }
  return 'Something went wrong while generating AI feedback. Please try again.'
}

async function runAI({ screenshotPath, description, questions }) {
  const filePath = path.join(process.cwd(), 'server', screenshotPath)
  const fileBuffer = fs.readFileSync(filePath)
  const { data: resizedBuffer, info: resizedInfo } = await sharp(fileBuffer)
    .resize(1200, null, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer({ resolveWithObject: true })

  return analyzeScreenshot({
    base64Image: resizedBuffer.toString('base64'),
    mediaType: 'image/png',
    description,
    questions,
    imageDims: { width: resizedInfo.width, height: resizedInfo.height },
  })
}

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

  let aiAnnotations = []
  let aiError = null
  try {
    aiAnnotations = await runAI({
      screenshotPath: `uploads/${path.basename(req.file.path)}`,
      description,
      questions,
    })
  } catch (err) {
    console.error('[AI] analyzeScreenshot failed:', err?.message ?? err)
    aiError = friendlyAiError(err)
  }

  const screenshotPath = `uploads/${path.basename(req.file.path)}`
  const submission = createSubmission({ screenshotPath, description, questions, aiAnnotations, aiError })

  res.status(201).json({
    id: submission.id,
    aiAnnotations: submission.aiAnnotations,
    aiError: submission.aiError,
  })
})

// GET /api/submissions/:id
router.get('/:id', (req, res) => {
  const submission = getSubmission(req.params.id)
  if (!submission) return res.status(404).json({ error: 'Submission not found.' })
  res.json(submission)
})

// POST /api/submissions/:id/retry-ai
router.post('/:id/retry-ai', async (req, res) => {
  const submission = getSubmission(req.params.id)
  if (!submission) return res.status(404).json({ error: 'Submission not found.' })

  let aiAnnotations = []
  let aiError = null
  try {
    aiAnnotations = await runAI({
      screenshotPath: submission.screenshotPath,
      description: submission.description,
      questions: submission.questions,
    })
  } catch (err) {
    console.error('[AI] retry failed:', err?.message ?? err)
    aiError = friendlyAiError(err)
  }

  updateSubmissionAI(submission.id, { aiAnnotations, aiError })
  res.json({ aiAnnotations, aiError })
})

export default router
