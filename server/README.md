# Photographer Client Gallery Platform — Backend

Backend API for a photographer client gallery platform: session/media
management for the photographer (admin), phone/password login and private
galleries for clients, and a download system including full-session ZIP
archives. Serves the [`../admin`](../admin) dashboard and the client-facing
parts of [`../web`](../web).

## Tech stack

- Node.js + Express + TypeScript (strict)
- PostgreSQL + Prisma ORM
- JWT access tokens + rotating refresh tokens (httpOnly cookie)
- Cloudflare R2 (S3-compatible) for media storage
- Sharp (image processing) + FFmpeg (video metadata/thumbnails)
- Zod (request validation)
- Pino (structured logging)
- Swagger / OpenAPI (`swagger-jsdoc` + `swagger-ui-express`)

## Getting started

```bash
npm install
cp .env.example .env   # fill in real values — see below
npx prisma migrate deploy   # apply the schema to your Postgres database
npx prisma db seed          # optional: seed a demo admin + session + clients
npm run dev
```

The API listens on `PORT` (default `4000`). Interactive docs are served at
`http://localhost:4000/docs`, and the raw OpenAPI spec at `/docs.json`.

## Scripts

| Script                 | Description                                    |
| ------------------------ | ------------------------------------------------- |
| `npm run dev`           | Start the dev server (`tsx watch`, no build step) |
| `npm run build`         | Type-check and compile to `dist/`                 |
| `npm run start`         | Run the compiled server (`dist/server.js`)         |
| `npm run lint`          | ESLint (zero warnings allowed)                     |
| `npm run format`        | Prettier                                           |
| `npm run prisma:generate` | Regenerate the Prisma client                     |
| `npm run prisma:migrate`  | Create/apply a dev migration                     |
| `npm run prisma:studio`   | Open Prisma Studio                               |
| `npm run prisma:seed`     | Run the seed script directly                     |

## Project structure

```
src/
  config/       Env validation (Zod), Prisma client, logger
  auth/         Password hashing, JWT, refresh tokens
  storage/      StorageProvider interface + R2 implementation, storage key naming
  middleware/   Auth guards, client-session scoping, validation, rate limiting, error handling
  routes/       Route wiring + inline @openapi JSDoc (one file per resource)
  controllers/  Parse req/res, call services, shape responses — no business logic
  services/     Business logic — framework-agnostic, the only place that composes providers
  repositories/ The only layer that touches Prisma directly
  validations/  Zod schemas for body/params/query per resource
  types/        Shared types, typed error classes, Express request augmentation
  utils/        Pagination, slugify, content hashing, IP extraction, async wrapper
  docs/         Swagger/OpenAPI spec assembly
prisma/
  schema.prisma   Full data model
  migrations/     SQL migrations
  seed.ts         Demo data (admin + sessions + clients + gallery settings)
```

Request flow: `routes` (validation + auth middleware) → `controllers` →
`services` (business logic) → `repositories` (the only Prisma access) →
PostgreSQL. Cross-cutting concerns (storage) are injected into
services via `services/serviceRegistry.ts` — the single place that decides
*which* provider implementation is active.

## Authentication

Two independent systems, sharing the same access/refresh token shape:

- **Admin** — email + password (bcrypt) → `POST /admin/auth/login`.
- **Client** — phone number + password (bcrypt) → `POST /auth/login`. The
  phone number is the unique login identifier, in the role an email address
  plays for an admin. Accounts arrive two ways: the admin creates one (and may
  set the password at the same time), or a visitor registers at
  `POST /auth/register`. A self-registered account has no session until an
  admin attaches one, and its token carries `sessionId: null` until then.

Both issue a short-lived (15 min) JWT access token in the response body and
set a 30-day refresh token as an **httpOnly, Secure, SameSite=lax cookie** —
the raw refresh token is never exposed to JS. Refreshing
(`POST /admin/auth/refresh` or `POST /auth/refresh`) **rotates** the token:
the old one is revoked and a new one issued, so a replayed/stolen refresh
token can only ever be used once.

### Changing and recovering passwords

A signed-in client changes their own password with
`PATCH /auth/password`, proving ownership with the current one. Every refresh
token for the account is revoked, signing out all other devices.

There is **no self-service reset**: with WhatsApp OTP removed there is no
channel to deliver a reset link or code over. A client who has forgotten their
password asks the studio, and the admin sets a new one with
`PUT /admin/clients/:id/password`, which likewise signs that client out
everywhere. The same endpoint gives a password to a client who never had one.

## Storage

`src/storage/storageProvider.ts` defines a `StorageProvider` interface
(`upload`, `download`, `delete`, `getUploadUrl`, `getDownloadUrl`);
`src/storage/r2StorageProvider.ts` implements it against Cloudflare R2 via
the S3-compatible AWS SDK. The bucket is never public — admin uploads go
through a signed PUT URL, and every read (previews, downloads, ZIPs) goes
through a signed, time-limited GET URL generated on demand.

## Media processing

On upload, the admin dashboard requests a signed URL
(`POST /admin/media/upload-url`), uploads the file directly to R2, then
calls `POST /admin/media/:id/confirm`. That confirm step downloads the
original back from R2 and:

- **Images** — Sharp generates a WebP thumbnail and an optimized (max 2400px)
  WebP version; both are re-uploaded, and width/height are recorded.
- **Videos** — FFmpeg (via `fluent-ffmpeg` + `@ffmpeg-installer/ffmpeg` /
  `@ffprobe-installer/ffprobe`, so no system FFmpeg install is required)
  extracts a thumbnail frame and reads width/height/duration.

