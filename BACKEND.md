# Backend — Storage Costs & Build To-Do

> **Correction:** the first version of this file was a from-scratch backend plan,
> written before I had read `server/`. Most of what it proposed was already
> built. This version is scoped to what's actually left.

Stack is settled: **Express + TypeScript + Prisma + Supabase Postgres +
Cloudflare R2**. See `server/README.md` for the architecture and
`projectArch.md` for the original spec.

---

## 1. Storage: is there a better option than S3?

Yes — and you already picked it. `server/.env.example` targets R2, which is
correct. Keep it.

### Egress pricing, per GB, after free tiers

| Provider | Egress / GB | Storage / GB / mo | Notes |
| --- | --- | --- | --- |
| **Cloudflare R2** | **$0.00** | $0.015 | Zero egress, no conditions |
| **Backblaze B2** | **$0.00** to 3× stored, then $0.01 | $0.006 | Cheapest storage; free egress via Cloudflare CDN |
| **Wasabi** | **$0.00** | $0.0069 | 90-day minimum retention per object |
| **DigitalOcean Spaces** | $0.01 | $0.02 | 1 TB egress included in $5/mo base |
| **Supabase Storage** | $0.09 | $0.021 | Same as AWS — no savings |
| **AWS S3** | **$0.09** (first 10 TB/mo) | $0.023 | Free tier only 100 GB/mo |

### What it costs on your actual workload

Assume a wedding = **400 photos × ~8 MB** (post-Sharp) ≈ **3.2 GB per gallery**.
The multiplier that hurts is sharing: the couple sends the link to family.

| Scenario | Egress | AWS S3 | R2 |
| --- | --- | --- | --- |
| 1 gallery, 15 full downloads | 48 GB | **$4.32** | **$0** |
| 30 weddings/yr, 15 downloads each | 1.44 TB | **$130** | **$0** |
| 30 weddings/yr, 40 downloads each | 3.84 TB | **$346** | **$0** |
| Storage, 30 weddings (96 GB) | — | $2.21/mo | $1.44/mo |

**Bottom line: $130–350/year on S3 vs. $0 on R2** for a one-photographer studio.
Storage cost is negligible either way; egress is the entire difference.

Two things worth knowing:

- **ZIP downloads amplify this.** Each "تحميل جميع الصور" re-transfers the whole
  gallery in a single request. The `ZipArchive` reuse in the schema saves
  *rebuild* cost but not egress — every download still ships the full archive.
- **R2 does charge for operations:** Class A (writes/lists) $4.50/million,
  Class B (reads) $0.36/million. At your volume, cents.

**Why not Supabase Storage** even though you're on Supabase Postgres: its egress
is priced at AWS rates ($0.09/GB), so you'd get the exact bill you're trying to
avoid. Use Supabase for Postgres, R2 for files. Mixing providers is fine here.

**Only real alternative:** Backblaze B2 if storage volume grows a lot (storage is
2.5× cheaper). But B2's free egress is capped at 3× stored data, so heavy
sharing can push you into paid egress. R2's unconditional $0 is simpler.

---

## 2. What already exists

`server/` is substantially built — ~3,500 lines, layered
(routes → controllers → services → repositories → Prisma):

- ✅ Prisma schema + init migration (9 models)
- ✅ Admin auth (email + bcrypt), client auth (phone + password, bcrypt)
- ✅ JWT access + rotating refresh tokens in httpOnly cookies
- ✅ R2 storage provider behind a `StorageProvider` interface
- ✅ Presigned upload/download URLs (bucket never public)
- ✅ Sharp image processing + FFmpeg video thumbnails/metadata
- ✅ Session ZIP with content-hash reuse (`ZipArchive`)
- ✅ Download history logging, gallery settings, dashboard stats
- ✅ Zod validation, Helmet, CORS allowlist, rate limiting
- ✅ Swagger docs at `/docs`

The schema already solves problems worth calling out: `ZipArchive.contentHash`
avoids rebuilding archives, and `clientScope.ts` hard-scopes client tokens to a
single session.

---

## 3. To-do list

### Phase 1 — Get it running ✅ DONE (2026-07-30)

- [x] Supabase project connected (eu-central-1)
- [x] `.env` created with both pooled (`:6543`) and direct (`:5432`) URLs
- [x] `directUrl` added to `schema.prisma` — migrations can't run through the
      transaction pooler
- [x] Fresh 64-char `JWT_SECRET` / `JWT_REFRESH_SECRET` generated
- [x] `CORS_ORIGINS` added to `.env` and `.env.example`
- [x] **Fixed: UTF-8 BOM in `migration.sql`** — the file began with `EF BB BF`,
      which Postgres rejects as a syntax error on the first statement. This was
      latent because the migration had never been run. Stripped.
