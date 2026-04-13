# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server with HMR
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

No test runner is configured yet.

## Stack

- **React 19** with JSX (no TypeScript)
- **Vite 8** as build tool
- **Tailwind CSS v4** — imported via `@import "tailwindcss"` in `src/index.css`; configured through `@tailwindcss/vite` plugin (no `tailwind.config.js`)
- **ESLint 9** flat config (`eslint.config.js`) with `react-hooks` and `react-refresh` plugins

## Architecture

Minimal React SPA scaffold. Entry point is `src/main.jsx` → renders `<App />` into `#root`. Currently `src/App.jsx` is a single placeholder component — all application code will be built from here.

Tailwind v4 uses CSS-first configuration: add theme customizations in `src/index.css` using `@theme` blocks rather than a JS config file.
