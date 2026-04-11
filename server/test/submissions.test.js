import { test } from 'node:test'
import assert from 'node:assert/strict'

process.env.DB_PATH = ':memory:'
process.env.ANTHROPIC_API_KEY = 'test'

const { getSubmission } = await import('../db.js')

test('getSubmission returns null for a nonexistent id', () => {
  const result = getSubmission('does-not-exist')
  assert.equal(result, null)
})

test('getSubmission after createSubmission returns correct description', async () => {
  const { createSubmission } = await import('../db.js')
  const sub = createSubmission({
    screenshotPath: 'uploads/x.png',
    description: 'Route smoke test',
    questions: ['Q?'],
    aiAnnotations: [],
  })
  const fetched = getSubmission(sub.id)
  assert.equal(fetched.description, 'Route smoke test')
  assert.deepEqual(fetched.annotations, [])
})
