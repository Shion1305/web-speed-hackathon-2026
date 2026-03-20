# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Web Speed Hackathon 2026 — a performance tuning competition for a fictional SNS app called **CaX**. The goal is to maximize [Lighthouse](https://developer.chrome.com/docs/lighthouse) scores (1150 pts max) without breaking VRT or manual test cases.

**Scoring:**
- Page Display (900 pts): FCP ×10, SI ×10, LCP ×25, TBT ×30, CLS ×25 across 9 pages
- Page Interaction (250 pts): TBT ×25, INP ×25 across 5 scenarios — **only scored if Page Display ≥ 300 pts**

## Commands

All commands run from `application/` unless noted.

```bash
# Install dependencies
pnpm install --frozen-lockfile

# Build client (production webpack)
pnpm build
# Equivalent: cd client && NODE_ENV=production webpack --mode production

# Start server (serves on port 3000)
pnpm start

# Typecheck all packages
pnpm typecheck

# Typecheck individual package
pnpm --filter @web-speed-hackathon-2026/client typecheck
pnpm --filter @web-speed-hackathon-2026/server typecheck

# Lint/format
pnpm format          # runs oxlint --fix && oxfmt

# VRT (from application/ with server already running)
pnpm --filter @web-speed-hackathon-2026/e2e exec playwright install chromium
pnpm run test                          # run VRT against localhost
pnpm run test:update                   # update baseline screenshots
E2E_BASE_URL=https://... pnpm run test # run VRT against remote
```

### Docker

```bash
# Build production image
docker build -f Dockerfile -t test .
docker run -it --rm -p 8080:8080 test

# Runtime serves with nginx (front) + node app (backend) in one container
```

### Database

The server uses SQLite. The seed file lives at `application/server/src/database.sqlite`. On startup, it's copied to a temp path. The `/api/v1/initialize` endpoint resets the DB to this seed.

```bash
# Regenerate seed data
pnpm --filter @web-speed-hackathon-2026/server seed:generate
pnpm --filter @web-speed-hackathon-2026/server seed:insert
```

## Architecture

### Repository Layout

```
application/
  client/          # React SPA (webpack + babel)
  server/          # Express + Sequelize (SQLite) API server
  e2e/             # Playwright VRT
  public/          # Static assets: images, sounds, movies, fonts, dicts, sprites
  upload/          # User-uploaded files (runtime)
  dist/            # Built client output (gitignored)
docs/              # Competition rules, scoring, test cases
scoring-tool/      # Local Lighthouse measurement tool
```

### Client (`application/client/`)

**Stack:** React 19, TypeScript, Tailwind CSS v4, webpack 5, babel

**Entry:** `src/index.tsx` → `AppContainer` → `BrowserRouter` + `Redux Provider`

**Route-level code splitting:** All route containers in `src/containers/` are `React.lazy()`-loaded in `AppContainer.tsx`. The Redux `form` reducer (redux-form) is registered dynamically via `registerReducer()` in `src/store/index.ts` — only loaded when auth/search/DM-new forms are mounted.

**Key patterns:**
- `src/containers/` — data-fetching wrappers (one per route/modal)
- `src/components/` — pure UI components organized by feature
- `src/hooks/use_near_viewport.ts` — IntersectionObserver hook used for lazy image/media loading
- `src/hooks/use_infinite_fetch.ts` — paginated data fetching (limit=10, offset-based)
- `src/utils/fetchers.ts` — `fetchJSON`, `fetchBinary`, `sendJSON` (gzip via CompressionStream), `sendFile`
- `src/utils/date.ts` — date formatting via native `Intl.DateTimeFormat` / `Intl.RelativeTimeFormat`

**Heavy lazy-loaded features (only loaded on user action):**
- `@ffmpeg/ffmpeg` + `@ffmpeg/core` — video/audio conversion on new post
- `@imagemagick/magick-wasm` — image conversion on new post
- `@mlc-ai/web-llm` — translation via `create_translator.ts` (on "Show Translation" click)
- `kuromoji` + `bayesian-bm25` — Japanese tokenizer/search in Crok AI input
- `negaposi-analyzer-ja` — sentiment analysis in search page
- `redux-form` — form state management (auth modal, search, new DM)

**WASM assets:** Files imported with `?binary` query are emitted as separate binary files (via `asset/resource` in webpack) to `/assets/[contenthash][ext]`. Do not change to `asset/bytes` — that embeds them as base64 inside JS chunks, causing 40MB+ chunks.

### Server (`application/server/`)

**Stack:** Express, Sequelize (SQLite), `tsx` (runs TypeScript directly, no compile step)

**Key files:**
- `src/app.ts` — Express app setup (compression, session, body-parser)
- `src/routes/static.ts` — serves `/dist`, `/public`, `/upload`; WebP substitution for `.jpg` requests from WebP-capable browsers; cache headers (`max-age=1y` for hashed assets, `no-cache` for HTML)
- `src/routes/api/` — REST endpoints per resource
- `src/models/Post.ts` — default scope eager-loads user, profileImage, images, movie, sound

**WebSocket:** `use_ws` hook connects to `/api/v1/dm/unread` for real-time DM badge updates. DM detail page uses SSE-like polling with WebSocket for typing indicators.

**Crok AI:** `GET /api/v1/crok` streams responses via Server-Sent Events. **The SSE protocol must not be changed** (regulation).

### Regulations (critical constraints)

- VRT must pass (Playwright screenshots)
- Manual test cases in `docs/test_cases.md` must pass
- `GET /api/v1/crok` SSE streaming protocol must not change
- `POST /api/v1/initialize` must reset DB to initial seed data
- Seed data IDs must not change
- `fly.toml` must not change
- No severe visual regressions in Chrome latest
