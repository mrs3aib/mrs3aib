-- Three-way visibility for published sessions.
--
-- `isPublic` stays the master publish switch; this decides how a published
-- session is reached: listed, link-only, or listed-but-password-gated.
CREATE TYPE "SessionVisibility" AS ENUM ('public', 'private', 'protected');

ALTER TABLE "sessions"
  ADD COLUMN "visibility" "SessionVisibility" NOT NULL DEFAULT 'public';

-- Sessions already carrying a gallery password become `protected`, so the
-- setting an admin configured keeps meaning what they intended. Everything
-- else defaults to `public`, which preserves current listing behaviour.
UPDATE "sessions" s
SET "visibility" = 'protected'
FROM "gallery_settings" g
WHERE g."sessionId" = s."id"
  AND g."passwordProtected" = true
  AND g."passwordHash" IS NOT NULL;

DROP INDEX IF EXISTS "sessions_category_isPublic_idx";
CREATE INDEX "sessions_category_isPublic_visibility_idx"
  ON "sessions" ("category", "isPublic", "visibility");
