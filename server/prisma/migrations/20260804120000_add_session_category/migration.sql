-- Public gallery category for sessions.
CREATE TYPE "SessionCategory" AS ENUM (
    'venues',
    'companies',
    'restaurants',
    'events',
    'products',
    'realEstate',
    'drone',
    'cinematicVideo'
);

-- Added in two steps so existing rows stay valid: backfill every current
-- session to 'venues', then enforce NOT NULL. Re-categorise them from the
-- admin dashboard afterwards.
ALTER TABLE "sessions" ADD COLUMN "category" "SessionCategory";
UPDATE "sessions" SET "category" = 'venues' WHERE "category" IS NULL;
ALTER TABLE "sessions" ALTER COLUMN "category" SET NOT NULL;

-- Sessions stay out of the public gallery until explicitly published.
ALTER TABLE "sessions" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "sessions_category_isPublic_idx" ON "sessions"("category", "isPublic");
