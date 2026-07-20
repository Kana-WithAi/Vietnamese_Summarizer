# Vietnamese Summarizer

A React + Vite frontend prototype for a bilingual Vietnamese text summarization app.

## Current progress

- Built the main app shell with React, Vite, and Tailwind-friendly styling.
- Added a home summarizer screen with:
  - text input / paste / file upload support
  - summary length controls (short, medium, long)
  - output format controls (paragraph, bullet points)
  - text stats display for input and output
  - copy, download, and text-to-speech actions
- Added authentication pages for login and signup UI flows.
- Added bilingual support with a language switcher for English and Vietnamese.
- Added a slide-out `History` overlay from the header, with:
  - a translucent dark panel-style design
  - a list of summary history entries
  - pagination when entries exceed 6
  - per-item delete controls
- Added a matching `Bookmark` overlay in the header, with:
  - the same panel style and behavior as the history overlay
  - bookmark icons for each saved summary
  - pagination and per-item removal support
- Expanded the summarization workspace for a wider and more spacious UI.

## What is still pending

- The summarizer is currently a UI prototype and does not yet connect to a real summarization API.
- The login/signup screens are UI-only and do not have backend authentication implemented.
- Persistent storage for history/bookmarks is not yet available.

## Setup

1. Install Node.js (version 18+ recommended).
2. Open a terminal in the project root.
3. Change into the frontend folder:

```bash
cd frontend
```

4. Install dependencies:

```bash
npm install
```

## Run locally

From the `frontend` folder, start the development server:

```bash
npm run dev
```

Then open the local URL shown by Vite (typically `http://localhost:5173`).

## Build for production

From the `frontend` folder, run:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## Project structure

- `frontend/` — main React app
  - `src/` — application source code
  - `src/pages/` — page components for home, login, and signup
  - `src/components/` — reusable UI components including overlays and layout
  - `src/context/` — React context providers for language and history
  - `src/i18n/` — language translations
  - `src/utils/` — helper utilities

## Notes

This repository currently contains only the frontend prototype. Backend/API integration and persistent storage can be added later as the next step.
