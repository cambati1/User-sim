import { test } from 'node:test'
import assert from 'node:assert/strict'

// Use an in-memory DB for tests by temporarily overriding DB_PATH
process.env.DB_PATH = ':memory:'

const { createSubmission, getSubmission, createAnnotation, getAnnotations } = await import('../db.js')

test('createSubmission returns an object with an id', () => {
  const sub = createSubmission({
    screenshotPath: 'uploads/test.png',
    description: 'Test screen',
    questions: ['Is the CTA clear?'],
    aiAnnotations: [{ x: 10, y: 20, width: 30, height: 15, comment: 'Too small' }],
  })
  assert.ok(sub.id)
  assert.equal(sub.description, 'Test screen')
  assert.deepEqual(sub.aiAnnotations, [{ x: 10, y: 20, width: 30, height: 15, comment: 'Too small' }])
})

test('getSubmission returns null for unknown id', () => {
  const result = getSubmission('nonexistent-id')
  assert.equal(result, null)
})

test('getSubmission returns the created submission', () => {
  const sub = createSubmission({
    screenshotPath: 'uploads/a.png',
    description: 'A screen',
    questions: ['Q1'],
    aiAnnotations: [],
  })
  const fetched = getSubmission(sub.id)
  assert.equal(fetched.id, sub.id)
  assert.equal(fetched.description, 'A screen')
})

test('createAnnotation and getAnnotations round-trip', () => {
  const sub = createSubmission({
    screenshotPath: 'uploads/b.png',
    description: 'B screen',
    questions: [],
    aiAnnotations: [],
  })
  const ann = createAnnotation({
    submissionId: sub.id,
    x: 5, y: 10, width: 20, height: 8,
    comment: 'Too much whitespace',
  })
  assert.ok(ann.id)
  const anns = getAnnotations(sub.id)
  assert.equal(anns.length, 1)
  assert.equal(anns[0].comment, 'Too much whitespace')
  assert.equal(anns[0].x, 5)
})
