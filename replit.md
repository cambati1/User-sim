# User Sim - Screenshot Design Feedback App

## Project Overview
A web application for getting AI-generated design feedback on app screenshots. Users upload a screenshot with a description and questions; the app uses Google Gemini to generate annotation-based feedback. It also generates a shareable link for peer annotations.

## Architecture

### Tech Stack
- **Frontend**: React 19 + Vite 8 + Tailwind CSS 4
- **Backend**: Node.js + Express 5
- **Database**: SQLite (via `better-sqlite3`)
- **AI**: Google Gemini API (`@google/genai`)
- **File Uploads**: Multer

### Project Structure
```
user-sim/
├── src/                # Frontend (React + Vite)
│   ├── components/     # AnnotationCanvas, DropZone, etc.
│   ├── pages/          # UploadPage, ReviewPage
│   ├── App.jsx         # Routing
│   └── main.jsx        # Entry point
├── server/             # Backend (Express)
│   ├── routes/         # submissions.js, annotations.js
│   ├── uploads/        # Local screenshot storage
│   ├── ai.js           # Gemini AI integration
│   ├── db.js           # SQLite schema & helpers
│   ├── index.js        # Express server (port 3001 dev / 5000 prod)
│   └── .env            # Server environment variables (gitignored)
├── vite.config.js      # Vite config (port 5000, proxy to :3001)
└── package.json
```

### Dev Setup
- Frontend: Vite on port 5000 (proxies `/api` and `/uploads` to backend on port 3001)
- Backend: Express on port 3001
- Both started with `npm run dev` (uses `concurrently`)

### Environment Variables
- `GEMINI_API_KEY` — Required for AI analysis. Set in `server/.env`.
- `PORT` — Backend port (default: 3001)

## Key Features
- Upload a screenshot + description + questions
- AI (Gemini) generates bounding-box annotations
- Shareable review link for peer annotations
- Annotations stored in SQLite

## Deployment
- Build: `npm run build` (Vite builds frontend to `dist/`)
- Run: `node server/index.js` (serves built frontend as static + API)
- Target: Autoscale
