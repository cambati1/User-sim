# Design Spec: Screenshot Design Feedback App

**Date:** 2026-04-10  
**Status:** Approved

---

## Overview

A web app where users upload an app screenshot along with a description and specific questions, receive instant AI-generated annotations, and get a shareable link they can send to anyone for human peer review. No accounts required.

---

## Architecture

### Two-process, one-repo structure

```
user-sim/
├── src/           # React + Vite frontend
├── server/        # Express backend
│   ├── index.js         # Server entry point
│   ├── db.js            # SQLite setup + queries
│   ├── routes/
│   │   ├── submissions.js   # POST /api/submissions, GET /api/submissions/:id
│   │   └── annotations.js   # POST /api/submissions/:id/annotations
│   └── uploads/         # Screenshot files stored here (gitignored)
└── package.json
```

Dev runs two processes: `vite` (port 5173) and `node server/index.js` (port 3001).

### Request flow

1. User submits upload form → `POST /api/submissions` with multipart form data
2. Server saves screenshot to `server/uploads/{uuid}.{ext}` via Multer
3. Server calls Claude API with the image (base64) + description + questions
4. Server parses AI response into structured annotations, saves everything to SQLite
5. Server returns `{ id, shareToken, aiAnnotations }`
6. Frontend redirects to `/review/{shareToken}`
7. Reviewer loads page → `GET /api/submissions/{shareToken}` → sees screenshot + AI annotations
8. Reviewer draws a box → `POST /api/submissions/{shareToken}/annotations` → annotation saved and rendered

---

## Data Model

Two SQLite tables:

```sql
CREATE TABLE submissions (
  id           TEXT PRIMARY KEY,   -- UUID, used as share token
  screenshot_path TEXT NOT NULL,
  description  TEXT NOT NULL,
  questions    TEXT NOT NULL,      -- JSON array of strings
  ai_annotations TEXT NOT NULL,   -- JSON array of annotation objects
  created_at   INTEGER NOT NULL    -- Unix timestamp
);

CREATE TABLE annotations (
  id           TEXT PRIMARY KEY,   -- UUID
  submission_id TEXT NOT NULL REFERENCES submissions(id),
  x            REAL NOT NULL,      -- % of image width (0–100)
  y            REAL NOT NULL,      -- % of image height (0–100)
  width        REAL NOT NULL,      -- % of image width
  height       REAL NOT NULL,      -- % of image height
  comment      TEXT NOT NULL,
  created_at   INTEGER NOT NULL
);
```

Both AI and human annotations share the same coordinate format: bounding box as percentages of image dimensions. AI annotations are stored in `submissions.ai_annotations` (JSON), human annotations in the `annotations` table.

---

## API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/submissions` | Upload screenshot + description + questions. Returns `{ id, aiAnnotations }` |
| `GET`  | `/api/submissions/:id` | Fetch a submission with all annotations |
| `POST` | `/api/submissions/:id/annotations` | Add a human annotation |
| `GET`  | `/uploads/:filename` | Serve screenshot files |

---

## Frontend Pages

### `/` — Upload page

Three-part form:
1. **Drop zone** — drag-and-drop or browse, PNG/JPG/WebP up to 10MB. Shows file preview (name + size) after selection.
2. **Description field** — "What screen is this?" — gives AI context for relevant feedback.
3. **Questions textarea** — one question per line. Pre-populated suggestion chips (tappable) for common questions like "Is the CTA obvious?" and "Is the hierarchy clear?".

A "What happens next" section below the form explains the AI analysis step and the share link before the user submits.

**Submit flow:**
- Button label: "Analyze my design →"
- On submit: show a loading screen with 4 step indicators (Upload → AI reading → Generating annotations → Creating link)
- On completion: show success banner with the share link + "Copy" button, then link to the review page

### `/review/:id` — Review page

Two-panel layout:

**Left — dark canvas:**
- Mode switcher at top: **View** | **Annotate**
- Screenshot rendered at fixed width (340px), centered
- Annotation boxes overlaid using `getBoundingClientRect()` measured after paint, stored as % coordinates and converted back to pixels on render — so positions survive window resizes
- **AI annotations** — indigo border + background, numbered badges
- **Human annotations** — green border + background, numbered badges
- Hovering a box shows a tooltip with the comment (flips left/right based on available space)

**Right — sidebar:**
- Tab filter: All / AI / Human
- Each annotation listed as a card with color-coded left border, label, region number, and comment text
- "Add annotation" button at bottom

**Annotate mode:**
- Cursor changes to crosshair
- User clicks and drags on screenshot to define a bounding box (cyan dashed outline while drawing)
- On mouse-up: comment popover appears beside the box with a textarea and Save/Cancel buttons
- On save: `POST /api/submissions/:id/annotations` → new annotation renders immediately without page reload

---

## AI Integration

**Model:** `claude-opus-4-6` (server-side, API key in `.env`)

**Prompt strategy:**
- Send screenshot as base64 image
- Include description and questions as context
- Ask Claude to return JSON array of annotations, each with `{ x, y, width, height, comment }` where coordinates are percentages
- Parse and validate response before storing

**Error handling:** If AI call fails or returns unparseable JSON, return the submission with `aiAnnotations: []` — the uploader still gets their share link and can collect human feedback.

---

## Error Handling

- File too large (>10MB): rejected client-side before upload
- Unsupported file type: rejected client-side
- AI timeout / parse failure: submission saved, `aiAnnotations` set to `[]`, user sees a toast "AI analysis failed — you can still share the link for human feedback"
- Submission not found: review page shows a "Link not found" empty state

---

## Out of Scope (MVP)

- User accounts / authentication
- Public feed of submissions
- Editing or deleting annotations
- Notifications when new annotations are added
- Mobile-optimized annotation drawing