- [x] `npx prisma generate` — client v6.19.3
- [x] `npx prisma migrate deploy` — **applied successfully, first time ever**
- [x] `npx prisma db seed` — 1 admin, 2 sessions, 3 clients, 1 gallery settings
- [x] All 9 tables verified present in `public`
- [x] `npm run dev` boots; `/health` → 200, `/docs.json` → 200
- [x] `POST /admin/auth/login` → 200 with JWT (bcrypt + JWT + full
      route→controller→service→repository→Postgres path confirmed)
- [x] `GET /admin/sessions` → 200 with token, **401 without** (auth guard works)

Seeded admin: `admin@studio.test` / `ChangeMe123!` — **change this before any
deployment.**

#### Notes for later

- Your editor may show errors on `url`/`directUrl` in `schema.prisma`. That's a
  Prisma **7** language server against an installed Prisma **6.19.3** CLI.
  `npx prisma validate` passes. Ignore, or pin the extension version.
- `package.json#prisma.seed` warns as deprecated (removed in Prisma 7). Migrate
  to `prisma.config.ts` when you upgrade.
- R2 vars in `.env` are **placeholders**. `env.ts` requires them non-empty, so
  the server boots, but uploads will fail until Phase 2.

### Phase 2 — R2 bucket (credentials ✅, upload path still to test)

- [x] R2 bucket `photographer-media` created, EU jurisdiction
- [x] R2 API token created with **Object Read & Write**, scoped to that bucket
- [x] `R2_ENDPOINT` / `R2_ACCESS_KEY` / `R2_SECRET_KEY` filled in `.env`
- [x] Bucket private — no public access
- [x] **Verified round-trip** through `R2StorageProvider`: direct upload,
      direct download (bytes match), presigned PUT, presigned GET (bytes match,
      `content-disposition` filename correct), delete
- [x] Permission scope confirmed minimal: `HeadBucket`/`ListObjects`/`PutObject`
      succeed, `ListBuckets` correctly denied (that needs an Admin token)
- [x] **Tested the real upload path end to end**: login → `upload-url` →
      presigned PUT → `confirm` → list → delete. Confirmed with a genuine
      1600×1000 JPEG: `processingStatus` reached `ready`, dimensions recorded
      correctly, thumbnail key written
- [x] Sharp image processing verified (thumbnail + optimized WebP generated)
- [x] **Fixed a storage leak in `mediaService.delete`** — see below
- [x] **Bucket CORS policy set and verified.** Preflight (OPTIONS) from both
      `localhost:5173` and `localhost:3000` returns 204 with
      `allow-methods: PUT, GET, HEAD`, `allow-headers: content-type`,
      `max-age: 3600`; a non-listed origin gets 403 with no CORS headers (so
      it is not a wildcard); a browser-style PUT returns 200 with `etag`
      exposed. Add production origins at deploy time
- [ ] Verify FFmpeg video path (only the image path has been exercised)
- [ ] Lifecycle rule for old ZIPs — note R2 prefixes don't support mid-path
      wildcards, so `sessions/*/archives/` can't be expressed as one rule;
      delete from application code instead

#### Bug found and fixed: orphaned optimized images

`confirmUpload` creates **three** objects per image — original, thumbnail, and
an optimized WebP — but `delete` only removed the first two. The optimized key
is *derived* (`storageKeys.optimized`) rather than stored on the record, so
nothing ever cleaned it up.

Every deleted photo left its optimized WebP in R2 permanently — a slow storage
leak that you pay for forever. Verified by listing the bucket after a delete:
one orphan remained. `mediaService.delete` now rebuilds the derived key for
image media and deletes all three; re-tested and the bucket is left empty.

Worth considering: store `optimizedKey` on the `Media` model rather than
deriving it, so deletion can't drift out of sync with creation again.

#### Two gotchas hit during setup

**Wrong token type.** Cloudflare's **Account API tokens** page produces a single
bearer token for Cloudflare's REST API — *not* the Access Key ID + Secret pair
the S3 SDK needs. The token ID is also 32 hex chars, so it looks plausible in
`R2_ACCESS_KEY` and fails with an opaque 403. Use
`dash.cloudflare.com/<account-id>/r2/api-tokens`; the correct page offers
"Object Read & Write" and returns three values.

**EU jurisdiction changes the endpoint.** A bucket with an EU *jurisdiction*
(stricter than a location hint) is only reachable at
`https://<account-id>.eu.r2.cloudflarestorage.com`. Using the plain host returns
403, not 404, which is easy to misread as a permissions problem.

#### CORS policy to set

Bucket → Settings → CORS policy:

```json
[
  {
    "AllowedOrigins": ["http://localhost:5173", "http://localhost:3000"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["etag"],
    "MaxAgeSeconds": 3600
  }
]
```

### Phase 3 — Client passwords ✅

Client login is phone + password; the WhatsApp Cloud API dependency is gone,
along with the Meta credentials and template approval it required.

