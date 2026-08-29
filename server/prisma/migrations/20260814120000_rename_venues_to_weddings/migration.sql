-- Rename the `venues` gallery category to `weddings`.
--
-- ALTER TYPE ... RENAME VALUE rewrites the label in place, so every existing
-- session already categorised as 'venues' keeps its row untouched and comes
-- back as 'weddings'. No backfill, no column rewrite, no downtime window.
-- Prisma does not automatically wrap PostgreSQL migration files in a
-- transaction. Make this step retry-safe in case a previous deploy renamed
-- the enum before a later statement failed.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = current_schema()
      AND t.typname = 'SessionCategory'
      AND e.enumlabel = 'venues'
  ) THEN
    ALTER TYPE "SessionCategory" RENAME VALUE 'venues' TO 'weddings';
  END IF;
END
$$;

-- CMS page content is JSON, so the rename has to be applied by hand.
--
-- Two independent things are stored under the old name:
--   1. the `latestVenues` homepage section key, now `latestWeddings`
--   2. the category page saved under pageKey 'category-venues'
-- Both are matched narrowly so unrelated prose containing the word "venues"
-- is left alone.
UPDATE "page_contents"
SET "content" = ("content" - 'latestVenues')
                || jsonb_build_object('latestWeddings', "content" -> 'latestVenues')
WHERE "content" ? 'latestVenues';

-- The hidden-sections map keys sections by the same name.
UPDATE "page_contents"
SET "content" = jsonb_set(
      "content",
      '{hiddenSections}',
      (("content" -> 'hiddenSections') - 'latestVenues')
        || jsonb_build_object(
             'latestWeddings',
             "content" -> 'hiddenSections' -> 'latestVenues'
           )
    )
WHERE ("content" -> 'hiddenSections') ? 'latestVenues';

UPDATE "page_contents" SET "pageKey" = 'category-weddings' WHERE "pageKey" = 'category-venues';

-- The shared category list drives the hero category bar and the mobile tab
-- bar's sheet. It is an array of {id,label} objects, so the entry has to be
-- rebuilt in place to keep its position in the list — the order here is the
-- order the site renders.
--
-- The label is rewritten too: the site only translates ids it recognises
-- (see `getCmsCategories` in web/lib/api.ts), so a renamed id carrying a
-- stale "Venues" label would render that label verbatim.
UPDATE "page_contents"
SET "content" = jsonb_set(
      "content",
      '{categories}',
      (
        SELECT jsonb_agg(
                 CASE
                   WHEN item ->> 'id' = 'venues'
                     THEN jsonb_build_object('id', 'weddings', 'label', 'Weddings')
                          || (item - 'id' - 'label')
                   ELSE item
                 END
                 ORDER BY ordinality
               )
        FROM jsonb_array_elements("content" -> 'categories')
             WITH ORDINALITY AS elements(item, ordinality)
      )
    )
WHERE jsonb_typeof("content" -> 'categories') = 'array'
  AND "content" -> 'categories' @> '[{"id": "venues"}]';
