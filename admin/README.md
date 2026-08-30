# Studio Admin

Admin dashboard for the photographer client gallery platform. The photographer
uses this app to manage photo sessions, upload media, assign clients, review
download activity, and configure per-session gallery settings. It consumes the
REST API exposed by [`../server`](../server).

## Tech stack

- React 18 + TypeScript (strict)
- Vite
- Tailwind CSS v4
- TanStack Query — all server state (fetching, caching, mutations)
- Zustand — client-only state (auth session, upload queue)
- React Hook Form + Zod — forms and validation
- Axios — HTTP client, with automatic access-token refresh
- React Router — routing

## Getting started

```bash
npm install
cp .env.example .env   # set VITE_API_BASE_URL to your running server
npm run dev
```

The app runs at `http://localhost:5173` and expects the backend at
`VITE_API_BASE_URL` (default `http://localhost:4000`).

## Scripts

| Script            | Description                              |
| ------------------ | ----------------------------------------- |
| `npm run dev`      | Start the Vite dev server                 |
| `npm run build`    | Type-check (`tsc -b`) and build for prod  |
| `npm run preview`  | Preview the production build locally      |
| `npm run lint`     | Run ESLint (zero warnings allowed)        |
| `npm run format`   | Run Prettier                              |

## Project structure

```
src/
  components/   Reusable UI (forms, modals, tables, icons)
  pages/        One component per route
  layouts/      AppShell (sidebar + topbar)
  hooks/        TanStack Query hooks, upload orchestration, utilities
  services/     Typed API clients (axios) + Zod schemas, one file per resource
  store/        Zustand stores (auth session, upload queue) — client state only
  types/        Domain types mirroring the backend's API contracts
  utils/        Formatting helpers, nav config
```

Data flow: `pages` → `hooks` (TanStack Query) → `services` (axios) → backend.
Server state always lives in the Query cache; Zustand never duplicates it.

## Authentication

- Admin signs in with email + password (`POST /admin/auth/login`).
- The **access token** lives in memory only (a Zustand store, never
  `localStorage`) and is attached to every request via an Axios interceptor.
- The **refresh token** is an httpOnly, Secure cookie set by the server — the
  browser sends it automatically; client JS never reads or stores it.
- On a 401, the Axios response interceptor transparently calls
  `/admin/auth/refresh` once (concurrent requests share the same in-flight
  refresh) and retries the original request. If refresh fails, the session is
  cleared and the user is redirected to `/login`.
- On app load, `useSessionBootstrap` attempts a silent refresh so a page
  reload doesn't force a re-login as long as the refresh cookie is valid.

## Pages

| Route         | Purpose                                                        |
| -------------- | ---------------------------------------------------------------- |
| `/login`      | Email/password sign-in                                          |
| `/`           | Dashboard — statistics cards (sessions, clients, media, storage) |
| `/sessions`   | Create/edit/archive/delete sessions; search, filter, paginate    |
| `/clients`    | Manage clients (name, phone, assigned session)                   |
| `/uploads`    | Drag-and-drop / folder upload with per-file progress and retry   |
| `/downloads`  | Read-only download history                                       |
| `/settings`   | Per-session gallery settings (downloads, watermark, password, expiry) |

Sessions link out to Uploads/Clients/Settings pre-filtered to that session via
`?sessionId=`.

## Uploads

Uploads use a presigned-URL flow so files never pass through this app's own
backend unnecessarily:

1. `POST /admin/media/upload-url` — request a signed PUT URL for a file
2. Upload the file directly to that URL (progress tracked via Axios)
3. `POST /admin/media/:id/confirm` — tell the backend the upload finished

Queue state (per-file status/progress, retry) lives in a Zustand store
(`uploadQueueStore`) since it's UI-coupled and needs to survive across the
async steps of each upload.

## Environment variables

| Variable              | Description                          |
| ----------------------- | --------------------------------------- |
| `VITE_API_BASE_URL`   | Base URL of the backend API            |

## Deploying

`vercel.json` rewrites every path to `/index.html`. This app uses
`BrowserRouter`, so routes like `/clients` exist only in the browser — the
host has no such file. In-app navigation works because React Router handles it
client-side, but a refresh or a pasted link asks the host for that path
directly and gets a 404. The rewrite hands every unmatched path to
`index.html` and lets the router resolve it.

Static files still win over the rewrite, so hashed bundles under `/assets/`
are served normally rather than being swallowed by it.

A host other than Vercel needs its own equivalent (`try_files ... /index.html`
on nginx, `_redirects` on Netlify) — without one, the same 404 returns.

## Known gaps

This app was built against the API contract documented in `Agent.md` and the
backend's own spec — several endpoints (`/admin/auth/*`, `/admin/dashboard/stats`,
gallery settings, etc.) are not yet implemented on the `server` side. Pages
handle loading/error states for this already; once the backend catches up, no
frontend changes should be required beyond verifying response shapes match.
