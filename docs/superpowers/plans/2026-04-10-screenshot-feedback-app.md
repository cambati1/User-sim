# Screenshot Feedback App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack web app where users upload app screenshots, get AI-generated region annotations, and share a link for human peer review.

**Architecture:** Express + SQLite backend on port 3001, React + Vite frontend on port 5173 with `/api` proxied to the backend. Shareable links use the submission UUID as the share token. Annotations (both AI and human) are stored as bounding boxes in % coordinates so they survive image resizing.

**Tech Stack:** React 19, Vite 8, Tailwind CSS v4, React Router v6, Express, better-sqlite3, Multer, uuid, @anthropic-ai/sdk, concurrently, dotenv

---

## File Map

**Create (backend):**
- `server/index.js` — Express app: middleware, routes, static file serving, start
- `server/db.js` — SQLite init, table creation, all query functions
- `server/ai.js` — Claude API call + JSON annotation parsing
- `server/routes/submissions.js` — `POST /api/submissions`, `GET /api/submissions/:id`
- `server/routes/annotations.js` — `POST /api/submissions/:id/annotations`
- `server/.env` — `ANTHROPIC_API_KEY=...` (gitignored)
- `server/uploads/` — screenshot storage dir (gitignored)
- `server/test/db.test.js` — db.js unit tests
- `server/test/submissions.test.js` — route integration tests

**Modify (frontend):**
- `vite.config.js` — add `/api` proxy to port 3001
- `src/main.jsx` — wrap app in `<BrowserRouter>`
- `src/App.jsx` — define routes `/` and `/review/:id`

**Create (frontend):**
- `src/pages/UploadPage.jsx` — upload form page
- `src/pages/ReviewPage.jsx` — review + annotation page (fetches submission, owns mode state)
- `src/components/DropZone.jsx` — drag-and-drop file input with preview
- `src/components/QuestionChips.jsx` — tappable suggestion chips that append to textarea
- `src/components/LoadingScreen.jsx` — 4-step progress indicator during upload+AI
- `src/components/SuccessBanner.jsx` — share link display with copy button
- `src/components/AnnotationCanvas.jsx` — screenshot img + overlay boxes; measures positions via `getBoundingClientRect`, re-measures on resize
- `src/components/AnnotationBox.jsx` — single overlay box (indigo=AI, green=human) with hover tooltip
- `src/components/AnnotationSidebar.jsx` — tab-filtered list of annotation cards
- `src/components/DrawOverlay.jsx` — transparent div covering canvas in annotate mode; tracks mousedown/mousemove/mouseup to produce a % bounding box
- `src/components/CommentPopover.jsx` — textarea + Save/Cancel that appears after draw

---

## Task 1: Install dependencies & configure tooling

**Files:**
- Modify: `package.json`
- Modify: `vite.config.js`
- Create: `.env` (root, for reference — actual secrets in `server/.env`)
- Modify: `.gitignore`

- [ ] **Install backend dependencies**

```bash
npm install express better-sqlite3 multer @anthropic-ai/sdk cors dotenv
```

- [ ] **Install frontend dependency**

```bash
npm install react-router-dom
```

- [ ] **Install dev tooling**

```bash
npm install --save-dev concurrently
```

- [ ] **Add dev scripts to `package.json`**

Replace the `"scripts"` block:

```json
"scripts": {
  "dev": "concurrently \"vite\" \"node server/index.js\"",
  "dev:frontend": "vite",
  "dev:backend": "node server/index.js",
  "build": "vite build",
  "lint": "eslint .",
  "preview": "vite preview",
  "test:server": "node --test server/test/*.test.js"
}
```

- [ ] **Add proxy to `vite.config.js`**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
    },
  },
})
```

- [ ] **Update `.gitignore`**

Append:
```
server/uploads/
server/.env
server/feedback.db
.superpowers/
```

- [ ] **Create `server/.env`**

```
ANTHROPIC_API_KEY=your_key_here
PORT=3001
```

- [ ] **Create `server/uploads/` directory**

```bash
mkdir -p server/uploads
touch server/uploads/.gitkeep
```

- [ ] **Commit**

```bash
git add package.json package-lock.json vite.config.js .gitignore server/.env server/uploads/.gitkeep
git commit -m "chore: install deps, configure proxy and dev scripts"
```

---

## Task 2: Database module

**Files:**
- Create: `server/db.js`
- Create: `server/test/db.test.js`

- [ ] **Write failing tests for `server/test/db.test.js`**

```js
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

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
```

- [ ] **Run tests to verify they fail**

```bash
npm run test:server
```

Expected: `ERR_MODULE_NOT_FOUND` — `../db.js` does not exist.

- [ ] **Implement `server/db.js`**

```js
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
```

- [ ] **Run tests to verify they pass**

```bash
npm run test:server
```

Expected: `4 passing`

- [ ] **Commit**

```bash
git add server/db.js server/test/db.test.js
git commit -m "feat: add SQLite database module with submissions and annotations"
```

---

## Task 3: AI annotation module

**Files:**
- Create: `server/ai.js`

No automated test for this task — it requires a live API key. Manual verification happens in Task 6.

- [ ] **Create `server/ai.js`**

```js
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/**
 * Calls Claude with a screenshot (as base64) + context and returns
 * an array of annotation objects: { x, y, width, height, comment }
 * where x/y/width/height are percentages (0-100) of image dimensions.
 * Returns [] on any failure.
 */
