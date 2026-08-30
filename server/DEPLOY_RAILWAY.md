# Deploying the API to Railway

The service is configured by [`railway.json`](./railway.json). Railway reads it
automatically once the service's **root directory** is set to `server`.

## 1. Create the service

1. Railway dashboard → **New Project** → **Deploy from GitHub repo** → pick this repo.
2. Open the created service → **Settings** → **Root Directory** → set to `server`.
   This is what makes Railway find `railway.json` and `Dockerfile`. Leaving it
   unset builds from the repo root, which has no `package.json`, and the build
   fails with `sh: 1: npm: not found`.
3. **Settings → Networking → Generate Domain** to get a public URL.

## 2. Environment variables

Set these under **Variables**. Everything in
[`.env.example`](./.env.example) is required except where noted.

| Variable | Notes |
| --- | --- | 
| `NODE_ENV` | `production` | 
| `PORT` | **Do not set.** Railway injects it; the app already reads it. |
| `CORS_ORIGINS` | Comma-separated, no trailing slash. Must list the deployed admin and web origins, e.g. `https://admin.example.com,https://example.com` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` — reference the Postgres service, do not paste credentials |
| `DIRECT_URL` | `${{Postgres.DATABASE_URL}}` — same URL. Railway has no transaction pooler, so there is no separate direct connection, but `prisma migrate deploy` still requires the variable |
| `JWT_SECRET` | 32+ chars. `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `JWT_REFRESH_SECRET` | 32+ chars, different from the above |
| `R2_ENDPOINT` | Account-level endpoint, no bucket name appended |
| `R2_BUCKET`, `R2_ACCESS_KEY`, `R2_SECRET_KEY` | Cloudflare R2 credentials |
| `LOG_LEVEL` | Optional. Production defaults to `warn`. |

## 3. Build and start

The service builds from [`Dockerfile`](./Dockerfile); `railway.json` selects it.
There is nothing to type into the dashboard.

Leave **Build Command**, **Start Command** and **Pre-deploy Command** empty.
Start Command in particular: anything set there *replaces* the Dockerfile's
`CMD`, which is what runs `prisma migrate deploy` before the server. A Start
Command of `npm start` boots the API against an unmigrated database — the
service comes up, the tables never get created, and the first query is what
finally reports it. Only **Root Directory** (`server`) needs setting.

A Dockerfile is used rather than Railway's auto-detection because **this repo
has no `package.json` at its root**. A builder pointed at the repo root finds no
Node project, builds an image with no Node in it, and every command fails with:

```
sh: 1: npm: not found
```

The Dockerfile states the runtime outright, so the build no longer depends on
detection or on the Root Directory setting being right.

Inside it:

- `npm ci --include=dev` — Railway sets `NODE_ENV=production`, which makes npm
  skip devDependencies, but `typescript`, `tsc-alias`, and every `@types/*`
  package live there.
- `prisma generate` before `tsc` — the compile needs the generated client's types.
- The runtime stage reinstalls with `--omit=dev`, then copies the generated
  Prisma client **and the `prisma` CLI** across, since `migrate deploy` runs at
  startup and the CLI is a devDependency.
- `prisma migrate deploy` runs on every boot: it applies pending migrations and
  is a no-op when there are none.

## 4. Create the first admin account

`prisma migrate deploy` creates the schema but no rows, so there is no account
to log in with on a fresh database.

**Do not run `npm run prisma:seed` against production.** It creates
`admin@studio.test` with the hardcoded password `ChangeMe123!`, plus demo
sessions and clients.

Create a real admin instead — run once from your machine with `DATABASE_URL`
pointing at the production database:

```bash
cd server
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
(async () => {
  const prisma = new PrismaClient();
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD');
  const admin = await prisma.admin.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash: await bcrypt.hash(password, 12), name: process.env.ADMIN_NAME ?? 'Admin' }
  });
  console.log('Created admin:', admin.email);
  await prisma.\$disconnect();
})();
"
```

Invoke it with the credentials in the environment, so the password never lands
in your shell history:

```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='<a strong password>' node -e "..."
```

## 5. Point the frontends at it

Set `VITE_API_BASE_URL` (admin) and the web app's API base to the Railway
domain, then redeploy those. Add both frontend origins to `CORS_ORIGINS` above.

## Troubleshooting

### Healthcheck failure (build and deploy succeed)

The container started and exited before binding a port, so there was nothing
for the health check to reach. Open the **Deploy logs** — not the build logs —
and read the last lines.

Almost always this is a missing environment variable. The server validates all
of them at import time and exits immediately, printing:

```
========================================================================
STARTUP ABORTED — invalid or missing environment variables
========================================================================
  R2_ACCESS_KEY: Required
  ...
```

All eight of these are required, with no defaults. The server will not start
until every one is set:

`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`,
`R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`

One other startup abort, printed just as plainly:

- `prisma migrate deploy` failing — runs before the server starts, so a bad
  `DIRECT_URL` or an unreachable database also produces a health check failure.
  The Prisma error appears immediately above in the same log.

### `sh: 1: npm: not found` during build

Root Directory is not set to `server`. See step 1.

## Cookies and HTTPS

Refresh-token cookies are issued with `SameSite=None; Secure` in production
(see `src/utils/refreshCookie.ts`), which browsers only accept over HTTPS.
Railway domains are HTTPS, so this works — but the **admin panel must also be
served over HTTPS**, or the browser silently drops the cookie and every reload
logs the admin out.

## Before the first deploy

Verify the migrations actually reproduce the current schema. If they have
drifted, `prisma migrate deploy` fails at boot and the deploy never becomes
healthy. Run against a scratch database (not production):

```bash
cd server
npx prisma migrate diff \
  --from-migrations ./prisma/migrations \
  --to-schema-datamodel ./prisma/schema.prisma \
  --shadow-database-url "<a throwaway postgres url>" \
  --exit-code
```

Exit code `0` means no drift. `2` means the migrations do not match
`schema.prisma`, and a migration needs writing before deploying.

## Notes

- **Node is pinned to 22.x** (`engines` in package.json, plus `.nvmrc`).
  Prisma 6 and sharp 0.33 are best supported there; unpinned, Railway picks its
  own default and you run a different runtime than you tested on.
- **Health check**: `/health`, unauthenticated and DB-free, so a failing
  database does not block a deploy.
- **`trust proxy`** is enabled in production so rate limiting keys on the real
  client IP rather than Railway's load balancer.
- **ffmpeg/ffprobe** ship as npm packages (`@ffmpeg-installer/ffmpeg`,
  `@ffprobe-installer/ffprobe`), so no system package needs installing.
- **Uploads** go straight to R2 via presigned URLs, but image and video
  processing happens in-process after upload. Video transcoding is
  memory-hungry; if `confirmUpload` starts failing on large files, raise the
  service's memory limit.
- **Ephemeral filesystem**: Railway containers do not persist disk between
  deploys. Nothing here relies on local disk — all media lives in R2.
