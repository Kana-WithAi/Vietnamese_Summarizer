# Vietnamese Summarizer

A React + Vite frontend prototype for a bilingual (English / Vietnamese) text summarization app.

## Highlights

- Summarization UI with: text input, paste, file upload, and summary length controls (short/medium/long).
- Output formats: paragraph or bullet points, with copy, download, and text-to-speech actions.
- Bilingual support via a language switcher and in-app translations stored under `src/i18n/translations.js`.
- History and Bookmarks overlays (UI-only) for browsing and removing saved entries.
- Admin Dashboard: a new `/dashboard` route and page for basic admin views.
- Feedback flow: thumbs up / thumbs down controls shown only after a summary is generated. On dislike, a feedback modal collects structured reasons and details.
- UI polish: official thumbs up/down SVG icons and updated action styles.

## Current status

- Frontend prototype: UI features are implemented and the project builds successfully with Vite.
- The summarization logic is a UI placeholder and does not call a backend summarization API yet.
- Authentication pages (Login/Signup) are UI-only.

## Setup

Prerequisite: Node.js (18+ recommended).

From the project root:

```bash
cd frontend
npm install
```

## Run locally

Start the dev server:

```bash
npm run dev
```

Open the URL shown by Vite (usually `http://localhost:5173`).

## Build for production

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Notable files

- `frontend/src/pages/HomePage.jsx` — main summarizer UI, feedback modal, and output actions.
- `frontend/src/i18n/translations.js` — localized strings (English + Vietnamese). Add missing keys here when extending the UI.
- `frontend/src/pages/DashboardPage.jsx` — admin dashboard route implementation.
- `frontend/src/components/Layout.jsx` — header and navigation (includes link to the dashboard).

## Development notes

- The feedback modal is triggered by the dislike button and collects both preset reasons and freeform details; feedback state is local and cleared on send.
- The thumbs up/down buttons use official SVG shapes (no external icon dependency).
- The summarizer currently sets a preview summary locally — replace `handleSummarize` in `HomePage.jsx` with an API call to integrate a real summarization backend.

If you'd like, I can add a short section with example API request payloads and expected responses to help wire a server endpoint.
