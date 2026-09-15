-- Position of each file within the batch it was uploaded in.
--
-- Existing rows get 0, which leaves them ordered by `createdAt` exactly as
-- they are today: the gallery ordering below sorts on `sortIndex` first and
-- falls back to `createdAt`, so a session uploaded before this column existed
-- keeps the order it already had.
ALTER TABLE "media" ADD COLUMN "sortIndex" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "media_sessionId_sortIndex_createdAt_idx"
  ON "media" ("sessionId", "sortIndex", "createdAt");