- ✅ `POST /auth/register` (self-registration) and `POST /auth/login`
- ✅ `PATCH /auth/password` — change your own, signs out other devices
- ✅ `PUT /admin/clients/:id/password` — admin sets/resets on a client's behalf
- Recovery is deliberately admin-driven: there is no OTP or email channel to
  send a reset link over, so a client who forgets asks the studio.

### Admin dashboard coverage ✅ (verified 2026-07-30)

All 21 admin endpoints have a service function, a TanStack Query hook, and a
page that consumes it. Verified empirically, not by reading: a coverage script
exercised **16/16** endpoints end to end against the live server (session and
client CRUD, gallery settings, assignment, media list, downloads), creating and
cleaning up its own data.

**Gap found and closed: media deletion was unreachable from the UI.**
`deleteMedia` and `useDeleteMedia` both existed but no page called them —
`UploadsPage` could upload but never list or remove. Added `MediaGrid`
(`admin/src/components/MediaGrid.tsx`): a paginated grid per session with
type filters, processing-status badges, and delete behind a confirm dialog.

This required a backend change: `Media.thumbnail` is a storage **key**, and the
bucket is private, so the dashboard could not render previews. `mediaService.list`
now signs each thumbnail and returns `thumbnailUrl`, mirroring `galleryService`.
Verified: the URL fetches a real 480×320 WebP.

Also audited storage while testing — **207 R2 objects, 207 expected, 0 orphans**
across 69 media rows, so the earlier `delete` leak fix is holding.

Still unexercised: `POST /download/session/:id` (ZIP generation, the
serverless-timeout risk) is not called by the admin app at all.

### Blocker found: no public portfolio endpoint

Every gallery route is authenticated. `src/app.ts` mounts `/gallery` behind
`requireAuth, requireClient`, and `/gallery/:sessionId` additionally requires
`requireOwnSession` — a client's JWT can only ever reach their own session.

**So the public marketing site has no endpoint to call.** The category pages show
portfolio albums to anonymous visitors; nothing in the API serves that. Wiring
`web` to real data needs a new public route first, e.g.:

```
GET /portfolio/categories/:categoryId   -> published albums for a category
GET /portfolio/albums/:albumId          -> one album's photos
```

That implies schema work too: `PhotoSession` has no `category` field, and no
"published to portfolio" flag distinct from `status: active`. Client galleries
and portfolio showcases are different concerns sharing one model right now.

Also confirmed while reading: **`GallerySettings.expiresAt` IS enforced** —
`galleryService.assertGalleryAccessible` throws `ForbiddenError` on expired
galleries, and both gallery reads call it. One open question closed.
`watermarkPreviewImages` still appears to be an unimplemented flag.

### Phase 4 — Wire the frontend

This is the real remaining work, and none of it exists yet.

- [ ] Point `web`'s `#photoDelivery` nav link at the real portal (currently
      `#contact` as a placeholder)
- [ ] Build the client login page (phone + password) and the register page
- [ ] Build the client gallery view
- [ ] **Persist favorites** — `AlbumModal.tsx` keeps `favorited` in `useState`
      and loses it on close. Note: **there is no `Favorite` model in the schema
      yet** — this needs a migration, not just frontend work
- [ ] Replace `web/lib/data.ts` placeholders with real API calls
- [ ] Decide public-gallery strategy: keep `data.ts` for marketing content
      (fast, static, 21 prerendered pages) and use the API only for client
      galleries. Don't make the whole site dynamic
- [ ] Handle Arabic/RTL in the client portal — the hosted competitors do this
      badly; it's your advantage

### Phase 5 — Deploy

- [ ] Pick a host that allows long-running requests. **Vercel serverless caps
      execution at 60s** — ZIP generation for a 400-photo wedding will exceed it.
      Railway / Fly.io / a VPS are safer for `server/`
- [ ] `web` can stay on Vercel; only the API needs the long-request host
- [ ] Set `app.set('trust proxy', ...)` correctly — README flags that
      `getClientIp` trusts `X-Forwarded-For` unconditionally
- [ ] Point `CORS_ORIGINS` at production domains
- [ ] Set up DB backups (Supabase does daily on paid plans)

---

## 4. Known risks, from `server/README.md`

- **Migration never applied to a real DB** — Phase 1 is the first genuine test
- `bcrypt` → `@mapbox/node-pre-gyp` → vulnerable `tar` (install-time only)
- `fluent-ffmpeg` is unmaintained upstream
- `getClientIp` trusts `X-Forwarded-For` — fix before trusting audit IPs

## 5. Open questions

1. **Favorites** — needed for launch? Requires a schema change.
2. **Watermarking** — `GallerySettings.watermarkPreviewImages` exists as a flag;
   is the Sharp pipeline actually applying it, or is the flag unimplemented?
3. **Gallery expiry** — `GallerySettings.expiresAt` exists; is it enforced on
   read, and do you want auto-delete of expired media to save storage?
4. **Blog** — `#blog` is in the nav but has no page and no backend model.