export async function analyzeScreenshot({ base64Image, mediaType, description, questions }) {
  const questionsText = questions.length
    ? `\nThe uploader specifically wants feedback on:\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    : ''

  const prompt = `You are a UX and visual design expert. Analyze this app screenshot and provide specific, actionable design feedback.

Context: ${description}${questionsText}

Return a JSON array of annotation objects. Each annotation must cover a specific region of the screenshot and explain what could be improved. Use this exact format:

[
  {
    "x": <number 0-100, left edge as % of image width>,
    "y": <number 0-100, top edge as % of image height>,
    "width": <number 0-100, box width as % of image width>,
    "height": <number 0-100, box height as % of image height>,
    "comment": "<specific, actionable feedback for this region>"
  }
]

Rules:
- Return ONLY the JSON array, no markdown fences, no explanation
- Provide 3-6 annotations
- Each box must tightly wrap the element it discusses
- Comments must be specific (not "improve contrast" but "text contrast ratio is too low — use #1e293b on white instead of #94a3b8")
- Coordinates must be accurate to the actual element positions in the image`

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Image } },
          { type: 'text', text: prompt },
        ],
      }],
    })

    const text = response.content[0].text.trim()
    const annotations = JSON.parse(text)

    // Validate shape
    if (!Array.isArray(annotations)) return []
    return annotations.filter(a =>
      typeof a.x === 'number' && typeof a.y === 'number' &&
      typeof a.width === 'number' && typeof a.height === 'number' &&
      typeof a.comment === 'string'
    )
  } catch {
    return []
  }
}
```

- [ ] **Commit**

```bash
git add server/ai.js
git commit -m "feat: add AI annotation module using Claude vision"
```

---

## Task 4: Submissions route

**Files:**
- Create: `server/routes/submissions.js`
- Create: `server/test/submissions.test.js`

- [ ] **Write failing test for `server/test/submissions.test.js`**

Tests the route handlers in isolation using `node:test` — no live server needed.

```js
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
```

- [ ] **Create `server/routes/submissions.js`**

```js
import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
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

  // Read file as base64 for Claude
  const fileBuffer = fs.readFileSync(req.file.path)
  const base64Image = fileBuffer.toString('base64')
  const mediaType = req.file.mimetype

  const aiAnnotations = await analyzeScreenshot({ base64Image, mediaType, description, questions })

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
```

- [ ] **Commit**

```bash
git add server/routes/submissions.js server/test/submissions.test.js
git commit -m "feat: add submissions route (POST upload + GET by id)"
```

---

## Task 5: Annotations route

**Files:**
- Create: `server/routes/annotations.js`

- [ ] **Create `server/routes/annotations.js`**

```js
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
```

- [ ] **Commit**

```bash
git add server/routes/annotations.js
git commit -m "feat: add annotations route (POST human annotation)"
```

---

## Task 6: Express server entry point

**Files:**
- Create: `server/index.js`

- [ ] **Create `server/index.js`**

```js
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
```

- [ ] **Run server and smoke-test manually**

```bash
node server/index.js
# In another terminal:
curl http://localhost:3001/api/submissions/nonexistent
# Expected: {"error":"Submission not found."}
```

- [ ] **Run server tests**

```bash
npm run test:server
```

Expected: `2 passing` (the submissions tests that don't require file upload)

- [ ] **Commit**

```bash
git add server/index.js
git commit -m "feat: add Express server entry point"
```

---

## Task 7: Frontend routing setup

**Files:**
- Modify: `src/main.jsx`
- Modify: `src/App.jsx`
- Create: `src/pages/UploadPage.jsx` (stub)
- Create: `src/pages/ReviewPage.jsx` (stub)

- [ ] **Update `src/main.jsx`**

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
```

- [ ] **Update `src/App.jsx`**

```jsx
import { Routes, Route } from 'react-router-dom'
import UploadPage from './pages/UploadPage.jsx'
import ReviewPage from './pages/ReviewPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<UploadPage />} />
      <Route path="/review/:id" element={<ReviewPage />} />
    </Routes>
  )
}
```

- [ ] **Create `src/pages/UploadPage.jsx` stub**

```jsx
export default function UploadPage() {
  return <div className="p-8 text-gray-900">Upload Page — coming soon</div>
}
```

- [ ] **Create `src/pages/ReviewPage.jsx` stub**

```jsx
import { useParams } from 'react-router-dom'
export default function ReviewPage() {
  const { id } = useParams()
  return <div className="p-8 text-gray-900">Review Page for {id} — coming soon</div>
}
```

- [ ] **Start dev servers and verify routes load**

```bash
npm run dev
# Visit http://localhost:5173/ → "Upload Page — coming soon"
# Visit http://localhost:5173/review/test-id → "Review Page for test-id — coming soon"
```

- [ ] **Commit**

```bash
git add src/main.jsx src/App.jsx src/pages/UploadPage.jsx src/pages/ReviewPage.jsx
git commit -m "feat: add React Router with Upload and Review page stubs"
```

---

## Task 8: DropZone component

**Files:**
- Create: `src/components/DropZone.jsx`

- [ ] **Create `src/components/DropZone.jsx`**

```jsx
import { useRef, useState } from 'react'

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024

