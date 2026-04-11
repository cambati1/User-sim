import { Router } from 'express'
import { getSubmission, createAnnotation } from '../db.js'

const router = Router({ mergeParams: true })

// POST /api/submissions/:id/annotations
router.post('/', (req, res) => {
  const submission = getSubmission(req.params.id)
  if (!submission) return res.status(404).json({ error: 'Submission not found.' })

  const { x, y, width, height, comment } = req.body

  if (
    typeof x !== 'number' || typeof y !== 'number' ||
    typeof width !== 'number' || typeof height !== 'number' ||
    !comment || typeof comment !== 'string'
  ) {
    return res.status(400).json({ error: 'x, y, width, height (numbers) and comment (string) are required.' })
  }

  const annotation = createAnnotation({ submissionId: req.params.id, x, y, width, height, comment })
  res.status(201).json(annotation)
})

export default router
