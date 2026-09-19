-- Public-site visit tracking.
--
-- Rows are written by the site's own beacon (`POST /public/track`) and read
-- only by the admin analytics page. Nothing else in the app touches this
-- table, so it can be truncated at any time without affecting galleries,
-- downloads or CMS content.
--
-- No cookies and no raw IP addresses are stored. `visitorHash` is a salted
-- digest of IP + user agent + the UTC day: it distinguishes visitors within a
-- day, which is what "unique visitors" needs, and stops being linkable across
-- days. That keeps the table clear of personal identifiers.
CREATE TYPE "DeviceType" AS ENUM ('desktop', 'mobile', 'tablet', 'bot', 'unknown');

CREATE TABLE "page_views" (
  "id"           TEXT NOT NULL,
  "path"         TEXT NOT NULL,
  "locale"       TEXT,
  "sessionId"    TEXT,
  "referrerHost" TEXT,
  "deviceType"   "DeviceType" NOT NULL DEFAULT 'unknown',
  "country"      TEXT,
  "visitorHash"  TEXT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "page_views_pkey" PRIMARY KEY ("id")
);

-- Serves the time series and every range total, which all bound `createdAt`.
CREATE INDEX "page_views_createdAt_idx" ON "page_views" ("createdAt");

-- Serves "unique visitors in range" — a distinct count over `visitorHash`
-- inside a time window — without re-scanning the range.
CREATE INDEX "page_views_createdAt_visitorHash_idx"
  ON "page_views" ("createdAt", "visitorHash");

-- Serves the top-paths report.
CREATE INDEX "page_views_path_createdAt_idx" ON "page_views" ("path", "createdAt");

CREATE INDEX "page_views_sessionId_idx" ON "page_views" ("sessionId");

-- ON DELETE SET NULL, not CASCADE: the visit happened. Deleting an album
-- should not retroactively remove traffic from the totals and leave a hole in
-- last month's chart — the view survives, just no longer attributed.
ALTER TABLE "page_views"
  ADD CONSTRAINT "page_views_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "sessions" ("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