/**
 * Props:
 *   file: File | null
 *   onFile: (file: File) => void
 *   error: string | null
 */
export default function DropZone({ file, onFile, error }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  function handleFile(f) {
    if (!f) return
    if (!ACCEPTED.includes(f.type)) return
    if (f.size > MAX_BYTES) return
    onFile(f)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div
      onClick={() => !file && inputRef.current.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={[
        'rounded-xl border-2 border-dashed transition-colors',
        dragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50',
        file ? 'cursor-default' : 'cursor-pointer',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={e => handleFile(e.target.files[0])}
      />

      {file ? (
        <div className="flex items-center gap-4 px-5 py-4">
          <div className="w-16 h-12 rounded-lg bg-indigo-100 flex items-center justify-center text-2xl flex-shrink-0">
            🖼️
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{file.name}</p>
            <p className="text-xs text-slate-400 mt-0.5">{(file.size / 1024 / 1024).toFixed(1)} MB · ready</p>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); inputRef.current.click() }}
              className="text-xs text-indigo-500 font-medium mt-1 hover:underline"
            >
              Change file
            </button>
          </div>
          <span className="text-green-500 text-xl">✓</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-9 px-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-2xl mb-1">
            🖼️
          </div>
          <p className="text-sm font-semibold text-slate-700">Drop your screenshot here</p>
          <p className="text-xs text-slate-400">PNG, JPG or WebP · max 10 MB</p>
          <span className="mt-3 px-4 py-1.5 bg-indigo-500 text-white text-xs font-semibold rounded-lg">
            Browse files
          </span>
        </div>
      )}

      {error && <p className="px-5 pb-3 text-xs text-red-500">{error}</p>}
    </div>
  )
}
```

- [ ] **Verify in browser**

Add `<DropZone file={null} onFile={f => console.log(f)} error={null} />` temporarily to `UploadPage.jsx`, run `npm run dev:frontend`, confirm drop zone renders and file selection works. Remove test usage after.

- [ ] **Commit**

```bash
git add src/components/DropZone.jsx
git commit -m "feat: add DropZone component with drag-and-drop and file preview"
```

---

## Task 9: QuestionChips component

**Files:**
- Create: `src/components/QuestionChips.jsx`

- [ ] **Create `src/components/QuestionChips.jsx`**

```jsx
const SUGGESTIONS = [
  'Is the CTA obvious?',
  'Is the hierarchy clear?',
  'Does spacing feel balanced?',
  'Is the color scheme accessible?',
  'Is there too much going on?',
  'Does it feel trustworthy?',
]

/**
 * Props:
 *   value: string  (current textarea value)
 *   onChange: (newValue: string) => void
 */
