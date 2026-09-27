-- Per-item download permission. Existing media keeps the historical behaviour
-- of being downloadable unless its session has downloads disabled.
ALTER TABLE "media" ADD COLUMN "downloadEnabled" BOOLEAN NOT NULL DEFAULT true;
