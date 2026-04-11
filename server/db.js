import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'

const DB_PATH = process.env.DB_PATH || 'server/feedback.db'
const db = new Database(DB_PATH)

db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id             TEXT PRIMARY KEY,
    screenshot_path TEXT NOT NULL,
    description    TEXT NOT NULL,
    questions      TEXT NOT NULL,
    ai_annotations TEXT NOT NULL,
    created_at     INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS annotations (
    id            TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL REFERENCES submissions(id),
    x             REAL NOT NULL,
    y             REAL NOT NULL,
    width         REAL NOT NULL,
    height        REAL NOT NULL,
    comment       TEXT NOT NULL,
    created_at    INTEGER NOT NULL
  );
`)

export function createSubmission({ screenshotPath, description, questions, aiAnnotations }) {
  const id = randomUUID()
  const now = Date.now()
  db.prepare(`
    INSERT INTO submissions (id, screenshot_path, description, questions, ai_annotations, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, screenshotPath, description, JSON.stringify(questions), JSON.stringify(aiAnnotations), now)
  return getSubmission(id)
}

export function getSubmission(id) {
  const row = db.prepare('SELECT * FROM submissions WHERE id = ?').get(id)
  if (!row) return null
  return {
    id: row.id,
    screenshotPath: row.screenshot_path,
    description: row.description,
    questions: JSON.parse(row.questions),
    aiAnnotations: JSON.parse(row.ai_annotations),
    createdAt: row.created_at,
    annotations: getAnnotations(id),
  }
}

export function createAnnotation({ submissionId, x, y, width, height, comment }) {
  const id = randomUUID()
  const now = Date.now()
  db.prepare(`
    INSERT INTO annotations (id, submission_id, x, y, width, height, comment, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, submissionId, x, y, width, height, comment, now)
  return { id, submissionId, x, y, width, height, comment, createdAt: now }
}

export function getAnnotations(submissionId) {
  return db.prepare('SELECT * FROM annotations WHERE submission_id = ? ORDER BY created_at ASC').all(submissionId)
    .map(row => ({
      id: row.id,
      submissionId: row.submission_id,
      x: row.x, y: row.y, width: row.width, height: row.height,
      comment: row.comment,
      createdAt: row.created_at,
    }))
}