export default function QuestionChips({ value, onChange }) {
  function toggle(suggestion) {
    const lines = value.split('\n').map(l => l.trim()).filter(Boolean)
    const exists = lines.includes(suggestion)
    const next = exists
      ? lines.filter(l => l !== suggestion)
      : [...lines, suggestion]
    onChange(next.join('\n'))
  }

  const active = new Set(value.split('\n').map(l => l.trim()).filter(Boolean))

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {SUGGESTIONS.map(s => (
        <button
          key={s}
          type="button"
          onClick={() => toggle(s)}
          className={[
            'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
            active.has(s)
              ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
              : 'border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-500',
          ].join(' ')}
        >
          {s}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add src/components/QuestionChips.jsx
git commit -m "feat: add QuestionChips suggestion component"
```

---

## Task 10: LoadingScreen and SuccessBanner components

**Files:**
- Create: `src/components/LoadingScreen.jsx`
- Create: `src/components/SuccessBanner.jsx`

- [ ] **Create `src/components/LoadingScreen.jsx`**

```jsx
const STEPS = [
  'Screenshot uploaded',
  'AI reading your design…',
  'Generating annotations',
  'Creating your share link',
]

/**
 * Props:
 *   step: number  (0-3, current active step index)
 */
export default function LoadingScreen({ step }) {
  return (
    <div className="flex flex-col items-center gap-5 py-10">
      <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-indigo-500 animate-spin" />
      <p className="text-lg font-bold text-slate-800">Analyzing your design…</p>
      <p className="text-sm text-slate-500">This usually takes 5–10 seconds</p>
      <div className="w-full max-w-xs flex flex-col gap-3 mt-2">
        {STEPS.map((label, i) => {
          const done = i < step
          const active = i === step
          return (
            <div key={i} className="flex items-center gap-3 text-sm">
              <div className={[
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                done   ? 'bg-green-100 text-green-600' :
                active ? 'bg-indigo-100 text-indigo-600 animate-pulse' :
                         'bg-slate-100 text-slate-400',
              ].join(' ')}>
                {done ? '✓' : i + 1}
              </div>
              <span className={done ? 'text-slate-400' : active ? 'text-slate-800 font-semibold' : 'text-slate-400'}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Create `src/components/SuccessBanner.jsx`**

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Props:
 *   submissionId: string
 */
export default function SuccessBanner({ submissionId }) {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const shareUrl = `${window.location.origin}/review/${submissionId}`

  function copy() {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-indigo-200 bg-indigo-50">
      <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center text-base">✓</div>
          <div>
            <p className="text-base font-bold text-white">Your feedback link is ready</p>
            <p className="text-xs text-indigo-400 mt-0.5">AI annotations generated · share with anyone</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-indigo-950 rounded-xl px-4 py-3 border border-indigo-700">
          <span className="flex-1 text-xs font-mono text-indigo-300 truncate">{shareUrl}</span>
          <button
            onClick={copy}
            className="px-3 py-1 bg-indigo-500 text-white text-xs font-bold rounded-lg flex-shrink-0 hover:bg-indigo-400 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="text-xs text-indigo-500">🔒 Only people with this link can see your screenshot</p>
      </div>
      <button
        onClick={() => navigate(`/review/${submissionId}`)}
        className="w-full py-3.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 transition-colors"
      >
        View AI feedback &amp; invite reviewers →
      </button>
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add src/components/LoadingScreen.jsx src/components/SuccessBanner.jsx
git commit -m "feat: add LoadingScreen and SuccessBanner components"
```

---

## Task 11: Full UploadPage

**Files:**
- Modify: `src/pages/UploadPage.jsx`

- [ ] **Replace `src/pages/UploadPage.jsx`**

```jsx
import { useState } from 'react'
import DropZone from '../components/DropZone.jsx'
import QuestionChips from '../components/QuestionChips.jsx'
import LoadingScreen from '../components/LoadingScreen.jsx'
import SuccessBanner from '../components/SuccessBanner.jsx'

export default function UploadPage() {
  const [file, setFile] = useState(null)
  const [fileError, setFileError] = useState(null)
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState('')
  const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'done' | 'error'
  const [loadingStep, setLoadingStep] = useState(0)
  const [submissionId, setSubmissionId] = useState(null)
  const [submitError, setSubmitError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) { setFileError('Please select a screenshot.'); return }
    if (!description.trim()) return

    setStatus('loading')
    setLoadingStep(0)
    setSubmitError(null)

    const data = new FormData()
    data.append('screenshot', file)
    data.append('description', description.trim())
    data.append('questions', questions)

    // Animate steps during upload
    const stepTimer = setInterval(() => {
      setLoadingStep(prev => Math.min(prev + 1, 2))
    }, 3000)

    try {
      const res = await fetch('/api/submissions', { method: 'POST', body: data })
      clearInterval(stepTimer)

      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error || 'Upload failed.')
      }

      setLoadingStep(3)
      const { id } = await res.json()
      setTimeout(() => {
        setSubmissionId(id)
        setStatus('done')
      }, 600)
    } catch (err) {
      clearInterval(stepTimer)
      setSubmitError(err.message)
      setStatus('idle')
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 w-full max-w-lg p-8">
          <LoadingScreen step={loadingStep} />
        </div>
      </div>
    )
  }

  if (status === 'done') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <SuccessBanner submissionId={submissionId} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center px-4 py-10">
      <nav className="w-full max-w-xl flex items-center justify-between mb-10">
        <span className="text-lg font-bold text-indigo-500">design<span className="text-slate-800">feedback</span></span>
        <span className="text-xs text-slate-400">No account needed</span>
      </nav>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Get <em className="not-italic text-indigo-500">real feedback</em><br />on your app's design
        </h1>
        <p className="mt-3 text-base text-slate-500 max-w-sm mx-auto">
          Upload a screenshot, get instant AI annotations, share a link for human review.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 w-full max-w-xl overflow-hidden">
        {/* Step tabs */}
        <div className="flex border-b border-slate-100 px-6">
          {['Upload', 'Describe', 'Ask'].map((s, i) => (
            <div key={s} className="flex items-center gap-2 py-4 mr-6 border-b-2 border-indigo-500 text-indigo-600 text-xs font-semibold">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
              {s}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
          {/* 1. Drop zone */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-600">Your screenshot</label>
            <DropZone file={file} onFile={f => { setFile(f); setFileError(null) }} error={fileError} />
          </div>

          {/* 2. Description */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-2">
              What screen is this?
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">Helps AI</span>
            </label>
            <p className="text-xs text-slate-400 -mt-1">Give AI context so it gives relevant, not generic, feedback.</p>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Onboarding flow for a fitness app, step 2 of 4"
              required
              className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* 3. Questions */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-600">What do you want feedback on?</label>
            <p className="text-xs text-slate-400 -mt-1">Write your own, or tap a suggestion to add it.</p>
            <textarea
              value={questions}
              onChange={e => setQuestions(e.target.value)}
              rows={3}
              placeholder={'Is the CTA obvious enough?\nDoes the visual hierarchy guide the eye?'}
              className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-y"
            />
            <QuestionChips value={questions} onChange={setQuestions} />
          </div>

          {/* What happens next */}
          <div className="bg-slate-50 rounded-xl p-4 flex flex-col gap-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">What happens next</p>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-sm flex-shrink-0">🤖</div>
              <p className="text-xs text-slate-500 leading-relaxed"><strong className="text-slate-700">AI annotates your screenshot</strong> — region-by-region feedback in ~10 seconds</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center text-sm flex-shrink-0">🔗</div>
              <p className="text-xs text-slate-500 leading-relaxed"><strong className="text-slate-700">You get a shareable link</strong> — send it to anyone for human annotations on top</p>
            </div>
          </div>

          {submitError && <p className="text-sm text-red-500">{submitError}</p>}

          <button
            type="submit"
            className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl text-sm transition-colors"
          >
            Analyze my design →
          </button>
          <p className="text-center text-xs text-slate-400">Free · no account · your screenshot is private unless you share the link</p>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Test the full upload flow end-to-end**

```bash
npm run dev
```

1. Open http://localhost:5173
2. Drop a screenshot, fill description and questions, click submit
3. Confirm loading screen shows with animated steps
4. Confirm success banner appears with a valid share URL
5. Click "View AI feedback" — confirm navigation to `/review/:id`

- [ ] **Commit**

```bash
git add src/pages/UploadPage.jsx
git commit -m "feat: build full UploadPage with form, loading state, and success banner"
```

---

## Task 12: AnnotationBox component

**Files:**
- Create: `src/components/AnnotationBox.jsx`

- [ ] **Create `src/components/AnnotationBox.jsx`**

```jsx
/**
 * Renders a single annotation overlay box absolutely positioned
 * within a relative-positioned parent (the screenshot wrapper).
 *
 * Props:
 *   ann: { id, x, y, width, height, comment, type: 'ai'|'human' }
 *   containerWidth: number   (px width of screenshot)
 *   containerHeight: number  (px height of screenshot)
 *   index: number            (1-based label)
 */
export default function AnnotationBox({ ann, containerWidth, containerHeight, index }) {
  const isAI = ann.type === 'ai'

  const style = {
    position: 'absolute',
    left:   `${ann.x}%`,
    top:    `${ann.y}%`,
    width:  `${ann.width}%`,
    height: `${ann.height}%`,
  }

  // Flip tooltip to left side if the annotation is in the right half of the image
  const flipLeft = ann.x > 50

  return (
    <div
      style={style}
      className={[
        'group rounded-sm cursor-pointer',
        isAI
          ? 'border-2 border-indigo-400 bg-indigo-400/10'
          : 'border-2 border-emerald-400 bg-emerald-400/10',
      ].join(' ')}
    >
      {/* Number badge */}
      <span className={[
        'absolute -top-2.5 -left-2.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md',
        isAI ? 'bg-indigo-500' : 'bg-emerald-500',
      ].join(' ')}>
        {index}
      </span>

      {/* Tooltip */}
      <div className={[
        'absolute top-0 z-30 w-52 bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-xl',
        'opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none',
        flipLeft ? 'right-full mr-2' : 'left-full ml-2',
      ].join(' ')}>
        <p className={[
          'text-[10px] font-bold uppercase tracking-wide mb-1.5',
          isAI ? 'text-indigo-400' : 'text-emerald-400',
        ].join(' ')}>
          {isAI ? '🤖 AI Feedback' : '💬 Human'}
        </p>
        <p className="text-xs text-slate-300 leading-relaxed">{ann.comment}</p>
      </div>
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add src/components/AnnotationBox.jsx
git commit -m "feat: add AnnotationBox overlay component with tooltip"
```

---

## Task 13: AnnotationCanvas component

**Files:**
- Create: `src/components/AnnotationCanvas.jsx`

- [ ] **Create `src/components/AnnotationCanvas.jsx`**

```jsx
import { useRef, useEffect, useState } from 'react'
import AnnotationBox from './AnnotationBox.jsx'

/**
 * Props:
 *   screenshotUrl: string
 *   aiAnnotations: Array<{ x, y, width, height, comment }>
 *   humanAnnotations: Array<{ id, x, y, width, height, comment }>
 *   activeTab: 'all' | 'ai' | 'human'
 */
export default function AnnotationCanvas({ screenshotUrl, aiAnnotations, humanAnnotations, activeTab }) {
  const imgRef = useRef(null)
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    function measure() {
      if (imgRef.current) {
        setImgSize({
          width:  imgRef.current.offsetWidth,
          height: imgRef.current.offsetHeight,
        })
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [screenshotUrl])

  const aiAnns    = aiAnnotations.map(a => ({ ...a, type: 'ai' }))
  const humanAnns = humanAnnotations.map(a => ({ ...a, type: 'human' }))

  // activeTab 'none' hides all annotations (used during annotate mode)
  const visible = activeTab === 'none' ? [] : [
    ...(activeTab !== 'human' ? aiAnns : []),
    ...(activeTab !== 'ai' ? humanAnns : []),
  ]

  return (
    <div className="relative inline-block rounded-xl shadow-2xl overflow-visible" style={{ lineHeight: 0 }}>
      <img
        ref={imgRef}
        src={screenshotUrl}
        alt="App screenshot"
        className="block w-[340px] rounded-xl"
        onLoad={() => {
          if (imgRef.current) {
            setImgSize({ width: imgRef.current.offsetWidth, height: imgRef.current.offsetHeight })
          }
        }}
      />
      {imgSize.width > 0 && visible.map((ann, i) => (
        <AnnotationBox
          key={ann.id ?? `ai-${i}`}
          ann={ann}
          containerWidth={imgSize.width}
          containerHeight={imgSize.height}
          index={i + 1}
        />
      ))}
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add src/components/AnnotationCanvas.jsx
git commit -m "feat: add AnnotationCanvas with overlay positioning"
```

---

## Task 14: AnnotationSidebar component

**Files:**
- Create: `src/components/AnnotationSidebar.jsx`

- [ ] **Create `src/components/AnnotationSidebar.jsx`**

```jsx
/**
 * Props:
 *   aiAnnotations: Array<{ comment }>
 *   humanAnnotations: Array<{ id, comment }>
 *   activeTab: 'all' | 'ai' | 'human'
 *   onTabChange: (tab: 'all' | 'ai' | 'human') => void
 *   onAddAnnotation: () => void
 */
export default function AnnotationSidebar({ aiAnnotations, humanAnnotations, activeTab, onTabChange, onAddAnnotation }) {
  const total = aiAnnotations.length + humanAnnotations.length

  const tabs = [
    { key: 'all',   label: `All (${total})` },
    { key: 'ai',    label: `AI (${aiAnnotations.length})` },
    { key: 'human', label: `Human (${humanAnnotations.length})` },
  ]

  const aiVisible    = activeTab !== 'human' ? aiAnnotations    : []
  const humanVisible = activeTab !== 'ai'    ? humanAnnotations : []
  let counter = 0

  return (
    <div className="w-72 flex-shrink-0 bg-slate-800 border-l border-slate-700 flex flex-col overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => onTabChange(t.key)}
            className={[
              'flex-1 py-3 text-xs font-semibold border-b-2 transition-colors',
              activeTab === t.key
                ? 'text-white border-indigo-400'
                : 'text-slate-500 border-transparent hover:text-slate-300',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
        {aiVisible.map((ann, i) => {
          counter++
          const n = counter
          return (
            <div key={`ai-${i}`} className="bg-slate-900 rounded-xl p-3 border-l-[3px] border-indigo-500">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-400">AI</span>
                <span className="ml-auto text-[10px] text-slate-600">#{n}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{ann.comment}</p>
            </div>
          )
        })}
        {humanVisible.map((ann, i) => {
          counter++
          const n = counter
          return (
            <div key={ann.id ?? `human-${i}`} className="bg-slate-900 rounded-xl p-3 border-l-[3px] border-emerald-500">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-400">Human</span>
                <span className="ml-auto text-[10px] text-slate-600">#{n}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{ann.comment}</p>
            </div>
          )
        })}
        {total === 0 && (
          <p className="text-xs text-slate-600 text-center mt-8">No annotations yet.</p>
        )}
      </div>

      {/* Add annotation */}
      <div className="p-3 border-t border-slate-700">
        <button
          onClick={onAddAnnotation}
          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold rounded-xl transition-colors"
        >
          ✏️ Add annotation
        </button>
        <p className="text-center text-[10px] text-slate-600 mt-2">Switch to Annotate mode, then drag on the image</p>
      </div>
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add src/components/AnnotationSidebar.jsx
git commit -m "feat: add AnnotationSidebar with tab filter and annotation cards"
```

---

## Task 15: DrawOverlay and CommentPopover components

**Files:**
- Create: `src/components/DrawOverlay.jsx`
- Create: `src/components/CommentPopover.jsx`

- [ ] **Create `src/components/DrawOverlay.jsx`**

```jsx
import { useRef, useState } from 'react'

/**
 * Transparent overlay covering the screenshot in Annotate mode.
 * Tracks mousedown → mousemove → mouseup to produce a % bounding box.
 *
 * Props:
 *   onDraw: ({ x, y, width, height }: PercentBox) => void
 *     Called on mouseup with coordinates as % of container dimensions.
 */
export default function DrawOverlay({ onDraw }) {
  const containerRef = useRef(null)
  const [drawing, setDrawing] = useState(null) // { startX, startY, endX, endY } in px relative to container

  function pct(px, dim) { return Math.max(0, Math.min(100, (px / dim) * 100)) }

  function onMouseDown(e) {
    const rect = containerRef.current.getBoundingClientRect()
    setDrawing({ startX: e.clientX - rect.left, startY: e.clientY - rect.top, endX: e.clientX - rect.left, endY: e.clientY - rect.top })
  }

  function onMouseMove(e) {
    if (!drawing) return
    const rect = containerRef.current.getBoundingClientRect()
    setDrawing(d => ({ ...d, endX: e.clientX - rect.left, endY: e.clientY - rect.top }))
  }

  function onMouseUp() {
    if (!drawing) return
    const rect = containerRef.current.getBoundingClientRect()
    const x1 = Math.min(drawing.startX, drawing.endX)
    const y1 = Math.min(drawing.startY, drawing.endY)
    const x2 = Math.max(drawing.startX, drawing.endX)
    const y2 = Math.max(drawing.startY, drawing.endY)
    const w = x2 - x1
    const h = y2 - y1
    setDrawing(null)
    if (w < 10 || h < 10) return // ignore tiny accidental clicks
    onDraw({
      x: pct(x1, rect.width),
      y: pct(y1, rect.height),
      width:  pct(w, rect.width),
      height: pct(h, rect.height),
    })
  }

  const previewBox = drawing ? (() => {
    const x1 = Math.min(drawing.startX, drawing.endX)
    const y1 = Math.min(drawing.startY, drawing.endY)
    return {
      left:   Math.min(drawing.startX, drawing.endX),
      top:    Math.min(drawing.startY, drawing.endY),
      width:  Math.abs(drawing.endX - drawing.startX),
      height: Math.abs(drawing.endY - drawing.startY),
    }
  })() : null

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 cursor-crosshair z-20"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {previewBox && (
        <div
          className="absolute border-2 border-dashed border-cyan-400 bg-cyan-400/10 rounded-sm pointer-events-none"
          style={{ left: previewBox.left, top: previewBox.top, width: previewBox.width, height: previewBox.height }}
        />
      )}
    </div>
  )
}
```

- [ ] **Create `src/components/CommentPopover.jsx`**

```jsx
import { useState } from 'react'

/**
 * Props:
 *   onSave: (comment: string) => void
 *   onCancel: () => void
 */
export default function CommentPopover({ onSave, onCancel }) {
  const [comment, setComment] = useState('')

  function handleSave() {
    const trimmed = comment.trim()
    if (!trimmed) return
    onSave(trimmed)
  }

  return (
    <div className="absolute z-40 top-0 left-full ml-3 w-64 bg-slate-800 border border-slate-600 rounded-2xl p-4 shadow-2xl">
      <p className="text-sm font-bold text-white mb-0.5">Add your annotation</p>
      <p className="text-xs text-slate-500 mb-3">What's your feedback on this region?</p>
      <textarea
        autoFocus
        value={comment}
        onChange={e => setComment(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave() }}
        rows={4}
        placeholder="Your comment…"
        className="w-full px-3 py-2.5 bg-slate-900 border border-indigo-500 ring-2 ring-indigo-500/20 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none resize-none"
      />
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleSave}
          className="flex-1 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold rounded-xl transition-colors"
        >
          Save annotation
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 border border-slate-600 text-slate-400 text-xs rounded-xl hover:bg-slate-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add src/components/DrawOverlay.jsx src/components/CommentPopover.jsx
git commit -m "feat: add DrawOverlay and CommentPopover for annotate mode"
```

---

## Task 16: Full ReviewPage

**Files:**
- Modify: `src/pages/ReviewPage.jsx`

- [ ] **Replace `src/pages/ReviewPage.jsx`**

```jsx
import { useParams } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import AnnotationCanvas from '../components/AnnotationCanvas.jsx'
import AnnotationSidebar from '../components/AnnotationSidebar.jsx'
import DrawOverlay from '../components/DrawOverlay.jsx'
import CommentPopover from '../components/CommentPopover.jsx'

export default function ReviewPage() {
  const { id } = useParams()
  const [submission, setSubmission] = useState(null)
  const [humanAnnotations, setHumanAnnotations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('view') // 'view' | 'annotate'
  const [activeTab, setActiveTab] = useState('all')
  const [pendingBox, setPendingBox] = useState(null) // { x, y, width, height } in %
  const canvasWrapRef = useRef(null)

  useEffect(() => {
    fetch(`/api/submissions/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Not found')))
      .then(data => {
        setSubmission(data)
        setHumanAnnotations(data.annotations || [])
        setLoading(false)
      })
      .catch(() => { setError('This link was not found.'); setLoading(false) })
  }, [id])

  async function saveAnnotation(comment) {
    if (!pendingBox) return
    const res = await fetch(`/api/submissions/${id}/annotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...pendingBox, comment }),
    })
    if (res.ok) {
      const ann = await res.json()
      setHumanAnnotations(prev => [...prev, ann])
    }
    setPendingBox(null)
    setMode('view')
  }

  function handleDraw(box) {
    setPendingBox(box)
    setMode('popover') // temporary state while popover is open
  }

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-sm">Loading…</div>
  if (error)   return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-sm">{error}</div>

  const screenshotUrl = `/uploads/${submission.screenshotPath.replace('uploads/', '')}`

  return (
    <div className="flex flex-col h-screen bg-slate-900 overflow-hidden">
      {/* Topbar */}
      <div className="flex-shrink-0 h-13 bg-slate-800 border-b border-slate-700 px-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-base font-bold text-indigo-400">design<span className="text-slate-200">feedback</span></span>
          <span className="w-px h-5 bg-slate-600" />
          <span className="text-sm text-slate-400">
            <strong className="text-slate-200">{submission.description}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-950 text-indigo-400">
            🤖 {submission.aiAnnotations.length} AI
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400">
            💬 {humanAnnotations.length} human
          </span>
          <button
            onClick={() => { navigator.clipboard.writeText(window.location.href) }}
            className="px-3 py-1.5 bg-indigo-500 text-white text-xs font-bold rounded-lg hover:bg-indigo-400 transition-colors"
          >
            🔗 Copy link
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 flex flex-col items-center overflow-auto bg-slate-900 pt-12 pb-8 px-8 gap-5">
          {/* Mode switcher */}
          <div className="flex-shrink-0 bg-slate-800 border border-slate-700 rounded-xl p-1 flex gap-1">
            <button
              onClick={() => { setMode('view'); setPendingBox(null) }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${mode === 'view' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              👁 View
            </button>
            <button
              onClick={() => setMode('annotate')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${mode === 'annotate' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              ✏️ Annotate
            </button>
          </div>

          {/* Screenshot + overlays */}
          <div ref={canvasWrapRef} className="relative">
            <AnnotationCanvas
              screenshotUrl={screenshotUrl}
              aiAnnotations={submission.aiAnnotations}
              humanAnnotations={humanAnnotations}
              activeTab={mode === 'annotate' ? 'none' : activeTab}
            />

            {mode === 'annotate' && !pendingBox && (
              <DrawOverlay onDraw={handleDraw} />
            )}

            {(mode === 'popover' || pendingBox) && pendingBox && (
              <>
                {/* Show the drawn box */}
                <div
                  className="absolute border-2 border-dashed border-cyan-400 bg-cyan-400/10 rounded-sm pointer-events-none"
                  style={{
                    left: `${pendingBox.x}%`,
                    top: `${pendingBox.y}%`,
                    width: `${pendingBox.width}%`,
                    height: `${pendingBox.height}%`,
                  }}
                />
                {/* Popover anchored to the drawn box */}
                <div
                  className="absolute z-40"
                  style={{
                    left: `${pendingBox.x + pendingBox.width}%`,
                    top: `${pendingBox.y}%`,
                  }}
                >
                  <CommentPopover
                    onSave={saveAnnotation}
                    onCancel={() => { setPendingBox(null); setMode('annotate') }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <AnnotationSidebar
          aiAnnotations={submission.aiAnnotations}
          humanAnnotations={humanAnnotations}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onAddAnnotation={() => setMode('annotate')}
        />
      </div>
    </div>
  )
}
```

- [ ] **End-to-end test of the full flow**

```bash
npm run dev
```

1. Upload a screenshot at http://localhost:5173 — confirm AI annotations appear on the review page
2. In View mode: hover each annotation box — confirm tooltip appears with correct comment
3. Click sidebar tabs (AI / Human / All) — confirm cards filter correctly
4. Switch to Annotate mode — cursor should become crosshair
5. Drag a box over a region — confirm cyan dashed box appears and CommentPopover opens beside it
6. Type a comment, click Save — confirm new green annotation box appears and sidebar updates
7. Copy the share link, open it in an incognito window — confirm all annotations (AI + human) appear

- [ ] **Commit**

```bash
git add src/pages/ReviewPage.jsx
git commit -m "feat: build full ReviewPage with view mode, annotate mode, and human annotation saving"
```

---

## Final checklist

- [ ] `npm run lint` — no errors
- [ ] `npm run test:server` — all passing
- [ ] Upload flow works end-to-end with real API key in `server/.env`
- [ ] Share link works in a fresh browser tab
- [ ] Annotation boxes align with screenshot regions
- [ ] Human annotations persist after page refresh