If processing fails, the media record is marked `failed` rather than left
stuck `processing`.

## Downloads

- Single/multiple: signed URLs generated on demand.
- Full session ZIP (`POST /download/session/:sessionId`): the server
  fingerprints the session's current media set (id + size of every ready
  file) and reuses a previously built ZIP from R2 if that fingerprint hasn't
  changed; otherwise it streams each file down from R2, builds a new archive
  with `archiver`, uploads it, and records it for future reuse.
- Every download (single/multiple/zip) is logged to `DownloadHistory` with
  the client, session, media, type, timestamp, and IP address.

## Security

- Helmet (with a scoped CSP relaxation only on `/docs`, for Swagger UI's
  inline scripts/styles)
- CORS locked to an explicit origin allowlist (`CORS_ORIGINS`), with
  credentials enabled for the refresh cookie
- Rate limiting: tighter limits on auth endpoints, a general limit elsewhere
- Zod validation on every request body/params/query
- File size and MIME type checks on upload
- Clients are hard-scoped to their own session via JWT claims
  (`middleware/clientScope.ts`) — a client token literally cannot address
  another session's data
- Request/response logs redact `Authorization`, `Cookie`, and `Set-Cookie`
  headers
- Passwords are hashed with bcrypt (admin and client alike); the raw refresh
  token is never persisted, only its hash

## Environment variables

See `.env.example`. `CORS_ORIGINS` is not in the original spec's list but is
required for CORS to work correctly with credentials — it defaults to the
local dev URLs of `web` and `admin`.

## Known gaps / risks

- **No live PostgreSQL was available while building this** — the schema and
  initial migration (`prisma/migrations/*_init`) were generated and
  validated with `prisma validate`/`prisma generate`, but never actually
  applied with `prisma migrate deploy` against a real database. Run that
  once Postgres is provisioned, and re-verify the seed script end-to-end.
- `bcrypt` pulls in `@mapbox/node-pre-gyp`, which depends on a vulnerable
  version of `tar` (install-time only, not runtime request handling). No
  non-breaking fix is available upstream yet; tracked, not blocking.
- `fluent-ffmpeg` is marked unmaintained upstream. It's a thin wrapper with a
  small surface area; kept deliberately rather than hand-rolling
  `child_process` calls, but worth revisiting if a maintained alternative
  emerges.
- `getClientIp` trusts `X-Forwarded-For` — configure `app.set('trust proxy', ...)`
  correctly for your actual deployment topology (e.g. behind Cloudflare or
  an nginx reverse proxy) before relying on IP addresses in
  `DownloadHistory` for anything security-sensitive.

## Deploying the database on Railway

The API already deploys from `railway.json` (Dockerfile builder). The
container runs `prisma migrate deploy` before starting, so the schema builds
itself on first boot — only the connection variables and the admin account
need setting up.

### 1. Add Postgres

In the Railway project: **New → Database → Add PostgreSQL**. Railway exposes
the connection string as `DATABASE_URL` on that service.

### 2. Point the API service at it

Set both variables on the **API** service. Railway's Postgres has no
transaction pooler, so unlike Supabase both point at the same connection:

    DATABASE_URL=${{Postgres.DATABASE_URL}}
    DIRECT_URL=${{Postgres.DATABASE_URL}}

`DIRECT_URL` is still required — `schema.prisma` references it for migrations
and the server aborts at startup without it.

Also set, on the same service:

    NODE_ENV=production
    CORS_ORIGINS=https://<your-site-domain>
    JWT_SECRET=<48+ random bytes>
    JWT_REFRESH_SECRET=<48+ random bytes>
    R2_ENDPOINT / R2_BUCKET / R2_ACCESS_KEY / R2_SECRET_KEY
    WEB_REVALIDATE_URL / REVALIDATE_SECRET   (optional)

Generate each secret with:

    node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

`CORS_ORIGINS` is worth double-checking: leave it at the localhost default and
the API answers browser requests normally while the browser discards every
response. Startup logs a warning when it holds no remote origin.

### 3. Deploy, then create the admins

Deploying runs the migrations. Create the sign-in accounts once, against the
Railway database — from a local shell with `DATABASE_URL`/`DIRECT_URL`
pointed at Railway, or from `railway run`:

    SEED_ADMIN_EMAIL=you@example.com \
    SEED_ADMIN_PASSWORD='<password>' \
    npm run prisma:seed:admin

For more than one account, pass `SEED_ADMINS` instead — a JSON array, where
`name` is optional:

    SEED_ADMINS='[{"email":"a@example.com","password":"<pw>","name":"A"},
                  {"email":"b@example.com","password":"<pw>"}]' \
    npm run prisma:seed:admin

JSON rather than a delimited list because passwords contain punctuation
freely: any separator is also a character a password may hold, and guessing
where one field ends silently seeds the wrong password.

Either variable may live in `server/.env`, which is git-ignored, instead of
being retyped on each run. Credentials come from the environment so none of
this lands in the repository. Re-running resets those admins' passwords,
which is also how a lockout is fixed.

Do **not** run `npm run prisma:seed` against production — that script fills the
database with demo sessions, clients and media for local development.

### 4. Verify before cutting over

Keep the old database until the new one is confirmed:

- the API's `/health` endpoint answers
- signing in to the admin dashboard works
- an upload reaches R2 and appears in the gallery

Media files live in R2, not in Postgres, so a fresh database starts with no
media rows. Existing R2 objects stay in the bucket but are unreachable without
the rows that point at them — re-upload rather than expecting them to reappear.
