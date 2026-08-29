-- Allow a media item to be an external YouTube link rather than a stored file.
--
-- Existing rows are all uploads, and `source` defaults to 'upload', so no
-- backfill is needed and every current row stays valid. The three columns that
-- only make sense for a real file — storageKey, mimeType, size — become
-- nullable, which widens the type without rewriting any existing value.
--
-- Prisma does not wrap PostgreSQL migration files in a transaction, so each
-- step is written to be safe to re-run after a partially failed deploy.

-- 1. The source enum. Created only if a previous attempt did not already.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = current_schema()
      AND t.typname = 'MediaSource'
  ) THEN
    CREATE TYPE "MediaSource" AS ENUM ('upload', 'youtube');
  END IF;
END
$$;

-- 2. New columns. Every existing row takes the 'upload' default, which is what
--    it already was, and leaves the external fields null.
ALTER TABLE "media"
  ADD COLUMN IF NOT EXISTS "source" "MediaSource" NOT NULL DEFAULT 'upload',
  ADD COLUMN IF NOT EXISTS "externalUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "externalId" TEXT;

-- 3. Relax the file-only columns. A YouTube item has no key, MIME type, or
--    byte size; uploads keep theirs, so no data changes here.
ALTER TABLE "media" ALTER COLUMN "storageKey" DROP NOT NULL;
ALTER TABLE "media" ALTER COLUMN "mimeType" DROP NOT NULL;
ALTER TABLE "media" ALTER COLUMN "size" DROP NOT NULL;
